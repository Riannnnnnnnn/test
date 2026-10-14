export interface SpeechResult { transcript: string; confidence: number; provider: "mock" | "remote"; }
export interface SpeechRecognitionService { recognize(audio: Blob): Promise<SpeechResult>; }
export class MockSpeechRecognitionService implements SpeechRecognitionService {
  async recognize(audio: Blob): Promise<SpeechResult> { void audio; return { transcript: "", confidence: 0, provider: "mock" }; }
}
