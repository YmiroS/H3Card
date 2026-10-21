// Explicit production assets only; never turn fixture servers into directory servers.
const featureNames = Object.freeze([
  'features/node-parameters.js',
  'features/project-persistence.js',
  'features/task-panel.js',
  'capacity-page.js',
]);
const featureFiles = Object.freeze(Object.fromEntries(featureNames.map(name => ['/' + name, name])));
const canvasNames = Object.freeze([...featureNames, 'vendor/fabric.min.js', 'image-composer.js', 'image-composer.css']);
const canvasFiles = Object.freeze(Object.fromEntries(canvasNames.map(name => ['/' + name, name])));
module.exports = {featureNames, featureFiles, canvasNames, canvasFiles};
