export interface VideoAssessmentProvider { assess(blob?:Blob):Promise<{score:number;energy:number;emotion:number}> }
export const mockVideoAssessment:VideoAssessmentProvider={async assess(){return{score:82,energy:80,emotion:85}}}
