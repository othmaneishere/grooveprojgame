import { BODY,DEPTH,EYE,HALL,LEVEL,STAIR,WIDTH,canOccupy,locationAt,movePlayer } from './layout.js';

const CROUCH_HEIGHT=1.27;
const CROUCH_EYE=1.14;
const TAU=2*Math.PI;
const mix=(a,b,t)=>a+(b-a)*t;
const ease=(rate,dt)=>1-Math.exp(-rate*dt);
const WALK_SPEED=1.98;
const carpets={
  'Entrance hall':[-.84,-3.09,1.30,4.37],
  'Upper landing':[-.77,.42,1.24,6.23],
  'Drawing room':[-.20,.21,3.28,3.8],
  'Library':[-.25,.08,3.56,3.55],
  'Dining room':[.13,-.16,3.47,3.91],
  'Principal bedroom':[0,-.71,3.8,3.73],
  'Guest bedroom':[0,-.71,3.8,3.73],
  'Reading room':[-.03,.04,3.46,3.48],
};

function onStairs(p){
  return p.x>STAIR.left&&p.x<STAIR.right&&p.z>STAIR.top&&p.z<STAIR.bottom;
}
export function floorSurface(p){
  if(onStairs(p))return Math.abs(p.x-(STAIR.left+STAIR.right)/2)<.505?'stair-runner':'stair';
  const room=locationAt(p.x,p.y,p.z);
  const rug=carpets[room];
  const x=Math.abs(p.x)<HALL?p.x:p.x-Math.sign(p.x)*(WIDTH+HALL)/2;
  const z=Math.abs(p.x)<HALL?p.z:p.z-Math.sign(p.z)*DEPTH/2;
  if(rug && Math.abs(x-rug[0])<rug[2]/2 && Math.abs(z-rug[1])<rug[3]/2)return 'carpet';
  if(room==='Kitchen'||room==='Bathroom')return 'tile';
  return p.y<LEVEL/2 && Math.abs(p.x)<HALL?'stone':'wood';
}

export function createMotion(y=0){
  return {vx:0,vz:0,height:BODY,eye:y+EYE,bob:0,sway:0,roll:0,pitch:0,
    gait:0,stepDistance:0,left:false,lastStepAge:1};
}

export function stepMotion(p,m,input,dt,solids,doors,onFootstep){
  const inputLength=Math.max(1,Math.hypot(input.x,input.z));
  const crouch=input.crouch || !canOccupy(p.x,p.y,p.z,BODY,solids,doors);
  const targetHeight=crouch?CROUCH_HEIGHT:BODY;
  m.height=mix(m.height,targetHeight,ease(crouch?13:10,dt));
  p.height=m.height;
  const x=input.x/inputLength,z=input.z/inputLength;
  const baseSpeed=onStairs(p)?(crouch?.84:input.fast?1.54:1.21):crouch?1.20:input.fast?3.02:WALK_SPEED;
  const speed=baseSpeed*(z>.02?.78:1-.095*Math.abs(x));
  const c=Math.cos(input.yaw),s=Math.sin(input.yaw);
  const stick=Math.hypot(x,z);
  const rate=stick>.02?(input.fast?8.7:11.0):15.8;
  m.vx=mix(m.vx,(c*x+s*z)*speed,ease(rate,dt));
  m.vz=mix(m.vz,(c*z-s*x)*speed,ease(rate,dt));
  if(stick<.01&&Math.hypot(m.vx,m.vz)<.006)m.vx=m.vz=0;
  const px=p.x,pz=p.z,py=p.y;
  movePlayer(p,m.vx*dt,m.vz*dt,solids,doors);
  const dx=p.x-px,dz=p.z-pz,travel=Math.hypot(dx,dz);
  const rateOfTravel=travel/dt;
  // Remove force into collision surfaces so changing direction does not stick.
  if(Math.abs(dx)<Math.abs(m.vx*dt)*.1)m.vx*=Math.exp(-24*dt);
  if(Math.abs(dz)<Math.abs(m.vz*dt)*.1)m.vz*=Math.exp(-24*dt);
  const stepLength=onStairs(p)?.45:crouch?.58:input.fast?.94:.77;
  m.gait=(m.gait+(travel/stepLength)*Math.PI)%TAU;
  m.lastStepAge+=dt;
  m.stepDistance+=travel;
  const stairStep=Math.abs(py-p.y)>.10;
  if((m.stepDistance>=stepLength || (stairStep&&m.stepDistance>.23))&&m.lastStepAge>.12){
    m.left=!m.left;
    m.stepDistance=0;m.lastStepAge=0;
    const force=Math.min(1.16,rateOfTravel/(stairStep?1.30:WALK_SPEED))*(crouch?.58:1);
    onFootstep?.(floorSurface(p),m.left,force);
  }
  if(rateOfTravel<.06&&m.lastStepAge>.51)m.stepDistance=Math.min(m.stepDistance,.26);
  const energy=Math.min(1.30,rateOfTravel/WALK_SPEED)*(crouch?.47:1);
  const allowed=input.steady?0:energy;
  m.bob=mix(m.bob,Math.cos(m.gait*2)*.017*allowed,ease(19,dt));
  m.sway=mix(m.sway,Math.sin(m.gait)*.018*allowed,ease(14,dt));
  m.roll=mix(m.roll,Math.sin(m.gait)*.008*allowed-x*.011*allowed,ease(12,dt));
  m.pitch=mix(m.pitch,Math.sin(m.gait*2)*.007*allowed,ease(12,dt));
  const baseEye=mix(CROUCH_EYE,EYE,(m.height-CROUCH_HEIGHT)/(BODY-CROUCH_HEIGHT));
  const targetEye=p.y+baseEye+m.bob;
  m.eye=mix(m.eye,targetEye,ease(stairStep?18:22,dt));
  m.eye=Math.max(p.y+baseEye-.20,Math.min(p.y+m.height-.028,m.eye));
}
