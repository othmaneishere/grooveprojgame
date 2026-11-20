import * as T from 'three';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';
import { LEVEL,WALL,HALL,WIDTH,DEPTH,STAIR,rooms } from './layout.js';
import { furnish } from './furnish.js';
import { furnitureFinish,furnitureSets } from './furniture-materials.js';

export async function buildHouse(scene) {
  const loader=new T.TextureLoader();
  const names=['oak','stone','linen','plaster','landscape','rug','still-life','tile',
    'indigo-rug','flatweave','blossoms','courtyard'];
  const textures=Object.fromEntries(await Promise.all(names.map(async name=>{
    const texture=await loader.loadAsync(new URL('./assets/'+name+'.webp',import.meta.url).href);
    texture.colorSpace=T.SRGBColorSpace;
    texture.anisotropy=4;
    return [name,texture];
  })));
  const furniture=Object.fromEntries(await Promise.all(
    Object.entries(furnitureSets).flatMap(([group, names])=>names.map(async name=>{
      const map=await loader.loadAsync(new URL('./assets/furniture/'+name+'.webp',import.meta.url).href);
      map.colorSpace=T.SRGBColorSpace;
      map.anisotropy=4;
      map.wrapS=map.wrapT=T.MirroredRepeatWrapping;
      const {roughness,metalness,bump}=furnitureFinish(name,group);
      return [name,new T.MeshStandardMaterial({map,roughness,metalness,bumpMap:map,bumpScale:bump})];
    })),
  ));
  const paint=(color,pattern,roughness=.83,metalness=0)=>{
    const map=textures[pattern]??null;
    return new T.MeshStandardMaterial({color,map,roughness,metalness,
      ...(pattern && ['plaster','linen','stone','oak'].includes(pattern) ? {bumpMap:map,bumpScale:.009} : {})});
  };
  const m={
    plaster:paint(0xffe9cc,'plaster'), cream:paint(0xe7dac2), panel:paint(0xcec0a6),
    dark:paint(0x624834,'oak',.52), oak:paint(0xb79772,'oak',.56),
    trim:paint(0x84644b,'oak',.55), floor:[0xc1a180,0xb69372,0xbca082,0xc9aa88,0xb79874].map(c=>paint(c,'oak',.57)),
    stone:paint(0xe9dfc9,'stone',.62), brass:paint(0xc09559,null,.33,.66),
    iron:paint(0x262422,null,.61,.35), black:paint(0x201b19),
    rug:paint(0xf4debd,'rug'), indigo:paint(0xe6e0c8,'indigo-rug'),
    flatweave:paint(0xebddbb,'flatweave'), tile:paint(0xfff2df,'tile',.55),
    landscape:paint(0xfff1d8,'landscape'), still:paint(0xfff1d8,'still-life'),
    blossoms:paint(0xffebd0,'blossoms'), courtyard:paint(0xffedd8,'courtyard'),
    green:paint(0x46675c,'linen'), rust:paint(0xaa6747,'linen'), teal:paint(0x486a6d,'linen'),
    linen:paint(0xffecd0,'linen'), blue:paint(0x3e555e,'linen'), rose:paint(0xa47d76,'linen'),
    leather:paint(0x6d382a,'linen',.55), piping:paint(0xd0ab7a,'linen'),
    ceramic:paint(0x507576,null,.28), porcelain:paint(0xf4e4ce,null,.28),
    glow:new T.MeshStandardMaterial({color:0xffe7b4,emissive:0xffbc6d,emissiveIntensity:.68}),
    glass:new T.MeshStandardMaterial({color:0xb8cbd0,emissive:0xc9dfeb,emissiveIntensity:.66,roughness:.44}),
    ember:new T.MeshStandardMaterial({color:0xff9146,emissive:0xff5c1a,emissiveIntensity:2.2}),
  };
  const staticRoot=new T.Group();
  const movingRoot=new T.Group();
  scene.add(staticRoot,movingRoot);
  const solids=[], doors=[];
  const shapes=new Map();
  const shape=(name,create)=>{
    if (!shapes.has(name)) shapes.set(name,create());
    return shapes.get(name);
  };
  function group(parent,x=0,y=0,z=0,yaw=0){
    const g=new T.Group(); g.position.set(x,y,z); g.rotation.y=yaw; parent.add(g); return g;
  }
  function mesh(parent,g,material,x,y,z){
    const o=new T.Mesh(g,material); o.position.set(x,y,z); parent.add(o); return o;
  }
  function block(parent,x,y,z,w,h,d){
    parent.updateWorldMatrix(true,false);
    const b=new T.Box3(new T.Vector3(x-w/2,y-h/2,z-d/2),new T.Vector3(x+w/2,y+h/2,z+d/2)).applyMatrix4(parent.matrixWorld);
    solids.push({minX:b.min.x,maxX:b.max.x,minY:b.min.y,maxY:b.max.y,minZ:b.min.z,maxZ:b.max.z});
  }
  function box(parent,x,y,z,w,h,d,material,solid=false){
    const o=mesh(parent,shape('box',()=>new T.BoxGeometry()),material,x,y,z);
    o.scale.set(w,h,d);
    if(solid)block(parent,x,y,z,w,h,d);
    return o;
  }
  function oval(parent,x,y,z,w,h,d,material){
    const o=mesh(parent,shape('oval',()=>new T.SphereGeometry(1,16,10)),material,x,y,z);
    o.scale.set(w,h,d); return o;
  }
  function lathe(parent,x,y,z,profile,material,segments=18){
    const key='lathe'+segments+JSON.stringify(profile);
    return mesh(parent,shape(key,()=>new T.LatheGeometry(profile.map(p=>new T.Vector2(...p)),segments)),material,x,y,z);
  }
  function cylinder(parent,x,y,z,r,h,material,rTop=r,n=16){
    return mesh(parent,shape('cylinder'+[rTop,r,h,n],()=>new T.CylinderGeometry(rTop,r,h,n)),material,x,y,z);
  }
  function round(parent,x,y,z,w,h,d,r,material){
    const key='round'+[w,h,d,r];
    const geometry=shape(key,()=>{
      const s=new T.Shape();
      s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);
      s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);
      s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);
      s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);
      s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
      const bevel=Math.min(.028,d*.17);
      const g=new T.ExtrudeGeometry(s,{depth:d-2*bevel,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2,curveSegments:4,steps:1});
      g.translate(0,0,-(d-2*bevel)/2);
      const {uv,position,normal}=g.attributes;
      // Project each triangle onto its facing plane at a uniform physical scale.
      // This gives the top, front and sides separate, unstretched grain.
      for(let i=0;i<uv.count;i+=3){
        const nx=Math.abs(normal.getX(i)),ny=Math.abs(normal.getY(i)),nz=Math.abs(normal.getZ(i));
        const onSide=nx>ny&&nx>nz, onTop=ny>nz&&!onSide;
        for(let j=i;j<i+3;j++){
          const u=onSide?position.getZ(j):position.getX(j);
          const v=onTop?-position.getZ(j):position.getY(j);
          uv.setXY(j,.5+u*1.26,.5+v*1.26);
        }
      }
      return g;
    });
    return mesh(parent,geometry,material,x,y,z);
  }

  const ambientCanvas=Object.assign(document.createElement('canvas'),{width:96,height:96});
  const ctx=ambientCanvas.getContext('2d');
  const gradient=ctx.createRadialGradient(48,48,2,48,48,47);
  gradient.addColorStop(0,'#1d100b99');gradient.addColorStop(.62,'#1d100b50');gradient.addColorStop(1,'#1d100b00');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,96,96);
  const aoMap=new T.CanvasTexture(ambientCanvas);
  const aoMat=new T.MeshBasicMaterial({map:aoMap,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
  function shade(parent,x,z,w,d,y=.006){
    const o=mesh(parent,shape('plane',()=>new T.PlaneGeometry()),aoMat,x,y,z);
    o.rotation.x=-Math.PI/2;o.scale.set(w,d,1);
  }
  function point(x,y,z,color,power,distance){
    const light=new T.PointLight(color,power,distance,2);
    light.position.set(x,y,z);scene.add(light);
    return light;
  }
  function frame(parent,x,y,z,w,h,art){
    box(parent,x,y,z,w+.14,h+.14,.054,m.dark);
    box(parent,x,y,z+.034,w+.095,h+.095,.025,m.brass);
    box(parent,x,y,z+.050,w+.034,h+.034,.012,m.cream);
    box(parent,x,y,z+.059,w,h,.009,art);
  }

  function floor(parent,x0,x1,z0,z1,style='oak',support=false){
    if(x1-x0<.03 || z1-z0<.03)return;
    const w=x1-x0,d=z1-z0;
    box(parent,(x0+x1)/2,-.106,(z0+z1)/2,w,.202,d,m.dark,support);
    if(support)box(parent,(x0+x1)/2,-.219,(z0+z1)/2,w,.026,d,m.plaster);
    if(style==='oak'){
      const rows=Math.ceil(w/.235);
      for(let i=0;i<rows;i++){
        const pw=w/rows;
        for(let z=z0,k=0;z<z1-.001;k++){
          const len=Math.min(z1-z,k===0 ? .59+(i*17%10)*.14 : 1.76);
          box(parent,x0+(i+.5)*pw,-.008,z+len/2,pw-.003,.016,len-.003,m.floor[(i*17+k*13)%5]);
          z+=len;
        }
      }
    }else{
      const nx=Math.ceil(w/.72),nz=Math.ceil(d/.72);
      for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){
        const finish=style==='tile' ? m.tile : (i+j)%2 ? m.stone : m.panel;
        box(parent,x0+(i+.5)*w/nx,-.009,z0+(j+.5)*d/nz,w/nx-.007,.018,d/nz-.007,finish);
      }
    }
  }
  function wall(parent,x,z,yaw,length,finish,panel,opening=null){
    const g=group(parent,x,0,z,yaw);
    const casing=.08;
    function span(a,b){
      const w=b-a,mid=(a+b)/2;
      if(w<=.001)return;
      box(g,mid,WALL/2,.042,w,WALL,.164,finish,true);
      box(g,mid,.47,.137,w,.94,.032,panel);
      box(g,mid,.093,.170,w,.186,.064,m.panel);
      box(g,mid,.96,.170,w,.065,.068,m.cream);
      box(g,mid,3.09,.171,w,.18,.10,m.cream);
      box(g,mid,3.0,.205,w,.035,.054,m.panel);
      const n=Math.max(1,Math.round(w/1.03));
      for(let j=0;j<n;j++){
        const pw=w/n-.19;
        if(pw<.16)continue;
        const px=a+(j+.5)*w/n;
        for(const yy of [.26,.79])box(g,px,yy,.161,pw,.025,.022,m.cream);
        for(const xx of [px-pw/2,px+pw/2])box(g,xx,.525,.161,.025,.55,.022,m.cream);
      }
    }
    if(opening===null)span(-length/2,length/2);
    else{
      span(-length/2,opening-.61);
      span(opening+.61,length/2);
      box(g,opening,(WALL+2.37)/2,.042,1.22,WALL-2.37,.164,finish,true);
      for(const s of [-1,1]){
        box(g,opening+s*.618,1.19,.12,casing,2.38,.31,m.dark);
        box(g,opening+s*.674,1.19,.217,.063,2.38,.074,m.trim);
      }
      box(g,opening,2.39,.16,1.41,.13,.25,m.dark);
      box(g,opening,2.48,.20,1.48,.059,.18,m.trim);
      box(g,opening,.006,.02,1.20,.014,.24,m.trim);
    }
    return g;
  }

  function sash(parent,x,y,z,w=1.62,h=1.87,curtain=m.green){
    box(parent,x,y,z,w+.21,h+.20,.12,m.cream);
    box(parent,x,y,z+.07,w,h,.04,m.dark);
    box(parent,x,y,z+.096,w-.17,h-.17,.022,m.glass);
    for(const xx of [-.5,-.17,.17,.5])box(parent,x+xx*(w-.10),y,z+.124,.046,h-.10,.042,m.cream);
    for(const yy of [-.5,-.27,0,.27,.5])box(parent,x,y+yy*(h-.09),z+.124,w-.10,.051,.046,m.cream);
    box(parent,x,y-h/2-.04,z+.13,w+.32,.089,.26,m.stone);
    if(!curtain)return;
    cylinder(parent,x,y+h/2+.16,z+.26,.019,w+.58,m.brass).rotation.z=Math.PI/2;
    for(const side of [-1,1]){
      oval(parent,x+side*(w/2+.29),y+h/2+.16,z+.26,.038,.038,.041,m.brass);
      for(let i=0;i<10;i++){
        const xx=x+side*(w/2-.16+i*.063);
        oval(parent,xx,y-.25,z+.21+Math.sin(i*1.7)*.043,.064,h*.65,.058,curtain);
      }
    }
  }

  const hallGroups=[group(staticRoot),group(staticRoot,0,LEVEL)];
  const upper=hallGroups[1];
  floor(hallGroups[0],-HALL,HALL,-DEPTH,DEPTH,'stone');
  floor(upper,-HALL,STAIR.left,-DEPTH,DEPTH,'oak',true);
  floor(upper,STAIR.right,HALL,-DEPTH,DEPTH,'oak',true);
  floor(upper,STAIR.left,STAIR.right,-DEPTH,STAIR.top,'oak',true);
  floor(upper,STAIR.left,STAIR.right,STAIR.bottom,DEPTH,'oak',true);
  for(let i=0;i<2;i++){
    const hall=hallGroups[i];
    for(const s of [-1,1])for(const sign of [-1,1]){
      const center=sign*DEPTH/2;
      const yaw=-s*Math.PI/2;
      const doorZ=sign>0?4.53:-3.91;
      wall(hall,s*HALL,center,yaw,DEPTH,m.plaster,m.panel,s*(doorZ-center));
    }
    const end=wall(hall,0,-DEPTH,0,2*HALL,m.plaster,m.panel);
    sash(end,0,1.89,.16,1.62,1.86,null);
    const entry=wall(hall,0,DEPTH,Math.PI,2*HALL,m.plaster,m.panel);
    if(i===0){
      box(entry,0,1.22,.17,1.47,2.44,.11,m.dark);
      for(const x of [-.36,.36])for(const y of [.59,1.63])round(entry,x,y,.25,.54,y<1?.53:.92,.05,.04,m.trim);
      oval(entry,.55,1.04,.28,.043,.044,.035,m.brass);
    }else sash(entry,0,1.89,.16,1.62,1.86,m.linen);
    if(i===1)box(hall,0,WALL+.075,0,2*HALL,.15,2*DEPTH,m.plaster,true);
  }

  function doorFor(room){
    const x=room.side*HALL, y=room.level*LEVEL,z=room.door-.555;
    const pivot=group(movingRoot,x,y,z);
    const width=1.11;
    const door={x,y,z,width,angle:0,target:0,openAngle:room.side*Math.PI*.48,pivot};
    doors.push(door);
    const actual=group(pivot,0,0,0,-Math.PI/2);
    box(actual,width/2,1.17,0,width,2.31,.071,m.dark);
    for(const side of [-1,1]){
      for(const xx of [.30,.81])for(const [yy,hh] of [[.49,.49],[1.23,.63],[1.92,.44]]){
        box(actual,xx,yy,side*.044,.40,hh,.028,m.trim);
        box(actual,xx,yy,side*.061,.33,hh-.075,.025,m.dark);
      }
      box(actual,.994,1.02,side*.059,.067,.16,.02,m.brass);
      oval(actual,.994,1.04,side*.10,.035,.034,.038,m.brass);
    }
    pivot.traverse(o=>{if(o.isMesh)o.receiveShadow=true;});
  }

  const kit={m,furniture,paint,group,box,block,oval,cylinder,lathe,round,point,frame,shade};
  for(const room of rooms){
    const {side,front,level,color}=room;
    const y=LEVEL*level, z=DEPTH*(front?.5:-.5);
    const x=side*(HALL+WIDTH)/2;
    const root=group(staticRoot,x,y,z);
    const half=(WIDTH-HALL)/2, deep=DEPTH/2;
    const tiled=room.name==='Kitchen'||room.name==='Bathroom';
    const finish=paint(color,'plaster');
    const panel=room.name==='Library'?m.dark:tiled?m.stone:m.panel;
    floor(root,-half,half,-deep,deep,tiled?'tile':'oak',Boolean(level));
    if(level)box(root,0,WALL+.075,0,2*half,.15,2*deep,m.plaster,true);
    const outer=wall(root,side*half,0,-side*Math.PI/2,2*deep,finish,panel);
    sash(outer,-1.40,1.88,.18,1.52,1.88,tiled?null:m.linen);
    sash(outer,1.40,1.88,.18,1.52,1.88,tiled?null:m.linen);
    wall(root,-side*half,0,side*Math.PI/2,2*deep,finish,panel,-side*(room.door-z));
    wall(root,0,-deep,0,2*half,finish,panel);
    wall(root,0,deep,Math.PI,2*half,finish,panel);
    point(x+side*1.70,y+2.25,z,0xcfe4ff,12,5.8);
    point(x,y+2.36,z,0xffd2a0,15,5.6);
    doorFor(room);
    furnish(kit,root,room);
  }

  const step=(STAIR.bottom-STAIR.top)/STAIR.count;
  const mid=(STAIR.left+STAIR.right)/2;
  const railProfile=[[.048,0],[.048,.10],[.031,.17],[.035,.29],[.052,.38],[.032,.49],[.022,.75],[.040,.83],[.04,.9],[0,.9]];
  for(let i=0;i<STAIR.count;i++){
    const z=STAIR.bottom-(i+.5)*step;
    const h=LEVEL*(i+1)/STAIR.count;
    box(staticRoot,mid,h/2-.019,z,STAIR.right-STAIR.left,h-.038,step,m.dark);
    box(staticRoot,mid,h-.018,z+.007,STAIR.right-STAIR.left,.036,step+.024,m.oak);
    const runner=shape('runner'+i,()=>{
      const geometry=new T.PlaneGeometry(1.01,step+.010);
      const uv=geometry.attributes.uv;
      for(let j=0;j<uv.count;j++)uv.setY(j,(i+uv.getY(j))/STAIR.count);
      return geometry;
    });
    mesh(staticRoot,runner,m.rug,mid,h+.004,z).rotation.x=-Math.PI/2;
    cylinder(staticRoot,mid,h+.018,z+.098,.011,.99,m.brass).rotation.z=Math.PI/2;
    lathe(staticRoot,STAIR.left+.039,h,z,railProfile,m.cream);
  }
  const stairRun=STAIR.bottom-STAIR.top;
  const rail=box(staticRoot,STAIR.left+.038,(LEVEL+.177)/2+.91,(STAIR.top+STAIR.bottom)/2,.106,.115,Math.hypot(stairRun,LEVEL-.177),m.dark);
  rail.rotation.x=Math.atan2(LEVEL-.177,stairRun);
  const skirt=box(staticRoot,STAIR.left-.014,(LEVEL+.177)/2-.102,(STAIR.top+STAIR.bottom)/2,.052,.24,Math.hypot(stairRun,LEVEL-.177),m.trim);
  skirt.rotation.x=rail.rotation.x;
  for(const [z,h] of [[STAIR.bottom,.02],[STAIR.top,LEVEL]]){
    box(staticRoot,STAIR.left+.038,h+.48,z,.145,.96,.145,m.dark);
    oval(staticRoot,STAIR.left+.038,h+1.005,z,.079,.068,.079,m.trim);
  }
  block(staticRoot,STAIR.left+.012,2.2,(STAIR.top+STAIR.bottom)/2,.024,4.4,stairRun-.04);
  block(staticRoot,STAIR.right+.018,2.2,(STAIR.top+STAIR.bottom)/2,.036,4.4,stairRun-.04);
  const endGuard=group(staticRoot,0,LEVEL,STAIR.bottom);
  for(let i=0;i<7;i++)lathe(endGuard,STAIR.left+i*.225,0,.01,railProfile,m.cream);
  box(endGuard,mid,.91,.01,1.42,.095,.095,m.dark,true);
  block(endGuard,mid,.45,.01,1.42,.9,.055);
  for(const y of [0,LEVEL]){
    point(-.72,y+2.51,3.85,0xffd3a0,20,6.4);
    point(-.24,y+2.45,-4.35,0xffddb4,23,6.2);
  }
  furnish(kit,hallGroups[0],{name:'Entrance hall'});
  furnish(kit,upper,{name:'Upper landing'});

  // Merge fixed meshes by material and storey. Movable leaves stay independent.
  staticRoot.updateMatrixWorld(true);
  const batches=new Map();
  staticRoot.traverse(o=>{
    if(!o.isMesh)return;
    const level=o.matrixWorld.elements[13]>LEVEL-.10?1:0;
    const key=o.material.uuid+':'+level;
    if(!batches.has(key))batches.set(key,{material:o.material,geometries:[]});
    const g=o.geometry.clone();
    if(!g.index){
      const index=Uint32Array.from({length:g.attributes.position.count},(_,i)=>i);
      g.setIndex(new T.BufferAttribute(index,1));
    }
    batches.get(key).geometries.push(g.applyMatrix4(o.matrixWorld));
  });
  for(const {material,geometries} of batches.values()){
    const g=mergeGeometries(geometries);
    const batch=new T.Mesh(g,material);
    batch.castShadow=material!==aoMat && material.emissive?.getHex()===0;
    batch.receiveShadow=material!==aoMat;
    scene.add(batch);
    for(const temp of geometries)temp.dispose();
  }
  scene.remove(staticRoot);
  const movingShapes=new Set();
  movingRoot.traverse(o=>{if(o.isMesh)movingShapes.add(o.geometry);});
  for(const g of shapes.values())if(!movingShapes.has(g))g.dispose();
  return {solids,doors};
}
