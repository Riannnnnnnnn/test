import type { AbilityId } from '../types/assessment'
import { abilityMap } from '../data/abilityConfig'
import { useAssessmentStore } from '../store/useAssessmentStore'
import { StarRating } from './StarRating'
export function RepeatTestModal({id,onView,onRestart,onCancel}:{id:AbilityId;onView:()=>void;onRestart:()=>void;onCancel:()=>void}){const test=useAssessmentStore(s=>s.tests[id]);return <div className="modal-backdrop"><div className="modal-card"><span className="modal-icon">↻</span><h2>这个能力已经测试过啦！</h2><p>{abilityMap[id].name} · 上次测试</p><StarRating value={test.stars} size="lg"/><small>{new Date(test.attempts.at(-1)?.completedAt||Date.now()).toLocaleString('zh-CN')} · 共 {test.attempts.length} 次</small><div className="modal-actions"><button className="primary" onClick={onView}>查看上次结果</button><button className="secondary" onClick={onRestart}>重新测试</button><button className="ghost" onClick={onCancel}>取消</button></div></div></div>}
