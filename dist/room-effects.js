import * as T from 'three';
import { Reflector } from './vendor/Reflector.js';

export function hearthFlame(parent,kit,source,room){
  const {group,oval,m,moveable,updates,addProp}=kit;
  const root=group(parent,0,.239,.237);
  const flame=new T.Mesh(new T.PlaneGeometry(1.06,.78),new T.ShaderMaterial({
    uniforms:{clock:{value:1.38},strength:{value:.75},pattern:{value:room==='Library'?7.6:2.3}},
    vertexShader:`
      varying vec2 uvHere;
      void main(){
        uvHere=uv;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
      }`,
    fragmentShader:`
      uniform float clock;
      uniform float strength;
      uniform float pattern;
      varying vec2 uvHere;
      float hash(vec2 p){
        return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);
      }
      float noise(vec2 p){
        vec2 b=floor(p),f=fract(p);
        f=f*f*(3.0-2.0*f);
        return mix(mix(hash(b),hash(b+vec2(1,0)),f.x),mix(hash(b+vec2(0,1)),hash(b+vec2(1,1)),f.x),f.y);
      }
      void main(){
        float y=uvHere.y,x=uvHere.x;
        float flow=noise(vec2(x*4.6+pattern*.11,y*3.8-clock*1.6));
        float sparks=noise(vec2(x*17.0+pattern,y*14.0-clock*5.1));
        float drift=noise(vec2(x*9.3-clock*.28,y*8.3-clock*3.0));
        float shape=0.0;
        for(int i=0;i<5;i++){
          float j=float(i);
          float center=.18+j*.158+.024*sin(j*12.9+pattern);
          float height=.30+.65*noise(vec2(j*1.91+pattern,clock*1.21+j*.77));
          height*=.89+.11*sin(clock*4.0+j*1.17);
          float tip=y/height;
          float tongue=center+y*(.20*sin(clock*3.6+j*1.4)+.44*(flow-.5))+
            y*.13*(drift-.5);
          float width=(.082+.035*noise(vec2(j*2.1,clock+pattern)))*max(.09,1.0-tip*.94);
          float edge=1.0-smoothstep(width*.22,width,abs(x-tongue));
          shape=max(shape,edge*(1.0-smoothstep(.63,1.015,tip)));
        }
        float fire=shape*strength*smoothstep(0.0,.058,y)*(.76+.24*sparks);
        vec3 hue=mix(vec3(1.28,.081,.005),vec3(2.38,.60,.059),max(0.0,1.0-y*1.67));
        hue=mix(hue,vec3(2.28,1.43,.48),smoothstep(.54,.96,shape)*max(0.0,1.0-y*2.9));
        gl_FragColor=vec4(hue,fire);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent:true,depthWrite:false,side:T.DoubleSide,
  }));
  flame.position.y=.381;
  root.add(flame);
  const emberMat=m.ember.clone();
  for(let i=0;i<7;i++){
    const coal=oval(root,(i-3)*.111,-.062,(i%3)*.045,.091,.037,.086,emberMat);
    coal.rotation.set(i*.38,i*1.94,.23+i*.057);
  }
  moveable(root);
  flame.castShadow=false;
  flame.receiveShadow=false;
  let warm=.72,elapsed=0;
  updates.push((dt,steady)=>{
    elapsed+=dt;
    warm=T.MathUtils.damp(warm,source.enabled?.86:0,4.6,dt);
    const flutter=steady?1:1+Math.sin(elapsed*9.2)*.12+Math.sin(elapsed*15.1)*.042;
    source.pulse=flutter;
    flame.visible=warm>.015;
    flame.material.uniforms.clock.value=steady?1.38:elapsed+1.38;
    flame.material.uniforms.strength.value=warm;
    emberMat.emissiveIntensity=.10+warm*1.38;
  });
  addProp(parent,[0,.48,.36],{
    radius:.41,
    label:()=>source.enabled?'Dampen the fire':'Stoke the fire',
    use(){source.enabled=!source.enabled;return 'wick';},
    reset(){source.enabled=true;},
  });
}

export function wallMirror(parent,kit,x,y,z,w,h){
  const mirror=new Reflector(new T.PlaneGeometry(w,h),{
    color:0xe5e5e5,clipBias:.0015,textureWidth:640,textureHeight:480,multisample:0,
  });
  mirror.position.set(x,y,z);
  parent.add(mirror);
  kit.moveable(mirror);
  mirror.castShadow=false;mirror.receiveShadow=false;
  mirror.userData.mirror=true;
  mirror.userData.reflectionDirty=true;
  const render=mirror.onBeforeRender;
  const priorView=new T.Matrix4(),priorProjection=new T.Matrix4();
  let lastDraw=-Infinity;
  mirror.onBeforeRender=function(renderer,scene,camera,...rest){
    const now=performance.now();
    const resample=!priorView.equals(camera.matrixWorld)||!priorProjection.equals(camera.projectionMatrix)||
      mirror.userData.reflectionDirty;
    if(!resample&&now-lastDraw<(mirror.userData.reflectionInterval??100))return;
    render.call(this,renderer,scene,camera,...rest);
    priorView.copy(camera.matrixWorld);priorProjection.copy(camera.projectionMatrix);
    lastDraw=now;
    mirror.userData.reflectionDirty=false;
  };
  return mirror;
}

export function waterTap(parent,kit,params){
  const {x,y,z,baseY,width,depth,round,room,label='tap'}=params;
  const {moveable,addProp,worldPoint,updates,sounds}=kit;
  const body=new T.Group();
  body.position.set(x,0,z);
  parent.add(body);
  const flowMaterial=new T.MeshPhysicalMaterial({
    color:0xd3edf4,transparent:true,opacity:0,roughness:.14,metalness:.10,
    clearcoat:.8,envMapIntensity:.75,depthWrite:false,
  });
  const drop=new T.Mesh(new T.CylinderGeometry(.012,.007,1,9,1,true),flowMaterial);
  drop.visible=false;body.add(drop);
  const poolMaterial=new T.MeshStandardMaterial({
    color:0x92b6c6,transparent:true,opacity:0,roughness:.24,metalness:.13,
    envMapIntensity:.45,depthWrite:false,
  });
  const pool=new T.Mesh(round?new T.CircleGeometry(.5,44):new T.PlaneGeometry(1,1),poolMaterial);
  pool.rotation.x=-Math.PI/2;
  pool.scale.set(width,depth,1);
  pool.position.set(params.poolX??0,baseY,params.poolZ??0);
  pool.visible=false;body.add(pool);
  const rings=[];
  for(let i=0;i<3;i++){
    const ring=new T.Mesh(new T.RingGeometry(.80,1,30),new T.MeshBasicMaterial({
      color:0xc1e1e7,transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide,
    }));
    ring.rotation.x=-Math.PI/2;
    ring.position.y=baseY+.002;
    body.add(ring);rings.push(ring);
  }
  moveable(body);
  body.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
  let running=false,fill=0,fade=0,elapsed=0;
  const state={kind:'water',position:worldPoint(parent,x,y-.15,z).toArray(),room,
    volume:.20,enabled:()=>running};
  sounds.push(state);
  updates.push((dt,steady)=>{
    elapsed+=dt;
    fade=T.MathUtils.damp(fade,running?1:0,10,dt);
    fill=Math.max(0,Math.min(1,fill+dt*(running?.10:-.14)));
    const rise=round?.076:.023;
    const level=baseY+fill*rise;
    drop.visible=fade>.025;
    drop.position.y=(y+level)/2;
    drop.scale.y=y-level;
    drop.scale.x=drop.scale.z=.79+(steady?.12:Math.sin(elapsed*34)*.12)+fade*.21;
    flowMaterial.opacity=fade*.50;
    pool.visible=fill>.014||fade>.10;
    pool.position.y=level;
    poolMaterial.opacity=.28*Math.max(fill,fade*.38);
    for(let i=0;i<rings.length;i++){
      const fraction=(elapsed*.94+i/3)%1;
      const ring=rings[i];
      ring.visible=fade>.04&&!steady;
      ring.position.y=level+.0017;
      ring.scale.setScalar(.014+fraction*.104);
      ring.material.opacity=(1-fraction)*fade*.31;
    }
  });
  addProp(parent,[x,y+.055,z],{
    radius:.215,label:()=>running?'Turn '+label+' off':'Turn '+label+' on',
    use(){running=!running;return 'switch';},
    reset(){running=false;fill=fade=0;},
  });
}
