import { abilities } from '../data/abilityConfig'
import { useAssessmentStore } from '../store/useAssessmentStore'
import type { AbilityId } from '../types/assessment'
export function BottomAbilityNav({active,onSelect}:{active?:AbilityId;onSelect:(id:AbilityId)=>void}){const tests=useAssessmentStore(s=>s.tests);return <nav className="bottom-nav" aria-label="12维能力导航">{abilities.map(a=><button key={a.id} className={`${active===a.id?'active':''} ${tests[a.id].completed?'done':''}`} onClick={()=>onSelect(a.id)}><span>{a.icon}</span><small>{a.name}</small>{tests[a.id].completed&&<i>✓</i>}</button>)}</nav>}
