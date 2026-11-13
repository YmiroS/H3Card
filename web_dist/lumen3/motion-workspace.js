export function setupMotionWorkspace(api){
 const $=id=>document.getElementById(id),pane=$('left-category-motion'),oldDetails=$('joint').closest('details'),legacy=$('arm-mark').closest('section'),scale=$('body-scale').closest('details'),joint=$('joint').closest('label'),points=$('show-points');
 const intro=pane.querySelector('.category-header');intro.querySelector('h2').textContent='动作编辑与拟合';intro.querySelector('p').textContent='三维窗口顶部显示关节点；拍摄视图顶部显示照片标记点。显示后即可编辑。';
 const edit=document.createElement('section');edit.className='field-section motion-edit-card';edit.innerHTML='<h3>当前关节</h3><p class="hint">在三维视图选中关节，使用 W 移动、E 旋转、S 记录关键帧。多角色可在拍摄视图顶部切换。</p>';edit.append(joint);
 const photo=document.createElement('section');photo.className='field-section motion-edit-card';photo.innerHTML='<h3>标记点拟合</h3><p class="hint">打开拍摄视图顶部的照片标记点，将各点拖到原图对应位置，再点击拟合。保留当前相机机位，只调整所选角色。</p><button id="fit-pose-markers" class="wide primary">按标记点拟合动作</button><p id="marker-fit-status" class="hint" role="status">拖动标记点不会自动改变动作。</p>';
 const oldLabel=points.closest('label');legacy.append(points);oldLabel?.remove();points.checked=false;
 const hiddenJoint=document.createElement('input');hiddenJoint.id='show-joints';hiddenJoint.type='checkbox';legacy.append(hiddenJoint);legacy.append($('mark-mode').closest('label'));$('mark-mode').checked=false;
 const advanced=document.createElement('details');advanced.className='motion-advanced';advanced.innerHTML='<summary>镜头与联合校准高级选项</summary>';for(const child of [...oldDetails.children])if(child.tagName!=='SUMMARY'&&!child.contains(points))advanced.append(child);oldDetails.remove();legacy.hidden=true;const lift=$('lift-pose');if(lift)lift.hidden=true;pane.replaceChildren(intro,edit,photo,advanced,scale,legacy);
 function sync(){joint.hidden=api.imported();$('fit-pose-markers').disabled=api.imported()||!api.hasPhoto();}
 $('fit-pose-markers').onclick=async()=>{const b=$('fit-pose-markers');b.disabled=true;try{$('marker-fit-status').textContent=await api.fitMarkers();}catch(e){$('marker-fit-status').textContent=e.message;api.toast(e.message);}finally{sync();}};
 document.addEventListener('lumen-asset-visibility',sync);document.addEventListener('lumen-photo-loaded',sync);sync();
}
