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

export function overlaps(x,y,z,b) {
  if (y >= b.maxY-.01 || y+BODY <= b.minY) return false;
  const dx = x-Math.max(b.minX,Math.min(x,b.maxX));
  const dz = z-Math.max(b.minZ,Math.min(z,b.maxZ));
  return dx*dx+dz*dz < RADIUS*RADIUS;
}

export function doorHits(door,angle,x,y,z) {
  if (y >= door.y+2.36 || y+BODY <= door.y) return false;
  const dx=x-door.x, dz=z-door.z;
  const along=dx*Math.sin(angle)+dz*Math.cos(angle);
  const across=dx*Math.cos(angle)-dz*Math.sin(angle);
  const end=along-Math.max(0,Math.min(along,door.width));
  const edge=Math.max(0,Math.abs(across)-.042);
  return end*end+edge*edge < RADIUS*RADIUS;
}

export function movePlayer(player, dx, dz, solids, doors) {
  for (const [mx,mz] of [[dx,0],[0,dz]]) {
    const x=player.x+mx, z=player.z+mz;
    const y=floorAt(x,z,player.y);
    if (Math.abs(y-player.y)>.29) continue;
    if (solids.some(b=>overlaps(x,y,z,b))) continue;
    if (doors.some(d=>doorHits(d,d.angle,x,y,z))) continue;
    Object.assign(player,{x,y,z});
  }
}
