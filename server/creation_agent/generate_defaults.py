"""Build the shipped snapshot from fixed, allowlisted source documents (not runtime)."""
import json
import re
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
SOURCE = ROOT / 'frontend/server/creationAgent/skills'
MANIFEST = ROOT / 'frontend/src/modules/creationAgent/domain/skillPackages.ts'
SNAPSHOT = HERE / 'builtin_defaults.json'


def generate():
    fixed = {
        'image-creation': ['instructions.txt'],
        'h3-prompt-writing': ['SKILL.md', 'references/base-en.txt', 'references/ref-en.txt'],
        'gpt-manju-image-optimization': ['SKILL.md', 'references/workflow.md', 'references/prompt-templates.md'],
    }
    # Parse only the fixed data-only manifest's id/files literals, never walk directories.
    manifest = MANIFEST.read_text(encoding='utf-8')
    for key, block in re.findall(r"id: '([^']+)'[\s\S]*?files: \[([\s\S]*?)\]", manifest):
        fixed[key] = re.findall(r"'([^']+)'", block)
    # Registration and literal trigger rules now live in the shipped data, not client code.
    metadata = json.loads(SNAPSHOT.read_text(encoding='utf-8'))
    if set(fixed) != {item['id'] for item in metadata}:
        raise ValueError('Unexpected package manifest IDs')
    result = []
    for meta in metadata:
        key = meta['id']
        documents = {}
        for name in fixed[key]:
            if (name.startswith('/') or '\\' in name or '..' in name.split('/')
                    or Path(name).suffix not in ('.md', '.txt', '.yaml', '.yml')):
                raise ValueError('Unsafe allowlist entry')
            # newline='' preserves source text without truncation or newline conversion.
            with (SOURCE / key / name).open(encoding='utf-8', newline='') as source:
                documents[name] = source.read()
        main = 'instructions.txt' if key == 'image-creation' else 'SKILL.md'
        result.append(dict(meta, instruction=documents.pop(main), references=documents))
    contents = json.dumps(result, ensure_ascii=False, indent=2) + '\n'
    # Developer-only regeneration uses the frontend's pinned formatter for both copies.
    contents = subprocess.run([
        'node', str(ROOT / 'frontend/node_modules/prettier/bin/prettier.cjs'), '--parser', 'json',
        '--config', str(ROOT / 'frontend/.prettierrc.json'),
    ], input=contents, capture_output=True, check=True, encoding='utf-8').stdout
    SNAPSHOT.write_text(contents, encoding='utf-8')
    (ROOT / 'frontend/server/creationAgent/builtin_defaults.json').write_text(
        contents, encoding='utf-8')
    print([(item['id'], len(item['references']), len(item['instruction'])) for item in result])


if __name__ == '__main__':
    generate()
