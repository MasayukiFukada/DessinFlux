import { encode, UnencodedFrame } from 'modern-gif';
import { Scenario, AspectRatio, ScenarioNode, StepAction } from '../types/scenario';

export interface ExportProgress {
  currentFrame: number;
  totalFrames: number;
  phase: 'rendering' | 'encoding' | 'done';
}

export const aspectRatios: Record<AspectRatio, { width: number; height: number }> = {
  '16:9': { width: 800, height: 450 },
  '1:1': { width: 600, height: 600 },
  '4:3': { width: 800, height: 600 },
  '9:16': { width: 450, height: 800 },
};

// Node colors mapping for Canvas matching theme.ts
const canvasNodeColors: Record<string, { border: string; glow: string; text: string; bgFrom: string; bgTo: string }> = {
  blue: { border: '#3b82f6', glow: 'rgba(59, 130, 246, 0.4)', text: '#60a5fa', bgFrom: '#1e3a8a', bgTo: '#0f172a' },
  emerald: { border: '#10b981', glow: 'rgba(16, 185, 129, 0.4)', text: '#34d399', bgFrom: '#064e3b', bgTo: '#0f172a' },
  amber: { border: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)', text: '#fbbf24', bgFrom: '#78350f', bgTo: '#0f172a' },
  purple: { border: '#a855f7', glow: 'rgba(168, 85, 247, 0.4)', text: '#c084fc', bgFrom: '#581c87', bgTo: '#0f172a' },
  rose: { border: '#f43f5e', glow: 'rgba(244, 63, 94, 0.4)', text: '#fb7185', bgFrom: '#881337', bgTo: '#0f172a' },
  cyan: { border: '#06b6d4', glow: 'rgba(6, 182, 212, 0.4)', text: '#22d3ee', bgFrom: '#164e63', bgTo: '#0f172a' },
  slate: { border: '#64748b', glow: 'rgba(100, 116, 139, 0.4)', text: '#94a3b8', bgFrom: '#334155', bgTo: '#0f172a' },
};

export async function exportScenarioToGif(
  scenario: Scenario,
  aspectRatio: AspectRatio,
  onProgress?: (p: ExportProgress) => void,
  transparentBg: boolean = false
): Promise<Blob> {
  const { width, height } = aspectRatios[aspectRatio];
  const fps = 20; // 20 frames per second
  const frameDelay = 1000 / fps;

  const totalDuration = scenario.steps.reduce((sum, s) => sum + (s.duration || 2000), 0);
  const totalFrames = Math.max(1, Math.round((totalDuration / 1000) * fps));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas context could not be created');

  const frames: UnencodedFrame[] = [];

  for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
    const currentTime = (frameIndex / totalFrames) * totalDuration;

    renderFrameAtTime(ctx, scenario, currentTime, width, height, transparentBg);

    const imgData = ctx.getImageData(0, 0, width, height);
    frames.push({ data: imgData.data, delay: frameDelay });

    if (onProgress && frameIndex % 5 === 0) {
      onProgress({ currentFrame: frameIndex + 1, totalFrames, phase: 'rendering' });
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  if (onProgress) {
    onProgress({ currentFrame: totalFrames, totalFrames, phase: 'encoding' });
  }

  const gifBlob = await encode({
    width,
    height,
    frames,
    format: 'blob',
  });

  if (onProgress) {
    onProgress({ currentFrame: totalFrames, totalFrames, phase: 'done' });
  }

  return gifBlob;
}

export function renderFrameAtTime(
  ctx: CanvasRenderingContext2D,
  scenario: Scenario,
  currentTime: number,
  width: number,
  height: number,
  transparentBg: boolean = false
) {
  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  if (!transparentBg) {
    // 1. Dark Modern Background matching preview
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#090d16');
    grad.addColorStop(0.5, '#020617');
    grad.addColorStop(1, '#0b1120');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Subtle grid dots
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    const gridSize = 24;
    for (let x = 12; x < width; x += gridSize) {
      for (let y = 12; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 2. Identify current step
  let elapsed = 0;
  let activeStepIndex = 0;
  let activeStep = scenario.steps[0];
  let stepProgress = 0;

  for (let i = 0; i < scenario.steps.length; i++) {
    const step = scenario.steps[i];
    const dur = step.duration || 2000;
    if (currentTime >= elapsed && currentTime <= elapsed + dur) {
      activeStepIndex = i;
      activeStep = step;
      stepProgress = (currentTime - elapsed) / dur;
      break;
    }
    elapsed += dur;
  }
  if (!activeStep && scenario.steps.length > 0) {
    activeStepIndex = scenario.steps.length - 1;
    activeStep = scenario.steps[scenario.steps.length - 1];
    stepProgress = 1.0;
  }

  const nodeMap = new Map(scenario.nodes.map((n) => [n.id, n]));

  // 3. Draw static connecting lines between nodes (Layer 1)
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);

  if (scenario.nodes.length >= 2) {
    for (let i = 0; i < scenario.nodes.length - 1; i++) {
      const n1 = scenario.nodes[i];
      const n2 = scenario.nodes[i + 1];
      ctx.beginPath();
      ctx.moveTo((n1.x / 100) * width, (n1.y / 100) * height);
      ctx.lineTo((n2.x / 100) * width, (n2.y / 100) * height);
      ctx.stroke();
    }
  }
  ctx.setLineDash([]); // reset dash

  // 4. Draw active motion trajectory line (Layer 2)
  if (activeStep && activeStep.action.type === 'message') {
    const fromNode = nodeMap.get(activeStep.action.from);
    const toNode = nodeMap.get(activeStep.action.to);
    if (fromNode && toNode) {
      const x1 = (fromNode.x / 100) * width;
      const y1 = (fromNode.y / 100) * height;
      const x2 = (toNode.x / 100) * width;
      const y2 = (toNode.y / 100) * height;

      // easeInOutCubic
      const t = stepProgress < 0.5 ? 4 * stepProgress * stepProgress * stepProgress : 1 - Math.pow(-2 * stepProgress + 2, 3) / 2;
      const curX = x1 + (x2 - x1) * t;
      const curY = y1 + (y2 - y1) * t;

      ctx.strokeStyle = activeStep.action.status === 'danger' ? '#f43f5e' : '#38bdf8';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(curX, curY);
      ctx.stroke();
    }
  }

  // 5. Render Nodes (Layer 3: Draw BEFORE foreground packets and popups!)
  for (const node of scenario.nodes) {
    renderCanvasNode(ctx, node, width, height, activeStep?.action);
  }

  // 6. Render Foreground Actions (Layer 4: Packets, Badges, Highlights - Draw ON TOP of Nodes!)
  if (activeStep) {
    renderCanvasAction(ctx, activeStep.action, nodeMap, stepProgress, width, height);
  }

  // 7. Render Subtitle / Caption at bottom (Layer 5)
  if (activeStep && activeStep.caption) {
    renderWrappedCaption(ctx, activeStep.caption, activeStepIndex + 1, scenario.steps.length, width, height);
  }
}

function renderCanvasNode(
  ctx: CanvasRenderingContext2D,
  node: ScenarioNode,
  width: number,
  height: number,
  currentAction?: StepAction
) {
  const nx = (node.x / 100) * width;
  const ny = (node.y / 100) * height;
  const colorKey = node.color || 'blue';
  const theme = canvasNodeColors[colorKey] || canvasNodeColors.blue;

  // Check if target of transform
  const isTransformTarget = currentAction?.type === 'transform' && currentAction.target === node.id;
  if (isTransformTarget) {
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(nx, ny, 44, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Outer node card
  const cardW = 104;
  const cardH = 70;
  const cx = nx - cardW / 2;
  const cy = ny - cardH / 2;

  // Node background gradient
  const nodeGrad = ctx.createLinearGradient(cx, cy, cx, cy + cardH);
  nodeGrad.addColorStop(0, theme.bgFrom);
  nodeGrad.addColorStop(1, theme.bgTo);
  ctx.fillStyle = nodeGrad;
  ctx.strokeStyle = theme.border;
  ctx.lineWidth = 1.5;
  roundRect(ctx, cx, cy, cardW, cardH, 12);
  ctx.fill();
  ctx.stroke();

  // Icon container pill
  const iconX = nx;
  const iconY = cy + 18;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
  ctx.beginPath();
  ctx.arc(iconX, iconY, 13, 0, Math.PI * 2);
  ctx.fill();

  // Draw node icon
  drawCanvasIcon(ctx, node.icon || 'layers', iconX, iconY, 15, theme.text);

  // Node label
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(node.label, nx, cy + 36);

  // Sublabel
  if (node.sublabel) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px sans-serif';
    ctx.fillText(node.sublabel, nx, cy + 52);
  }
}

function renderCanvasAction(
  ctx: CanvasRenderingContext2D,
  action: StepAction,
  nodeMap: Map<string, ScenarioNode>,
  stepProgress: number,
  width: number,
  height: number
) {
  if (action.type === 'message') {
    const fromNode = nodeMap.get(action.from);
    const toNode = nodeMap.get(action.to);
    if (!fromNode || !toNode) return;

    const x1 = (fromNode.x / 100) * width;
    const y1 = (fromNode.y / 100) * height;
    const x2 = (toNode.x / 100) * width;
    const y2 = (toNode.y / 100) * height;

    const t = stepProgress < 0.5 ? 4 * stepProgress * stepProgress * stepProgress : 1 - Math.pow(-2 * stepProgress + 2, 3) / 2;
    const curX = x1 + (x2 - x1) * t;
    const curY = y1 + (y2 - y1) * t;

    const isDanger = action.status === 'danger';
    const bubbleW = 150;
    const bubbleH = 44;
    const bx = curX - bubbleW / 2;
    const by = curY - 45;

    // Draw Traveling Packet Bubble (Foreground)
    ctx.fillStyle = isDanger ? 'rgba(136, 19, 55, 0.95)' : 'rgba(12, 74, 110, 0.95)';
    ctx.strokeStyle = isDanger ? '#f43f5e' : '#38bdf8';
    ctx.lineWidth = 1.5;
    roundRect(ctx, bx, by, bubbleW, bubbleH, 10);
    ctx.fill();
    ctx.stroke();

    // Packet Icon
    drawCanvasIcon(ctx, action.icon || 'key', bx + 18, by + bubbleH / 2, 14, isDanger ? '#fda4af' : '#7dd3fc');

    // Packet Label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(action.label, bx + 32, by + 14);

    if (action.payload) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '9px monospace';
      ctx.fillText(action.payload.length > 20 ? action.payload.slice(0, 19) + '…' : action.payload, bx + 32, by + 30);
    }
  } else if (action.type === 'transform') {
    const node = nodeMap.get(action.target);
    if (!node) return;
    const nx = (node.x / 100) * width;
    const ny = (node.y / 100) * height;

    const bw = 175;
    const bh = 38;
    const bx = nx - bw / 2;
    const by = ny + 46;

    ctx.fillStyle = 'rgba(88, 28, 135, 0.95)';
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 1.5;
    roundRect(ctx, bx, by, bw, bh, 8);
    ctx.fill();
    ctx.stroke();

    drawCanvasIcon(ctx, 'sparkles', bx + 16, by + bh / 2, 13, '#e9d5ff');

    ctx.fillStyle = '#f3e8ff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const titleText = action.label + (action.badge ? ` [${action.badge}]` : '');
    ctx.fillText(titleText, bx + 28, by + 12);

    if (action.result) {
      ctx.fillStyle = '#e9d5ff';
      ctx.font = '9px monospace';
      ctx.fillText(action.result.length > 22 ? action.result.slice(0, 21) + '…' : action.result, bx + 28, by + 26);
    }
  } else if (action.type === 'state' || action.type === 'result') {
    const node = nodeMap.get(action.target);
    if (!node) return;
    const nx = (node.x / 100) * width;
    const ny = (node.y / 100) * height;

    const isSuccess = action.type === 'result' ? action.status === 'success' : action.status === 'safe';
    const isDanger = action.type === 'result' ? action.status === 'error' : action.status === 'danger';

    const bg = isDanger ? 'rgba(159, 18, 57, 0.95)' : isSuccess ? 'rgba(6, 95, 70, 0.95)' : 'rgba(30, 58, 138, 0.95)';
    const border = isDanger ? '#f43f5e' : isSuccess ? '#10b981' : '#3b82f6';

    const bw = 170;
    const bh = 34;
    const bx = nx - bw / 2;
    const by = ny + 46;

    ctx.fillStyle = bg;
    ctx.strokeStyle = border;
    ctx.lineWidth = 1.5;
    roundRect(ctx, bx, by, bw, bh, 8);
    ctx.fill();
    ctx.stroke();

    drawCanvasIcon(ctx, isDanger ? 'alert-triangle' : isSuccess ? 'check' : 'shield', bx + 16, by + bh / 2, 14, '#ffffff');

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(action.label, bx + 28, by + bh / 2);
  }
}

function renderWrappedCaption(
  ctx: CanvasRenderingContext2D,
  caption: string,
  currentStep: number,
  totalSteps: number,
  width: number,
  height: number
) {
  const margin = 16;
  const boxWidth = width - margin * 2;
  const paddingX = 14;
  const paddingY = 10;
  const fontSize = width < 500 ? 11 : 13;
  const lineHeight = fontSize + 5;

  ctx.font = `500 ${fontSize}px sans-serif`;

  // Calculate text wrapping
  const badgeWidth = 72;
  const maxTextWidth = boxWidth - paddingX * 2 - badgeWidth - 10;
  const lines: string[] = [];

  let currentLine = '';
  for (let i = 0; i < caption.length; i++) {
    const char = caption[i];
    const testLine = currentLine + char;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxTextWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  const textLinesHeight = Math.max(1, lines.length) * lineHeight;
  const boxHeight = Math.max(42, textLinesHeight + paddingY * 2);
  const boxY = height - boxHeight - margin;

  // Background box
  ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, margin, boxY, boxWidth, boxHeight, 10);
  ctx.fill();
  ctx.stroke();

  // STEP Badge
  const badgeH = 22;
  const badgeY = boxY + paddingY;
  ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
  ctx.lineWidth = 1;
  roundRect(ctx, margin + paddingX, badgeY, badgeWidth, badgeH, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`STEP ${currentStep}/${totalSteps}`, margin + paddingX + badgeWidth / 2, badgeY + badgeH / 2);

  // Render Caption text lines
  ctx.fillStyle = '#f8fafc';
  ctx.font = `500 ${fontSize}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const textStartX = margin + paddingX + badgeWidth + 10;
  lines.forEach((line, idx) => {
    ctx.fillText(line, textStartX, boxY + paddingY + idx * lineHeight);
  });
}

// Vector Icon drawing on Canvas for pixel-perfect match with Lucide
function drawCanvasIcon(
  ctx: CanvasRenderingContext2D,
  iconName: string,
  cx: number,
  cy: number,
  size: number,
  color: string
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const half = size / 2;

  switch (iconName.toLowerCase()) {
    case 'laptop': {
      // Screen
      ctx.strokeRect(cx - half, cy - half, size, size * 0.65);
      // Base
      ctx.beginPath();
      ctx.moveTo(cx - half - 2, cy + half * 0.45);
      ctx.lineTo(cx + half + 2, cy + half * 0.45);
      ctx.stroke();
      break;
    }
    case 'server': {
      // 2 stack blocks
      const h3 = size * 0.38;
      ctx.strokeRect(cx - half, cy - half, size, h3);
      ctx.strokeRect(cx - half, cy - half + h3 + 3, size, h3);
      // LED dots
      ctx.beginPath();
      ctx.arc(cx + half - 4, cy - half + h3 / 2, 1.2, 0, Math.PI * 2);
      ctx.arc(cx + half - 4, cy - half + h3 + 3 + h3 / 2, 1.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'database': {
      // Cylinders
      const rx = half;
      const ry = size * 0.2;
      ctx.beginPath();
      ctx.ellipse(cx, cy - half + ry, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI);
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(cx, cy + half - ry, rx, ry, 0, 0, Math.PI);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx - rx, cy - half + ry);
      ctx.lineTo(cx - rx, cy + half - ry);
      ctx.moveTo(cx + rx, cy - half + ry);
      ctx.lineTo(cx + rx, cy + half - ry);
      ctx.stroke();
      break;
    }
    case 'smartphone': {
      ctx.strokeRect(cx - half * 0.65, cy - half, size * 0.65, size);
      ctx.beginPath();
      ctx.arc(cx, cy + half - 3, 1.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'key': {
      // Key head
      ctx.beginPath();
      ctx.arc(cx - half * 0.3, cy, half * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      // Stem
      ctx.beginPath();
      ctx.moveTo(cx + half * 0.2, cy);
      ctx.lineTo(cx + half, cy);
      ctx.lineTo(cx + half, cy + 3);
      ctx.moveTo(cx + half * 0.6, cy);
      ctx.lineTo(cx + half * 0.6, cy + 3);
      ctx.stroke();
      break;
    }
    case 'lock': {
      // Shackle
      ctx.beginPath();
      ctx.arc(cx, cy - 2, half * 0.5, Math.PI, 0);
      ctx.stroke();
      // Body
      ctx.strokeRect(cx - half * 0.7, cy - 2, size * 0.7, size * 0.55);
      break;
    }
    case 'shield':
    case 'shield-check': {
      ctx.beginPath();
      ctx.moveTo(cx, cy - half);
      ctx.lineTo(cx + half, cy - half * 0.5);
      ctx.lineTo(cx + half, cy + 1);
      ctx.quadraticCurveTo(cx + half, cy + half, cx, cy + half + 2);
      ctx.quadraticCurveTo(cx - half, cy + half, cx - half, cy + 1);
      ctx.lineTo(cx - half, cy - half * 0.5);
      ctx.closePath();
      ctx.stroke();
      break;
    }
    case 'sparkles': {
      ctx.beginPath();
      ctx.moveTo(cx, cy - half);
      ctx.quadraticCurveTo(cx, cy, cx + half, cy);
      ctx.quadraticCurveTo(cx, cy, cx, cy + half);
      ctx.quadraticCurveTo(cx, cy, cx - half, cy);
      ctx.quadraticCurveTo(cx, cy, cx, cy - half);
      ctx.stroke();
      break;
    }
    case 'alert-triangle': {
      ctx.beginPath();
      ctx.moveTo(cx, cy - half);
      ctx.lineTo(cx + half, cy + half);
      ctx.lineTo(cx - half, cy + half);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy - 2);
      ctx.lineTo(cx, cy + 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy + 5, 1, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'check': {
      ctx.beginPath();
      ctx.moveTo(cx - half * 0.8, cy);
      ctx.lineTo(cx - 1, cy + half * 0.6);
      ctx.lineTo(cx + half * 0.8, cy - half * 0.6);
      ctx.stroke();
      break;
    }
    default: {
      // Default circular node indicator
      ctx.beginPath();
      ctx.arc(cx, cy, half * 0.6, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
