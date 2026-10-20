(() => {
  const select = document.getElementById('project');
  const picker = document.getElementById('file');
  const button = document.getElementById('import-btn');
  const status = document.getElementById('status');
  const incoming = document.getElementById('extension-transfer');
  const incomingName = document.getElementById('extension-file');
  const confirm = document.getElementById('extension-confirm');
  const cancel = document.getElementById('extension-cancel');
  let pendingFile = null;
  if (new URLSearchParams(location.search).has('extension')) {
    document.getElementById('if-frame').hidden = true;
    document.getElementById('frame-help').textContent = '在独立打开的 IF Studio 中点击图片或视频上的“加入 Chouka 画布”，然后在这里确认目标画布。历史会话仍在 IF Studio 独立页面使用。';
    document.querySelector('.heading p').textContent = '从独立 IF Studio 页面接收选中的产物。';
  } else {
    document.getElementById('if-frame').src = 'https://ifs.alibaba-inc.com/';
  }

  function message(text, error = false, href = '') {
    status.textContent = text;
    status.dataset.error = String(error);
    if (error) H3Notify.error(text);
    if (href) {
      const link = document.createElement('a');
      link.href = href;
      link.textContent = ' 查看画布';
      link.style.color = '#a9dcff';
      status.append(link);
    }
  }

  async function start() {
    await H3Auth.requireUser();
    H3Auth.mountAccount(document.getElementById('account'));
    const data = await H3Auth.request('/api/projects');
    const editable = data.projects.filter(project => project.permission === 'operate' && !project.locked);
    for (const project of editable) {
      const option = document.createElement('option');
      option.value = project.id;
      option.textContent = project.name;
      select.append(option);
    }
    try {
      const remembered = localStorage.getItem(`chouka:last-project:${H3Auth.user.id}`);
      if (editable.some(project => project.id === remembered)) select.value = remembered;
    } catch {}
    button.disabled = !editable.length;
    message(editable.length ? '选择目标画布，可在本机生成或导入 IF Studio 产物。' : '没有可操作画布，请先到「画布」新建。');
    initBridge();
  }

  async function importFile(file) {
    const image = /\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name);
    if (!image && !/\.(mp4|webm|mkv|mov|avi)$/i.test(file.name)) {
      message('仅支持画布已接收的图片和视频格式。', true);
      return false;
    }
    const projectId = select.value;
    button.disabled = true;
    confirm.disabled = true;
    select.disabled = true;
    try {
      message('正在上传素材…');
      const form = new FormData();
      form.append('file', file, file.name);
      const result = await H3Auth.request(`/api/upload?project=${encodeURIComponent(projectId)}${image ? '&local_only=1' : ''}`, {method: 'POST', body: form});
      const item = result.files?.[0];
      if (!item || !['image', 'video'].includes(item.kind)) throw new Error('上传接口未返回图片或视频');
      const project = await H3Auth.request(`/api/projects/${encodeURIComponent(projectId)}`);
      if (project.permission !== 'operate' || project.locked) throw new Error('目标画布已不可编辑');
      message('上传成功，正在添加素材节点…');
      const number = project.cards.reduce((max, card) => {
        const match = /^素材(\d+)$/.exec(card.name || '');
        return match ? Math.max(max, Number(match[1])) : max;
      }, 0) + 1;
      const index = project.cards.length;
      const card = {
        id: Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join(''),
        type: 'card_asset', cap: 'asset', name: `素材${number}`,
        x: 80 + index % 3 * 300, y: 80 + Math.floor(index / 3) * 260,
        params: {}, assets: {}, status: null, progress: 0,
        outputs: [{...item, filename: (item.origin || item.url).split(/[\\/]/).pop()}],
      };
      await H3Auth.json(`/api/projects/${encodeURIComponent(projectId)}/cards`, 'POST', {card});
      message('已添加到画布。', false, `/?project=${encodeURIComponent(projectId)}&card=${encodeURIComponent(card.id)}`);
      return true;
    } catch (error) {
      message(`添加失败：${error.message}`, true);
      return false;
    } finally {
      select.disabled = false;
      button.disabled = !select.options.length;
      confirm.disabled = !select.options.length;
    }
  }

  function initBridge() {
    const base = 'http://127.0.0.1:8278';
    const form = document.getElementById('if-generate-form');
    const type = document.getElementById('if-type');
    const model = document.getElementById('if-model');
    const prompt = document.getElementById('if-prompt');
    const reference = document.getElementById('if-reference');
    const skill = document.getElementById('if-skill');
    const followUp = document.getElementById('if-continue');
    const generate = document.getElementById('if-generate');
    const info = document.getElementById('if-bridge-status');
    const results = document.getElementById('if-results');
    const jobKey = `chouka:if-studio-job:${H3Auth.user.id}`;
    let models = [];
    let lastSession = null;

    async function request(path, options = {}) {
      const response = await fetch(base + path, {...options, credentials: 'omit'});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `桥接请求失败（${response.status}）`);
      return data;
    }
    function selectModels() {
      model.replaceChildren();
      for (const entry of models.filter(entry => entry.type === type.value)) {
        const option = document.createElement('option');
        option.value = entry.display_name;
        option.textContent = entry.display_name;
        model.append(option);
      }
      generate.disabled = !model.options.length;
    }
    type.addEventListener('change', selectModels);

    async function poll(id) {
      try {
        const job = await request(`/runs/${encodeURIComponent(id)}`);
        if (job.result?.canvas_url) {
          const url = new URL(job.result.canvas_url);
          if (url.protocol === 'https:' && url.hostname === 'ifs.alibaba-inc.com' && !info.querySelector('a')) {
            const link = document.createElement('a');
            link.href = url.href;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = ' 打开 IF 画布';
            info.append(link);
          }
        }
        if (job.state === 'starting' || job.state === 'running') {
          if (job.state === 'running') info.firstChild.textContent = 'IF 正在生成，画布已创建。';
          setTimeout(() => poll(id), 2500);
          return;
        }
        generate.disabled = !model.options.length;
        if (job.state === 'error') {
          info.firstChild.textContent = `生成失败：${job.error}`;
          H3Notify.error(info.firstChild.textContent);
          return;
        }
        const result = job.result;
        lastSession = {canvas_id: result.canvas_id, session_id: result.session_id};
        followUp.disabled = false;
        info.firstChild.textContent = result.status === 'done' ? 'IF 生成完成。' :
          result.status === 'summary_feedback' && result.planning_text?.includes('任务执行失败') ?
            `IF 生成失败：${result.planning_text}` :
          result.status === 'summary_feedback' && result.planning_text?.includes('后台处理中') ?
            'IF 视频仍在后台处理中；可稍后在 IF 画布查看结果。' :
          result.status === 'summary_feedback' &&
            (result.planning_text?.includes('已生成完毕') || result.planning_text?.includes('任务已完成')) ?
            'IF 报告任务已完成，但未返回媒体；请在 IF 画布核查。' :
          result.status === 'summary_feedback' ? `IF 等待确认：${result.planning_text || result.message || '请在 IF 画布继续'}` :
          result.status === 'ask_user' ? 'IF 需要补充信息，请在 IF 画布填写表单。' :
          `IF 任务状态：${result.status || '未知'}。`;
        for (const item of result.downloaded || []) {
          const container = document.createElement('div');
          const mediaUrl = `${base}/runs/${encodeURIComponent(id)}/media/${item.index}`;
          const media = document.createElement(item.type === 'video' ? 'video' : 'img');
          media.crossOrigin = 'anonymous';
          media.src = mediaUrl;
          if (item.type === 'video') media.controls = true;
          container.append(media);
          const add = document.createElement('button');
          add.type = 'button';
          add.textContent = '加入所选 Chouka 画布';
          add.addEventListener('click', async () => {
            try {
              const response = await fetch(mediaUrl, {credentials: 'omit'});
              if (!response.ok) throw new Error('本机媒体读取失败');
              await importFile(new File([await response.blob()], item.name));
            } catch (error) { message(`添加失败：${error.message}`, true); }
          });
          container.append(add);
          results.append(container);
        }
      } catch (error) {
        generate.disabled = !model.options.length;
        if (error.message === '任务不存在') {
          try { localStorage.removeItem(jobKey); } catch {}
          info.textContent = '本机桥接已重启，历史任务请到 IF Studio 画布查看。';
        } else {
          info.textContent = `本机桥接断开：${error.message}`;
          H3Notify.error(info.textContent);
        }
      }
    }

    form.addEventListener('submit', async event => {
      event.preventDefault();
      generate.disabled = true;
      results.replaceChildren();
      info.textContent = '正在向 IF Studio 提交生成需求…';
      const data = {type: type.value, model: model.value, prompt: prompt.value.trim()};
      if (reference.value.trim()) data.image = reference.value.trim();
      if (skill.value.trim()) data.skill = skill.value.trim();
      if (followUp.checked && lastSession) Object.assign(data, lastSession);
      try {
        const job = await request('/runs', {
          method: 'POST',
          headers: {'Content-Type': 'application/json', 'X-Chouka-IF': 'generate'},
          body: JSON.stringify(data),
        });
        info.textContent = 'IF 已接收生成请求，正在创建画布…';
        try { localStorage.setItem(jobKey, job.id); } catch {}
        poll(job.id);
      } catch (error) {
        info.textContent = `提交失败：${error.message}`;
        H3Notify.error(info.textContent);
        generate.disabled = !model.options.length;
      }
    });

    (async () => {
      try {
        const status = await request('/status');
        if (!status.ready) throw new Error('请先在本机运行 ifs auth login --registry https://ifs.alibaba-inc.com/');
        models = (await request('/models')).models;
        selectModels();
        info.textContent = `本机 IF 已登录；可选 ${models.filter(m => m.type === 'image').length} 个图像模型、${models.filter(m => m.type === 'video').length} 个视频模型。`;
        let previousJob;
        try { previousJob = localStorage.getItem(jobKey); } catch {}
        if (previousJob) {
          info.textContent = '正在恢复上次 IF 生成任务…';
          generate.disabled = true;
          poll(previousJob);
        }
      } catch (error) {
        info.textContent = `无法连接 IF：${error.message}。请在本机启动桥接程序，并配置此 Chouka 页面的准确来源。`;
        H3Notify.error(info.textContent);
      }
    })();
  }

  button.addEventListener('click', () => picker.click());
  picker.addEventListener('change', () => {
    const file = picker.files[0];
    picker.value = '';
    if (file) importFile(file);
  });
  window.addEventListener('message', event => {
    if (event.source !== window || event.origin !== location.origin
        || event.data?.source !== 'chouka-if-extension' || event.data.type !== 'file'
        || !(event.data.file instanceof File)) return;
    pendingFile = event.data.file;
    incomingName.textContent = `待加入：${pendingFile.name}（${(pendingFile.size / 1024 / 1024).toFixed(1)} MB）`;
    incoming.hidden = false;
    confirm.disabled = !select.options.length;
    message(select.options.length ? '选择目标画布后确认添加；文件不会自动上传。' : '请先在「画布」新建画布，再从 IF Studio 重新发送素材。', !select.options.length);
  });
  confirm.addEventListener('click', async () => {
    if (pendingFile && await importFile(pendingFile)) {
      pendingFile = null;
      incoming.hidden = true;
    }
  });
  cancel.addEventListener('click', () => {
    pendingFile = null;
    incoming.hidden = true;
    message('已取消加入画布。');
  });

  start().catch(error => message(`画布列表加载失败：${error.message}`, true));
})();
