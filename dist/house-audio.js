import { LEVEL } from './layout.js';

const HZ=24000;
const TAU=2*Math.PI;
const clamp=(x,low,high)=>Math.max(low,Math.min(x,high));

function randomSource(seed){
  let state=seed>>>0 || 1;
  return ()=>{
    state^=state<<13;state^=state>>>17;state^=state<<5;
    return (state>>>0)/4294967296;
  };
}
const surfaces={
  stone:{bass:74,noise:.60,body:.24,snap:.54,tail:.038},
  tile:{bass:104,noise:.68,body:.23,snap:.63,tail:.033},
  wood:{bass:113,noise:.46,body:.47,snap:.37,tail:.057},
  stair:{bass:95,noise:.40,body:.59,snap:.33,tail:.070},
  carpet:{bass:57,noise:.31,body:.53,snap:.053,tail:.044},
  'stair-runner':{bass:68,noise:.28,body:.65,snap:.081,tail:.054},
};

function envelope(t,attack,decay){
  return t<0?0:(1-Math.exp(-t/attack))*Math.exp(-t/decay);
}

export function synthesize(kind, seed=1, rate=HZ){
  const random=randomSource(seed);
  const durations={hinge:.90,latch:.26,handle:.21,switch:.14,drawer:.49,fire:7.1,wind:10,
    tick:.15,clock:.31,wick:.19,page:.43,ceramic:.23,water:4.2,chair:.72,creak:.43,
    'toilet-water':2.6,strike:.34};
  const surface=surfaces[kind];
  const duration=surface ? .24 : (durations[kind]??.22);
  const looping=kind==='fire'||kind==='wind'||kind==='water';
  const samples=Math.ceil(rate*duration);
  const overlap=looping?Math.ceil(rate*.22):0;
  const wave=new Float32Array(samples+overlap);
  let low=0,deep=0,phase=0,pop=0;
  for(let i=0;i<wave.length;i++){
    const t=i/rate;
    const noise=random()*2-1;
    low+=.10*(noise-low);
    deep+=.009*(noise-deep);
    let sample;
    if(surface){
      const t2=t-(.075+(seed%7)*.004);
      const hit=envelope(t,.0035,surface.tail);
      const toe=envelope(t2,.006,surface.tail*.79);
      phase+=TAU*(surface.bass+(seed%13)-t*87)/rate;
      const body=Math.sin(phase)*.75+Math.sin(phase*1.81)*.14;
      const crack=envelope(t,.0007,surface.tail*.33)*(noise-low*.62);
      sample=((hit+toe*.58)*(body*surface.body+low*surface.noise)+crack*surface.snap)*.64;
    }else switch(kind){
      case 'hinge':{
        const movement=Math.sin(Math.PI*t/duration)**1.5;
        phase+=TAU*(173+32*Math.sin(t*11)+14*low)/rate;
        sample=movement*((Math.sin(phase)*.20+Math.sin(phase*2.63)*.06)*(1+.25*Math.sin(29*t))+low*.13);
        break;
      }
      case 'latch':
        sample=envelope(t,.001,.054)*(low*.40+Math.sin(TAU*94*t)*.43)+
          envelope(t-.033,.0008,.027)*(noise*.34+Math.sin(TAU*408*t)*.16);
        break;
      case 'handle':
        sample=envelope(t,.001,.030)*(noise*.21+Math.sin(TAU*530*t)*.21)+
          envelope(t-.079,.005,.039)*(low*.22+Math.sin(TAU*334*t)*.18);
        break;
      case 'drawer':
        sample=envelope(t,.024,.13)*(low*.63+Math.sin(TAU*54*t)*.13)+
          envelope(t-.32,.006,.044)*(deep*.7+Math.sin(TAU*79*t)*.27);
        break;
      case 'chair':{
        phase+=TAU*(82+Math.sin(t*12)*14+low*11)/rate;
        const skid=(.61+.39*Math.sin(t*35)**2)*envelope(t,.035,.126);
        sample=skid*(low*.46+noise*.12+Math.sin(phase)*.26)+
          envelope(t-.41,.004,.028)*(deep*.60+Math.sin(phase*.63)*.23);
        break;
      }
      case 'creak':{
        phase+=TAU*(122-95*t+14*Math.sin(t*8.4)+9*low)/rate;
        const grain=Math.sin(phase)*.24+Math.sin(phase*2.37)*.08;
        sample=envelope(t,.014,.094)*(grain+low*.30)*(1-.28*Math.sin(50*t)**2);
        break;
      }
      case 'fire':
        if(random()<.00076)pop=.25+random()*.62;
        pop*=.994;
        sample=deep*.31+low*.013+(noise*.49+low*.51)*pop;
        break;
      case 'wind':{
        const drift=.67+.18*Math.sin(TAU*t/duration)+.12*Math.sin(TAU*3*t/duration+1.4);
        sample=drift*(deep*.69+low*.05);
        break;
      }
      case 'water':
      case 'toilet-water':{
        const bubble=.66+.21*Math.sin(t*17.73+deep*12)+.075*Math.sin(t*31.64);
        sample=(noise-low*.73)*bubble*.14+low*.21+deep*.11;
        if(kind==='toilet-water')sample*=Math.min(1,t*10,(duration-t)*5);
        break;
      }
      case 'strike':
        sample=envelope(t,.0015,.034)*(noise*.61+low*.22)+
          envelope(t-.078,.007,.042)*(noise*.14+low*.30);
        break;
      case 'tick':
        sample=envelope(t,.0006,.017)*(noise*.23+Math.sin(TAU*(seed%2?1055:809)*t)*.31);
        break;
      case 'clock':
        sample=envelope(t,.002,.057)*(Math.sin(TAU*(392+seed*.54)*t)*.37+Math.sin(TAU*(872+seed*1.21)*t)*.14)+
          envelope(t-.080,.002,.072)*(Math.sin(TAU*(523+seed*.67)*t)*.29);
        break;
      case 'wick':
        sample=envelope(t,.009,.047)*(noise*.16+low*.72);
        break;
      case 'page':{
        const flutter=.55+.45*Math.sin(t*51)**2;
        sample=flutter*envelope(t,.043,.084)*(noise*.24+low*.38)+envelope(t-.22,.003,.033)*low*.35;
        break;
      }
      case 'ceramic':
        sample=envelope(t,.001,.043)*(Math.sin(TAU*1086*t)*.26+Math.sin(TAU*1533*t)*.11+noise*.16);
        break;
      default:
        sample=envelope(t,.0007,.023)*(noise*.26+Math.sin(TAU*180*t)*.46)+
          envelope(t-.026,.001,.024)*(noise*.14+Math.sin(TAU*271*t)*.15);
    }
    const edge=looping?1:Math.min(1,t/.007,(duration-t)/.033);
    wave[i]=clamp(sample*edge,-.97,.97);
  }
  if(!looping)return wave;
  const loop=wave.slice(0,samples);
  for(let i=0;i<overlap;i++){
    const blend=.5-.5*Math.cos(Math.PI*i/overlap);
    loop[i]=wave[samples+i]*(1-blend)+wave[i]*blend;
  }
  return loop;
}

function bufferFrom(context,data){
  const buffer=context.createBuffer(1,data.length,HZ);
  if(buffer.copyToChannel)buffer.copyToChannel(data,0);
  else buffer.getChannelData(0).set(data);
  return buffer;
}

function roomResponse(context){
  const seconds=1.27, length=Math.floor(context.sampleRate*seconds);
  const buffer=context.createBuffer(2,length,context.sampleRate);
  const random=randomSource(20912);
  for(let side=0;side<2;side++){
    const samples=buffer.getChannelData(side);
    let color=0;
    for(let i=0;i<length;i++){
      const t=i/context.sampleRate;
      color+=.19*(random()*2-1-color);
      samples[i]=t>.026?color*Math.exp(-t*4.9)*.19:0;
    }
    for(const [delay,amplitude] of [[.014,.19],[.027,.13],[.041,.103],[.058,.078],[.081,.043]]){
      samples[Math.floor((delay+side*.0018)*context.sampleRate)]+=amplitude;
    }
  }
  return buffer;
}

export class HouseAudio {
  constructor(volume=.58){
    this.volume=volume;
    this.active=false;
    this.context=null;
    this.buffers=new Map();
    this.ambiences=[];
    this.emitters=[];
    this.variant=0;
    this.nextTick=0;
    this.pauseTimer=0;
    this.stairSteps=0;
    this.impactData=fetch(new URL('./assets/audio/blackout-impact.mp3',import.meta.url))
      .then(response=>{
        if(!response.ok)throw new Error('Blackout effect failed to load');
        return response.arrayBuffer();
      }).catch(()=>null);
  }
  unlock(){
    if(this.context){this.context.resume().catch(()=>{});return;}
    const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;
    if(!Audio)return;
    const context=new Audio({latencyHint:'interactive'});
    this.context=context;
    this.impact=this.impactData.then(data=>data?context.decodeAudioData(data):null).catch(()=>null);
    this.output=context.createGain();
    this.output.gain.value=0;
    const compressor=context.createDynamicsCompressor();
    compressor.threshold.value=-11;
    compressor.knee.value=12;
    compressor.ratio.value=2;
    this.output.connect(compressor).connect(context.destination);
    this.wet=context.createGain();
    this.wet.gain.value=.17;
    const reverb=context.createConvolver();
    reverb.buffer=roomResponse(context);
    this.wet.connect(reverb).connect(this.output);
    const outdoor=[
      {kind:'wind',position:[.04,1.8,-5.95],volume:.15,room:'Entrance hall'},
      {kind:'wind',position:[7.08,LEVEL+2.0,-3.62],volume:.12,room:'Bathroom'},
    ];
    for(const source of [...this.emitters,...outdoor])if(source.kind!=='tick')this.startAmbience(source);
    context.resume().catch(()=>{});
    this.fade();
  }
  setActive(active){
    this.active=active;
    clearTimeout(this.pauseTimer);
    this.fade();
    if(!this.context)return;
    if(active&&this.context.state==='suspended')this.context.resume().catch(()=>{});
    if(!active){
      this.pauseTimer=setTimeout(()=>{
        if(!this.active&&this.context.state==='running')this.context.suspend().catch(()=>{});
      },340);
    }
  }
  setVolume(volume){this.volume=clamp(volume,0,1);this.fade();}
  fade(){
    if(this.context)this.output.gain.setTargetAtTime(this.active?this.volume*.80:0,this.context.currentTime,.10);
  }
  sample(kind,seed){
    const key=kind+'-'+seed;
    if(!this.buffers.has(key))this.buffers.set(key,bufferFrom(this.context,synthesize(kind,seed)));
    return this.buffers.get(key);
  }
  panner(position){
    const node=this.context.createPanner();
    node.panningModel='equalpower';node.distanceModel='inverse';
    node.refDistance=1.24;node.maxDistance=14;node.rolloffFactor=1.48;
    if(node.positionX)[node.positionX.value,node.positionY.value,node.positionZ.value]=position;
    else node.setPosition(...position);
    return node;
  }
  startAmbience(emitter){
    const {kind,position,volume}=emitter;
    const context=this.context;
    const source=context.createBufferSource();
    source.buffer=this.sample(kind,this.ambiences.length+304);
    source.loop=true;
    const low=context.createBiquadFilter();
    low.type='lowpass';low.frequency.value=1700;
    const gain=context.createGain();gain.gain.value=0;
    source.connect(low).connect(gain).connect(this.panner(position)).connect(this.output);
    source.start(0,this.ambiences.length*.48);
    this.ambiences.push({...emitter,low,gain,volume});
  }
  event(kind,position,volume=.42,pan=0){
    const context=this.context;
    if(!context||!this.active||!this.volume)return;
    const seed=1+(this.variant++%8);
    const sound=context.createBufferSource();
    sound.buffer=this.sample(kind,seed);
    sound.playbackRate.value=.94+(seed%7)*.018;
    const gain=context.createGain();gain.gain.value=volume;
    const spatial=position?this.panner(position):
      context.createStereoPanner?context.createStereoPanner():context.createGain();
    if(!position&&spatial.pan)spatial.pan.value=pan;
    sound.connect(gain).connect(spatial);
    spatial.connect(this.output);spatial.connect(this.wet);
    sound.onended=()=>{sound.disconnect();gain.disconnect();spatial.disconnect();};
    sound.start();
  }
  impactHit(){
    if(!this.context || !this.impact)return;
    this.impact.then(buffer=>{
      if(!buffer||!this.active||!this.volume)return;
      this.impactSource?.stop();
      const source=this.context.createBufferSource(),gain=this.context.createGain();
      source.buffer=buffer;gain.gain.value=3.0;
      source.connect(gain).connect(this.output);
      this.impactSource=source;
      source.onended=()=>{
        if(this.impactSource===source)this.impactSource=null;
        source.disconnect();gain.disconnect();
      };
      source.start();
    });
  }
  footstep(surface,left,effort){
    this.event(surface,null,.48*clamp(effort,.20,1.24),left?-.13:.13);
    if(surface.startsWith('stair')&&++this.stairSteps%5===0)this.event('creak',null,.14,left?-.16:.16);
  }
  update(position,direction,room,occlusion){
    const context=this.context;
    if(!context||!this.active)return;
    const now=context.currentTime;
    const listener=context.listener;
    if(listener.positionX){
      for(const [param,value] of [[listener.positionX,position.x],[listener.positionY,position.y],
        [listener.positionZ,position.z],[listener.forwardX,direction.x],[listener.forwardY,direction.y],
        [listener.forwardZ,direction.z],[listener.upY,1]])param.setTargetAtTime(value,now,.035);
    }else{
      listener.setPosition(position.x,position.y,position.z);
      listener.setOrientation(direction.x,direction.y,direction.z,0,1,0);
    }
    this.wet.gain.setTargetAtTime(room==='Bathroom'||room==='Kitchen'?.30:room.includes('hall')?.23:.16,now,.18);
    for(const item of this.ambiences){
      const distance=Math.hypot(item.position[0]-position.x,item.position[1]-position.y,item.position[2]-position.z);
      const hidden=distance>8||occlusion(item.position);
      const audible=distance<12&&(item.enabled?.()??true);
      item.gain.gain.setTargetAtTime(audible?item.volume*(hidden?.15:1):0,now,.15);
      item.low.frequency.setTargetAtTime(hidden?510:4200,now,.15);
    }
    if(now>=this.nextTick){
      this.nextTick=now+1;
      for(const emitter of this.emitters){
        if(emitter.kind==='tick'&&emitter.room===room)this.event('tick',emitter.position,.21);
      }
    }
  }
}
