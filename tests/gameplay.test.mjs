import assert from 'node:assert/strict';
import { BODY,LEVEL } from '../dist/layout.js';
import { createMotion,stepMotion,floorSurface } from '../dist/locomotion.js';
import { synthesize } from '../dist/house-audio.js';

const input=(overrides={})=>({x:0,z:-1,yaw:0,crouch:false,fast:false,steady:false,...overrides});
const dt=1/120;
const player=(x=-.85,z=4)=>({x,z,y:0,height:BODY});
const motion=()=>createMotion();
function ticks(p,m,config,seconds,solids=[],doors=[],footstep){
  for(let i=0;i<Math.round(seconds*120);i++)stepMotion(p,m,config,dt,solids,doors,footstep);
}

{
  const p=player(),m=motion(),steps=[];
  stepMotion(p,m,input(),dt,[],[],()=>{});
  assert(p.z>3.997,'Starts from rest instead of jumping to walking speed');
  ticks(p,m,input(),1.99,[],[],(surface,left,effort)=>steps.push({surface,left,effort}));
  assert(p.z<.33&&p.z>-.1,'Pace is near two metres per second');
  assert(steps.length>=4&&steps.length<=5,'Footsteps have a natural stride cadence');
  assert(steps.every((s,i)=>!i||s.left!==steps[i-1].left),'Footsteps alternate sides');
  assert(steps.some(s=>s.surface==='stone'),'Footstep uses the floor under the player');
  const stopAt=p.z;
  ticks(p,m,input({z:0}),.26,[],[],()=>steps.push({}));
  const stepTotal=steps.length;
  ticks(p,m,input({z:0}),1.24,[],[],()=>steps.push({}));
  assert(stopAt-p.z<.155,'Brake distance is short but nonzero');
  assert.equal(steps.length,stepTotal,'Settling in place makes no extra footsteps');
  assert(Math.abs(m.bob)<.0001&&Math.abs(m.roll)<.0001,'Camera settles when the player stops');
}
{
  const walk=player(),shift=player(),crouch=player(),diagonal=player();
  const steady=motion();
  ticks(walk,motion(),input(),1.0);
  ticks(shift,motion(),input({fast:true}),1.0);
  ticks(crouch,steady,input({crouch:true,steady:true}),1.0);
  ticks(diagonal,motion(),input({x:1,z:-1}),1.0);
  assert(shift.z<walk.z-.6,'Quick walk changes speed');
  assert(crouch.z>walk.z+.47,'Crouch slows down');
  assert(crouch.height<1.29&&steady.eye<1.18,'Crouch changes collider and eye height');
  assert.equal(steady.bob,0,'Steady camera suppresses head bob');
  assert.equal(steady.roll,0,'Steady camera suppresses camera roll');
  assert(Math.hypot(diagonal.x+.85,diagonal.z-4)<4-walk.z,'Diagonal movement respects speed cap');
}
{
  const lowBeam={minX:-1.4,maxX:-.32,minY:1.4,maxY:2.2,minZ:2.2,maxZ:3.2};
  const p=player(-.85,3.8),m=motion();
  ticks(p,m,input(),1,[lowBeam]);
  assert(p.z>3.4,'Standing does not pass through a low obstruction');
  ticks(p,m,input({crouch:true}),.64,[lowBeam]);
  assert(p.z<3.35,'Crouch clears the low obstruction');
  ticks(p,m,input({z:0}),.42,[lowBeam]);
  assert(p.height<1.35,'Cannot stand while under a low beam');
  ticks(p,m,input({crouch:true}),1.35,[lowBeam]);
  ticks(p,m,input({z:0}),.8,[lowBeam]);
  assert(p.height>1.74,'Restores standing after exiting the obstruction');
}
{
  assert.equal(floorSurface({x:-.84,y:0,z:-3}),'carpet');
  assert.equal(floorSurface({x:.1,y:0,z:4.4}),'stone');
  assert.equal(floorSurface({x:3.4,y:0,z:-4}),'tile');
  assert.equal(floorSurface({x:-3.1,y:LEVEL,z:5.4}),'wood');
  assert.equal(floorSurface({x:1.1,y:1.7,z:.5}),'stair-runner');
  assert.equal(floorSurface({x:1.68,y:1.7,z:.5}),'stair');
  const p=player(1.10,3.56),m=motion(),feet=[];
  ticks(p,m,input(),5,[],[],(surface)=>feet.push(surface));
  assert.equal(p.y,LEVEL,'Walk timing gets the player upstairs');
  assert(p.z<-2.2,'Player reaches the landing');
  assert(feet.filter(s=>s==='stair-runner').length>=11,'Stair climb produces a distinct cadence');
}
{
  const surfaces=['stone','tile','wood','stair','carpet','stair-runner'];
  const cues=['hinge','handle','latch','switch','drawer','page','clock','tick','fire','wind','water','chair','creak'];
  const observed=new Set();
  for(const key of [...surfaces,...cues]){
    const left=synthesize(key,1),repeat=synthesize(key,1),right=synthesize(key,2);
    assert(left.length>1800);
    assert.deepEqual(left,repeat,'Identical seeds play deterministic sound');
    assert(left.some((value,i)=>value!==right[i]),key+' has multiple sound variations');
    let sum=0,peak=0;
    for(const sample of left){
      assert(Number.isFinite(sample)&&Math.abs(sample)<1);
      sum+=sample*sample;peak=Math.max(peak,Math.abs(sample));
    }
    assert(peak>.01,'Audio asset contains a signal');
    if(['fire','wind','water'].includes(key)){
      assert(Math.abs(left[0]-left.at(-1))<.23,'Ambient loop blends across the seam');
    }else assert(Math.abs(left[0])<.0001&&Math.abs(left.at(-1))<.01,'Sample boundaries avoid clicks');
    observed.add(Math.round(Math.sqrt(sum/left.length)*1e5));
  }
  assert(observed.size>=14,'Sounds have clearly distinct envelopes');
}
console.log('Locomotion, stair cadence, crouch collision, and 19 audio sound families passed.');
