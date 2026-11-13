export class SharedTimeline{
 constructor(){this.time=0;this.fps=24;this.start=0;this.end=120;this.loop=true;this.playing=false;this.tracks=new Map();this.listeners=new Set();this.afterSamples=new Set();this.last=null;this.autoRange=true;}
 get secondsStart(){return this.start/this.fps;}get secondsEnd(){return this.end/this.fps;}
 subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}notify(){for(const fn of this.listeners)fn(this);}
 register(id,track){const prior=this.tracks.get(id)||this.pendingTracks?.[id]||{};this.tracks.set(id,{enabled:prior.enabled!==false,offset:prior.offset??prior.offset_s??0,...track});if(this.autoRange)this.fit();this.seek(this.time);return()=>{this.tracks.delete(id);this.notify();};}
 fit(){const duration=Math.max(this.keyEnd?.()||0,...[...this.tracks.values()].map(t=>t.duration+(t.offset||0)));this.start=0;this.end=Math.max(1,Math.ceil((duration||5)*this.fps));}
 evaluate(){if(this.suspended)return;for(const[,track]of [...this.tracks].sort(([a],[b])=>(a==='camera'?1:0)-(b==='camera'?1:0)))if(track.enabled)track.sample(Math.max(0,Math.min(track.duration, this.time-(track.offset||0))),this.time);for(const sample of this.afterSamples)sample(this.time);}
 seek(seconds){this.time=Math.max(this.secondsStart,Math.min(this.secondsEnd,Number(seconds)||0));this.evaluate();this.notify();}
 play(){this.playing=!this.playing;if(this.playing&&this.time>=this.secondsEnd)this.seek(this.secondsStart);this.last=null;this.notify();}
 pause(){this.playing=false;this.last=null;this.notify();}
 tick(now){const previous=this.last;this.last=now;if(!this.playing||previous===null)return;let next=this.time+Math.max(0,(now-previous)/1000);if(next>this.secondsEnd){const span=this.secondsEnd-this.secondsStart;if(this.loop&&span>0)next=this.secondsStart+(next-this.secondsStart)%span;else{next=this.secondsEnd;this.playing=false;}}this.seek(next);}
 save(){return{time_s:this.time,fps:this.fps,start_frame:this.start,end_frame:this.end,loop:this.loop,auto_range:this.autoRange,tracks:Object.fromEntries([...this.tracks].map(([id,t])=>[id,{enabled:t.enabled,offset_s:t.offset||0}]))};}
 load(data){if(!data)return;this.pause();if([24,25,30,48,50,60].includes(data.fps))this.fps=data.fps;if(Number.isFinite(data.start_frame))this.start=Math.max(0,data.start_frame);if(Number.isFinite(data.end_frame))this.end=Math.max(this.start+1,data.end_frame);this.loop=data.loop!==false;this.autoRange=data.auto_range!==false;this.pendingTracks=data.tracks||{};for(const[id,v]of Object.entries(this.pendingTracks)){const t=this.tracks.get(id);if(t){t.enabled=v.enabled!==false;t.offset=Number.isFinite(v.offset_s)?v.offset_s:0;}}this.seek(data.time_s);}
}
export const timeline=new SharedTimeline();
export function sampleMixer(mixer,action,time){action.enabled=true;action.paused=false;mixer.setTime(time);mixer.getRoot().updateMatrixWorld(true);}
