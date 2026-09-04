const fs = require('fs');
const path = require('path');

const manifestsDir = path.join(__dirname, 'manifests');
const files = fs.readdirSync(manifestsDir).filter(f => f.endsWith('.json') && f !== '_cards.json');

console.log(`找到 ${files.length} 个 manifest 文件\n`);

files.forEach(filename => {
  const filepath = path.join(manifestsDir, filename);
  console.log(`处理: ${filename}`);

  const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));

  if (data.inputs && Array.isArray(data.inputs)) {
    let modified = false;
    data.inputs.forEach(inp => {
      if (inp.type === 'textarea' && inp.default && inp.default.trim()) {
        console.log(`  清空字段: ${inp.key} (原长度: ${inp.default.length})`);
        inp.default = '';
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(filepath, JSON.stringify(data, null, 1), 'utf8');
      console.log(`  ✓ 已保存\n`);
    } else {
      console.log(`  - 无需修改\n`);
    }
  } else {
    console.log(`  - 无 inputs 字段\n`);
  }
});

console.log('完成！');
