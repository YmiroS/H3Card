#!/usr/bin/env python3
"""清理所有 manifest 文件中提示词的示例文案（default 字段）"""
import json
import os
from pathlib import Path

manifests_dir = Path(__file__).parent / "manifests"

# 遍历所有 manifest 文件（除了 _cards.json）
for json_file in manifests_dir.glob("*.json"):
    if json_file.name == "_cards.json":
        continue

    print(f"处理: {json_file.name}")

    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 检查 inputs 字段
    if 'inputs' in data and isinstance(data['inputs'], list):
        modified = False
        for inp in data['inputs']:
            # 如果是 textarea 类型且有 default 字段，清空它
            if inp.get('type') == 'textarea' and 'default' in inp:
                old_default = inp['default']
                inp['default'] = ""
                modified = True
                print(f"  清空字段: {inp.get('key', '?')} (原长度: {len(str(old_default))})")

        if modified:
            # 保存修改后的文件
            with open(json_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=1)
            print(f"  ✓ 已保存")
        else:
            print(f"  - 无需修改")
    else:
        print(f"  - 无 inputs 字段")

print("\n完成！")
