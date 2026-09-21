export interface LanguageAssessmentProvider { assess(text:string,context?:string):Promise<{score:number;feedback:string}> }
export const mockLanguageAssessment:LanguageAssessmentProvider={async assess(text){const score=Math.min(96,55+text.trim().length*3);return{score,feedback:score>75?'表达完整，顺序很清楚。':'再补充一些关键细节会更棒。'}}}
