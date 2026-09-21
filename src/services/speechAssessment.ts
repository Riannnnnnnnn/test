export interface SpeechResult { clarity:number; fluency:number; completeness:number; rawScore:number }
export interface SpeechAssessmentProvider { assess(audioBlob?:Blob):Promise<SpeechResult> }
export class MockSpeechAssessmentProvider implements SpeechAssessmentProvider { async assess(){await new Promise(r=>setTimeout(r,450));const rawScore=74+Math.floor(Math.random()*23);return{clarity:rawScore,fluency:Math.max(60,rawScore-4),completeness:Math.min(100,rawScore+3),rawScore}} }
export class IFlytekSpeechAssessmentProvider implements SpeechAssessmentProvider { async assess():Promise<SpeechResult>{throw new Error('IFlytek provider 尚未配置')} }
export const speechAssessment:SpeechAssessmentProvider=new MockSpeechAssessmentProvider()
