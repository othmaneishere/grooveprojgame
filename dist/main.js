import * as T from 'three';
import { buildHouse } from './house.js';
import { EYE,LEVEL,SPAWN,advanceDoor,indexSolids,locationAt } from './layout.js';
import { createMotion,stepMotion } from './locomotion.js';
import { pickInteraction,occludedByHouse } from './interactions.js';
import { HouseAudio } from './house-audio.js';
import { createLighting,lightingProfiles } from './lighting.js';
import { createImagePipeline } from './image-pipeline.js';

const el=id=>document.getElementById(id);
const menu=el('menu'),enter=el('enter'),status=el('status');
const settings={
  volume:.58,sensitivity:1,graphics:'auto',atmosphere:'day',
  steady:matchMedia('(prefers-reduced-motion: reduce)').matches,
};
try{
  const saved=JSON.parse(localStorage.getItem('ashbourne-settings')||'{}');
  if(Number.isFinite(saved.volume))settings.volume=T.MathUtils.clamp(saved.volume,0,1);
  if(Number.isFinite(saved.sensitivity))settings.sensitivity=T.MathUtils.clamp(saved.sensitivity,.5,1.75);
  if(saved.graphics==='auto'||Object.hasOwn(lightingProfiles,saved.graphics))settings.graphics=saved.graphics;
  if(saved.atmosphere==='evening')settings.atmosphere=saved.atmosphere;
  if(typeof saved.steady==='boolean')settings.steady=saved.steady;
}catch{ /* Private browsing can restrict local storage. */ }

const touch=matchMedia('(pointer:coarse)').matches;
document.body.classList.toggle('touch-mode',touch);
const audio=new HouseAudio(settings.volume);
const keys=new Set();
const player={...SPAWN};
let motion=createMotion(player.y);
const input={x:0,z:0,yaw:SPAWN.yaw,crouch:false,fast:false,steady:settings.steady};
let pitch=0,yaw=SPAWN.yaw;
let playing=false,started=false,lockedHere=false,crouched=false;
let stickX=0,stickZ=0,lookId=null,stickId=null,previousX=0,previousY=0;
let currentTarget=null,location='',heading='';

async function boot(){
  const scene=new T.Scene();
  scene.background=new T.Color(0x211b18);
  const camera=new T.PerspectiveCamera(touch?70:72,innerWidth/innerHeight,.055,35);
  camera.rotation.order='YXZ';
  const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  const canvas=renderer.domElement;
  renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.09;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate=false;
  el('world').append(canvas);

  const preferred=()=>settings.graphics==='auto'?(touch?'performance':'balanced'):settings.graphics;
  const deviceScale=()=>Math.min(devicePixelRatio||1,lightingProfiles[preferred()].ratio,touch?1.24:1.65);
  let resolution=deviceScale(),frameMean=16.7,scaleAge=0,playAge=0;
  function resizeRenderer(){
    renderer.setPixelRatio(resolution);
    renderer.setSize(innerWidth,innerHeight,false);
  }
  resizeRenderer();
  status.textContent='Preparing rooms and materials…';
  const world=await buildHouse(scene,{onProgress(loaded,total){
    if(loaded%7===0||loaded===total)status.textContent='Loading materials '+loaded+' / '+total+'…';
  }});
  const {solids,dynamicSolids,doors,props,updates,sounds}=world;
  const sceneSolids=[...solids,...dynamicSolids];
  audio.emitters=sounds;
  const nearby=indexSolids(solids);
  const collision=(x,z)=>{
    const indexed=nearby(x,z);
    const moving=dynamicSolids.filter(body=>body.enabled);
    return moving.length?[...indexed,...moving]:indexed;
  };
  const lighting=createLighting(scene,renderer,world,preferred());
  lighting.setAtmosphere(settings.atmosphere);
  const pipeline=createImagePipeline(renderer,camera);
  const render=()=>pipeline.render(scene,preferred()==='high');
  const mouth=new T.Vector3(),forward=new T.Vector3();
  const footstep=(surface,left,effort)=>audio.footstep(surface,left,effort);
  const interaction=el('interaction'),prompt=interaction.querySelector('span');
  const touchUse=el('touch-use'),ledger=el('ledger');
  const lookHint=el('look-hint');

  function cameraPose(){
    const lean=motion.sway;
    camera.position.set(player.x+Math.cos(yaw)*lean,motion.eye,player.z-Math.sin(yaw)*lean);
    camera.rotation.set(pitch+motion.pitch,yaw,motion.roll,'YXZ');
  }
  camera.position.set(-3.21,1.57,5.18);
  camera.lookAt(-5.75,1.21,1.39);
  const introPlace={x:camera.position.x,y:0,z:camera.position.z};
  lighting.update(.016,introPlace,'Drawing room',true,settings.steady,camera);
  status.textContent='Preparing lighting and reflections…';
  if(renderer.compileAsync)await renderer.compileAsync(scene,camera);
  else renderer.compile(scene,camera);
  render();

  function clearInput(){
    keys.clear();motion.vx=motion.vz=stickX=stickZ=0;
    lookId=stickId=null;el('stick').style.cssText='';
  }
  function showPlay(active){
    playing=active;
    menu.hidden=active;
    el('location').hidden=el('reticle').hidden=el('pause').hidden=!active;
    el('touch').hidden=!active||!touch;
    audio.setActive(active);
    if(active){
      started=true;playAge=0;cameraPose();enter.blur();
    }else{
      clearInput();
      interaction.hidden=true;el('reticle').dataset.ready='false';currentTarget=null;
      lookHint.hidden=true;
      el('links').hidden=!started;
      enter.textContent=started?'Resume exploring':'Explore the house';
      if(started)status.textContent='Walkthrough paused';
      if(document.hasFocus()&&!ledger.open)enter.focus({preventScroll:true});
    }
  }
  function start(){
    try{audio.unlock();}catch(error){console.warn('Audio unavailable',error);}
    showPlay(true);
    if(touch)return;
    if(!canvas.requestPointerLock){lookHint.hidden=false;return;}
    try{
      const result=canvas.requestPointerLock();
      result?.catch(()=>{if(playing)lookHint.hidden=false;});
    }catch{if(playing)lookHint.hidden=false;}
  }
  function stop(){
    showPlay(false);
    if(document.pointerLockElement===canvas)document.exitPointerLock();
  }
  function playAt(kind,position,power){
    if(kind)audio.event(kind,position,power);
  }
  function useTarget(){
    if(!playing)return;
    updatePrompt();
    const target=currentTarget;
    if(!target)return;
    if(target.kind==='door'){
      target.target=target.target===0?target.openAngle:0;
      target.handleTime=.36;
      target.wasMoving=false;
      playAt('handle',[target.x,target.y+1.04,target.z+.91],.54);
    }else{
      const sound=target.use();
      playAt(sound==='ledger'?'page':sound,target.point.toArray(),.54);
      if(sound==='ledger'){
        stop();
        menu.hidden=true;
        ledger.showModal();
      }
    }
    updatePrompt();
  }
  function reset(){
    Object.assign(player,SPAWN);
    yaw=SPAWN.yaw;pitch=0;motion=createMotion(player.y);crouched=false;
    player.height=motion.height;
    el('touch-crouch').setAttribute('aria-pressed','false');
    for(const door of doors){
      door.pivot.rotation.y=door.angle=door.target=door.speed=door.handleTime=0;
      for(const handle of door.handles)handle.rotation.z=0;
    }
    for(const prop of props)prop.reset?.();
    for(const update of updates)update(.12,settings.steady,player);
    cameraPose();
    lighting.update(.02,player,'Entrance hall',true,settings.steady,camera);
    renderer.shadowMap.needsUpdate=true;
    render();
  }
  function look(dx,dy){
    const amount=.0024*settings.sensitivity;
    yaw=(yaw-dx*amount)%(2*Math.PI);
    pitch=T.MathUtils.clamp(pitch-dy*amount,-1.36,1.36);
  }
  function writeSettings(){
    try{localStorage.setItem('ashbourne-settings',JSON.stringify(settings));}catch{}
  }
  el('quiet').checked=settings.steady;
  el('graphics').value=settings.graphics;
  el('atmosphere').value=settings.atmosphere;
  el('volume').value=Math.round(settings.volume*100);
  el('sensitivity').value=Math.round(settings.sensitivity*100);
  el('quiet').addEventListener('change',e=>{settings.steady=e.target.checked;writeSettings();});
  el('volume').addEventListener('input',e=>{
    settings.volume=Number(e.target.value)/100;audio.setVolume(settings.volume);writeSettings();
  });
  el('sensitivity').addEventListener('input',e=>{settings.sensitivity=Number(e.target.value)/100;writeSettings();});
  el('graphics').addEventListener('change',e=>{
    settings.graphics=e.target.value;
    resolution=deviceScale();resizeRenderer();
    lighting.setProfile(preferred());
    render();
    writeSettings();
  });
  el('atmosphere').addEventListener('change',e=>{
    settings.atmosphere=e.target.value;
    lighting.setAtmosphere(settings.atmosphere);
    const name=started?locationAt(player.x,player.y,player.z):'Drawing room';
    lighting.update(.02,started?player:introPlace,name,true,settings.steady,camera);
    render();
    writeSettings();
  });
  enter.addEventListener('click',start);
  el('reset').addEventListener('click',reset);
  el('pause').addEventListener('click',stop);
  touchUse.addEventListener('click',useTarget);
  el('touch-crouch').addEventListener('click',e=>{
    crouched=!crouched;e.currentTarget.setAttribute('aria-pressed',String(crouched));
  });
  ledger.addEventListener('close',()=>{menu.hidden=false;enter.focus();});

  document.addEventListener('pointerlockchange',()=>{
    const here=document.pointerLockElement===canvas;
    if(here&&!playing){
      document.exitPointerLock();
      return;
    }
    if(lockedHere&&!here&&playing)showPlay(false);
    lockedHere=here;
    if(here)lookHint.hidden=true;
  });
  document.addEventListener('pointerlockerror',()=>{if(playing&&!touch)lookHint.hidden=false;});
  document.addEventListener('mousemove',e=>{
    if(playing&&lockedHere)look(e.movementX,e.movementY);
  });
  canvas.addEventListener('pointerdown',e=>{
    if(!playing||lockedHere||lookId!==null||(e.pointerType==='mouse'&&e.button!==0))return;
    lookHint.hidden=true;
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
    const max=(b.width*.37);
    stickX=(e.clientX-b.left-b.width/2)/max;
    stickZ=(e.clientY-b.top-b.height/2)/max;
    const length=Math.max(1,Math.hypot(stickX,stickZ));
    stickX/=length;stickZ/=length;
    stick.style.setProperty('--dx',stickX*(max-3)+'px');
    stick.style.setProperty('--dy',stickZ*(max-3)+'px');
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
  const movement=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight',
    'ShiftLeft','ShiftRight','KeyC','KeyQ','KeyR','PageUp','PageDown']);
  addEventListener('keydown',e=>{
    if(!playing)return;
    if(movement.has(e.code)){e.preventDefault();keys.add(e.code);}
    if(e.code==='KeyE'&&!e.repeat)useTarget();
    if(e.code==='Escape')stop();
  });
  addEventListener('keyup',e=>keys.delete(e.code));
  addEventListener('blur',clearInput);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing)stop();});
  addEventListener('resize',()=>{
    camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
    resizeRenderer();render();
  });
  canvas.addEventListener('webglcontextlost',e=>{
    e.preventDefault();stop();enter.disabled=true;
    status.textContent='Graphics connection lost. Reload this page to continue.';
  });
  canvas.addEventListener('webglcontextrestored',()=>window.location.reload());

  function updatePrompt(){
    if(!playing)return;
    camera.getWorldPosition(mouth);camera.getWorldDirection(forward);
    currentTarget=pickInteraction(mouth,forward,sceneSolids,doors,props);
    const active=Boolean(currentTarget);
    if(interaction.hidden===active)interaction.hidden=!active;
    el('reticle').dataset.ready=String(active);
    if(active){
      const line=currentTarget.kind==='door'?(currentTarget.target===0?'Open door':'Close door'):currentTarget.label();
      if(prompt.textContent!==line)prompt.textContent=line;
    }
    if(touch)touchUse.disabled=!active;
  }
  function updateDoors(dt){
    for(const door of doors){
      if(door.handleTime>0){
        door.handleTime=Math.max(0,door.handleTime-dt);
        const press=Math.sin(door.handleTime/.36*Math.PI)*.35;
        for(const handle of door.handles)handle.rotation.z=press;
      }
      if(door.handleTime>.29)continue;
      const result=advanceDoor(door,dt,player);
      door.pivot.rotation.y=door.angle;
      if(result==='moving'&&!door.wasMoving){
        playAt('hinge',[door.x,door.y+1.19,door.z+.23],.30);
        door.wasMoving=true;
      }
      if(result==='latched')playAt('latch',[door.x,door.y+1.04,door.z+.92],.53);
    }
  }
  function readInput(dt){
    const key=(a,b)=>keys.has(a)||keys.has(b);
    const turn=Number(keys.has('KeyR'))-Number(keys.has('KeyQ'));
    const tilt=Number(keys.has('PageDown'))-Number(keys.has('PageUp'));
    if(turn||tilt)look(turn*610*dt,tilt*440*dt);
    input.x=stickX+Number(key('KeyD','ArrowRight'))-Number(key('KeyA','ArrowLeft'));
    input.z=stickZ+Number(key('KeyS','ArrowDown'))-Number(key('KeyW','ArrowUp'));
    input.yaw=yaw;
    input.crouch=crouched||keys.has('KeyC');
    input.fast=key('ShiftLeft','ShiftRight');
    input.steady=settings.steady;
  }
  function updatePlace(){
    const name=locationAt(player.x,player.y,player.z);
    const floor=player.y>LEVEL-.12?'First floor':'Ground floor';
    if(name!==location){el('room').textContent=name;location=name;}
    if(floor!==heading){el('storey').textContent=floor;heading=floor;}
    return name;
  }
  function adjustQuality(ms,dt){
    if(settings.graphics!=='auto'||playAge<3)return;
    frameMean=T.MathUtils.lerp(frameMean,Math.min(ms,95),1-Math.exp(-dt*1.7));
    scaleAge+=dt;
    if(scaleAge<2.35)return;
    const ceiling=deviceScale(),floor=touch?.62:.65;
    const next=frameMean>26?Math.max(floor,resolution*.89):
      frameMean<17.4?Math.min(ceiling,resolution*1.05):resolution;
    if(Math.abs(next-resolution)>.025){
      resolution=next;resizeRenderer();
    }
    scaleAge=0;
  }

  const STEP=1/120;
  let last=performance.now(),nextPrompt=0,nextAudio=0,accumulator=0,wasPlaying=false;
  function tick(now){
    requestAnimationFrame(tick);
    const ms=Math.max(0,now-last),dt=Math.min(ms/1000,.10);last=now;
    if(playing){
      playAge+=dt;
      readInput(dt);accumulator+=dt;
      while(accumulator>=STEP){
        updateDoors(STEP);
        stepMotion(player,motion,input,STEP,collision,doors,footstep);
        accumulator-=STEP;
      }
      for(const update of updates)update(dt,settings.steady,player);
      cameraPose();
      const room=updatePlace();
      lighting.update(dt,player,room,false,settings.steady,camera);
      if(now>=nextPrompt){nextPrompt=now+40;updatePrompt();}
      if(now>=nextAudio){
        nextAudio=now+100;
        camera.getWorldPosition(mouth);camera.getWorldDirection(forward);
        audio.update(mouth,forward,room,point=>occludedByHouse(mouth,point,sceneSolids,doors));
      }
      adjustQuality(ms,dt);
    }else accumulator=0;
    if(playing||wasPlaying||renderer.shadowMap.needsUpdate)render();
    wasPlaying=playing;
  }
  requestAnimationFrame(tick);
  status.textContent=touch?'Use the thumbstick to walk. Drag anywhere in the room to look.':'Explore a furnished two-storey house.';
  if(touch)el('keys').hidden=true;
  enter.disabled=false;
}

boot().catch(error=>{
  console.error(error);
  status.textContent=error.kind==='asset'?'A material could not load. Check your connection and try again.':
    'Graphics could not start. Enable hardware acceleration in your browser and try again.';
  enter.textContent='Reload game';enter.disabled=false;
  enter.addEventListener('click',()=>window.location.reload(),{once:true});
});
