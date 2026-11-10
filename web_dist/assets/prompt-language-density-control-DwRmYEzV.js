const n=`# Prompt Language & Density Control\r
\r
# 视频提示词语言与密度控制规则\r
\r
## 目的\r
\r
防止 Agent 在自动执行时把最终视频提示词压缩成英文短句，导致角色锚点、武器因果、物理反馈、镜头节奏和声音全部丢失。\r
\r
## 核心规则\r
\r
最终视频提示词默认中文完整结构。英文只作为技术关键词辅助，不能替代中文完整提示词。\r
\r
## 禁止输出\r
\r
\`\`\`text\r
A warrior charges up and destroys the ground, epic cinematic, 15s.\r
\`\`\`\r
\r
这类提示词太短，无法控制：\r
\r
- 角色一致性\r
- 武器一致性\r
- 蓄力前摇\r
- 物理破坏\r
- 镜头节奏\r
- 结尾英雄镜头\r
- 声音设计\r
\r
## 正确输出结构\r
\r
最终视频工具 prompt 必须包含：\r
\r
1. 角色板唯一锚点\r
2. 视频目标\r
3. 角色与武器锁定\r
4. 技能核心\r
5. 技能因果链\r
6. 必须出现的3个成功画面\r
7. 15秒时间轴\r
8. 镜头语言\r
9. 物理反馈\r
10. 声音设计\r
11. 视频参数\r
12. 负面约束\r
\r
## 中文优先规则\r
\r
默认使用中文，因为本 Skill 的角色理解、技能动力学、反模板检查和视频预演均以中文逻辑构建。\r
\r
允许保留英文技术词：\r
\r
\`\`\`text\r
cinematic realism, PBR, 4K, 0.25x slow motion, one continuous 15-second video, no segmented generation\r
\`\`\`\r
\r
## 英文工具兼容规则\r
\r
如果工具只接受英文，Agent 必须把完整中文结构翻译成完整英文结构，不得浓缩为一句话。\r
\r
## 自动执行规则\r
\r
聊天里的状态可以短，但工具里的 prompt 必须长。\r
\r
示例：\r
\r
聊天状态：\r
\r
\`\`\`text\r
Preflight 通过，正在生成最终15秒视频。\r
\`\`\`\r
\r
工具 prompt：\r
\r
\`\`\`text\r
必须使用完整结构化视频提示词。\r
\`\`\`\r
`;export{n as default};
