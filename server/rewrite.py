# -*- coding: utf-8 -*-
"""「✨优化」：把用户写的大白话，改写成这条能力背后那个模型真正认的提示词。

为什么要有这件事：四类底模对提示词的要求完全不是一回事（见 能力清单.md「提示词优化」）。
最极端的是 MiniMax H3 —— 官方是拿一个叫 **H3-Context-IR** 的改写服务先把用户那句话
翻成一份结构化提示词（`integrated_multimodal_description` / `overall_soundscape` /
`non_diegetic_music` 三段式，或者全参考模式的六段式），H3-Base 吃的是那份改写结果，
不是用户原话。规则原文在
`github.com/MiniMax-AI/MiniMax-H3/tree/main/skills/h3-prompt-writing/references`
（`base-en.txt` = T2VA/I2VA/FL2VA/L2VA，`ref-en.txt` = Ref2VA），下面 SHOT_RULES /
H3_BASE / H3_REF 就是照那两份浓缩的 —— 浓缩是因为本地那个 27B 的 n_ctx 只有 8192，
把 39 KB 规则全灌进去就没地方放输出了。

我们没有 H3-Context-IR，但包里现成有一个本地 27B（图生图那条反推用的就是它），
所以拿它顶这一棒：临时拼一张只有「27B + 出文本」的小图丢给 ComfyUI 跑，取回文本。
loader 参数跟 `graphs/zimage_i2i.api.json` 的 `#79` 一模一样，llama-cpp 那个节点是按配置
缓存模型的，配置对得上就不用重新加载 14 GB。

`force_offload=True`：改写完就把 27B 从显存里放掉。留着它下一次改写快，但接着要跑的
H3 是 32B 文本编码器 + DiT，14 GB 赖在显存里大概率直接 OOM —— 宁可每次慢一点。
"""
import re

# 27B 的 loader 配置。**必须跟 graphs/zimage_i2i.api.json 的 #79 逐字一致**：
# llama-cpp 那个节点按这份配置缓存已加载的模型，差一个字段就整份重新加载。
# 那边的值由 scan_workflows.py 的 LLM_SWAP 统一改出来，两处要一起动。
#
# 别换成 Qwen3.8-27B —— 包里的 llama.cpp 加载不了，原因写在 scan_workflows.py 的
# LLM_SWAP 上面（层排布写死，65 层的 3.8 对不上）。
# chat_handler 不能写 Qwen3.5-Thinking —— 节点是拿 `"Thinking" in chat_handler` 当
# think_mode，开了就会吐 <think> 段，8192 的 n_ctx 还得被它吃掉一大半。
LOADER = {
    "model": "Qwen3.5-27B-IQ4_XS.gguf",
    "mmproj": "mmproj-F16.gguf",
    "chat_handler": "Qwen3.5",       # 不是 Qwen3.5-Thinking：不要 <think> 段
    "n_ctx": 8192,
    "vram_limit": -1,
    "image_min_tokens": 0,
    "image_max_tokens": 0,
}

# =====================================================================
# 镜头语法：H3 两套规矩共用的那一半（官方 base-en.txt 第 4 章、ref-en.txt 第 5 章）
# =====================================================================
SHOT_RULES = """# Shots and cuts
`[Shot 1]` opens and carries NO timestamp. Every later shot starts with a strictly
increasing cut time inside the video duration: `[Shot N] At MM:SS.mmm, the camera cuts to ...`
Allowed cut wording: `the camera cuts to`, `the shot cuts to`, `the shot transitions to`,
`the shot changes to`, `the shot switches to`. A cut must bring new information (new
subject, space, state, viewpoint or time). If only the distance or the angle changes,
use camera motion instead of a cut.

# Camera motion = motion type + amplitude + speed
Motion type: Zoom In / Zoom Out, Push In / Pull Out, Pan Left / Pan Right,
Truck Left / Truck Right, Tilt Up / Tilt Down, Pedestal Up / Pedestal Down, Arc Shot,
Tracking Shot, Static Shot, Shake Slightly / Shake Strongly, POV,
Roll Clockwise / Roll Counterclockwise.
Amplitude: `with small amplitude` / `with large amplitude` (omit for medium).
Speed: `at slow speed` / `at fast speed` (omit for normal).
Write it as a natural English action inside the sentence, never as labels stacked at
the end: `The camera pushes in with small amplitude at slow speed toward the letter.`

# Speakers, dialogue, singing
Anyone who speaks or sings gets a stable id `(S1)`, `(S2)`, ... reused across shots.
Several already-numbered speakers together: `(S1,S2)`. Characters who never make a
sound get no id. At a speaker's first appearance establish a stable identity outside
`<d>` (type, age, gender, on/off-screen, pitch, timbre, rate, accent). Inside `<d>`
put ONLY the language tag and the spoken words, verbatim, punctuation included:
`The young woman with a quiet, breathy voice (S1) says: <d>[Chinese] 下一站我就下车。</d>`
Voiceover uses the exact phrase `says in an off-screen voiceover`, and right after the
`<d>` block state that the character's lips remain closed. A line that crosses a cut
uses `<scenetrans>` at both connecting points plus an explicit continuity phrase
(`continues seamlessly across the cut`); speech chopped off by the video ending uses
`<cutoff>`.

# On-screen text
Any sign, banner, subtitle or neon text actually visible on screen goes in English
double quotes, verbatim, untranslated: `A red neon sign reading "营业中" glows above the door.`

# overall_soundscape
1-4 English sentences, one paragraph: ambience, physical action sounds, non-verbal human
sounds (wind, rain, traffic, footsteps, fabric, impacts, breathing, laughter). Do NOT
repeat dialogue, singing or diegetic music here - those live in the description.
`N/A` only when the user asked for total silence.

# non_diegetic_music
1-3 English sentences describing score the characters cannot hear. Instrumentation,
tempo, rhythm, dynamic change only - no abstract mood words, no explaining what the
music "conveys". Music the characters CAN hear (singing, radio, TV, a phone) is
diegetic and belongs in the description instead. `N/A` when there is none."""

COMMON = """You rewrite prompts for the MiniMax H3 video model. The user writes a rough
idea, usually in Chinese. You return ONE finished H3 prompt.

Output the prompt and nothing else: no preamble, no explanation, no markdown fences,
no headings that are not part of the format below, no thinking process tags like <think> or <thinking>.

Language: write the rewrite in English. Keep dialogue, lyrics and text that is visible
on screen in their ORIGINAL language, verbatim, with their punctuation.

Every detail you write must be something the camera can see or the microphone can hear.
Never write plot summary, directorial intent, genre labels or vague praise
("cinematic", "beautiful", "emotional", "for atmosphere"). Concrete beats abstract.
Do not invent a reference label that was not listed in the facts you are given."""


H3_BASE = COMMON + """

# Output format - exactly these three fields, in this order, one blank line between them
integrated_multimodal_description: [Shot 1] ...

overall_soundscape: ...

non_diegetic_music: ...

Do NOT write a picture-alignment line at the top - the system adds it for you.

# integrated_multimodal_description
This is the body. Open `[Shot 1]` with the overall visual style and the initial framing,
then develop along the timeline: subject appearance and position, scene and key props,
actions and reactions, cuts, speech, and sound that happens on screen.
Style words that work: `Live-action`, `Cinematic`, `2D-animated`, `3D CG`, `claymation`,
`watercolor`, `vintage film`. For keyframe tasks the style must match the reference image.
Example opening: `[Shot 1] Live-action, cinematic, a medium-wide shot frames ...`

""" + SHOT_RULES

H3_REF = COMMON + """

# Output format - exactly these six sections, in this order
subject_definitions:
<Subject 1> is ...
summary:
[task type] ...
retention_analysis:
<Subject 1> (appears in [Shot 1], [Shot 2]): fully_preserved - ...
detailed_description:
<one or two sentences of overall style>
[Shot 1] ...
overall_soundscape:
...
non_diegetic_music:
...

# Reference labels
`<Subject N>` = reusable visible content taken from the references (a person, animal,
object, scene, background, costume, prop, effect, style, action or pose). This is the
content unit that actually appears in the target video.
`<Picture N>` = a reference image acting as a concrete frame (first frame, keyframe,
last frame) or a shot-planning anchor. If an image only defines a character, scene,
costume or style, do NOT give it its own line - cite it inside the `<Subject N>` that
uses it: `<Subject 1> is the young woman in <Picture 1>, with long dark hair ...`
`<Video N>` = a whole-video relationship (source being edited, continuation point,
or a reference for camera work / cutting / rhythm).
`<Audio N>` = an audio asset that is copied or referenced.
A label keeps the same meaning in every section. `<Picture>`, `<Video>` and `<Audio>`
numbers are the ones listed in the facts you are given - never renumber them.
One subject may come from several assets: `<Subject 1> is the woman whose appearance
comes from <Picture 1> and whose walking motion comes from <Video 1>.`

# summary
One short paragraph, opening with a square-bracketed task type. Pick from
`keyframe completion`, `reference generation`, `video editing`, `video continuation`,
`audio reuse`, `audio reference`; join several with ` + ` and never repeat one.
Reference images that guide a character / scene / style (rather than being a concrete
frame) are `reference generation`. `video editing` and `video continuation` are ONLY
allowed when a `<Video N>` is listed in the facts - with images and audio alone they are
always wrong. Use only labels already defined; introduce none.

# retention_analysis
One line per label, keeping the role set in subject_definitions.
Visible content markers: `fully_preserved`, `partially_preserved`, `attribute_transfer`,
`weak_reference`.
Audio markers: `fully_copy`, `partially_copy`, `reference`, `weak_reference`.
`<Subject 1> (appears in [Shot 1], [Shot 3]): fully_preserved - the blonde hair and
light-pink shirt are retained.`
`<Audio 1>: reference - the speaker follows its timbre without copying the signal.`
Do not write speaker ids `(Sx)` in this section. New actions or backgrounds added by
the target video are not losses of fidelity.

# detailed_description
The body, in playback order. State the overall style in one or two sentences BEFORE
`[Shot 1]` (not inside it). Insert each label at its first real appearance and wherever
its role applies; describe what is actually visible rather than listing relationships.
Natural phrasing for frame anchors: `the shot begins from <Picture 1>`,
`the shot ends on <Picture 3>`. Aim for 350-500 English words; dialogue-heavy content
should fit the whole spoken timeline instead of hitting a word count.
When a defined subject speaks, keep both labels: `<Subject 2> (S1) says, <d>[Chinese] ...</d>`

""" + SHOT_RULES

ZIMAGE = """你是 Z-Image 文生图模型的提示词改写器。用户给一句大白话，你还它一段这个模型认的提示词。

只输出改写后的提示词本身：不要开场白、不要解释、不要 markdown 代码块、不要分点、不要思考过程标签（如 <think> 或 <thinking>）。

用中文写（这个模型的文本编码器是 Qwen3 4B，中文描述最准）。写成**一段连贯的话**，
不要写成逗号分隔的标签串。

这个模型有三条硬限制，写的时候必须绕开：
1. **没有负面提示词** —— 工作流把负面条件清零了。所以「不要模糊」「避免多余的手」
   这类反向说法一个字都不许写，只能正面说要什么（要「五指清晰的手」就直说）。
2. **权重语法全部无效** —— cfg = 1，`(词:1.3)`、`((词))`、`[词]` 只会被当成普通字符
   混进描述里。想强调就把那件事写得更具体、放在更靠前的位置。
3. 别写 `--ar 16:9`、`8k`、`masterpiece` 这类平台参数和空洞质量词，画面比例和分辨率
   是卡片上的旋钮管的。

按这个顺序把用户那句话铺开：主体是谁/是什么 → 长相、衣着、材质细节 → 在做什么、
什么表情 → 环境和背景里看得见的东西 → 光线（方向、冷暖、硬软）→ 景别和镜头感
（半身/特写、浅景深、俯拍）→ 整体画风或介质（写实摄影、水彩、3D 渲染、胶片颗粒）。

守住用户的原意：他点名的主体、动作、场景一个都不能换掉，你只负责把没说的细节补齐。
用户没提的地方可以合理补，但别加他明显不想要的东西（他说「一个人」就别变成一群人）。
画面里没有的东西不要写。"""

KLEIN = """你是 Flux.2 Klein「参考图编辑」的提示词改写器。用户给一句大白话，
你还他一句这个模型认的**编辑指令**。

只输出改写后的提示词本身：不要开场白、不要解释、不要 markdown 代码块、不要思考过程标签（如 <think> 或 <thinking>）。用中文写。

这条能力的机制：参考图被直接编码成 latent 挂进条件里，人物长相和画风由原图约束住，
提示词**只用来说「改什么」**。所以：
1. **不要从零描述整张画面** —— 那是文生图的写法，会把原图的人物冲掉。只写要动的那部分。
2. **必须点名是哪张图**：只放 1 张时说「图1」；放 2 张时「图1 是要改的画面、
   图2 是参考素材（衣服/脸/人物/场景从图2 来）」。
3. **必须把要保住的东西明写出来** —— 不写就会被改掉。常用的一串是
   「相貌、发型、光线和画风保持不变」，按用户的意图挑该保的那几项。
4. 没有负面提示词、权重语法也无效，别写「不要…」和 `(词:1.2)`。

写成一到两句话，长度别超过用户原意需要的量。典型形状：
「让图1的人物换上图2的衣服，相貌、发型、光线和画风保持不变。」
「把图1的背景换成黄昏的海边，人物的相貌、姿势、服装和画风保持不变。」

守住用户的原意：他要改哪里就改哪里，别顺手多改别的。"""

REGIMES = {
    "h3_base": {"system": H3_BASE, "max_tokens": 1400, "temperature": 0.7},
    "h3_ref": {"system": H3_REF, "max_tokens": 2400, "temperature": 0.7},
    "zimage": {"system": ZIMAGE, "max_tokens": 700, "temperature": 0.8},
    "klein": {"system": KLEIN, "max_tokens": 400, "temperature": 0.7},
}
H3 = ("h3_base", "h3_ref")


# =====================================================================
# 文本卡片：通用文字加工（润色/优化/扩写/自定义提示词）
# =====================================================================
# 这套跟上面 REGIMES 不是一回事：REGIMES 是「给某个底模写提示词」的规矩，
# 这儿是画布上文本卡片那几种通用加工 —— 输入输出都是给人看的文字，
# 不绑定任何工作流。key 跟卡片模式 id 一一对应（text_polish -> "polish"）。
# 翻译那种要等用户选定方案再进来，别先塞占位。
T_POLISH = """你是中文文字润色器。把用户给的文字改得更通顺、更好读，可以调整语序、
替换更好的用词、修掉病句和重复，但不许改变意思、不许增删事实、不许改变语气人称。

只输出润色后的文字本身：不要开场白、不要解释、不要 markdown 代码块、不要思考过程标签（如 <think> 或 <thinking>）。
保持原文的语言（中文的润色成中文，英文的润色成英文）和分段方式。"""

T_OPTIMIZE = """你是文字优化器。把用户给的文字改写得更精炼、更有表现力：
删掉废话和套话，把含糊的表达换成具体的说法，句子节奏更好，重点更突出。
不许编造原文没有的事实，不许改变作者的立场和语气。

只输出优化后的文字本身：不要开场白、不要解释、不要 markdown 代码块、不要思考过程标签（如 <think> 或 <thinking>）。
保持原文的语言和分段方式。长度跟原文相当（最多不超过 1.3 倍）。"""

T_EXPAND = """你是文字扩写器。把用户给的文字扩写得更丰富、更具体：
补充符合原意的细节、过渡和描写，让画面感和信息量更足。
不许偏离或改变原意，不许编造跟原文冲突的事实。

只输出扩写后的文字本身：不要开场白、不要解释、不要 markdown 代码块、不要思考过程标签（如 <think> 或 <thinking>）。
保持原文的语言和分段方式，长度约为原文的 2~3 倍。"""

T_CUSTOM = """你按用户给的指令处理文字。指令说什么就做什么；指令没提到的方面
（语言、语气、格式）保持原样。指令和文字冲突时，以指令为准。

只输出处理后的文字本身：不要开场白、不要解释、不要 markdown 代码块、不要思考过程标签（如 <think> 或 <thinking>）。"""

T_TRANSLATE = """你是专业翻译。根据输入文字的语言自动判断：
- 如果是中文，翻译成自然流畅的英文
- 如果是英文，翻译成自然流畅的中文
- 其他语言，翻译成英文

只输出翻译结果本身，不要开场白、不要解释、不要 markdown 代码块、不要思考过程标签（如 <think> 或 <thinking>）。
翻译时保持原文的意境和专业术语准确性。"""

# 反推提示词的 system prompt 直接留空，因为工作流中已经包含了完整的提示词
T_REVERSE_PROMPT = ""

TEXT_OPS = {
    "polish":   {"name": "润色", "system": T_POLISH,
                 "max_tokens": 2000, "temperature": 0.5},
    "optimize": {"name": "优化", "system": T_OPTIMIZE,
                 "max_tokens": 2000, "temperature": 0.6},
    "expand":   {"name": "扩写", "system": T_EXPAND,
                 "max_tokens": 3000, "temperature": 0.8},
    "custom":   {"name": "自定义提示词", "system": T_CUSTOM,
                 "max_tokens": 3000, "temperature": 0.7},
    "translate": {"name": "翻译", "system": T_TRANSLATE,
                 "max_tokens": 2000, "temperature": 0.3},
    "reverse_prompt": {"name": "反推提示词", "system": T_REVERSE_PROMPT,
                 "max_tokens": 2000, "temperature": 0.8,
                 "uses_workflow": True},  # 标记这个操作使用工作流而非直接LLM
}


def text_user_msg(op, params, inputs):
    """文本卡跑的时候喂给模型的用户消息。输入可能有好几段（一张卡收多根连线），
    每段标上它是哪张卡来的，模型才分得清哪段是什么。"""
    cfg = TEXT_OPS[op]
    blocks = []
    instr = str(params.get("instr") or "").strip()
    if op == "custom":
        blocks.append("【指令】\n" + (instr or "（指令是空的，把文字原样整理一遍）"))
    for i, (name, text) in enumerate(inputs):
        blocks.append(f"【文字 {i + 1}】（来自「{name}」）\n{text.strip()}")
    if not inputs:
        blocks.append("【文字】\n（没接任何上游，也没有附加文字 —— "
                      "照" + ("指令" if op == "custom" else "这项操作")
                      + "的意思自己写一段合适的内容）")
    blocks.append(f"现在对上面的文字做「{cfg['name']}」，只输出结果本身。")
    return "\n\n".join(blocks)


def text_clean(raw):
    """文本卡的输出不需要 clean() 那套 H3 修补，只掐代码块围栏和交代话。"""
    t = FENCE.sub("", (raw or "").strip()).strip()
    # 有些模型会返回 <think>推理过程</think>，这部分不要（DeepSeek R1 / QwQ 等）
    t = re.sub(r"<think>.*?</think>", "", t, flags=re.DOTALL | re.IGNORECASE).strip()
    t = re.sub(r"<thinking>.*?</thinking>", "", t, flags=re.DOTALL | re.IGNORECASE).strip()
    t = re.sub(r"<thought>.*?</thought>", "", t, flags=re.DOTALL | re.IGNORECASE).strip()
    return LEADIN.sub("", t, count=1).strip()


# =====================================================================
# 喂给 27B 的那份「用户消息」
# =====================================================================
def facts(cap, spec, params, assets):
    """硬性事实：模型自己看不见的那些（有几张参考图、多长、音频在不在）。

    编号规则跟 ComfyUI 那边**必须**对齐：`comfy/text_encoders/minimax.py` 是按
    请求顺序、每种类型各自从 1 开始拼 `<Picture i>` / `<Audio j>` / `<Video k>`
    的，所以第 n 个填了图的槽就是 `<Picture n>` —— 空槽不占号（服务端会把线拔掉）。
    """
    out = []
    keys = lambda t: [s["key"] for s in cap.get("inputs") or [] if s["type"] == t]
    pics = [k for k in keys("image") if assets.get(k)]
    auds = [k for k in keys("audio") if assets.get(k)]
    vids = [k for k in keys("video") if assets.get(k)]
    labels = {s["key"]: s.get("label") or s["key"] for s in cap.get("inputs") or []}

    if spec.get("regime") in H3:
        out.append(f"- Target duration: {duration(cap, params):.2f} seconds. "
                   "The shots you write must add up to it, and every cut time must fall inside it.")
    # mode 那两句是在给具体某张图指位置，图还没放的时候写它就是对空气说话 —— 而且会跟
    # 下面「没有参考图」那句直接打架（用户完全可能先写词、点优化，再回头去放图）。
    mode = spec.get("mode")
    if (mode == "I2VA" and pics) or (mode == "FL2VA" and len(pics) == 1):
        out.append("- `<Picture 1>` IS the video's frame at 0.00 seconds and belongs to `[Shot 1]`. "
                   "Anchor Shot 1 on it (style, subject, framing, scene), keeping identity, "
                   "clothing, colours, key objects and spatial relations, then describe what "
                   "happens next: anchor -> action onset -> development -> result.")
    elif mode == "FL2VA" and len(pics) >= 2:
        out.append("- `<Picture 1>` is the opening frame and `<Picture 2>` is the closing frame. "
                   "Do not describe two still images - write the motion path between them: "
                   "first-frame state -> observable intermediate changes -> narrowing differences "
                   "-> last-frame state, reached at the very end. Prefer ONE single shot so the "
                   "model can interpolate continuously.")
    elif pics:
        # 括号里是这个槽在卡上的名字（「场景」「角色」…），它说明这张图是干什么用的。
        # 用户嘴里的「第 2 张图 / 图2」就是 <Picture 2>，两边对不上时以槽位名为准 ——
        # 图是插在槽里的，槽位名才是它真正的角色。
        out.append("- Reference images, in order: "
                   + "、".join(f"<Picture {i + 1}>（{labels[k]}）" for i, k in enumerate(pics))
                   + ". The name in brackets is what that slot is for. When the user says "
                     "\"the Nth image\" / \"图N\", they mean `<Picture N>`; if their wording "
                     "contradicts the slot name, trust the slot name.")
    if not pics:
        out.append("- No reference image is attached, so do not mention `<Picture N>` at all."
                   + (" This capability normally needs one, so the user simply has not put it in "
                      "yet: write the opening scene from scratch instead of referring to a frame."
                      if mode else ""))
    if auds:
        out.append(f"- Audio attached: {'、'.join(f'<Audio {i + 1}>' for i in range(len(auds)))}.")
    if spec.get("audio"):
        out.append("- This capability is AUDIO-DRIVEN: the speech or singing comes from that audio "
                   "file and drives the mouth. Do NOT invent any `<d>` dialogue or lyrics. Describe "
                   "who is performing, the delivery, the expression and the body language, and cite "
                   "`<Audio 1>` as the vocal source.")
    if vids:
        out.append(f"- Reference video attached: {'、'.join(f'<Video {i + 1}>' for i in range(len(vids)))}.")
    if spec.get("regime") == "klein":
        out.append(f"- 用户放了 {len(pics)} 张图" + ("（图1 是要改的画面，图2 是参考素材）。"
                                                 if len(pics) > 1 else "（只有图1，没有参考素材图）。"
                                                 if pics else "（还没放图，就按「图1」写）。"))
    return out


def duration(cap, params):
    """这一轮要出多少秒。H3 的 <S.SS> 和「镜头加起来多长」都靠它。

    大多数 H3 卡有「时长(秒)」这个旋钮；说话唱歌那两条没有，出片长度由音频选区
    （audio_start / audio_end）决定，所以从那两个时间戳算。
    """
    val = lambda k: params.get(k) if params.get(k) not in (None, "") else next(
        (s.get("default") for s in cap.get("inputs") or [] if s["key"] == k), None)
    d = val("duration")
    if d not in (None, ""):
        return float(d)
    a, b = secs(val("audio_start")), secs(val("audio_end"))
    return (b - a) if (a is not None and b is not None and b > a) else 5.0


def secs(t):
    m = re.fullmatch(r"\s*(?:(\d+):)?(\d+(?:\.\d+)?)\s*", str(t or ""))
    return int(m.group(1) or 0) * 60 + float(m.group(2)) if m else None


def user_msg(cap, spec, params, assets, prompt, style):
    zh = spec["regime"] not in H3
    head = "【用户想要的】" if zh else "# What the user asked for"
    blocks = [f"{head}\n{prompt.strip() or '（用户什么都没写，按下面的素材和事实自己定一个合理的内容）'}"]
    if style:
        # 风格必须**写进**输出里。用户选了「优化后」那个页签，提交的就是这份输出原样，
        # 系统不会再另外拼一遍风格卡（见 web/app.js 的 payloadOf）—— 这里不写，
        # 风格就整个丢了。所以是"融进去"，不是"对齐、别重复"。
        blocks.append(("【这张卡挂了风格卡，风格文字是】\n" if zh
                       else "# A style card is attached to this card. Its text is\n")
                      + style.strip()
                      + ("\n这段风格**必须融进你的输出里** —— 用户采用你这份改写之后，"
                         "系统不会再另外附上这段原文，你不写风格就丢了。别整段照抄，"
                         "把它讲的画面质感、色调、光线、介质摊开写成具体的画面描述"
                         "（它说定格动画，就别写实拍）。"
                         if zh else
                         "\nThat style MUST be folded INTO your output: state it in English at the "
                         "very beginning of `[Shot 1]` (the format requires style and initial "
                         "composition there) and keep every shot's palette, lighting and medium "
                         "consistent with it - if it says stop-motion clay, do not write "
                         "live-action. The system will NOT append that text separately, so a style "
                         "you leave out is a style that is lost."))
    f = facts(cap, spec, params, assets)
    if f:
        blocks.append(("【硬性事实，必须照做】\n" if zh else "# Hard facts you must honour\n")
                      + "\n".join(f))
    blocks.append("现在输出改写后的提示词，只输出提示词本身。" if zh
                  else "Now output the rewritten prompt. The prompt only.")
    return "\n\n".join(blocks)


# =====================================================================
# 临时图：27B + 出文本，没有采样器
# =====================================================================
def build_graph(system, user, max_tokens, temperature, seed):
    """「本地 27B 跑一段文字」的临时图。提示词改写（REGIMES）和文本卡
    （TEXT_OPS）共用这一张 —— 只要 system / user / 采样参数，不绑定任何一套规矩。"""
    return {
        "1": {"class_type": "llama_cpp_model_loader", "inputs": dict(LOADER),
              "_meta": {"title": "改写模型"}},
        "2": {"class_type": "llama_cpp_parameters", "inputs": {
            "max_tokens": max_tokens, "top_k": 30, "top_p": 0.9, "min_p": 0.05,
            "typical_p": 1, "temperature": temperature, "repeat_penalty": 1,
            "frequency_penalty": 0, "presence_penalty": 1, "mirostat_mode": 0,
            "mirostat_eta": 0.1, "mirostat_tau": 5, "state_uid": -1},
            "_meta": {"title": "改写参数"}},
        # preset_prompt 选空的那条：custom_prompt 非空且预设名里没有 "*" 时，
        # 节点只用 custom_prompt —— 提示词整份由我们给，不掺预设文案。
        # inference_mode 用 "one by one"：另外两档会往 system 里塞一句
        # "请将输入的图片序列当做视频…"，这里没有图，那句纯干扰。
        "3": {"class_type": "llama_cpp_instruct_adv", "inputs": {
            "llama_model": ["1", 0], "parameters": ["2", 0],
            "preset_prompt": "Empty - Nothing", "custom_prompt": user,
            "system_prompt": system, "inference_mode": "one by one",
            "max_frames": 24, "max_size": 256, "seed": seed,
            "force_offload": True, "save_states": False},
            "_meta": {"title": "改写提示词"}},
        "4": {"class_type": "ShowText|pysssss", "inputs": {"text": ["3", 0]},
              "_meta": {"title": "改写结果"}},
    }


TEXT_NODE = "4"


# =====================================================================
# 收尾：把模型嘴里那点毛病修掉
# =====================================================================
FENCE = re.compile(r"^\s*```[a-zA-Z]*\s*|\s*```\s*$")
# H3 的标签只有 <Picture n> 这一种写法是对的。模型爱写 Picture 1、[Picture 1]、
# <picture1>，编码器那边是当普通文字读的（见 comfy/text_encoders/minimax.py），
# 对不上就等于没点名，多张参考图会串。
LABEL = re.compile(r"[<\[（(]?\s*\b(Picture|Video|Audio|Subject)\s*#?\s*(\d+)\s*[>\]）)]?",
                   re.IGNORECASE)
NAMES = {"picture": "Picture", "video": "Video", "audio": "Audio", "subject": "Subject"}
SECTIONS = {"h3_base": "integrated_multimodal_description",
            "h3_ref": "subject_definitions"}
# 「改写后的提示词：」「Here is the rewritten prompt:」这种交代话
LEADIN = re.compile(r"^\s*\S{0,40}?[：:]\s*$", re.MULTILINE)
# summary 那段必须以「[任务类型]」开头（官方 ref-en.txt §3）。类型是个封闭集合，
# 模型偶尔会把方括号漏掉 —— 名字对着就直接补上，不用为这个再跑一轮
TASKS = ("keyframe completion", "reference generation", "video editing",
         "video continuation", "audio reuse", "audio reference")
SUMMARY = re.compile(r"(^summary:\s*\n?[ \t]*)(%s)(?:\s*\+\s*(?:%s))*"
                     % ((("|".join(TASKS),) * 2)), re.MULTILINE | re.IGNORECASE)


def clean(text, spec, cap, params, assets):
    """返回 (提示词, 提醒)。提醒是给人看的一句话，不改文本。"""
    t = FENCE.sub("", (text or "").strip()).strip()
    # 过滤 <think> 标签（DeepSeek R1 / QwQ 等推理模型）
    # 支持多种格式：<think>...</think>、<Think>...</Think>、<thinking>...</thinking>
    t = re.sub(r"<think>.*?</think>", "", t, flags=re.DOTALL | re.IGNORECASE).strip()
    t = re.sub(r"<thinking>.*?</thinking>", "", t, flags=re.DOTALL | re.IGNORECASE).strip()
    t = re.sub(r"<thought>.*?</thought>", "", t, flags=re.DOTALL | re.IGNORECASE).strip()
    reg = spec["regime"]
    warn = []

    sec = SECTIONS.get(reg)
    if sec:
        # 格式的第一个字段之前的话一律不要：既清掉「Here is…」，也清掉模型自己
        # 多写的那句对齐说明（那句由我们算，模型算不准 —— 它不知道成片多长）
        i = t.find(sec)
        if i > 0:
            t = t[i:]
        elif i < 0:
            warn.append(f"输出里没找到 {sec}: 这一段，格式可能不对，采用前自己看一眼")
    else:
        t = LEADIN.sub("", t, count=1).strip()

    if reg in H3:
        t = LABEL.sub(lambda m: "<%s %d>" % (NAMES[m.group(1).lower()], int(m.group(2))), t)
        warn += label_warns(t, cap, assets)
    if reg == "h3_ref":
        t = SUMMARY.sub(lambda m: m.group(1) + "[" + m.group(0)[len(m.group(1)):] + "]", t)
    if reg == "h3_base":
        # 对齐说明是在给参考图指位置，图还没放的时候写它就是对空气说话
        if [s for s in cap.get("inputs") or []
                if s["type"] == "image" and assets.get(s["key"])]:
            t = align_line(t, spec, cap, params) + "\n\n" + t
        elif spec.get("mode"):
            warn.append("优化的时候还没放图，出来的词里没有对首帧的锚定 —— "
                        "把图放好再优化一次会准得多")
    return t.strip(), "；".join(warn)


def label_warns(t, cap, assets):
    """点名的编号超过真实素材数 = 那一句在对空气说话，得说出来。"""
    have = {"Picture": "image", "Audio": "audio", "Video": "video"}
    out = []
    for name, typ in have.items():
        n = len([s for s in cap.get("inputs") or []
                 if s["type"] == typ and assets.get(s["key"])])
        used = [int(m) for m in re.findall(r"<%s (\d+)>" % name, t)]
        if used and max(used) > n:
            out.append(f"输出里点了 <{name} {max(used)}>，可这张卡只有 {n} 份对应素材"
                       f"（多出来的那句没有素材对得上，会白写）")
    return out


def align_line(t, spec, cap, params):
    """成片开头那句「参考图对到第几秒」。

    官方 base-en.txt 规定它必须是**第一行**，后面空一行才是三段式。它由我们算不由
    模型写：里面的秒数是成片时长（卡上的旋钮说了算），`Shot N` 是最后一个镜头的号 ——
    模型写完才知道，所以在这儿数一遍。
    """
    d = duration(cap, params)
    shots = [int(m) for m in re.findall(r"\[Shot (\d+)\]", t)] or [1]
    if spec.get("mode") == "I2VA":
        return ("For the target video, at 0.00 seconds into the target video, "
                "<Picture 1> (from [Shot 1]) is fully referenced.")
    return ("How the reference pictures align with the target video — Picture 1 (from Shot 1) "
            "aligns with the 0.00-second mark of the target video; "
            f"Picture 2 (from Shot {max(shots)}) aligns with the {d:.2f}-second mark "
            "of the target video.")
