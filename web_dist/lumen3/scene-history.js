export class SceneHistory{
 constructor(capture,restore,limit=60){this.capture=capture;this.restore=restore;this.limit=limit;this.past=[];this.future=[];this.current=this.copy(capture());this.restoring=false;}
 copy(v){return JSON.parse(JSON.stringify(v));}
 commit(){if(this.restoring)return false;const next=this.copy(this.capture());if(JSON.stringify(next)===JSON.stringify(this.current))return false;this.past.push(this.current);if(this.past.length>this.limit)this.past.shift();this.current=next;this.future=[];// 场景真变了才广播：外壳靠它判断「这次摆位还没确认应用」
 document.dispatchEvent(new Event('lumen-scene-committed'));return true;}
 reset(){this.past=[];this.future=[];this.current=this.copy(this.capture());}
 undo(){this.commit();if(!this.past.length)return false;this.future.push(this.current);this.apply(this.past.pop());return true;}
 redo(){if(!this.future.length)return false;this.past.push(this.current);this.apply(this.future.pop());return true;}
 apply(value){this.restoring=true;try{this.restore(this.copy(value));this.current=this.copy(this.capture());}finally{this.restoring=false;}}
}
export function installHistoryUI({capture,restore,isBusy=()=>false}){
 const h=new SceneHistory(capture,restore),bar=document.createElement('div');bar.className='history-tools';
 const undo=document.createElement('button'),redo=document.createElement('button');undo.id='scene-undo';redo.id='scene-redo';undo.textContent='↶ 撤销';redo.textContent='↷ 重做';undo.title='Ctrl+Z';redo.title='Ctrl+Y / Ctrl+Shift+Z';bar.append(undo,redo);document.querySelector('header').insertBefore(bar,document.getElementById('save-session'));
 function update(){undo.disabled=!h.past.length;redo.disabled=!h.future.length;}
 function commit(){if(!isBusy())h.commit();update();}
 undo.onclick=()=>{h.undo();update();};redo.onclick=()=>{h.redo();update();};
 document.addEventListener('change',()=>queueMicrotask(commit));document.addEventListener('click',e=>{if(e.target.closest?.('.history-tools'))return;queueMicrotask(commit);});document.addEventListener('pointerup',()=>queueMicrotask(commit));
 document.addEventListener('keydown',e=>{if(e.defaultPrevented||['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName)||e.target?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable=false]),[role=textbox]')||document.querySelector('dialog[open]'))return;if((e.ctrlKey||e.metaKey)&&!e.altKey){if(e.key.toLowerCase()==='z'){e.preventDefault();if(e.shiftKey)h.redo();else h.undo();update();}else if(e.key.toLowerCase()==='y'){e.preventDefault();h.redo();update();}}});
 update();return{commit,reset(){h.reset();update();},history:h};
}
