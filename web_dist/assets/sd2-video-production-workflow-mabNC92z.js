const r=`# SD2.0 Video Production Workflow\r
\r
## 硬规则\r
\r
最终技能视频使用 SD2.0 视频模型生成。\r
\r
\`\`\`text\r
模型：SD2.0视频模型\r
时长：15秒\r
生成方式：一次性直接生成完整15秒\r
禁止：分段生成 / 多段拼接\r
比例：16:9 或 21:9\r
最低画质：720p\r
声音：必须有声音\r
参考图：只使用角色板作为唯一角色参考锚点\r
前提：必须通过 Video Preflight Gate\r
\`\`\`\r
\r
## Agent自动执行规则\r
\r
如果视频生成工具可用，Agent 必须直接生成视频，不得只输出提示词让用户手动复制。\r
\r
如果 Video Preflight Gate 阻塞，停止视频生成并先修正前置问题。\r
\r
## 失败时\r
\r
失败后必须诊断：\r
\r
- 角色锚点是否丢失\r
- 武器是否变摆设\r
- 特效是否脱离媒介\r
- 物理接触是否缺失\r
- 镜头是否单一\r
- 结尾是否没有英雄镜头\r
`;export{r as default};
