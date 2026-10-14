export interface AudioRecording {
  blob: Blob;
  duration: number;
  mimeType: string;
}

export interface AudioRecorderService {
  start(onVolume?: (volume: number) => void): Promise<void>;
  stop(): Promise<AudioRecording>;
  cancel(): void;
}
