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
const {rooms,LEVEL,SPAWN,doorHits,movePlayer,locationAt}=await import('../dist/layout.js');
const scene=new T.Scene();
const {solids,doors}=await buildHouse(scene);
assert.equal(loaded.length,12);
for(const url of loaded){
  const image=readFileSync(new URL(url));
  assert.equal(image.subarray(8,12).toString(),'WEBP',url);
}
assert.equal(doors.length,rooms.length);
let triangles=0;
scene.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});
let p={...SPAWN};
function walk(target,player=p){
  const dx=target[0]-player.x,dz=target[1]-player.z;
  const n=Math.ceil(Math.hypot(dx,dz)/.035);
  for(let i=0;i<n;i++)movePlayer(player,dx/n,dz/n,solids,doors);
}
for(const d of doors){
  const side=Math.sign(d.x),z=d.z+d.width/2;
  const q={x:d.x-side*.53,y:d.y,z};
  walk([d.x+side*.67,z],q);
  assert(Math.sign(q.x-d.x)===-side,'Closed leaf blocks travel');
  d.angle=d.openAngle;
  assert(!doorHits(d,d.angle,d.x,d.y,z),'Open leaf clears doorway');
  walk([d.x+side*.67,z],q);
  assert(Math.sign(q.x-d.x)===side,'Open doorway allows entry');
  assert.equal(locationAt(q.x,q.y,q.z),rooms[doors.indexOf(d)].name);
  walk([d.x-side*.66,z],q);
  assert(Math.sign(q.x-d.x)===-side,'Open doorway allows exit');
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
      const n={...point};movePlayer(n,x,z,solids,doors);
      if(n.y!==start.y||seen.has(id(n)))continue;
      assert(Math.abs(n.x)<7.5&&Math.abs(n.z)<6.4,'House shell contains player');
      seen.add(id(n));points.push(n);
    }
  }
  for(const r of rooms.filter(r=>r.level===level))assert((visited.get(r.name)??0)>350,r.name+' is explorable');
  console.log('Explorable floor',level,Object.fromEntries(visited));
}
console.log({textures:loaded.length,doors:doors.length,collisionVolumes:solids.length,triangles,sceneObjects:scene.children.length});
