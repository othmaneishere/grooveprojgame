import * as T from 'three';
import { buildHouse } from './house.js';
import { BODY,EYE,LEVEL,SPAWN,doorHits,locationAt,movePlayer } from './layout.js';

const el=id=>document.getElementById(id);
const menu=el('menu'), enter=el('enter'), status=el('status');
const touch=matchMedia('(pointer:coarse)').matches;
const keys=new Set();
const player={...SPAWN};
let pitch=0,yaw=SPAWN.yaw,eye=EYE;
let playing=false,started=false,awaitingLock=false;
let stickX=0,stickZ=0,lookId=null,stickId=null,previousX=0,previousY=0;
let currentDoor=null,location='',heading='',stepPhase=0;
const velocity={x:0,z:0};

try {
  const scene=new T.Scene();
  scene.background=new T.Color(0x221b16);
  const camera=new T.PerspectiveCamera(72,innerWidth/innerHeight,.045,45);
  camera.rotation.order='YXZ';
  const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  const canvas=renderer.domElement;
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,touch?1.1:1.5));
  renderer.setSize(innerWidth,innerHeight);
  renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.23;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate=false;
  el('world').append(canvas);

  scene.add(new T.HemisphereLight(0xffecdb,0x8d7770,1.54));
  function windowLight(x,y,z,tx,ty,tz,power,angle){
    const light=new T.SpotLight(0xe1ecff,power,12,angle,.65,2);
    light.position.set(x,y,z);light.target.position.set(tx,ty,tz);
    light.castShadow=true;
    light.shadow.mapSize.set(touch?512:1024,touch?512:1024);
    light.shadow.bias=-.00012;light.shadow.normalBias=.025;
    light.shadow.camera.near=.13;light.shadow.camera.far=11;
    scene.add(light,light.target);
  }
  windowLight(-6.98,2.32,3.69,-3.1,.52,2.62,115,.78);
  windowLight(.30,2.69,-5.95,-.62,.90,-1.95,93,.65);
  const {solids,doors}=await buildHouse(scene);
  renderer.shadowMap.needsUpdate=true;

  function cameraPose(){
    camera.position.set(player.x,eye,player.z);
    camera.rotation.set(pitch,yaw,0,'YXZ');
  }
  cameraPose();
  // The paused opening view looks back across the drawing room.
  camera.position.set(-3.21,1.57,5.18);
  camera.lookAt(-5.75,1.21,1.39);
  renderer.compile(scene,camera);
  renderer.render(scene,camera);

  function clearInput(){
    keys.clear();velocity.x=velocity.z=stickX=stickZ=0;
    lookId=stickId=null;el('stick').style.cssText='';
  }
  function showPlay(active){
    playing=active;
    menu.hidden=active;
    el('location').hidden=el('reticle').hidden=el('pause').hidden=!active;
    el('touch').hidden=!active||!touch;
    if(active){ started=true; cameraPose();enter.blur(); }
    else{
      clearInput(); el('interaction').hidden=true;
      el('links').hidden=!started;
      enter.textContent=started?'Resume exploring':'Explore the house';
      if(started)status.textContent='Walkthrough paused';
    }
  }
  function start(){
    showPlay(true);
    if(touch||!canvas.requestPointerLock)return;
    awaitingLock=true;
    try{
      const result=canvas.requestPointerLock();
      result?.catch(()=>{awaitingLock=false;});
    }catch{awaitingLock=false;}
  }
  function stop(){
    if(document.pointerLockElement===canvas)document.exitPointerLock();
    showPlay(false);
  }
  function useDoor(){
    if(!currentDoor||!playing)return;
    currentDoor.target=currentDoor.target===0?currentDoor.openAngle:0;
  }
  function reset(){
    Object.assign(player,SPAWN);
    yaw=SPAWN.yaw;pitch=0;eye=EYE;
    for(const d of doors){
      d.pivot.rotation.y=d.angle=d.target=0;
    }
    renderer.shadowMap.needsUpdate=true;
    cameraPose();
  }
  function look(dx,dy){
    yaw-=dx*.0024;
    pitch=T.MathUtils.clamp(pitch-dy*.0024,-1.36,1.36);
  }

  enter.addEventListener('click',start);
  el('reset').addEventListener('click',reset);
  el('pause').addEventListener('click',stop);
  el('touch-door').addEventListener('click',useDoor);
  el('quiet').checked=matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.addEventListener('pointerlockchange',()=>{
    if(document.pointerLockElement===canvas){awaitingLock=false;return;}
    if(playing && !awaitingLock)showPlay(false);
    awaitingLock=false;
  });
  document.addEventListener('pointerlockerror',()=>{awaitingLock=false;});
  document.addEventListener('mousemove',e=>{
    if(playing&&document.pointerLockElement===canvas)look(e.movementX,e.movementY);
  });
  canvas.addEventListener('pointerdown',e=>{
    if(!playing||document.pointerLockElement===canvas||lookId!==null)return;
    lookId=e.pointerId;previousX=e.clientX;previousY=e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove',e=>{
    if(e.pointerId!==lookId)return;
    look(e.clientX-previousX,e.clientY-previousY);
    previousX=e.clientX;previousY=e.clientY;
  });
  const stick=el('stick');
  function updateStick(e){
    const b=stick.getBoundingClientRect();
    stickX=(e.clientX-b.left-b.width/2)/38;
    stickZ=(e.clientY-b.top-b.height/2)/38;
    const length=Math.max(1,Math.hypot(stickX,stickZ));
    stickX/=length;stickZ/=length;
    stick.style.setProperty('--dx',stickX*35+'px');
    stick.style.setProperty('--dy',stickZ*35+'px');
  }
  stick.addEventListener('pointerdown',e=>{
    if(stickId!==null)return;
    stickId=e.pointerId;stick.setPointerCapture(stickId);updateStick(e);
  });
  stick.addEventListener('pointermove',e=>{if(e.pointerId===stickId)updateStick(e);});
  function releasePointer(e){
    if(e.pointerId===lookId)lookId=null;
    if(e.pointerId===stickId){stickId=null;stickX=stickZ=0;stick.style.cssText='';}
  }
  for(const type of ['pointerup','pointercancel','lostpointercapture']){
    canvas.addEventListener(type,releasePointer);stick.addEventListener(type,releasePointer);
  }
  const movement=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight','ShiftLeft','ShiftRight']);
  addEventListener('keydown',e=>{
    if(!playing)return;
    if(movement.has(e.code)){e.preventDefault();keys.add(e.code);}
    if(e.code==='KeyE'&&!e.repeat)useDoor();
    if(e.code==='Escape')stop();
  });
  addEventListener('keyup',e=>keys.delete(e.code));
  addEventListener('blur',clearInput);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing)stop();});
  addEventListener('resize',()=>{
    camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
    renderer.setSize(innerWidth,innerHeight);
    renderer.render(scene,camera);
  });
  canvas.addEventListener('webglcontextlost',e=>{
    e.preventDefault();stop();enter.disabled=true;status.textContent='Graphics connection lost. Reload this page to continue.';
  });

  function updateDoors(dt){
    for(const door of doors){
      const diff=door.target-door.angle;
      if(Math.abs(diff)<.0005)continue;
      const angle=door.angle+Math.sign(diff)*Math.min(Math.abs(diff),dt*2.35);
      if(doorHits(door,angle,player.x,player.y,player.z))continue;
      door.angle=angle;door.pivot.rotation.y=angle;
    }
  }
  const ray=new T.Ray();
  const pos=new T.Vector3(), facing=new T.Vector3(), aim=new T.Vector3(), hit=new T.Vector3();
  const obstacleBox=new T.Box3();
  function updatePrompt(){
    camera.getWorldPosition(pos);camera.getWorldDirection(facing);
    ray.set(pos,facing);
    let best=2.12;
    // Determine the first blocking thing along the look ray.
    for(const s of solids){
      obstacleBox.min.set(s.minX,s.minY,s.minZ);
      obstacleBox.max.set(s.maxX,s.maxY,s.maxZ);
      if(ray.intersectBox(obstacleBox,hit))best=Math.min(best,pos.distanceTo(hit)+.08);
    }
    currentDoor=null;
    for(const d of doors){
      if(Math.abs(player.y-d.y)>.40)continue;
      const dx=Math.sin(d.angle),dz=Math.cos(d.angle);
      let faceDistance=Infinity;
      // Use the closest point of the visible angled door, or its jamb if open.
      for(const [x,z] of [[d.x+dx*.46,d.z+dz*.46],[d.x,d.z+d.width*.63]]){
        aim.set(x,Math.max(d.y+.5,Math.min(d.y+2.02,pos.y)),z);
        const dist=pos.distanceTo(aim);
        if(dist>best+.26||dist>2.02||dist<.10)continue;
        if(aim.sub(pos).normalize().dot(facing)>.87)faceDistance=Math.min(faceDistance,dist);
      }
      if(faceDistance<best+.15){currentDoor=d;best=faceDistance;}
    }
    const interaction=el('interaction');
    interaction.hidden=!currentDoor;
    if(currentDoor)interaction.querySelector('span').textContent=currentDoor.target===0?'Open door':'Close door';
    el('touch-door').disabled=!currentDoor;
  }
  function updatePlayer(dt){
    const key=(a,b)=>keys.has(a)||keys.has(b);
    let x=stickX+Number(key('KeyD','ArrowRight'))-Number(key('KeyA','ArrowLeft'));
    let z=stickZ+Number(key('KeyS','ArrowDown'))-Number(key('KeyW','ArrowUp'));
    const len=Math.max(1,Math.hypot(x,z));x/=len;z/=len;
    const speed=key('ShiftLeft','ShiftRight')?3.45:2.52;
    const ease=1-Math.exp(-14*dt);
    velocity.x=T.MathUtils.lerp(velocity.x,(Math.cos(yaw)*x+Math.sin(yaw)*z)*speed,ease);
    velocity.z=T.MathUtils.lerp(velocity.z,(Math.cos(yaw)*z-Math.sin(yaw)*x)*speed,ease);
    const oldX=player.x,oldZ=player.z;
    const steps=Math.max(1,Math.ceil(dt/.012));
    for(let i=0;i<steps;i++)movePlayer(player,velocity.x*dt/steps,velocity.z*dt/steps,solids,doors);
    const travelled=Math.hypot(player.x-oldX,player.z-oldZ);
    stepPhase+=travelled*9.7;
    const bob=el('quiet').checked?0:Math.sin(stepPhase)*Math.min(.019,travelled*.7);
    eye=T.MathUtils.lerp(eye,player.y+EYE+bob,1-Math.exp(-19*dt));
    eye=T.MathUtils.clamp(eye,player.y+EYE-.19,player.y+BODY-.016);
    cameraPose();
    const name=locationAt(player.x,player.y,player.z);
    const floor=player.y>LEVEL-.12?'First floor':'Ground floor';
    if(name!==location){el('room').textContent=name;location=name;}
    if(floor!==heading){el('storey').textContent=floor;heading=floor;}
  }

  let last=performance.now(), nextPrompt=0, wasPlaying=false;
  function tick(now){
    requestAnimationFrame(tick);
    const dt=Math.min((now-last)/1000,.038);last=now;
    if(playing){
      updatePlayer(dt);updateDoors(dt);
      if(now>nextPrompt){updatePrompt();nextPrompt=now+50;}
    }
    if(playing||wasPlaying||renderer.shadowMap.needsUpdate)renderer.render(scene,camera);
    wasPlaying=playing;
  }
  requestAnimationFrame(tick);
  status.textContent=touch?'Use the thumbstick to walk and drag to look.':'Explore a furnished two-storey house.';
  if(touch)el('keys').hidden=true;
  enter.disabled=false;
} catch(error) {
  console.error(error);
  status.textContent='The house could not load. Try reloading in a browser with hardware acceleration enabled.';
}
