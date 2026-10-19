(() => {
  const select = document.getElementById('project');
  const picker = document.getElementById('file');
  const button = document.getElementById('import-btn');
  const status = document.getElementById('status');

  function message(text, error = false, href = '') {
    status.textContent = text;
    status.dataset.error = String(error);
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
    message(editable.length ? '选择目标画布，再导入从 IF Studio 下载的图片或视频。' : '没有可操作画布，请先到「画布」新建。');
  }

  button.addEventListener('click', () => picker.click());
  picker.addEventListener('change', async () => {
    const file = picker.files[0];
    picker.value = '';
    if (!file) return;
    const image = /\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name);
    if (!image && !/\.(mp4|webm|mkv|mov|avi)$/i.test(file.name)) {
      message('仅支持画布已接收的图片和视频格式。', true);
      return;
    }
    const projectId = select.value;
    button.disabled = true;
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
    } catch (error) {
      message(`添加失败：${error.message}`, true);
    } finally {
      select.disabled = false;
      button.disabled = !select.options.length;
    }
  });

  start().catch(error => message(`画布列表加载失败：${error.message}`, true));
})();
