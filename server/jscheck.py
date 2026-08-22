# -*- coding: utf-8 -*-
"""app.js 的粗查：括号/引号是否平衡。

整合包里没有 node，改坏一个括号浏览器只会白屏、控制台才报错，
所以留个不依赖 node 的自检：能抓住漏括号、漏引号这类致命笔误。
语法层面的错（比如 const 重复声明）抓不到，那种还得靠浏览器控制台。
"""
import sys
from pathlib import Path

BS = chr(92)          # 反斜杠，避免自己被转义规则绕进去
PAIRS = {")": "(", "]": "[", "}": "{"}


def check(path):
    src = Path(path).read_text(encoding="utf-8")
    i, n, line, stack, mode = 0, len(src), 1, [], None
    while i < n:
        ch = src[i]
        if ch == "\n":
            line += 1
        if mode is None:
            if src.startswith("//", i):
                j = src.find("\n", i)
                i = n if j < 0 else j
                continue
            if src.startswith("/*", i):
                j = src.find("*/", i + 2)
                line += src.count("\n", i, j)
                i = j + 2
                continue
            if ch in "\"'`":
                mode = ch
                i += 1
                continue
            if ch in "([{":
                stack.append((ch, line))
            elif ch in ")]}":
                if not stack or stack[-1][0] != PAIRS[ch]:
                    return f"{path}:{line} 多余的 {ch}（栈顶 {stack[-1] if stack else None}）"
                stack.pop()
        else:
            if ch == BS:
                i += 2
                continue
            if ch == mode:
                mode = None
        i += 1
    if mode:
        return f"{path}: 引号 {mode} 没闭合"
    if stack:
        return f"{path}: 没闭合 {stack[:5]}"
    return None


if __name__ == "__main__":
    bad = [m for m in (check(p) for p in sys.argv[1:]) if m]
    for m in bad:
        print("FAIL", m)
    if not bad:
        print("OK", " ".join(sys.argv[1:]))
    sys.exit(1 if bad else 0)
