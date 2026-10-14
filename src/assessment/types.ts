import type { AssessmentResult } from "@/types";
import type { AudioRecording } from "@/services/audio";

export interface AssessmentModuleProps {
  result: AssessmentResult;
  onResultChange: (patch: Partial<AssessmentResult>) => void | Promise<void>;
  onRecorded: (recording: AudioRecording) => void | Promise<void>;
}
