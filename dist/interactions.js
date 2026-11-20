const REACH=2.18;

function axisInterval(start,direction,min,max){
  if(Math.abs(direction)<1e-7)return start<min||start>max?[Infinity,-Infinity]:[-Infinity,Infinity];
  const a=(min-start)/direction,b=(max-start)/direction;
  return [Math.min(a,b),Math.max(a,b)];
}

export function rayBox(o,d,b,maxDistance=Infinity){
  const x=axisInterval(o.x,d.x,b.minX,b.maxX);
  const y=axisInterval(o.y,d.y,b.minY,b.maxY);
  const z=axisInterval(o.z,d.z,b.minZ,b.maxZ);
  const enter=Math.max(x[0],y[0],z[0],0);
  const exit=Math.min(x[1],y[1],z[1],maxDistance);
  return enter<=exit?enter:Infinity;
}

function rayDoor(o,d,door,maxDistance){
  const dx=o.x-door.x,dz=o.z-door.z;
  const s=Math.sin(door.angle),c=Math.cos(door.angle);
  return rayBox(
    {x:dx*c-dz*s,y:o.y-door.y,z:dx*s+dz*c},
    {x:d.x*c-d.z*s,y:d.y,z:d.x*s+d.z*c},
    {minX:-.077,maxX:.077,minY:.025,maxY:2.33,minZ:0,maxZ:door.width},maxDistance,
  );
}

function rayTarget(o,d,p,radius,maxDistance){
  const x=p.x-o.x,y=p.y-o.y,z=p.z-o.z;
  const along=x*d.x+y*d.y+z*d.z;
  if(along<=.05||along>maxDistance)return Infinity;
  const squared=x*x+y*y+z*z-along*along;
  return squared<=radius*radius?along-Math.sqrt(Math.max(0,radius*radius-squared)):Infinity;
}

export function pickInteraction(origin,direction,solids,doors,props){
  let obstruction=REACH+.045;
  for(const b of solids){
    if(b.enabled===false)continue;
    const distance=rayBox(origin,direction,b,obstruction);
    if(distance>.006)obstruction=Math.min(obstruction,distance);
  }
  let nearest=null,best=REACH;
  for(const door of doors){
    const distance=rayDoor(origin,direction,door,REACH);
    if(distance>obstruction+.045||distance>=best)continue;
    nearest=door;best=distance;
  }
  const doorDistance=best;
  for(const prop of props){
    if(prop.enabled===false)continue;
    const d=rayTarget(origin,direction,prop.point,prop.radius??.19,REACH);
    if(d>=best||d>obstruction+.055||d>doorDistance)continue;
    nearest=prop;best=d;
  }
  // Looking through an open doorway near its handle still allows closing it.
  if(!nearest)for(const door of doors){
    if(Math.abs(door.angle)<1.05)continue;
    const d=rayTarget(origin,direction,
      {x:door.x,y:door.y+1.43,z:door.z+door.width*.60},.40,1.42);
    if(d<best&&d<=obstruction+.04){best=d;nearest=door;}
  }
  return nearest;
}

export function occludedByHouse(origin,end,solids,doors){
  const x=end[0]-origin.x,y=end[1]-origin.y,z=end[2]-origin.z;
  const range=Math.hypot(x,y,z);
  if(range<.2)return false;
  const direction={x:x/range,y:y/range,z:z/range};
  for(const b of solids){
    if(b.enabled===false)continue;
    const distance=rayBox(origin,direction,b,range-.14);
    if(distance>.035&&distance<Infinity)return true;
  }
  return doors.some(door=>rayDoor(origin,direction,door,range-.12)<Infinity);
}
