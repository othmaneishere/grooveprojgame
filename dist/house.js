import * as T from 'three';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';
import { LEVEL,WALL,HALL,WIDTH,DEPTH,STAIR,rooms } from './layout.js';
import { furnish } from './furnish.js';
import { furnitureFinish,furnitureSets } from './furniture-materials.js';
import { createSurfaceDetails } from './surface-detail.js';

export async function buildHouse(scene,{onProgress=()=>{}}={}) {
  const loader=new T.TextureLoader();
  const surfaceDetail=createSurfaceDetails();
  const names=['oak','stone','linen','plaster','landscape','rug','still-life','tile',
    'indigo-rug','flatweave','blossoms','courtyard','firebox-brick','mantel-marble','etched-glass','terracotta-floor',
    'olive-watercolour','hellebore-watercolour','ceramic-plate','carved-walnut'];
  const grouped=Object.entries(furnitureSets);
  const total=names.length+grouped.reduce((sum,[,assets])=>sum+assets.length,0);
  let completed=0;
  async function readTexture(path){
    const url=new URL('./assets/'+path+'.webp',import.meta.url);
    let texture;
    try{texture=await loader.loadAsync(url.href);}
    catch(cause){
      const error=new Error('Unable to read material '+path,{cause});
      error.kind='asset';throw error;
    }
    texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
    onProgress(++completed,total);
    return texture;
  }
  const [textures,furniture]=await Promise.all([
    Promise.all(names.map(async name=>[name,await readTexture(name)])).then(entries=>Object.fromEntries(entries)),
    Promise.all(grouped.flatMap(([group,assets])=>assets.map(async name=>{
      const map=await readTexture('furniture/'+name);
      map.wrapS=map.wrapT=T.MirroredRepeatWrapping;
      const {roughness,metalness,bump}=furnitureFinish(name,group);
      const surface=surfaceDetail(map,{roughness,grain:group==='woods'?2.15:1.72,contrast:group==='woods'?.16:.085});
      return [name,new T.MeshStandardMaterial({map,roughness:surface?1:roughness,roughnessMap:surface,
        metalness,bumpMap:surface??map,bumpScale:surface?bump*2.45:bump,
        envMapIntensity:metalness>.2?.65:group==='woods'?.30:.16})];
    }))).then(entries=>Object.fromEntries(entries)),
  ]);
  const paint=(color,pattern,roughness=.83,metalness=0)=>{
    const map=textures[pattern]??null;
    const bump={plaster:.0038,linen:.0034,stone:.006,oak:.0045,
      tile:.0036,'firebox-brick':.012,'terracotta-floor':.006,'mantel-marble':.0018,'carved-walnut':.011}[pattern];
    const surface=bump?surfaceDetail(map,{roughness,grain:1.88,contrast:.11}):null;
    return new T.MeshStandardMaterial({color,map,roughness:surface?1:roughness,roughnessMap:surface,
      metalness,envMapIntensity:metalness>.2?.52:.23,
      ...(bump?{bumpMap:surface??map,bumpScale:surface?bump*2.2:bump}:{})});
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
    glass:new T.MeshStandardMaterial({color:0xb8cbd0,map:textures['etched-glass'],
      emissiveMap:textures['etched-glass'],emissive:0xdbebff,emissiveIntensity:1.12,roughness:.28,envMapIntensity:.35}),
    ember:new T.MeshStandardMaterial({color:0xff9146,emissive:0xff5c1a,emissiveIntensity:2.2}),
    soot:paint(0x6b534b,'firebox-brick',.97), marble:paint(0xddccad,'mantel-marble',.40),
    terracotta:paint(0xf9e0c9,'terracotta-floor',.71),
    oliveArt:paint(0xffeed5,'olive-watercolour'),helleboreArt:paint(0xffeed8,'hellebore-watercolour'),
    plate:paint(0xf7ebd9,'ceramic-plate',.28),carved:paint(0xbb987e,'carved-walnut',.54),
    silver:paint(0xbcbfc1,null,.33,.76),
    glassware:new T.MeshStandardMaterial({color:0xdce7eb,transparent:true,opacity:.27,
      roughness:.13,metalness:.18,envMapIntensity:.44,depthWrite:false,side:T.DoubleSide}),
  };
  const drapeMaterials=new Map();
  const staticRoot=new T.Group();
  const movingRoot=new T.Group();
  scene.add(staticRoot,movingRoot);
  const solids=[],dynamicSolids=[],doors=[],props=[],updates=[],sources=[],fixtures=[],sounds=[];
  const roomMeshes=new Map();
  function zoneOf(object){
    for(let o=object;o&&o!==staticRoot;o=o.parent){
      if(o.userData.zone)return o.userData.zone;
    }
    return 'Staircase';
  }
  function registerZone(object,zone){
    if(!roomMeshes.has(zone))roomMeshes.set(zone,[]);
    roomMeshes.get(zone).push(object);
    return object;
  }
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
  function bounds(parent,x,y,z,w,h,d){
    parent.updateWorldMatrix(true,false);
    const b=new T.Box3(new T.Vector3(x-w/2,y-h/2,z-d/2),new T.Vector3(x+w/2,y+h/2,z+d/2)).applyMatrix4(parent.matrixWorld);
    return {minX:b.min.x,maxX:b.max.x,minY:b.min.y,maxY:b.max.y,minZ:b.min.z,maxZ:b.max.z};
  }
  function block(parent,x,y,z,w,h,d){
    solids.push(bounds(parent,x,y,z,w,h,d));
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
  function projectedUV(geometry,scale=1.26){
    const {uv,position,normal}=geometry.attributes;
    // Separate the projection planes by triangle, with consistent scale in metres.
    for(let i=0;i<uv.count;i+=3){
      let nx=0,ny=0,nz=0;
      for(let j=i;j<i+3;j++){
        nx+=Math.abs(normal.getX(j));ny+=Math.abs(normal.getY(j));nz+=Math.abs(normal.getZ(j));
      }
      const side=nx>ny&&nx>nz,top=ny>nz&&!side;
      for(let j=i;j<i+3;j++){
        const u=side?position.getZ(j):position.getX(j);
        const v=top?-position.getZ(j):position.getY(j);
        uv.setXY(j,.5+u*scale,.5+v*scale);
      }
    }
  }
  const softPower=(x,p)=>Math.sign(x)*Math.abs(x)**p;
  function puff(parent,x,y,z,w,h,d,material,softness=.49){
    const key='puff'+[w,h,d,softness];
    const geometry=shape(key,()=>{
      const indexed=new T.SphereGeometry(1,24,16);
      const position=indexed.attributes.position;
      for(let i=0;i<position.count;i++){
        const bx=position.getX(i),by=position.getY(i),bz=position.getZ(i);
        position.setXYZ(i,softPower(bx,softness)*w/2,
          softPower(by,softness)*h/2,softPower(bz,softness)*d/2);
      }
      indexed.computeVertexNormals();
      const finished=indexed.toNonIndexed();indexed.dispose();
      projectedUV(finished,1.7);
      return finished;
    });
    return mesh(parent,geometry,material,x,y,z);
  }
  function welt(parent,x,y,z,w,d,r,material){
    const key='welt'+[w,d,r];
    const geometry=shape(key,()=>{
      const points=[];
      for(let i=0;i<36;i++){
        const a=(2*Math.PI*i)/36;
        points.push(new T.Vector3(softPower(Math.cos(a),.56)*w/2,0,softPower(Math.sin(a),.56)*d/2));
      }
      return new T.TubeGeometry(new T.CatmullRomCurve3(points,true),48,r,5,true);
    });
    return mesh(parent,geometry,material,x,y,z);
  }
  const quiltMaterials=new Map();
  function quilt(parent,x,y,z,w,d,material,phase=0){
    const key='quilt'+[w,d,phase];
    const geometry=shape(key,()=>{
      const g=new T.PlaneGeometry(w,d,32,28);
      g.rotateX(-Math.PI/2);
      const {position,uv}=g.attributes;
      for(let i=0;i<position.count;i++){
        const u=uv.getX(i),v=uv.getY(i);
        const side=T.MathUtils.smoothstep(Math.abs(u-.5),.42,.50);
        const end=T.MathUtils.smoothstep(1-v,.87,1);
        const crease=(Math.sin(u*39+v*11+phase)*.0035+Math.sin(u*68-v*16)*.0018)*(.45+side*.60);
        const height=.015*Math.sin(u*Math.PI)*Math.sin(v*Math.PI)-side*.081-end*.053+crease;
        position.setY(i,height);
        uv.setXY(i,u*1.6,v*1.4);
      }
      g.computeVertexNormals();
      return g;
    });
    if(!quiltMaterials.has(material)){
      const double=material.clone();
      double.side=T.DoubleSide;quiltMaterials.set(material,double);
    }
    return mesh(parent,geometry,quiltMaterials.get(material),x,y,z);
  }
  function lathe(parent,x,y,z,profile,material,segments=18){
    const key='lathe'+segments+JSON.stringify(profile);
    return mesh(parent,shape(key,()=>new T.LatheGeometry(profile.map(p=>new T.Vector2(...p)),segments)),material,x,y,z);
  }
  function disc(parent,x,y,z,r,material){
    return mesh(parent,shape('disc'+r,()=>new T.CircleGeometry(r,42)),material,x,y,z);
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
      projectedUV(g);
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
  function point(x,y,z,color,power,distance,kind='accent',zone=''){
    const source={x,y,z,color,power,distance,kind,zone,enabled:true};
    sources.push(source);
    return source;
  }
  function worldPoint(parent,x,y,z){
    parent.updateWorldMatrix(true,false);
    return parent.localToWorld(new T.Vector3(x,y,z));
  }
  function moveable(object){
    const zone=zoneOf(object);
    object.updateWorldMatrix(true,true);
    movingRoot.updateWorldMatrix(true,false);
    movingRoot.attach(object);
    object.traverse(child=>{if(child.isMesh){child.castShadow=true;child.receiveShadow=true;}});
    return registerZone(object,zone);
  }
  function addProp(parent,xyz,definition){
    const point=worldPoint(parent,...xyz);
    const prop={point,...definition};
    props.push(prop);
    return prop;
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
    if(support){
      const above=zoneOf(parent);
      const upper=rooms.find(room=>room.name===above);
      const below=upper?rooms.find(room=>room.level===0&&room.side===upper.side&&room.front===upper.front)?.name:
        'Entrance hall';
      const ceiling=box(parent,(x0+x1)/2,-.219,(z0+z1)/2,w,.026,d,m.plaster);
      ceiling.userData.zone=below??'Entrance hall';
    }
    if(style==='oak'){
      const rows=Math.ceil(w/.235);
      for(let i=0;i<rows;i++){
        const pw=w/rows;
        for(let z=z0,k=0;z<z1-.001;k++){
          const len=Math.min(z1-z,k===0 ? .59+(i*17%10)*.14 : 1.76);
          const variant=(i*17+k*13)%24;
          const grain=shape('board'+variant,()=>{
            const geometry=new T.BoxGeometry();
            const uv=geometry.attributes.uv;
            const startU=((variant*7)%21)/79;
            const startV=((variant*13)%19)/74;
            for(let j=0;j<uv.count;j++){
              const v=variant%3===0?1-uv.getY(j):uv.getY(j);
              uv.setXY(j,startU+uv.getX(j)*(.49+(variant%5)*.056),startV+v*.72);
            }
            return geometry;
          });
          const board=mesh(parent,grain,m.floor[variant%5],x0+(i+.5)*pw,-.008,z+len/2);
          board.scale.set(pw-.003,.016,len-.003);
          z+=len;
        }
      }
    }else{
      const nx=Math.ceil(w/.72),nz=Math.ceil(d/.72);
      for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){
        const finish=style==='tile'?m.tile:style==='terracotta'?m.terracotta:(i+j)%2?m.stone:m.panel;
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
    else if(Array.isArray(opening)){
      let start=-length/2;
      for(const center of opening){
        const spanWidth=1.58;
        span(start,center-spanWidth/2);
        box(g,center,.428,.042,spanWidth,.856,.164,finish,true);
        box(g,center,.433,.151,spanWidth,.866,.051,panel);
        box(g,center,.096,.180,spanWidth,.19,.05,m.panel);
        box(g,center,3.07,.042,spanWidth,.22,.164,finish,true);
        box(g,center,3.10,.171,spanWidth,.16,.10,m.cream);
        // Frosted glass closes the recess for both the player and sound.
        block(g,center,1.87,.022,spanWidth,2.065,.045);
        start=center+spanWidth/2;
      }
      span(start,length/2);
    }
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
    box(parent,x,y,z-.055,w+.19,h+.20,.097,m.panel);
    box(parent,x,y,z+.04,w,h,.044,m.dark);
    box(parent,x,y,z+.067,w-.10,h-.10,.027,m.glass);
    for(const sign of [-1,1]){
      box(parent,x+sign*(w/2+.065),y,z+.086,.101,h+.19,.103,m.cream);
      box(parent,x,y+sign*(h/2+.065),z+.083,w+.20,.091,.106,m.cream);
    }
    for(const xx of [-.5,-.17,.17,.5])box(parent,x+xx*(w-.10),y,z+.124,.046,h-.10,.042,m.cream);
    for(const yy of [-.5,-.27,0,.27,.5])box(parent,x,y+yy*(h-.09),z+.124,w-.10,.051,.046,m.cream);
    box(parent,x,y-h/2-.04,z+.13,w+.32,.089,.26,m.marble);
    for(const s of [-1,1]){
      round(parent,x+s*.36,y-.013,z+.153,.034,.045,.027,.012,furniture['satin-brass']);
    }
    if(!curtain)return;
    cylinder(parent,x,y+h/2+.16,z+.26,.019,w+.58,m.brass).rotation.z=Math.PI/2;
    if(!drapeMaterials.has(curtain)){
      const cloth=curtain.clone();
      cloth.side=T.DoubleSide;
      cloth.envMapIntensity=.12;
      drapeMaterials.set(curtain,cloth);
    }
    for(const side of [-1,1]){
      oval(parent,x+side*(w/2+.29),y+h/2+.16,z+.26,.038,.038,.041,m.brass);
      const height=h+1.04;
      const drape=shape('drape'+[h,side],()=>{
        const geometry=new T.PlaneGeometry(1,1,28,18);
        const {position,uv}=geometry.attributes;
        for(let i=0;i<position.count;i++){
          const u=uv.getX(i),v=uv.getY(i);
          const tie=Math.exp(-((v-.39)**2)/.016);
          const spread=.49-.18*tie;
          const fold=Math.cos(u*Math.PI*11+(1-v)*.55);
          position.setXYZ(i,side*(u*spread+tie*.072),v*height-height/2+
            .010*(1-v)**18*fold,.040*fold*(1-.48*tie)+.025*(1-v));
          uv.setXY(i,u*.92,v);
        }
        geometry.computeVertexNormals();
        return geometry;
      });
      const cx=x+side*(w/2-.23),dy=y+h/2+.125-height/2;
      mesh(parent,drape,drapeMaterials.get(curtain),cx,dy,z+.26);
      block(parent,cx+side*.247,dy,z+.256,.525,height,.105);
      const bind=round(parent,cx+side*.233,dy-height*.11,z+.307,.31,.038,.049,.015,furniture['satin-brass']);
      bind.rotation.z=-side*.10;
      oval(parent,cx+side*.145,dy-height*.152,z+.335,.019,.056,.024,m.piping);
      for(let i=0;i<5;i++)cylinder(parent,cx+side*(i*.105),y+h/2+.118,z+.262,.009,.058,furniture['satin-brass']);
    }
  }

  const hallGroups=[group(staticRoot),group(staticRoot,0,LEVEL)];
  hallGroups[0].userData.zone='Entrance hall';
  hallGroups[1].userData.zone='Upper landing';
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
    const door={kind:'door',x,y,z,width,angle:0,target:0,speed:0,openAngle:room.side*Math.PI*.48,pivot,handles:[],room:room.name};
    doors.push(door);
    registerZone(pivot,'door/'+room.name);
    const actual=group(pivot,0,0,0,-Math.PI/2);
    box(actual,width/2,1.17,0,width,2.31,.071,m.dark);
    for(const side of [-1,1]){
      for(const xx of [.30,.81])for(const [yy,hh] of [[.49,.49],[1.23,.63],[1.92,.44]]){
        box(actual,xx,yy,side*.044,.40,hh,.028,m.trim);
        box(actual,xx,yy,side*.061,.33,hh-.075,.025,m.dark);
      }
      const brass=furniture['satin-brass'];
      round(actual,1.013,1.04,side*.075,.067,.184,.024,.025,brass);
      const lever=group(actual,1.014,1.061,side*.097);
      oval(lever,0,0,side*.015,.026,.024,.039,brass);
      round(lever,-.056,-.003,side*.045,.139,.031,.022,.013,brass);
      oval(actual,1.013,.993,side*.090,.008,.014,.004,m.black);
      door.handles.push(lever);
      for(const yy of [.26,1.20,2.06])cylinder(actual,.025,yy,side*.051,.017,.075,furniture['verdigris-brass']);
    }
    pivot.traverse(o=>{if(o.isMesh){o.receiveShadow=true;o.castShadow=true;}});
  }

  function wallSwitch(roomRoot,x,z,yaw,source){
    const mount=group(roomRoot,x,1.16,z,yaw);
    const brass=furniture['satin-brass'];
    round(mount,0,0,0,.087,.115,.027,.010,brass);
    for(const y of [-.040,.040])oval(mount,0,y,.018,.005,.005,.003,m.iron);
    const rocker=round(mount,0,0,.024,.040,.052,.019,.008,m.porcelain);
    moveable(rocker);
    const rpm=rocker.quaternion.clone();
    const tilt=new T.Quaternion(),axis=new T.Vector3(1,0,0);
    let amount=.23;
    updates.push(dt=>{
      amount=T.MathUtils.damp(amount,source.enabled?.23:-.23,19,dt);
      rocker.quaternion.copy(rpm).multiply(tilt.setFromAxisAngle(axis,amount));
    });
    return addProp(mount,[0,.01,.053],{
      radius:.155,label:()=>source.enabled?'Switch lights off':'Switch lights on',
      use(){source.enabled=!source.enabled;return 'switch';},
      reset(){source.enabled=true;},
    });
  }

  const kit={m,furniture,paint,group,box,block,oval,puff,welt,quilt,disc,cylinder,lathe,round,point,frame,shade,
    updates,sources,fixtures,sounds,dynamicSolids,bounds,worldPoint,moveable,addProp};
  for(const room of rooms){
    const {side,front,level,color}=room;
    const y=LEVEL*level, z=DEPTH*(front?.5:-.5);
    const x=side*(HALL+WIDTH)/2;
    const root=group(staticRoot,x,y,z);
    root.userData.zone=room.name;
    const half=(WIDTH-HALL)/2, deep=DEPTH/2;
    const tiled=room.name==='Kitchen'||room.name==='Bathroom';
    const finish=paint(color,'plaster');
    const panel=room.name==='Library'?m.dark:tiled?m.stone:m.panel;
    floor(root,-half,half,-deep,deep,room.name==='Kitchen'?'terracotta':tiled?'tile':'oak',Boolean(level));
    if(level)box(root,0,WALL+.075,0,2*half,.15,2*deep,m.plaster,true);
    const outer=wall(root,side*half,0,-side*Math.PI/2,2*deep,finish,panel,[-1.40,1.40]);
    const curtain=room.name.includes('bedroom')?furniture['taupe-pinstripe']:m.linen;
    sash(outer,-1.40,1.88,.055,1.52,1.88,tiled?null:curtain);
    sash(outer,1.40,1.88,.055,1.52,1.88,tiled?null:curtain);
    wall(root,-side*half,0,side*Math.PI/2,2*deep,finish,panel,-side*(room.door-z));
    wall(root,0,-deep,0,2*half,finish,panel);
    wall(root,0,deep,Math.PI,2*half,finish,panel);
    point(x+side*1.70,y+2.25,z,0xcfe4ff,11,5.8,'window',room.name);
    const overhead=point(x,y+2.42,z,0xffd7ae,13,5.2,'ceiling',room.name);
    wallSwitch(root,-side*(half-.139),room.door-z-.82,side*Math.PI/2,overhead);
    doorFor(room);
    furnish(kit,root,room);
  }

  const step=(STAIR.bottom-STAIR.top)/STAIR.count;
  const rise=LEVEL/STAIR.count;
  const mid=(STAIR.left+STAIR.right)/2;
  const railProfile=[[.048,0],[.048,.10],[.031,.17],[.035,.29],[.052,.38],[.032,.49],[.022,.75],[.040,.83],[.04,.9],[0,.9]];
  for(let i=0;i<STAIR.count;i++){
    const z=STAIR.bottom-(i+.5)*step;
    const h=rise*(i+1);
    box(staticRoot,mid,h/2-.019,z,STAIR.right-STAIR.left,h-.038,step,m.dark);
    box(staticRoot,mid,h-.018,z+.007,STAIR.right-STAIR.left,.036,step+.024,m.oak);
    const runner=shape('runner'+i,()=>{
      const geometry=new T.PlaneGeometry(1.01,step+.010);
      const uv=geometry.attributes.uv;
      for(let j=0;j<uv.count;j++)uv.setY(j,(i+.38+uv.getY(j)*.62)/STAIR.count);
      return geometry;
    });
    mesh(staticRoot,runner,m.rug,mid,h+.004,z).rotation.x=-Math.PI/2;
    const fabricRiser=shape('riser'+i,()=>{
      const geometry=new T.PlaneGeometry(1.002,rise-.025);
      const uv=geometry.attributes.uv;
      for(let j=0;j<uv.count;j++)uv.setY(j,(i+uv.getY(j)*.38)/STAIR.count);
      return geometry;
    });
    mesh(staticRoot,fabricRiser,m.rug,mid,h-rise/2-.005,z+step/2+.001);
    cylinder(staticRoot,mid,h-rise+.019,z+step/2+.018,.009,1.05,m.brass).rotation.z=Math.PI/2;
    for(const sign of [-1,1]){
      oval(staticRoot,mid+sign*.526,h-rise+.019,z+step/2+.018,.015,.012,.012,m.brass);
    }
    lathe(staticRoot,STAIR.left+.039,h,z,railProfile,m.cream);
  }
  const stairRun=STAIR.bottom-STAIR.top;
  const rail=box(staticRoot,STAIR.left+.038,(LEVEL+.177)/2+.91,(STAIR.top+STAIR.bottom)/2,.106,.115,Math.hypot(stairRun,LEVEL-.177),m.dark);
  rail.rotation.x=Math.atan2(LEVEL-.177,stairRun);
  const skirt=box(staticRoot,STAIR.left-.014,(LEVEL+.177)/2-.102,(STAIR.top+STAIR.bottom)/2,.052,.24,Math.hypot(stairRun,LEVEL-.177),m.trim);
  skirt.rotation.x=rail.rotation.x;
  const stairPanel=paint(0x815e4c,'carved-walnut',.84);
  const stairBacking=paint(0x795947,'oak',.81);
  const sidePanel=group(staticRoot,STAIR.left-.012,0,STAIR.top+.02,-Math.PI/2);
  for(let i=0;i<5;i++){
    const span=.512,offset=.20+i*span;
    const h=Math.min(2.64,LEVEL-(offset+.16)*rise/step-.218);
    box(sidePanel,offset,h/2+.06,.002,span-.012,h,.038,stairBacking);
    for(const sign of [-1,1]){
      box(sidePanel,offset+sign*.207,h/2+.061,.027,.034,h-.13,.021,m.trim);
      box(sidePanel,offset,h/2+.061+sign*(h/2-.074),.027,.394,.035,.021,m.trim);
    }
    round(sidePanel,offset,.40,.037,.371,.293,.019,.014,stairPanel);
  }
  const rearFace=group(staticRoot,mid,0,STAIR.top-.014,Math.PI);
  box(rearFace,0,1.58,.006,1.39,3.16,.029,stairBacking);
  block(rearFace,0,1.58,.028,1.39,3.16,.061);
  for(const side of [-1,1])for(const y of [.61,1.82]){
    const h=y>1?1.09:.83;
    round(rearFace,side*.333,y,.030,.49,h,.024,.026,m.trim);
    round(rearFace,side*.333,y,.046,.397,h-.087,.020,.023,stairBacking);
  }
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
    const name=y===0?'Entrance hall':'Upper landing';
    point(-.72,y+2.62,3.85,0xffd3a0,20,5.3,'ceiling',name);
    point(-.24,y+2.60,-4.35,0xffddb4,21,5.3,'ceiling',name);
  }
  furnish(kit,hallGroups[0],{name:'Entrance hall'});
  furnish(kit,upper,{name:'Upper landing'});

  // Merge fixed meshes per room and material so opaque rooms can be culled.
  staticRoot.updateMatrixWorld(true);
  const batches=new Map();
  staticRoot.traverse(o=>{
    if(!o.isMesh)return;
    const zone=zoneOf(o);
    const key=o.material.uuid+':'+zone;
    if(!batches.has(key))batches.set(key,{material:o.material,geometries:[],zone});
    const g=o.geometry.clone();
    if(!g.index){
      const index=Uint32Array.from({length:g.attributes.position.count},(_,i)=>i);
      g.setIndex(new T.BufferAttribute(index,1));
    }
    batches.get(key).geometries.push(g.applyMatrix4(o.matrixWorld));
  });
  for(const {material,geometries,zone} of batches.values()){
    const g=mergeGeometries(geometries);
    const batch=new T.Mesh(g,material);
    batch.castShadow=material!==aoMat && !material.transparent && material.emissive?.getHex()===0;
    batch.receiveShadow=material!==aoMat;
    scene.add(registerZone(batch,zone));
    for(const temp of geometries)temp.dispose();
  }
  scene.remove(staticRoot);
  const movingShapes=new Set();
  movingRoot.traverse(o=>{if(o.isMesh)movingShapes.add(o.geometry);});
  for(const g of shapes.values())if(!movingShapes.has(g))g.dispose();
  return {solids,dynamicSolids,doors,props,updates,sources,fixtures,sounds,roomMeshes,glazing:m.glass};
}
