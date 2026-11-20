import * as T from 'three';
import { overlaps } from './layout.js';
import { hearthFlame,wallMirror,waterTap } from './room-effects.js';

export function furnish(k,root,room){
  const {m,furniture:f,box,block,round,oval,puff,welt,quilt,disc,cylinder,lathe,group,shade,frame,paint,point,
    moveable,addProp,worldPoint,updates,fixtures,sources,sounds,dynamicSolids,bounds}=k;
  const PI=Math.PI;
  function feet(g,w,d,h=.16,finish=f['smoked-walnut']){
    for(const x of [-w/2,w/2])for(const z of [-d/2,d/2])
      lathe(g,x,0,z,[[0,0],[.032,0],[.032,h*.13],[.024,h*.27],[.024,h*.56],
        [.035,h*.76],[.043,h*.86],[.042,h],[0,h]],finish,14);
  }
  function vessel(g,x,y,z,s=1,material=m.ceramic){
    const profile=[[0,0],[.104,0],[.135,.06],[.147,.17],[.126,.25],[.06,.31],[.055,.40],[.072,.41],[.074,.43],[.046,.43],[.042,.39]];
    const pot=lathe(g,x,y,z,profile,material);pot.scale.setScalar(s);
  }
  function florals(g,x,y,z){
    const vase=group(g,x,y,z);
    vessel(vase,0,0,0,.91,m.porcelain);
    const stem=paint(0x53633e),leaf=paint(0x6c7751);
    const blossoms=[paint(0xc99181),paint(0xd9ac9a),paint(0xe9d0ad)];
    for(let i=0;i<6;i++){
      const a=i*2.4,r=.064+.017*i,h=.438+.021*(i%4);
      const fx=Math.cos(a)*r,fz=Math.sin(a)*r;
      const branch=cylinder(vase,fx*.51,h*.61,fz*.55,.005,h*.70,stem,.003,8);
      branch.rotation.set(fz*1.9,0,-fx*1.9);
      for(const s of [-1,1]){
        const off=oval(vase,fx*.64+s*.031,h*.76,fz*.60,.045,.010,.018,leaf);
        off.rotation.set(.12,a,s*.41);
      }
      const bloom=group(vase,fx,h+.029,fz,a);
      oval(bloom,0,0,0,.024,.016,.028,m.piping);
      for(let j=0;j<5;j++){
        const theta=2*PI*j/5;
        const petal=oval(bloom,Math.cos(theta)*.025,.001,Math.sin(theta)*.025,.031,.013,.020,blossoms[i%3]);
        petal.rotation.y=-theta;
      }
    }
  }
  function ceramicPlate(g,x,y,z,r=.12,hanging=false){
    if(hanging){
      const backing=cylinder(g,x,y,z,r,.024,m.porcelain,r,38);
      backing.rotation.x=PI/2;
      disc(g,x,y,z+.013,r*.963,m.plate);
    }else{
      lathe(g,x,y,z,[[0,0],[r*.70,0],[r*.87,.007],[r,.024],[r,.030],[r*.94,.037],
        [r*.83,.023],[r*.64,.010],[0,.010]],m.porcelain,32);
      const design=disc(g,x,y+.012,z,r*.66,m.plate);
      design.rotation.x=-PI/2;
    }
  }
  function setPlace(g,x,z,side){
    ceramicPlate(g,x,.775,z,.126);
    const place=group(g,x,.787,z,side*PI/2);
    const fork=group(place,-.167,0,0);
    round(fork,0,0,.08,.012,.011,.119,.005,m.silver);
    box(fork,0,0,.012,.036,.010,.039,m.silver);
    for(let i=0;i<4;i++)box(fork,(i-1.5)*.010,0,-.026,.004,.007,.044,m.silver);
    const knife=group(place,.168,0,.011);
    round(knife,0,0,.055,.013,.012,.094,.005,m.silver);
    round(knife,-.003,0,-.026,.023,.007,.094,.003,m.silver);
    const glass=group(place,.127,-.005,-.160);
    cylinder(glass,0,.007,0,.029,.012,m.glassware,.032,21);
    cylinder(glass,0,.053,0,.008,.085,m.glassware,.007,12);
    lathe(glass,0,.089,0,[[0,0],[.015,.002],[.029,.017],[.038,.049],
      [.036,.079],[.032,.082],[.031,.077],[.032,.050],[.025,.019],[0,.006]],m.glassware,20);
  }
  function chess(g){
    box(g,0,.797,0,.451,.041,.451,f['rosewood']);
    const square=.050;
    for(let rank=0;rank<8;rank++)for(let file=0;file<8;file++){
      const x=(file-3.5)*square,z=(rank-3.5)*square;
      box(g,x,.819,z,square-.0004,.003,square-.0004,(rank+file)%2?f['mahogany']:f['limed-ash']);
      if(rank<2||rank>5){
        const white=rank>5,pawn=rank===1||rank===6;
        if((rank===1&&file===3)||(rank===6&&file===4))continue;
        const material=white?m.porcelain:m.dark;
        const h=pawn?.050:file===3||file===4?.081:.064;
        lathe(g,x,.821,z,[[0,0],[.015,0],[.017,.007],[.012,.015],[.009,.024],
          [.008,h*.73],[.013,h*.84],[.009,h],[0,h]],material,12);
      }
    }
    oval(g,-.025,.874,-.029,.012,.014,.012,m.dark);
    lathe(g,-.025,.821,-.029,[[0,0],[.016,0],[.016,.010],[.009,.022],[.008,.046]],m.dark,12);
  }
  function lamp(g,x,y,z,s=.83){
    const p=group(g,x,y,z);p.scale.setScalar(s);
    cylinder(p,0,.034,0,.16,.065,f['verdigris-brass'],.13);
    lathe(p,0,.05,0,[[.075,0],[.105,.14],[.075,.29],[.04,.40],[0,.41]],m.ceramic);
    cylinder(p,0,.49,0,.018,.19,f['satin-brass']);
    const shade=f['oatmeal-linen'].clone();
    shade.color.set(0xffe8c7);
    shade.emissive.set(0xffc780);
    shade.emissiveMap=shade.map;
    shade.emissiveIntensity=.69;
    lathe(p,0,.537,0,[[.226,0],[.145,.268],[.135,.268],[.216,.005],[.226,0]],shade,32);
    oval(p,0,.63,0,.077,.074,.077,m.glow);
    for(let i=0;i<24;i++){
      const a=i*PI/12;
      const seam=cylinder(p,.184*Math.cos(a),.67,.184*Math.sin(a),.006,.282,m.piping);
      seam.rotation.set(-Math.sin(a)*.29,0,Math.cos(a)*.29);
    }
    const at=worldPoint(p,0,.69,0);
    const light=point(at.x,at.y,at.z,0xffc389,3.1,3.45,'lamp',room.name);
    fixtures.push({material:shade,source:light,lit:.77,unlit:.015});
    addProp(p,[0,.61,0],{
      radius:.26,label:()=>light.enabled?'Turn lamp off':'Turn lamp on',
      use(){light.enabled=!light.enabled;return 'switch';},
      reset(){light.enabled=true;},
    });
  }
  function ceiling(x=0,z=0,y=3.17){
    const g=group(root,x,y,z);
    cylinder(g,0,-.015,0,.27,.033,m.cream);
    const shade=m.glow.clone();
    if(room.name==='Dining room'){
      const brass=f['satin-brass'];
      lathe(g,0,-.43,0,[[0,0],[.072,.013],[.062,.050],[.045,.10],
        [.039,.23],[.026,.32],[.027,.43],[0,.43]],brass);
      for(let i=0;i<5;i++){
        const branch=group(g,0,-.36,0,i*PI*2/5);
        const tube=new T.TubeGeometry(new T.CatmullRomCurve3([
          new T.Vector3(0,.012,0),new T.Vector3(.13,-.050,0),new T.Vector3(.28,-.065,.035),
          new T.Vector3(.37,-.023,.05),new T.Vector3(.41,.091,.041),
        ]),16,.014,8,false);
        branch.add(new T.Mesh(tube,brass));
        cylinder(branch,.418,.11,.042,.069,.019,brass,.060,20);
        oval(branch,.418,.184,.042,.065,.088,.065,shade);
      }
    }else{
      cylinder(g,0,-.18,0,.027,.32,m.brass);
      cylinder(g,0,-.39,0,.36,.24,shade,.30,26);
      for(const yy of [-.518,-.263])cylinder(g,0,yy,0,yy<-.4?.369:.307,.017,m.brass,yy<-.4?.368:.308,26);
    }
    const at=worldPoint(g,0,-.39,0);
    const matching=sources.filter(source=>source.kind==='ceiling'&&source.zone===room.name);
    matching.sort((a,b)=>Math.hypot(a.x-at.x,a.z-at.z)-Math.hypot(b.x-at.x,b.z-at.z));
    if(matching[0])fixtures.push({material:shade,source:matching[0],lit:.59,unlit:.005});
  }
  function carpet(x,z,w,d,finish=m.rug){
    box(root,x,.012,z,w,.022,d,finish);
    for(const s of [-1,1])for(let i=0;i<Math.floor(w/.053);i++)
      box(root,x-w/2+.025+i*.053,.012,z+s*(d/2+.038),.013,.009,.080,m.piping);
  }
  function olive(x,z){
    const g=group(root,x,0,z);
    lathe(g,0,0,0,[[0,0],[.15,0],[.19,.18],[.23,.42],[.24,.46],[.19,.46],[.18,.42],[0,.40]],m.ceramic);
    cylinder(g,0,.40,0,.176,.024,m.black);
    cylinder(g,0,.91,0,.027,1.03,m.trim,.014);
    const leaves=[paint(0x465a33),paint(0x596747),paint(0x77845a)];
    for(let i=0;i<36;i++){
      const a=i*2.39996, radius=.15+(i%5)*.05;
      const stem=cylinder(g,Math.cos(a)*radius*.51,1.17+(i%8)*.052,Math.sin(a)*radius*.5,.007,radius*1.45,m.trim);
      stem.rotation.set(Math.sin(a)*.94,0,-Math.cos(a)*.94);
      for(let j=0;j<3;j++){
        const f=radius*(.69+j*.23);
        const leaf=oval(g,Math.cos(a+j*.27)*f,1.19+(i%8)*.052+j*.056,
          Math.sin(a+j*.27)*f,.092,.017,.033,leaves[(i+j)%3]);
        leaf.rotation.set(.25,-a,.28+j*.13);
      }
    }
    block(g,0,.24,0,.46,.48,.46);
    block(g,0,1.44,0,.72,.96,.72);
  }
  function sofa(x,z,w,angle,fabric,pillows=[]){
    const g=group(root,x,0,z,angle);
    feet(g,w-.29,.62,.15);
    round(g,0,.27,0,w,.25,.83,.10,fabric);
    const back=round(g,0,.64,-.33,w-.10,.71,.245,.13,fabric);back.rotation.x=-.09;
    for(const s of [-1,1]){
      puff(g,s*(w/2-.09),.624,.035,.275,.262,.858,fabric,.55);
      round(g,s*(w/2-.10),.43,.04,.19,.25,.75,.07,fabric);
    }
    const n=w>1.8?3:1, cw=(w-.41)/n;
    for(let i=0;i<n;i++){
      const cx=(i-(n-1)/2)*cw;
      puff(g,cx,.465,.075,cw-.017,.152,.656,fabric,.42);
      welt(g,cx,.466,.075,cw-.018,.655,.004,fabric);
      const upright=puff(g,cx,.717,-.218,cw-.028,.475,.190,fabric,.49);
      upright.rotation.x=-.17;
      for(const off of [-.24,.24])oval(g,cx+off*cw,.772,-.182,.011,.011,.012,fabric);
    }
    for(let i=0;i<pillows.length;i++){
      const side=i===0?-1:1;
      const cushion=puff(g,pillows.length===1?0:side*(w/2-.40),.676,-.046,.37,.37,.138,pillows[i],.57);
      cushion.rotation.set(-.28,side*.10,side*.20);
    }
    block(g,0,.51,.013,w+.094,1.02,.91);
    shade(g,0,.04,w+.44,1.30,.035);
  }
  function table(x,z,w,d,h,yaw=0,finish=f['smoked-walnut']){
    const g=group(root,x,0,z,yaw);
    feet(g,w-.24,d-.23,h-.07,finish===m.stone?f['olive-painted-oak']:finish);
    round(g,0,h-.034,0,w,.073,d,.049,finish);
    round(g,0,h-.133,0,w-.12,.097,d-.13,.026,finish);
    block(g,0,h/2,0,w,h,d);
    shade(g,0,0,w+.34,d+.31,.038);
    return g;
  }
  function books(g,x,y,z,n=7){
    const colors=[f['saddle-leather'],m.teal,m.green,f['burgundy-damask'],m.blue,m.rose,m.oak];
    for(let i=0;i<n;i++){
      const pattern=(Math.round(y*38)+i*7)%31;
      const h=.177+(pattern%15)*.009,w=.055+(pattern%7)*.0044;
      const volume=group(g,x+i*.094,y+h/2,z+(pattern%3-1)*.010);
      volume.rotation.z=i%7===6?.12:0;
      box(volume,0,0,0,w,h,.21,colors[(i+pattern)%7]);
      box(volume,0,h/2-.004,-.046,w*.77,.008,.119,m.cream);
      for(const a of [-.32,.21,.37])box(volume,0,h*a,.108,w*.78,.006,.007,m.brass);
      for(let line=0;line<pattern%3+1;line++){
        box(volume,0,h*(.08-line*.045),.109,w*(.50-(line%2)*.13),.0035,.005,m.brass);
      }
    }
  }
  function bookcase(x,z,yaw=0,w=1.53){
    const g=group(root,x,0,z,yaw);
    box(g,0,1.23,-.14,w,2.45,.065,f['smoked-walnut']);
    for(const s of [-1,1])box(g,s*(w/2-.034),1.23,0,.067,2.45,.35,f['mahogany']);
    for(const yy of [.14,.54,.96,1.37,1.79,2.18,2.43]){
      box(g,0,yy,0,w,.043,.365,f['rosewood']);
      if(yy<2.18){books(g,-w/2+.11,yy+.023,.025,Math.floor((w-.24)/.094)-2);}
    }
    box(g,0,2.47,0,w+.12,.081,.42,f['mahogany']);
    block(g,0,1.24,0,w,2.48,.39);
  }
  function console(x,z,w=1.48,yaw=0,finish=f['honey-oak'],drawer=false){
    const g=table(x,z,w,.48,.84,yaw,finish);
    const front=group(g,0,.713,.244);
    round(front,0,0,0,w-.18,.104,.030,.013,f['burr-walnut']);
    for(const s of [-1,1])oval(front,s*(w*.19),.004,.028,.025,.018,.013,f['satin-brass']);
    if(drawer){
      const width=w-.20;
      box(front,0,-.047,-.165,width,.015,.33,f['honey-oak']);
      box(front,0,-.014,-.311,width,.068,.018,finish);
      for(const sign of [-1,1])box(front,sign*(width/2-.012),-.014,-.169,.019,.076,.29,finish);
      box(front,.15,-.026,-.149,.22,.026,.12,f['saddle-leather']);
      moveable(front);
      const start=front.position.clone(),forward=new T.Vector3(Math.sin(yaw),0,Math.cos(yaw));
      const staticBounds=bounds(front,0,-.019,-.134,width,.144,.30);
      const body={...staticBounds,enabled:false};
      dynamicSolids.push(body);
      let target=0,travel=0;
      const prop=addProp(g,[0,.715,.271],{
        radius:.23,label:()=>target?'Close drawer':'Open drawer',
        use(){target=target?0:.180;return 'drawer';},
        reset(){
          target=travel=0;Object.assign(body,staticBounds,{enabled:false});
          front.position.copy(start);prop.point.copy(anchor);
        },
      });
      const anchor=prop.point.clone();
      updates.push((dt,steady,player)=>{
        const next=T.MathUtils.damp(travel,target,15,dt);
        if(Math.abs(next-target)<.0006 && travel===target)return;
        const dx=forward.x*next,dz=forward.z*next;
        const collider={...staticBounds,minX:staticBounds.minX+dx,maxX:staticBounds.maxX+dx,
          minZ:staticBounds.minZ+dz,maxZ:staticBounds.maxZ+dz};
        if(next>travel&&overlaps(player.x,player.y,player.z,collider,player.height))return;
        travel=Math.abs(next-target)<.0006?target:next;
        Object.assign(body,collider,{enabled:travel>.009});
        front.position.copy(start).addScaledVector(forward,travel);
        prop.point.copy(anchor).addScaledVector(forward,travel);
      });
    }
    return g;
  }
  function fire(x,z,yaw=0){
    const g=group(root,x,0,z,yaw);
    box(g,0,.055,.29,1.88,.11,.89,m.stone,true);
    box(g,0,.59,.06,1.57,1.13,.12,m.soot);
    for(const s of [-1,1]){
      box(g,s*.64,.57,.18,.28,1.1,.29,m.marble,true);
      for(let i=0;i<3;i++)box(g,s*.64+(i-1)*.064,.58,.338,.024,.72,.018,m.panel);
    }
    box(g,0,1.19,.19,1.8,.19,.33,m.marble);
    box(g,0,1.32,.22,1.99,.095,.44,m.marble);
    box(g,0,1.39,.24,2.04,.045,.47,m.cream);
    for(let i=0;i<7;i++)box(g,(i-3)*.131,.235,.29,.021,.22,.022,m.iron);
    box(g,0,.32,.29,1.02,.035,.041,m.iron);
    for(let i=0;i<6;i++){
      const coal=oval(g,(i-2.5)*.121,.158,.237,.141,.075,.138,m.black);
      coal.rotation.y=i*.79;
    }
    for(let i=0;i<3;i++){
      const log=cylinder(g,-.09+i*.104,.171+i*.026,.231+i*.018,.052,.40-i*.034,f['aged-oak'],.039,13);
      log.rotation.set(.12-i*.14,0,PI/2-i*.43);
    }
    frame(g,0,2.04,-.055,1.22,.83,m.landscape);
    vessel(g,-.71,1.415,.23,.58);
    vessel(g,.72,1.415,.25,.61,m.porcelain);
    g.updateWorldMatrix(true,false);
    const xw=g.matrixWorld.elements[12],yw=g.matrixWorld.elements[13],zw=g.matrixWorld.elements[14];
    const light=point(xw+Math.sin(yaw)*.54,yw+.46,zw+Math.cos(yaw)*.54,0xff9a56,8.5,3.0,'fire',room.name);
    hearthFlame(g,k,light,room.name);
    sounds.push({kind:'fire',position:[light.x,light.y,light.z],room:room.name,
      volume:room.name==='Drawing room'?.26:.22,enabled:()=>light.enabled});
    round(g,0,1.287,.447,1.67,.075,.018,.010,m.carved);
  }
  function mantleClock(parent){
    const g=group(parent,0,.845,0);
    const walnut=f['burr-walnut'],brass=f['satin-brass'];
    round(g,0,.036,0,.48,.073,.27,.024,walnut);
    round(g,0,.27,0,.35,.455,.21,.14,walnut);
    cylinder(g,0,.367,.122,.116,.035,brass).rotation.x=Math.PI/2;
    cylinder(g,0,.367,.146,.096,.015,m.cream).rotation.x=Math.PI/2;
    for(let i=0;i<12;i++){
      const a=i*PI/6;
      box(g,Math.sin(a)*.083,.367+Math.cos(a)*.083,.156,.006,.013,.004,m.iron).rotation.z=-a;
    }
    const hands=[];
    for(const [len,z] of [[.047,.160],[.068,.164],[.080,.168]]){
      const hand=group(g,0,.367,z);
      box(hand,0,len*.38,0,.005,len,.003,m.iron);
      moveable(hand);
      hands.push({hand,base:hand.quaternion.clone()});
    }
    const axis=new T.Vector3(0,0,1),turn=new T.Quaternion();
    let lastSecond=-1;
    updates.push(()=>{
      const now=new Date(),second=now.getSeconds();
      if(second===lastSecond)return;
      lastSecond=second;
      const fraction=[(now.getHours()+now.getMinutes()/60)/12,(now.getMinutes()+second/60)/60,second/60];
      hands.forEach(({hand,base},i)=>hand.quaternion.copy(base).multiply(turn.setFromAxisAngle(axis,-fraction[i]*PI*2)));
    });
    addProp(g,[0,.36,.173],{radius:.16,label:()=> 'Chime the mantel clock',use:()=> 'clock'});
    sounds.push({kind:'tick',room:room.name,position:worldPoint(g,0,.36,.173).toArray()});
  }
  function sideArt(x,z,yaw=0,art=m.still,w=.7,h=.65){
    if(Math.abs(z)>2.95&&Math.abs(z)<3.05)z=Math.sign(z)*3.048;
    if(Math.abs(Math.abs(x)-1.75)<.018&&Math.abs(z)<2.90&&
      (room.name==='Entrance hall'||room.name==='Upper landing'))x=Math.sign(x)*1.789;
    frame(group(root,x,0,z,yaw),0,1.96,0,w,h,art);
  }
  function entranceTile(){
    const light=m.stone,dark=paint(0x504c48,'stone',.54),warm=paint(0xc6a07f,'stone',.56);
    const g=group(root,-.07,0,5.20);
    const width=1.86,depth=1.19;
    const perimeter=.039;
    for(const s of [-1,1]){
      box(g,s*(width/2-perimeter/2),.006,0,perimeter,.011,depth,dark);
      box(g,0,.006,s*(depth/2-perimeter/2),width-2*perimeter,.011,perimeter,dark);
    }
    const n=11,k=7;
    for(let i=0;i<n;i++)for(let j=0;j<k;j++){
      const w=(width-2*perimeter)/n,d=(depth-2*perimeter)/k;
      const diamond=Math.abs(i-5)+Math.abs(j-3);
      const top=diamond===3||diamond===1?dark:diamond<3?warm:(i+j)%2?light:warm;
      box(g,(i-(n-1)/2)*w,.006,(j-(k-1)/2)*d,w-.003,.011,d-.003,top);
    }
  }
  function umbrellaStand(){
    const g=group(root,-1.42,0,5.64);
    const metal=f['verdigris-brass'];
    lathe(g,0,0,0,[[0,0],[.144,0],[.151,.04],[.128,.09],[.130,.42],
      [.148,.47],[.148,.49],[.123,.49],[.120,.45],[.111,.10],[0,.10]],metal,26);
    for(const [x,z,a,finish] of [[-.044,.046,-.12,m.blue],[.049,-.022,.14,m.green]]){
      const umbrella=group(g,x,.09,z,a);
      umbrella.rotation.z=a;
      cylinder(umbrella,0,.30,0,.035,.60,finish,.003,10);
      cylinder(umbrella,0,.58,0,.008,.24,m.dark);
      const crook=new T.Mesh(new T.TorusGeometry(.034,.008,9,22,PI*1.38),f['honey-oak']);
      crook.position.set(.032,.701,0);crook.rotation.z=.62;umbrella.add(crook);
    }
    block(g,0,.265,0,.292,.53,.292);
  }
  function towelShelf(x,z){
    const g=group(root,x,0,z,PI);
    const shelf=table(x,z,.66,.38,.88,PI,f['limed-ash']);
    for(let i=0;i<3;i++)puff(shelf,i*.011,.897+i*.061,0,.38,.072,.27,
      i===1?f['taupe-pinstripe']:f['oatmeal-linen'],.34);
    for(const s of [-1,1])cylinder(g,s*.251,.42,.12,.016,.40,f['satin-brass']);
    box(g,0,.246,0,.60,.038,.33,f['limed-ash']);
    vessel(g,0,.27,0,.45,m.ceramic);
  }
  function bed(x,z,principal){
    const g=group(root,x,0,z);
    const wood=f[principal?'mahogany':'limed-ash'];
    const head=f[principal?'forest-velvet':'taupe-pinstripe'];
    const bedding=f[principal?'sage-wool':'rose-linen'];
    feet(g,1.55,1.91,.15,wood);
    round(g,0,.29,0,1.78,.31,2.16,.09,wood);
    round(g,0,.344,1.082,1.57,.144,.018,.060,f[principal?'burr-walnut':'honey-oak']);
    round(g,0,.89,-1.05,1.79,1.03,.16,.23,wood);
    round(g,0,.94,-.944,1.58,.72,.11,.23,head);
    for(let i=0;i<7;i++)oval(g,(i-3)*.18,.98,-.861,.012,.012,.012,head);
    round(g,0,.51,.015,1.76,.23,2.08,.10,f['cotton-percale']);
    quilt(g,0,.658,.35,1.83,1.40,bedding,principal?.4:2.8);
    round(g,0,.688,-.18,1.71,.083,.23,.040,f['ivory-damask']);
    quilt(g,0,.691,.82,1.87,.44,f[principal?'navy-windowpane':'sand-quilt'],1.5);
    for(const s of [-1,1]){
      const pillow=puff(g,s*.43,.713,-.638,.67,.175,.46,f[principal?'ivory-damask':'cotton-percale'],.47);
      pillow.rotation.x=.16;
      const deco=puff(g,s*.40,.755,-.389,.33,.151,.28,f[principal?'iberian-weave':'clay-jacquard'],.51);
      deco.rotation.y=s*.19;
      const t=console(x+s*1.25,z-.77,.60);
      lamp(t,0,.85,-.05,.69);
    }
    block(g,0,.45,0,1.81,.92,2.20);
    shade(g,0,.04,2.27,2.45,.036);
  }
  function cupboard(x,z,w,yaw=0){
    const g=group(root,x,0,z,yaw);
    box(g,0,1.06,0,w,2.06,.55,f['aged-oak'],true);
    round(g,0,2.10,0,w+.12,.106,.63,.033,f['quarter-sawn-oak']);
    for(const s of [-1,1]){
      box(g,s*w*.25,1.11,.29,w*.46,1.84,.05,f['aged-oak']);
      for(const [y,h] of [[.63,.66],[1.51,.84]])round(g,s*w*.25,y,.325,w*.36,h,.034,.037,f['quarter-sawn-oak']);
      oval(g,s*.095,1.05,.384,.022,.042,.023,f['satin-brass']);
    }
  }
  function seat(x,z,yaw=0,fabric=f['moss-tartan'],adjustable=false){
    const g=group(root,x,0,z,yaw);
    const wood=f['quarter-sawn-oak'];
    feet(g,.40,.39,.44,wood);
    round(g,0,.395,0,.48,.078,.47,.040,wood);
    round(g,0,.463,0,.49,.089,.47,.044,fabric);
    for(const s of [-1,1])cylinder(g,s*.188,.71,-.195,.023,.50,wood);
    round(g,0,.89,-.196,.47,.21,.055,.065,f['burr-walnut']);
    for(const x of [-.09,0,.09])round(g,x,.70,-.191,.028,.21,.029,.013,wood);
    if(!adjustable){block(g,0,.50,0,.49,1,.49);return;}
    const prop=addProp(g,[0,.654,-.14],{
      radius:.32,label:()=>target?'Tuck chair in':'Pull chair out',
      use(){target=target?0:.29;return 'chair';},
      reset(){
        target=travel=speed=0;
        g.position.copy(home);prop.point.copy(mark);Object.assign(body,base);
      },
    });
    moveable(g);
    const home=g.position.clone(),mark=prop.point.clone();
    const pull=new T.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
    const base=bounds(g,0,.50,0,.49,1,.49);
    const body={...base,enabled:true,moving:true};
    dynamicSolids.push(body);
    let travel=0,speed=0,target=0;
    updates.push((dt,steady,player)=>{
      if(Math.abs(travel-target)<.0005&&Math.abs(speed)<.0005)return;
      const steps=Math.max(1,Math.ceil(dt/.012));
      for(let i=0;i<steps;i++){
        const step=dt/steps;
        speed+=(target-travel)*39*step-speed*12.5*step;
        const next=T.MathUtils.clamp(travel+speed*step,0,.29);
        const dx=pull.x*next,dz=pull.z*next;
        const moved={...base,minX:base.minX+dx,maxX:base.maxX+dx,minZ:base.minZ+dz,maxZ:base.maxZ+dz};
        if(overlaps(player.x,player.y,player.z,moved,player.height)){
          speed=0;break;
        }
        travel=next;
        if(Math.abs(travel-target)<.0005&&Math.abs(speed)<.008)speed=0;
        Object.assign(body,moved);
      }
      g.position.copy(home).addScaledVector(pull,travel);
      prop.point.copy(mark).addScaledVector(pull,travel);
    });
  }
  function cabinetry(){
    const g=group(root,0,0,-2.62);
    for(let i=0;i<6;i++){
      const x=(i-2.5)*.72;
      const underSink=i===1||i===2;
      const height=underSink?.680:.87;
      box(g,x,height/2,0,.711,height,.66,f['olive-painted-oak'],true);
      box(g,x,.45,.345,.65,.69,.041,m.teal);
      box(g,x,.46,.374,.51,.54,.020,f['olive-painted-oak']);
      box(g,x,.72,.408,.146,.021,.026,f['satin-brass']);
      if(i!==2&&i!==3){
        box(g,x,2.32,-.095,.711,.70,.40,f['olive-painted-oak'],true);
        box(g,x,2.31,.115,.65,.61,.035,m.teal);
        oval(g,x+.19,2.10,.156,.024,.023,.018,m.brass);
      }
    }
    for(const [x,w] of [[-1.60,1.16],[.89,2.58]])box(g,x,.89,0,w,.087,.77,m.stone);
    for(const [z,d] of [[-.3025,.165],[.325,.120]])box(g,-.72,.89,z,.622,.087,d,m.stone);
    for(let i=0;i<12;i++)box(g,(i-5.5)*.357,1.20,-.321,.353,.54,.015,m.tile);
    const sink=group(g,-.72,0,.02);
    box(sink,0,.712,0,.61,.056,.435,m.porcelain);
    for(const sign of [-1,1]){
      box(sink,sign*.291,.814,0,.028,.207,.439,m.porcelain);
      box(sink,0,.814,sign*.208,.573,.207,.027,m.porcelain);
      round(sink,sign*.303,.934,0,.032,.023,.505,.009,m.porcelain);
      round(sink,0,.934,sign*.235,.606,.022,.034,.009,m.porcelain);
    }
    cylinder(sink,0,.745,0,.035,.014,m.silver);
    for(let j=0;j<5;j++){
      const a=j*PI/2.5;
      cylinder(sink,Math.cos(a)*.017,.754,Math.sin(a)*.017,.003,.002,m.iron);
    }
    const brass=f['satin-brass'];
    cylinder(sink,0,1.042,-.282,.024,.239,brass);
    round(sink,0,1.158,-.194,.047,.041,.215,.020,brass);
    cylinder(sink,0,1.127,-.097,.019,.056,brass);
    for(const sign of [-1,1]){
      cylinder(sink,sign*.121,.972,-.282,.026,.082,brass);
      box(sink,sign*.121,1.020,-.282,.087,.016,.020,brass);
    }
    waterTap(sink,k,{x:0,y:1.099,z:-.097,baseY:.744,width:.535,depth:.379,poolZ:.097,room:room.name,label:'kitchen tap'});
    box(g,.72,.944,.035,.62,.019,.48,m.iron);
    for(const xx of [-.14,.14])for(const zz of [-.103,.103]){
      cylinder(g,.72+xx,.962,.035+zz,.064,.022,m.dark);
      cylinder(g,.72+xx,.975,.035+zz,.043,.013,m.silver);
      for(const side of [-1,1]){
        box(g,.72+xx,.982,.035+zz+side*.066,.162,.018,.016,m.iron);
        box(g,.72+xx+side*.070,.982,.035+zz,.014,.018,.15,m.iron);
      }
    }
    for(let i=0;i<4;i++)oval(g,.72+(i-1.5)*.115,.973,.286,.023,.014,.020,m.silver);
    box(g,.72,1.98,-.15,.89,.20,.48,m.iron);
    box(g,.72,2.40,-.22,.45,.74,.29,m.iron);
    vessel(g,-1.58,.94,.06,.68,m.porcelain);
    vessel(g,1.64,.94,-.04,.77);
    const kettle=group(g,1.65,.937,.22);
    const copper=paint(0x9f593b,null,.43,.48);
    lathe(kettle,0,0,0,[[0,0],[.094,0],[.117,.064],[.103,.121],[.073,.161],[.065,.166],[0,.166]],copper,26);
    cylinder(kettle,0,.171,0,.071,.014,copper,.065);
    oval(kettle,0,.192,0,.018,.018,.017,m.iron);
    const spout=cylinder(kettle,.108,.105,0,.035,.126,copper,.018);
    spout.rotation.z=-.76;
    const handle=new T.Mesh(new T.TorusGeometry(.078,.012,10,28,PI),m.iron);
    handle.position.y=.146;kettle.add(handle);
  }

  ceiling(0,room.name==='Entrance hall' || room.name==='Upper landing' ? -3.48 : 0,
    room.name==='Entrance hall'?3.15:3.17);
  switch(room.name){
    case 'Entrance hall':{
      ceiling(-.68,4.2,3.15);
      entranceTile();
      const c=console(-1.49,1.06,1.35,PI/2,f['honey-oak'],true);
      lamp(c,.35,.84,0,.79);vessel(c,-.37,.84,0,.68);
      sideArt(-1.75,1.06,PI/2,m.landscape,.83,.63);
      carpet(-.84,-3.09,1.30,4.37,m.flatweave);
      const detail=table(-1.35,-5.60,.64,.54,.81);
      mantleClock(detail);
      umbrellaStand();
      sideArt(-1.747,-1.32,PI/2,m.oliveArt,.43,.67);
      break;
    }
    case 'Upper landing':{
      carpet(-.77,.42,1.24,6.23,m.indigo);
      const c=console(-1.50,-.8,1.30,PI/2);
      lamp(c,.34,.84,0,.75);
      sideArt(-1.75,-.8,PI/2,m.landscape,.82,.61);
      sideArt(-1.75,1.28,PI/2,m.helleboreArt,.43,.61);
      sideArt(-1.75,2.23,PI/2,m.oliveArt,.43,.61);
      break;
    }
    case 'Drawing room':{
      fire(0,-2.99);
      carpet(-.20,.21,3.28,3.80);
      sofa(-1.78,.16,2.45,PI/2,f['forest-velvet'],[f['terracotta-diamond'],f['botanical-linen']]);
      sofa(1.20,-.98,1.07,-PI/2,f['rust-herringbone'],[f['ochre-velvet']]);
      const t=table(-.18,.55,1.14,.63,.49,PI/2,f['honey-oak']);
      round(t,.15,.510,0,.27,.037,.19,.017,f['saddle-leather']);
      box(t,.15,.511,.089,.245,.021,.016,m.cream);
      addProp(t,[.15,.529,0],{radius:.16,label:()=> 'Read the house ledger',use:()=> 'ledger'});
      vessel(t,-.24,.53,0,.57);
      const side=console(-1.68,2.58,1.20);
      lamp(side,-.33,.84,0);
      sideArt(-.58,2.98,PI,m.still,.81,.68);
      break;
    }
    case 'Library':{
      fire(-.45,-2.99);
      bookcase(.48,2.88,PI,1.58);
      bookcase(-1.22,2.88,PI,1.58);
      carpet(-.25,.08,3.56,3.55,m.indigo);
      sofa(-1.58,.09,1.18,PI/2,f['cognac-leather']);
      sofa(.72,.74,1.12,-PI/2,f['moss-tartan'],[f['burgundy-damask']]);
      const t=table(-.13,.18,.68,.56,.58);
      lamp(t,0,.59,-.04,.74);
      chess(table(1.78,-2.32,.75,.62,.78,0,f['smoked-walnut']));
      sideArt(1.6,-2.99,0,m.still,.74,.54);
      break;
    }
    case 'Dining room':{
      carpet(.13,-.16,3.47,3.91,m.flatweave);
      const t=table(.07,-.25,1.15,2.03,.77,0,f['quarter-sawn-oak']);
      box(t,0,.777,0,.37,.018,1.81,f['moss-flatweave']);
      florals(t,0,.795,0);
      for(const s of [-1,1])for(const z of [-.91,.41]){
        seat(.07+s*.95,z,-s*PI/2,f['indigo-ticking'],z===.41);
        setPlace(t,s*.32,z+.25,s);
      }
      seat(.07,-1.65,0,f['indigo-ticking']);
      seat(.07,1.15,PI,f['indigo-ticking']);
      const c=console(0,-2.67,2.09);
      vessel(c,.70,.84,0,.88);
      lamp(c,-.73,.84,0);
      sideArt(0,-2.99,0,m.blossoms,1.10,.75);
      ceramicPlate(group(root,-1.06,0,-2.986),0,1.70,0,.161,true);
      ceramicPlate(group(root,1.10,0,-2.986),0,1.70,0,.161,true);
      break;
    }
    case 'Kitchen':{
      cabinetry();
      const t=table(.57,.11,1.00,1.63,.96,0,m.stone);
      box(t,0,.45,0,.83,.79,1.43,f['olive-painted-oak']);
      box(t,-.13,.974,-.33,.44,.029,.29,f['aged-oak']);
      for(let i=0;i<5;i++)oval(t,.22+Math.sin(i*2.4)*.10,1.02,.30+Math.cos(i*2.4)*.15,.053,.047,.055,i%2?m.rust:m.green);
      cupboard(1.91,2.66,1.04,PI);
      sideArt(-.46,2.98,PI,m.still,.68,.59);
      for(const [x,y,r] of [[.22,1.55,.13],[.61,1.76,.154],[1.02,1.52,.11]]){
        ceramicPlate(group(root,x,0,2.976,PI),0,y,0,r,true);
      }
      break;
    }
    case 'Principal bedroom':
    case 'Guest bedroom':{
      const principal=room.side<0;
      carpet(0,-.71,3.80,3.73,principal?m.indigo:m.flatweave);
      bed(0,-1.71,principal);
      sideArt(0,-2.98,0,principal?m.blossoms:m.courtyard,1.02,.64);
      if(principal)cupboard(.73,2.81,1.48,PI);
      else{
        const dresser=console(.70,2.73,1.52,PI,f['limed-ash'],true);
        lamp(dresser,-.46,.84,0,.67);
        vessel(dresser,.44,.84,0,.66,m.porcelain);
        sideArt(.70,2.98,PI,m.blossoms,.72,.58);
      }
      sofa(principal?-1.46:1.54,1.26,1.05,principal?PI/2:-PI/2,principal?f['rose-boucle']:f['oatmeal-linen'],
        [principal?f['ivory-damask']:f['clay-jacquard']]);
      break;
    }
    case 'Reading room':{
      bookcase(.61,2.88,PI,1.61);
      bookcase(-1.17,2.88,PI,1.61);
      carpet(-.03,.04,3.46,3.48);
      sofa(-.94,-1.37,2.08,0,f['petrol-chenille'],[f['charcoal-tweed'],f['houndstooth']]);
      const t=table(.72,-1.65,.66,.57,.57);
      lamp(t,0,.575,0);
      const desk=console(1.32,.57,1.22,-PI/2);
      books(desk,-.30,.85,-.06,4);
      const writing=group(desk,.29,.858,.018,-.15);
      box(writing,0,0,0,.23,.013,.29,f['saddle-leather']);
      box(writing,.014,.009,.009,.17,.006,.238,m.cream);
      cylinder(writing,.072,.019,-.03,.006,.169,f['rosewood']).rotation.set(PI/2,0,-.13);
      vessel(writing,-.11,.009,-.117,.26,m.iron);
      seat(.40,.57,PI/2,f['saddle-leather']);
      sideArt(-.95,-2.99,0,m.courtyard,1.04,.66);
      olive(2.15,-2.29);
      break;
    }
    case 'Bathroom':{
      const tub=group(root,1.22,0,-1.78);
      for(const x of [-.46,.46])for(const z of [-.23,.23])oval(tub,x,.099,z,.085,.104,.078,m.brass);
      const bath=lathe(tub,0,0,0,[[0,.138],[.25,.14],[.30,.168],[.35,.262],[.397,.52],[.41,.57],
        [.426,.585],[.428,.607],[.411,.625],[.384,.623],[.363,.602],[.358,.535],[.308,.32],[.263,.239],[.19,.218],[0,.218]],m.porcelain,44);
      bath.scale.x=1.98;
      cylinder(tub,.43,.692,-.326,.025,.17,m.brass);
      box(tub,.43,.77,-.249,.052,.043,.19,m.brass);
      cylinder(tub,0,.224,0,.024,.012,m.iron);
      block(tub,0,.32,0,1.63,.65,.82);
      waterTap(tub,k,{x:.43,y:.744,z:-.160,baseY:.228,width:.90,depth:.37,poolX:-.40,poolZ:.160,
        room:room.name,label:'bath tap',round:true});
      const sink=console(-2.33,1.74,1.18,PI/2,f['limed-ash']);
      const basin=lathe(sink,0,.82,.034,[[0,.017],[.121,.017],[.161,.032],[.192,.087],[.211,.126],
        [.204,.149],[.178,.151],[.166,.133],[.148,.08],[.099,.056],[0,.056]],m.porcelain,30);
      basin.scale.x=1.77;
      cylinder(sink,.06,1.014,-.102,.021,.166,f['satin-brass']);
      round(sink,.06,1.102,-.060,.031,.028,.121,.011,f['satin-brass']);
      waterTap(sink,k,{x:.06,y:1.088,z:-.001,baseY:.881,width:.47,depth:.27,poolX:-.05,poolZ:.034,
        room:room.name,label:'basin tap',round:true});
      round(sink,0,1.67,-.255,.842,.958,.071,.097,f['quarter-sawn-oak']);
      round(sink,0,1.67,-.212,.795,.906,.025,.052,f['satin-brass']);
      wallMirror(sink,k,0,1.67,-.191,.754,.867);
      oval(sink,-.441,.862,.088,.062,.019,.048,m.ceramic);
      puff(sink,-.443,.884,.089,.099,.047,.078,m.porcelain,.47);
      box(root,.90,.85,2.78,.55,.5,.23,m.porcelain);
      oval(root,.90,.38,2.48,.265,.22,.33,m.porcelain);
      oval(root,.90,.56,2.44,.268,.057,.31,m.stone);
      cylinder(root,.90,.18,2.56,.125,.33,m.porcelain);
      block(root,.9,.48,2.59,.57,1,.91);
      box(root,1.83,1.13,2.86,.79,.047,.07,m.brass);
      round(root,1.83,.958,2.871,.58,.49,.088,.041,f['oatmeal-linen']);
      towelShelf(-.1,-2.73);
      puff(root,1.11,.023,-.93,1.32,.027,.57,f['oatmeal-linen'],.36);
      sideArt(-1.76,-2.986,0,m.oliveArt,.39,.54);
      break;
    }
  }
}
