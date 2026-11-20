import * as T from 'three';

const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));

// R estimates local relief and G holds material-specific roughness.
// Local contrast keeps painted patterns from turning into deep grooves.
export function surfaceChannels(image,width,height,{roughness,grain=1,contrast=.10}){
  const luma=new Float32Array(width*height);
  for(let i=0;i<luma.length;i++){
    luma[i]=(image[i*4]*.2126+image[i*4+1]*.7152+image[i*4+2]*.0722)/255;
  }
  const pick=(x,y)=>luma[clamp(y,0,height-1)*width+clamp(x,0,width-1)];
  const data=new Uint8Array(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const center=luma[y*width+x];
    const local=(pick(x-2,y)+pick(x+2,y)+pick(x,y-2)+pick(x,y+2)+
      2*(pick(x-1,y)+pick(x+1,y)+pick(x,y-1)+pick(x,y+1)))/12;
    const detail=center-local;
    const grainHeight=clamp(detail*grain,-.32,.32);
    const finish=clamp(roughness+(local-.50)*contrast+Math.abs(detail)*contrast*.9,.14,.98);
    const j=((height-y-1)*width+x)*4;
    data[j]=Math.round((.50+grainHeight)*255);
    data[j+1]=Math.round(finish*255);
    data[j+2]=255;data[j+3]=255;
  }
  return data;
}

export function createSurfaceDetails(){
  const size=128;
  const canvas=Object.assign(document.createElement('canvas'),{width:size,height:size});
  const context=canvas.getContext('2d',{willReadFrequently:true});
  const cache=new Map();
  return function detail(map,settings){
    if(!map?.image || !context?.getImageData)return null;
    const key=map.uuid+':'+[settings.roughness,settings.grain,settings.contrast].join(':');
    if(cache.has(key))return cache.get(key);
    context.drawImage(map.image,0,0,size,size);
    const source=context.getImageData(0,0,size,size).data;
    const data=surfaceChannels(source,size,size,settings);
    const surface=new T.DataTexture(data,size,size,T.RGBAFormat);
    surface.wrapS=map.wrapS;surface.wrapT=map.wrapT;
    surface.minFilter=T.LinearMipmapLinearFilter;
    surface.magFilter=T.LinearFilter;
    surface.generateMipmaps=true;
    surface.anisotropy=Math.min(4,map.anisotropy);
    surface.needsUpdate=true;
    cache.set(key,surface);
    return surface;
  };
}
