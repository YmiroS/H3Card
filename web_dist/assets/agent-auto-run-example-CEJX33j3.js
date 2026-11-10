const n=`# Agent Auto-Run Example\r
\r
用户：\r
\r
\`\`\`text\r
使用 cinematic-fight-unit-skill V0.6，全自动做一个SSS技能视频，不要只给提示词。\r
\`\`\`\r
\r
Agent 应执行：\r
\r
\`\`\`text\r
1. 从角色库中自动选择一个强视觉角色。\r
2. 调用MJ生成单人角色概念图：--v 8.1 --preview。\r
3. 质检MJ概念图。\r
4. 调用Image模型生成角色板：16:9 / 高画质 / 2K。\r
5. 质检角色板。\r
6. 使用角色板作为唯一锚点设计技能。\r
7. 执行Preflight Gate。\r
8. 通过后调用SD2.0生成一条15秒有声视频。\r
9. 返回资产链接 / 缩略图 / 阶段状态。\r
\`\`\`\r
\r
不得只输出提示词。\r
`;export{n as default};
