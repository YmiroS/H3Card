// Equivalent-light fit to an image-space diffuse dome, not inverse rendering.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const percentile=(a,p)=>a.slice().sort((x,y)=>x-y)[Math.floor((a.length-1)*p)]||0;
const rad=d=>d*Math.PI/180;
const dir=(az,el)=>[Math.sin(rad(az))*Math.cos(rad(el)),Math.sin(rad(el)),Math.cos(rad(az))*Math.cos(rad(el))];
const dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0);
const srgb=v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
function temperature(rgb){
  const max=Math.max(...rgb,.0001),c=rgb.map(x=>x/max);let best=6500,error=Infinity;
  for(let k=2000;k<=12000;k+=100){const t=k/100,ref=[t<=66?255:329.7*(t-60)**-.1332,t<=66?99.47*Math.log(t)-161.12:288.12*(t-60)**-.0755,t>=66?255:t<=19?0:138.52*Math.log(t-10)-305.04].map(v=>srgb(clamp(v,0,255)/255));const err=c.reduce((n,v,i)=>n+(v-ref[i])**2,0);if(err<error){best=k;error=err;}}
  return best;
}
function fit(samples,columns){
  const coeff=columns.map(()=>0),pred=new Float64Array(samples.length);
  for(let pass=0;pass<24;pass++)for(let j=0;j<columns.length;j++){let num=0,den=1e-8;const col=columns[j];for(let i=0;i<samples.length;i++){num+=col[i]*(samples[i].value-pred[i]+coeff[j]*col[i]);den+=col[i]*col[i];}const next=Math.max(0,num/den),delta=next-coeff[j];for(let i=0;i<samples.length;i++)pred[i]+=delta*col[i];coeff[j]=next;}
  let loss=0;for(let i=0;i<samples.length;i++)loss+=(samples[i].value-pred[i])**2;
  return {coeff,loss:loss/samples.length};
}
export function analyzeLighting({data,width,height},roi={x:.15,y:.1,w:.7,h:.8}){
  const samples=[],edge=Array.from({length:16},()=>({outer:[],inner:[]}));
  const get=(u,v)=>{const x=clamp(Math.round(u*(width-1)),0,width-1),y=clamp(Math.round(v*(height-1)),0,height-1),i=(y*width+x)*4;return [data[i],data[i+1],data[i+2]].map(v=>srgb(v/255));};
  for(let y=0;y<40;y++)for(let x=0;x<40;x++){const nx=(x+.5)/20-1,ny=1-(y+.5)/20,r=Math.hypot(nx,ny);if(r>.97)continue;const rgb=get(roi.x+(nx+1)*roi.w/2,roi.y+(1-ny)*roi.h/2),value=dot(rgb,[.2126,.7152,.0722]);const bin=Math.floor(((Math.atan2(ny,nx)+2*Math.PI)%(2*Math.PI))/(2*Math.PI)*16);if(r>.82)edge[bin].outer.push(value);if(r>.55&&r<.75)edge[bin].inner.push(value);if(r<.86)samples.push({normal:[nx,ny,Math.sqrt(1-r*r)],value,rgb});}
  const vals=samples.map(s=>s.value),lo=percentile(vals,.05),hi=percentile(vals,.95),contrast=(hi-lo)/Math.max(hi,.001);
  const valid=samples.filter(s=>s.value<=hi&&s.value>=lo);
  if(valid.length<100||hi<.008)throw new Error('分析区域过暗或有效像素不足，请调整取样区域。');
  // Winsorized luminance, uncalibrated material and camera exposure retained.
  for(const p of valid)p.value/=Math.max(hi,.001);
  const ambient=Float64Array.from(valid,()=>1),base=fit(valid,[ambient]);
  const candidates=[];for(let az=-75;az<=75;az+=15)for(let el=-15;el<=75;el+=15){const direction=dir(az,el);candidates.push({az,el,direction,column:Float64Array.from(valid,s=>Math.max(0,dot(s.normal,direction)))});}
  let key=null;for(const c of candidates){const f=fit(valid,[ambient,c.column]);if(!key||f.loss<key.loss)key={...c,...f};}
  const keyGain=(base.loss-key.loss)/Math.max(base.loss,.00001),keyDetected=contrast>.07&&keyGain>.06&&key.coeff[1]>.06;
  let fill=null;for(const c of candidates){if(dot(c.direction,key.direction)>.5)continue;const f=fit(valid,[ambient,key.column,c.column]);if(!fill||f.loss<fill.loss)fill={...c,...f};}
  const fillGain=fill?(key.loss-fill.loss)/Math.max(key.loss,.00001):0,fillDetected=keyDetected&&fill&&fillGain>.08&&fill.coeff[2]>.07&&fill.coeff[2]<fill.coeff[1]*1.3;
  const solution=fillDetected?fill:key,weightedColor=column=>{const sum=[0,0,0];let total=0;valid.forEach((s,i)=>{const w=column[i]*s.value;total+=w;s.rgb.forEach((v,k)=>sum[k]+=v*w);});return sum.map(v=>v/Math.max(total,.001));};
  let rimBin=-1,rimContrast=0;edge.forEach((bin,i)=>{if(bin.outer.length<5||bin.inner.length<5)return;const diff=(percentile(bin.outer,.6)-percentile(bin.inner,.6))/Math.max(hi,.01);if(diff>rimContrast){rimContrast=diff;rimBin=i;}});
  const rimDetected=contrast>.1&&rimContrast>.22,rimTheta=(rimBin+.5)/16*Math.PI*2;
  const rimDir=rimBin>=0?[Math.cos(rimTheta)*.8,Math.sin(rimTheta)*.8,-.6]:[.6,.5,-.6];const norm=Math.hypot(...rimDir);const rim= rimDir.map(v=>v/norm);
  const confidence=(detected,gain)=>!detected?'未检出':gain>.45?'中（模型内线索）':'低（需人工核对）';
  const make=(id,detected,direction,power,kelvin,evidence,gain)=>({id,detected,direction_camera:direction,power:detected?Math.round(power):0,kelvin,size:id==='fill'?2:id==='rim'?1:1.5,confidence:confidence(detected,gain),evidence,distance_identifiable:false,size_identifiable:false,color_confidence:'低：材质、白平衡与曝光未分离',angle_uncertainty_deg:id==='rim'?60:45});
  return {schema:'lumen.equivalent-light-analysis/1.0',method:'robust_luminance_nonnegative_two_lobe_diffuse_dome_plus_edge_contrast',roi,source_space:'shot_camera_local',sample_count:valid.length,fit_rmse:Math.sqrt(solution.loss),key_gain:keyGain,fill_gain:fillGain,lights:[make('key',keyDetected,key.direction,85,temperature(weightedColor(key.column)),'正面亮度分布拟合；可能混入材质或背景亮区',keyGain),make('fill',!!fillDetected,fill?.direction||dir(-key.az,20),fillDetected?clamp(85*fill.coeff[2]/Math.max(fill.coeff[1],.01),5,85):0,temperature(weightedColor(fill?.column||ambient)),'第二方向分量，仅在拟合明显改善时保留；不代表独立真实灯具',fillGain),make('rim',rimDetected,rim,clamp(rimContrast*80,10,70),temperature(weightedColor(ambient)),'取样区域边缘比内侧更亮；也可能来自反光、发丝、背景或材质',rimContrast)],environment:{relative_intensity:clamp(solution.coeff[0]*.16,0,.3),confidence:'低：与漫反射、曝光和材质不可分离',direction_identifiable:false,distance_identifiable:false},limitations:['等效三灯方案，不是全部真实光源数量或真实灯位恢复。','基于用户取样区域的椭球漫反射近似；背景、纹理、反光和遮挡会干扰。','角度为离散拟合初稿，距离和灯面尺寸是用户设定的复现假设，不是测量。','RMSE 仅表示代理模型对亮度的拟合程度，不是光向或灯距准确率。','色温由图像颜色近似匹配，未分离物体固有色或相机白平衡。']};
}
