# 抽卡系统 — 方案与进度

基于本机 ComfyUI（`D:\ComfyUI_Mie_V33`）的 Web 创作前台。ComfyUI 只作渲染后端，不对外暴露。

---

## 0. 环境结论（2026-08-22 实测）

| 项 | 结果 | 决策影响 |
|---|---|---|
| Node / npm | **未安装** | 前端 P0 免构建（单页 + 原生 JS），不引入 Vite/React Flow |
| `python_embeded/python.exe` | 3.12.10 | 后端直接用它，零安装 |
| aiohttp / aiofiles / PIL / websockets / sqlite3 | 全部可用 | 后端用 aiohttp（uvicorn 缺，不用 FastAPI） |
| ComfyUI `127.0.0.1:8188` | 存活 (200) | 直接对接 |
| ffmpeg | **不在 PATH** | P2 拼接功能前需补 |

目录结构：

```
chouka/
├─ PLAN.md
├─ manifests/     # 能力清单（自动扫描生成 + 人工微调）
├─ graphs/        # API 格式工作流（提交给 /prompt 的模板）
├─ server/        # aiohttp 后端
├─ web/           # 免构建前端
└─ data/          # sqlite + 资产/产物
```

---

## 1. 核心抽象：画布节点 ≠ ComfyUI 节点

用户看到的卡片是**产物卡**（图片1 / 视频2），不是 KSampler/VAEDecode。

| 层 | 概念 | 说明 |
|---|---|---|
| 用户 | **卡片 Card** | 一个卡片 = 一个产物 + 生成它的配方 |
| 连线 | **Edge** | 上游产物 → 下游卡片的输入槽（首帧/参考图/驱动音频） |
| 配置 | **能力 Capability** | 一个 ComfyUI 工作流 + 参数映射清单 |
| 底层 | **Job** | patch graph → `/prompt` → 产物入库 |

用户永远看不到 CLIPLoader / VAELoader / 采样器。一张卡只暴露 3~6 个字段。

### 统一入参模型（所有工作流都能装进去）

```
prompt: string
images: Asset[]      # 槽位命名取自节点标题：首帧/尾帧/场景/角色/1..5
audio:  Asset?
duration: number     # 秒
size: {w,h} | short_side
seed: number
```

> **H3 帧数不暴露。** 工作流里 `ComfyMathExpression` 用
> `max(5,round(a*24)) + (5 - (…%17))%17` 从时长算 17 帧对齐帧数。
> 前端只给时长滑条，公式留在工作流里，否则时长/画质异常。

---

## 2. 节点自动推导（不手写 manifest）

### 2.1 槽位识别规则

| 工作流里的节点 | 推导为 | 标签来源 |
|---|---|---|
| `LoadImage` | 图片槽 | 节点 title，无则 `ref1..N` |
| `LoadAudio` | 音频槽 | title |
| `AudioCrop` | 音频裁剪 起/止 | — |
| `PrimitiveStringMultiline` / `easy positive` / `CLIPTextEncode` | 提示词 | title |
| `PrimitiveFloat`（title 含 duration/时长） | 时长滑条 | — |
| `PrimitiveInt` | 短边 / 数值 | title |
| `EmptySD3LatentImage` / `EmptyLatentImage` | 宽 / 高 | — |
| `RandomNoise.noise_seed` / `KSampler.seed` | 种子 | — |
| subgraph 暴露入口（如 `pixels/custom_prompt/seed`） | 按名+类型直接映射 | 入口名 |
| `SaveImage` / `SaveVideo` / `SaveAudio` | 输出类型与取回位置 | — |
| `UNETLoader` / `CLIPLoader` / `VAELoader` / `LoraLoaderModelOnly` / 采样器 / `TESpeedMiniMaxH3` | **隐藏**（高级） | — |
| `mode != 0`（静音/绕过）的节点 | 忽略 | — |

新增工作流 = 往目录丢一个 json，画布自动多一种卡。

### 2.2 自动整合（同签名折叠）

输入签名 = `图片数量 + 有无音频 + 输出类型`。签名相同的工作流合并成**同一张卡的不同模式**，切模式时槽位自增减。
→ 8 个 H3 工作流折叠成 1 张"视频卡"，用户不必在文件名里挑。

### 2.3 manifest 结构（扫描器产出）

```json
{
  "id": "minimax_h3_i2v",
  "name": "图生视频 (MiniMax H3)",
  "group": "视频",
  "outputType": "video",
  "graph": "graphs/minimax_h3_i2v.api.json",
  "signature": "img1+audio0+video",
  "output": { "node": "92" },
  "inputs": [
    { "key": "images[0]", "label": "首帧", "type": "image", "required": true,
      "target": { "node": "114", "input": "image", "kind": "upload" } },
    { "key": "prompt", "label": "提示词", "type": "textarea",
      "target": { "node": "152", "input": "positive" } },
    { "key": "duration", "label": "时长", "type": "slider",
      "min": 3, "max": 12, "step": 1, "default": 5,
      "target": { "node": "142", "input": "value" } },
    { "key": "seed", "label": "种子", "type": "seed",
      "target": { "node": "174", "input": "noise_seed" } }
  ]
}
```

提交时后端只做：深拷贝 graph → 按 target 写值 → `POST /prompt`。
target 用 **节点 id + 输入名**（不是 widget 下标），抗工作流小改动。

---

## 3. 已实测的工作流入参表

| 能力 | 文件 | 图 | 文本 | 其他 | 输出 |
|---|---|---|---|---|---|
| 九宫格故事分镜 | `九宫格Qwen3.5-Flux2-Kelin一键故事分镜` | 1（节点76） | subgraph `custom_prompt` | seed | 九宫格大图（节点9） |
| Z-Image 文生图 | `z-Image-标准版文生图` | — | 节点45 | 宽高 41(768×1024)、seed 44 | 图（节点9） |
| H3 图生视频 | `@MinimaxH3：图生视频(4步)` | 1（114） | 152 | 时长 142、短边 168、seed 174 | mp4 带音（92） |
| H3 首尾帧 | `@MinimaxH3：首尾帧(4步)` | 2（114/162） | 152 | 时长 142 | mp4（92） |
| H3 说话唱歌·单人 | `@MiniMax H3_说话唱歌单人` | 1（137） | 138 | 音频 171 + 裁剪 177、时长 132 | mp4 对口型 |
| H3 说话唱歌·双人 | 同系列双人 | 2~4（137/227/236/237） | 138 | 音频、时长 | mp4 |
| H3 四图参考 | `四图全能参考单采` | 4（47场景/48角色/49/66） | — | 时长 20 | mp4 |
| H3 漫剧20宫格 | `批量化漫剧20宫格V3` | 5（193-197） | — | 时长 343(12s) | 1 分钟长视频 |

---

## 4. 架构

```
浏览器（抽卡系统 Web）
   │ REST + WebSocket
抽卡后端（唯一对外入口）
   ├─ 项目 / 画布 / 卡片持久化（sqlite）
   ├─ 能力清单加载 + 参数校验
   ├─ 任务队列（GPU 串行，1 个 ComfyUI = 1 worker）
   ├─ 资产库（上传图/音频、产物 mp4/png、缩略图）
   └─ ComfyUI Client：/upload/image → /prompt → /ws 进度 → /history → /view
ComfyUI（127.0.0.1:8188，不对外）
```

**必须有中间层**：ComfyUI 无鉴权、无多用户、无队列优先级、产物路径裸奔，直接暴露等于给服务器 root。

### 数据模型

- `projects(id, name, created_at)`
- `canvas_nodes(id, project_id, kind, x, y, capability_id, mode, params_json, status, job_id)`
- `canvas_edges(id, project_id, from_node, from_slot, to_node, to_slot)`
- `assets(id, kind, path, w, h, duration, thumb, from_job)`
- `jobs(id, capability_id, params_json, comfy_prompt_id, status, progress, error, started_at, ended_at)`

---

## 5. 交互（对齐即梦式画布）

1. 空画布双击 → 空卡 → 选能力（文生图 / 视频 / 说话唱歌…）
2. 卡片下方弹参数面板（截图里"重新编辑 / 图片生成 / 视频生成"那块）
3. 点 ↑ 运行 → 卡片进入排队/进度环 → 完成变缩略图，视频卡带时长与播放
4. 从卡片右侧圆点拖出 → 新卡自动把上游产物填进第一个图片槽（图→视频链路）
5. 左侧项目栏可收起（`w-64 → 0`），右侧默认"新建画布创作"空态

---

## 6. 杀手链路（把你现在手工做的自动化）

```
文生图 / 九宫格分镜 → [后端切图 3×3] → 9 张镜头卡
        ↓ 每张
   H3 图生视频（或说话唱歌，喂配音）
        ↓
   ffmpeg 拼接 → 成片
```

"切九宫格"与"拼接"做成**后端内置节点**（PIL / ffmpeg，不走 ComfyUI），秒级完成。做成一键模板即"抽卡"核心体验。

---

## 7. 阶段

| 阶段 | 内容 | 状态 |
|---|---|---|
| P0 | 自动扫描器 ✅ / 8 个能力自动推导 ✅ / 后端提交·进度·产物 ✅ / 前端画布 ✅ | 完成 |
| P1 | 项目栏 ✅ + 画布持久化 ✅ + 连线传参 ✅ / 队列 + 资产库 | 部分 |
| P2 | 全部 H3 能力 + 九宫格切图 + ffmpeg 拼接 + 一键模板 | — |
| P3 | 多用户 / 登录 / 配额 / 分享，多 GPU worker 池 | — |

---

## 7.1 后端接口（P0 已实现，端口 8199）

**监听 `0.0.0.0:8199`，局域网里的手机 / 别的电脑直接用 `http://<本机内网IP>:8199` 就能进**
（启动时会把网址打在黑窗口里，`lan_ips()`）。前端所有请求都是相对路径，产物也走
`/api/file` 代理，所以 **8188 不用开、也不该开** —— 局域网客户端一次都不碰 ComfyUI。
进不去先看 Windows 防火墙有没有拦 `python.exe` 的入站（同一网段、能互相 ping 通是前提）。

**没有登录**：进得来的人就能跑任务、删画布、看全部产物，`/api/reveal` 还会在这台机器上
弹资源管理器窗口。只在信得过的网里开，别做端口映射往公网转。

| 接口 | 说明 |
|---|---|
| `GET /api/health` | 自检：ComfyUI 是否在线、能力数 |
| `GET /api/cards` | 画布卡片 + 全部能力清单（前端字段由此生成） |
| `POST /api/reload` | 改完工作流重扫后热加载，不用重启 |
| `POST /api/upload` | 上传图/音频，转存进 ComfyUI `input/chouka/`，文件名统一改 ASCII |
| `POST /api/generate` | `{capability, params, assets, dry_run?}`；`dry_run` 只回参数打点 diff，不排队。另收 `project/card/cardName`，只给任务浮窗用（显示"是哪张卡在跑"、能点回去） |
| `GET /api/job/{id}` | 状态 / 进度 / 产物；`GET /api/jobs` 列表（最近 60 条，右上角「任务(n)」轮询它） |
| `POST /api/job/{id}/cancel` | 运行中调 `/interrupt`，排队中从队列删除 |
| `DELETE /api/job/{id}` | 从任务列表抹掉一条；还没跑完的先停下来再删 |
| `POST /api/jobs/clear` | 清掉所有已结束的任务记录，在跑和排队的留着 |
| `GET /api/file?...` | 代理 ComfyUI `/view`，8188 不外露 |

`progress` 是**整条工作流**的进度，只涨不跌，跑完前不会到 100%。算法在 `handle_event` 的
`progress_state` 分支：ComfyUI 每条 `progress_state` 都带上全部非 pending 节点的
`value/max/state`，干完的按满权重、在跑的按自己那点比例折算，除以「这次真要跑的节点总权重」
（`execution_cached` 命中的那些从分子分母里一起摘掉）。权重表 `STEP_WEIGHT` 给采样 / 超分 /
补帧这些重活配了 60、解码 8、编码 4，其余 1 —— 按节点数平摊的话进度条会先冲到六成、
再在采样那一格上卡几分钟。当前步骤后面还会带上「5/8」，那一格里的细进度看这个。

**任务列表扛得住重启**：`JOBS` 落在 `data/jobs.json`（`save_jobs()`，只在状态变了的时候写 ——
新建 / 开跑 / 完成 / 失败 / 取消 / 删除；进度每秒十几条，不跟着写，重启后那个数字也没意义）。
存最近 60 条，跟 `/api/jobs` 返回的一样多。启动时 `load_jobs()` 读回来，把当时还在
`queued/running` 的一律改成 `canceled` 并附一句「抽卡系统重启了」—— 那个进程早没了，
留着 running 的话前端会对着一个永不动的进度条一直轮询。前端不用改：它本来就认 `canceled`，
`pollJobs` 会把对应卡片一起落地，且只在 `error` 上弹提示，不会炸一排 toast。

**改完前端刷新还是旧的**：`add_static` 只发 Last-Modified + ETag，不发 Cache-Control，
浏览器就自己按启发式规则判新鲜度、连问都不问。`no_cache`（`on_response_prepare`）给
`/api/` 以外的响应统一补一句 `Cache-Control: no-cache` —— 意思是"每次回来问一句"，
没改就 304。`/api/` 不管：产物 mp4 是真该缓存的。这条改动本身要重启后端才生效。

### 实测踩到并已修的两个致命点

1. **API 图里连线的节点 id 必须是字符串**：写成 `[43, 0]` 会让 ComfyUI 在校验期抛
   `KeyError: 43`（`execution.py:933`），报错信息还指向无关的 SaveImage 节点，极难定位。必须 `["43", 0]`。
2. **数值类型要跟节点声明一致**：时长节点是 `PrimitiveFloat`，若写成整数，`7.5` 会被截断成 7。
   现在 manifest 的 target 里带 `vtype`，由扫描器从 `object_info` 读出。
3. **V3 自增长输入（`COMFY_AUTOGROW_V3`）必须点号平铺，不能折成数组**：
   `ComfyMathExpression.values` / `MiniMaxH3ReferenceToVideo.ref_images` 在 API 图里得写成
   `"values.a": ["142",0]`、`"ref_images.ref_image_0": [...]`。折成 `"values": [["142",0]]`
   会在校验期报 `#178: Required input is missing`（ComfyUI 侧 `get_finalized_class_inputs`
   先把 autogrow 展成点号 key，再由 `build_nested_inputs` 折回嵌套）。
   扫描器的 `required_keys()` 现在会展开 autogrow，这类错误在扫描阶段就能查出。

## 8. 已知坑

1. 文件名带 `@`、中文、空格 → 提交前统一改 ASCII id。
2. 视频产物在 `/view?filename=..&type=output&subfolder=video`，后端代理转发，不外露。
3. 首次加载 H3（32B CLIP + int8 unet）很慢 → ComfyUI 常驻，别频繁卸载。
4. **H3 音频补丁**：`comfy/ldm/minimax/model.py` 已修缩放还原，整合包升级会覆盖 → 后端启动自检哈希，不对就告警，否则批量出片全是白噪音。
5. 20宫格单任务几分钟~几十分钟 → 任务可断点查询，前端不靠长连接兜底。
6. 九宫格工作流用了新版 subgraph（节点 183 类型是 UUID）→ API 格式里会展开成 `183:5` 复合 id，必须用 ComfyUI「导出(API)」验证。
