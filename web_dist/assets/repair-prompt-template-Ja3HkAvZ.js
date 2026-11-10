const r=`# Repair Prompt Template\r
\r
\`\`\`text\r
【失败诊断】\r
失败类型：\r
核心原因：\r
应该保留：\r
必须修正：\r
\r
【返修重点】\r
1.\r
2.\r
3.\r
\r
【返修提示词】\r
基于上一版，重点修正：{{RepairFocus}}\r
不要改变角色锚点，不要改变角色板身份，不要重设服装和武器。\r
\`\`\`\r
`;export{r as default};
