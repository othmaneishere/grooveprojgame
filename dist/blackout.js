import * as T from 'three';

export function createBlackoutState(){
  const state={power:true,seated:false,collected:false,lit:false};
  const reset=()=>Object.assign(state,{power:true,seated:false,collected:false,lit:false});
  return {state,reset,
    sit(){if(state.seated)return false;state.seated=true;const first=state.power;state.power=false;return first;},
    stand(){state.seated=false;},
    collect(){if(state.collected)return false;state.collected=true;return true;},
    toggle(){if(!state.collected)return false;state.lit=!state.lit;return state.lit;},
  };
}

function rounded(w,h,d,r){
  const s=new T.Shape(),x=w/2,y=h/2;
  s.moveTo(-x+r,-y);s.lineTo(x-r,-y);s.quadraticCurveTo(x,-y,x,-y+r);
  s.lineTo(x,y-r);s.quadraticCurveTo(x,y,x-r,y);s.lineTo(-x+r,y);
  s.quadraticCurveTo(-x,y,-x,y-r);s.lineTo(-x,-y+r);s.quadraticCurveTo(-x,-y,-x+r,-y);
  const g=new T.ExtrudeGeometry(s,{depth:d-.002,steps:1,curveSegments:8,bevelEnabled:true,
    bevelSize:.001,bevelThickness:.001,bevelSegments:2});
  g.translate(0,0,-(d-.002)*.5);
  for(let i=0;i<g.attributes.uv.count;i++){
    const p=g.attributes.position;
    g.attributes.uv.setXY(i,.5+p.getX(i)*23,.5+p.getY(i)*13);
  }
  return g;
}

export function lighterModel(brass){
  const model=new T.Group(),lid=new T.Group(),flameRoot=new T.Group();
  const steel=new T.MeshStandardMaterial({color:0x858783,roughness:.27,metalness:.81,envMapIntensity:.88});
  const dark=new T.MeshStandardMaterial({color:0x24231e,roughness:.59});
  const nickel=brass.clone();
  nickel.color.set(0xc5c0ae);
  function add(parent,geometry,material,x,y,z){
    const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);parent.add(mesh);return mesh;
  }
  add(model,rounded(.040,.047,.019,.005),nickel,0,.024,0);
  add(model,rounded(.034,.018,.013,.002),steel,0,.051,0);
  add(model,rounded(.037,.002,.018,.001),dark,0,.046,0);
  lid.position.set(-.020,.047,0);
  model.add(lid);
  add(lid,rounded(.039,.018,.019,.004),nickel,.020,.010,0);
  const hinge=add(model,new T.CylinderGeometry(.0025,.0025,.012,12),steel,-.020,.047,0);
  hinge.rotation.x=Math.PI/2;
  for(const side of [-1,1])for(let i=0;i<4;i++){
    add(model,new T.CircleGeometry(.00165,12),dark,-.010+i*.006,.056,side*.00755).rotation.y=side===1?0:Math.PI;
  }
  const wheel=add(model,new T.CylinderGeometry(.0045,.0045,.0065,20),steel,.013,.063,0);
  wheel.rotation.x=Math.PI/2;
  for(let i=0;i<13;i++){
    const a=i*Math.PI*2/13;
    const ridged=add(model,new T.BoxGeometry(.00065,.0007,.0075),dark,.013+Math.cos(a)*.0044,.063+Math.sin(a)*.0044,0);
    ridged.rotation.z=a;
  }
  add(model,new T.CylinderGeometry(.0011,.00135,.006,10),dark,-.003,.063,0);
  const fire=new T.ShaderMaterial({
    transparent:true,depthWrite:false,side:T.DoubleSide,
    uniforms:{time:{value:0}},
    vertexShader:`varying vec2 point; void main(){point=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`
      varying vec2 point; uniform float time;
      void main(){
        float y=point.y;
        float center=.5+.20*y*sin(y*5.0-time*4.2)+.046*y*sin(time*11.0);
        float height=.87+.075*sin(time*13.0)+.036*cos(time*9.0);
        float width=(.33-.28*y)*(.79+.21*sin(y*3.14));
        float shape=(1.0-smoothstep(width*.22,width,abs(point.x-center)))*(1.0-smoothstep(height-.19,height,y))*smoothstep(0.0,.055,y);
        vec3 warm=mix(vec3(2.5,.42,.037),vec3(2.1,1.65,.77),1.0-y);
        vec3 hue=mix(vec3(.29,.60,2.5),warm,smoothstep(.08,.21,y));
        gl_FragColor=vec4(hue,shape*.94);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  for(const yaw of [0,Math.PI/2]){
    const plane=add(flameRoot,new T.PlaneGeometry(.033,.062),fire,0,.031,0);
    plane.rotation.y=yaw;
  }
  flameRoot.position.set(-.003,.065,0);flameRoot.visible=false;
  model.add(flameRoot);
  model.userData.update=(dt,active,steady)=>{
    lid.rotation.z=T.MathUtils.damp(lid.rotation.z,active?1.84:0,20,dt);
    flameRoot.visible=active;
    if(!steady)fire.uniforms.time.value+=dt;
  };
  return model;
}
