import { Scenario, AspectRatio } from '../types/scenario';
import { ExportOptions, ExportProgress } from '../types/export';
import { renderFrameAtTime, aspectRatios } from './gifExporter';

export async function exportScenarioToVideo(
  scenario: Scenario,
  aspectRatio: AspectRatio,
  options: ExportOptions,
  onProgress?: (p: ExportProgress) => void
): Promise<{ blob: Blob; mimeType: string; extension: string }> {
  const { width, height } = aspectRatios[aspectRatio];
  const fps = options.fps || 30; // 30 fps for smooth video
  const frameInterval = 1000 / fps;

  const totalDuration = scenario.steps.reduce((sum, s) => sum + (s.duration || 2000), 0);
  const totalFrames = Math.max(1, Math.round((totalDuration / 1000) * fps));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas context could not be created');

  // Determine supported mime type
  let mimeType = 'video/webm;codecs=vp9';
  let extension = 'webm';

  if (options.format === 'mp4') {
    if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
      mimeType = 'video/mp4;codecs=avc1';
      extension = 'mp4';
    } else if (MediaRecorder.isTypeSupported('video/mp4')) {
      mimeType = 'video/mp4';
      extension = 'mp4';
    } else {
      console.warn('MP4 not supported in this browser, falling back to WebM');
      mimeType = 'video/webm';
      extension = 'webm';
    }
  } else {
    // WebM (supports alpha transparency in VP9/VP8)
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
      mimeType = 'video/webm;codecs=vp9';
    } else if (MediaRecorder.isTypeSupported('video/webm')) {
      mimeType = 'video/webm';
    }
  }

  // Initial first frame render
  renderFrameAtTime(ctx, scenario, 0, width, height, options.transparentBg);

  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 10_000_000, // 10 Mbps for crisp high quality
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const recordingPromise = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: mimeType }));
    };
    recorder.onerror = (e) => reject(e);
  });

  recorder.start();

  // Render each frame sequentially in sync with time
  for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
    const currentTime = (frameIndex / totalFrames) * totalDuration;
    renderFrameAtTime(ctx, scenario, currentTime, width, height, options.transparentBg);

    if (onProgress && frameIndex % 5 === 0) {
      onProgress({
        currentFrame: frameIndex + 1,
        totalFrames,
        phase: 'recording',
      });
    }

    // Wait for the frame duration so MediaRecorder samples the stream at natural timing
    await new Promise((r) => setTimeout(r, frameInterval));
  }

  if (onProgress) {
    onProgress({ currentFrame: totalFrames, totalFrames, phase: 'encoding' });
  }

  recorder.stop();
  const blob = await recordingPromise;

  if (onProgress) {
    onProgress({ currentFrame: totalFrames, totalFrames, phase: 'done' });
  }

  return { blob, mimeType, extension };
}
