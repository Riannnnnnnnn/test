import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { abilities } from '../data/abilityConfig'
import type { AbilityId, AssessmentState, Profile, TestResult } from '../types/assessment'

const blankTests=()=>Object.fromEntries(abilities.map(a=>[a.id,{completed:false,stars:0,rawScore:0,attempts:[]}])) as unknown as AssessmentState['tests']
const initialProfile:Profile={name:'',gender:'',age:'',speechFoundation:'',voiceStage:''}
export const scoreToStars=(score:number)=>score>=90?5:score>=75?4:score>=60?3:score>=40?2:1
interface Store extends AssessmentState {
 activeId:AbilityId|null; completion:TestResult|null; started:boolean; debugMockMic:boolean;
 setProfile:(p:Profile)=>void; startTest:(id:AbilityId)=>void; cancelTest:()=>void;
 completeTest:(id:AbilityId,rawScore:number,metrics:TestResult['metrics'])=>void;
 closeCompletion:()=>void; resetAll:()=>void; simulate:(id:AbilityId,stars:number)=>void; setDebugMockMic:(v:boolean)=>void
}
export const useAssessmentStore=create<Store>()(persist((set)=>({
 profile:initialProfile,tests:blankTests(),activeId:null,completion:null,started:false,debugMockMic:false,
 setProfile:(profile)=>set({profile}),startTest:(activeId)=>set({activeId,started:true,completion:null}),cancelTest:()=>set({activeId:null,started:false}),
 completeTest:(id,rawScore,metrics)=>set(s=>{const score=Math.max(0,Math.min(100,Math.round(rawScore)));const result={rawScore:score,stars:scoreToStars(score),metrics,completedAt:new Date().toISOString()};return{tests:{...s.tests,[id]:{completed:true,rawScore:score,stars:result.stars,attempts:[...s.tests[id].attempts,result]}},completion:result,started:false}}),
 closeCompletion:()=>set({completion:null}),resetAll:()=>set({profile:initialProfile,tests:blankTests(),activeId:null,completion:null,started:false}),
 simulate:(id,stars)=>set(s=>{const rawScore=stars===5?95:stars===4?82:stars===3?68:stars===2?50:30;const r={rawScore,stars,metrics:{debug:true},completedAt:new Date().toISOString()};return{tests:{...s.tests,[id]:{completed:true,rawScore,stars,attempts:[...s.tests[id].attempts,r]}}}}),setDebugMockMic:(debugMockMic)=>set({debugMockMic})
}),{name:'starvoice-assessment-v1',partialize:(s)=>({profile:s.profile,tests:s.tests,debugMockMic:s.debugMockMic})}))
