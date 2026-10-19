import type { AssessmentResult, StageId } from "@/types";
import type { AudioRecording } from "@/services/audio";

export interface AssessmentModuleProps {
  stage?: StageId;
  studentGrade?: string;
  items?: Record<string, AssessmentResult>;
  onSelectItem?: (id: string) => void;
  result: AssessmentResult;
  onResultChange: (patch: Partial<AssessmentResult>) => void | Promise<void>;
  onRecorded: (recording: AudioRecording) => void | Promise<void>;
}
