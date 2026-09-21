export type AbilityId = 'wordRecognition'|'pronunciation'|'breath'|'voice'|'semantic'|'memory'|'attention'|'organization'|'thinking'|'expression'|'performance'|'communication'
export interface Profile { name:string; gender:string; age:string; speechFoundation:string; voiceStage:string }
export interface TestResult { rawScore:number; stars:number; metrics:Record<string, number|string|boolean>; completedAt:string }
export interface TestState { completed:boolean; stars:number; rawScore:number; attempts:TestResult[] }
export interface AssessmentState { profile:Profile; tests:Record<AbilityId,TestState> }
export interface AbilityConfig { id:AbilityId; name:string; gameName:string; icon:string; theme:string; description:string; collect:string[] }
