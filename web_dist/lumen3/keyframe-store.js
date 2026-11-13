import * as T from 'three';
const copy=v=>JSON.parse(JSON.stringify(v));
export function interpolateKeyValue(a,b,t,field=''){
 if(t>=1)return copy(b);if(t<=0)return copy(a);
 if(typeof a==='number'&&typeof b==='number')return a+(b-a)*t;
 if(Array.isArray(a)&&Array.isArray(b)&&a.length===b.length){if(field==='quaternion'&&a.length===4)return new T.Quaternion().fromArray(a).normalize().slerp(new T.Quaternion().fromArray(b).normalize(),t).toArray();return a.map((v,i)=>interpolateKeyValue(v,b[i],t));}
 if(a&&b&&typeof a==='object'&&typeof b==='object'&&!Array.isArray(a)){const value={};for(const k of new Set([...Object.keys(a),...Object.keys(b)]))value[k]=a[k]===undefined?copy(b[k]):b[k]===undefined?copy(a[k]):interpolateKeyValue(a[k],b[k],t,k);return value;}
 return copy(a);
}
export class KeyframeStore{
 constructor(){this.channels=new Map();this.listeners=new Set();}
 subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}notify(){for(const fn of this.listeners)fn(this);}
 set(time,targets){if(!Number.isFinite(time)||time<0)throw new Error('关键帧时间无效');for(const target of targets){let channel=this.channels.get(target.id);if(!channel){channel={id:target.id,label:target.label,kind:target.kind,meta:copy(target.meta||{}),keys:[]};this.channels.set(target.id,channel);}const key={time_s:time,value:copy(target.value)},index=channel.keys.findIndex(k=>Math.abs(k.time_s-time)<1e-6);if(index>=0)channel.keys[index]=key;else channel.keys.push(key);channel.keys.sort((a,b)=>a.time_s-b.time_s);}this.notify();}
 remove(time,ids){let count=0;for(const id of ids){const channel=this.channels.get(id);if(!channel)continue;const before=channel.keys.length;channel.keys=channel.keys.filter(k=>Math.abs(k.time_s-time)>1e-6);count+=before-channel.keys.length;if(!channel.keys.length)this.channels.delete(id);}this.notify();return count;}
 sample(time){const result=[];for(const channel of this.channels.values()){const keys=channel.keys;if(!keys.length)continue;let value;if(time<=keys[0].time_s)value=copy(keys[0].value);else if(time>=keys.at(-1).time_s)value=copy(keys.at(-1).value);else{const right=keys.findIndex(k=>k.time_s>time),a=keys[right-1],b=keys[right];value=interpolateKeyValue(a.value,b.value,(time-a.time_s)/(b.time_s-a.time_s));}result.push({...channel,value});}return result;}
 times(ids=null){const allowed=ids?new Set(ids):null;return [...new Set([...this.channels.values()].filter(c=>!allowed||allowed.has(c.id)).flatMap(c=>c.keys.map(k=>k.time_s)))].sort((a,b)=>a-b);}
 save(){return{schema:'lumen.manual-keyframes/1.0',time_unit:'second',rotation:'local quaternion xyzw, shortest-path slerp',numeric_interpolation:'linear',discrete_interpolation:'hold',composition:'absolute keyed channels applied after imported animation',channels:copy([...this.channels.values()])};}
 load(data){const channels=data?.channels||[];if(!Array.isArray(channels)||channels.length>2000)throw new Error('关键帧通道数据无效');const valid=v=>typeof v==='number'?Number.isFinite(v):Array.isArray(v)?v.every(valid):v&&typeof v==='object'?Object.values(v).every(valid):typeof v==='string'||typeof v==='boolean'||v===null;const next=new Map();for(const channel of channels){if(typeof channel.id!=='string'||!Array.isArray(channel.keys)||channel.keys.length>10000||!channel.keys.every(k=>Number.isFinite(k.time_s)&&k.time_s>=0&&valid(k.value)))throw new Error('关键帧内容无效');const c=copy(channel);c.keys.sort((a,b)=>a.time_s-b.time_s);next.set(c.id,c);}this.channels=next;this.notify();}
}
