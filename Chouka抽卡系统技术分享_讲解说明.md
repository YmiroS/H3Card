# Chouka 抽卡系统技术分享讲解说明

> 对应演示文件：`Chouka抽卡系统技术分享.html`  
> 面向对象：需要了解、维护或扩展 Chouka 的研发同事  
> 建议时长：15–20 分钟  
> 内容依据：当前仓库中的实际代码链路

---

## 1. 使用方式

### 演示操作

直接使用浏览器打开：

```text
chouka/Chouka抽卡系统技术分享.html
```

快捷键：

| 快捷键 | 功能 |
|---|---|
| `←` / `→` | 上一页 / 下一页 |
| `Space` | 下一页 |
| `Home` / `End` | 第一页 / 最后一页 |
| `N` | 显示当前页讲解提示 |
| `F` | 进入或退出全屏 |
| `?` | 显示快捷键帮助 |

建议使用浏览器全屏演示。演示前检查页面比例是否为 16:9，正文和图中节点是否清晰可见。

### 推荐时间分配

| 页面 | 内容 | 建议时间 |
|---|---|---:|
| 1 | 系统边界 | 1 分钟 |
| 2 | 两种部署形态 | 1 分钟 |
| 3 | 组件架构 | 1 分钟 |
| 4 | 前端运行结构 | 1 分钟 |
| 5 | 服务端生成管线 | 2 分钟 |
| 6 | Graph、Manifest、Cards 契约 | 2 分钟 |
| 7 | Local 执行时序 | 1.5 分钟 |
| 8 | Controller / Worker 时序 | 2 分钟 |
| 9 | Worker 调度 | 1 分钟 |
| 10 | 状态与存储 | 1 分钟 |
| 11 | 新能力接入 | 1 分钟 |
| 12 | 后续目标架构 | 1.5 分钟 |

正文约 16 分钟，开场和结束语约 1 分钟，余下约 2–3 分钟用于问答；若需更充分讨论，可以在最后单独追加问答。只有 15 分钟时压缩第 3、4、9、10 页，只讲每页最上方的核心结论。以下术语表供备讲和问答使用，不需要逐项念完。

### 术语和简称速查

| 名词 | 分享时的解释 |
|---|---|
| Chouka（抽卡系统） | 面向业务的画布、权限、能力封装、任务编排与资源治理服务，不是推理引擎。 |
| ComfyUI | 执行模型/自定义节点组成的图，提供任务提交、事件、历史记录和输出文件的引擎。 |
| Local / Controller 模式 | 前者由 Chouka 直连本机 ComfyUI；后者由集中服务管理队列，Windows Worker 主动拉取并调用本机 ComfyUI。 |
| Controller / Worker（Agent） | Controller 是集中业务与调度服务；Worker/Agent 是运行在执行机器上的 `worker/agent.py`，负责领取、执行和上传。不要把 Worker 等同于 ComfyUI。 |
| aiohttp / HTTP API | aiohttp 是 Chouka 服务使用的 Python Web 框架；HTTP API 是浏览器、Controller、Worker 和 ComfyUI 间按请求/响应调用的接口。 |
| WebSocket（WS）/ 轮询（polling） | WS 是持续连接上的实时双向消息；轮询是定时发 HTTP 请求。ComfyUI `/ws` 报执行事件，浏览器约每 700ms 轮询 `/api/jobs` 看任务。 |
| Presence / `/presence` | 项目协作 WebSocket，传在线成员、光标和画布变更；实际路由为 `/api/projects/{project_id}/presence`，不传任务进度。 |
| Session / CSRF / Origin | Session 是浏览器登录会话；CSRF（跨站请求伪造）防护校验写请求的令牌；Origin 表示请求来源，写操作会检查来源。 |
| ACL / `operate` | ACL（访问控制列表）规定用户对项目、任务、资源的权限；`operate` 是允许执行相关项目操作的权限要求。 |
| Project Lock / 乐观锁 | Project Lock 把单项目关键写操作串行；乐观锁通过比较版本号 `rev` 拒绝旧快照写入，两者不是同一种锁。 |
| `rev` / 409 | `rev` 是 revision，即项目画布的修订号；提交旧版本时服务器返回 HTTP 409 Conflict（版本冲突）。它不是 Git 提交号或任务 ID；详见第 4 页。 |
| Workflow / API Graph / Graph 快照 | Workflow 是 ComfyUI 界面中的工作流；API Graph 是可送给 `/prompt` 的节点与连线 JSON；任务提交时复制并注入参数形成该次执行的图快照。 |
| Manifest / capability / Cards | Manifest 描述一个 capability（能力）的业务输入、节点映射及输出；`_cards.json` 将能力组织成前端卡片、模式和模型。 |
| `key/type` / `target.node/input` / `output.node` | 分别是前端输入名称与控件类型、写入 Graph 的目标节点和字段、从哪个节点归集输出；节点编号变化要同步检查映射。 |
| `patch_graph()` / seed | 前者根据 Manifest 修补图中参数、素材、可选支线等；seed 是生成时使用的随机种子，可固定以便重现或随机化。 |
| `class_type` / `required_nodes` | `class_type` 是 Graph 中的节点类型；`required_nodes` 是任务所需节点类集合。Worker 通过 `/object_info` 上报可用类；类存在不保证插件或模型版本相同。 |
| `/prompt` / `prompt_id` / `client_id` | `/prompt` 把 Graph 提交给 ComfyUI；`prompt_id` 标识一次 ComfyUI 任务，在该链路与 Chouka job id 对应；`client_id` 用于关联 ComfyUI WebSocket 客户端，不是任务或画布版本。 |
| `/history` / `/view` / output / artifact | `/history/{id}` 给出执行输出记录，`/view` 读取具体文件；output 常指 ComfyUI 本机输出，artifact 常指经 Worker 上传并归档的远程产物。 |
| job / `JOBS` / `jobs.json` / `dispatch_jobs` | job 是一次生成任务；`JOBS` 与 `jobs.json` 用于近期页面展示，`dispatch_jobs` 是 Controller 在 `control.db` 中的派发与租约记录，不可混为一张队列表。 |
| `job_inputs` / resource index / `pending` / `ready` | `job_inputs` 是该任务允许 Worker 下载的输入白名单；可信资源索引关联文件和访问权限；产物登记中的 `pending` 表示尚未发布，`ready` 才是可授权访问状态。 |
| `queued` / `assigned` / `running` / `done` / `error` / `canceled` | 排队、已分配 Worker、执行中、成功、失败、取消等状态；不同状态层的名称和更新时间不完全相同，不要只凭浏览器卡片判断调度。 |
| `heartbeat` / `acquire` / `complete` | Worker 的心跳上报健康与当前任务并续租、主动领取任务、上传产物后报告最终成功三个步骤。 |
| lease / `lease_token` / Worker token | lease 是限时的单任务执行权；`lease_token` 是本次领取的临时凭证；Worker token 是 Worker 长期身份凭证。详细时间线见第 8 页。 |
| GPU / VRAM / 模型族 / 缓存亲和 | GPU 是执行计算的显卡；VRAM 是显存；模型族归并相关能力使用的模型；缓存亲和优先把合格任务给可能已加载同能力或同模型族的 Worker。 |
| capacity / pricing / 内部成本 / 建议零售价 | capacity 是 Worker 占用、产能与任务尝试的观测；pricing 是计价规则。GPU 小时等执行成本属内部核算，对客户的建议零售价须单独表达，不能直接等同。 |
| dry run / SDK / 灰度 / 回退 | dry run 是不正式投入生产的试运行或契约验证（具体效果以调用工具为准）；SDK 是供其他应用调用的开发包；灰度是小范围发布，回退是恢复先前可用版本。本演示第 12 页将 API/SDK、灰度回退作为规划方向。 |

---

# 2. 开场说明

## 建议开场话术

大家好，今天主要介绍 Chouka 抽卡系统的技术架构。

这次不会重点介绍页面功能，而是从研发角度回答几个问题：

1. Chouka 和 ComfyUI 的职责边界是什么；
2. 前端提交任务后，服务端如何生成最终工作流；
3. Worker 如何领取任务、调用 ComfyUI 并上传结果；
4. 项目、任务、资源和调度状态分别存在哪里；
5. 后续增加模型、工作流和业务能力时应该修改哪一层。

整个系统可以先记住四个角色：浏览器、Chouka 服务端、Windows Worker 和 ComfyUI。后面所有链路都围绕这四个角色展开。

---

# 第 1 页：系统边界

## 本页目标

让听众首先理解 Chouka 与 ComfyUI 的分工，避免把 Chouka 理解成另一套推理引擎。

## 建议讲解

Chouka 位于浏览器和 ComfyUI 之间。

浏览器向 Chouka 提交的是业务层信息，包括能力 ID、提示词、参数、素材和项目操作。Chouka 负责验证用户是否有权限使用这些项目和素材，然后把业务参数注入到 API Graph 中，再把最终 Graph 交给 ComfyUI 执行。

ComfyUI 不理解用户、项目、项目组、价格或任务归属。它只负责校验节点图、加载模型、执行节点，并把进度、history 和输出文件返回给 Chouka。

所以两者的边界可以概括为：

```text
Chouka：业务编排和治理
ComfyUI：模型和节点执行
```

### Chouka 管理的内容

- 浏览器画布、业务卡片和参数；
- 用户、Session、项目 ACL 和素材访问权；
- Manifest 到 API Graph 的参数注入；
- 任务状态、Worker 调度和产物访问；
- 费用、产能和管理页面。

### ComfyUI 管理的内容

- API Graph 校验；
- 模型和自定义节点加载；
- 节点图执行；
- WebSocket 执行事件；
- history 和 output 文件。

## 对应代码

- 服务端总入口：`server/app.py`
- 认证与权限：`server/auth.py`、`server/auth_store.py`
- 资源管理：`server/resource_access.py`
- ComfyUI 主服务：`ComfyUI/server.py`

## 容易被问的问题

### 为什么浏览器不直接调用 ComfyUI？

因为浏览器无法可靠承担项目权限、素材归属、任务归属和产物访问控制。浏览器直接访问 ComfyUI 还会暴露 8188 端口和原始文件路径。

### Chouka 是否修改 ComfyUI 的节点执行逻辑？

大部分情况下不会。Chouka 生成标准 API Graph 并通过 `/prompt` 提交。部分 H3 能力依赖当前仓库的 ComfyUI 核心定制，升级时需要按 `ComfyUI核心补丁.md` 做合并和回归。

## 过渡话术

明确职责以后，下一页看 Chouka 在单机和多机环境中分别怎么部署。

---

# 第 2 页：两种部署形态

## 本页目标

说明 Local 与 Controller 模式的主要差异，以及为什么 Controller 不直接控制 Windows 机器。

## 建议讲解

Chouka 的前端和业务 API 基本一致，区别主要在任务最终交给谁执行。

### Local 模式

链路是：

```text
Browser → Chouka aiohttp → 本机 ComfyUI
```

Chouka 服务直接访问本机 8188 端口：

- `POST /prompt` 提交任务；
- `/ws` 接收进度；
- `/history/{id}` 查询输出；
- `/view` 代理文件。

Local 模式主要用于开发和单机体验。入口是 `启动抽卡系统.bat`。

### Controller 模式

链路变成：

```text
Browser → Linux Controller → Windows Worker → Worker 本机 ComfyUI
```

Controller 保存项目、任务队列、Worker 状态和分布式产物。Windows Worker 主动向 Controller 注册、发送心跳并领取任务。

Controller 不主动 SSH 或远程执行 Windows 命令，主要原因是：

- Worker 可能处于不同局域网环境；
- 主动拉取更容易穿过常见网络边界；
- Worker 可以自行判断本机 ComfyUI、GPU 和队列状态；
- 网络中断时通过租约过期、迟到回报校验和 Worker 自停降低重复执行风险（不能保证物理执行绝不短暂重叠）。

## 对应代码

- Local 启动：`启动抽卡系统.bat`
- Controller 部署：`compose.controller.yml`、`start-controller.sh`
- Worker 启动：`启动Windows节点.bat`
- Worker 实现：`worker/agent.py`

## 容易被问的问题

### Controller 能不能运行在 Windows？

代码层面主要是 Python aiohttp 服务，但当前正式部署和脚本设计以 Linux Controller、Windows Worker 为主。

### Worker 能不能运行在 Linux？

当前 Worker 的文件同步和运行环境明确面向 Windows，不能直接认为 Linux Worker 已经受支持。

## 过渡话术

接下来从代码目录看，这几层分别由哪些模块组成。

---

# 第 3 页：组件架构

## 本页目标

让同事建立代码地图，知道不同问题应该进入哪个模块排查。

## 建议讲解

代码可以按四层理解。

### 浏览器层

`web/app.js` 是主画布逻辑，包含项目加载、节点编辑、参数面板、任务提交、任务轮询和历史结果。

`web/auth.js` 统一处理登录态、CSRF 和请求错误。

导演台使用 `director.js`，但参数编辑仍然复用真实画布节点；剪辑与导出由 `director_edit.js` 处理。

### Chouka 服务层

`server/app.py` 是 API 和任务编排入口，负责：

- 浏览器 API；
- Presence WebSocket；
- Local ComfyUI 接入；
- Worker API；
- 任务状态和结果归集。

`auth.py` 和 `auth_store.py` 管用户、Session、ACL、项目组和分享。

`resource_access.py` 管上传与产物的可信索引。

`distributed.py` 管 Worker、派发队列和租约。

### 能力定义层

- `graphs/*.api.json`：ComfyUI 实际执行图；
- `manifests/*.json`：业务参数到节点输入的映射；
- `manifests/_cards.json`：前端卡片、模式和模型组合；
- `scan_workflows.py`：从原始工作流生成这些定义。

### 执行层

- `worker/agent.py`：远程执行代理；
- ComfyUI `/prompt`：验证并入队；
- ComfyUI `/ws`：节点、进度和错误；
- `/history` 和 `/view`：输出记录与文件。

## 关键入口

```text
server/app.py:make_app()
web/app.js:boot()
POST /api/generate
/agent/v1/*
```

## 排查建议

| 问题 | 首先检查 |
|---|---|
| 页面节点和参数异常 | `web/app.js`、`/api/cards`、Manifest |
| 登录或权限异常 | `auth.py`、`auth_store.py` |
| 文件返回 403 | `resource_access.py`、项目 ACL |
| 任务不派发 | `distributed.py`、Worker heartbeat |
| ComfyUI 执行失败 | Graph、自定义节点、ComfyUI history |

## 过渡话术

有了模块地图后，先看浏览器内部是怎么维护状态和保存项目的。

---

# 第 4 页：前端运行结构

## 本页目标

解释前端的主要状态、保存一致性，以及任务轮询和多人协作的区别。

## 建议讲解

页面启动时按以下顺序加载：

```text
/api/auth/me
→ /api/cards
→ /api/projects
→ 打开具体项目
→ 恢复 cards / edges / groups
```

前端没有引入独立状态库，主要状态保存在 `app.js` 的模块级变量中。

### 关键状态

- `PROJ`：当前画布，包括节点、连线、分组和 `rev`；
- `CARDS` / `CAPS`：服务端下发的卡片和能力定义；
- `TASKS`：当前用户可访问的近期任务。

### 保存机制

用户编辑后，前端不会每次操作都立即请求服务端，而是：

1. 先更新本地 `PROJ`；
2. 约 700ms 防抖；
3. 通过 `saveChain` 串行保存；
4. 请求中携带当前 `rev`；
5. 服务端检查版本并返回新的 `rev`。

这解决两个问题：

- 快速连续操作不会产生大量并发保存；
- 旧请求不会覆盖新版本画布。

### 重点解释：提交的 `rev` 究竟是什么？

`rev` 是 revision（画布内容的修订号），存于项目 JSON 和前端 `PROJ.rev`。每次保存 `PUT /api/projects/{id}` 都携带前端打开画布时取得的版本；服务端将它与当前项目版本比较：相同才写入，并把服务端版本加一返回；不同则拒绝并返回 **HTTP 409**。`saveChain` 只能保证当前浏览器的保存按序，跨浏览器冲突仍要靠 `rev` 检出。

```text
初始项目 rev = 7，A、B 都打开了同一画布
A 携带 rev = 7 保存 → 服务器接受 → 当前 rev = 8
B 仍携带 rev = 7 保存 → 服务器返回 409，不让 B 覆盖 A
B 重新加载 rev = 8 后，再决定如何合并或重做修改
```

普通画布收到真正的 409 后会提示并重新加载；删除节点后的撤销恢复另有专门重建与重试逻辑，不等于忽略冲突。导演文档也有自身版本，不能把其 `rev` 或 `canvas_rev` 与此处项目画布的 `rev` 混为一谈。**讲解时一句话：`rev` 是防止旧画布覆盖新画布的版本戳，不是 Git 版本号，也不是生成任务编号。**

### 两条实时链路

任务状态通过 HTTP 轮询：

```http
GET /api/jobs
```

约每 700ms 获取排队、运行、进度、错误和结果。

多人协作使用 WebSocket：

```text
/api/projects/{project_id}/presence
```

它只同步在线成员、光标和画布变更，不传输生成任务进度。

## 容易被问的问题

### 为什么任务进度不用 WebSocket？

当前实现通过统一的 `/api/jobs` 获取用户可见任务，逻辑简单，并能同时覆盖当前项目和其他项目任务。Presence WebSocket 只承担协作职责。

### 409 冲突怎么处理？

普通画布会重新加载当前服务端版本。导演台则会保留本地内容，并建议先导出方案后再处理冲突。

## 过渡话术

前端点击“运行”以后，核心请求会进入服务端 `/api/generate` 管线。

---

# 第 5 页：服务端生成请求管线

## 本页目标

完整说明 `/api/generate` 从业务请求到可执行 Graph 的处理步骤。

## 建议讲解

浏览器提交的不是完整 ComfyUI 工作流，而是：

```json
{
  "capability": "能力 ID",
  "params": {},
  "assets": {},
  "project": "项目 ID",
  "card": "卡片 ID"
}
```

服务端依次处理：

### 1. 身份和 CSRF

检查 Session Cookie、请求来源和 `X-CSRF-Token`。

### 2. 项目权限

生成任务要求用户对项目拥有 `operate` 权限。

### 3. 项目锁

按项目获取写锁，避免同一项目中的关键操作相互覆盖。

### 4. 素材校验

检查素材是否属于当前用户可以访问的项目、资源是否已经是 `ready` 状态，并把任务允许访问的输入登记到 `job_inputs`。

### 5. `patch_graph()`

复制能力对应的 API Graph，然后：

- 按 `target.node/input` 注入参数；
- 注入或随机化 seed；
- 替换图片、视频和音频引用；
- 校验必填素材；
- 清理未使用的可选支线；
- 执行少量能力专用规则。

### 6. 建立任务身份

登记任务 ACL、输入白名单、能力、模型族、GPU 策略等信息。

### 7. 执行分支

- Local：直接 `POST ComfyUI /prompt`；
- Controller：写入 `dispatch_jobs`，等待 Worker 领取。

## 三层任务状态

排查任务时必须区分：

1. 浏览器卡片上的状态；
2. 服务端内存和 `jobs.json` 中的 `JOBS`；
3. `control.db` 中的 `dispatch_jobs`。

页面显示 `queued`，不一定代表调度队列仍然是 `queued`。可能已经 assigned，只是展示状态还没有同步到新 Worker。

## 过渡话术

`patch_graph()` 要依赖能力定义。下一页介绍 Graph、Manifest 和 Cards 之间的契约。

---

# 第 6 页：Graph、Manifest 与 Cards 契约

## 本页目标

说明新增普通能力为什么主要修改配置，而不是为每个模型重新开发前后端。

## 建议讲解

### API Graph

`graphs/*.api.json` 是能够直接提交给 ComfyUI `/prompt` 的节点图。

它决定：

- 运行哪些节点；
- 节点之间如何连接；
- 使用哪些模型和采样流程。

### Manifest

Manifest 把业务参数映射到 Graph：

```json
{
  "id": "example_capability",
  "graph": "graphs/example.api.json",
  "output": { "node": "99" },
  "inputs": [
    {
      "key": "prompt",
      "type": "textarea",
      "target": {
        "node": "12",
        "input": "text"
      }
    }
  ]
}
```

其中：

- `key/type` 决定前端控件；
- `target.node/input` 决定服务端向哪个节点写参数；
- `output.node` 决定从哪个节点归集结果。

### Cards

`manifests/_cards.json` 决定：

- 前端显示哪些卡片；
- 多个能力是否合并成模式切换；
- 模型、素材数量或工作流如何切换。

## 发布约束

以下内容应该作为一个版本单元发布：

```text
Graph + Manifest + Cards + 执行节点环境
```

常见错误包括：

- 工作流节点编号变化，但 Manifest target 没更新；
- 输出节点配置错误，ComfyUI 执行成功但 Chouka 找不到产物；
- Graph 使用了新 `class_type`，但目标 Worker 没安装对应节点；
- 只更新 Manifest，没有更新 `_cards.json`。

## 过渡话术

能力定义定稿以后，先看 Local 模式中 Chouka 如何调用 ComfyUI。

---

# 第 7 页：Local 模式调用时序

## 本页目标

说明任务提交、执行事件和产物归集是三个不同阶段。

## 建议讲解

完整链路如下：

### 1. 浏览器提交

```http
POST /api/generate
```

Chouka 完成鉴权、素材校验和 Graph 修补。

### 2. Chouka 提交 ComfyUI

```http
POST /prompt
```

请求中使用：

```text
ComfyUI prompt_id = Chouka job_id
```

这样三端使用同一个任务 ID。

### 3. ComfyUI 返回 queued

这只说明 ComfyUI 已经接受任务，不代表已经开始或完成执行。

### 4. WebSocket 执行事件

Chouka 通过 `/ws` 接收：

- `execution_start`；
- `executing`；
- `progress_state`；
- `execution_cached`；
- `execution_error`；
- `execution_success`。

服务端将这些事件转换成 `JOBS` 中的步骤和加权进度。

### 5. 浏览器轮询

浏览器继续调用 `/api/jobs`，更新节点进度。

### 6. 产物归集

ComfyUI 执行成功后，Chouka 调用：

```http
GET /history/{job_id}
```

读取输出记录，登记可信资源，并通过 `/api/file` 代理 `/view`。

## 为什么会停在 99%

99% 通常表示：

```text
ComfyUI 节点执行已完成
但 history、文件或资源索引还没有完成归集
```

真正完成是：

```text
history 可用
→ 找到输出
→ 资源索引 ready
→ JOBS.status = done
```

## 过渡话术

Controller 模式保留了同样的 ComfyUI 调用，但中间增加 Worker、租约和文件传输。

---

# 第 8 页：Controller / Worker 时序

## 本页目标

说明 Worker 如何领取任务、调用本机 ComfyUI，以及为什么 `/complete` 才是远程成功终态。

## 建议讲解

### Controller 入队

浏览器提交任务后，Controller 同时写入：

- `JOBS`：供页面显示；
- `dispatch_jobs`：供 Worker 调度。

### Worker 主动领取

Worker 周期调用：

```http
POST /agent/v1/jobs/acquire
```

领取成功后获得：

```json
{
  "job_id": "...",
  "lease_token": "...",
  "lease_expires_at": 0,
  "payload": {
    "graph": {},
    "assets": {},
    "capability": "..."
  }
}
```

### 下载输入

Worker 使用任务租约下载当前任务允许访问的素材，并保存到本机 ComfyUI input 目录。

### 调用本机 ComfyUI

Worker 建立本机 ComfyUI WebSocket，再调用 `/prompt`。ComfyUI 事件先到 Worker，再由 Worker 通过 HTTP `/event` 转发给 Controller。

### 上传产物

Worker 从本机 ComfyUI `/history` 和 `/view` 读取文件，然后逐件上传：

```http
POST /agent/v1/jobs/{id}/artifact
```

### 完成任务

所有产物上传后，Worker 调用：

```http
POST /agent/v1/jobs/{id}/complete
```

Controller 验证：

- Worker 身份；
- 当前租约；
- 每个产物属于当前任务；
- 资源索引已经是 `ready`；
- 任务没有取消或清理冲突。

验证通过后才把任务置为 `done`。

## 重点解释：租约（lease）是什么？

租约是 Controller 给**某个 Worker 执行某个 job 的限时资格**，不是画布的 `rev`，也不是买断一块 GPU。领取 `acquire` 时 Controller 把 `dispatch_jobs` 从 `queued` 更新为 `assigned`，记录 Worker ID、`lease_token` 的哈希和 `lease_expires_at`，并把原始临时 token、截止时间和任务 Graph 等发给 Worker。当前默认租期 **45 秒**；Worker 上报当前任务的心跳后，Controller 续期并返回剩余有效时间。Worker 的长期身份 token 用于证明“我是哪台机器”，`lease_token` 用于证明“我仍拥有这次任务的执行权”。

```text
t0：任务 J 排队；Worker A acquire → J 分配给 A，获得临时租约 L1
执行中：A heartbeat → 续租 L1；下载输入、start、event、artifact、complete 均验证当前身份和租约
t1：若 A 断线、租约过期，Controller 清除旧归属；未取消的 J 重新 queued
     若 J 曾请求取消，则过期后进入 canceled，不重新派发
t2：Worker B 可再次领取 J → 获得新租约 L2
     A 的旧 L1 不再能上报事件或发布完成；A 在本地租约超时后应停止本机执行
```

任务接口同时验证 Worker 身份、当前任务的 `lease_token` 和未过期的有效状态；`control.db` 只存 token 哈希。正常完成或失败时清理租约。它使旧 Worker 的迟到回报不能覆盖当前任务归属，故障后任务也能继续调度。**不要把“避免重复执行”讲成任何网络情形下物理执行绝不会短暂重叠**：网络分区和重派之间可能有竞态，系统以拒绝失效租约的回报和 Worker 超时自停来收敛。

## 核心结论

远程模式真正的成功终态是 Worker `/complete`，而不是 ComfyUI 的 `execution_success`。

## 过渡话术

Worker 能不能领取某个任务，需要经过一系列能力和资源条件判断。

---

# 第 9 页：Worker 调度条件

## 本页目标

说明调度分为硬条件过滤和缓存亲和排序两步。

## 建议讲解

Worker 空闲时发起 acquire，Controller 按以下顺序判断：

### 1. 在线并启用

Worker 必须：

- `enabled = true`；
- `comfy_online = true`；
- 最近心跳未超过离线阈值。

### 2. 当前空闲

以下状态不能领取任务：

- `busy = true`；
- 已有 `current_job_id`；
- 正在同步模型或节点；
- 本机 ComfyUI 已被其他任务占用。

### 3. 节点能力满足

Controller 从任务 Graph 中提取全部 `class_type`，形成 `required_nodes`。

Worker 心跳从 ComfyUI `/object_info` 上报本机节点集合。只有：

```text
required_nodes ⊆ worker.node_classes
```

才进入候选集合。

### 4. GPU 策略满足

检查 GPU、显存和能力专用策略。高显存任务会优先等待更合适的空闲设备。

### 5. 缓存亲和排序

在等待时间允许的范围内，优先选择：

1. 上次运行同一个 capability 的 Worker；
2. 上次运行同一个 model family 的 Worker。

这样可以减少模型加载和切换时间。

### 6. 生成租约并分配

Controller 将任务更新为 `assigned`，写入 Worker ID、租约哈希和过期时间。

## 调度边界

`class_type` 存在不等于环境完全一致，它不能证明：

- 自定义节点版本一致；
- 模型文件一致；
- ComfyUI 核心补丁一致。

因此后续仍需要独立的 Worker 环境版本治理。

## 过渡话术

了解任务怎么执行后，再看这些项目、任务和产物状态分别存在哪里。

---

# 第 10 页：状态与存储地图

## 本页目标

解释 JSON、SQLite 和文件目录分别保存什么，避免排障时只看一个状态源。

## 建议讲解

### `data/projects/*.json`

保存项目画布，包括节点、连线、分组、卡片历史和 `rev`。

### `data/jobs.json`

只保存最近约 60 条页面展示任务。它不是完整调度账本，也不适合当永久审计记录。

### `data/auth.db`

保存：

- 用户和 Session；
- 项目 ACL、任务 ACL；
- 项目组和分享；
- 上传和产物的可信资源索引。

### `data/control.db`

保存：

- Worker；
- `dispatch_jobs`；
- 租约和任务尝试；
- 费用和产能观测。

### 文件目录

- `data/uploads/`：用户上传输入；
- `data/artifacts/{job_id}/`：Worker 上传的分布式产物；
- ComfyUI output：Local 模式产物。

## 三个常见误区

### 页面一直 queued

可能是：

- `JOBS` 没同步；
- `dispatch_jobs` 没有合格 Worker；
- Worker 在线但缺节点或 GPU 不满足。

需要同时看 `JOBS`、`dispatch_jobs` 和 Worker heartbeat。

### 文件存在但返回 403

文件存在不代表资源可访问。还必须在 `auth.db` 中存在 `ready` 的可信资源索引，并且当前用户有项目权限。

### ComfyUI 已经完成但页面仍是 99%

需要继续检查 history、artifact 上传、资源发布和 `/complete`。

## 备份边界

必须一起备份：

```text
项目 JSON
+ auth.db
+ control.db
+ uploads / artifacts
+ Local 模式的 ComfyUI output
```

## 过渡话术

最后两页介绍增加新能力时的修改范围，以及系统后续如何平台化。

---

# 第 11 页：新增能力的技术影响面

## 本页目标

给出新增模型、工作流或协议时的标准接入步骤和修改边界。

## 建议讲解

标准接入流程是：

```text
在 ComfyUI 中验证工作流
→ 导出 API Graph
→ 生成或修订 Manifest
→ 更新 Cards
→ 做参数和输出契约测试
→ Local 回归
→ Controller / Worker 回归
→ 补充计价、产能并发布
```

## 不同变化应该修改哪里

### 新模型或新参数

主要修改：

- Graph；
- Manifest；
- Cards。

通常不需要修改 Worker。

### 新自定义节点

需要：

- 修改或新增 `ComfyUI/custom_nodes`；
- 部署到所有目标 Worker；
- 确认 `/object_info` 已经上报对应 `class_type`。

一般不需要修改前端任务协议。

### 特殊参数注入

如果 Manifest 无法表达，再在 `patch_graph()` 中增加最小、明确的能力规则，不要影响其他工作流。

### 新输入或产物类型

需要同时考虑：

- 上传接口；
- 资源索引；
- Worker 输入下载；
- 产物上传；
- 前端预览。

只修改 Manifest 不够。

### 新 GPU 策略

修改 `distributed.py` 和 Worker 遥测，不需要改画布保存。

### 新计价规则

修改 `pricing.json`，必要时扩展 `costs.py`，通常不修改 ComfyUI Graph。

## 发布检查

- Graph、Manifest、Cards 同版本；
- 目标 Worker 节点齐全；
- 必填和可选素材组合通过；
- 固定 seed、取消、权限场景通过；
- Local 与 Controller 均通过；
- 明确定价或未定价状态。

## 过渡话术

当能力数量和使用团队继续增长，现有机制需要进一步演进为四层能力平台。

---

# 第 12 页：后续业务能力扩展架构

## 本页目标

把后续业务规划映射为技术分层和实施路线，而不是简单堆叠页面功能。

## 建议讲解

这一页是后续规划方向，不代表已经全部实现。

### 第一层：业务体验层

包括：

- 模板项目和批量任务；
- 剧本、分镜、生成、选版、剪辑的导演生产链；
- 团队素材库和风格库；
- 提供给其他内部系统的 API / SDK。

这一层解决用户如何稳定、批量地使用能力。

### 第二层：能力平台层

包括：

- 能力注册和版本；
- 输入、输出和依赖契约；
- Graph / Manifest 自动校验；
- Nodes、Models、ComfyUI 环境版本；
- 灰度、回退和按团队授权。

这一层解决新能力如何安全上线。

### 第三层：任务与资源层

包括：

- GPU、显存和模型缓存智能路由；
- 团队优先级、配额和并发控制；
- 成功率、等待、耗时和失败原因；
- 内部成本和建议零售价计量。

这一层解决规模扩大后的稳定性和成本问题。

### 第四层：执行层

包括：

- Windows Worker Pool；
- ComfyUI；
- 版本化的 Custom Nodes；
- 模型缓存、预热和亲和调度。

这一层仍然保持 ComfyUI 作为节点执行引擎。

## 三阶段路线

### 第一阶段：标准化

建设能力契约、版本、自动测试和环境清单，让新能力可以稳定接入。

### 第二阶段：生产化

建设模板、批量、素材库、导演链路和质量反馈，让系统支持完整内容生产。

### 第三阶段：平台化

建设智能调度、API/SDK、团队配额、计量和运营看板，支撑多团队规模化使用。

## 最后结论

Chouka 的核心不是重新实现 ComfyUI，而是把 ComfyUI 工作流封装成团队可以使用、治理和持续扩展的业务能力平台。

后续无论增加模型、工作流、业务流程还是 GPU 节点，都应该继续保持四层职责：

```text
前端负责交互
服务端负责编排和治理
Worker 负责远程任务执行与文件交换
ComfyUI 负责模型和节点运行
```

---

# 3. 结束语

## 建议结束话术

以上就是 Chouka 当前的主要技术链路。

如果只记住三件事：

第一，Chouka 与 ComfyUI 是业务编排和节点执行的关系；

第二，远程任务由 Worker 主动领取，租约贯穿输入、事件、产物和完成状态；

第三，新能力优先通过 Graph、Manifest 和 Cards 接入，只有协议或资源边界发生变化时才修改 Worker 和底层调度。

后续希望大家扩展功能时，都先判断变化属于哪一层，尽量保持现有边界，不要把普通能力做成跨层特例。

---

# 4. 常见问题速查

## Q1：浏览器为什么不直接订阅 ComfyUI WebSocket？

ComfyUI WebSocket 只理解 prompt 和节点事件，不理解 Chouka 用户、项目和任务权限。由 Chouka 或 Worker接收后再转换成授权任务状态，可以保持统一访问边界。

## Q2：为什么 Controller 不主动推送任务给 Worker？

Worker 主动拉取可以简化内网节点连接、离线恢复和本机状态判断，也便于使用租约处理网络分区。

## Q3：Worker 和 ComfyUI 之间怎么通信？

Worker 使用 HTTP 提交 `/prompt`、查询 `/history`、读取 `/view`、执行取消；使用 WebSocket `/ws` 接收执行进度和错误。

## Q4：Worker 和 Controller 之间怎么通信？

全部通过 `/agent/v1/*` HTTP API。控制信息使用 JSON，输入使用授权下载，产物使用 multipart 上传。

## Q5：为什么要有租约？

用于限制单次任务的当前执行权、拒绝旧 Worker 迟到回写，并使断线任务可在过期后重新排队。它降低重复执行风险，但不承诺在网络分区时绝无短暂物理重叠；具体时间线见第 8 页。

## Q6：为什么任务会停在 99%？

99% 通常意味着 ComfyUI 已执行完成，但 Chouka 仍在等待 history、上传产物或发布可信资源索引。

## Q7：新增普通模型需要改 Worker 吗？

通常不需要。优先修改 Graph、Manifest 和 Cards，并把所需模型与节点部署到目标 Worker。

## Q8：`jobs.json` 能不能用于完整账单或审计？

不能。它只保存近期展示任务。完整的派发、费用和产能状态在 `control.db` 的对应表中。

## Q9：节点类匹配是否能保证 Worker 环境一致？

不能。`/object_info` 只能证明 `class_type` 存在，不能证明插件版本、模型文件和 ComfyUI 核心补丁完全一致。

## Q10：正式备份应该包含什么？

至少包括项目 JSON、`auth.db`、`control.db`、上传文件、分布式产物，以及 Local 模式对应的 ComfyUI output。

## Q11：`rev` 与 `lease_token` 都是版本号吗？

不是。`rev` 是**项目画布内容版本**，写项目时用来发现其他人已修改，过期提交返回 409；`lease_token` 是**Worker 对某一次生成任务的限时执行凭证**，用于限制谁能上报进度和产物。前者保护项目编辑，后者保护分布式任务归属；数值例子见第 4 页，执行时间线见第 8 页。

## Q12：为什么已有 ComfyUI `execution_success` 还需要 Worker `/complete`？

`execution_success` 只代表本机节点图执行成功；Controller 还要收到该次租约下的产物上传、完成校验和资源发布，才能对浏览器宣布远程任务 `done`。

---

# 5. 分享前检查清单

- [ ] 使用浏览器打开 HTML，确认 12 页都能翻页；
- [ ] 按 `F` 检查全屏显示；
- [ ] 确认会议室屏幕上正文和图中节点可读；
- [ ] 按 `N` 检查每页讲解提示；
- [ ] 准备 Local 和 Controller 两种模式的实际部署说明；
- [ ] 如果准备现场演示，提前确认 8199 和 8188 服务状态；
- [ ] 不在分享中展示 Worker token、enrollment token、LLM key 或真实用户数据；
- [ ] 在 20 分钟内预留约 2–3 分钟问答；深入讨论任务调度、租约和新增能力接入可放到会后。
