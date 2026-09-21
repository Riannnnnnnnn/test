import { motion } from 'framer-motion'
import { abilities } from '../data/abilityConfig'
import { useAssessmentStore } from '../store/useAssessmentStore'
import type { AbilityId } from '../types/assessment'
import { IPGuide } from './IPGuide'
import { StarRating } from './StarRating'
export function TestCompleteModal({id,onCenter,onRestart,onRandom}:{id:AbilityId;onCenter:()=>void;onRestart:()=>void;onRandom:(id:AbilityId)=>void}){const result=useAssessmentStore(s=>s.completion);const tests=useAssessmentStore(s=>s.tests);if(!result)return null;const count=Object.values(tests).filter(t=>t.completed).length;const random=abilities.filter(a=>a.id!==id)[Math.floor(Math.random()*11)].id;return <div className="modal-backdrop"><motion.div className="modal-card complete" initial={{scale:.75,y:30}} animate={{scale:1,y:0}}><div className="confetti">★ ✦ ● ★ ✦</div><IPGuide compact state="success" message="我就知道你可以！"/><h2>太棒啦！<br/>「{abilities.find(a=>a.id===id)?.name}」测试完成！</h2><StarRating value={result.stars} size="lg"/><p>这个能力已经测试过啦～ 当前完成 <b>{count} / 12</b></p><div className="modal-actions"><button className="primary" onClick={onCenter}>返回测试中心</button><button className="secondary" onClick={onRestart}>再测一次</button><button className="ghost" onClick={()=>onRandom(random)}>随机探索一项</button></div></motion.div></div>}
