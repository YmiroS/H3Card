const {createCanvasUpdater} = require('../../web/features/task-panel.js');

// Adapts existing isolated history/edge fixtures to the complete production module.
function taskUpdater(context) {
  const update = createCanvasUpdater({
    getProject:() => context.PROJ,
    canOperate:() => context.canOperate(), canTask:job => context.canTask(job),
    isIF:card => context.isIF ? context.isIF(card) : false,
    paint:card => context.paint(card),
    refreshPanel:card => { if (context.el.panel._id === card.id) context.openPanel(card.id); },
    pushHistory:(card, job) => context.pushHistory(card, job),
    refreshHistory:card => { if (context.el.hist._id === card.id) context.openHistory(card.id); },
    propagateCardOutputs:card => context.propagateCardOutputs(card),
    titleOf:card => context.titleOf(card), showError:message => context.showError(message),
    save:edit => context.save(edit),
  });
  return async () => update((await context.api('/api/jobs')).jobs || []);
}
module.exports = {taskUpdater};
