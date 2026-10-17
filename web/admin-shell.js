/* 管理页共享壳层；图标源自 Tabler Icons（MIT），许可见 admin-icons-LICENSE.txt。 */
(() => {
  'use strict';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const paths = {
    dashboard:'M5 4h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1M5 16h4a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1M15 12h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1M15 4h4a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1',
    costs:'M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2M9 5a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2M14 11h-2.5a1.5 1.5 0 0 0 0 3h1a1.5 1.5 0 0 1 0 3h-2.5M12 17v1m0 -8v1',
    capacity:'M3 13a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -6M15 9a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -10M9 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -14M4 20h14',
    permissions:'M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0M8 11v-4a4 4 0 1 1 8 0v4',
    teams:'M5 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2M16 3.13a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0 -3 -3.85',
    refresh:'M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4',
    chevron:'M9 6l6 6l-6 6', external:'M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6M11 13l9 -9M15 4h5v5',
    logout:'M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2M9 12h12l-3 -3M18 15l3 -3',
    alert:'M12 9v4M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0M12 16h.01'
  };
  const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name] || paths.permissions}"/></svg>`;
  let toastTimer, dialogId = 0;
  function toast(text) {
    let node = document.getElementById('admin-toast');
    if (!node) { node = document.createElement('div'); node.id='admin-toast'; node.className='toast'; node.setAttribute('role','status'); node.setAttribute('aria-live','polite'); document.body.append(node); }
    node.textContent=text; node.hidden=false; clearTimeout(toastTimer); toastTimer=setTimeout(()=>{node.hidden=true;},5000);
  }
  function focusables(dialog) { return [...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')].filter(node => node.getClientRects().length&&!node.closest('[inert]')); }
  document.addEventListener('keydown', event => {
    if(event.key!=='Tab')return;
    const modal=[...document.querySelectorAll('dialog[open]')].at(-1); if(!modal)return;
    const nodes=focusables(modal),first=nodes[0],last=nodes.at(-1);
    if(!first){event.preventDefault();modal.focus();return;}
    if(event.shiftKey&&(document.activeElement===first||!modal.contains(document.activeElement))){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&(document.activeElement===last||!modal.contains(document.activeElement))){event.preventDefault();first.focus();}
  },true);
  document.addEventListener('keydown', event => {
    const tab=event.target.closest('[role=tab]');
    if(event.defaultPrevented||!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    const tabs=[...tab.closest('[role=tablist]').querySelectorAll('[role=tab]')];let i=tabs.indexOf(tab);
    i=event.key==='Home'?0:event.key==='End'?tabs.length-1:(i+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
    event.preventDefault();tabs[i].click();tabs[i].focus();
  });
  function dialog({title,body='',submitLabel,onSubmit}={}) {
    const previous=document.activeElement, focusKey=previous?.dataset.focusKey, modal=document.createElement('dialog');
    modal.className='f-operation-modal admin-dialog'; modal.tabIndex=-1;
    const id=`admin-dialog-${++dialogId}`;modal.setAttribute('aria-labelledby',id);
    modal.innerHTML=`<form><header class="f-dialog-head"><h2 id="${id}">${escape(title)}</h2><button type="button" data-cancel class="close-button" aria-label="关闭弹窗">×</button></header><div class="f-dialog-body"><div data-dialog-content></div><p class="f-status danger" role="alert" tabindex="-1" data-operation-status></p></div><footer class="f-dialog-foot">${onSubmit?'<button type="button" data-cancel>取消</button><button type="submit" class="primary"></button>':'<button type="button" data-cancel>知道了</button>'}</footer></form>`;
    const form=modal.querySelector('form'),content=modal.querySelector('[data-dialog-content]'),status=modal.querySelector('[role=alert]');
    if(typeof body==='string')content.innerHTML=body;else if(body)content.append(body);
    const submit=form.querySelector('[type=submit]');if(submit)submit.textContent=submitLabel||'确认';
    let busy=false;
    const nativeClose=modal.close.bind(modal);
    modal.close=(value)=>{if(!busy)nativeClose(value);};
    modal.querySelectorAll('[data-cancel]').forEach(button=>button.onclick=()=>modal.close());
    modal.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
    modal.addEventListener('click',event=>{if(event.target!==modal)return;const r=modal.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)modal.close();});
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(busy||!onSubmit||!form.reportValidity())return;
      busy=true;form.dataset.busy='true';form.setAttribute('aria-busy','true');status.textContent='正在提交…';status.classList.remove('danger');
      // inert 阻止提交期间编辑，但不禁用字段，异步回调仍可完整读取 FormData。
      const wasInert=content.inert;content.inert=true;
      const buttons=[...form.querySelectorAll('button')],states=buttons.map(b=>b.disabled);buttons.forEach(b=>b.disabled=true);
      const old=submit.textContent;submit.textContent='正在提交…';status.focus();
      try { await onSubmit(form);busy=false;nativeClose('success'); }
      catch(error) { status.textContent=`${error.message||'提交失败'}；输入已保留，可重试。`;status.classList.add('danger');status.focus(); }
      finally { busy=false;content.inert=wasInert;delete form.dataset.busy;form.removeAttribute('aria-busy');buttons.forEach((b,i)=>b.disabled=states[i]);submit.textContent=old; }
    });
    for(const type of ['click','keydown','input','change'])form.addEventListener(type,event=>{if(busy&&!event.target.closest('[data-operation-status]')){event.preventDefault();event.stopImmediatePropagation();}},true);
    modal.addEventListener('close',()=>{
      form.querySelectorAll('input[type=password]').forEach(input=>{input.value='';});modal.replaceChildren();modal.remove();
      if(document.querySelector('dialog[open]'))return;
      document.body.classList.remove('modal-open');
      // 轮询可能已替换触发按钮，用稳定业务键找回同一个操作入口。
      const target=previous?.isConnected?previous:focusKey?[...document.querySelectorAll('[data-focus-key]')].find(node=>node.dataset.focusKey===focusKey):null;
      (target||document.querySelector('main'))?.focus({preventScroll:true});
    },{once:true});
    document.body.append(modal);document.body.classList.add('modal-open');modal.showModal();return modal;
  }
  async function mountEnvironment(main) {
    // 仅做已鉴权页面的同源只读环境识别；不替代 H3Auth，也不处理页面业务错误。
    const response=await fetch('/api/health',{method:'GET',credentials:'same-origin',cache:'no-store'});
    if(response.headers.get('X-H3Card-Sandbox')!=='local-copy')return;
    document.body.dataset.adminSandbox='local-copy';
    let note=document.getElementById('sandbox-note');
    if(!note){
      note=document.createElement('div');note.id='sandbox-note';note.className='notice-box admin-sandbox';note.setAttribute('role','note');
      note.textContent='本地隔离数据副本：本页用于本地验收，展示复制的业务数据，不代表正式服务的实时状态。';
      const page=main?.querySelector('.page')||main,header=page?.querySelector(':scope > .page-header');
      if(header)header.after(note);else page?.prepend(note);
    }
    note.hidden=false;
    const sync=document.getElementById('sync-all');if(sync){sync.disabled=true;sync.title='本地隔离数据副本禁止节点同步，不能修改正式机器。';}
  }
  function mount({page}={}) {
    document.body.classList.add('admin-page');
    const main=document.querySelector('main');if(main){main.id=main.id||'main';main.tabIndex=-1;}
    document.querySelector('[data-admin-sidebar]')?.remove();document.querySelector('.admin-skip')?.remove();
    document.body.dataset.workspace=page==='dashboard'?'controller':page;
    const side=document.createElement('aside');side.id='workspace-nav';side.dataset.adminSidebar='';side.setAttribute('aria-label','主导航');
    side.innerHTML='<a class="workspace-brand" href="/" aria-label="Chouka 创作空间"><img src="/icon.png" alt=""><span>Chouka<small>创作空间</small></span></a><div class="workspace-footer"><div class="workspace-presence" title="近 90 秒活跃用户" aria-live="polite"><i aria-hidden="true"></i><span><b>--</b> 人使用中</span></div><div class="account-bar" id="account"></div></div>';
    const skip=document.createElement('a');skip.className='skip-link admin-skip';skip.href=`#${main?.id||'main'}`;skip.textContent='跳到主内容';document.body.prepend(skip,side);
    // 导航、角色入口和账号菜单统一复用新版工作区，不再维护第二套管理侧栏。
    H3Auth.mountAccount(side.querySelector('#account'));
    mountEnvironment(main).catch(error=>{console.warn('管理页环境标识读取失败，未更改业务页面状态。',error);});
    return main;
  }
  window.AdminUI={mount,dialog,escape,toast,icon};
})();
