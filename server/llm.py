# -*- coding: utf-8 -*-
"""改写用的远程大模型：OpenAI 兼容的 `/v1/chat/completions`。

为什么要有它：本地那条（`rewrite.py` 拼的临时图 + 27B）跟出图**抢同一份显存** ——
每次改写都得把 14 GB 加载进来、改完再 `force_offload` 卸掉，第一次好几分钟；
而且 llama.cpp 那个节点 `n_ctx` 只有 8192，H3 官方 39 KB 的规则只能压缩着喂。
走 API 这几个毛病都没有：不碰显存、不排 ComfyUI 的队、上下文随人家给，
**ComfyUI 没开着也能优化提示词**。

**只讲 OpenAI 那一套协议，不接各家 SDK。** DeepSeek / 智谱 / Moonshot /
通义（compatible-mode）/ 硅基流动 / 自建 one-api 全是这个接口，差别只有 base_url
和模型名 —— 所以配置里就那两个字段加一个 key，换一家不用改代码。

`system` / `user` / `max_tokens` / `temperature` 四样直接取 `rewrite.py` 的 `REGIMES`
和 `user_msg()`，跟本地那条**一字不差**；拿回来的文本也走同一个 `rw.clean()`。
两条路只在「文本从哪来」这一步分岔。这是故意的：分岔多一处，同一张卡走 API 和走本地
就会出两种格式，用户没法判断是模型写得不好还是链路串了。
"""
import asyncio
import json
import re
from pathlib import Path

import aiohttp

# 配置放仓库根（跟 llm.json.例子 挨着，用户打开文件夹就看得见），
# 单独写进 .gitignore —— 不放 data/ 是因为那目录是运行时产物，
# 没人会想到去那儿找配置；而"这个文件里有密钥"该由 .gitignore 明说，
# 不该指望"它正好落在一个被忽略的目录里"。
CONF = Path(__file__).resolve().parent.parent / "llm.json"
TIMEOUT = 90        # 默认超时。定 90 是量出来的：自建网关跑思考模型，h3_ref 那档
                    # （system 6.8 KB、要写满两段）实测 60 秒，20 秒是绝对不够的。
                    # 往大定不亏 —— 兜底那条要好几分钟，多等 90 秒换掉一次几分钟的
                    # 本地跑是划算的；但也别填成十几分钟，那就成了两头的时间都花

RESERVE = 512       # max_tokens 之外额外给的额度。
                    #
                    # **为什么要有额外额度：**
                    # 思考模型（deepseek-reasoner、thinking 档）的思考段也算在
                    # max_tokens 里：h3_ref 给 2400，思考可能先吃掉约 2000，正文
                    # 只剩 400 字、截在半句话上（网关把思考放进 reasoning_content，
                    # 正文看着是干净的 —— 所以这个坑不看 usage 根本发现不了）。
                    # REGIMES 那几个数是照本地 27B 的 n_ctx 定的，那边不含思考段，
                    # 不能直接拿来当 API 的上限。
                    #
                    # **调低到 512 的原因：**
                    # 原先的 2048 对非思考模型（qwen/glm 等）来说太大了 —— 本来
                    # 只需要生成 2000 tokens，却要求模型准备生成 4048 tokens，
                    # 导致生成时间翻倍。512 足够应对大多数思考模型的开销。
                    # 如果用 deepseek-reasoner 这类重度思考模型，可以改大这个值。
                    #
                    # max_tokens 是**上限不是目标**，不思考的模型写完就停，多给的
                    # 额度一个 token 都不会用到、也不多花钱。唯一的副作用是老模型
                    #（输出上限 4096 那种）可能回 HTTP 400，那种情况 HINT[400]
                    # 已经提了模型名和 max_tokens 两种可能。


class LLMError(Exception):
    """API 这条路没走通。带的话是给用户看的，会原样显示在界面上。"""


# 配置按 mtime 重读：填错 key、改模型名都不用重启抽卡系统。
_cache = {"mtime": None, "conf": {}}


def _strip(t):
    """掐掉整行的 `//` 注释 —— 模板 llm.json.例子 里的说明就是这么写的，
    照抄一份改名是最自然的用法，不该因为"JSON 不认注释"就报错。

    **只认整行**（lstrip 后以 // 开头）。行内的不动 —— `"base_url":
    "https://…"` 里那个 `//` 一切就把地址截断了，而且报的错会指向别处。
    读文件用 utf-8-sig：记事本存 UTF-8 可能带 BOM，带了就是"第 1 行第 1 列
    不认识"，跟注释一个症状、两个原因，一起在这儿解决。
    """
    return "\n".join("" if l.lstrip().startswith("//") else l
                     for l in t.split("\n"))


def load():
    try:
        mtime = CONF.stat().st_mtime
    except OSError:
        return {}
    if _cache["mtime"] != mtime:
        try:
            _cache["conf"] = json.loads(_strip(CONF.read_text("utf-8-sig")))
        except Exception as e:
            # 手写 json 漏个逗号是常事。**不能静默走本地** —— 那样用户会以为
            # "API 没配好"，实际是文件坏了，而且要等好几分钟本地跑完才有反应
            _cache["conf"] = {"_error": f"{type(e).__name__}: {e}"}
        _cache["mtime"] = mtime
    return _cache["conf"]


def ready():
    """够不够条件去试 API。不够就直接走本地，别白等一次超时。"""
    c = load()
    if c.get("_error"):
        return True                      # 让 chat() 去报这个错，用户得知道文件坏了
    return bool(c.get("enabled", True) and c.get("api_key")
                and c.get("base_url") and c.get("model"))


def where():
    """配置摘要，给 /api/health 用。**不带 key**。"""
    c = load()
    if c.get("_error"):
        return {"ok": False, "error": c["_error"]}
    return {"ok": ready(), "model": c.get("model") or "",
            "base_url": c.get("base_url") or "",
            "enabled": bool(c.get("enabled", True)),
            "has_key": bool(c.get("api_key")),
            "conf": str(CONF)}


# 推理模型（deepseek-reasoner、各家 thinking 档）多数把思考放在 reasoning_content
# 字段里，content 是干净的；但有些网关会把 <think> 段直接混进 content。
# REGIMES 的 system 明确要求"只输出提示词本身"，混进来的这段必须掐掉，
# 不然它会被当成提示词提交上去。
THINK = re.compile(r"<think>.*?</think>\s*", re.S | re.I)

HINT = {401: "key 不对或者没权限。", 403: "key 被拒了。", 404: "base_url 或模型名不对。",
        429: "被限流了（或者免费额度用完了）。", 402: "余额不足。",
        400: "请求被拒 —— 多半是模型名不对，或者这个模型不吃 temperature/max_tokens。"}


async def chat(session, system, user, max_tokens, temperature):
    """跑一轮改写。成了返回 dict，没成抛 LLMError。

    复用 app.py 那个 ClientSession，但**超时单独给**：那个 session 建的时候
    `total=None`（出图要挂几十分钟），照它来这里就永远不超时了。
    """
    c = load()
    if c.get("_error"):
        return _fail(f"{CONF.name} 读不出来（{c['_error']}），先把这个文件改对")

    url = c["base_url"].rstrip("/") + "/chat/completions"
    secs = float(c.get("timeout") or TIMEOUT)
    payload = {"model": c["model"], "stream": False,
               "messages": [{"role": "system", "content": system},
                            {"role": "user", "content": user}],
               "max_tokens": max_tokens + RESERVE, "temperature": temperature}
    try:
        async with session.post(
                url, json=payload,
                headers={"Authorization": f"Bearer {c['api_key']}",
                         "Content-Type": "application/json"},
                proxy=c.get("proxy") or None,
                timeout=aiohttp.ClientTimeout(total=secs)) as r:
            body = await r.text()
            if r.status != 200:
                return _fail(f"HTTP {r.status} —— {HINT.get(r.status, '')}"
                             f"{_short(body)}")
    except asyncio.TimeoutError:
        # 域名写错/没网也会走到这里（连接阶段的超时同样是 TimeoutError），
        # 只说"超时"会让人去调大 timeout，而该改的是 base_url
        return _fail(f"{secs:g} 秒没回话（超时；也可能是 base_url 写错了或者连不上网）")
    except aiohttp.ClientError as e:
        return _fail(f"连不上 {url}（{type(e).__name__}: {e}）")

    try:
        data = json.loads(body)
    except ValueError:
        return _fail(f"返回的不是 JSON：{_short(body)}")

    ch = (data.get("choices") or [None])[0]
    if not isinstance(ch, dict):
        # 出错时各家都爱塞一个 error 对象，200 也可能这样
        err = data.get("error") or data.get("message")
        return _fail(f"返回里没有 choices（{_short(json.dumps(err, ensure_ascii=False) if err else body)}）")

    text = THINK.sub("", str((ch.get("message") or {}).get("content") or "")).strip()
    fin = ch.get("finish_reason")
    if not text:
        return _fail(f"接口通了但正文是空的（finish_reason={fin}）"
                     + ("，多半是被内容审核拦了" if fin in ("content_filter", "stop") else ""))

    usage = data.get("usage") or {}
    return {
        "text": text,
        "model": data.get("model") or c["model"],
        "tokens": usage.get("total_tokens") or 0,
        # 截断的输出格式是不完整的（H3 那两套尤其明显：少半个字段）。
        # 不当失败处理 —— 落本地要等好几分钟，而这种残缺用户自己一眼看得出来
        # 报的是真实上限（含 RESERVE），不然用户按这个数去翻配置会找不到对应的东西
        "warn": (f"这次写到 {max_tokens + RESERVE} token 上限就被截断了，"
                 "格式可能缺一截，采用前自己看一眼" if fin == "length" else ""),
    }


def _fail(msg):
    raise LLMError(msg)


def _short(s, n=200):
    s = " ".join(str(s or "").split())
    return s[:n] + ("…" if len(s) > n else "")
