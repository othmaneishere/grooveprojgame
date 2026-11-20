import * as T from 'three';

// High mode composites subtle depth-based contact occlusion and highlight diffusion.
// The direct renderer is used on balanced/performance modes and on unsupported GPUs.
export function createImagePipeline(renderer,camera){
  const dimensions=new T.Vector2();
  const available=renderer.capabilities.isWebGL2 && renderer.extensions.has('EXT_color_buffer_float');
  let target=null,quadScene=null,material=null,composeCamera=null;
  function allocate(){
    if(target)return;
    target=new T.WebGLRenderTarget(1,1,{
      type:T.HalfFloatType,depthBuffer:true,stencilBuffer:false,
      minFilter:T.LinearFilter,magFilter:T.LinearFilter,
    });
    target.depthTexture=new T.DepthTexture(1,1,T.UnsignedIntType);
    target.depthTexture.minFilter=target.depthTexture.magFilter=T.NearestFilter;
    material=new T.ShaderMaterial({
      depthTest:false,depthWrite:false,
      uniforms:{
        image:{value:target.texture},depth:{value:target.depthTexture},
        inverseProjection:{value:camera.projectionMatrixInverse},size:{value:dimensions},
      },
      vertexShader:`
        varying vec2 coord;
        void main(){
          coord=uv;
          gl_Position=vec4(position.xy,0.0,1.0);
        }`,
      fragmentShader:`
        uniform sampler2D image;
        uniform sampler2D depth;
        uniform mat4 inverseProjection;
        uniform vec2 size;
        varying vec2 coord;
        vec3 viewPoint(vec2 uv,float d){
          vec4 p=inverseProjection*vec4(uv*2.0-1.0,d*2.0-1.0,1.0);
          return p.xyz/p.w;
        }
        float linearLuma(vec3 v){return dot(v,vec3(.2126,.7152,.0722));}
        vec3 highlights(vec2 uv){return max(texture2D(image,uv).rgb-vec3(1.15),0.0);}
        void main(){
          vec2 pixel=1.0/size;
          vec3 rgb=texture2D(image,coord).rgb;
          float d=texture2D(depth,coord).r;
          vec3 p=viewPoint(coord,d);
          vec3 gradient=cross(dFdx(p),dFdy(p));
          vec3 normal=gradient/max(length(gradient),1e-7);
          float contact=0.0;
          float dome=0.0;
          if(d<.9998){
            float radius=clamp(size.y*.19/max(1.2,-p.z),3.5,21.0);
            float phase=fract(dot(floor(gl_FragCoord.xy),vec2(.06711056,.00583715)))*6.2831853;
            for(int i=0;i<8;i++){
              float a=float(i)*2.39996323+phase;
              float r=(.33+.095*float(i))*radius;
              vec2 uv=clamp(coord+vec2(cos(a),sin(a))*r*pixel,pixel,vec2(1.0)-pixel);
              vec3 q=viewPoint(uv,texture2D(depth,uv).r);
              vec3 ray=q-p;
              float lengthToSample=max(.002,length(ray));
              float facing=max(0.0,dot(normal,ray/lengthToSample)-.11);
              contact+=facing*(1.0-smoothstep(.12,.50,lengthToSample));
            }
            dome=smoothstep(.25,2.85,contact)*.24;
          }
          vec3 blur=vec3(0.0);
          for(int i=0;i<8;i++){
            float a=float(i)*.785398;
            vec2 direction=vec2(cos(a),sin(a));
            blur+=highlights(coord+direction*pixel*(9.0+float(i)*.95))*.072;
          }
          vec3 left=texture2D(image,coord-vec2(pixel.x,0.0)).rgb;
          vec3 right=texture2D(image,coord+vec2(pixel.x,0.0)).rgb;
          vec3 up=texture2D(image,coord+vec2(0.0,pixel.y)).rgb;
          vec3 down=texture2D(image,coord-vec2(0.0,pixel.y)).rgb;
          float dx=abs(linearLuma(left)-linearLuma(right));
          float dy=abs(linearLuma(up)-linearLuma(down));
          float aa=smoothstep(.028,.20,max(dx,dy))*.24;
          rgb=mix(rgb,dx>dy?(left+right)*.5:(up+down)*.5,aa);
          gl_FragColor=vec4(rgb*(1.0-dome)+blur*.18,1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    quadScene=new T.Scene();
    quadScene.add(new T.Mesh(new T.PlaneGeometry(2,2),material));
    composeCamera=new T.OrthographicCamera(-1,1,1,-1,0,10);
  }
  return {
    render(scene,high){
      if(!high||!available){renderer.render(scene,camera);return;}
      allocate();
      renderer.getDrawingBufferSize(dimensions);
      if(target.width!==dimensions.x||target.height!==dimensions.y){
        target.setSize(dimensions.x,dimensions.y);
      }
      renderer.setRenderTarget(target);
      renderer.render(scene,camera);
      renderer.setRenderTarget(null);
      renderer.render(quadScene,composeCamera);
    },
  };
}
