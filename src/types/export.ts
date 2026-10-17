export type ExportFormat = 'gif' | 'webm' | 'mp4';

export interface ExportOptions {
  format: ExportFormat;
  transparentBg?: boolean;
  fps?: number; // default: 24 for video, 20 for gif
}

export interface ExportProgress {
  currentFrame: number;
  totalFrames: number;
  phase: 'rendering' | 'encoding' | 'recording' | 'done';
}
