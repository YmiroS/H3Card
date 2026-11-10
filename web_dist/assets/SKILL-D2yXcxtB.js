const r=`---\r
name: conceptual-character-creator\r
description: 为电影级角色概念与SSS技能展示设计角色资产、转视角角色板、技能因果链、表演情绪及完整视频提示词。适用于从角色创意或参考图制作角色与技能展示的流程，以及生成前预检和失败返修。\r
metadata:\r
  version: '0.7'\r
---\r
\r
# 角色风格设计与画风一致性\r
\r
## Codex 安装适配\r
\r
本技能来自用户提供的 V0.7 合并导出包。以下正文与配套资料保留导出内容；旧示例中的 cinematic-fight-unit-skill 是本技能的历史别名。\r
仅在用户请求角色或技能展示创作时执行相应流程；安装、查看或编辑技能不触发素材生成。模型名称和参数是原文工作流要求，使用前确认工具实际支持；不可假称拥有或调用不可用的模型。缺少指定工具时按原文回退模式交付提示词。生成和重试须在当前用户授权范围内；同一资产连续两次失败时报告原因并停止自动重试。\r
若原文旧模板与 V0.7 补充冲突，以 V0.7 为准；最终视频固定720p，角色板2K。正文未导出的第1节不补写。\r
\r
V0.7补充资料：提示词完整度见 [references/prompt-language-density-control.md](references/prompt-language-density-control.md)；性格与情绪见 [references/character-personality-and-emotion-system.md](references/character-personality-and-emotion-system.md)；视频分辨率见 [references/video-resolution-lock.md](references/video-resolution-lock.md)。\r
\r
## 2. Agent自动执行硬规则\r
\r
### 2.1 默认执行模式\r
\r
当 Agent 具备可用的图像 / 视频生成工具时，本 Skill 默认进入：\r
\r
\`\`\`text\r
Agent Auto-Run Mode / Agent自动执行模式\r
\`\`\`\r
\r
在该模式下，禁止只把提示词交给用户手动复制。\r
\r
Agent 必须尽可能直接执行：\r
\r
\`\`\`text\r
MJ角色概念图生成\r
Image模型角色板生成\r
视频前置检查\r
SD2.0最终15秒视频生成\r
\`\`\`\r
\r
### 2.2 文本回退模式\r
\r
仅当当前 Agent 没有对应生成工具、工具不可用、用户明确要求只要提示词，才进入：\r
\r
\`\`\`text\r
Prompt Fallback Mode / 提示词回退模式\r
\`\`\`\r
\r
回退模式必须明确说明：\r
\r
\`\`\`text\r
当前无法直接调用对应生成工具，因此输出可复制提示词。\r
\`\`\`\r
\r
不得伪装成已经生成图像或视频。\r
\r
### 2.3 不再默认 TEXT ONLY\r
\r
V0.6 废除旧版"默认只输出文本"的规则。新规则为：\r
\r
\`\`\`text\r
有工具则执行，无工具才输出提示词。\r
\`\`\`\r
\r
涉及"角色板""关键帧""成功帧""视频"时，如果工具可用，默认理解为需要生成资产，而不是只写提示词。\r
\r
---\r
\r
## 3. 省积分硬规则：No Video Before Validation\r
\r
虽然 V0.6 支持自动出视频，但最终15秒视频仍然不能作为初次测试工具。\r
\r
最终视频生成前必须完成以下检查：\r
\r
\`\`\`text\r
1. 角色锚点确认\r
2. MJ概念图质量确认\r
3. Image模型角色板质量确认\r
4. 技能机制确认\r
5. 技能因果链确认\r
6. 武器 / 媒介主导性确认\r
7. 真实接触与物理反馈确认\r
8. 3个成功画面确认\r
9. 失败风险预判\r
10. 角色性格、当前情绪、表演微指令与情绪弧线确认\r
11. 最终提示词强化项确认\r
\`\`\`\r
\r
如果任一项不清楚，Agent 必须先做低成本修正，不得直接烧最终视频积分。\r
\r
可执行策略：\r
\r
\`\`\`text\r
先修MJ概念图\r
再修Image角色板\r
再修技能机制\r
最后才生成15秒SD2.0视频\r
\`\`\`\r
\r
---\r
\r
## 4. 标准自动生产流程\r
\r
### 4.1 无角色输入时\r
\r
当用户没有提供角色图、角色设定或角色板：\r
\r
\`\`\`text\r
1. 调用角色库，给出6个角色方向。\r
2. 如果用户要求"自动 / 全自动 / 你自己选"，Agent 直接选择最适合做SSS技能展示的角色。\r
3. 使用 MJ 8.1 + --preview 自动生成单人角色概念图。\r
4. 对MJ概念图做质量检查。\r
5. 若出现多角色、半身、武器缺失、海报感、角色不清，自动返修MJ概念图。\r
6. MJ概念图合格后，使用 Image 模型生成角色板。\r
7. 角色板参数固定为：16:9 / 高画质 / 2K。\r
8. 角色板合格后，角色板成为唯一角色锚点。\r
9. 自动进行角色理解、技能机制设计和Video Preflight Gate。\r
10. Preflight通过后，使用SD2.0视频模型一次性生成一条完整15秒视频。\r
\`\`\`\r
\r
### 4.2 有MJ角色概念图时\r
\r
\`\`\`text\r
1. 不直接进入视频。\r
2. 先检查MJ概念图是否为单人、全身、武器清楚、服装结构可读。\r
3. 合格后，使用 Image 模型自动生成角色板。\r
4. 角色板参数固定：16:9 / 高画质 / 2K。\r
5. 角色板通过后，再进入技能预演和最终视频。\r
\`\`\`\r
\r
### 4.3 有角色板时\r
\r
\`\`\`text\r
1. 把角色板作为唯一角色锚点。\r
2. 分析角色身份、武器媒介、视觉母题、技能动力学。\r
3. 自动输出技能机制预演。\r
4. 自动执行 Video Preflight Gate。\r
5. 若通过，使用SD2.0自动生成一条完整15秒视频。\r
\`\`\`\r
\r
### 4.4 有失败视频时\r
\r
\`\`\`text\r
1. 分析失败视频。\r
2. 判断失败发生在：角色锚点、武器主导、技能因果、镜头、物理反馈、模型误读。\r
3. 优先返修前置提示词或角色板，不优先继续烧视频。\r
4. 必须输出下一次视频生成前的阻塞点和修正策略。\r
\`\`\`\r
\r
---\r
\r
## 5. Midjourney 角色概念生成规则\r
\r
角色概念图默认使用 Midjourney：\r
\r
\`\`\`text\r
--v 8.1 --preview\r
\`\`\`\r
\r
\`--preview\` 必须放在 MJ 提示词参数末尾，用于调用 8.2 测试版本。\r
\r
### 5.1 单角色控制规则\r
\r
当目标是单个角色概念图时，禁止使用容易生成多角色的并列结构：\r
\r
\`\`\`text\r
A warlord, a gunslinger, a blade-bearer\r
\`\`\`\r
\r
必须改写为：\r
\r
- \`A single character ...\`\r
- \`A single lead character who combines ...\`\r
- \`A xxx-xxx-xxx hybrid character\`\r
\r
并追加：\r
\r
\`\`\`text\r
solo, one person only, single character, full body, centered composition, no group, no lineup, no multiple characters, no extra people\r
\`\`\`\r
\r
### 5.2 MJ概念图质检硬规则\r
\r
角色概念图进入角色板之前，必须检查：\r
\r
- 是否多个角色 / 角色阵列\r
- 是否半身 / 裁脚 / 头像\r
- 主武器或核心媒介是否缺失\r
- 是否过度海报感\r
- 服装结构是否可读\r
- 身份是否被误解\r
- 是否提前生成多视图 / 多面板\r
- 是否有文字、logo、UI、乱码干扰\r
\r
如不合格，先调用 \`references/mj-common-error-repair-library.md\` 返修，不进入角色板。\r
\r
---\r
\r
## 6. Image模型角色板生成硬规则\r
\r
V0.6 明确修正：\r
\r
\`\`\`text\r
角色板不是用 MJ 继续生成，而是使用 Image 模型生成。\r
\`\`\`\r
\r
角色板生成参数固定为：\r
\r
\`\`\`text\r
模型：Image模型\r
比例：16:9\r
画质：高画质\r
分辨率：2K\r
输入参考：最终MJ角色概念图作为 {{Image 1}}\r
输出目标：专业角色转视角图表 / 角色参考模型图表\r
\`\`\`\r
\r
角色板必须包含：\r
\r
- 面部特写\r
- 正视图\r
- 背视图\r
- 左侧轮廓\r
- 右侧轮廓\r
- 全身视角旁的垂直高度测量刻度\r
- 左下角信息面板\r
- 白色摄影棚背景\r
- 柔和均匀摄影棚光\r
- 全视角一致身份、比例、服装、武器、材质\r
\r
角色板生成后必须质检：\r
\r
- 是否同一角色\r
- 是否五个视角齐全\r
- 是否全身清楚\r
- 是否武器 / 媒介出现\r
- 是否服装结构可读\r
- 是否没有多余角色\r
- 是否没有错位 / 畸变 / 多手多脚\r
- 是否适合作为唯一视频参考锚点\r
\r
模板见：\r
\r
\`\`\`text\r
templates/image-model-character-board-template.md\r
templates/character-board-from-mj-template.md\r
\`\`\`\r
\r
---\r
\r
## 7. 角色板唯一锚点规则\r
\r
角色板生成后，成为后续所有技能与视频的 **唯一角色锚点**。\r
\r
禁止：\r
\r
- 回退混用MJ概念图\r
- 混用其他无关参考图\r
- 重新设计脸、服装、武器、体型\r
- 根据技能需要擅自换身份\r
\r
视频提示词必须保留角色板中的：\r
\r
- 面部结构\r
- 发型与发色\r
- 年龄感\r
- 肤色\r
- 体型与比例\r
- 服装轮廓与材质\r
- 武器 / 道具 / 配饰\r
- 核心气质与身份感\r
\r
---\r
\r
## 8. 角色性格与情绪表演硬规则\r
\r
V0.6.2 新增硬规则：最终视频不能只锁定外形、武器和技能，还必须锁定角色的性格、当前情绪和表演驱动力。\r
\r
任何角色进入最终 SD2.0 15 秒视频生成前，必须完成：\r
\r
\`\`\`text\r
【角色性格锚点】\r
性格主轴：\r
气质关键词：\r
行为方式：\r
压迫方式：\r
情绪表达方式：\r
禁用表演：\r
\r
【当前情绪状态】\r
当前情绪：\r
情绪强度：/10\r
触发原因：\r
爆发方式：\r
收尾余韵：\r
\r
【表演微指令】\r
眼神：\r
嘴部表情：\r
呼吸状态：\r
头部动作：\r
肩颈状态：\r
手部状态：\r
爆发前停顿：\r
爆发后反应：\r
收尾状态：\r
\r
【15秒情绪弧线】\r
0-3秒：情绪建立\r
3-7秒：压迫上升\r
7-11秒：爆发\r
11-15秒：余震 / 收束 / 性格态度显现\r
\`\`\`\r
\r
如果缺少以上任一部分，Agent 不得直接生成最终视频。\r
\r
### 8.1 角色不能只是"会放技能的壳子"\r
\r
错误方向：\r
\r
\`\`\`text\r
角色站着，释放技能，最后摆 pose。\r
\`\`\`\r
\r
正确方向：\r
\r
\`\`\`text\r
角色以符合自身性格和当前情绪的方式执行技能，动作节奏、眼神、呼吸、停顿、爆发和收尾都服务于角色性格。\r
\`\`\`\r
\r
### 8.2 最终视频提示词必须新增字段\r
\r
最终 SD2.0 视频提示词必须包含：\r
\r
\`\`\`text\r
【角色性格锚点】\r
【当前情绪状态】\r
【表演微指令】\r
【15秒情绪弧线】\r
【收尾情绪余韵】\r
\`\`\`\r
\r
这些字段不得被压缩成一句话，也不得只写"冷酷""愤怒"等单词。\r
\r
详见：\r
\r
\`\`\`text\r
references/character-personality-and-emotion-system.md\r
templates/personality-emotion-preflight-template.md\r
\`\`\`\r
\r
---\r
\r
## 9. Video Preflight Gate 视频前置检查\r
\r
最终视频生成前，必须自动完成：\r
\r
\`\`\`text\r
【角色性格与情绪】\r
性格主轴：\r
当前情绪：\r
表演微指令：\r
15秒情绪弧线：\r
\r
【技能因果链】\r
角色动作：\r
武器 / 媒介动作：\r
真实接触：\r
第一视觉结果：\r
环境反应：\r
终局收束：\r
\r
【武器 / 媒介主导性检查】\r
主导动作是否来自武器 / 媒介：\r
特效是否由武器 / 媒介触发：\r
是否有真实接触与物理反馈：\r
观众能否一眼看出结果由该武器造成：\r
\r
【必须出现的3个成功画面】\r
1.\r
2.\r
3.\r
\r
【失败风险】\r
1.\r
2.\r
3.\r
\r
【预演结论】\r
通过 / 阻塞\r
\`\`\`\r
\r
若结论为"阻塞"，Agent 不得生成最终15秒视频，只能自动修正前置资产或提示词。\r
\r
---\r
\r
## 10. 技能动力学优先规则\r
\r
禁止所有角色默认使用"站立蓄力 + 圆形法阵 + 大招爆发"的同质化结构。\r
\r
必须先判断角色动力学：\r
\r
- 速度型\r
- 重击型\r
- 武器轨迹型\r
- 枪械触发型\r
- 仪式权杖型\r
- 召唤型\r
- 侵蚀型\r
- 环境改写型\r
- 幻术错位型\r
- 近身压制型\r
- 一击终局型\r
- 领域展开型\r
- 披风载体型\r
- 枪声审判型\r
- 路径延迟爆发型\r
- 现实裁剪型\r
- 命运缝合型\r
- 凋零终局型\r
\r
详见：\`references/skill-dynamics-library.md\`\r
\r
---\r
\r
## 11. 反模板检查器\r
\r
输出 / 执行前必须检查：\r
\r
- 是否又写成普通法阵？\r
- 是否又是火球 / 雷电 / 黑雾 / 光柱 / 激光？\r
- 是否所有角色都在挥剑或举手大招？\r
- 是否特效没有媒介来源？\r
- 是否角色特征在大招中消失？\r
- 是否面部特写超过0.5秒？\r
- 是否镜头全程单一中景？\r
- 是否没有英雄收尾？\r
- 是否视频被拆成分段？\r
- 是否把视频作为初次测试？\r
- 是否只输出提示词而没有调用可用生成工具？\r
\r
硬规则：\r
\r
\`\`\`text\r
面部特写只保留0.5秒以内，用于确认角色身份。不要长时间凝视。角色识别应通过服装轮廓、武器、动作方式和英雄收尾持续体现。\r
\`\`\`\r
\r
---\r
\r
## 12. SD2.0 视频生成硬规则\r
\r
所有最终技能展示视频默认使用 **SD2.0 视频模型**。\r
\r
硬性要求：\r
\r
\`\`\`text\r
模型：SD2.0视频模型\r
时长：15秒\r
生成方式：一次性直接生成完整15秒\r
禁止：分段生成 / 多段拼接 / 分镜图自动生成\r
比例：16:9 或 21:9\r
输出画质：720p固定，不要1080p\r
声音：必须有声音\r
参考图：只使用角色板作为唯一角色参考锚点\r
前提：必须通过 Video Preflight Gate\r
\`\`\`\r
\r
Agent 具备视频工具时，必须直接生成视频。无视频工具时，才输出最终提示词作为回退。\r
\r
最终视频提示词必须明确：\r
\r
- one continuous 15-second video\r
- no segmented generation\r
- SD2.0 video model\r
- 16:9 or 21:9\r
- fixed 720p output, not 1080p\r
- with sound\r
- character board as the only reference anchor\r
\r
---\r
\r
## 13. 最终默认输出格式\r
\r
### 12.1 Agent自动执行时\r
\r
\`\`\`text\r
【执行状态】\r
当前阶段：\r
已生成资产：\r
下一步动作：\r
阻塞点：无 / 有\r
\r
【角色资产】\r
MJ角色概念图：已生成 / 待生成 / 已返修\r
Image模型角色板：已生成 / 待生成 / 已返修\r
\r
【Preflight结果】\r
通过 / 阻塞\r
\r
【最终视频】\r
SD2.0 15秒视频：已生成 / 未生成\r
视频设置：15s / 16:9或21:9 / 720p固定 / with sound / one pass\r
\r
【失败风险与返修】\r
\`\`\`\r
\r
### 12.2 工具不可用回退时\r
\r
\`\`\`text\r
【当前限制】\r
当前Agent无法直接调用对应生成工具，因此输出可复制提示词。\r
\r
【MJ角色概念提示词】\r
【Image模型角色板提示词】\r
【Video Preflight Gate】\r
【SD2.0视频提示词】\r
\`\`\`\r
\r
---\r
\r
## 14. 关键文档索引\r
\r
\`\`\`text\r
references/agent-auto-run-workflow.md\r
references/tool-execution-policy.md\r
references/image-model-character-board-generation.md\r
references/auto-run-asset-handoff.md\r
references/role-archetype-library.md\r
references/role-understanding-engine.md\r
references/skill-dynamics-library.md\r
references/weapon-medium-binding-library.md\r
references/anti-template-checker.md\r
references/mj-common-error-repair-library.md\r
references/video-preflight-gate.md\r
references/skill-causality-chain.md\r
references/weapon-dominance-check.md\r
references/three-success-frames.md\r
references/failure-risk-prediction.md\r
references/sd2-video-production-workflow.md\r
references/low-cost-validation-workflow.md\r
\r
templates/mj-character-concept-template.md\r
templates/image-model-character-board-template.md\r
templates/character-board-from-mj-template.md\r
templates/skill-preflight-template.md\r
templates/three-success-frames-template.md\r
templates/sss-skill-prompt-template.md\r
templates/sd2-video-final-template.md\r
templates/agent-auto-run-status-template.md\r
templates/full-auto-user-command.md\r
templates/repair-prompt-template.md\r
\r
examples/agent-auto-run-example.md\r
examples/no-character-to-sd2-video-example.md\r
examples/tailor-preflight-example.md\r
examples/tailor-final-video-example.md\r
\r
evals/qa-scorecard.md\r
\`\`\`\r
\r
---\r
\r
## 4. 视频提示词语言与密度硬规则\r
\r
V0.6.2 新增硬规则：Agent 自动执行时，最终视频提示词不能被压缩成英文短句。\r
\r
### 4.1 默认语言\r
\r
最终 SD2.0 视频提示词默认使用 **中文完整结构提示词**。\r
\r
允许保留少量英文技术词，例如：\r
\r
\`\`\`text\r
cinematic realism, PBR, 0.25x slow motion, one continuous 15-second video, no segmented generation\r
\`\`\`\r
\r
但不得把完整视频提示词改写成简短英文 caption。\r
\r
### 4.2 当工具偏好英文时\r
\r
如果某个视频工具强制或明显偏好英文，Agent 必须做 **完整结构翻译**，而不是摘要压缩。\r
\r
错误做法：\r
\r
\`\`\`text\r
A powerful warrior strikes the ground with a hammer, cinematic, epic, 15 seconds.\r
\`\`\`\r
\r
正确做法：\r
\r
\`\`\`text\r
完整保留角色锚点、武器锁定、技能因果链、15秒时间轴、镜头、物理反馈、声音和负面约束，然后整体翻译为英文。\r
\`\`\`\r
\r
### 4.3 最终视频提示词最低密度\r
\r
最终 SD2.0 视频提示词不得少于以下结构：\r
\r
\`\`\`text\r
【角色板唯一锚点】\r
【视频目标】\r
【角色与武器锁定】\r
【角色性格锚点】\r
【当前情绪状态】\r
【表演微指令】\r
【15秒情绪弧线】\r
【技能核心】\r
【技能因果链】\r
【必须出现的3个成功画面】\r
【15秒时间轴】\r
【镜头语言】\r
【物理反馈】\r
【声音设计】\r
【视频参数】\r
【负面约束】\r
\`\`\`\r
\r
如果 Agent 在自动执行模式下调用视频工具，传给工具的 prompt 必须是完整生产提示词，不是状态摘要、不是一句话提示词。\r
\r
### 4.4 短提示词使用限制\r
\r
短提示词只能用于：\r
\r
- 用户明确要求"给我短版"\r
- 快速方向预览\r
- Agent 状态栏摘要\r
- 文件命名 / 任务名\r
\r
短提示词不得用于最终15秒视频生成。\r
\r
### 4.5 用户可见输出与工具执行输出\r
\r
Agent 可以在聊天里给用户简短状态，例如：\r
\r
\`\`\`text\r
已通过 Preflight，正在用完整中文结构提示词生成15秒视频。\r
\`\`\`\r
\r
但传给 SD2.0 的内部视频提示词必须完整、结构化、包含时间轴和约束。\r
\r
完整模板见：\r
\r
\`\`\`text\r
templates/sd2-full-video-prompt-template.md\r
references/prompt-language-density-control.md\r
references/video-resolution-lock.md\r
\`\`\`\r
\r
### V0.7 新增 / 合并文档\r
\r
\`\`\`text\r
references/prompt-language-density-control.md\r
references/character-personality-and-emotion-system.md\r
references/video-resolution-lock.md\r
templates/personality-emotion-preflight-template.md\r
templates/sd2-full-video-prompt-template.md\r
\`\`\`\r
`;export{r as default};
