'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const auth = window.H3Auth;
  const labels = {queued:'等待中', running:'生成中', done:'已完成', error:'生成失败', canceled:'已取消'};
  const stageInfo = {
    script:['故事与剧本','从故事出发，确定叙事与统一画面风格。'],
    image:['镜头与分镜','用镜头组织故事，用参考图建立画面，再交给模型生成。'],
    video:['视频制作','使用真实视频节点生成；需要时手动将采用的分镜加入参考。'],
    review:['顺序预览','按故事顺序检查已采用的镜头视频与缺失片段。'],
    edit:['剪辑与导出','明确加入采用的产物或上传素材，剪辑画面、配乐与文字，导出成片。'],
  };
  let project = null, doc = null, caps = {}, cardTypes = [], stage = 'image', selected = null;
  let jobs = new Map(), dirty = false, editVersion = 0, saving = null, saveTimer = null;
  let conflict = false, busy = false, polling = false, previewIndex = 0, toastTimer;
  let historySignature = '', pollSignature = '', dragging = null;
  let editorOpening = false, editorClosing = false, serverReady = false;
  const editorOpen = () => $('node-dialog').open || editorOpening;
  function mergeDocument(next, keepEdits = false) {
    const previous = new Map(doc.shots.map(shot => [shot.id,shot]));
    if (!keepEdits) {
      doc.script = next.script; doc.style = next.style;
      doc.shots = next.shots.map(remote => {
        const shot = previous.get(remote.id);
        if (!shot) return structuredClone(remote);
        for (const key of Object.keys(remote)) {
          if (['image','video'].includes(key)) Object.assign(shot[key],structuredClone(remote[key]));
          else shot[key] = structuredClone(remote[key]);
        }
        return shot;
      });
    } else {
      for (const remote of next.shots) {
        const shot = previous.get(remote.id); if (!shot) continue;
        for (const type of ['image','video']) if (remote[type].card) shot[type].card = remote[type].card;
      }
    }
    doc.rev = next.rev;
  }
  const writable = () => serverReady && project && project.permission === 'operate' && !project.locked && !conflict;
  const currentShot = () => doc?.shots.find(s => s.id === selected);
  const live = job => job && ['queued','running'].includes(job.status);
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };
  function button(text, action, className = 'button small') {
    const node = el('button', className, text);
    node.type = 'button'; node.onclick = action;
    return node;
  }
  function toast(message) {
    $('toast').textContent = message; $('toast').hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, 5500);
  }
  function mediaURL(value) {
    if (typeof value !== 'string') return '';
    const url = new URL(value, location.href);
    return url.origin === location.origin && /^\/api\/(upload\/|file\?|artifact\/)/.test(value) ? url.href : '';
  }
  function touch() {
    if (!writable()) return;
    dirty = true; editVersion++;
    $('save-status').textContent = '有修改 · 即将保存';
    $('save-status').classList.remove('error');
    clearTimeout(saveTimer); saveTimer = setTimeout(() => save().catch(() => {}), 900);
    updateActions();
  }
  function updateActions() {
    $('save').disabled = !writable() || busy || (!dirty && !window.DirectorEdit.dirty);
    window.DirectorEdit.refresh();
    $('export').disabled = !doc;
    $('add-shot').disabled = !writable() || busy || doc.shots.length >= 200;
    $('import-canvas').disabled = !writable() || busy || doc.shots.length >= 200;
    $('projects').disabled = busy;
    $('new-project').disabled = $('welcome-new').disabled = $('demo').disabled = busy || !serverReady;
    $('preview').disabled = !doc?.shots.length;
    $('readonly').hidden = !project || project.permission === 'operate' && !project.locked;
    $('conflict').hidden = !conflict;
    $('script').disabled = $('style').disabled = !writable() || busy;
    if (!writable() || busy) $('inspector').querySelectorAll('button,input,textarea,select').forEach(node => { node.disabled = true; });
    if (project) $('summary').textContent = `${doc.shots.length} 个镜头 · ${doc.shots.filter(s => chosen(s,'video')).length} 段视频`;
  }
  async function save() {
    clearTimeout(saveTimer);
    if (saving) { await saving; if (dirty) return save(); return; }
    if (!dirty) return;
    if (!writable()) throw new Error('项目无法保存，请先导出方案再重新加载');
    const pid = project.id, version = editVersion, snapshot = {...structuredClone(doc),canvas_rev:project.rev || 0};
    $('save-status').textContent = '正在保存…';
    saving = auth.json(`/api/projects/${pid}/director`, 'PUT', snapshot).then(result => {
      if (project?.id !== pid) return;
      dirty = editVersion !== version;
      project = {...project,...result.project};
      mergeDocument(result.director,dirty);
      $('save-status').textContent = dirty ? '仍有修改 · 即将保存' : '已保存';
      if (dirty) saveTimer = setTimeout(() => save().catch(() => {}), 500);
    }).catch(error => {
      if (project?.id === pid) {
        conflict = error.status === 409 || [403,404].includes(error.status);
        $('save-status').textContent = error.status === 409 ? '保存冲突 · 编辑未丢失' : '保存失败 · 编辑未丢失';
        $('save-status').classList.add('error');
        updateActions();
      }
      toast(error.message); throw error;
    }).finally(() => { saving = null; updateActions(); });
    return saving;
  }
  async function flushDirector() { while (dirty) await save(); }
  async function flush() { await window.DirectorEdit.flush(); await flushDirector(); }
  window.DirectorEdit.configure({
    auth, toast, flushDirector,
    onStateChange:state => { $('save').disabled = !writable() || busy || (!dirty && !state.dirty); },
    getContext: () => ({
      project, writable:!!writable(), busy,
      outputs:(doc?.shots || []).flatMap((shot, order) => ['image','video'].flatMap(type => {
        const version = chosen(shot,type);
        return version ? [{order, title:shot.title, output:structuredClone(version.output),
          source:{shot:shot.id, card:shot[type].card || null, job:version.job, index:version.index}}] : [];
      }))
    })
  });
  window.DirectorEdit.init($('edit-stage'));
  async function refreshProjects() {
    const data = await auth.request('/api/projects');
    const select = $('projects'); select.replaceChildren(new Option('选择项目', ''));
    for (const p of data.projects) select.add(new Option(`${p.has_director ? '导演 · ' : ''}${p.name}${p.permission === 'read' || p.locked ? '（只读）' : ''}`, p.id));
    select.value = project?.id || '';
    return data.projects;
  }
  async function openProject(pid, discard = false) {
    if (busy) { $('projects').value = project?.id || ''; return; }
    try {
      if (!discard) await flush();
      if (busy) { $('projects').value = project?.id || ''; return; }
      busy = true; updateActions();
      const next = await auth.request(`/api/projects/${pid}`);
      clearTimeout(saveTimer);
      project = next; doc = structuredClone(next.director || {rev:0, script:'', style:'', shots:[]});
      window.DirectorEdit.setContext(pid);
      const targetShot = new URL(location.href).searchParams.get('shot');
      selected = doc.shots.find(s => s.id === targetShot)?.id || doc.shots[0]?.id || null; dirty = false; conflict = false;
      jobs = new Map(); historySignature = ''; pollSignature = '';
      $('projects').value = pid; $('project-name').textContent = next.name;
      $('save-status').textContent = next.permission === 'operate' && !next.locked ? '已保存' : '只读项目';
      $('save-status').classList.remove('error');
      $('script').value = doc.script; $('style').value = doc.style;
      const url = new URL(location.href); url.searchParams.set('project', pid); history.replaceState(null, '', url);
      busy = false; render(); await poll();
    } catch (error) { busy = false; $('projects').value = project?.id || ''; if (project) renderInspector(); updateActions(); toast(error.message); }
  }
  function makeShot(title = '', description = '') {
    // 局域网 HTTP 不提供 randomUUID，但允许 getRandomValues。
    const id = 'shot_' + Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
    return {id, title:title || `镜头 ${doc.shots.length + 1}`,
      description, shotSize:'中景', movement:'固定镜头', notes:'',
      image:{capability:'',params:{}}, video:{capability:'',params:{}},
      assets:[], history:[], selected:{}};
  }
  async function createProject(name, demo = false) {
    await flush();
    const next = await auth.json('/api/projects', 'POST', {name});
    await openProject(next.id);
    if (project?.id !== next.id) return;
    if (demo) {
      doc.script = '《雨后的来信》\n\n雨停了，城市还没有醒来。一个女孩在旧书店门口发现一封没有署名的信。她沿着信上的地址穿过街巷，来到一间关闭多年的照相馆。窗里的旧照片，记录着她从未见过的母亲。\n\n镜头从城市环境逐渐靠近人物，最后停留在照片与女孩的表情。';
      doc.style = '写实电影质感，低饱和青绿色调，雨后柔和自然光，细腻胶片颗粒。女孩身穿米色风衣，黑色短发。';
      doc.shots = [
        makeShot('雨后的城市','清晨，雨后的旧城区街道，地面倒映着路灯，远处一家旧书店刚刚开门。'),
        makeShot('门口的信','黑色短发女孩身穿米色风衣，站在旧书店门口，低头看着门缝里露出的一封白色信封。'),
        makeShot('寻找地址','女孩沿着安静的石板街道前行，手中握着信封，街边有褪色的招牌与关闭的店铺。'),
        makeShot('窗里的旧照片','女孩停在老照相馆窗前，玻璃后摆着一张年轻女人的黑白照片，女孩凝视照片，神情惊讶而温柔。'),
      ];
      doc.shots[0].shotSize = '远景'; doc.shots[0].movement = '缓慢推进';
      doc.shots[2].movement = '侧向跟拍'; doc.shots[3].shotSize = '特写';
      selected = doc.shots[0].id; $('script').value = doc.script; $('style').value = doc.style;
    }
    touch(); await flush(); await refreshProjects(); render();
  }
  function taskFor(entry) {
    if (!entry) return null;
    const job = jobs.get(entry.job);
    return (!job || job.unavailable) && entry.outputs?.length ? {id:entry.job,status:'done',name:'已保存的生成产物',outputs:entry.outputs} : job;
  }
  function versions(shot, type) {
    return shot.history.filter(h => h.stage === type).flatMap(h => {
      const job = taskFor(h);
      return (job?.outputs || []).map((output, index) => ({job:h.job, index, output, task:job})).filter(v => v.output.kind === type && mediaURL(v.output.url));
    });
  }
  function chosen(shot, type) {
    const list = versions(shot, type), choice = shot.selected[type];
    return choice ? list.find(v => v.job === choice.job && v.index === choice.index) : list.at(-1);
  }
  function latestJob(shot, type) {
    return taskFor(shot.history.filter(h => h.stage === type).at(-1));
  }
  function statusText(job) {
    if (!job) return '尚未生成';
    const progress = job.status === 'running' ? ` ${Math.round((job.progress || 0) * 100)}%` : '';
    return `${labels[job.status] || job.status}${progress}${job.step ? ' · '+job.step : ''}`;
  }
  function render() {
    $('welcome').hidden = !!project;
    $('script-stage').hidden = !project || stage !== 'script';
    $('shot-stage').hidden = !project || !['image','video'].includes(stage);
    $('review-stage').hidden = !project || stage !== 'review';
    if (project && stage === 'edit') window.DirectorEdit.mount($('edit-stage'));
    else window.DirectorEdit.hide();
    for (const id of ['preview','import-canvas','add-shot']) $(id).hidden = stage === 'edit';
    $('stage-title').textContent = stageInfo[stage][0]; $('stage-subtitle').textContent = stageInfo[stage][1];
    document.querySelectorAll('[data-stage]').forEach(node => node.classList.toggle('active', node.dataset.stage === stage));
    $('script').disabled = $('style').disabled = !writable();
    if (project) { renderShots(); renderInspector(); renderReview(); }
    updateActions();
  }
  function moveShot(from, to) {
    if (!writable() || busy || from === to || to < 0 || to >= doc.shots.length) return;
    doc.shots.splice(to,0,doc.shots.splice(from,1)[0]); touch(); renderShots(); renderInspector(); renderReview();
  }
  function renderShots() {
    const grid = $('shots'); grid.replaceChildren();
    $('list-title').textContent = stage === 'video' ? '镜头视频' : '分镜清单';
    if (!doc.shots.length) { grid.append(el('div','empty-shots','还没有镜头。点击「添加镜头」，开始编排你的故事。')); return; }
    doc.shots.forEach((shot,index) => {
      const card = el('article','shot-card'+(shot.id === selected ? ' selected' : ''));
      card.tabIndex = 0; card.setAttribute('aria-label',`${index+1}. ${shot.title}`); card.dataset.shot = shot.id;
      const selectShot = () => { selected = shot.id; historySignature = ''; renderShots(); renderInspector(); };
      card.onclick = selectShot; card.onkeydown = e => { if (['Enter',' '].includes(e.key)) { e.preventDefault(); selectShot(); } };
      card.draggable = !!writable() && !busy;
      card.ondragstart = e => { dragging = shot.id; e.dataTransfer.setData('text/plain',shot.id); e.dataTransfer.effectAllowed = 'move'; };
      card.ondragend = () => { dragging = null; document.querySelectorAll('.drag-over').forEach(n => n.classList.remove('drag-over')); };
      card.ondragover = e => { if (dragging && writable() && !busy) { e.preventDefault(); card.classList.add('drag-over'); } };
      card.ondragleave = () => card.classList.remove('drag-over');
      card.ondrop = e => { e.preventDefault(); const from = doc.shots.findIndex(s => s.id === dragging); dragging = null; if (from >= 0) moveShot(from,index); };
      const visual = el('div','shot-visual'), image = chosen(shot,'image');
      if (image) { const img = el('img'); img.src = mediaURL(image.output.url); img.alt = shot.title; img.loading = 'lazy'; visual.append(img); }
      else visual.append(el('span','placeholder',String(index+1).padStart(2,'0')));
      visual.append(el('span','tag',`镜头 ${String(index+1).padStart(2,'0')}`));
      if (chosen(shot,'video')) visual.append(el('span','video-tag','视频已就绪'));
      const copy = el('div','shot-copy'); copy.append(el('h3','',shot.title),el('p','',shot.description || '添加画面描述，定义这个镜头。'));
      const meta = el('div','shot-meta'); meta.append(el('span','',shot.shotSize),el('span','',shot.movement)); copy.append(meta);
      const job = latestJob(shot,stage === 'video' ? 'video' : 'image');
      card.append(visual,copy,el('div','job-status '+(job?.status || ''),statusText(job))); grid.append(card);
    });
  }
  function field(label, value, change, options = {}) {
    const wrapper = el('label','field'), caption = el('span','',label);
    let input;
    if (options.options) {
      input = el('select');
      for (const item of options.options) {
        const v = typeof item === 'object' ? item.value : item;
        input.add(new Option(typeof item === 'object' ? item.label : item,v));
      }
    } else {
      input = el(options.textarea ? 'textarea' : 'input');
      if (!options.textarea) input.type = options.number ? 'number' : 'text';
    }
    input.value = value ?? ''; input.disabled = !writable() || busy;
    if (options.key) input.dataset.field = options.key;
    for (const key of ['min','max','step','maxLength']) if (options[key] != null) input[key] = options[key];
    input.addEventListener(options.options ? 'change' : 'input', () => {
      const next = options.number ? Number(input.value) : input.value;
      if (options.number && (!input.value || !Number.isFinite(next))) return;
      change(next); touch();
    });
    wrapper.append(caption,input);
    if (options.hint) wrapper.append(el('small','',options.hint));
    return wrapper;
  }
  function renderInspector() {
    const panel = $('inspector'), shot = currentShot(); panel.replaceChildren(); historySignature = '';
    if (!shot) { panel.append(el('div','inspector-body muted','选中一个镜头，编辑画面与生成参数。')); return; }
    const index = doc.shots.indexOf(shot), type = stage === 'video' ? 'video' : 'image';
    const head = el('div','inspector-head'); head.append(el('h2','',`镜头 ${String(index+1).padStart(2,'0')} · 详情`));
    const controls = el('div');
    const prev = button('↑',() => moveShot(index,index-1)); prev.title = '向前移动镜头'; prev.disabled = !writable() || busy || index === 0;
    const next = button('↓',() => moveShot(index,index+1)); next.title = '向后移动镜头'; next.disabled = !writable() || busy || index === doc.shots.length-1;
    const remove = button('删除',() => {
      if (!writable() || busy) return;
      if (!confirm('从导演台移除此镜头？画布节点、连线和产物会保留，已提交任务不会取消。')) return;
      doc.shots.splice(index,1); selected = doc.shots[Math.min(index,doc.shots.length-1)]?.id || null;
      touch(); render();
    },'button small danger'); remove.disabled = !writable() || busy;
    const phase = shot[type];
    const params = button('参数 / 生成',() => phase.card ? openNodeEditor(shot,type) : createStage(shot,type));
    params.dataset.shotParams = type;
    params.disabled = !writable() || busy || !!phase.card && !project.cards?.some(c => c.id === phase.card);
    controls.append(params,prev,next,remove); head.append(controls); panel.append(head);
    const body = el('div','inspector-body');
    body.append(field('镜头名称',shot.title,v => { shot.title = v; renderShots(); },{key:'title',maxLength:120}));
    body.append(field('画面描述 / 分镜提示词',shot.description,v => { shot.description = v; renderShots(); },{textarea:true,key:'description',maxLength:10000}));
    const row = el('div','field-row');
    row.append(field('景别',shot.shotSize,v => { shot.shotSize = v; renderShots(); },{options:['远景','全景','中景','近景','特写'],key:'shotSize'}));
    row.append(field('运镜',shot.movement,v => { shot.movement = v; renderShots(); },{options:['固定镜头','缓慢推进','缓慢拉远','侧向跟拍','环绕','摇镜头'],key:'movement'})); body.append(row);
    body.append(field('导演备注 / 台词',shot.notes,v => { shot.notes = v; },{textarea:true,key:'notes',maxLength:10000,hint:'供编排参考，不会自动当作配音或字幕。'}));
    body.append(el('hr'));
    const config = shot[type], card = project.cards?.find(c => c.id === config.card);
    body.append(el('h2','',type === 'image' ? '图片节点' : '视频节点'));
    if (config.card && !card) {
      body.append(el('p','version-error','关联节点已在画布中删除。不会自动重建；可移除此镜头后重新加入节点。'));
    } else if (card) {
      body.append(el('p','model-note',`${card.name || shot.title} · ${caps[card.cap]?.name || card.cap}`));
      body.append(el('p','model-note','模型、参数、原始/优化提示词与图片、视频、音频素材均在画布原有节点面板中编辑和生成。'));
      const edit = button('编辑节点参数 / 生成',() => openNodeEditor(shot,type),'button primary run-button');
      edit.disabled = !writable() || busy; edit.dataset.nodeEditor = type; body.append(edit);
      const link = el('a','button','在画布中查看 ↗');
      link.href = `/?project=${encodeURIComponent(project.id)}&card=${encodeURIComponent(card.id)}`; link.target = '_blank'; link.rel = 'noopener'; body.append(link);
      if (type === 'video') {
        const references = el('div'); references.id = 'storyboard-references'; body.append(references);
      }
    } else {
      body.append(el('p','model-note',config.capability ? '这是旧版导演镜头。打开参数时会关联真实节点，原模型、参数和历史产物均保留，不会重新生成。' : '此阶段尚未关联节点。只在你选择创建或加入时添加，不会自动补齐另一阶段。'));
      const create = button(config.capability ? '打开参数面板' : type === 'image' ? '创建图片节点' : '创建视频节点',() => createStage(shot,type),'button primary run-button');
      create.disabled = !writable() || busy; body.append(create);
      const add = button('加入现有画布节点',() => showImport(shot,type),'button');
      add.disabled = !writable() || busy; body.append(add);
    }
    body.append(el('hr'),el('h2','',type === 'image' ? '分镜版本' : '视频版本'));
    const history = el('div'); history.id = 'versions'; body.append(history); panel.append(body); renderStoryboardReferences(); renderVersions();
  }
  function renderStoryboardReferences() {
    const container = $('storyboard-references'), shot = currentShot();
    if (!container || !shot) return;
    container.replaceChildren();
    const config = shot.video, adopted = chosen(shot,'image');
    const inputs = caps[config.capability]?.inputs || [];
    const edges = (project.edges || []).filter(e => e.to === config.card &&
      (e.slots || [e.slot]).some(key => inputs.some(s => s.key === key && s.type === 'image')));
    for (const edge of edges) {
      const source = project.cards.find(c => c.id === edge.from);
      const slots = (edge.slots || [edge.slot]).map(key => inputs.find(s => s.key === key)?.label || key);
      const version = edge.version ? `固定版本 · ${edge.version.job} · 第 ${edge.version.index + 1} 张` : '跟随上游最新产物';
      const note = el('p','model-note',`${source?.name || '缺失节点'} → ${slots.join('、')} · ${version}`);
      note.dataset.referenceFrom = edge.from; container.append(note);
    }
    if (adopted) {
      const connected = edges.some(e => e.from === shot.image.card && e.version?.job === adopted.job && e.version.index === adopted.index);
      const reference = button(connected ? '已连接采用的分镜版本' : '将采用的分镜图加入视频参考',() => applyStoryboard(shot),'button');
      reference.dataset.storyboardReference = '';
      reference.disabled = !writable() || busy || connected; container.append(reference);
    }
  }
  function renderVersions() {
    const container = $('versions'), shot = currentShot(); if (!container || !shot) return;
    const type = stage === 'video' ? 'video' : 'image';
    const signature = JSON.stringify([shot.selected[type],shot.history.filter(h => h.stage === type).map(h => [h,taskFor(h)])]);
    if (signature === historySignature) return; historySignature = signature; container.replaceChildren();
    const entries = shot.history.filter(h => h.stage === type).slice().reverse();
    if (!entries.length) { container.append(el('p','muted','尚未生成。生成后可以预览并选择采用版本。')); return; }
    for (const entry of entries) {
      const job = taskFor(entry), outputs = versions(shot,type).filter(v => v.job === entry.job);
      const block = el('div','version');
      const top = el('div','version-top'); top.append(el('span','',job?.modelName || job?.name || '生成任务'),el('span','',job?.created ? new Date(job.created*1000).toLocaleTimeString() : '')); block.append(top);
      block.append(el('p','job-status '+(job?.status || ''),job?.unavailable ? '任务已删除或不可访问' : statusText(job)));
      if (job?.error) block.append(el('p','version-error',String(job.error)));
      const adopted = chosen(shot,type);
      for (const v of outputs) {
        const media = el(type === 'video' ? 'video' : 'img'); media.src = mediaURL(v.output.url);
        if (type === 'video') { media.controls = true; media.playsInline = true; media.preload = 'none'; } else { media.alt = shot.title; media.loading = 'lazy'; }
        block.append(media);
        const active = adopted?.job === v.job && adopted?.index === v.index;
        const adopt = button(active ? '当前采用' : '采用这个版本',() => { if (!writable()) return; shot.selected[type] = {job:v.job,index:v.index}; touch(); historySignature = ''; renderVersions(); renderShots(); updateActions(); });
        adopt.disabled = !writable() || busy || active; block.append(adopt); if (active) block.classList.add('selected-version');
      }
      if (live(job)) { const cancel = button('取消任务',async () => { try { await auth.json(`/api/job/${entry.job}/cancel`,'POST',{}); await poll(); } catch (error) { toast(error.message); } }); cancel.disabled = !writable() || busy; block.append(cancel); }
      container.append(block);
    }
  }
  async function uploadFile(file,pid) {
    const form = new FormData(); form.append('file',file);
    const result = await auth.request(`/api/upload?project=${encodeURIComponent(pid)}`,{method:'POST',body:form});
    const asset = result.files?.find(f => f.kind === 'image');
    if (!asset) throw new Error('未返回可用图片素材');
    return {ref:asset.ref,url:asset.url,kind:'image',origin:asset.origin || file.name};
  }
  const importedFrames = new Map();
  async function importFrame(version,pid) {
    const key = `${pid}:${version.job}:${version.index}`;
    if (importedFrames.has(key)) return importedFrames.get(key);
    const url = mediaURL(version.output.url); if (!url) throw new Error('分镜产物地址不正确');
    const response = await fetch(url,{credentials:'same-origin'});
    if (!response.ok) throw new Error(`读取分镜失败（${response.status}）`);
    const blob = await response.blob();
    const file = new File([blob],version.output.filename?.split(/[\\/]/).pop() || 'storyboard.png',{type:blob.type});
    const asset = await uploadFile(file,pid); importedFrames.set(key,asset); return asset;
  }
  async function refreshProject() {
    const pid = project.id, version = editVersion;
    const next = await auth.request(`/api/projects/${encodeURIComponent(pid)}`);
    if (project?.id !== pid || dirty || saving || editVersion !== version) return;
    project = next;
    mergeDocument(next.director || {rev:0,script:'',style:'',shots:[]});
    if (!currentShot()) selected = doc.shots[0]?.id || null;
    $('script').value = doc.script; $('style').value = doc.style;
  }
  async function openNodeEditor(shot,type) {
    if (!writable() || busy || editorOpen()) return;
    editorOpening = true; busy = true; updateActions();
    try {
      await flush(); await refreshProject();
      const cardId = currentShot()?.[type].card || shot[type].card;
      if (!project.cards.some(c => c.id === cardId)) throw new Error('关联节点不存在');
      $('node-title').textContent = `${shot.title} · ${type === 'image' ? '图片' : '视频'}节点`;
      $('node-discard').hidden = true;
      $('node-frame').src = `/?project=${encodeURIComponent(project.id)}&card=${encodeURIComponent(cardId)}&editor=1`;
      $('node-dialog').showModal();
    } catch (error) { toast(error.message); }
    finally { editorOpening = false; busy = false; renderInspector(); updateActions(); }
  }
  async function closeNodeEditor() {
    if (editorClosing) return;
    editorClosing = true; $('node-close').disabled = true;
    try {
      const api = $('node-frame').contentWindow?.ChoukaNodeEditor;
      if (!api) throw new Error('节点面板尚未就绪，请稍后再关闭');
      await api.flush();
      $('node-dialog').close(); $('node-frame').src = 'about:blank';
      await refreshProject(); render(); await poll();
    } catch (error) { toast(error.message); $('node-discard').hidden = false; }
    finally { editorClosing = false; $('node-close').disabled = false; }
  }
  async function discardNodeEditor() {
    if (editorClosing || !confirm('放弃尚未保存的节点编辑并关闭？画布节点与已提交的任务不会删除。')) return;
    $('node-dialog').close(); $('node-frame').src = 'about:blank';
    try { await refreshProject(); render(); }
    catch (error) { toast(error.message); }
  }
  async function createStage(shot,type) {
    if (!writable() || busy || shot[type].card) return;
    const config = shot[type];
    const capability = config.capability || cardTypes.find(c => c.id === 'card_'+type)?.modes?.[0]?.id;
    if (!caps[capability]) { toast('此类节点暂不可用'); return; }
    busy = true; updateActions();
    try {
      shot[type] = {...config,capability,params:structuredClone(config.params || {})}; touch(); await flush();
      busy = false; render(); await openNodeEditor(shot,type);
    } catch (error) { toast(error.message); }
    finally { busy = false; renderInspector(); updateActions(); }
  }
  async function showImport(shot = null,type = null) {
    if (!writable() || busy) return;
    busy = true; updateActions();
    try {
      await flush(); await refreshProject();
      const list = $('import-list'); list.replaceChildren();
      const cards = project.cards.filter(c => ['card_image','card_video'].includes(c.type) && !c.director_shot && (!type || c.type === 'card_'+type));
      for (const card of cards) {
        const row = el('label','import-row'), input = el('input'); input.type = shot ? 'radio' : 'checkbox'; input.name = 'import-card'; input.value = card.id;
        row.append(input,el('span','',`${card.name || card.id} · ${caps[card.cap]?.name || card.cap}`)); list.append(row);
      }
      if (!cards.length) list.append(el('p','muted','没有可加入的生成节点。普通画布节点不会自动进入导演台；已加入的节点不重复显示。'));
      $('import-confirm').disabled = !cards.length;
      $('import-dialog').dataset.shot = shot?.id || '';
      $('import-dialog').showModal();
    } catch (error) { toast(error.message); }
    finally { busy = false; render(); }
  }
  async function importCards() {
    const cards = [...$('import-list').querySelectorAll('input:checked')].map(input => input.value);
    if (!cards.length || !writable() || busy) return;
    busy = true; $('import-confirm').disabled = true; updateActions();
    try {
      const shot = $('import-dialog').dataset.shot;
      const result = await auth.json(`/api/projects/${project.id}/director/import`,'POST',{
        rev:doc.rev,canvas_rev:project.rev || 0,cards,...(shot ? {shot} : {})
      });
      project = {...project,...result.project}; mergeDocument(result.director);
      selected = shot || doc.shots.find(s => ['image','video'].some(type => cards.includes(s[type].card)))?.id || selected;
      $('import-dialog').close(); toast('已关联原画布节点，没有复制节点');
    } catch (error) { toast(error.message); if (error.status === 409) await refreshProject(); }
    finally { busy = false; $('import-confirm').disabled = false; render(); }
  }
  async function applyStoryboard(shot) {
    if (!writable() || busy) return;
    busy = true; updateActions();
    try {
      await flush(); await refreshProject();
      shot = doc.shots.find(s => s.id === shot.id);
      const version = chosen(shot,'image'), config = shot.video;
      if (!version || !project.cards.some(c => c.id === shot.image.card) || !project.cards.some(c => c.id === config.card)) throw new Error('分镜产物或节点不存在，请先打开参数面板关联真实节点');
      const slot = (caps[config.capability]?.inputs || []).find(s => s.type === 'image' && !config.assets?.[s.key] &&
        !(project.edges || []).some(e => e.to === config.card && (e.slots || [e.slot]).includes(s.key)));
      if (!slot) throw new Error('当前模式没有空闲图片槽。请在节点面板中移除参考图或切换模式；不会替换已有素材。');
      if (!shot.selected.image) {
        shot.selected.image = {job:version.job,index:version.index}; touch(); await flush();
      }
      const asset = await importFrame(version,project.id);
      const result = await auth.json(`/api/projects/${project.id}/director/reference`,'POST',{
        rev:doc.rev, canvas_rev:project.rev || 0, shot:shot.id,
        version:{job:version.job,index:version.index}, slot:slot.key, asset
      });
      project = {...project,...result.project}; mergeDocument(result.director);
      $('save-status').textContent = '已保存';
      toast(`已连线并加入${slot.label || '图片参考槽'}，固定采用的分镜版本，其他素材均保留`);
    } catch (error) { toast(error.message); if (error.status === 409) await refreshProject(); }
    finally { busy = false; render(); }
  }
  async function poll() {
    if (!project || polling || !auth.active || editorOpen()) return;
    polling = true;
    const pid = project.id;
    try {
      if (!dirty && !saving && !busy && !dragging && !$('import-dialog').open) {
        const before = JSON.stringify(doc);
        await refreshProject();
        if (project?.id !== pid) return;
        if (before !== JSON.stringify(doc)) { renderShots(); renderInspector(); renderReview(); updateActions(); }
        else renderStoryboardReferences();
      }
      const result = await auth.request('/api/jobs'); if (project?.id !== pid) return;
      const next = new Map(jobs);
      for (const job of result.jobs || []) if (job.project === pid) next.set(job.id,job);
      const entries = doc.shots.flatMap(s => s.history);
      const missing = [...new Set(entries.map(h => h.job))].filter(id => !next.has(id) || live(next.get(id)) && !(result.jobs || []).some(j => j.id === id));
      for (let i = 0; i < missing.length; i += 6) {
        await Promise.all(missing.slice(i,i+6).map(async id => {
          try { const job = await auth.request(`/api/job/${encodeURIComponent(id)}`); if (job.project === pid) next.set(id,job); }
          catch (error) { if ([403,404].includes(error.status)) next.set(id,{id,unavailable:true}); }
        }));
        if (project?.id !== pid) return;
      }
      jobs = next;
      const signature = JSON.stringify(doc.shots.map(s => [s.id,s.history.map(h => next.get(h.job)),s.selected]));
      if (signature !== pollSignature) {
        pollSignature = signature;
        if (!dragging) renderShots(); renderVersions(); renderReview(); updateActions();
      }
    } catch (error) {
      if (![401,403,404].includes(error.status)) $('connection').textContent = '任务状态暂时无法更新';
    } finally { polling = false; }
  }
  function renderReview() {
    const list = $('review-list'); list.replaceChildren();
    if (!doc.shots.length) { list.append(el('div','empty-shots','先添加镜头，再制作分镜与视频。')); return; }
    doc.shots.forEach((shot,index) => {
      const row = el('div','review-row'), image = chosen(shot,'image'), video = chosen(shot,'video');
      if (image) { const img = el('img'); img.src = mediaURL(image.output.url); img.alt = shot.title; img.loading = 'lazy'; row.append(img); }
      else row.append(el('div','review-placeholder',String(index+1).padStart(2,'0')));
      const copy = el('div'); copy.append(el('h2','',`${String(index+1).padStart(2,'0')} · ${shot.title}`),el('p','',shot.description || '尚未填写画面描述'),el('span','muted',video ? '视频已就绪' : '缺少视频 · 不会自动跳过此镜头'));
      row.append(copy,button('预览镜头',() => openPreview(index),'button')); list.append(row);
    });
  }
  function showPreview() {
    const shot = doc?.shots[previewIndex]; if (!shot) return;
    $('preview-title').textContent = `${previewIndex+1} / ${doc.shots.length} · ${shot.title}`;
    const container = $('preview-media'); container.replaceChildren();
    const video = chosen(shot,'video'), image = chosen(shot,'image');
    if (video) {
      const player = el('video'); player.src = mediaURL(video.output.url); player.controls = true; player.playsInline = true;
      player.onended = () => { if (previewIndex < doc.shots.length-1) { previewIndex++; showPreview(); } };
      container.append(player); player.play().catch(() => {});
    } else if (image) {
      const img = el('img'); img.src = mediaURL(image.output.url); img.alt = shot.title;
      container.append(img,el('p','','此镜头尚无视频。可查看分镜或手动进入下一镜头。'));
    } else container.append(el('p','',`此镜头还没有生成结果。\n${shot.description || '请先制作分镜与视频。'}`));
    $('preview-prev').disabled = previewIndex === 0; $('preview-next').disabled = previewIndex === doc.shots.length-1;
  }
  function openPreview(index = 0) {
    if (!doc?.shots.length) return;
    previewIndex = index; $('preview-dialog').showModal(); showPreview();
  }
  function showCreate() {
    if (busy) return;
    $('create-name').value = ''; $('create-error').textContent = '';
    $('create-dialog').showModal(); $('create-name').focus();
  }
  document.querySelectorAll('[data-stage]').forEach(node => { node.onclick = () => { stage = node.dataset.stage; render(); }; });
  $('projects').onchange = () => { const pid = $('projects').value; if (pid) openProject(pid); else $('projects').value = project?.id || ''; };
  $('new-project').onclick = $('welcome-new').onclick = showCreate;
  $('create-cancel').onclick = () => $('create-dialog').close();
  $('create-form').onsubmit = async event => {
    event.preventDefault(); const submit = event.currentTarget.querySelector('[type=submit]');
    const name = $('create-name').value.trim(); if (!name) { $('create-error').textContent = '请填写项目名称'; return; }
    submit.disabled = true;
    try { await createProject(name); $('create-dialog').close(); }
    catch (error) { $('create-error').textContent = error.message; }
    finally { submit.disabled = false; }
  };
  $('demo').onclick = async () => {
    $('demo').disabled = true;
    try { await createProject('雨后的来信 · 导演示例',true); }
    catch (error) { toast(error.message); }
    finally { $('demo').disabled = false; }
  };
  $('save').onclick = () => flush().catch(() => {});
  $('reload-project').onclick = () => { if (confirm('重新加载会放弃本页未保存的编辑。请确认已导出备份。')) openProject(project.id,true); };
  $('export').onclick = async () => {
    if (!doc) return;
    // 冲突时仍允许下载本页导演草稿；剪辑草稿在第五步单独下载。
    try { await flush(); } catch (error) { toast(`未能保存，仍将导出本页方案备份：${error.message}`); }
    const blob = new Blob([JSON.stringify({name:project.name,director:doc},null,2)],{type:'application/json'});
    const link = el('a'); link.href = URL.createObjectURL(blob); link.download = `${project.name.replace(/[\\/:*?"<>|]/g,'_')}-导演方案.json`;
    link.click(); setTimeout(() => URL.revokeObjectURL(link.href),1000);
  };
  $('import-canvas').onclick = () => showImport();
  $('import-cancel').onclick = () => $('import-dialog').close();
  $('import-confirm').onclick = importCards;
  $('node-close').onclick = closeNodeEditor;
  $('node-discard').onclick = discardNodeEditor;
  $('node-dialog').oncancel = event => { event.preventDefault(); closeNodeEditor(); };
  $('add-shot').onclick = () => {
    if (!writable() || busy || doc.shots.length >= 200) return;
    const shot = makeShot(); doc.shots.push(shot); selected = shot.id;
    if (!['image','video'].includes(stage)) stage = 'image'; touch(); render();
  };
  $('script').oninput = () => { if (!writable()) return; doc.script = $('script').value; touch(); };
  $('style').oninput = () => { if (!writable()) return; doc.style = $('style').value; touch(); };
  $('script').maxLength = 100000; $('style').maxLength = 10000;
  $('preview').onclick = () => openPreview(); $('preview-close').onclick = () => $('preview-dialog').close();
  $('preview-dialog').onclose = () => { $('preview-media').querySelector('video')?.pause(); $('preview-media').replaceChildren(); };
  $('preview-prev').onclick = () => { if (previewIndex > 0) { previewIndex--; showPreview(); } };
  $('preview-next').onclick = () => { if (previewIndex < doc.shots.length-1) { previewIndex++; showPreview(); } };
  window.addEventListener('beforeunload',event => { if (dirty || busy || saving || window.DirectorEdit.dirty || window.DirectorEdit.pending) { event.preventDefault(); event.returnValue = ''; } });
  window.addEventListener('h3auth:expired',() => { conflict = true; updateActions(); });
  async function boot() {
    updateActions();
    try {
      await auth.requireUser(); auth.mountAccount($('account'));
      const capabilities = await auth.request('/api/cards'); caps = capabilities.capabilities || {};
      cardTypes = capabilities.cards || [];
      serverReady = capabilities.director_schema === 1;
      $('server-version').hidden = serverReady;
      $('connection').textContent = !serverReady ? '服务版本较旧 · 请重启服务后刷新' : capabilities.comfy_online ? '生成服务已连接' : '生成服务未就绪 · 可先编排';
      await refreshProjects();
      const pid = new URL(location.href).searchParams.get('project');
      if (pid) await openProject(pid);
      updateActions();
      auth.every(poll,1800);
    } catch (error) { toast(error.message); $('connection').textContent = '连接失败，请刷新重试'; }
  }
  boot();
})();
