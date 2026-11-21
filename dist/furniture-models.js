import * as T from 'three';

const V=(x,y,z)=>new T.Vector3(x,y,z);
const power=(v,p)=>Math.sign(v)*Math.abs(v)**p;

function surface(parent, rows, columns, sample, material, reverse=false){
  const positions=[],uvs=[],indices=[];
  for(let row=0;row<=rows;row++)for(let column=0;column<=columns;column++){
    const [x,y,z,u,v]=sample(column/columns,row/rows);
    positions.push(x,y,z);uvs.push(u,v);
    if(!row||!column)continue;
    const d=row*(columns+1)+column,c=d-1,b=d-columns-1,a=b-1;
    if(reverse)indices.push(a,b,c,b,d,c);
    else indices.push(a,c,b,b,c,d);
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh=new T.Mesh(geometry,material);
  parent.add(mesh);
  return mesh;
}

function smoothSeam(mesh,rows,columns){
  const n=mesh.geometry.attributes.normal;
  const a=new T.Vector3(),b=new T.Vector3();
  for(let row=0;row<=rows;row++){
    const first=row*(columns+1),last=first+columns;
    a.fromBufferAttribute(n,first).add(b.fromBufferAttribute(n,last)).normalize();
    n.setXYZ(first,a.x,a.y,a.z);n.setXYZ(last,a.x,a.y,a.z);
  }
  return mesh;
}

// Swept elliptical joinery and upholstery rolls with a variable cross-section.
function sweep(parent,points,radii,material,{segments=18,sides=10,aspect=1}={}){
  const path=new T.CatmullRomCurve3(points.map(p=>V(...p)),false,'centripetal');
  const frames=path.computeFrenetFrames(segments,false);
  const locations=path.getSpacedPoints(segments);
  const length=path.getLength();
  const rows=segments+2;
  const mesh=surface(parent,rows,sides,(u,v)=>{
    const row=Math.round(v*rows),index=Math.max(0,Math.min(segments,row-1));
    const p=locations[index],along=index/segments;
    const t=along*(radii.length-1),a=Math.floor(t);
    const cap=row===0||row===rows;
    const r=T.MathUtils.lerp(radii[a],radii[Math.min(a+1,radii.length-1)],t-a)*(cap?.001:1);
    const n=frames.normals[index],b=frames.binormals[index],angle=u*Math.PI*2;
    const point=p.clone().addScaledVector(n,r*Math.cos(angle)).addScaledVector(b,r*aspect*Math.sin(angle));
    return [point.x,point.y,point.z,u,along*length*2];
  },material,true);
  return smoothSeam(mesh,rows,sides);
}

function seam(parent,points,material,radius=.0035,closed=false){
  const curve=new T.CatmullRomCurve3(points.map(p=>V(...p)),closed);
  const mesh=new T.Mesh(new T.TubeGeometry(curve,closed?44:22,radius,5,closed),material);
  parent.add(mesh);
}

const cushionRings=[
  [-.50,.002],[-.498,.58],[-.473,.79],[-.43,.91],[-.32,.976],[-.16,1],
  [0,1.007],[.18,.997],[.32,.965],[.43,.902],[.49,.73],[.50,.54],[.503,.002],
];

function outline(u,w,d,shape){
  const angle=u*2*Math.PI;
  return [w*.5*power(Math.cos(angle),shape),d*.5*power(Math.sin(angle),shape)];
}

// Individual filled cushions have domed faces and a separate sewn midline.
function cushion(parent,w,h,d,material,{shape=.39,phase=0,crown=.09,welt=null}={}){
  const rows=cushionRings.length-1,cols=40;
  function shell(u,vertical,scale){
    const theta=2*Math.PI*u;
    const [x,z]=outline(u,w,d,shape);
    const wave=1+(Math.sin(theta*3+phase)*.010+Math.sin(theta*7-phase)*.007)*scale;
    const puff=crown*h*Math.sin(Math.PI*scale)*(vertical>0?1:-.38);
    return [x*scale*wave,h*vertical+puff,z*scale*wave];
  }
  const mesh=surface(parent,rows,cols,(u,v)=>{
    const [height,r]=cushionRings[Math.round(v*rows)];
    const [x,y,z]=shell(u,height,r);
    return [x,y,z,.5+x*2.15,.5-z*2.15+y*.49];
  },material);
  smoothSeam(mesh,rows,cols);
  if(welt)seam(parent,Array.from({length:40},(_,i)=>shell(i/40,-.16,1)),welt,.0032,true);
}

function stuffed(parent,x,y,z,w,h,d,material,options){
  const pillow=new T.Group();
  pillow.position.set(x,y,z);parent.add(pillow);
  cushion(pillow,w,h,d,material,options);
  return pillow;
}

function cutPanel(parent,shape,material,depth,bevel){
  const g=new T.ExtrudeGeometry(shape,{depth,steps:1,curveSegments:16,bevelEnabled:true,
    bevelSegments:4,bevelThickness:bevel,bevelSize:bevel});
  const {uv,position}=g.attributes;
  for(let i=0;i<uv.count;i++)uv.setXY(i,.5+position.getX(i)*.83,position.getY(i)*1.29);
  const mesh=new T.Mesh(g,material);parent.add(mesh);return mesh;
}

function furnitureFoot(g,x,z,wood,height=.17){
  const s=Math.sign(x);
  sweep(g,[[x+s*.025,.011,z+.018],[x+s*.013,.047,z+.018],[x-s*.018,height*.58,z],
    [x+s*.005,height,z-.006]],[.027,.034,.026,.046],wood,{segments:14,sides:12,aspect:.91});
}

export function modelSettee(g,kit,width,fabric,pillows,style){
  const {furniture:f,group,oval}=kit;
  const leather=style==='chesterfield';
  const large=width>1.8;
  const wood=f[leather?'mahogany':'smoked-walnut'];
  const darkSeam=fabric.clone();
  darkSeam.color.multiplyScalar(leather?.59:.73);
  const tailored=style==='tailored';
  const front=.43,back=-.41;
  const bodyFront=tailored?.408:.421;
  for(const s of [-1,1])for(const z of [-.302,.301])furnitureFoot(g,s*(width*.5-.135),z,wood,tailored?.205:.175);
  stuffed(g,0,.290,.003,width-.07,.267,.817,fabric,{welt:darkSeam,shape:.27,crown:.16});
  seam(g,[[-width*.44,.209,bodyFront-.045],[-width*.28,.212,bodyFront],
    [0,.219,bodyFront+.004],[width*.28,.212,bodyFront],[width*.44,.209,bodyFront-.045]],darkSeam,.0043);
  const backHeight=leather?.843:tailored?.944:.927;
  const backPad=stuffed(g,0,backHeight-.235,back+.131,width-.105,.249,.52,fabric,
    {welt:darkSeam,shape:.30,crown:.17});
  backPad.rotation.x=1.39;
  for(const side of [-1,1]){
    const x=side*(width/2-.112);
    const panel=stuffed(g,x,.454,.008,.226,.477,.748,fabric,
      {shape:.34,welt:darkSeam,crown:.09});
    panel.rotation.z=-side*.072;
    const outer=tailored?.655:.692;
    sweep(g,[[x,-.016+outer,-.335],[x+side*.027,outer-.049,-.184],
      [x+side*.032,outer-.066,.085],[x+side*.029,outer-.063,.279],[x+side*.005,outer-.099,.350]],
    [.089,.099,.084,.105,.057],fabric,{segments:26,sides:16,aspect:1.08});
    const scroll=[
      [x+side*.011,outer-.104,.413],[x+side*.063,outer-.144,.408],
      [x+side*.065,outer-.194,.390],[x+side*.029,outer-.232,.378],
      [x-side*.017,outer-.216,.380],[x-side*.028,outer-.177,.397],
      [x-side*.003,outer-.159,.410],
    ];
    if(!tailored)seam(g,scroll,darkSeam,.004);
    const piping=[ [x+side*.049,.337,front-.04],[x+side*.077,.398,.409],
      [x+side*.069,.491,.423],[x+side*.048,.542,.404] ];
    seam(g,piping,darkSeam,.0035);
    if(leather)for(let i=0;i<8;i++){
      const a=i*Math.PI*.13;
      oval(g,x+Math.cos(a)*.075,.518+Math.sin(a)*.067,.412,.007,.007,.005,f['satin-brass']);
    }
  }
  const count=large?(tailored?2:3):1;
  const seatWidth=(width-.43)/count;
  for(let i=0;i<count;i++){
    const x=(i-(count-1)/2)*seatWidth;
    stuffed(g,x,.455,.093,seatWidth-.010,.166,.655,fabric,
      {shape:.30,phase:i*1.68,welt:darkSeam,crown:.21});
    if(!leather){
      const chairback=stuffed(g,x,.698,-.213,seatWidth-.001,.254,.443,fabric,
        {shape:.41,phase:i*.62,welt:darkSeam,crown:.12});
      chairback.rotation.x=1.36;
    }
  }
  if(leather){
    const buttons=[[.20,.34],[.40,.34],[.60,.34],[.80,.34],[.30,.68],[.50,.68],[.70,.68]];
    function backing(u,v){
      const x=(u-.5)*(width-.23)*(1-.08*v);
      const y=.521+v*.343+.024*Math.sin(u*Math.PI);
      const swell=(Math.sin(Math.PI*u)*Math.sin(Math.PI*v))**.37;
      let pinch=0;
      for(const [a,b] of buttons){
        const dx=(u-a)/.061,dv=(v-b)/.082;
        pinch+=.031*Math.exp(-(dx*dx+dv*dv));
      }
      return [x,y,-.237+.132*swell-pinch];
    }
    surface(g,38,48,(u,v)=>[...backing(u,v),u*1.5,v*.78],fabric,true);
    for(const [u,v] of buttons){
      const [x,y,z]=backing(u,v);
      oval(g,x,y,z+.002,.010,.010,.006,darkSeam);
    }
    seam(g,Array.from({length:25},(_,i)=>backing(i/24,.96)),darkSeam,.0033);
  }
  pillows.forEach((material,i)=>{
    const side=i%2?1:-1;
    const contrast=material.clone();contrast.color.multiplyScalar(.76);
    const pillow=stuffed(g,pillows.length===1?.065:side*(width/2-.385),.667,-.061,
      .365,.166,.365,material,{shape:.50,phase:i+1.3,crown:.21,welt:contrast});
    pillow.rotation.set(1.29,-side*.105,side*.16);
  });
  if(tailored&&large){
    const folds=group(g,-width*.27,.576,.175);
    const fabricThrow=f['ivory-damask'].clone();fabricThrow.side=T.DoubleSide;
    surface(folds,20,20,(u,v)=>{
      const wave=Math.sin(u*23+.8*v)*.012+Math.sin(u*54-v*5)*.003;
      const y=.016-Math.pow(Math.max(0,(v-.69)/.31),1.6)*.23+wave*(.4+.6*v);
      return [(u-.50)*(.327+v*.032),y,-.124+v*.410,u,v*1.5];
    },fabricThrow);
  }
}

export function modelSideChair(g,kit,fabric,desk=false){
  const {furniture:f}=kit;
  const wood=f[desk?'rosewood':'quarter-sawn-oak'];
  const polished=f[desk?'mahogany':'honey-oak'];
  const edge=fabric.clone();edge.color.multiplyScalar(.60);
  for(const s of [-1,1]){
    sweep(g,[[s*.177,.006,.189],[s*.161,.048,.188],[s*.162,.205,.176],
      [s*.193,.339,.183],[s*.199,.416,.163]],[.021,.027,.021,.035,.033],
    wood,{segments:21,sides:11,aspect:.83});
    sweep(g,[[s*.210,.005,-.216],[s*.185,.175,-.174],[s*.182,.399,-.156],
      [s*.173,.667,-.189],[s*.173,.867,-.221],[s*.159,.944,-.223]],
    [.020,.022,.034,.022,.022,.025],wood,{segments:27,sides:11,aspect:.85});
    sweep(g,[[s*.190,.393,-.176],[s*.221,.386,-.035],[s*.220,.381,.093],[s*.197,.396,.177]],
      [.031,.035,.036,.032],wood,{segments:14,sides:9,aspect:.80});
  }
  sweep(g,[[-.198,.395,.170],[-.121,.372,.198],[0,.362,.206],[.121,.372,.198],[.198,.395,.170]],
    [.032,.036,.045,.036,.032],wood,{segments:18,sides:10,aspect:.69});
  sweep(g,[[-.173,.429,-.164],[0,.414,-.182],[.173,.429,-.164]],
    [.027,.029,.027],wood,{segments:12,sides:8});
  stuffed(g,0,.448,.015,.466,.122,.437,fabric,{shape:.37,crown:.16,phase:desk?2.1:.6,welt:edge});
  const crest=[[-.175,.913,-.220],[-.125,.937,-.226],[0,.975,-.231],[.125,.937,-.226],[.175,.913,-.220]];
  sweep(g,crest,[.028,.035,.042,.035,.028],wood,{segments:22,sides:10,aspect:.66});
  seam(g,crest.map(([x,y,z])=>[x*.96,y+.008,z+.019]),polished,.004);
  sweep(g,[[-.167,.613,-.183],[0,.586,-.191],[.167,.613,-.183]],
    [.019,.025,.019],wood,{segments:16,sides:9,aspect:.75});
  if(desk){
    const back=stuffed(g,0,.748,-.181,.288,.083,.264,fabric,{shape:.47,phase:1.4,welt:edge});
    back.rotation.x=1.45;
  }else{
    for(const sign of [-1,1]){
      sweep(g,[[sign*.102,.606,-.184],[sign*.075,.685,-.189],[sign*.079,.782,-.211],
        [sign*.115,.911,-.221]],[.017,.024,.019,.020],wood,{segments:15,sides:10,aspect:.62});
    }
    sweep(g,[[0,.598,-.185],[0,.669,-.186],[.018,.740,-.195],[0,.836,-.216],[0,.938,-.233]],
      [.021,.037,.041,.031,.020],wood,{segments:21,sides:12,aspect:.67});
  }
}

function bedBoard(g,kit,wood,trim,panel,at,base,top,width,tall){
  const {lathe}=kit;
  const parent=new T.Group();parent.position.z=at;g.add(parent);
  const h=width/2;
  const arm=top-(tall?.243:.093);
  const outer=(inset=0)=>{
    const s=new T.Shape(),x=h-inset,y=base+inset;
    s.moveTo(-x,y);
    s.lineTo(-x,arm-.085);
    s.bezierCurveTo(-x,arm+.020,-x*.877,arm+.071,-x*.70,arm+.087);
    s.bezierCurveTo(-x*.39,arm+.11,-x*.26,top-inset,0,top-inset);
    s.bezierCurveTo(x*.26,top-inset,x*.39,arm+.11,x*.70,arm+.087);
    s.bezierCurveTo(x*.877,arm+.071,x,arm+.020,x,arm-.085);
    s.lineTo(x,y);s.quadraticCurveTo(0,y-.075,-x,y);
    return s;
  };
  const silhouette=outer();
  cutPanel(parent,silhouette,wood,.052,.016);
  const inner=cutPanel(parent,outer(tall?.088:.066),panel,.020,.019);
  inner.position.z=.055;
  const border=outer(tall?.067:.052).getPoints(13).map(p=>[p.x,p.y,.086]);
  seam(parent,border,trim,tall?.009:.006);
  const postHeight=arm+.017;
  for(const s of [-1,1]){
    lathe(parent,s*(h+.015),0,.025,[[0,0],[.022,0],[.026,.028],[.025,base*.68],
      [.043,base*.78],[.039,base],[.026,base+.060],[.023,postHeight-.083],
      [.032,postHeight-.060],[.046,postHeight-.025],[.042,postHeight+.003],[.020,postHeight+.029],
      [.010,postHeight+.038],[0,postHeight+.039]],wood,18);
  }
}

function hangingLinen(g,w,z0,z1,base,material,phase,hem){
  const cloth=material.clone();cloth.side=T.DoubleSide;
  function fabric(u,v){
    const sx=2*u-1, edge=T.MathUtils.smoothstep(Math.abs(sx),.867,1);
    const corner=T.MathUtils.smoothstep(v,.885,1);
    const x=sx*w/2+edge*Math.sin(v*21+phase)*.008;
    const z=T.MathUtils.lerp(z0,z1,v)+corner*Math.sin(u*26+phase)*.008;
    const soft=.014*Math.cos(sx*Math.PI*.5)*Math.sin(v*Math.PI);
    const crease=Math.sin(u*30+v*19+phase)*(.003+.014*edge)+Math.sin(u*61-v*15)*(.002+.005*corner);
    const y=base+soft+crease-.097*edge-.073*corner+.033*edge*corner;
    return [x,y,z];
  }
  surface(g,38,42,(u,v)=>[...fabric(u,v),u*1.55,v*(z1-z0)*1.7],cloth);
  const contour=[
    ...Array.from({length:12},(_,i)=>fabric(0,i/12)),
    ...Array.from({length:24},(_,i)=>fabric(i/24,1)),
    ...Array.from({length:13},(_,i)=>fabric(1,1-i/12)),
  ];
  seam(g,contour,hem,.003);
}

export function modelBed(g,kit,principal){
  const {furniture:f,oval}=kit;
  const wood=f[principal?'mahogany':'limed-ash'];
  const trim=f[principal?'rosewood':'honey-oak'];
  const head=f[principal?'forest-velvet':'taupe-pinstripe'];
  const sheet=f['cotton-percale'];
  const linen=f[principal?'sage-wool':'rose-linen'];
  const border=linen.clone();border.color.multiplyScalar(.78);
  for(const side of [-1,1]){
    const x=side*.827;
    sweep(g,[[x,.299,-1.011],[x+side*.014,.286,-.57],[x+side*.015,.272,0],
      [x+side*.006,.291,.56],[x,.315,1.014]],[.062,.074,.078,.069,.057],wood,
    {segments:24,sides:12,aspect:.69});
    seam(g,[[x+side*.047,.335,-.99],[x+side*.053,.331,-.42],[x+side*.052,.318,.31],
      [x+side*.045,.342,.995]],trim,.0054);
  }
  bedBoard(g,kit,wood,trim,head,-1.093,.276,principal?1.51:1.44,1.69,true);
  bedBoard(g,kit,wood,trim,f[principal?'burr-walnut':'honey-oak'],1.018,.248,.563,1.69,false);
  stuffed(g,0,.460,-.006,1.733,.264,2.057,sheet,
    {shape:.225,phase:3.1,welt:f['taupe-pinstripe'],crown:.035});
  hangingLinen(g,1.817,-.342,1.023,.628,linen,principal?.54:2.14,border);
  hangingLinen(g,1.83,.579,.980,.654,f[principal?'navy-windowpane':'sand-quilt'],.85,f['ivory-damask']);
  stuffed(g,0,.648,-.287,1.725,.066,.198,f['ivory-damask'],
    {shape:.26,crown:.02,phase:.85,welt:f['ivory-damask']});
  for(const side of [-1,1]){
    const pillow=stuffed(g,side*.430,.663,-.737,.703,.217,.422,
      principal?f['ivory-damask']:sheet,{shape:.45,phase:side*1.81,crown:.16,welt:sheet});
    pillow.rotation.set(.30,side*.054,side*.026);
    const accent=stuffed(g,side*.401,.708,-.480,.347,.136,.268,
      f[principal?'iberian-weave':'clay-jacquard'],{shape:.525,phase:side,crown:.20,welt:border});
    accent.rotation.set(.63,-side*.13,side*.11);
    if(principal)for(const [x,y] of [[.17,1.09],[.46,1.09],[.32,.94],[.61,.94]]){
      oval(g,side*x,y,-.991,.010,.010,.005,head);
    }
  }
}
