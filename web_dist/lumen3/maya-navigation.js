import * as T from 'three';
export function installMayaNavigation({canvas,orbit,gizmo,setTool,focus}){
 const buttons={0:'LEFT',1:'MIDDLE',2:'RIGHT'},actions={0:T.MOUSE.ROTATE,1:T.MOUSE.PAN,2:T.MOUSE.DOLLY};
 function reset(){orbit.mouseButtons.LEFT=null;orbit.mouseButtons.MIDDLE=null;orbit.mouseButtons.RIGHT=null;gizmo.enabled=true;}
 reset();canvas.addEventListener('pointerdown',e=>{reset();if(e.altKey){orbit.mouseButtons[buttons[e.button]]=actions[e.button];gizmo.enabled=false;orbit.enabled=true;}},true);window.addEventListener('pointerup',()=>{queueMicrotask(reset);});window.addEventListener('blur',reset);canvas.addEventListener('contextmenu',e=>e.preventDefault());
 document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)||e.ctrlKey||e.metaKey||e.altKey||document.querySelector('dialog[open]'))return;const key=e.key.toLowerCase();if(key==='q')setTool('select');if(key==='r')setTool('scale');if(key==='f'){e.preventDefault();focus();}});
 const hint=document.getElementById('summary')||document.createElement('p');hint.id='summary';hint.classList.add('maya-hint');hint.textContent='Maya：Alt+左键环绕 · Alt+中键平移 · Alt+右键推拉 · 滚轮缩放 · Q选择 / W移动 / E旋转 / R缩放 · F聚焦';if(!hint.isConnected)document.querySelector('.workspace .bottom>div')?.append(hint);
}
