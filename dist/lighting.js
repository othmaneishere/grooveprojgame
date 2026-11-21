import * as T from 'three';
import { DEPTH,LEVEL,rooms } from './layout.js';
import { createDaylightDrift } from './daylight-drift.js';

export const lightingProfiles={
  balanced:{ratio:1.30,shadow:1024,mirror:560},
  high:{ratio:1.65,shadow:1536,mirror:760},
  performance:{ratio:1.0,shadow:512,mirror:320},
};

function makeEnvironment(renderer){
  const scene=new T.Scene();
  scene.background=new T.Color(0x655e55);
  const box=new T.Mesh(new T.BoxGeometry(16,8,16),new T.MeshBasicMaterial({
    color:new T.Color(.30,.242,.179),side:T.BackSide,
  }));
  scene.add(box);
  const plane=new T.PlaneGeometry();
  function emitter(x,y,z,width,height,color,power){
    const object=new T.Mesh(plane,new T.MeshBasicMaterial({
      color:new T.Color(color).multiplyScalar(power),side:T.DoubleSide,toneMapped:false,
    }));
    object.position.set(x,y,z);
    object.lookAt(0,0,0);
    object.scale.set(width,height,1);
    scene.add(object);
  }
  emitter(-6.8,1.8,-3.1,3.0,3.5,0xc5e0ff,2.10);
  emitter(-6.8,1.8,1.3,3.0,3.5,0xd4e8ff,2.34);
  emitter(1.7,3.65,-2.2,2.7,1.9,0xffd3a1,1.31);
  emitter(2.7,1.8,6.0,2.1,2.6,0xffc592,.88);
  box.position.y=.6;
  const pmrem=new T.PMREMGenerator(renderer);
  const target=pmrem.fromScene(scene,.026,.1,28);
  pmrem.dispose();
  scene.traverse(o=>{if(o.isMesh)o.material.dispose();});
  box.geometry.dispose();plane.dispose();
  return target;
}

function apertureMap(){
  const size=128;
  const bytes=new Uint8Array(size*size*4);
  const soft=(d,width)=>Math.min(1,Math.max(0,(d-width*.48)/(width*.52)));
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=(x+.5)/size,v=(y+.5)/size;
    const edge=soft(Math.min(u,1-u,v,1-v),.12);
    const uBar=Math.min(Math.abs(u-.342),Math.abs(u-.660));
    const vBar=Math.min(Math.abs(v-.312),Math.abs(v-.625));
    const pattern=.58+.42*soft(uBar,.045)*soft(vBar,.055);
    const value=Math.round(255*edge*pattern);
    bytes.set([value,value,value,255],4*(y*size+x));
  }
  const texture=new T.DataTexture(bytes,size,size);
  texture.magFilter=texture.minFilter=T.LinearFilter;
  texture.needsUpdate=true;
  return texture;
}

function daylightFor(name,p){
  const room=rooms.find(r=>r.name===name);
  if(room){
    const h=room.level*LEVEL,z=(room.front?.5:-.5)*DEPTH;
    return {key:name,position:[room.side*7.08,h+2.48,z+.54],target:[room.side*3.85,h+.64,z-.67],
      power:91,angle:.77,range:9.1,color:0xd9e8ff};
  }
  const level=name==='Upper landing'?LEVEL:0;
  const rear=level===0||p.z<.45;
  return {key:name+(rear?'-rear':'-front'),position:[-.02,level+2.64,rear?-6.05:6.06],
    target:[-.58,level+.68,rear?-1.36:1.70],power:81,angle:.60,range:9.6,color:0xdde9ff};
}

function isAdjacent(source,zone,doors,player){
  if(source.zone===zone)return true;
  const hallZone=zone==='Entrance hall'||zone==='Upper landing';
  const sourceHall=source.zone==='Entrance hall'||source.zone==='Upper landing';
  if(hallZone&&sourceHall)return true;
  if(hallZone===sourceHall)return false;
  const next=hallZone?source.zone:zone;
  return doors.some(d=>d.room===next&&Math.abs(d.angle)>.52&&Math.abs(d.y-player.y)<.65);
}

export function createRoomCuller(world,onChange=()=>{}){
  let previous='';
  const frustum=new T.Frustum(),viewProjection=new T.Matrix4();
  const portals=new Map();
  for(const door of world.doors){
    portals.set(door,new T.Box3(new T.Vector3(door.x-.43,door.y-.09,door.z-.35),
      new T.Vector3(door.x+.43,door.y+2.55,door.z+door.width+.35)));
  }
  return (zone,camera)=>{
    const hall=zone==='Entrance hall'||zone==='Upper landing';
    const current=world.doors.find(door=>door.room===zone);
    if(camera){
      camera.updateMatrixWorld();
      viewProjection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(viewProjection);
    }
    const potentiallyVisible=door=>!camera||frustum.intersectsBox(portals.get(door));
    const seeHall=hall || (Math.abs(current?.angle??0)>.065&&potentiallyVisible(current));
    const visible=new Set([zone,'door/'+zone]);
    if(seeHall){
      visible.add('Entrance hall');visible.add('Upper landing');visible.add('Staircase');
      for(const door of world.doors){
        visible.add('door/'+door.room);
        if(Math.abs(door.angle)>.065&&potentiallyVisible(door))visible.add(door.room);
      }
    }
    const key=[...visible].join('|');
    if(previous===key)return;
    previous=key;
    for(const [name,meshes] of world.roomMeshes){
      for(const mesh of meshes)mesh.visible=visible.has(name);
    }
    onChange();
  };
}

export function createLighting(scene,renderer,world,profile='balanced'){
  const hemi=new T.HemisphereLight(0xe8ecf3,0x766053,.74);
  scene.add(hemi);
  const drift=createDaylightDrift(scene);
  let environment;
  const floatTargets=renderer.extensions.has(renderer.capabilities.isWebGL2?
    'EXT_color_buffer_float':'EXT_color_buffer_half_float');
  if(floatTargets){
    try{
      environment=makeEnvironment(renderer);
      scene.environment=environment.texture;
    }catch(error){console.warn('Material reflection probe unavailable',error);}
  }

  const mirrorMeshes=[];
  const reflections=new Map();
  scene.traverse(o=>{
    if(o.isMesh&&Number.isFinite(o.material?.envMapIntensity))reflections.set(o.material,o.material.envMapIntensity);
    if(!o.userData.mirror)return;
    if(!floatTargets)o.getRenderTarget().texture.type=T.UnsignedByteType;
    mirrorMeshes.push(o);
  });
  const doorAngles=world.doors.map(d=>d.angle);
  const bodyMotion=world.dynamicSolids.map(body=>[body.minX,body.minZ,body.enabled]);
  const apertures=apertureMap();
  const windows=Array.from({length:2},()=>{
    const light=new T.SpotLight(0xdbe8ff,0,9.1,.77,.67,2);
    light.map=apertures;
    return {light,key:'',target:0,dayColor:new T.Color(0xdbe8ff)};
  });
  const ceiling=new T.SpotLight(0xffd8ad,1,7.0,1.09,.82,2);
  const spots=[...windows.map(w=>w.light),ceiling];
  for(const spot of spots){
    spot.castShadow=true;
    spot.shadow.bias=-.00015;
    spot.shadow.normalBias=.032;
    spot.shadow.autoUpdate=false;
    spot.shadow.camera.near=.19;
    spot.shadow.camera.far=10.8;
    spot.shadow.radius=3;
    scene.add(spot,spot.target);
  }
  // The number of lights stays constant as the player moves to avoid shader rebuilds.
  const slots=Array.from({length:7},()=>{
    const light=new T.PointLight(0xffca9b,0,5.5,2);
    scene.add(light);
    return {light,source:null,next:null};
  });
  const sourceStrength=(source,position,zone)=>{
    const distance=Math.hypot(position.x-source.x,position.y-source.y,position.z-source.z);
    const nearby=isAdjacent(source,zone,world.doors,position);
    const sameLevel=Math.abs(source.y-position.y)<2.32;
    const scope=source.zone===zone?1:nearby?.72:sameLevel?.14:.065;
    const fade=T.MathUtils.smoothstep(source.distance-distance,0,source.distance*.56);
    const power=source.power*(source.kind==='window'?.78:1);
    return power*scope*fade;
  };
  function redrawShadow(light){
    light.shadow.needsUpdate=true;
    renderer.shadowMap.needsUpdate=true;
  }
  function redrawVisibleShadows(){
    for(const light of spots)if(light.intensity>.02||light===ceiling)redrawShadow(light);
  }
  const cull=createRoomCuller(world,redrawVisibleShadows);
  let lastRoom='',dayKey='',warmSource=null,warmTarget=null,elapsed=0,nextRanking=0,nextShadow=0,warmLevel=0;
  let evening=0,lightGoal=0,powered=true;
  const dusk=new T.Color(0x91aadd),glassDay=new T.Color(0xdbebff),glassDusk=new T.Color(0x96abd0);
  function setProfile(mode){
    profile=mode in lightingProfiles?mode:'balanced';
    const config=lightingProfiles[profile];
    renderer.shadowMap.enabled=true;
    for(const spot of spots){
      if(spot.shadow.map){spot.shadow.map.dispose();spot.shadow.map=null;}
      spot.shadow.mapSize.set(config.shadow,config.shadow);
      redrawShadow(spot);
    }
    for(const mirror of mirrorMeshes){
      mirror.getRenderTarget().setSize(config.mirror,Math.round(config.mirror*.75));
      mirror.userData.reflectionDirty=true;
      mirror.userData.reflectionInterval=profile==='high'?75:profile==='performance'?145:105;
    }
    renderer.shadowMap.needsUpdate=true;
  }
  setProfile(profile);

  function rerank(position,zone){
    const strongest=world.sources
      .filter(source=>source.enabled)
      .sort((a,b)=>sourceStrength(b,position,zone)-sourceStrength(a,position,zone))
      .slice(0,slots.length);
    const included=new Set(strongest);
    const pending=strongest.filter(source=>!slots.some(slot=>slot.source===source));
    for(const slot of slots){
      slot.next=included.has(slot.source)?slot.source:pending.shift()??null;
    }
    warmTarget=world.sources.filter(s=>s.kind==='ceiling'&&s.zone===zone)
      .sort((a,b)=>Math.hypot(a.x-position.x,a.z-position.z)-Math.hypot(b.x-position.x,b.z-position.z))[0];
  }
  function update(dt,position,zone,snap=false,steady=false,camera=null){
    elapsed+=dt;
    const rate=snap?1:1-Math.exp(-dt*10.2);
    cull(zone,camera);
    evening=T.MathUtils.lerp(evening,lightGoal,snap?1:1-Math.exp(-dt*2.7));
    const lightRate=powered?rate:1;
    const daylight=powered?T.MathUtils.lerp(1,.23,evening):.028;
    hemi.intensity=powered?T.MathUtils.lerp(.74,.50,evening):.093;
    world.glazing.emissiveIntensity=powered?T.MathUtils.lerp(1.12,.23,evening):.038;
    world.glazing.emissive.copy(glassDay).lerp(glassDusk,powered?evening:1);
    renderer.toneMappingExposure=powered?T.MathUtils.lerp(1.09,1.20,evening):1.25;
    const main=daylightFor(zone,position);
    drift(dt,main,powered&&!steady&&profile!=='performance',daylight,renderer.getPixelRatio(),snap);
    if(main.key!==dayKey||snap){
      dayKey=main.key;
      const assigned=windows.find(w=>w.key===main.key)??windows.reduce((a,b)=>a.light.intensity<b.light.intensity?a:b);
      for(const entry of windows)entry.target=entry===assigned?main.power:0;
      if(assigned.key!==main.key){
        assigned.key=main.key;
        const light=assigned.light;
        light.position.fromArray(main.position);
        light.target.position.fromArray(main.target);light.target.updateMatrixWorld();
        light.angle=main.angle;light.distance=main.range;
        assigned.dayColor.set(main.color);
        redrawShadow(light);
      }
    }
    for(const entry of windows){
      const value=T.MathUtils.lerp(entry.light.intensity,entry.target*daylight,snap||!powered?1:1-Math.exp(-dt*9));
      entry.light.intensity=value<.02?0:value;
      entry.light.color.copy(entry.dayColor).lerp(dusk,evening);
    }
    if(lastRoom!==zone||elapsed>=nextRanking||snap){
      lastRoom=zone;nextRanking=elapsed+.17;
      rerank(position,zone);
    }
    for(const slot of slots){
      if(slot.source!==slot.next && (slot.light.intensity<.045||snap)){
        slot.source=slot.next;
        if(slot.source){
          const s=slot.source;
          slot.light.color.set(s.color);
          slot.light.position.set(s.x,s.y,s.z);
          slot.light.distance=s.distance;
        }
      }
      const source=slot.source;
      const target=powered&&source&&source===slot.next&&source.enabled
        ? sourceStrength(source,position,zone)*(source.pulse??1)*(source.kind==='window'?daylight:1+evening*.13):0;
      slot.light.intensity=T.MathUtils.lerp(slot.light.intensity,target,lightRate);
    }
    if(warmTarget!==warmSource && (snap||warmLevel<2.2)){
      warmSource=warmTarget;
      if(warmSource){
        const y=warmSource.y;
        const drop=zone==='Upper landing'||zone==='Entrance hall'?2.85:2.0;
        ceiling.position.set(warmSource.x,y,warmSource.z);
        ceiling.target.position.set(warmSource.x+.28,y-drop,warmSource.z+.26);
        ceiling.target.updateMatrixWorld();ceiling.color.set(warmSource.color);
        redrawShadow(ceiling);
      }
    }
    warmLevel=T.MathUtils.lerp(warmLevel,powered&&warmSource===warmTarget&&warmSource?.enabled?36:0,lightRate);
    ceiling.intensity=warmLevel;
    for(const {source,material,lit,unlit} of world.fixtures){
      material.emissiveIntensity=T.MathUtils.lerp(material.emissiveIntensity,powered?(source.enabled?lit:unlit):0,lightRate);
    }
    if(elapsed>=nextShadow){
      for(let i=0;i<world.doors.length;i++){
        const delta=Math.abs(doorAngles[i]-world.doors[i].angle);
        if(delta>.055||(delta>.001&&world.doors[i].angle===world.doors[i].target)){
          doorAngles[i]=world.doors[i].angle;
          redrawVisibleShadows();
        }
      }
      for(let i=0;i<bodyMotion.length;i++){
        const body=world.dynamicSolids[i],last=bodyMotion[i];
        if(body.enabled!==last[2]||Math.abs(last[0]-body.minX)+Math.abs(last[1]-body.minZ)>.022){
          last[0]=body.minX;last[1]=body.minZ;last[2]=body.enabled;
          redrawVisibleShadows();
        }
      }
      nextShadow=elapsed+(profile==='performance'?.19:profile==='high'?.058:.10);
    }
  }
  function dispose(){
    environment?.dispose();
    apertures.dispose();
    for(const spot of spots)spot.shadow.dispose();
  }
  return {update,setProfile,dispose,setPower(on){
    powered=on;
    world.bulbs.emissiveIntensity=on?.68:0;
    for(const [material,value] of reflections)material.envMapIntensity=value*(on?1:.076);
    for(const source of world.sources)source.blackout=!on;
    for(const mirror of mirrorMeshes)mirror.userData.reflectionDirty=true;
  },setAtmosphere(mode){
    lightGoal=mode==='evening'?1:0;
    for(const mirror of mirrorMeshes)mirror.userData.reflectionDirty=true;
  }};
}
