import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
const vendor=new URL('../dist/vendor/three.module.min.js',import.meta.url).href;
registerHooks({resolve(spec,ctx,next){return next(spec==='three'?vendor:spec,ctx);}});
const T=await import(vendor);
const loaded=[];
T.TextureLoader.prototype.loadAsync=async url=>{loaded.push(url);return new T.Texture();};
globalThis.document={createElement:()=>({getContext:()=>({
  createRadialGradient:()=>({addColorStop(){}}),fillRect(){},
})})};
const {buildHouse}=await import('../dist/house.js');
const {rooms,LEVEL,SPAWN,BODY,doorHits,movePlayer,locationAt,advanceDoor,indexSolids,canOccupy}=await import('../dist/layout.js');
const {pickInteraction,occludedByHouse}=await import('../dist/interactions.js');
const {createRoomCuller}=await import('../dist/lighting.js');
const {surfaceChannels}=await import('../dist/surface-detail.js');
const {createBlackoutState}=await import('../dist/blackout.js');
const bathroomStory=createBlackoutState();
assert.equal(bathroomStory.toggle(),false,'The lighter cannot ignite before it is collected');
assert.equal(bathroomStory.sit(),true,'First sitting interaction triggers the scare');
assert.equal(bathroomStory.state.power,false);
bathroomStory.stand();
assert.equal(bathroomStory.sit(),false,'Sitting again does not replay the scare');
assert.equal(bathroomStory.collect(),true);
assert.equal(bathroomStory.toggle(),true);
assert.equal(bathroomStory.toggle(),false);
bathroomStory.reset();
assert.deepEqual(bathroomStory.state,{power:true,seated:false,collected:false,lit:false});
const scene=new T.Scene();
const world=await buildHouse(scene);
const {solids,dynamicSolids,doors,props,updates,sounds,roomMeshes}=world;
const colliders=[...solids,...dynamicSolids.filter(b=>b.enabled)];
assert.equal(loaded.length,56);
for(const url of loaded){
  const image=readFileSync(new URL(url));
  assert.equal(image.subarray(8,12).toString(),'WEBP',url);
}
const textureInput=new Uint8ClampedArray([
  210,210,210,255,90,90,90,255,
  91,91,91,255,91,91,91,255,
]);
const finish=surfaceChannels(textureInput,2,2,{roughness:.66,grain:1.6,contrast:.10});
assert(finish[8]>finish[0],'Relief captures a raised bright detail at the correct flipped UV');
assert(finish.every((number,i)=>i%4!==1||(number>=132&&number<=215)),'Roughness remains plausible');
assert.equal(doors.length,rooms.length);
assert.equal(props.filter(prop=>prop.label()==='Switch lights off').length,rooms.length);
assert.equal(sounds.filter(s=>s.kind==='fire').length,2);
assert.equal(sounds.filter(s=>s.kind==='water').length,3);
let triangles=0;
scene.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});
const mapped=new Set();
scene.traverse(o=>{if(o.isMesh&&o.material.map)mapped.add(o.material.map);});
assert.equal([...mapped].filter(map=>map.wrapS===T.MirroredRepeatWrapping).length,36,
  'Every furniture texture is used by a rendered mesh');
let p={...SPAWN};
function walk(target,player=p){
  const dx=target[0]-player.x,dz=target[1]-player.z;
  const n=Math.ceil(Math.hypot(dx,dz)/.035);
  for(let i=0;i<n;i++)movePlayer(player,dx/n,dz/n,colliders,doors);
}
for(const d of doors){
  const side=Math.sign(d.x),z=d.z+d.width/2;
  const q={x:d.x-side*.53,y:d.y,z};
  walk([d.x+side*.94,z],q);
  assert(Math.sign(q.x-d.x)===-side,'Closed leaf blocks travel');
  d.angle=d.openAngle;
  assert(!doorHits(d,d.angle,d.x,d.y,z),'Open leaf clears doorway');
  walk([d.x+side*.94,z],q);
  assert(Math.sign(q.x-d.x)===side,'Open doorway allows entry');
  assert(Math.abs(q.x-(d.x+side*.94))<.06,'Doorway has clear circulation space inside');
  assert.equal(locationAt(q.x,q.y,q.z),rooms[doors.indexOf(d)].name);
  walk([d.x-side*.66,z],q);
  assert(Math.sign(q.x-d.x)===-side,'Open doorway allows exit');
}
const indexed=indexSolids(colliders);
let seed=1792;
const random=()=>(seed=(Math.imul(1664525,seed)+1013904223)>>>0)/4294967296;
for(let i=0;i<3000;i++){
  const x=(random()-.5)*16,y=i%2?LEVEL:0,z=(random()-.5)*14;
  assert.equal(canOccupy(x,y,z,BODY,indexed,doors),canOccupy(x,y,z,BODY,colliders,doors),
    'The spatial index does not lose edge colliders');
}
walk([1.1,3.61]);
assert(Math.abs(p.x-1.1)<.05,'Can reach stair foot from entrance');
walk([1.1,-2.81]);
assert.equal(p.y,LEVEL,'Stairs reach first floor');
assert(p.z<-2.6,'Can leave stairs onto first floor');
walk([-.60,-2.81]);
assert(p.x<-.5,'Can enter landing');
walk([1.1,-2.81]);
walk([1.1,3.61]);
assert.equal(p.y,0,'Stairs descend to ground floor');
assert(p.z>3.54,'Can leave stair foot');
const belowStair={x:1.10,y:0,z:-3.0};
walk([1.10,-1.75],belowStair);
assert(belowStair.z<-2.41,'Player cannot poke through the rear panel under the stairs');
const reachable=[];
for(const level of [0,1]){
  const start={x:-.67,y:level*LEVEL,z:-2.80};
  const points=[start], seen=new Set();
  const stride=.15;
  const id=q=>Math.round(q.x/stride)+':'+Math.round(q.z/stride);
  const visited=new Map();
  for(let i=0;i<points.length;i++){
    const point=points[i];
    const name=locationAt(point.x,point.y,point.z);
    visited.set(name,(visited.get(name)??0)+1);
    for(const [x,z] of [[stride,0],[-stride,0],[0,stride],[0,-stride]]){
      const n={...point};movePlayer(n,x,z,indexed,doors);
      if(n.y!==start.y||seen.has(id(n)))continue;
      assert(Math.abs(n.x)<7.5&&Math.abs(n.z)<6.4,'House shell contains player');
      seen.add(id(n));points.push(n);
    }
  }
  for(const r of rooms.filter(r=>r.level===level))assert((visited.get(r.name)??0)>350,r.name+' is explorable');
  console.log('Explorable floor',level,Object.fromEntries(visited));
  reachable.push(...points);
}
for(const prop of props){
  const label=prop.label();
  const point=prop.point;
  const candidates=reachable.filter(p=>Math.abs(p.y+1.42-point.y)<1.69 &&
    Math.hypot(p.x-point.x,p.z-point.z)<1.94)
    .sort((a,b)=>Math.hypot(b.x-point.x,b.z-point.z)-Math.hypot(a.x-point.x,a.z-point.z));
  const accessible=candidates.some(p=>[1.63,1.14].some(eye=>{
    const origin=new T.Vector3(p.x,p.y+eye,p.z);
    const direction=point.clone().sub(origin).normalize();
    return pickInteraction(origin,direction,colliders,doors,props)===prop;
  }));
  assert(accessible,label+' must be reachable with room geometry in place');
  assert(prop.use(),label+' has an action and feedback sound');
  for(const update of updates)update(1/60,false,SPAWN);
  prop.reset?.();
}
for(const prop of props.filter(p=>p.label()==='Pull chair out'||p.label()==='Open drawer')){
  const before=prop.point.clone();
  const initialBounds=dynamicSolids.map(b=>[b.minX,b.minZ,b.enabled]);
  prop.use();
  for(let i=0;i<160;i++)for(const update of updates)update(1/120,true,SPAWN);
  assert(prop.point.distanceTo(before)>.16,'Interactable moves its hit target with its mesh');
  assert(dynamicSolids.some((b,i)=>Math.hypot(b.minX-initialBounds[i][0],b.minZ-initialBounds[i][1])>.16&&b.enabled),
    'A movable object carries its collision volume');
  prop.reset();
  assert(prop.point.distanceTo(before)<.0001,'Reset restores interaction position');
}
for(const door of doors){
  door.angle=door.speed=door.target=0;
  const blockedAt={x:door.x+Math.sign(door.x)*.54,y:door.y,z:door.z+.45};
  door.target=door.openAngle;
  for(let i=0;i<260;i++)advanceDoor(door,1/120,blockedAt);
  assert(Math.abs(door.angle)<Math.abs(door.openAngle)-.12,'Opening stops against the player');
  assert(!doorHits(door,door.angle,blockedAt.x,blockedAt.y,blockedAt.z),'Resting leaf stays outside player');
  for(let i=0;i<220;i++)advanceDoor(door,1/120,SPAWN);
  assert.equal(door.angle,door.openAngle,'Leaf finishes opening after obstruction moves');
  door.target=0;
  for(let i=0;i<220;i++)advanceDoor(door,1/120,SPAWN);
  assert.equal(door.angle,0,'Leaf latches at the closed stop');
  const cx=door.x-Math.sign(door.x)*.54,cy=door.y+1.63,cz=door.z+.52;
  assert(occludedByHouse({x:cx,y:cy,z:cz},[door.x+Math.sign(door.x)*.54,cy,cz],solids,doors),
    'The closed door attenuates a source across the doorway');
}
const cull=createRoomCuller(world);
cull('Drawing room');
assert(roomMeshes.get('Drawing room').every(o=>o.visible),'Current room stays rendered');
assert(roomMeshes.get('Kitchen').every(o=>!o.visible),'Occluded room is omitted');
assert(roomMeshes.get('door/Drawing room').every(o=>o.visible),'The current door remains visible');
const ceilingRay=new T.Raycaster(new T.Vector3(-4.7,1.61,4.72),new T.Vector3(0,1,0),.05,2.2);
scene.updateMatrixWorld(true);
assert(ceilingRay.intersectObjects(roomMeshes.get('Drawing room')).some(hit=>hit.point.y>3.05&&hit.point.y<3.21),
  'A downstairs ceiling exists independently of the room above');
doors[0].angle=doors[0].openAngle;
cull('Drawing room');
assert(roomMeshes.get('Entrance hall').every(o=>o.visible),'Open doors reveal connecting halls');
assert(roomMeshes.get('Guest bedroom').every(o=>!o.visible),'Other closed rooms stay hidden');
const doorCamera=new T.PerspectiveCamera(69,1.5,.055,35);
doorCamera.position.set(-.55,1.63,4.77);
doorCamera.lookAt(-4.00,1.60,4.48);
cull('Entrance hall',doorCamera);
assert(roomMeshes.get('Drawing room').every(o=>o.visible),'An open doorway in view reveals its room');
doorCamera.lookAt(0,1.63,6.35);
cull('Entrance hall',doorCamera);
assert(roomMeshes.get('Drawing room').every(o=>!o.visible),'An open doorway behind the camera skips its room');
assert(roomMeshes.get('door/Drawing room').every(o=>o.visible),'Room culling preserves door geometry');
scene.traverse(o=>{
  if(!o.isMesh)return;
  const g=o.geometry;
  g.computeBoundingBox();
  for(const n of [...g.boundingBox.min,...g.boundingBox.max])assert(Number.isFinite(n),'Every mesh has finite geometry');
});
console.log({textures:loaded.length,doors:doors.length,reachableProps:props.length,collisionVolumes:solids.length,triangles,sceneObjects:scene.children.length});
