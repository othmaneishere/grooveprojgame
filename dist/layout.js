export const LEVEL = 3.36;
export const WALL = 3.18;
export const HALL = 1.94;
export const WIDTH = 7.5;
export const DEPTH = 6.4;
export const STAIR = { left:.40, right:1.80, top:-2.20, bottom:3.24, count:19 };
export const SPAWN = { x:-.86, y:0, z:5.73, yaw:-.16 };
export const RADIUS = .235;
export const BODY = 1.76;
export const EYE = 1.63;

export const rooms = [
  { name:'Drawing room', side:-1, front:true, level:0, door:4.53, color:0x80968a },
  { name:'Library', side:-1, front:false, level:0, door:-3.91, color:0x706c5f },
  { name:'Dining room', side:1, front:true, level:0, door:4.53, color:0xc19880 },
  { name:'Kitchen', side:1, front:false, level:0, door:-3.91, color:0xb9b49d },
  { name:'Principal bedroom', side:-1, front:true, level:1, door:4.53, color:0xa3a896 },
  { name:'Reading room', side:-1, front:false, level:1, door:-3.91, color:0xb3a181 },
  { name:'Guest bedroom', side:1, front:true, level:1, door:4.53, color:0xb6a6a0 },
  { name:'Bathroom', side:1, front:false, level:1, door:-3.91, color:0xc9c8b7 },
];

export function locationAt(x,y,z) {
  const level = y > LEVEL-.12 ? 1 : 0;
  if (Math.abs(x) <= HALL) return level ? 'Upper landing' : 'Entrance hall';
  return rooms.find(room => room.level === level && room.side === Math.sign(x) && room.front === (z>0)).name;
}

export function stairHeight(z) {
  const { top,bottom,count } = STAIR;
  return LEVEL * Math.max(0,Math.min(count,Math.ceil((bottom-z)*count/(bottom-top)))) / count;
}

export function floorAt(x,z,currentY) {
  const { top,bottom,left,right } = STAIR;
  const onFlight = x >= left-.04 && x <= right+.04 && z >= top && z <= bottom;
  if (onFlight) return stairHeight(z);
  if (currentY > LEVEL-.43) return LEVEL;
  return 0;
}

export function overlaps(x,y,z,b,height=BODY) {
  if (y >= b.maxY-.01 || y+height <= b.minY) return false;
  const dx = x-Math.max(b.minX,Math.min(x,b.maxX));
  const dz = z-Math.max(b.minZ,Math.min(z,b.maxZ));
  return dx*dx+dz*dz < RADIUS*RADIUS;
}

export function doorHits(door,angle,x,y,z,height=BODY) {
  if (y >= door.y+2.36 || y+height <= door.y) return false;
  const dx=x-door.x, dz=z-door.z;
  const along=dx*Math.sin(angle)+dz*Math.cos(angle);
  const across=dx*Math.cos(angle)-dz*Math.sin(angle);
  const end=along-Math.max(0,Math.min(along,door.width));
  const edge=Math.max(0,Math.abs(across)-.042);
  return end*end+edge*edge < RADIUS*RADIUS;
}

export function indexSolids(solids, cellSize=1.5) {
  const cells=new Map();
  for(const solid of solids){
    const left=Math.floor((solid.minX-RADIUS)/cellSize);
    const right=Math.floor((solid.maxX+RADIUS)/cellSize);
    const near=Math.floor((solid.minZ-RADIUS)/cellSize);
    const far=Math.floor((solid.maxZ+RADIUS)/cellSize);
    for(let x=left;x<=right;x++)for(let z=near;z<=far;z++){
      const key=x+':'+z;
      if(!cells.has(key))cells.set(key,[]);
      cells.get(key).push(solid);
    }
  }
  const empty=[];
  return (x,z)=>cells.get(Math.floor(x/cellSize)+':'+Math.floor(z/cellSize))??empty;
}

export function canOccupy(x,y,z,height,solids,doors) {
  const nearby=typeof solids==='function'?solids(x,z):solids;
  return !nearby.some(b=>overlaps(x,y,z,b,height)) &&
    !doors.some(d=>doorHits(d,d.angle,x,y,z,height));
}

function advance(player,dx,dz,solids,doors){
  const x=player.x+dx,z=player.z+dz,y=floorAt(x,z,player.y);
  if(Math.abs(y-player.y)>.25 || !canOccupy(x,y,z,player.height??BODY,solids,doors))return false;
  Object.assign(player,{x,y,z});
  return true;
}

export function movePlayer(player, dx, dz, solids, doors) {
  const steps=Math.ceil(Math.hypot(dx,dz)/.065);
  if(!steps)return;
  dx/=steps;dz/=steps;
  for(let i=0;i<steps;i++){
    if(advance(player,dx,dz,solids,doors))continue;
    if(Math.abs(dx)>=Math.abs(dz)){
      if(dx)advance(player,dx,0,solids,doors);
      if(dz)advance(player,0,dz,solids,doors);
    }else{
      if(dz)advance(player,0,dz,solids,doors);
      if(dx)advance(player,dx,0,solids,doors);
    }
  }
}

export function advanceDoor(door,dt,player){
  if(door.angle===door.target && !door.speed)return 'rest';
  const opening=door.target!==0;
  const oldAngle=door.angle;
  const delta=door.target-oldAngle;
  const velocity=(door.speed??0)+(delta*(opening?31:42)-(door.speed??0)*11.7)*dt;
  const speed=Math.max(-2.7,Math.min(2.7,velocity));
  let next=oldAngle+speed*dt;
  const settled=delta*(door.target-next)<=0 || (Math.abs(delta)<.0035 && Math.abs(speed)<.095);
  if(settled)next=door.target;
  if(doorHits(door,next,player.x,player.y,player.z,player.height??BODY)){
    door.speed=0;
    return 'blocked';
  }
  door.angle=next;
  door.speed=settled?0:speed;
  return settled?(opening?'open':'latched'):'moving';
}
