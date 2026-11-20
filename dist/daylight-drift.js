import * as T from 'three';

export function createDaylightDrift(scene){
  const count=44;
  const positions=new Float32Array(count*3);
  const seeds=new Float32Array(count);
  let seed=7412;
  const random=()=>((seed=Math.imul(1664525,seed)+1013904223>>>0)/4294967296);
  for(let i=0;i<count;i++){
    positions[i*3]=(random()-.5)*1.34;
    positions[i*3+1]=(random()-.5)*.92;
    positions[i*3+2]=(random()-.5)*1.66;
    seeds[i]=random();
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.BufferAttribute(positions,3));
  geometry.setAttribute('drift',new T.BufferAttribute(seeds,1));
  const material=new T.ShaderMaterial({
    uniforms:{elapsed:{value:0},strength:{value:0},densityScale:{value:1}},
    vertexShader:`
      attribute float drift;
      uniform float elapsed;
      uniform float strength;
      uniform float densityScale;
      varying float glow;
      void main(){
        float phase=elapsed;
        vec3 offset=vec3(sin(phase*.12+drift*29.0)*.074,
          sin(phase*.37+drift*40.0)*.065,
          cos(phase*.18+drift*33.0)*.085);
        vec4 p=modelViewMatrix*vec4(position+offset,1.0);
        glow=strength*(.37+.63*drift)*smoothstep(.25,1.15,-p.z);
        gl_PointSize=clamp(densityScale*(2.3+drift*1.8)/max(.5,-p.z),1.0,4.8);
        gl_Position=projectionMatrix*p;
      }`,
    fragmentShader:`
      varying float glow;
      void main(){
        vec2 uv=gl_PointCoord*2.0-1.0;
        float falloff=exp(-5.7*dot(uv,uv));
        gl_FragColor=vec4(.86,.77,.61,falloff*glow);
        #include <colorspace_fragment>
      }`,
    transparent:true,depthWrite:false,
  });
  const points=new T.Points(geometry,material);
  points.renderOrder=20;
  scene.add(points);
  let elapsed=0,level=0,key='';
  return (dt,window,allowed,day,scale,snap)=>{
    elapsed=(elapsed+dt)%420;
    const next=allowed&&day>.5?.143:0;
    if(key!==window.key){
      key=window.key;
      const [x,y,z]=window.position;
      const [tx,ty,tz]=window.target;
      points.position.set(x+(tx-x)*.39,y+(ty-y)*.36,z+(tz-z)*.39);
      points.rotation.y=Math.atan2(tx-x,tz-z);
      level=snap?next:0;
    }
    level=T.MathUtils.lerp(level,next,snap?1:1-Math.exp(-dt*5.4));
    points.visible=level>.007;
    material.uniforms.elapsed.value=elapsed;
    material.uniforms.strength.value=level;
    material.uniforms.densityScale.value=scale;
  };
}
