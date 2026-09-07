# -*- coding: utf-8 -*-
"""
抽卡系统 — 工作流自动扫描器

作用：读 ComfyUI 界面格式工作流 json ->
  1) 转成 API 格式（可直接 POST /prompt 的模板）  -> graphs/<id>.api.json
  2) 自动推导画布卡片的输入槽（图/音频/提示词/时长/尺寸/种子）-> manifests/<id>.json
  3) 按"输入签名"把工作流自动归并成同一张卡的不同模式 -> manifests/_groups.json

用法：
  python_embeded\\python.exe chouka\\server\\scan_workflows.py            # 扫默认清单
  python_embeded\\python.exe chouka\\server\\scan_workflows.py <文件或目录> ...
"""
import json
import hashlib
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent          # chouka/
COMFY = ROOT.parent / "ComfyUI"
WF_DIR = COMFY / "user" / "default" / "workflows"
OBJECT_INFO = ROOT / "data" / "object_info.json"
ZH_CACHE = ROOT / "data" / "zh_nodes.json"
ZH_PACK = COMFY / "custom_nodes" / "ComfyUI-Chinese-Translation" / "zh-CN" / "Nodes"
COMFY_URL = "http://127.0.0.1:8188"
MISSING = object()          # 「widgets_values 里根本没这一项」，区别于「值是 None」
# 种子后面那个「生成后控制」下拉的取值，它在 widgets_values 里白占一格
CONTROL_AFTER = ("randomize", "fixed", "increment", "decrement")

# P0 默认扫描清单：相对 WF_DIR 的路径 -> 固定 id
# 这里的先后顺序就是画布菜单里模式的排列顺序（同一张卡内按图槽数排，图槽数一样的看这里），
# 所以「文生图 / 图生图」挨着写，别被分镜插在中间。
ALIASES = {
    "4-Z-Image全系列/z-Image-标准版文生图.json": "zimage_t2i",
    "4-Z-Image全系列/Z-Image 图生图-反推 .json": "zimage_i2i",
    "7-kear2全系列/全自动krea2文生图.json": "krea2_t2i",
    "3-Flux2-klein全系列/flux-2-klein-单-多图编辑.json": "flux2_klein_edit",
    "3-Flux2-klein全系列/九宫格Qwen3.5-Flux2-Kelin一键故事分镜.json": "flux2_klein_storyboard9",
    "1-minimax H3/@MinimaxH3：图生视频 (4步加速版).json": "minimax_h3_i2v",
    "1-minimax H3/@MinimaxH3：首尾帧生视频（4步加速版）.json": "minimax_h3_flf2v",
    "1-minimax H3/@MiniMax H3_ 说话唱歌 单人（4步加速版）.json": "minimax_h3_talk1",
    "1-minimax H3/@MiniMax H3_ 说话唱歌 双人（4步加速版）.json": "minimax_h3_talk2",
    "1-minimax H3/MiniMax H3  四图全能参考单采.json": "minimax_h3_ref4",
    "1-minimax H3/MiniMax H3 全能参考(通用) 九图+视频.json": "minimax_h3_ref9",
    "1-minimax H3/Minimax H3 多图全能二采-V2.json": "minimax_h3_ref_2pass",
    "1-minimax H3/@minimax-批量化漫剧20宫格-直出1分钟视频V3.json": "minimax_h3_comic20",
    "1-minimax H3/MinimaxH3长视频动作迁移人物替换+长视频数字人工作流.json": "minimax_h3_character_transfer",
    "0-工具箱/四图拼四宫格.json": "grid4_stitch",
    "0-工具箱/人物提取.json": "rmbg_cutout",
    "0-工具箱/抠出背景.json": "rmbg_bgonly",
    "0-工具箱/人物擦除.json": "rmbg_erase",
    "SeedVR2图片视频高清/视频补帧插针(GIMM-VFI).json": "gimmvfi_interp",
    "SeedVR2图片视频高清/SeedVR2图片高清放大.json": "seedvr2_image_up",
    "SeedVR2图片视频高清/SeedVR2视频高清修复放大 v2.json": "seedvr2_video_up",
    "Qwen3.5VL大语言模型全套/qwen3.5-单图反推提示词.json": "qwen_image_reverse",
    "Qwen3.5VL大语言模型全套/qwen3.5-视频反推提示词-修改版.json": "qwen_video_reverse",
}

# 画布上的模式名（人工微调）。没写的能力走 short_name() 自动清洗文件名。
# 要求：一眼看出这个工作流干什么，不带 @ 前缀、不带"4步加速版"这类实现细节。
DISPLAY = {
    "zimage_t2i": "文生图",
    "zimage_i2i": "图生图",
    "krea2_t2i": "文生图",
    "flux2_klein_edit": "参考图编辑(保人物)",
    "flux2_klein_storyboard9": "多宫格故事分镜",
    "minimax_h3_i2v": "H3 图生视频",
    "minimax_h3_flf2v": "H3 首尾帧生视频",
    "minimax_h3_talk1": "H3 说话唱歌·单人",
    "minimax_h3_talk2": "H3 说话唱歌·双人",
    "minimax_h3_ref4": "H3图片参考",
    "minimax_h3_ref9": "H3全能参考",
    "minimax_h3_ref_2pass": "H3全能参考(高质量)",
    "minimax_h3_comic20": "漫剧4宫格",
    "minimax_h3_character_transfer": "H3人物迁移",
    "grid4_stitch": "四图拼四宫格",
    "rmbg_cutout": "人物提取",
    "rmbg_bgonly": "抠出背景",
    "rmbg_erase": "人物擦除",
    "gimmvfi_interp": "视频补帧插针(GIMM-VFI)",
    "seedvr2_image_up": "SeedVR2 图片高清放大",
    "seedvr2_video_up": "SeedVR2 视频高清放大",
    "qwen_image_reverse": "Qwen 单图反推提示词",
    "qwen_video_reverse": "Qwen 视频反推提示词",
}

# 画布上单独占一张卡的能力。默认按产出类型归并（都出视频就都在「生视频」里当模式），
# 只有玩法差别大、不该藏在别人模式列表里第 N 项的才写进来。
# 注意：素材形态有要求（比如漫剧要宫格拼图）不是单独成卡的理由 —— 那是这条模式的
# 用法说明，面板上有 note 提示就够了。
# 现在工具类（拼图/抠图/擦除/补帧/画质增强）合并成一张「工具箱」卡、卡内用模式切换，
# 所以这里只剩补帧在 SOLO 里那一条已经失效 —— 工具统一归到 card_tools，不再单独成卡。
SOLO = set()

# 工具箱合并卡：只加工素材、不创作的玩法全部收进这一张卡，卡内用模式切换（同卡影视频）。
# 这些工作流的输入形态各不相同（有的吃 4 张图、有的吃 1 张、补帧吃视频），参数也对不上，
# 画不出"并集"面板 —— 所以是模式切换，不是张数阶梯 / 素材路由。
# card_enhance（画质增强）走 ROUTE_CARDS，是"放图/放视频切到对应那一路"，这里一并收进来当模式。
TOOLS = {
    "grid4_stitch", "rmbg_cutout", "rmbg_bgonly", "rmbg_erase", "gimmvfi_interp",
}
TOOLS_CARD = {"id": "card_tools", "name": "工具箱", "icon": "🧩"}

# 按素材类型路由的合并卡：一张卡，放图片跑一条工作流、放视频跑另一条。
# 和 ladder（按图片张数路由，见 build_modes）不是一回事 —— 那边是同一件事的不同张数、
# 参数完全一样，能画一张"并集"面板；这边两条工作流做的是同一件事（都是 SeedVR2
# 重画放大），但一条吃图一条吃视频，参数对不上（视频那条多了帧率、只处理前几帧、
# 最长边上限），画不出并集面板，所以放素材那一刻就把卡切成对应的能力。
# 进了这里的能力默认不再单独成卡；想同时保留自己那张卡的写进 SOLO。
ROUTE_CARDS = {
    "card_enhance": {
        "name": "画质增强", "icon": "✨",
        # 排在前面的那路是卡片的初始状态（图片更常见也更快，所以图片在前）
        # 视频那一路是 SeedVR2 视频放大，不是补帧 —— 「画质增强」问的是"清不清楚"，
        # 补帧改的是"顺不顺滑"，是另一件事，它有自己那张卡（gimmvfi_interp 在 SOLO 里）
        "route": {"image": "seedvr2_image_up", "video": "seedvr2_video_up"},
        # 入口那一格的文案：卡片上只有一格，两种素材都收，所以不能叫「图片」
        "entry": {"label": "素材",
                  "hint": "图片和视频都收，放进来就照着原样重画一遍、画得更清楚。"
                          "参数会自动换成对应的那一套。"
                          "想让视频更顺滑（补中间帧）请用「视频补帧插针」那张卡。"},
    },
}

# 风格卡：画布上唯一一张**不对应任何工作流**的卡。它没有 manifest、没有能力，
# 自己也不跑 —— 只存一段风格描述，连到哪张卡就在提交时并进那张卡的提示词里。
# 于是"整条链子统一一个风格"变成改一处：风格卡改一次，挂在它下游的卡全跟着变。
# modes 里那条的 id 不是能力 id（CAPS 里查不到），前端按 kind == "style" 单独走一套。
# 写在扫描器里而不是前端写死：「新建卡片」菜单是照 _cards.json 画的，
# 卡片定义只该有一个来源，不然加一张卡要改两个地方。
STYLE_CARD = {
    "id": "card_style", "name": "风格化提示词", "icon": "🎨",
    "outputType": "text", "kind": "style",
    "modes": [{"id": "style_text", "name": "风格化提示词", "slots": "img0+aud0+vid0"}],
}

# 文本卡片：画布上的文字卡，**只有这一种**（用户明确不要多类型）。
# 跟风格卡一样没有 manifest、不进 CAPS —— 前端按 kind == "text" 单独走一套（isText）。
# 卡上直接写字；要加工就在参数面板里选「加工方式」（润色/优化/扩写/自定义指令，
# 对应服务端 TEXT_OPS 的 op 名），收多条文本输入，交给大模型（云端 API 或本地 27B）
# 加工完**写回这张卡的文字**，再往下连。不加工就是一张纯文本卡。
# 翻译等用户选定接入方案后再加（加进 TEXT_OPS + 面板的加工方式里），别先塞。
TEXT_CARD = {
    "id": "card_text", "name": "文本卡片", "icon": "✍",
    "outputType": "text", "kind": "text",
    "modes": [{"id": "text", "name": "文本卡片", "slots": "img0+aud0+vid0"}],
}

# 素材卡：底部工具条「上传」出来的那张卡。跟文本卡/风格卡一样没有 manifest、不进 CAPS，
# 前端按 kind == "asset" 单独走一套（isAsset）。它自己不跑、不出产物 —— 只拿着一份
# 上传上来的图片/视频/音频，把它的出口连到别的卡就等于把这份素材放进那张卡的槽里。
# 为什么要这张卡：一份素材经常要喂给好几张卡（同一张脸既生视频又抠图），
# 以前只能在每张卡的格子里各传一次；有了素材卡就是传一次、拉几根线。
ASSET_CARD = {
    "id": "card_asset", "name": "素材", "icon": "📎",
    "outputType": "image", "kind": "asset",
    "modes": [{"id": "asset", "name": "素材", "slots": "img0+aud0+vid0"}],
}

# 要把工作流里「关着的备用素材槽」开出来的能力（见 revive_bypassed）。
# 四图参考的第 4 个图槽在模板里是绕过状态，名字叫四图、实际只有三格。
# 多图全能二采：9图+1视频+3音频，默认只开2图，其他都是备用槽
# ref9 和 ref4：虽然槽位都是激活的，但加入 REVIVE 是为了统一处理槽位标签
REVIVE = {"minimax_h3_ref4", "minimax_h3_ref9", "minimax_h3_ref_2pass"}

# 这个工作流把视频和人物图封在 TimelineDirector 的 timeline_data 字符串中，普通扫描器
# 看不到素材槽。API 图和素材槽由下面的专用规则维护，避免重扫时把模式扫成“无素材”。
H3_CHARACTER_TRANSFER = "minimax_h3_character_transfer"
MANUAL_API = {H3_CHARACTER_TRANSFER}

# 这两条工作流按「视频、图片、音频」排列引用类型，但全部素材都可选；空槽会断开
# 模板里的对应支线，不能让 example.mp4 / 演示图在用户没引用素材时悄悄参与运行。
VIDEO_REFERENCE_FIRST = {"minimax_h3_ref9", "minimax_h3_ref_2pass"}

# 参考图生视频那两张卡共用这一条。它比别的说明长，因为这张卡跑废最常见的原因
# 不是参数不对，而是提示词写成了给人看的分镜表格 —— 模型只认"看得见的画面"。
VIDEO_REF_NOTE = (
    "视频引用在提示词里按顺序对应 <Video 1>；图片引用按顺序对应 <Picture 1>、"
    "<Picture 2>……。所有素材都可选，视频可参考动作和镜头节奏，图片可补人物、场景、"
    "服装等外观。\n"
)

REF_PROMPT_NOTE = (
    "多张参考图要在提示词里点名才不串：第 1 张是 <Picture 1>，第 2 张是 <Picture 2>，"
    "依次往下。图从第一格开始按顺序填，中间空格会让后面的图顺位提前。\n"
    "提示词只写「镜头里看得见、听得见」的东西。这几种写法它一律读不懂，"
    "还会把真正的画面描述冲淡：\n"
    "· 分镜表格（镜号／景别／运镜 那种带表头的一大片）—— 改成一句句话写；\n"
    "· 导演阐述、创作意图（「突出人物的渺小」「为后续做铺垫」）—— 直接删掉，"
    "改成写画面上的结果；\n"
    "· 「你是导演某某」这类交代身份的话 —— 它不是聊天模型，这句纯占位置，"
    "想要某种质感就直接描述质感（胶片颗粒、冷暖对比光）。\n"
    "每个镜头写清「第几秒到第几秒 + 景别 + 谁在做什么 + 镜头怎么动」，"
    "各镜头时长加起来等于「时长(秒)」那个数；台词直接用引号写在那个镜头里。\n"
    "第一人称视角这类「主角不在画面里」的要求跟参考图是矛盾的 —— "
    "参考图会一直把人拉回画面中央，想要主观视角就别放人物参考图。\n"
    "画面糊、脸不像先看「分辨率」：调到 1.0 以上再看一遍，"
    "参考图也是按这个分辨率缩过之后才喂进模型的，调低了人物细节就一起丢了。"
)

# 玩法说明，钉在参数面板最上面。只写「不知道就会跑废一轮」的用法。
# 素材形态的硬要求（宫格拼图那种）是从图里自动认出来的，不用写在这里。
NOTES = {
    "zimage_i2i": "先让模型「看懂」你这张图、写成一段话，再照着那段话重画一张 —— "
                  "所以出图是同一个内容和构图感觉，不是把原图改一改，细节不会一模一样。"
                  "只放图片、提示词留着不动就能跑。提示词这一格填的是「怎么讲这张图」"
                  "（默认「详细描述图像内容」），想改画面就在这里加一句，"
                  "比如「详细描述图像内容，但把背景换成雪山」；写「一只猫」这种跟原图无关的"
                  "反而会让它照着描述跑偏。出图尺寸跟着原图走，卡上没有画面比例可调。"
                  "想保住原图的人物和构图，把「重绘幅度」调到 0.4~0.6（1 = 完全重画）；"
                  "要人物几乎不变、只改指定的地方，用「参考图编辑」那个模式。",
    "flux2_klein_edit": "真正的参考图编辑：原图直接当参考喂进模型，人物长相和画风跟着原图走，"
                        "提示词只用来说「改什么」。跟「图生图」那条反推重画不是一回事。"
                        "放 1 张 = 保住这张图的人物和画风，只改你说的那部分（换背景、换动作、"
                        "换服装、转角度）。放 2 张 = 图1 是要改的画面、图2 是参考素材"
                        "（换装、合影、换脸、把图2的人物放进图1的场景）。"
                        "提示词里要点名「图1 / 图2」，并且把要保住的东西明写出来 —— "
                        "比如「让图1的人物换上图2的衣服，相貌、发型、光线和画风保持不变」。"
                        "出图尺寸跟着图1走（长边缩到 1280），卡上没有画面比例可调。",
    "minimax_h3_ref9": VIDEO_REF_NOTE + REF_PROMPT_NOTE,
    "minimax_h3_ref4": REF_PROMPT_NOTE,
    "minimax_h3_ref_2pass": (
        VIDEO_REF_NOTE + REF_PROMPT_NOTE + "\n\n"
        "这个工作流是二次采样版本：先生成基础画面，再通过潜空间放大 1.5 倍并精修细节。"
        "相比单采版本质量更高、分辨率更大，但速度慢一倍（20 步分两阶段）。\n"
        "最多支持 1 个视频 + 9 张图片 + 3 段音频，全部按需引用，没有必填素材。\n"
        "适合最终交付作品；快速预览用单采版本（H3全能参考）。"
    ),
    H3_CHARACTER_TRANSFER: (
        "放入一段动作来源视频和一张人物参考图，自动把视频里的主要表演者替换成参考人物，"
        "并保留原动作、镜头、场景和音轨。长视频会按“单段时长”自动切段并连续生成，"
        "最终重新拼成与来源视频等长的成片。建议先用 5~10 秒短视频确认效果，再处理完整长视频。"
    ),
    "grid4_stitch": "四张图按「左上 → 右上 → 左下 → 右下」拼成一张四宫格，正好是「漫剧4宫格」"
                    "要的素材，拼完直接连线过去。分镜顺序就是这个顺序。"
                    "画面比例和分辨率要跟下游那张卡调成一样，切回来的每格才不会再被裁一刀。",
    "gimmvfi_interp": "给视频「加中间帧」：在原有画面之间补出新的画面，凑到你要的帧率。"
                      "时长不变，所以只是更顺滑，不会变慢也不会变长。"
                      "很吃时间和显存 —— 先拿几秒的短片段试，别一上来就丢整段。",
    "seedvr2_image_up": "重画式放大：不是拉大像素，是照着原图重新画一遍，"
                        "所以脸和字可能跟原图有出入，别用在要一模一样的场合。",
    "seedvr2_video_up": "把视频一帧一帧重新画清楚。帧数不变、时长不变，所以画面更清楚但"
                        "不会更顺滑 —— 要更顺滑用「视频补帧插针」那张卡。"
                        "非常慢（每一帧都要过一遍模型），先把「只处理前几帧」填 60 试一版，"
                        "确认清晰度和帧率合心意了再改回 0 跑整段。",
    "rmbg_cutout": "把画面里的主体抠出来、背景变透明，出的是带透明通道的 PNG。全程在本机跑，"
                   "不联网、不限次数。几秒钟一张，很快。\n"
                   "名字叫「人物提取」，但它不是只认人 —— 动物、商品、车、一盆花都能抠，"
                   "模型认的是「这张图的主角是谁」。\n"
                   "卡片上出来那张图可以按住左右拖 —— 往右拖就把原来的背景放回来，"
                   "拖到哪儿就对到哪儿，用来检查边缘抠干净了没有。\n"
                   "抠得不对先动「抠图灵敏度」：边上留了一圈背景残影就往上调（1 = 模型原样输出），"
                   "发丝、半透明的地方丢了就往下调。边缘太生硬用「边缘羽化」；"
                   "整圈都多／少一点用「边界收放」。这三个都不管用再去「高级」里把"
                   "「处理精度」提到 1536 以上。\n"
                   "抠完的图直接连给下游卡也可以，但 ComfyUI 读图时会把透明的地方当黑色 —— "
                   "要拿它当参考图、当首帧，最好先接一张「参考图编辑」把背景换成实的。\n"
                   "只要背景不要主体就用旁边那张「抠出背景」，两张卡可以连同一张图各跑一次，"
                   "出来的正好是能叠回去的两层。",
    "rmbg_bgonly": "跟「人物提取」是反过来的一张卡：留背景、把主体挖掉，"
                   "出的也是带透明通道的 PNG。同一张图两张卡各跑一次，"
                   "得到的就是能重新叠回原图的两层。本机跑，不联网、不限次数。\n"
                   "卡片上出来那张图可以按住左右拖 —— 往右拖主体就长回来，"
                   "用来看主体挖得干不干净、有没有留下一圈人的颜色。\n"
                   "主体位置是个透明的洞，这张卡不会把洞填上（那是另一件事："
                   "想要一张完整可用的干净背景，把这层接给「图生图」或「参考图编辑」让它补）。\n"
                   "洞边上留了一圈主体的颜色（发梢、衣服的亮边）就把「边界收放」往正数调 "
                   "2~4，等于把洞往外多挖几像素；洞挖过头、背景被啃掉了就填负数。\n"
                   "想把人直接擦掉、背景连上，用「人物擦除」那张卡。",
    "rmbg_erase": "把画面里的人整个擦掉，并且把空出来的地方按周围环境补上 —— 出来的是"
                  "一张完整的、没有人的图，不是带洞的。\n"
                  "全自动，不用手涂遮罩：先自己认出人在哪，把那块涂成纯绿色，"
                  "再让 Klein 照着周围把绿色那块画回去，最后只把这一块贴回原图 —— "
                  "所以没被擦的地方是原图像素，一点没动过。\n"
                  "卡片上出来那张图可以按住左右拖，往右拖人就长回来，用来看擦得干不干净。\n"
                  "擦不干净先动「擦除范围」：地上还留着影子、边上还有一道人的轮廓，就往上调"
                  "（往外多擦几像素）；擦得太狠、周围的东西被一起抹掉了就往下调。"
                  "人没被完整认出来（少了一条腿、漏了个胳膊）是另一回事，那要动「识别灵敏度」往下调。\n"
                  "补出来的东西每次都不一样（跟画图一样吃种子）—— 补得不像就换个种子重跑，"
                  "比调参数管用。背景越规整（墙、地、天空、草地）补得越好；"
                  "人挡住了复杂的东西（栏杆、文字、另一个人）就别指望它猜对。\n"
                  "这张卡要过一遍 Klein 9B 大模型，比抠图慢得多，也吃显存。",
}

# 卡片上给「原图 ↔ 结果」画一条能左右拖的对比线（前端 paint() 认 manifest.compare）。
# 只给两张抠图卡开：它们的成败全在边缘那一圈，不跟原图叠着看根本判断不了抠干净没有，
# 而透明底的图单看又只是一块空白（抠出背景那张更是一个洞）。别的能力也画得出来
#（图片放大、图生图、参考图编辑都是一进一出），要开就往这个集合里加一个 id ——
# 但那几条看结果本身就够了，一张卡上多一个会动的东西是干扰不是帮助。
COMPARE = {"rmbg_cutout", "rmbg_bgonly", "rmbg_erase"}

# 这条工作流里的这个文本框是「写死的指令」，不是用户内容 —— 不许开成提示词框。
# 人物擦除就是这种：图里那句"把绿色标记的区域擦掉、用周围背景补上"是这条能力的
# 实现方式（Klein 全靠它知道绿色是要抹掉的东西），不是用户想说的话。开出来两种结果
# 都不好：用户改了它 → 擦除直接失效；用户不改 → 面板上白占一个大文本框，
# 而且这张卡会因为"有提示词框"从「工具」掉进「生图」组（见 is_tool）。
# 按 (能力id, 节点id) 点名，不按字段名 —— 同一个 CLIPTextEncode.text
# 在别的工作流里就是真提示词，按名字关会连带关掉一片。
FIXED_TEXT = {("rmbg_erase", "40")}

# 「✨优化」按钮：哪条能力能用本地 27B 把大白话改写成这个模型认的提示词，用哪套规矩。
# regime 指向 server/rewrite.py 里那套 system prompt（规则文本长，不该塞进 manifest
# 再随 /api/cards 整份传给前端 —— 前端只需要知道"有没有这个按钮"）。
#   mode  = H3 关键帧模式（I2VA 只有首帧 / FL2VA 首尾帧），差的就是开头那句对齐说明
#   audio = 台词/歌词来自音频文件，不许模型自己编 <d> 台词
# 没登记的能力就没有这个按钮。故意不给的三条：图生图、九宫格分镜、漫剧 ——
# 它们的「提示词」本来就是给图里那个 27B 的指令，再套一层 27B 是脱裤子放屁。
# 四张工具卡根本没有提示词框（连风格卡都收不了），更不用说。
REWRITE = {
    "zimage_t2i": {"regime": "zimage"},
    "flux2_klein_edit": {"regime": "klein"},
    "minimax_h3_i2v": {"regime": "h3_base", "mode": "I2VA"},
    "minimax_h3_flf2v": {"regime": "h3_base", "mode": "FL2VA"},
    "minimax_h3_ref4": {"regime": "h3_ref"},
    "minimax_h3_ref9": {"regime": "h3_ref"},
    "minimax_h3_ref_2pass": {"regime": "h3_ref"},
    H3_CHARACTER_TRANSFER: {"regime": "h3_ref"},
    "minimax_h3_talk1": {"regime": "h3_ref", "audio": True},
    "minimax_h3_talk2": {"regime": "h3_ref", "audio": True},
}

# 换掉工作流里写死的那个本地大模型（旧文件名 -> 新文件名）。
# 为什么要在扫描器里做、而不是去改工作流文件：graphs/ 是产物，手改下次重扫就没了；
# 而作者的原始工作流是整合包的东西，不该动。
# 为什么要跟 server/rewrite.py 的 LOADER 一起改：llama-cpp 那个节点是**按配置缓存**
# 模型的，两边只要有一个字段不一样，交替用就会各自重新加载十几个 G。
#
# 作者的图指着 Qwen3.5-27B 的 3bit 量化（UD-IQ3_XXS，压得很狠），换成同代的 IQ4_XS。
# 同代=同架构，加载没问题（下完先在 ComfyUI 外单独 llama_cpp.Llama() 验过才切的）。
# unsloth 那个仓库里 Qwen3.5-27B **没有** UD-IQ4_XS，只有普通 IQ4_XS，别再去找了。
#
# 别去试 Qwen3.8-27B：包里的 llama.cpp 加载不了。
# 原因记在这以免下次再白下 13G —— llama-cpp-python 0.3.35 的 qwen35 架构把「哪几层是
# 注意力层、哪几层是 SSM 层」写死成每 4 层一个注意力层，llama.dll 里也没有任何按层
# 描述类型的元数据键（只有 qwen35 / qwen35moe 两个实现）。Qwen3.5-27B 是 64 层
# （16 注意力 + 48 SSM）刚好对上；Qwen3.8-27B 是 65 层（17 + 48），第 64 层在文件里
# 是注意力层、loader 按 SSM 去找，直接报 missing tensor 'blk.64.ssm_conv1d.weight'。
# 跟量化档位、跟谁转的 gguf 都无关，任何 Qwen3.8-27B 的 gguf 都一样；3.8 还多出
# MTP（blk.N.nextn.*）张量。要用它只能升级 llama-cpp-python，那是整合包核心，不动。
#
# 第 2、3 条是给分镜那条擦屁股的：它是子图工作流，本地转不了，扫描器读的是磁盘上
# **已经导出**的 api.json —— 3.8 的名字曾经写进过那份文件，只靠第 1 条碰不到它。
#   旧文件名 -> 新文件名
LLM_SWAP = {
    "Qwen3.5-27B-UD-IQ3_XXS.gguf": "Qwen3.5-27B-IQ4_XS.gguf",
    "Qwen3.8-27B-UD-IQ4_XS.gguf": "Qwen3.5-27B-IQ4_XS.gguf",
    # 视觉塔跟主模型同代就行，3.5 全系列共用这一份，不用换
    "mmproj-Qwen3.8-F16.gguf": "mmproj-F16.gguf",
}
NEW_LLM = frozenset(LLM_SWAP.values())

# 高级旋钮：这几个 widget 名不管挂在哪个节点上语义都一样，值得开出来给人调。
# 范围只能自己给 —— object_info 的范围是给专业用户的（步数上限 10000、LoRA 强度
# -100~100），照抄出来的滑条根本没法用。
# key -> (界面名, 最小, 最大, 步进, 说明)
# 说明里的 {d} 会替换成这条工作流里的真实默认值 —— 推荐值不能写死在文案里，
# 同一个 steps 在不同工作流是 4 / 8 / 9，写死就会跟面板上的数字对不上。
KNOBS = {
    "steps": ("采样步数", 1, 40, 1,
              "推荐 {d}：模型带加速 LoRA，{d} 步就到位了。往下调会花，往上调基本白等"),
    "strength_model": ("加速模型强度", 0, 2, 0.05,
                       "推荐 {d}（全开）：省时间全靠它。往下调画质略好但慢很多，0 = 不加速、慢好几倍"),
    "processing_control_value": ("提速档位", 0, 0.5, 0.005,
                                 "推荐 {d}：再快画面就开始糊、动作发飘，这一档是不掉画质的上限。0 = 不提速"),
    "max_rows": ("出图张数", 1, 9, 1, "一句提示词出一张图，{d} 张是一整套。调小只画前几张，剩下的不生成"),
    "interpolation_factor": ("补帧倍数", 2, 4, 1,
                             "推荐 {d}：帧率翻 {d} 倍、时长不变，画面更顺滑。"
                             "每加一倍时间和显存都跟着涨，4 倍要跑很久"),
    "target_fps": ("目标帧率", 24, 120, 2,
                   "出片每秒多少帧、时长不变，填多少就出多少。60 是常见的「顺滑」档。"
                   "填源视频帧率的整数倍最干净（源 24 → 48 / 72 / 96）；填别的数也照样出到位，"
                   "只是会先把源重采样一下，个别帧重复。帧率翻几倍，时间和显存就翻几倍"),
    "resolution": ("放大到(短边)", 512, 2048, 64,
                   "推荐 {d}：出片短边有多少像素，长边按原图比例跟着放。"
                   "往上调更清楚，但时间和显存涨得很快；先调小试一版，满意了再放大"),
    "max_resolution": ("最长边上限", 0, 4096, 64,
                       "推荐 {d}：长边算出来超过这个数，宽高就一起缩回来 —— 也就是说"
                       "它会盖掉上面的「放大到(短边)」。上面调大了没反应，就是被这条卡住了。"
                       "0 = 不限（长条形素材容易爆显存）"),
    "force_rate": ("帧率", 8, 60, 1,
                   "推荐 {d}：成片每秒多少帧，时长不变。调高更流畅，但要重画的帧数"
                   "成正比变多、时间和显存跟着涨。想更流畅又不想多等，用「视频补帧插针」那张卡"),
    "frame_load_cap": ("只处理前几帧", 0, 300, 15,
                       "0 = 整段都处理。跑不动或者只想先看效果，就填 60（约 2 秒）"
                       "试一版，满意了再改回 0"),
    "scale_by": ("重画前先缩小", 0.25, 1, 0.05,
                 "推荐 {d}：先把原图缩到这个比例，再照着重新画大。"
                 "缩一点画得反而更细 —— 不缩的话糊的地方会被照着糊的重画一遍。1 = 不缩"),
}
# 只对某一条能力开的旋钮：能力 id -> 和 KNOBS 一样的 {widget名: (界面名,最小,最大,步进,说明)}。
# KNOBS 是按 widget 名全局匹配的，denoise 不能进那张表 —— 文生图和 7 条 H3 视频的图里都有
# 一个 denoise=1（长在 BasicScheduler 上），那些卡上它不是玩法旋钮，调了只会跑废一轮。
# 图生图这条不一样：它的采样器本来就吃着原图的 latent（LoadImage → 缩放 → VAEEncode →
# KSampler.latent_image），只是 denoise 写死 1 把原图整段重噪了，所以这个数在这张卡上
# 是真·「改多少」的开关。
# 两张抠图卡共用：这个数跟蒙版反不反没关系，两边说明一字不差，写两遍迟早写歪
RMBG_RES = ("处理精度", 512, 2048, 128,
            "推荐 {d}：模型就是按这个尺寸练的。原图多大都先缩到这个尺寸算蒙版、"
            "再放回原尺寸，所以调高只对「细节特别碎」的图（发丝、树枝、栅栏）"
            "有用，还会更慢更吃显存。调低更快但边缘会变粗糙")

CAP_KNOBS = {
    "zimage_i2i": {
        "denoise": ("重绘幅度", 0.2, 1, 0.05,
                    "工作流默认 {d}（完全重画，原图只剩尺寸）。"
                    "调到 0.4~0.6：原图的构图和人物轮廓保住，只换质感和细节 —— "
                    "想让出图还认得出是同一个人就往这一档调。"
                    "再往下越来越像原图、提示词越使不上劲"),
    },
    # 抠图这四个名字在别的图里也可能出现（blur / offset 到处都有），所以只对这两条开。
    # 上下限都比节点声明的窄：节点给的 mask_blur 到 64、mask_offset 到 ±64，
    # 那个量级下主体边缘整圈糊成一团，是"能拖但拖了必坏"的区间；
    # sensitivity 到 0 是把蒙版整体乘 2，半透明的地方全变实，等于没抠。
    "rmbg_cutout": {
        "sensitivity": ("抠图灵敏度", 0.5, 1, 0.05,
                        "工作流默认 {d} = 模型原样输出。往下调会把「模型不太确定」的地方"
                        "也算成主体：发丝、纱、玻璃这些半透明的地方能保住更多，"
                        "代价是边上容易留一圈背景残影。边缘干净但细节丢了才往下调"),
        "mask_blur": ("边缘羽化", 0, 16, 1,
                      "默认 {d}（不羽化）。把抠出来的边缘化开几像素，"
                      "贴到别的背景上不那么像剪纸。2~4 就够，再大主体边上会发虚"),
        "mask_offset": ("边界收放", -16, 16, 1,
                        "默认 {d}。整圈往里收（负数）或往外放（正数）几像素。"
                        "边上带了一圈原背景的颜色就填 -2 ~ -4；"
                        "主体自己被削掉了一点就填正数"),
        "process_res": RMBG_RES,
    },
    # 「抠出背景」是同一个节点开了 invert_output：蒙版先按下面这几个数算好，最后整张反过来。
    # 所以四个旋钮的方向全都是反的（灵敏度往下调 = 洞挖得更大、边界收放正数 = 洞更大），
    # 说明文字必须另写一套 —— 照抄主体那张的话每一句都是反的，比不写更害人。
    "rmbg_bgonly": {
        "sensitivity": ("挖除灵敏度", 0.5, 1, 0.05,
                        "工作流默认 {d} = 模型原样输出。往下调会把「模型不太确定」的地方"
                        "也当成主体一起挖掉：主体挖得更干净、不容易在洞边上留人的颜色，"
                        "代价是发丝缝隙里那些背景也跟着被挖走了"),
        "mask_blur": ("边缘羽化", 0, 16, 1,
                      "默认 {d}（不羽化）。把洞的边缘化开几像素，"
                      "回头往洞里补东西时接缝不那么硬。2~4 就够"),
        "mask_offset": ("边界收放", -16, 16, 1,
                        "默认 {d}。正数 = 洞往外多挖几像素，负数 = 洞往里收。"
                        "洞边上留了一圈主体的颜色（发梢、衣服亮边）就填 2 ~ 4；"
                        "洞挖过头、背景被啃掉了就填负数"),
        "process_res": RMBG_RES,
    },
    # 「人物擦除」用的是同一个 RMBG 节点，但它算出来的蒙版不是用来抠图的，是用来
    # 标记"这块要擦掉重画"。所以名字和说明都得按"擦"来讲，别再提抠图和透明底。
    # mask_offset 不给负数：往里收只会让人的轮廓留在画面上，是这张卡最典型的失败样子，
    # 没有哪种情况需要它。默认值也不是 0 —— 擦除天生要往外多盖一点才能吃掉影子和边缘。
    "rmbg_erase": {
        "mask_offset": ("擦除范围", 0, 24, 2,
                        "默认 {d}（比人本身往外多擦 {d} 像素）。地上还留着影子、"
                        "边上还有一道人的轮廓，就往上调；擦得太狠、把旁边的东西"
                        "一起抹掉了就往下调"),
        "sensitivity": ("识别灵敏度", 0.5, 1, 0.05,
                        "工作流默认 {d} = 模型原样输出。人没被完整认出来（少一条腿、"
                        "漏了个胳膊、举着的东西没算进去）才往下调 —— 它管的是"
                        "「哪些地方算这个人」，不管擦得多干净（那个是「擦除范围」）"),
        "mask_blur": ("边缘过渡", 0, 16, 1,
                      "默认 {d}。新画的那块和原图交界处化开几像素，接缝不那么硬。"
                      "调大了绿色标记的边会变虚，模型对"
                      "「到哪儿为止要擦」的判断也跟着变模糊"),
        "process_res": RMBG_RES,
    },
}
# 这些能力保留工作流里的固定值，但不把对应旋钮放到 Web 参数面板。
CAP_HIDDEN_INPUT_KEYS = {
    "minimax_h3_ref9": {"frame_load_cap", "force_rate"},
    "minimax_h3_ref_2pass": {"frame_load_cap", "force_rate"},
}
# 上面这些旋钮默认折进「高级」。写在这里的是玩法本身的旋钮，要摆在面板正面。
# max_resolution 进来不是因为它是玩法旋钮，而是因为它能悄悄盖掉 resolution ——
# 一个能否决正面旋钮的开关必须也在正面，否则用户拖了「放大到(短边)」却没反应。
# 抠图那三个边缘旋钮也在正面：这张卡除了「放一张图」就只有这几个数，
# 抠不干净时要调的正是它们，折进「高级」等于把这张卡唯一的玩法藏起来
PRIMARY_KNOBS = {"max_rows", "interpolation_factor", "target_fps", "resolution",
                 "max_resolution", "force_rate", "frame_load_cap", "denoise",
                 "sensitivity", "mask_blur", "mask_offset"}
# 表里的上限是硬上限。这类旋钮在图里常写成一个"等于不限"的大数（promptLine 的
# max_rows=1000），那不是作者调过的设置，照抄成默认值滑条就变成 1000 档没法用。
HARD_MAX = {"max_rows"}

# 文件名里的噪音：实现细节、版本号、厂商前缀
NOISE_PAREN = re.compile(r"[（(][^）)]*(?:步|加速|版|V\d)[^）)]*[）)]")
VENDOR = re.compile(r"mini\s*max\s*[-_ ]?h3|minimaxh3|minimax", re.I)


def short_name(stem):
    """把工作流文件名清洗成人能读的模式名（没有 DISPLAY 覆盖时用）"""
    s = stem.lstrip("@").strip()
    s = NOISE_PAREN.sub("", s)
    s = VENDOR.sub("H3", s)
    s = re.sub(r"[_：:\-]+", " ", s)
    return re.sub(r"\s+", " ", s).strip() or stem

# ---------- 分类表：只用于"要不要暴露给用户"，不参与取值 ----------
SKIP_TYPES = {
    "MarkdownNote", "Note", "LG_Note", "Label (rgthree)",
}
# 前端虚拟节点：不进 API 图，只做连线转发
VIRTUAL_TYPES = {
    "SetNode", "GetNode", "easy setNode", "easy getNode",
    "Reroute", "Reroute (rgthree)", "PrimitiveNode",
}
# 图片槽标签：按下游消费者的输入名推断（SPECIFIC 优先，GENERIC 兜底）
SLOT_SPECIFIC = {
    "first_frame": "首帧", "last_frame": "尾帧",
    "start_image": "首帧", "end_image": "尾帧",
    "ref_images": "图片", "ref_image": "图片",
    "reference_image": "图片", "control_image": "控制图",
}
SLOT_GENERIC = {"image": "图片", "images": "图片", "pixels": "图片"}
# 槽位标签替换：把工作流中的旧标签统一替换成新标签（用于统一命名）
SLOT_LABEL_REPLACE = {
    r"^参考图(\d+)$": r"图片\1",  # 参考图1 -> 图片1
    r"^参考图$": "图片",           # 参考图 -> 图片
    r"^场景$": "图片",             # 场景 -> 图片
    r"^角色$": "图片",             # 角色 -> 图片（uniq会自动编号）
}
HIDDEN_TYPES = {  # 后台节点，永不暴露
    "UNETLoader", "CLIPLoader", "VAELoader", "CheckpointLoaderSimple",
    "LoraLoaderModelOnly", "LoraLoader", "KSampler", "KSamplerSelect",
    "BasicScheduler", "BasicGuider", "SamplerCustomAdvanced", "RandomNoise",
    "VAEDecode", "VAEEncode", "VAEDecodeAudio", "ConditioningZeroOut",
    "ModelSamplingAuraFlow", "ModelSamplingAV", "TESpeedMiniMaxH3",
    "PathchSageAttentionKJ", "ComfyMathExpression", "CreateVideo",
}
TEXT_TYPES = {
    "PrimitiveStringMultiline": "value",
    "PrimitiveString": "value",
    "easy positive": "positive",
    "easy negative": "negative",
    "CLIPTextEncode": "text",
    "String Literal": "string",
}
VIDEO_LOADERS = {  # 上传视频的节点 -> 收文件名的那个输入名
    "VHS_LoadVideo": "video",
    "VHS_LoadVideoPath": "video",
    "VHS_LoadVideoFFmpeg": "video",
}
SAVE_TYPES = {
    "SaveImage": "image", "PreviewImage": "image", "SaveAnimatedWEBP": "image",
    "SaveVideo": "video", "VHS_VideoCombine": "video", "SaveWEBM": "video",
    "SaveAudio": "audio", "SaveAudioMP3": "audio",
}
DURATION_HINTS = ("duration", "时长", "秒")

# 「帧率」这个旋钮横跨两个节点：上传节点的 force_rate 把输入重采样成这个帧率，
# 合成节点的 frame_rate 给成片打上这个帧率。两个必须始终相等 —— 只改一边，成片就
# 变成快放或慢放。所以归一成同一个 key（force_rate），面板只画一个框、提交时一起写。
# 两边都是死数字才开出来：补帧那条工作流的 frame_rate 是算出来的（源视频 fps ×
# 补帧倍数），帧率由图自己管，插一手只会把时长算错。
RATE_IN, RATE_OUT = "force_rate", "frame_rate"


def is_preview(ct, ins):
    """这个输出节点存的是真产物，还是只给人在 ComfyUI 里瞄一眼的临时预览。

    一条工作流可以有好几个输出节点：SeedVR2 视频放大那条除了成片，还有放大前/放大后
    的单帧预览、和一条左右对比的临时视频。按节点 id 取第一个会拿到那个 PreviewImage，
    于是整条能力被判成"出图片"，画布上拿回来的产物是原片的一帧而不是放大好的视频。
    PreviewImage 天生是临时的；VHS_VideoCombine 这类自己带 save_output 开关，
    作者关掉它就是明说"这个只是给我自己看的"。
    """
    return ct == "PreviewImage" or ins.get("save_output") is False


def knob_key(api, nid, field, knobs=None):
    """这个输入对应哪个旋钮。

    frame_rate 归到 force_rate（同一个「帧率」，见 RATE_IN/RATE_OUT）；名字压根不在
    旋钮表里的是数字中转节点，旋钮身份来自它喂给的那个输入。
    """
    low = field.lower()
    if low == RATE_OUT:
        return RATE_IN
    return low if low in (knobs or KNOBS) else fed_knob(api, nid)

# 分辨率旋钮。视频工作流几乎没有裸的 width/height：尺寸由「尺寸提供者」节点算出来
#   ResolutionSelector          -> aspect_ratio + megapixels  -> width/height
#   ImageScaleByAspectRatio V2  -> scale_to_length（长边像素）
# 这几个输入名在任何插件里语义都一致，所以按名字识别，不认节点类名。
# (标签, 控件, (min, max, step))
# 上限来自 MiniMax H3 自己的画布常数（comfy_extras/nodes_minimax_h3.py:26-28）：
#   BASE_SHORT_EDGE = 768        原生短边
#   MAX_PIXELS = 768 * 1344      面积上限
#   CANVAS_MULTIPLE = 32         宽高必须是 32 的倍数
# 换算到 ResolutionSelector 的 megapixels：16:9 下 1.0MP = 1376×768，正好顶到原生
# 短边；再往上是训练分布外，只会更慢更糊，所以封在 1.1 而不是插件作者给的 16。
RES_FIELDS = {
    "aspect_ratio":    ("画面比例", "select", None),
    "megapixels":      ("分辨率", "slider", (0.2, 1.1, 0.01)),
    "scale_to_length": ("分辨率(长边)", "number", (512, 1344, 32)),
}


def is_size_provider(oi, ct):
    """节点的输出就是一对 width/height（如 ResolutionSelector），而不是图片。

    图片缩放节点（ImageResizeKJv2 / ImageScaleByAspectRatio）也顺带输出
    width/height，但它们的 aspect_ratio 是"怎么裁这张图"，语义不同，
    暴露出去会让用户以为在选出片比例，结果只是给原图加黑边。
    """
    names = [str(x).lower() for x in (oi.get(ct, {}).get("output_name") or [])]
    return "width" in names and "height" in names and "image" not in names


# 「编号列表」槽位：image_1 / prompt_3 / any_2 …
# 一堆同名带序号的输入，语义上是"往这个列表里塞第 k 项"。
ORD_SLOT = re.compile(r"^(.+?)_(\d+)$")


def ord_slot(api, nid):
    """nid 的输出接进了某个编号列表的第几号槽 -> (收集器id, 输入名, 序号)。

    不是编号槽（普通的 .image / .audio）就返回 (None, None, None)。
    """
    cid, cin = direct_consumer(api, nid)
    m = ORD_SLOT.match(cin or "")
    return (cid, cin, int(m.group(2))) if m else (None, None, None)


def ord_group(api, nids):
    """把一批节点按「接到同一个编号列表」归类 -> {收集器id: {序号: (在 nids 里的下标, 输入名)}}"""
    g = {}
    for i, nid in enumerate(nids):
        cid, cin, k = ord_slot(api, nid)
        if cid is not None:
            g.setdefault(cid, {})[k] = (i, cin)
    return g


def is_optional(oi, ct, name):
    opt = oi.get(ct, {}).get("input", {}).get("optional") or {}
    if name in opt:
        return True
    # 动态字典输入：节点定义里只声明父项（ref_images），实际连线是
    # ref_images.ref_image_3 这种带点的子项。父项选填 = 每个子项都能不接
    base = name.split(".")[0]
    return base != name and base in opt


# =====================================================================
# object_info
# =====================================================================
def load_object_info():
    if OBJECT_INFO.exists():
        return json.loads(OBJECT_INFO.read_text(encoding="utf-8"))
    OBJECT_INFO.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(COMFY_URL + "/object_info", timeout=120) as r:
        data = r.read()
    OBJECT_INFO.write_bytes(data)
    return json.loads(data.decode("utf-8"))


def load_zh():
    """
    汉化包给出每个节点的「中文默认标题」和 widget 中文名。
    用途：导出的 API json 里 _meta.title 是本地化默认名（如"加载图像"），
    必须能和用户自己写的标题（"场景""角色"）区分开，否则标签全错。
    """
    if ZH_CACHE.exists():
        return json.loads(ZH_CACHE.read_text(encoding="utf-8"))
    zh = {}
    if ZH_PACK.is_dir():
        for f in ZH_PACK.glob("*.json"):
            try:
                for ct, d in json.loads(f.read_text(encoding="utf-8")).items():
                    if not isinstance(d, dict):
                        continue
                    e = zh.setdefault(ct, {"titles": [], "widgets": {}})
                    if d.get("title"):
                        e["titles"].append(d["title"])
                    if isinstance(d.get("widgets"), dict):
                        e["widgets"].update({k: v for k, v in d["widgets"].items()
                                             if isinstance(v, str)})
            except Exception:
                continue
    ZH_CACHE.parent.mkdir(parents=True, exist_ok=True)
    ZH_CACHE.write_text(json.dumps(zh, ensure_ascii=False), encoding="utf-8")
    return zh


ZH = {}


def spec_of(oi, class_type, input_name):
    """取某个输入的 object_info 定义 (type, options)"""
    node = oi.get(class_type)
    if not node:
        return None, {}
    for group in ("required", "optional"):
        g = node.get("input", {}).get(group, {})
        if input_name in g:
            s = g[input_name]
            t = s[0] if s else None
            o = s[1] if len(s) > 1 and isinstance(s[1], dict) else {}
            return t, o
    return None, {}


# =====================================================================
# 界面格式 -> API 格式
# =====================================================================
def build_resolver(wf, oi, warns):
    """
    把一条连线的源头解析成"真实计算节点"：
      GetNode  -> 同名 SetNode 的上游
      Reroute  -> 上游
      绕过(mode 4) -> 同类型输入直通
      静音(mode 2) -> None（连线作废）
    """
    nodes = {n["id"]: n for n in wf.get("nodes", [])}
    links = {l[0]: (l[1], l[2]) for l in wf.get("links", [])
             if isinstance(l, list) and len(l) >= 5}
    setmap = {}
    for n in wf.get("nodes", []):
        if n.get("type") in ("SetNode", "easy setNode"):
            wv = n.get("widgets_values") or [None]
            if wv and wv[0]:
                setmap[str(wv[0])] = n

    def follow_input(node, slot_type=None, depth=0):
        """取 node 的（同类型优先的）第一个有效上游"""
        cands = [i for i in node.get("inputs", []) if i.get("link") is not None
                 and "widget" not in i]
        if slot_type:
            typed = [i for i in cands if i.get("type") == slot_type]
            cands = typed or cands
        if not cands:
            return None
        return resolve(*links.get(cands[0]["link"], (None, 0)), depth + 1)

    def resolve(nid, slot, depth=0):
        if nid is None or depth > 24:
            return None
        n = nodes.get(nid)
        if n is None:
            return None
        ct, mode = n.get("type"), n.get("mode", 0)
        if mode == 2:
            return None
        if ct in ("GetNode", "easy getNode"):
            wv = n.get("widgets_values") or [None]
            src = setmap.get(str(wv[0])) if wv else None
            if src is None:
                warns.append(f"Get_{wv[0] if wv else '?'} 找不到对应的 Set 节点")
                return None
            if src.get("mode", 0) != 0:
                return None
            return follow_input(src, depth=depth)
        if ct in VIRTUAL_TYPES:
            return follow_input(n, depth=depth)
        if mode == 4:                                    # 绕过 -> 直通
            outs = n.get("outputs") or []
            st = outs[slot].get("type") if slot < len(outs) else None
            return follow_input(n, st, depth)
        return (nid, slot)

    return nodes, links, resolve


def revive_bypassed(wf, warns):
    """把「关着的备用素材槽」开回来（只对 REVIVE 点名的工作流做）。

    素材节点被设成绕过（mode 4）时，它没有同类型输入可以直通，那根线其实就是断的。
    四图参考只剩三个图槽就是这么来的：第 4 张图的 LoadImage → SetNode → GetNode
    整条链都是绕过状态，开回来才对得上"四图"这个名字。

    为什么要点名、不能一律开：说话唱歌·双人 里也留着两个关着的备用参考图槽，
    开出来会把它变成 4 图，跟「按图片张数路由到单人/双人」直接打架（传 2 张会被
    判去跑单人，白扔一张图）。备用槽要不要露给用户是产品判断，从图里推不出来。
    """
    n = 0
    for node in wf.get("nodes", []):
        if node.get("mode") != 4:
            continue
        if (node.get("type") in ("LoadImage", "LoadAudio")
                or node.get("type") in VIDEO_LOADERS) and not any(
                i.get("link") is not None for i in node.get("inputs", [])
                if "widget" not in i):
            node["mode"] = 0
            n += 1
        elif node.get("type") in VIRTUAL_TYPES or node.get("type") in (
                "SetNode", "GetNode", "easy setNode", "easy getNode"):
            node["mode"] = 0          # 中转节点本身没语义，跟着素材一起开
    if n:
        warns.append(f"已启用 {n} 个原本关着的备用素材槽")


def ui_to_api(wf, oi, warns, revive=False):
    """
    关键点：新版界面格式里 node["inputs"] 已经把 widget 也列进去了（带 "widget" 键），
    顺序与 widgets_values 一一对应；唯一的偏移来自 control_after_generate 多出的一个值。
    所以不需要猜 widget 下标。
    """
    if revive:
        revive_bypassed(wf, warns)
    nodes, links, resolve = build_resolver(wf, oi, warns)

    api = {}
    for n in wf.get("nodes", []):
        ct = n.get("type")
        if ct in SKIP_TYPES or ct in VIRTUAL_TYPES:
            continue
        if n.get("mode", 0) in (2, 4):     # 静音 / 绕过：不进图，由 resolve 直通
            continue
        if ct not in oi:
            if not (n.get("outputs") or n.get("inputs")):
                continue                   # 无端口的装饰节点，静默跳过
            warns.append(f"未知节点类型 {ct}（id={n['id']}），可能缺插件")
            continue

        # widgets_values 有两种存法。列表：按 node["inputs"] 里 widget 的顺序对位。
        # 字典：按名字存（VHS_VideoCombine 就是），而且字典顺序和 inputs 顺序不一样
        # ——拍平成列表再对位会整段错位，crf 会拿到 False，ffmpeg 直接报
        # 'Unable to parse option value "False"'，视频存不出来。所以字典必须按名字取。
        wv = n.get("widgets_values")
        wvd = wv if isinstance(wv, dict) else None
        wv = [] if wvd is not None else (wv or [])

        inputs = {}
        wi = 0
        for inp in n.get("inputs", []):
            name = inp.get("name")
            is_widget = "widget" in inp
            link = inp.get("link")
            if is_widget:
                wt, opts = spec_of(oi, ct, name)
                if wvd is not None:
                    val = wvd[name] if name in wvd else MISSING
                else:
                    val = wv[wi] if wi < len(wv) else None
                    wi += 1
                    # 界面会给所有叫 seed 的数字小部件配一个 randomize 下拉，哪怕
                    # object_info 里没声明 control_after_generate（llama_cpp_instruct_adv
                    # 就没声明）。只认声明会漏跳一格，之后的小部件全体错位 ——
                    # force_offload 会拿到 'randomize'。所以再按值兜一层。
                    if opts.get("control_after_generate") or (
                            wt in ("INT", "FLOAT") and wi < len(wv)
                            and wv[wi] in CONTROL_AFTER):
                        wi += 1            # 跳过 randomize/fixed
                if name in ("audioUI",) or inp.get("type") in ("AUDIO_UI",):
                    continue               # 纯 UI 组件
                if inp.get("type") in ("IMAGEUPLOAD", "AUDIOUPLOAD"):
                    continue               # 上传按钮
                if link is not None:
                    src = resolve(*links.get(link, (None, 0)))
                    inputs[name] = [str(src[0]), src[1]] if src else (
                        None if val is MISSING else val)
                elif val is MISSING:
                    # 名字对不上就别硬塞，留空让 ComfyUI 用节点自己的默认值
                    warns.append(f"#{n['id']} {ct}.{name} 不在 widgets_values 里，用节点默认值")
                    continue
                else:
                    inputs[name] = val
            else:
                if link is None:
                    continue
                src = resolve(*links.get(link, (None, 0)))
                if src:
                    inputs[name] = [str(src[0]), src[1]]   # ComfyUI 要求节点 id 是字符串

        # V3 自增长输入（ref_images.ref_image_0 / values.a）必须保持点号平铺，
        # ComfyUI 的 build_nested_inputs 自己会按 dynamic_paths 折成嵌套结构；
        # 若在这里折成 {"ref_images": [[..]]}，校验期报 "Required input is missing"。
        api[str(n["id"])] = {
            "class_type": ct,
            "inputs": inputs,
            "_meta": {"title": n.get("title") or oi[ct].get("display_name") or ct},
        }

    # 清掉指向已删除节点的连线
    for nid, node in api.items():
        for k, v in list(node["inputs"].items()):
            if (isinstance(v, list) and len(v) == 2
                    and isinstance(v[0], str) and isinstance(v[1], int)):
                if v[0] not in api:
                    warns.append(f"节点 {nid}.{k} 的上游 {v[0]} 已被跳过，输入被移除")
                    node["inputs"].pop(k)
    return api


# =====================================================================
# 自动推导输入槽
# =====================================================================
def is_literal(v):
    return not (isinstance(v, list) and len(v) == 2 and isinstance(v[0], (int, str))
                and not isinstance(v[0], bool) and isinstance(v[1], int))


def default_title(oi, ct, title):
    """标题是否只是节点自己的名字（英文或汉化默认名）"""
    if not title:
        return True
    t = title.strip()
    if t == ct or t == oi.get(ct, {}).get("display_name"):
        return True
    return t in ZH.get(ct, {}).get("titles", [])


def zh_widget(ct, name):
    return ZH.get(ct, {}).get("widgets", {}).get(name) or name


def consumers(api, nid):
    """谁消费了 nid 的输出 -> [(消费节点id, 输入名), ...]"""
    out = []
    for cid, node in api.items():
        for k, v in node["inputs"].items():
            if isinstance(v, list) and len(v) == 2 and str(v[0]) == str(nid):
                out.append((cid, k))
    return out


def direct_consumer(api, nid):
    cs = consumers(api, nid)
    return cs[0] if cs else (None, None)


def prune_dead(api, oi, warns):
    """摘掉「没人要」的节点：不是输出节点，输出又没有任何人消费。

    ComfyUI 执行时是从输出节点反着往上拉的，这种节点本来就不会跑。留在图里唯一的
    后果是它的小部件会被当成可调参数暴露出来 —— 图生图那条里有个跟谁都没连的
    EmptyLatentImage，照它画出来面板上就多了「宽 / 高」两个框，拖了完全没反应
    （出图尺寸其实是跟着原图走的）。一个能拖但没作用的旋钮比没有这个旋钮更糟。

    判据只看结构，不认节点类名。摘掉一个可能让它的上游也变成孤儿，所以反复摘到不动为止。
    """
    while True:
        dead = [nid for nid, n in api.items()
                if not oi.get(n["class_type"], {}).get("output_node")
                and not consumers(api, nid)]
        if not dead:
            return
        for nid in dead:
            warns.append(f"已摘：#{nid} {api.pop(nid)['class_type']} 的输出没人用，"
                         f"ComfyUI 不会执行它 —— 它的参数也就不该出现在面板上")


def num(v):
    """'2' -> 2。ComfyLiterals 把数字存成字符串，滑条要的是数"""
    if isinstance(v, str):
        try:
            f = float(v)
            return int(f) if f.is_integer() else f
        except ValueError:
            return v
    return v


def route_card(wid):
    """这条能力被哪张「按素材类型路由」的合并卡收走了。

    SOLO 里点名的不算被收走 —— 补帧既在合并卡里当视频那一路，也留着自己那张卡，
    想直接补帧的人不用先猜「画质增强」里有没有这功能。
    """
    if wid in SOLO:
        return None
    return next((cid for cid, c in ROUTE_CARDS.items()
                 if wid in c["route"].values()), None)


def literal_out(oi, ct):
    """节点本身就是个「写死的数字」：一个输入、一个数字输出。返回那个输出类型。

    ComfyLiterals 的 Int 是典型：Number 声明成 STRING、输出却是 INT，
    按输入类型根本认不出它是旋钮。这种节点自己没有语义，只能看它喂给谁 ——
    跟下面 Primitive 看 RES_FIELDS 是同一个思路。
    """
    node = oi.get(ct) or {}
    outs = list(node.get("output") or [])
    if len(outs) == 1 and outs[0] in ("INT", "FLOAT") \
            and len(node.get("input", {}).get("required", {})) == 1:
        return outs[0]
    return None


def fed_knob(api, nid):
    """nid 的输出喂进了哪个已知旋钮（KNOBS 的 key）。

    补帧倍数就是这么接的：一个 Int 节点同时喂 interpolation_factor 和帧率乘法，
    两边必须一起变，所以旋钮要写在这个 Int 上，不能直接改采样节点的输入。
    """
    return next((k.lower() for _c, k in consumers(api, nid) if k.lower() in KNOBS), None)


def formula_node(oi, ct):
    """输出全是数字的节点，它那个多行文本框是公式不是提示词（MathExpression 的 a*b）"""
    outs = list((oi.get(ct) or {}).get("output") or [])
    return bool(outs) and all(o in ("INT", "FLOAT") for o in outs)


def upstream(api, nid, seen=None):
    """nid 顺着连线往上游能追到的全部节点 id（跨多层）"""
    seen = set() if seen is None else seen
    for v in api.get(str(nid), {}).get("inputs", {}).values():
        if isinstance(v, list) and len(v) == 2 and str(v[0]) in api and str(v[0]) not in seen:
            seen.add(str(v[0]))
            upstream(api, v[0], seen)
    return seen


ZH_GRID = {4: "四宫格", 6: "六宫格", 9: "九宫格", 12: "十二宫格", 16: "十六宫格"}
GRID_COLS = ("水平", "横向", "column", "cols", "horizontal", "x_count")
GRID_ROWS = ("垂直", "纵向", "row", "rows", "vertical", "y_count")


def grid_of(api, nid, depth=0, seen=None):
    """这张上传图下游有没有「切格子」节点 -> (列数, 行数)。

    漫剧那条工作流要求每张图本身就是一张 2×2 的四宫格拼图，下游会把它切成 4 个
    分镜。不说清楚的话，用户传一张普通图进去只会被切成四块碎片，还不知道为什么。
    判据不认节点类名：同一个节点上同时有「横向数量」和「纵向数量」两个整数输入、
    乘积大于 1，那它就是在切格子。
    """
    seen = set() if seen is None else seen
    if str(nid) in seen or depth > 8:
        return None
    seen.add(str(nid))
    for cid, _k in consumers(api, nid):
        ins = api[cid]["inputs"]
        pick = lambda hints: next(                                   # noqa: E731
            (v for f, v in ins.items()
             if isinstance(v, int) and not isinstance(v, bool)
             and any(h in f.lower() for h in hints)), None)
        c, r = pick(GRID_COLS), pick(GRID_ROWS)
        if c and r and c * r > 1:
            return (c, r)
        g = grid_of(api, cid, depth + 1, seen)
        if g:
            return g
    return None


def sized_pieces(api, nid):
    """这个尺寸节点算的是「每一份」的尺寸，还是整张成品的尺寸 -> 份数，不是就 0。

    「分辨率」这个词在拼图工作流里是歧义的：拼四宫格时填 0.5MP，得到的是每格
    0.5MP、整张 2MP。不说清楚的话，用户按下游视频卡的分辨率去填，出来的整图会大一倍。

    判据不认节点类名，只看结构，三条同时成立才算：
      1. 这个尺寸被 N(>1) 个节点各用了一遍，且这 N 个是同一种节点 —— N 路平行缩放；
      2. 这 N 路最后汇进同一个节点；
      3. 那个汇合节点「除了这 N 路什么都不收」—— 它只干合并这一件事。
    第 3 条是关键。少了它，首尾帧生视频（首帧尾帧各缩一次，都进 H3 节点）和漫剧
    四宫格（4 张参考图各缩一次，都进 H3 节点）会被误判成拼图；那两处的尺寸说的是
    成片画面尺寸，本来就该叫「分辨率」。H3 节点还要收提示词、种子、length，
    输入数对不上，就被这一条挡掉了。
    """
    users = {str(cid) for cid, _k in consumers(api, nid)}
    if len(users) < 2 or len({api[u]["class_type"] for u in users}) != 1:
        return 0
    for sink in set.intersection(*[{str(c) for c, _ in consumers(api, u)} for u in users]):
        ins = api[sink]["inputs"]
        srcs = {str(v[0]) for v in ins.values() if isinstance(v, list) and len(v) == 2}
        if len(ins) == len(users) and srcs == users:
            return len(users)
    return 0


def safe_cut(api, oi, cid, cin):
    """这根线拔掉之后，收线的那个节点自己还算得出东西吗。

    输入声明成 optional **不等于** 少了它还能算：缩放节点（ImageScaleByAspectRatio V2）
    的 image 就是 optional，真拔了它没东西可缩。两种情况才算能拔：

    - 动态字典的子项（`ref_images.ref_image_3`）：整份字典少一项而已，天生能少；
    - 拔完还剩一根「跟自己输出同类型」的入线，**且拔掉的这根跟输出不同类型**：
      这节点退化成原样透传 —— ReferenceLatent 收 conditioning + latent、只出
      CONDITIONING，少了 latent 就是把 conditioning 原样递出去（见 ComfyUI 的
      nodes_edit_model.py）。

    第二条后半句是拿首尾帧那条换来的：`ImageScaleByAspectRatio V2.image` 也声明成
    optional，但它出 `IMAGE/MASK/BOX/INT/INT` —— 「分辨率」那根 INT 线（Primitive 喂
    `scale_to_length`）跟它自己的 INT 输出同类型，光看"还剩同类型入线"就误判成能拔，
    可真拔了 image 它没东西可缩。**拔掉的那根跟输出同类型，说明它就是被加工的那个东西**，
    不能拔；ReferenceLatent 少的是 LATENT、出的是 CONDITIONING，才是真的可有可无。
    """
    if "." in cin:
        return True
    ct = api[cid]["class_type"]
    outs = oi.get(ct, {}).get("output") or []
    ct_in, _o = spec_of(oi, ct, cin)
    if ct_in in outs:
        return False                      # 它就是被加工的那个东西
    for k, v in api[cid]["inputs"].items():
        if k == cin or not (isinstance(v, list) and len(v) == 2):
            continue                      # 不是连线进来的（是个死值）
        t, _o = spec_of(oi, ct, k)
        if t in outs:
            return True
    return False


def slot_cuts(api, oi, nid, seen=None, depth=0):
    """这张上传图空着，工作流还跑得动吗 —— 顺着数据流往下找「可断点」。

    返回 (可断点列表, 这一槽能空吗, 这些线真能拔吗)。碰到 optional 输入就是一个
    可断点；碰到必填输入就继续往下问同样的问题；走到输出节点就是断不了。
    所有叶子都是可断点，这一槽才算能空着。

    「能空」和「能拔线」是两件事：能空 = 不填也不会报结构错误（老逻辑就是这个，
    不填就照模板里作者自带的演示图跑）；能拔 = 拔完这条支线没人依赖、ComfyUI
    干脆不执行它（那才是"真的没参与"）。所以只有 safe_cut() 全过才写 dropIfEmpty，
    一半能拔一半不能拔等于拔了个半残，比不拔更糟。

    以前只看**直接消费者**那一跳。对首尾帧的尾帧、参考图第 2~9 张够用（节点定义里
    直接就是 optional），但参考图编辑那种「图 → 缩放 → VAEEncode → ReferenceLatent.latent」
    的支线会被误判成必填：前两跳都是必填输入，真正能断的地方在第三跳。
    拼图这类工具照旧算必填 —— ImageGridComposite2x2 的 image1~4 全是必填，
    一路走到 SaveImage 也没有可断点，少一张 torch.cat 直接抛异常。
    判据只查 object_info 和图的结构，不认节点类名。
    """
    seen = set() if seen is None else seen
    if nid in seen or depth > 8:
        return [], True, True
    seen.add(nid)
    cs = consumers(api, nid)
    if not cs:
        return [], True, True             # 没人用它，空着也无所谓
    pts, ok, safe = [], True, True
    for cid, cin in cs:
        ct = api[cid]["class_type"]
        if is_optional(oi, ct, cin):
            pts.append({"node": cid, "input": cin})
            safe = safe and safe_cut(api, oi, cid, cin)
            continue
        if ct in SAVE_TYPES or oi.get(ct, {}).get("output_node"):
            ok = False                    # 产物这条路上没得断
            continue
        sub, sub_ok, sub_safe = slot_cuts(api, oi, cid, seen, depth + 1)
        pts += sub
        ok, safe = ok and sub_ok, safe and sub_safe
    return pts, ok, safe


def traced_label(api, nid, depth=0, seen=None):
    """顺着数据流往下找语义明确的输入名；GENERIC 只做兜底"""
    seen = seen or set()
    if nid in seen or depth > 6:
        return None
    seen.add(nid)
    fallback = None
    for cid, k in consumers(api, nid):
        if k in SLOT_SPECIFIC:
            return SLOT_SPECIFIC[k]
        deep = traced_label(api, cid, depth + 1, seen)
        if deep:
            return deep
        fallback = fallback or SLOT_GENERIC.get(k)
    return fallback


def has_cjk(s):
    return bool(re.search(r"[\u4e00-\u9fff]", s or ""))


def pick_label(title, generic):
    """用户自己写的中文标题或短标签优先；英文长标题一律换成通用中文标签"""
    t = (title or "").strip()
    # 应用标签替换规则
    for pattern, replacement in SLOT_LABEL_REPLACE.items():
        t = re.sub(pattern, replacement, t)
    if t and (has_cjk(t) or len(t) <= 4):
        return t, None
    return generic, (t or None)


def derive_inputs(api, oi, wid=None):
    images, audios, texts, params, seeds, outputs, crops, res = [], [], [], [], [], [], [], []
    videos, rates = [], []
    knobs = {**KNOBS, **CAP_KNOBS.get(wid, {})}   # 只对这条能力开的旋钮，见 CAP_KNOBS
    for nid, node in sorted(api.items(), key=lambda kv: int(str(kv[0]).split(":")[0])):
        ct, ins = node["class_type"], node["inputs"]
        title = node["_meta"]["title"]

        if ct == "LoadImage":
            images.append((nid, title))
        elif ct == "LoadAudio":
            audios.append((nid, title))
        elif ct in VIDEO_LOADERS:
            videos.append((nid, VIDEO_LOADERS[ct], title))
            # 上传节点自己也带旋钮（VHS 的 frame_load_cap = 只读前几帧），
            # 这是补帧这类慢活唯一的"先试一小段"开关，不能跟着上传槽一起跳过
            for f, v in ins.items():
                if not (is_literal(v) and f.lower() in knobs):
                    continue
                t, _o = spec_of(oi, ct, f)
                if t not in ("INT", "FLOAT"):
                    continue
                if f.lower() == RATE_IN:
                    rates.append((RATE_IN, nid, title, f, v, t))   # 要跟成片帧率配对
                else:
                    params.append((nid, title, f, v, "knob", t))
        elif ct == "AudioCrop":
            crops.append((nid, title))
        elif ct in SAVE_TYPES:
            outputs.append((nid, SAVE_TYPES[ct], is_preview(ct, ins)))
            if RATE_OUT in ins and is_literal(ins[RATE_OUT]):
                t, _o = spec_of(oi, ct, RATE_OUT)
                rates.append((RATE_OUT, nid, title, RATE_OUT, ins[RATE_OUT], t))
        else:
            # 通用规则：按输入的类型 + 名字 + object_info 选项判定角色，
            # 不依赖节点类名白名单，任何插件节点都能识别
            is_primitive = ct.startswith("Primitive") or ct in TEXT_TYPES
            lit_t = literal_out(oi, ct)
            lit_key = fed_knob(api, nid) if lit_t else None
            for f, v in ins.items():
                if not is_literal(v):
                    continue
                t, opts = spec_of(oi, ct, f)
                low = f.lower()
                hint = f"{title or ''} {f}".lower()
                if low in ("seed", "noise_seed", "rand_seed"):
                    # 种子上限各节点不一样（KSampler 是 2^64，SeedVR2 只到 2^32-1），
                    # 随机种子必须按这个上限来，超了 ComfyUI 直接拒收整个任务
                    seeds.append((nid, f, v, t, opts.get("max")))
                elif low in knobs and t in ("INT", "FLOAT"):
                    # 这几个旋钮基本都长在采样器/LoRA/加速这类"后台节点"上，
                    # 所以要抢在 HIDDEN_TYPES 之前放行
                    params.append((nid, title, f, v, "knob", t))
                elif lit_key:
                    # 数字中转节点喂给了一个已知旋钮：这个数字就是那个旋钮的值。
                    # 声明类型不算数（Int.Number 写的是 STRING），按输出类型走
                    params.append((nid, title, f, num(v), "knob", lit_t))
                elif ct in HIDDEN_TYPES:
                    continue                              # 后台节点只取种子和白名单旋钮
                elif low in RES_FIELDS and (low == "scale_to_length"
                                            or is_size_provider(oi, ct)):
                    res.append((nid, f, low, v, t, opts))
                elif t == "STRING" and opts.get("multiline") and isinstance(v, str):
                    if any(x in low for x in ("system", "negative", "suffix", "prefix")):
                        continue
                    if (wid, str(nid)) in FIXED_TEXT:
                        continue          # 作者写死的指令，不是提示词，见 FIXED_TEXT
                    if formula_node(oi, ct):
                        continue          # 公式不是提示词，开出来只会被人当输入框填坏
                    texts.append((nid, title, f, v))
                elif t == "STRING" and is_primitive and isinstance(v, str):
                    texts.append((nid, title, f, v))
                elif t in ("INT", "FLOAT"):
                    # 只有 Primitive 节点上的 duration 才是作者刻意暴露的时长旋钮；
                    # 别的节点（如 EmptyAudio.duration=0.01 的静音占位）同名但语义无关，
                    # 当成普通高级数值，否则时长滑条会写进错误的节点
                    if any(h in hint for h in DURATION_HINTS) and is_primitive:
                        params.append((nid, title, f, v, "duration", t))
                    elif low in ("width", "height"):
                        params.append((nid, low, f, v, "size", t))
                    elif is_primitive:
                        params.append((nid, title, f, v, "int", t))

    # 真产物排前面、临时预览排后面（同类保持节点 id 顺序）。scan() 取 outputs[0]
    outputs.sort(key=lambda o: o[2])

    # 帧率：上传的 force_rate 和成片的 frame_rate 必须相等，合成一个旋钮一起写
    # （见 RATE_IN/RATE_OUT）。缺一边就不开 —— 那说明帧率由图自己算。
    if {r[0] for r in rates} == {RATE_IN, RATE_OUT}:
        # force_rate=0 是"跟着原视频"，可原视频多少帧要到运行时才知道，而 frame_rate
        # 不收 0；这种情况以成片那个数为准，两边填成一样的才不会快放/慢放
        base = next((r[4] for r in rates if r[0] == RATE_IN and r[4]), None) \
            or next(r[4] for r in rates if r[0] == RATE_OUT)
        params += [(nid, title, field, base, "knob", vt)
                   for _role, nid, title, field, _val, vt in rates]

    # 用户自己标了数字序号（1/2/3…）就按序号排，否则按节点 id
    if images and all(re.fullmatch(r"\d+", (t or "").strip() or "x") for _n, t in images):
        images.sort(key=lambda it: int(it[1].strip()))

    # ---- 图 ↔ 提示词配对 ----------------------------------------------
    # 漫剧那类工作流把图和提示词分别塞进两个编号列表（ImageBatchMultiple+.image_k
    # 和 easy promptList.prompt_k），再用同一个循环下标从两边取出来配对跑：
    # 也就是「第 k 张图配第 k 条提示词」。序号集合完全对齐才算配对成功，
    # 免得凑巧都带序号的两组无关输入被硬凑一起。
    img_g = ord_group(api, [n for n, _t in images])
    txt_g = ord_group(api, [n for n, _t, _f, _v in texts])
    pair, drop = {}, {}                # texts下标->images下标 / images下标->可断开的链接
    if len(img_g) == 1:
        ic, im = next(iter(img_g.items()))
        # 没上传的图要把链接整根断开，编号列表才会真的变短（否则模板里的演示图会
        # 顶上来照跑一轮）。只对声明为 optional 的编号槽这么干：required 槽断了
        # 会直接报结构错误。这跟"图配提示词"无关，任何编号图槽都要断。
        ct = api[ic]["class_type"]
        drop = {i: [{"node": ic, "input": cin}] for k, (i, cin) in im.items()
                if is_optional(oi, ct, cin)}
        if len(txt_g) == 1:
            _tc, tm = next(iter(txt_g.items()))
            if len(im) > 1 and set(im) == set(tm):
                pair = {tm[k][0]: im[k][0] for k in im}

    # ---- 哪些文本框是「作者调好的规范」而不是用户提示词 ------------------
    # 同一个 llama_cpp_instruct_adv 节点，在别的工作流里 custom_prompt 就是用户
    # 随手写的一句话；在漫剧里它是两千多字的剧本格式规范，真正的用户内容从另一根
    # 线（system_prompt）送进来。所以字段名和长度都不能当判据，只能看结构：
    # 这个文本框所在的节点，已经从上游收到了配对提示词 —— 那它就是"规则"不是"内容"。
    tpl = set()
    if pair:
        for i, (nid, _t, _f, _v) in enumerate(texts):
            up = upstream(api, nid) if i not in pair else set()
            if any(str(tc) in up for tc in txt_g):
                tpl.add(i)

    out = []
    used = {}
    res_seen = set()

    def res_item(key, nid, field, val, vt, opts):
        """分辨率旋钮。同一个 key 出现多次（首帧/尾帧各缩放一次）时，
        第 2 个起标 mirror：面板只画一个输入框，后端照样写进每个节点。"""
        label, kind, bound = RES_FIELDS[key]
        item = {"key": key, "label": label, "type": kind, "default": val,
                "target": {"node": nid, "input": field}}
        # 拼图工作流里这个尺寸说的是「每一格」。比例不用改口：2×2 拼起来比例不变，
        # 两种读法是同一个数。分辨率不行，差 4 倍面积，得写在明面上
        n = sized_pieces(api, nid)
        if n and kind != "select":
            k = round(n ** 0.5)
            item["label"] = "每格" + label
            item["hint"] = (f"填的是拼图里每一格的大小，不是拼完那张整图的大小。"
                            f"{n} 张各自缩到这个尺寸再拼起来"
                            + (f"，整图宽高各是它的 {k} 倍。" if k * k == n else "。"))
        if kind == "select":
            item["options"] = list(opts.get("options") or [])
            if not item["options"]:
                return None
        else:
            item["target"]["vtype"] = vt if vt in ("INT", "FLOAT") else "INT"
            lo, hi, st = bound
            item.update(min=lo, max=hi, step=st)
        if key in res_seen:
            item["mirror"] = True
        res_seen.add(key)
        return item

    def uniq(label):
        used[label] = used.get(label, 0) + 1
        return label if used[label] == 1 else f"{label}{used[label]}"

    for i, (nid, title) in enumerate(images):
        gen = traced_label(api, nid) or "图片"
        label, hint = pick_label(None if default_title(oi, "LoadImage", title) else title, gen)
        cuts, cuttable, cuts_safe = slot_cuts(api, oi, nid)
        item = {"key": f"images[{i}]", "label": uniq(label), "type": "image",
                "required": i == 0 or not cuttable,
                "target": {"node": nid, "input": "image", "kind": "upload_image"}}
        if hint:
            item["hint"] = hint
        # 必填槽没得断，空着就直接报错了。编号图槽自己算过一次（顺序纠正过），以它为准
        lines = drop.get(i) or (cuts if cuts_safe else [])
        if lines and not item["required"]:
            item["dropIfEmpty"] = lines
        g = grid_of(api, nid)
        if g:
            item["grid"] = list(g)
        out.append(item)
    for i, (nid, field, title) in enumerate(videos):
        ct = api[nid]["class_type"]
        label, hint = pick_label(None if default_title(oi, ct, title) else title, "视频")
        # 视频槽也需要检查是否可断，避免把可选槽位标记为必填
        cuts, cuttable, cuts_safe = slot_cuts(api, oi, nid)
        item = {"key": f"video[{i}]", "label": uniq(label), "type": "video",
                "required": i == 0 and not cuttable,  # 第一个视频且不可断才必填
                "target": {"node": nid, "input": field, "kind": "upload_video"}}
        if hint:
            item["hint"] = hint
        # 为可选视频槽添加 dropIfEmpty，空着时断开下游连接
        if cuts and not item["required"]:
            item["dropIfEmpty"] = cuts if cuts_safe else []
        out.append(item)
    for i, (nid, title) in enumerate(audios):
        label, hint = pick_label(None if default_title(oi, "LoadAudio", title) else title, "音频")
        cuts, cuttable, cuts_safe = slot_cuts(api, oi, nid)
        item = {"key": f"audio[{i}]", "label": uniq(label), "type": "audio",
                "required": i == 0 and not cuttable,  # 第一个音频且不可断才必填
                "target": {"node": nid, "input": "audio", "kind": "upload_audio"}}
        if hint:
            item["hint"] = hint
        # 为可选音频槽添加 dropIfEmpty，空着时断开下游连接
        if cuts and not item["required"]:
            item["dropIfEmpty"] = cuts if cuts_safe else []
        out.append(item)
    for i, (nid, title, field, val) in enumerate(texts):
        ct = api[nid]["class_type"]
        label, hint = pick_label(None if default_title(oi, ct, title) else title,
                                "出片规范" if i in tpl else "提示词")
        item = {"key": "prompt" if i == 0 else f"prompt{i + 1}", "label": uniq(label),
                "type": "textarea", "default": val,
                "target": {"node": nid, "input": field}}
        if hint:
            item["hint"] = hint
        if i in tpl:
            # 面板会把它折起来，别让它长得像"第 6 条提示词"引人去改
            item["template"] = True
            item["note"] = ("预设的出片规范：分几个镜头、每镜多长、怎么硬切，都由它决定。"
                            "默认不用动，改了会直接影响成片结构。")
        if i in pair:
            # 面板把这些提示词收进一排 tab，第 k 个 tab 跟着第 k 张图亮/灭
            item["pairWith"] = f"images[{pair[i]}]"
        out.append(item)
    for nid, title, field, val, kind, vt in params:
        if kind == "duration":
            # 上下限按模型练过的帧数来：H3 三个视频节点的 length 都写着
            # 「trained range is ~124-362」，124 帧 = 5 秒、362 帧 = 15 秒。
            # 节点自己收到 3600 帧（150 秒），但那是没练过的区间 —— 拖出去不是"更长"，
            # 是画面开始散、动作开始飘。能拖但拖了变坏的范围不该摆在滑条上
            out.append({"key": "duration", "label": "时长(秒)", "type": "slider",
                        "min": 5, "max": 15, "step": 1, "default": val,
                        "hint": "5~15 秒是这个模型练过的范围。想要更长的片子就分几张卡各出一段"
                                "再接起来，硬拖长只会让动作发飘。"
                                "提示词里各镜头的时长加起来要对得上这个数",
                        "target": {"node": nid, "input": field, "vtype": vt}})
        elif kind == "knob":
            key = knob_key(api, nid, field, knobs)
            label, lo, hi, step, hint = knobs[key]
            if key in HARD_MAX:
                val = min(val, hi)
            if isinstance(val, float):
                # 图里存的是浮点噪声（0.5000000000000001），照抄进滑条既对不上步进
                # 也会在面板上原样显示出来
                val = round(val, 4)
            item = {"key": key, "label": label, "type": "slider",
                    "min": lo, "max": max(hi, val), "step": step, "default": val,
                    "hint": hint.replace("{d}", f"{val:g}"),
                    "advanced": key not in PRIMARY_KNOBS,
                    "target": {"node": nid, "input": field, "vtype": vt}}
            if any(x["key"] == key for x in out):
                item["mirror"] = True      # 同名旋钮出现多次：只画一个框，一起改
            out.append(item)
        elif kind == "size":
            out.append({"key": title, "label": {"width": "宽", "height": "高"}[title],
                        "type": "number", "default": val,
                        "target": {"node": nid, "input": field, "vtype": vt}})
        else:
            ct = api[nid]["class_type"]
            cid, cin = direct_consumer(api, nid)
            # Primitive 节点本身没有语义，看它喂给谁：喂给 scale_to_length
            # 就是这条工作流的分辨率旋钮（i2v/首尾帧生视频都是这么接的），
            # 不能当成匿名"高级数值"藏起来
            if cin in RES_FIELDS:
                _t, copts = spec_of(oi, api[cid]["class_type"], cin)
                item = res_item(cin, nid, field, val, vt, copts)
                if item:
                    out.append(item)
                    continue
            if default_title(oi, ct, title):
                title = zh_widget(api[cid]["class_type"], cin) if cin else "数值"
            out.append({"key": f"n{nid}", "label": title, "type": "number",
                        "default": val, "advanced": True,
                        "target": {"node": nid, "input": field, "vtype": vt}})
    for nid, field, key, val, t, opts in res:
        item = res_item(key, nid, field, val, t, opts)
        if item:
            out.append(item)
    aud_slot = {str(nid): f"audio[{i}]" for i, (nid, _t) in enumerate(audios)}
    for nid, title in crops:
        # 裁的是哪一条上传音频：顺着 AudioCrop 往上游找 LoadAudio，找到就把这一对
        # 起止点标成那个槽的"选区"，面板会画成一条能拖能试听的波形条（见 audioRange）
        up = upstream(api, nid)
        src = next((v for k, v in aud_slot.items() if k in up), None)
        # 默认值必须读工作流里的真值。写死 0:05 的话，模板本来裁 10 秒的（说话唱歌·双人
        # 就是）会被面板悄悄改成 5 秒，音频被砍一半还看不出是谁干的
        for key, label, field in (("audio_start", "音频起点", "start_time"),
                                  ("audio_end", "音频终点", "end_time")):
            item = {"key": key, "label": label, "type": "text",
                    "default": api[nid]["inputs"].get(field),
                    "target": {"node": nid, "input": field}}
            if src:
                item["rangeOf"] = src      # 有得试听，就不用藏进「高级」让人手打 0:05 了
            else:
                item["advanced"] = True
            out.append(item)
    # 多个采样器共用一个种子输入框，那就得取所有节点里最小的那个上限
    smax = min([m for *_r, m in seeds if isinstance(m, (int, float))] or [0]) or None
    for i, (nid, field, val, vt, _m) in enumerate(seeds):
        item = {"key": "seed", "label": "种子", "type": "seed", "default": val,
                "target": {"node": nid, "input": field, "vtype": vt or "INT"}}
        if smax:
            item["max"] = int(smax)
        if i:
            item["mirror"] = True          # 多个采样器共用同一个种子输入框
        out.append(item)

    hidden_keys = CAP_HIDDEN_INPUT_KEYS.get(wid, set())
    if hidden_keys:
        out = [item for item in out if item.get("key") not in hidden_keys]

    # H3 全能参考的素材全部可选。空图片/视频都要把模板支线断开；显示顺序仍是
    # 视频在前、图片随后、音频最后，但前端只展示真正已经引用的素材。
    if wid in VIDEO_REFERENCE_FIRST:
        for item in out:
            if item["type"] == "video":
                idx = int(item["key"][6:-1])
                item["label"] = f"视频{idx + 1}"
                item["required"] = False
                cuts, _cuttable, cuts_safe = slot_cuts(api, oi, item["target"]["node"])
                if cuts and cuts_safe:
                    item["dropIfEmpty"] = cuts
                    no_audio = [c for c in cuts if c["input"].startswith("ref_video_audios.")]
                    if no_audio:
                        item["dropIfNoAudio"] = no_audio
            elif item["type"] == "image":
                idx = int(item["key"][7:-1])
                item["label"] = f"图片{idx + 1}"
                item["required"] = False
                cuts, _cuttable, cuts_safe = slot_cuts(api, oi, item["target"]["node"])
                if cuts and cuts_safe:
                    item["dropIfEmpty"] = cuts
        order = {"video": 0, "image": 1, "audio": 2}
        out.sort(key=lambda item: order.get(item["type"], 3))

    # 切格子的工作流：这是用户唯一会踩的坑，写成卡片说明摆在最上面
    note = None
    grids = [tuple(s["grid"]) for s in out if s.get("grid")]
    if grids:
        c, r = grids[0]
        per, n = c * r, len(grids)
        note = (f"每张图都要是 {c}×{r} 的{ZH_GRID.get(per, str(per) + '宫格')}拼图，"
                f"上传后自动切成 {per} 个分镜、连成一段视频。"
                + (f"传满 {n} 张就是 {per * n} 宫格，按顺序接成一整条完整视频。"
                   if n > 1 else ""))
    return out, outputs, len(images), len(audios), len(videos), note


def is_tool(inputs):
    """纯加工能力：不采样、不写提示词，只是把素材换个形状（拼图 / 裁切 / 缩放）。

    判据是「要素材、但不写提示词」—— 生成类总得有句提示词描述要画什么；
    工具没有，它只认手上这份素材，改什么全看素材本身。
    反过来「必须有素材」也不能少，不然纯参数的工作流会被误判成工具。

    种子不能当判据：补帧、重画放大内部都用扩散模型、都要种子，但用户的诉求
    不是"创作一张新的"，而是"把这份素材弄好点"，那就是工具。

    工具要单独成卡（不能并进「生图」的模式列表），菜单里也单独一组：它不创作，
    混在生图里会让人以为它也在画画。所以这个判断顺手替它免了 SOLO 登记。
    """
    kinds = {i["type"] for i in inputs}
    return bool(kinds & {"image", "audio", "video"}) and "textarea" not in kinds


def required_keys(oi, ct):
    """展开 V3 自增长输入后真正的必填 key 集合。

    ComfyUI 的 get_finalized_class_inputs 会把 COMFY_AUTOGROW_V3 展成点号平铺的
    子 key（values.a / ref_images.ref_image_0），前 min 个且模板内层是 required
    的才算必填。不展开就查不出 "Required input is missing"。
    """
    keys = []
    for k, spec in (oi[ct]["input"].get("required") or {}).items():
        if not (isinstance(spec, list) and spec and spec[0] == "COMFY_AUTOGROW_V3"):
            keys.append(k)
            continue
        tpl = spec[1]["template"]
        names = tpl.get("names") or [f"{tpl['prefix']}{i}" for i in range(tpl["max"])]
        inner_required = "required" in tpl.get("input", {})
        if inner_required:
            keys += [f"{k}.{n}" for n in names[:tpl.get("min", 0)]]
    return keys


def repair_loop_count(api, oi, warns):
    """把「循环次数」接到量表上——作者忘接的那根线。

    漫剧20宫格是这么长的：forLoopStart 的下标同时去 indexAnything 取第 k 张图和
    第 k 条提示词，所以循环该跑「图有几张」次。作者放了一个 lengthAnything 量了
    图的条数，却没把它接进 total，total 还是写死的 1 —— 结果传 5 张图也只出 1 条。

    判据全靠结构，不认节点类名：total 是死数字、下标喂给了某个 indexAnything、
    而同一个列表上挂着一个输出 INT 又没人用的量表节点。三条同时成立才改。
    """
    for lid, node in list(api.items()):
        total = node["inputs"].get("total")
        if not isinstance(total, int):
            continue
        # 这个循环的下标在索引哪些列表
        lists = {str(x["inputs"]["any"][0])
                 for x in api.values()
                 if isinstance(x["inputs"].get("index"), list)
                 and str(x["inputs"]["index"][0]) == str(lid)
                 and isinstance(x["inputs"].get("any"), list)}
        for cid in lists:
            for mid, m in api.items():
                if (oi.get(m["class_type"], {}).get("output") == ["INT"]
                        and isinstance(m["inputs"].get("any"), list)
                        and str(m["inputs"]["any"][0]) == cid
                        and not consumers(api, mid)):
                    node["inputs"]["total"] = [mid, 0]
                    warns.append(f"已修：#{lid}.total 写死 {total}，改接 "
                                 f"#{mid} {m['class_type']}（按 #{cid} 的条数循环）")
                    return


def repair_bool_widgets(api, oi, warns):
    """把布尔小部件的空值填回节点默认值。

    ComfyUI 界面里从没动过的布尔小部件，导出 API 时会写成空串（分镜那条的
    easy promptLine.remove_empty_lines 就是 ""）。空串送进去等于关着，可作者的
    节点默认是开着的 —— 于是"去掉空行"失效，提示词之间的空行也被当成一条提示词，
    白跑一张没主体的图。判据只看类型：声明是 BOOLEAN、值却不是 True/False
    （空串、或者小部件错位串进来的 "randomize" 之类）。
    """
    for nid, node in api.items():
        for f, v in node["inputs"].items():
            if isinstance(v, bool) or not is_literal(v):
                continue
            t, opts = spec_of(oi, node["class_type"], f)
            if t != "BOOLEAN":
                continue
            dv = bool(opts.get("default", True))
            node["inputs"][f] = dv
            warns.append(f"已修：#{nid}.{f} 的值 {v!r} 不是布尔，按节点默认值 {dv} 送")


def swap_llm(api, oi, warns):
    """把工作流里写死的旧 gguf 换成 LLM_SWAP 指定的新文件。

    只认「这个字段的下拉里确实有新文件」才换 —— 模型没下好就不动，保持能跑的现状，
    只在警告里说一声。硬换成一个不存在的文件名，ComfyUI 会在提交时直接报错，
    比慢一点糟得多。
    """
    for nid, node in api.items():
        for f, v in list(node["inputs"].items()):
            if not isinstance(v, str):
                continue
            new = LLM_SWAP.get(v)
            if new:
                # 下拉的候选就在 spec 的第一项里（object_info 把 combo 的类型写成选项列表）
                t, _ = spec_of(oi, node["class_type"], f)
                if not (isinstance(t, list) and new in t):
                    warns.append(f"想把 #{nid}.{f} 换成 {new}，但 ComfyUI 的下拉里没有这个"
                                 f"文件（没下好？没重启 ComfyUI？）—— 仍用 {v}")
                    continue
                node["inputs"][f] = new
            # 记的是**最后用的是哪个**，不是"这一轮换掉了什么"。子图工作流
            # （分镜那条）复用的是磁盘上已经换好的 api.json，按"这一轮的动作"写
            # 第二遍就没得可换、这条也跟着消失 —— 重扫两遍结果不一致，就没法再靠
            # diff 发现真正的意外了。
            if node["inputs"][f] in NEW_LLM:
                warns.append(f"本地大模型：#{nid}.{f} = {node['inputs'][f]}")


def validate_api(api, oi):
    """提交前的结构自检：必填项是否齐全、连线是否悬空"""
    errs = []
    for nid, n in api.items():
        ct = n.get("class_type")
        if ct not in oi:
            errs.append(f"#{nid} 未知节点 {ct}")
            continue
        ins = n.get("inputs", {})
        for k in required_keys(oi, ct):
            if k not in ins:
                errs.append(f"#{nid}({ct}) 缺必填输入 {k}")
        for k, v in ins.items():
            if isinstance(v, list) and len(v) == 2 and isinstance(v[1], int) \
                    and str(v[0]) not in api:
                errs.append(f"#{nid}({ct}).{k} 上游 {v[0]} 不存在")
    return errs


def fingerprint(m):
    """能力的「输入指纹」：图片槽不算，其余 key 排序。
    两条工作流指纹相同、只差图片张数 —— 那就是同一件事的不同张数版本。"""
    return (m["audios"], tuple(sorted(i["key"] for i in m["inputs"] if i["type"] != "image")))


def route_card_def(cid, spec, by_id):
    """按素材类型路由的合并卡（见 ROUTE_CARDS）。

    只有一个模式，模式上挂 route：素材是图片就切到这条能力，是视频就切到那条。
    和 ladder 不同，这里两条能力的参数完全不一样（补帧倍数 / 放大到多少），
    没法画一张"并集"面板，所以放素材的那一刻就把卡片切成对应的能力 ——
    切完之后面板、参数、产出类型全都走原来那套，前端不用额外知道什么。
    """
    route = {}
    for kind, wid in spec["route"].items():
        m = by_id.get(wid)
        if not m:
            print(f"!! {cid} 少了 {kind} 那一路：{wid} 没扫到")
            continue
        slot = next((i["key"] for i in m["inputs"] if i["type"] == kind), None)
        if not slot:
            print(f"!! {cid}: {wid} 没有 {kind} 输入槽")
            continue
        route[kind] = {"cap": wid, "slot": slot, "name": m["name"]}
    first = by_id[route[next(iter(route))]["cap"]]
    mode = {"id": cid, "name": spec["name"], "slots": "/".join(route),
            "route": route, "entry": dict(spec["entry"])}
    return {"id": cid, "name": spec["name"], "icon": spec["icon"],
            "outputType": first["outputType"], "kind": "tool", "modes": [mode]}


def build_tools_card(ms, by_id):
    """「工具箱」合并卡：所有只加工素材的玩法收进一张卡，卡内用模式切换。

    ms 是归到 card_tools 的所有能力（grid4_stitch / rmbg_* / gimmvfi_interp），
    每个就是一个模式；再加一张「画质增强」（ROUTE_CARDS 的 card_enhance，按素材类型
    切图/视频两路），也作为一个模式收进来。模式顺序指排顺序就是先声明的先出现。
    """
    order = ["rmbg_cutout", "rmbg_bgonly", "rmbg_erase", "grid4_stitch", "gimmvfi_interp"]
    modes = []
    for wid in order:
        m = by_id.get(wid)
        if m:
            modes.append({"id": m["id"], "name": m["name"], "slots": m["slots"]})
    # 画质增强：那张合并卡的 mode 已经带 route，直接复用
    if "card_enhance" in ROUTE_CARDS:
        card = route_card_def("card_enhance", ROUTE_CARDS["card_enhance"], by_id)
        if card:
            modes.append(card["modes"][0])
            note = ROUTE_CARDS["card_enhance"].get("note")
            if note:
                modes[-1]["note"] = note
    if not modes:
        return None
    # 产出类型以多数工具的为准（工具大多出图）；前端用它做卡片图标的兜底
    first = by_id.get(modes[0]["id"]) or by_id.get(ms[0]["id"]) if ms else None
    return {"id": TOOLS_CARD["id"], "name": TOOLS_CARD["name"], "icon": TOOLS_CARD["icon"],
            "outputType": (first or {}).get("outputType", "image"), "kind": "tool",
            "modes": modes}


def build_modes(ms):
    """把「只差图片张数」的能力合并成一个模式：传几张图，就跑哪条工作流。

    图生视频(1图) 和 首尾帧生视频(2图) 的输入除了多一个尾帧槽完全一样，对用户
    来说本来就是一件事 —— 传一张是图生视频，传两张是首尾帧。让人先选模式再想
    张数是多余的；更糟的是选了首尾帧却只传一张，模板自带的演示尾帧会顶上来照跑。
    合并后张数说话，模式列表也短了。
    """
    fam = {}
    for m in ms:
        fam.setdefault(fingerprint(m), []).append(m)
    ladders = {}                                  # 合并后的 top id -> 阶梯
    for group in fam.values():
        counts = {m["images"] for m in group}
        if len(group) < 2 or len(counts) != len(group) or min(counts) < 1:
            continue                              # 张数撞车或压根没有图槽：不合并
        group.sort(key=lambda m: m["images"])
        top = group[-1]
        # 多出来的图槽必须是选填的，否则合并后用户看到一个必填槽却不需要填
        extra = [i for i in top["inputs"]
                 if i["type"] == "image" and int(i["key"][7:-1]) >= group[0]["images"]]
        if any(i.get("required") for i in extra):
            continue
        ladders[top["id"]] = {
            "name": group[0]["name"].split("·")[0],   # "说话唱歌·单人" -> "说话唱歌"
            "ladder": {str(m["images"]): m["id"] for m in group},
            "members": {m["id"] for m in group},
        }
    merged = {i for L in ladders.values() for i in L["members"]} - set(ladders)
    modes = []
    for m in ms:
        if m["id"] in merged:
            continue                              # 已经并进同族的 top 里了
        md = {"id": m["id"], "name": m["name"], "slots": m["slots"]}
        if m["id"] in ladders:
            md["name"] = ladders[m["id"]]["name"]
            md["ladder"] = ladders[m["id"]]["ladder"]
        modes.append(md)
    return modes


def slugify(name):
    s = re.sub(r"[^A-Za-z0-9]+", "_", name).strip("_").lower()
    return s if len(re.sub(r"[^a-z0-9]", "", s)) >= 3 else ""


def to_target_fps(inputs, api, oi, out_node):
    """把「补帧倍数」这个旋钮换成「目标帧率」。

    用户想的是"我要 60 帧的片子"，不是"补 2.5 倍"。补帧节点只吃整数倍数，成片帧率又是
    图自己算出来的（源 fps × 倍数），所以源 24 fps 只能出 48 / 72 / 96 —— 填 60 出 48，
    等于旋钮在骗人。差的那一截由上传节点的 `force_rate` 补：先把输入重采样到
    `目标 ÷ 倍数`，再补这么多倍，成片就正好是目标帧率，**时长不变**（force_rate 只改
    每秒取几帧，不改总时长）。倍数和 force_rate 都要按素材的真实 fps 才算得准，
    那要到提交时才知道，所以这里只把三个写入点记进 `derive`，真正算数在
    `app.py: derive_target_fps()`。

    认这个形状，不认工作流：有补帧倍数旋钮 + 有视频上传槽（才有 force_rate 可用）+
    成片帧率是连线算出来的、且算式上游就挂着那个倍数节点。三条都对上才换 ——
    帧率是死数字的（视频放大那条）本来就有正常的「帧率」旋钮，不该动。
    """
    fac = next((s for s in inputs if s["key"] == "interpolation_factor"), None)
    vid = next((s for s in inputs if s["target"].get("kind") == "upload_video"), None)
    if not (fac and vid):
        return
    vnode = str(vid["target"]["node"])
    rate = api.get(str(out_node), {}).get("inputs", {}).get(RATE_OUT)
    if RATE_IN not in api[vnode]["inputs"] or not isinstance(rate, list):
        return
    if str(fac["target"]["node"]) not in upstream(api, out_node):
        return
    ovt, _oo = spec_of(oi, api[str(out_node)]["class_type"], RATE_OUT)
    ivt, iopts = spec_of(oi, api[vnode]["class_type"], RATE_IN)
    label, lo, hi, step, hint = KNOBS["target_fps"]
    inputs[inputs.index(fac)] = {
        "key": "target_fps", "label": label, "type": "slider",
        "min": lo, "max": hi, "step": step, "default": lo * 2,
        "hint": hint, "advanced": "target_fps" not in PRIMARY_KNOBS,
        # 目标帧率本身就写在成片节点上（原来那根算式的线被这个数顶掉，
        # 于是算帧率的那两个节点没人依赖，ComfyUI 不会执行它们）
        "target": {"node": str(out_node), "input": RATE_OUT, "vtype": ovt or "FLOAT"},
        "derive": {
            "kind": "target_fps",
            "source": vid["key"],                       # 按这个槽里的素材探真实 fps
            "factor": dict(fac["target"], min=fac["min"], max=fac["max"]),
            "rateIn": {"node": vnode, "input": RATE_IN, "vtype": ivt or "FLOAT",
                       "max": iopts.get("max")},        # force_rate 有节点上限（60）
        },
    }


def h3_character_transfer_inputs(api):
    """TimelineDirector 把素材藏在 JSON 中；为抽卡面板显式声明可复用的输入槽。"""
    timeline = api["11"]["inputs"]
    segment = api["43"]["inputs"]
    sampler = api["30"]["inputs"]
    return [
        {"key": "video[0]", "label": "动作来源视频", "type": "video", "required": True,
         "target": {"node": "11", "input": "timeline_data", "kind": "timeline_asset"}},
        {"key": "images[0]", "label": "替换人物参考图", "type": "image", "required": True,
         "target": {"node": "11", "input": "timeline_data", "kind": "timeline_asset"}},
        {"key": "prompt", "label": "迁移要求", "type": "textarea",
         "default": segment["prompt"], "target": {"node": "43", "input": "prompt"}},
        {"key": "width", "label": "宽", "type": "number", "default": timeline["width"],
         "min": 256, "max": 1344, "step": 32,
         "target": {"node": "11", "input": "width", "vtype": "INT"}},
        {"key": "height", "label": "高", "type": "number", "default": timeline["height"],
         "min": 256, "max": 1344, "step": 32,
         "target": {"node": "11", "input": "height", "vtype": "INT"}},
        {"key": "duration", "label": "单段时长(秒)", "type": "slider",
         "min": 5, "max": 15, "step": 1, "default": timeline["generation_seconds"],
         "hint": "长视频会按这个长度自动切段。10 秒兼顾连贯性和显存；调短会增加分段数量和总耗时。",
         "target": {"node": "11", "input": "generation_seconds", "vtype": "FLOAT"}},
        {"key": "steps", "label": "采样步数", "type": "slider",
         "min": 1, "max": 40, "step": 1, "default": api["9"]["inputs"]["steps"],
         "hint": "原始融合模型按 8 步工作。", "advanced": True,
         "target": {"node": "9", "input": "steps", "vtype": "INT"}},
        {"key": "overlap_frames", "label": "分段重叠帧", "type": "slider",
         "min": 1, "max": 192, "step": 1, "default": segment["overlap_frames"],
         "hint": "相邻分段用于动作和音频续接的重叠长度，推荐保持 48。", "advanced": True,
         "target": {"node": "43", "input": "overlap_frames", "vtype": "INT"}},
        {"key": "seed", "label": "种子", "type": "seed", "default": sampler["seed"],
         "max": 18446744073709551615,
         "target": {"node": "30", "input": "seed", "vtype": "INT"}},
    ]


def scan(path: Path, oi, rel_key=None):
    wf = json.loads(path.read_text(encoding="utf-8"))
    warns = []
    subs = wf.get("definitions", {}).get("subgraphs", [])
    if subs:
        warns.append(f"含 {len(subs)} 个子图(subgraph)，本地转换无法展开 -> 必须用 ComfyUI「工作流→导出(API)」")

    wid = ALIASES.get(rel_key) or slugify(path.stem) or "wf_" + hashlib.md5(
        path.stem.encode("utf-8")).hexdigest()[:8]
    api_path = ROOT / "graphs" / f"{wid}.api.json"
    if (subs or wid in MANUAL_API) and api_path.exists():
        reason = "子图工作流" if subs else "时间线素材工作流"
        warns = [f"{reason}：使用已维护的 {api_path.name}"]
        api = json.loads(api_path.read_text(encoding="utf-8"))
    else:
        api = ui_to_api(wf, oi, warns, revive=wid in REVIVE)
    repair_loop_count(api, oi, warns)
    repair_bool_widgets(api, oi, warns)
    swap_llm(api, oi, warns)
    # 摘孤儿必须排在 repair_* 后面：漫剧那条的「循环次数」量表本来就是没人用的孤儿，
    # 正等着 repair_loop_count 把它接进 total —— 先摘就把要修的东西摘掉了
    prune_dead(api, oi, warns)
    inputs, outputs, n_img, n_aud, n_vid, note = derive_inputs(api, oi, wid)
    if wid == H3_CHARACTER_TRANSFER:
        inputs = h3_character_transfer_inputs(api)
        n_img, n_aud, n_vid = 1, 0, 1
    if outputs:
        to_target_fps(inputs, api, oi, outputs[0][0])
    out_type = outputs[0][1] if outputs else "unknown"
    warns += [f"结构错误 {e}" for e in validate_api(api, oi)]
    if not outputs:
        warns.append("找不到输出节点（SaveImage/SaveVideo/…），无法取回产物")

    tool = is_tool(inputs)
    manifest = {
        "id": wid,
        "name": DISPLAY.get(wid) or short_name(path.stem),
        "file": path.stem,                      # 原始文件名，出问题时对得上
        "source": str(path),
        "group": {"video": "视频", "image": "图片", "audio": "音频"}.get(out_type, "其他"),
        "outputType": out_type,
        "kind": "tool" if tool else "gen",      # 工具（只加工素材）还是创作
        # 归并到哪张卡：ROUTE_CARDS 点名的进合并卡，工具统一进「工具箱」，
        # 其余按产出类型并到「生图 / 生视频 / 生音频」里当模式
        "card": route_card(wid) or (TOOLS_CARD["id"] if tool else out_type),
        "slots": f"img{n_img}+aud{n_aud}+vid{n_vid}",   # 槽位指纹
        "images": n_img,
        "audios": n_aud,
        "videos": n_vid,
        # 槽位动态配置：前端可根据此元数据实现"按需添加素材"交互
        "slotLimits": {
            "image": {
                "min": 1 if n_img > 0 and any(inp.get("required") and inp["key"].startswith("images[") for inp in inputs) else 0,
                "max": n_img
            },
            "audio": {
                "min": 1 if n_aud > 0 and any(inp.get("required") and inp["key"].startswith("audio[") for inp in inputs) else 0,
                "max": n_aud
            },
            "video": {
                "min": 1 if n_vid > 0 and any(inp.get("required") and inp["key"].startswith("video[") for inp in inputs) else 0,
                "max": n_vid
            },
        },
        "graph": f"graphs/{wid}.api.json",
        "output": {"node": outputs[0][0]} if outputs else None,
        "note": note or NOTES.get(wid),
        "rewrite": REWRITE.get(wid),            # 有这一项才画「✨优化」按钮
        "compare": wid in COMPARE,              # 卡片上画「原图 ↔ 结果」那条拖动线
        "inputs": inputs,
        "warnings": warns,
    }
    if wid == H3_CHARACTER_TRANSFER:
        manifest["patch"] = {
            "kind": "h3_character_transfer", "timelineNode": "11",
            "video": "video[0]", "image": "images[0]",
        }
    # 子图工作流也要写回：它的输入就是这份已导出的 api.json，上面那些 repair_* 只改了
    # 内存，不写回去的话真正提交给 ComfyUI 的还是没修的图。重扫一次是幂等的，
    # 从 ComfyUI 重新「导出(API)」覆盖后再扫，照样会把修补重新打上。
    api_path.write_text(json.dumps(api, ensure_ascii=False, indent=1), encoding="utf-8")
    (ROOT / "manifests" / f"{wid}.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    return manifest


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    global ZH
    oi = load_object_info()
    ZH = load_zh()
    args = sys.argv[1:]
    targets = []
    if args:
        for a in args:
            p = Path(a)
            if p.is_dir():
                targets += [(f, None) for f in sorted(p.rglob("*.json"))]
            elif p.exists():
                targets.append((p, None))
            else:
                print(f"!! 找不到 {a}")
    else:
        for rel in ALIASES:
            p = WF_DIR / rel
            if p.exists():
                targets.append((p, rel))
            else:
                print(f"!! 缺文件 {rel}")

    (ROOT / "graphs").mkdir(exist_ok=True)
    (ROOT / "manifests").mkdir(exist_ok=True)

    groups, manifests = {}, []
    for p, rel in targets:
        try:
            m = scan(p, oi, rel)
        except Exception as e:
            print(f"!! 扫描失败 {p.name}: {type(e).__name__}: {e}")
            continue
        manifests.append(m)
        groups.setdefault(m["card"], []).append(m)

        print(f"\n=== {m['id']}  [{m['group']}/{m['outputType']}]  {m['name']}")
        print(f"    槽位 {m['slots']}   输出节点 {m['output']}")
        for i in m["inputs"]:
            flag = "*" if i.get("required") else (" advanced" if i.get("advanced") else "")
            dv = i.get("default")
            dv = (str(dv)[:40] + "…") if isinstance(dv, str) and len(str(dv)) > 40 else dv
            print(f"    - {i['label']:<10} {i['type']:<9} {i['key']:<12} "
                  f"-> #{i['target']['node']}.{i['target']['input']}  默认={dv}{flag}")
        for w in m["warnings"]:
            print(f"    ⚠ {w}")

    CARD_META = {
        "image": ("card_image", "生图", "🖼"),
        "video": ("card_video", "生视频", "🎬"),
        "audio": ("card_audio", "生音频", "🎵"),
    }
    by_id = {m["id"]: m for m in manifests}
    cards = []
    for key, ms in groups.items():
        # 工具统一收进「工具箱」卡：模式是各个工具玩法（见 build_tools_card）。
        # ROUTE_CARDS 的 card_enhance 也作为其中一个模式收进来，所以这里不再单独成卡。
        if key == TOOLS_CARD["id"]:
            cards.append(build_tools_card(ms, by_id))
            continue
        # card_enhance 自己被归进 card_tools（它的组还在，作为模式复用了），跳过，
        # 否则它会在「工具箱」之外再冒出一张单独的「画质增强」卡。
        if key in ROUTE_CARDS:
            continue
        ms.sort(key=lambda m: (m["images"], m["audios"]))
        kind = ms[0].get("kind", "gen")
        # 没进 CARD_META 的 key 就是单独成卡的能力，卡名和图标都跟着它自己走。
        # 工具的产出也是图片，跟「生图」共用 🖼 会看不出区别，单独给个 🧩。
        solo_icon = "🧩" if kind == "tool" else \
            CARD_META.get(ms[0]["outputType"], (0, 0, "◻"))[2]
        cid, cname, icon = CARD_META.get(key, (key, ms[0]["name"], solo_icon))
        cards.append({
            "id": cid, "name": cname, "icon": icon, "outputType": ms[0]["outputType"],
            "kind": kind,                       # 前端菜单按它分「工具」一组
            "modes": build_modes(ms),
        })
    # 素材卡、文本卡、风格卡排最后：它们都不出产物，是给别的卡送料的
    # （见 ASSET_CARD / TEXT_CARD / STYLE_CARD）
    cards.append(dict(ASSET_CARD))
    cards.append(dict(TEXT_CARD))
    cards.append(dict(STYLE_CARD))
    (ROOT / "manifests" / "_cards.json").write_text(
        json.dumps(cards, ensure_ascii=False, indent=1), encoding="utf-8")
    print("\n=== 自动归并：画布上只有这几张卡，工作流退化为卡内「模式」")
    for c in cards:
        print(f"    {c['icon']} {c['name']}  ({len(c['modes'])} 模式)")
        for md in c["modes"]:
            print(f"        [{md['slots']:<10}] {md['id']:<26} {md['name']}")
            for n, wid in sorted(md.get("ladder", {}).items()):
                print(f"            {n} 张图 -> {wid}")
            for k, r in md.get("route", {}).items():
                print(f"            放{k} -> {r['cap']}  (填 {r['slot']})")
    print(f"\n共 {len(manifests)} 个能力 -> chouka/manifests/")


if __name__ == "__main__":
    main()
