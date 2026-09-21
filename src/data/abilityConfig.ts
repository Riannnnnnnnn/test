import type { AbilityConfig } from '../types/assessment'
export const abilities: AbilityConfig[] = [
 {id:'wordRecognition',name:'识词能力',gameName:'词语小雷达',icon:'⌁',theme:'radar',description:'扫描意思相近的词语',collect:['正确率','反应速度','连对次数']},
 {id:'pronunciation',name:'吐字归音',gameName:'声音闯关岛',icon:'🎙',theme:'island',description:'读准绕口令，闯过发音岛',collect:['录音时长','完成关卡','模拟清晰度']},
 {id:'breath',name:'气息状态',gameName:'超级气球挑战',icon:'🎈',theme:'balloon',description:'用稳定的声音把气球吹大',collect:['最长连续发声','总活跃时长','中断次数']},
 {id:'voice',name:'声音条件',gameName:'声音能量站',icon:'⚡',theme:'energy',description:'让音量、稳定和持续都亮起来',collect:['音量区间','稳定度','持续度']},
 {id:'semantic',name:'语义感知力',gameName:'谁说得更像？',icon:'🎭',theme:'emotion',description:'听懂语气背后的心情',collect:['情绪判断','语境理解','反话识别']},
 {id:'memory',name:'记忆力',gameName:'小小侦探记忆屋',icon:'🔎',theme:'memory',description:'记住房间里的物品与位置',collect:['物品记忆','位置记忆','用时']},
 {id:'attention',name:'专注力',gameName:'闪电追踪员',icon:'★',theme:'attention',description:'只追踪目标，不被干扰骗到',collect:['正确点击','漏点','误点','反应时间']},
 {id:'organization',name:'逻辑组织',gameName:'小小总指挥',icon:'🧩',theme:'command',description:'给伙伴分配最合适的任务',collect:['信息提取','任务匹配','资源分配']},
 {id:'thinking',name:'思维逻辑',gameName:'线索推理局',icon:'🕵',theme:'detective',description:'沿着线索找出正确答案',collect:['条件推理','排除能力','正确率']},
 {id:'expression',name:'逻辑表达',gameName:'故事拼图家',icon:'📚',theme:'story',description:'排好故事，再把它讲完整',collect:['顺序结构','表达时长','内容覆盖']},
 {id:'performance',name:'表现力',gameName:'小演员变身',icon:'🎬',theme:'stage',description:'带着角色和情绪完成表演',collect:['录制时长','情绪完成度','动作自评']},
 {id:'communication',name:'沟通应变',gameName:'怎么办？',icon:'💬',theme:'scenario',description:'在生活情境中想办法',collect:['关键词覆盖','应答时长','追问表现']}
]
export const abilityMap = Object.fromEntries(abilities.map(a=>[a.id,a])) as Record<AbilityConfig['id'],AbilityConfig>
