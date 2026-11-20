export function furnish(k,root,room){
  const {m,box,block,round,oval,cylinder,lathe,group,shade,frame,paint,point}=k;
  const PI=Math.PI;
  function feet(g,w,d,h=.16,metal=m.dark){
    for(const x of [-w/2,w/2])for(const z of [-d/2,d/2])
      cylinder(g,x,h/2,z,.038,h,metal,.052);
  }
  function vessel(g,x,y,z,s=1,material=m.ceramic){
    const profile=[[0,0],[.104,0],[.135,.06],[.147,.17],[.126,.25],[.06,.31],[.055,.40],[.072,.41],[.074,.43],[.046,.43],[.042,.39]];
    const pot=lathe(g,x,y,z,profile,material);pot.scale.setScalar(s);
  }
  function lamp(g,x,y,z,s=.83){
    const p=group(g,x,y,z);p.scale.setScalar(s);
    cylinder(p,0,.034,0,.16,.065,m.brass,.13);
    lathe(p,0,.05,0,[[.075,0],[.105,.14],[.075,.29],[.04,.40],[0,.41]],m.ceramic);
    cylinder(p,0,.49,0,.018,.19,m.brass);
    cylinder(p,0,.67,0,.225,.27,m.glow,.144,24);
    for(let i=0;i<24;i++){
      const a=i*PI/12;
      const seam=cylinder(p,.184*Math.cos(a),.67,.184*Math.sin(a),.006,.282,m.piping);
      seam.rotation.set(-Math.sin(a)*.29,0,Math.cos(a)*.29);
    }
  }
  function ceiling(x=0,z=0,y=3.17){
    const g=group(root,x,y,z);
    cylinder(g,0,-.015,0,.27,.033,m.cream);
    cylinder(g,0,-.18,0,.027,.32,m.brass);
    cylinder(g,0,-.39,0,.36,.24,m.glow,.30,26);
    for(const yy of [-.512,-.267])cylinder(g,0,yy,0,yy<-.4?.363:.306,.022,m.brass);
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
  }
  function sofa(x,z,w,angle,fabric){
    const g=group(root,x,0,z,angle);
    feet(g,w-.29,.62,.15);
    round(g,0,.27,0,w,.25,.83,.10,fabric);
    const back=round(g,0,.64,-.32,w-.10,.71,.24,.13,fabric);back.rotation.x=-.09;
    for(const s of [-1,1]){
      oval(g,s*(w/2-.09),.62,.045,.135,.139,.465,fabric);
      round(g,s*(w/2-.10),.43,.04,.19,.25,.75,.07,fabric);
    }
    const n=w>1.8?3:1, cw=(w-.41)/n;
    for(let i=0;i<n;i++){
      const cx=(i-(n-1)/2)*cw;
      round(g,cx,.452,.075,cw-.045,.133,.635,.066,fabric);
      for(const off of [-.24,.24])oval(g,cx+off*cw,.772,-.182,.016,.016,.016,m.piping);
    }
    if(n===3)for(const [i,color] of [[-1,m.rust],[1,m.linen]]){
      const cushion=round(g,i*(w/2-.39),.665,-.09,.38,.38,.17,.108,color);
      cushion.rotation.set(-.22,0,i*.23);
    }
    block(g,0,.49,0,w,.98,.86);
    shade(g,0,.04,w+.44,1.30,.035);
  }
  function table(x,z,w,d,h,yaw=0,finish=m.dark){
    const g=group(root,x,0,z,yaw);
    feet(g,w-.24,d-.23,h-.07);
    round(g,0,h-.034,0,w,.073,d,.049,finish);
    box(g,0,h-.133,0,w-.12,.097,d-.13,finish);
    block(g,0,h/2,0,w,h,d);
    shade(g,0,0,w+.34,d+.31,.038);
    return g;
  }
  function books(g,x,y,z,n=7){
    const colors=[m.rust,m.teal,m.green,m.leather,m.blue,m.rose,m.oak];
    for(let i=0;i<n;i++){
      const h=.19+(i*17%11)*.009, w=.063+(i%4)*.011;
      box(g,x+i*.094,y+h/2,z,w,h,.21,colors[i%7]);
      for(const a of [.13,.79])box(g,x+i*.094,y+h*a,z+.109,w*.78,.008,.007,m.brass);
    }
  }
  function bookcase(x,z,yaw=0,w=1.53){
    const g=group(root,x,0,z,yaw);
    box(g,0,1.23,-.14,w,2.45,.065,m.dark);
    for(const s of [-1,1])box(g,s*(w/2-.034),1.23,0,.067,2.45,.35,m.trim);
    for(const yy of [.14,.54,.96,1.37,1.79,2.18,2.43]){
      box(g,0,yy,0,w,.043,.365,m.trim);
      if(yy<2.18){books(g,-w/2+.11,yy+.023,.025,Math.floor((w-.24)/.094)-2);}
    }
    box(g,0,2.47,0,w+.12,.081,.42,m.dark);
    block(g,0,1.24,0,w,2.48,.39);
  }
  function console(x,z,w=1.48,yaw=0){
    const g=table(x,z,w,.48,.84,yaw,m.oak);
    box(g,0,.70,.244,w-.18,.138,.027,m.dark);
    for(const s of [-1,1])oval(g,s*.27,.716,.274,.025,.025,.020,m.brass);
    return g;
  }
  function fire(x,z,yaw=0){
    const g=group(root,x,0,z,yaw);
    box(g,0,.055,.29,1.88,.11,.89,m.stone,true);
    box(g,0,.59,.06,1.57,1.13,.12,m.black);
    for(const s of [-1,1]){
      box(g,s*.64,.57,.18,.28,1.1,.29,m.stone,true);
      for(let i=0;i<3;i++)box(g,s*.64+(i-1)*.064,.58,.338,.024,.72,.018,m.panel);
    }
    box(g,0,1.19,.19,1.8,.19,.33,m.stone);
    box(g,0,1.32,.22,1.99,.095,.44,m.stone);
    box(g,0,1.39,.24,2.04,.045,.47,m.cream);
    for(let i=0;i<7;i++)box(g,(i-3)*.131,.235,.29,.021,.22,.022,m.iron);
    box(g,0,.32,.29,1.02,.035,.041,m.iron);
    for(let i=0;i<6;i++){
      const coal=oval(g,(i-2.5)*.121,.157,.235,.141,.075,.138,i%2?m.black:m.ember);
      coal.rotation.y=i*.79;
    }
    frame(g,0,2.04,.219,1.22,.83,m.landscape);
    vessel(g,-.71,1.415,.23,.58);
    vessel(g,.72,1.415,.25,.61,m.porcelain);
    g.updateWorldMatrix(true,false);
    const xw=g.matrixWorld.elements[12],yw=g.matrixWorld.elements[13],zw=g.matrixWorld.elements[14];
    point(xw+Math.sin(yaw)*.54,yw+.39,zw+Math.cos(yaw)*.54,0xff822d,5.4,2.6);
  }
  function sideArt(x,z,yaw=0,art=m.still,w=.7,h=.65){
    frame(group(root,x,0,z,yaw),0,1.96,0,w,h,art);
  }
  function bed(x,z,accent){
    const g=group(root,x,0,z);
    feet(g,1.55,1.91,.15);
    round(g,0,.29,0,1.78,.31,2.16,.09,m.dark);
    round(g,0,.89,-1.05,1.79,1.03,.16,.23,m.oak);
    round(g,0,.94,-.944,1.58,.72,.11,.23,accent);
    for(let i=0;i<7;i++)oval(g,(i-3)*.18,.98,-.878,.019,.019,.019,m.piping);
    round(g,0,.51,.015,1.76,.23,2.08,.10,m.linen);
    round(g,0,.65,.39,1.76,.12,1.30,.075,accent);
    round(g,0,.638,.96,1.79,.159,.24,.055,m.rust);
    for(const s of [-1,1]){
      const pillow=round(g,s*.43,.714,-.638,.67,.15,.46,.071,m.linen);
      pillow.rotation.x=.16;
      const deco=round(g,s*.40,.763,-.382,.33,.12,.28,.058,m.rose);
      deco.rotation.y=s*.19;
      const t=console(x+s*1.25,z-.77,.60);
      lamp(t,0,.85,-.05,.69);
    }
    block(g,0,.45,0,1.81,.92,2.20);
    shade(g,0,.04,2.27,2.45,.036);
  }
  function cupboard(x,z,w,yaw=0){
    const g=group(root,x,0,z,yaw);
    box(g,0,1.06,0,w,2.06,.55,m.dark,true);
    box(g,0,2.10,0,w+.12,.106,.63,m.oak);
    for(const s of [-1,1]){
      box(g,s*w*.25,1.11,.29,w*.46,1.84,.05,m.oak);
      for(const [y,h] of [[.63,.66],[1.51,.84]])box(g,s*w*.25,y,.325,w*.36,h,.034,m.trim);
      oval(g,s*.095,1.05,.384,.022,.042,.023,m.brass);
    }
  }
  function seat(x,z,yaw=0){
    const g=group(root,x,0,z,yaw);
    feet(g,.40,.39,.44);
    round(g,0,.45,0,.50,.11,.49,.065,m.rust);
    for(const s of [-1,1])cylinder(g,s*.188,.71,-.195,.023,.50,m.dark);
    round(g,0,.89,-.196,.47,.21,.055,.07,m.trim);
    block(g,0,.50,0,.49,1,.49);
  }
  function cabinetry(){
    const g=group(root,0,0,-2.62);
    for(let i=0;i<6;i++){
      const x=(i-2.5)*.72;
      box(g,x,.44,0,.711,.87,.66,m.green,true);
      box(g,x,.45,.345,.65,.69,.041,m.teal);
      box(g,x,.46,.374,.51,.54,.020,m.green);
      box(g,x,.72,.408,.146,.021,.026,m.brass);
      if(i!==2&&i!==3){
        box(g,x,2.32,-.095,.711,.70,.40,m.green,true);
        box(g,x,2.31,.115,.65,.61,.035,m.teal);
        oval(g,x+.19,2.10,.156,.024,.023,.018,m.brass);
      }
    }
    box(g,0,.89,0,4.36,.087,.77,m.stone);
    for(let i=0;i<12;i++)box(g,(i-5.5)*.357,1.20,-.321,.353,.54,.015,m.tile);
    box(g,-.72,.94,.03,.58,.027,.43,m.iron);
    box(g,-.72,.959,.03,.49,.021,.34,m.porcelain);
    cylinder(g,-.72,1.08,-.20,.023,.26,m.brass);
    box(g,-.72,1.20,-.146,.053,.039,.17,m.brass);
    box(g,.72,.944,.035,.62,.019,.48,m.iron);
    for(const xx of [-.14,.14])for(const zz of [-.103,.103])cylinder(g,.72+xx,.965,.035+zz,.086,.023,m.dark);
    box(g,.72,1.98,-.15,.89,.20,.48,m.iron);
    box(g,.72,2.40,-.22,.45,.74,.29,m.iron);
    vessel(g,-1.58,.94,.06,.68,m.porcelain);
    vessel(g,1.64,.94,-.04,.77);
  }

  ceiling(0,room.name==='Entrance hall' || room.name==='Upper landing' ? -3.48 : 0,
    room.name==='Entrance hall'?3.15:3.17);
  switch(room.name){
    case 'Entrance hall':{
      ceiling(-.68,4.2,3.15);
      const c=console(-1.49,1.06,1.35,PI/2);
      lamp(c,.35,.84,0,.79);vessel(c,-.37,.84,0,.68);
      sideArt(-1.75,1.06,PI/2,m.landscape,.83,.63);
      carpet(-.84,-3.09,1.30,4.37,m.flatweave);
      const detail=table(-1.35,-5.60,.64,.54,.81);
      vessel(detail,0,.82,0,.80);
      break;
    }
    case 'Upper landing':{
      carpet(-.77,.42,1.24,6.23,m.indigo);
      const c=console(-1.50,-.8,1.30,PI/2);
      lamp(c,.34,.84,0,.75);
      sideArt(-1.75,-.8,PI/2,m.landscape,.82,.61);
      break;
    }
    case 'Drawing room':{
      fire(0,-2.99);
      carpet(-.20,.21,3.28,3.80);
      sofa(-1.78,.16,2.45,PI/2,m.green);
      sofa(1.20,-.98,1.07,-PI/2,m.rust);
      const t=table(-.18,.55,1.14,.63,.49,PI/2,m.oak);
      box(t,.15,.507,0,.27,.031,.19,m.teal);
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
      sofa(-1.58,.09,1.18,PI/2,m.leather);
      sofa(.72,.74,1.12,-PI/2,m.green);
      const t=table(-.13,.18,.68,.56,.58);
      lamp(t,0,.59,-.04,.74);
      sideArt(1.6,-2.99,0,m.still,.74,.54);
      break;
    }
    case 'Dining room':{
      carpet(.13,-.16,3.47,3.91,m.flatweave);
      const t=table(.07,-.25,1.15,2.03,.77,0,m.oak);
      box(t,0,.777,0,.37,.018,1.81,m.tile);
      vessel(t,0,.788,0,.85);
      for(const s of [-1,1])for(const z of [-.91,.41]){
        seat(.07+s*.95,z,s*PI/2);
        cylinder(t,s*.33,.789,z+.25,.122,.02,m.porcelain);
        cylinder(t,s*.33,.802,z+.25,.078,.009,m.stone);
      }
      const c=console(0,-2.67,2.09);
      vessel(c,.70,.84,0,.88);
      lamp(c,-.73,.84,0);
      sideArt(0,-2.99,0,m.blossoms,1.10,.75);
      break;
    }
    case 'Kitchen':{
      cabinetry();
      const t=table(.57,.11,1.00,1.63,.96,0,m.stone);
      box(t,0,.45,0,.83,.79,1.43,m.green);
      box(t,-.13,.974,-.33,.44,.029,.29,m.oak);
      for(let i=0;i<5;i++)oval(t,.22+Math.sin(i*2.4)*.10,1.02,.30+Math.cos(i*2.4)*.15,.053,.047,.055,i%2?m.rust:m.green);
      cupboard(1.91,2.66,1.04,PI);
      sideArt(-.46,2.98,PI,m.still,.68,.59);
      break;
    }
    case 'Principal bedroom':
    case 'Guest bedroom':{
      const principal=room.side<0;
      const accent=principal?m.green:m.rose;
      carpet(0,-.71,3.80,3.73,principal?m.indigo:m.flatweave);
      bed(0,-1.71,accent);
      sideArt(0,-2.98,0,principal?m.blossoms:m.courtyard,1.02,.64);
      if(principal)cupboard(.73,2.81,1.48,PI);
      else{
        const dresser=console(.70,2.73,1.52,PI);
        lamp(dresser,-.46,.84,0,.67);
        vessel(dresser,.44,.84,0,.66,m.porcelain);
        sideArt(.70,2.98,PI,m.blossoms,.72,.58);
      }
      sofa(-1.46,1.26,1.05,PI/2,principal?m.rose:m.blue);
      break;
    }
    case 'Reading room':{
      bookcase(.61,2.88,PI,1.61);
      bookcase(-1.17,2.88,PI,1.61);
      carpet(-.03,.04,3.46,3.48);
      sofa(-.94,-1.37,2.08,0,m.blue);
      const t=table(.72,-1.65,.66,.57,.57);
      lamp(t,0,.575,0);
      const desk=console(1.32,.57,1.22,-PI/2);
      books(desk,-.30,.85,-.06,4);
      seat(.40,.57,PI/2);
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
      const sink=console(-1.74,1.74,1.18,PI/2);
      const basin=lathe(sink,0,.82,.034,[[0,.017],[.121,.017],[.161,.032],[.192,.087],[.211,.126],
        [.204,.149],[.178,.151],[.166,.133],[.148,.08],[.099,.056],[0,.056]],m.porcelain,30);
      basin.scale.x=1.77;
      cylinder(sink,.06,1.01,-.091,.021,.14,m.brass);
      const mirror=paint(0xa7bac0,null,.18,.35);
      box(sink,0,1.67,-.228,.83,.95,.055,m.brass);
      box(sink,0,1.67,-.189,.77,.89,.025,mirror);
      box(root,.90,.85,2.78,.55,.5,.23,m.porcelain);
      oval(root,.90,.38,2.48,.265,.22,.33,m.porcelain);
      oval(root,.90,.56,2.44,.268,.057,.31,m.stone);
      cylinder(root,.90,.18,2.56,.125,.33,m.porcelain);
      block(root,.9,.48,2.59,.57,1,.91);
      box(root,1.83,1.13,2.86,.79,.047,.07,m.brass);
      round(root,1.83,.958,2.871,.58,.49,.088,.041,m.linen);
      break;
    }
  }
}
