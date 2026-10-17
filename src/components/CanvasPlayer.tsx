import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Repeat,
  Sparkles,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { Scenario, AspectRatio, ScenarioNode } from '../types/scenario';
import { DynamicIcon } from './DynamicIcon';
import { nodeColorStyles } from '../utils/theme';

interface CanvasPlayerProps {
  scenario: Scenario;
  aspectRatio: AspectRatio;
  onUpdateNodes?: (nodes: ScenarioNode[]) => void;
}

export const CanvasPlayer: React.FC<CanvasPlayerProps> = ({
  scenario,
  aspectRatio,
  onUpdateNodes,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Total duration in ms
  const totalDuration = scenario.steps.reduce((sum, s) => sum + (s.duration || 2000), 0);

  // Animation playback loop
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      lastTimeRef.current = null;
      return;
    }

    const loop = (now: number) => {
      if (lastTimeRef.current !== null) {
        const delta = (now - lastTimeRef.current) * playbackSpeed;
        setCurrentTime((prev) => {
          const next = prev + delta;
          if (next >= totalDuration) {
            if (isLooping) {
              return 0;
            } else {
              setIsPlaying(false);
              return totalDuration;
            }
          }
          return next;
        });
      }
      lastTimeRef.current = now;
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, totalDuration, playbackSpeed, isLooping]);

  // Determine current active step and progress (0.0 to 1.0)
  let elapsed = 0;
  let activeStepIndex = 0;
  let activeStep = scenario.steps[0];
  let stepProgress = 0;

  for (let i = 0; i < scenario.steps.length; i++) {
    const s = scenario.steps[i];
    const dur = s.duration || 2000;
    if (currentTime >= elapsed && currentTime <= elapsed + dur) {
      activeStepIndex = i;
      activeStep = s;
      stepProgress = Math.min(1, Math.max(0, (currentTime - elapsed) / dur));
      break;
    }
    elapsed += dur;
  }
  if (!activeStep && scenario.steps.length > 0) {
    activeStepIndex = scenario.steps.length - 1;
    activeStep = scenario.steps[scenario.steps.length - 1];
    stepProgress = 1;
  }

  // Handle Drag & Drop to reposition nodes
  const handleMouseDown = (nodeId: string) => {
    setDraggingNodeId(nodeId);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingNodeId || !containerRef.current || !onUpdateNodes) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.min(95, Math.max(5, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(90, Math.max(10, ((e.clientY - rect.top) / rect.height) * 100));

    const updated = scenario.nodes.map((n) =>
      n.id === draggingNodeId ? { ...n, x: Math.round(x), y: Math.round(y) } : n
    );
    onUpdateNodes(updated);
  };

  const handleMouseUp = () => {
    setDraggingNodeId(null);
  };

  // Node Map
  const nodeMap = new Map(scenario.nodes.map((n) => [n.id, n]));

  // Aspect ratio class mapping
  const aspectClass = {
    '16:9': 'aspect-video max-w-4xl',
    '1:1': 'aspect-square max-w-2xl',
    '4:3': 'aspect-[4/3] max-w-3xl',
    '9:16': 'aspect-[9/16] max-w-sm max-h-[680px]',
  }[aspectRatio];

  // Helper for skipping steps
  const jumpToStep = (index: number) => {
    let t = 0;
    for (let i = 0; i < index && i < scenario.steps.length; i++) {
      t += scenario.steps[i].duration || 2000;
    }
    setCurrentTime(t);
  };

  return (
    <div className="flex flex-col items-center w-full gap-4">
      {/* Visual Canvas Area */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className={`relative w-full ${aspectClass} bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden select-none`}
      >
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, #fff 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* SVG layer for connecting lines & arrows */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          {/* Static dotted links: controlled by connectTo, or fallback between framed nodes */}
          {(() => {
            const hasAnyConnectTo = scenario.nodes.some((n) => n.connectTo && n.connectTo.length > 0);
            if (hasAnyConnectTo) {
              return scenario.nodes.flatMap((node) =>
                (node.connectTo || []).map((targetId) => {
                  const target = nodeMap.get(targetId);
                  if (!target) return null;
                  return (
                    <line
                      key={`link-${node.id}-${target.id}`}
                      x1={`${node.x}%`}
                      y1={`${node.y}%`}
                      x2={`${target.x}%`}
                      y2={`${target.y}%`}
                      stroke="rgba(148, 163, 184, 0.25)"
                      strokeWidth="2"
                      strokeDasharray="6 6"
                    />
                  );
                })
              );
            } else {
              return scenario.nodes.map((node, i) => {
                if (i === 0) return null;
                const prev = scenario.nodes[i - 1];
                // Don't auto-connect if either node has frame: false
                if (node.frame === false || prev.frame === false) return null;
                return (
                  <line
                    key={`link-${prev.id}-${node.id}`}
                    x1={`${prev.x}%`}
                    y1={`${prev.y}%`}
                    x2={`${node.x}%`}
                    y2={`${node.y}%`}
                    stroke="rgba(148, 163, 184, 0.2)"
                    strokeWidth="2"
                    strokeDasharray="6 6"
                  />
                );
              });
            }
          })()}

          {/* Active Message Animation Line */}
          {activeStep && activeStep.action.type === 'message' && (() => {
            const from = nodeMap.get(activeStep.action.from);
            const to = nodeMap.get(activeStep.action.to);
            if (!from || !to) return null;

            // easeInOutCubic
            const t = stepProgress < 0.5 ? 4 * stepProgress * stepProgress * stepProgress : 1 - Math.pow(-2 * stepProgress + 2, 3) / 2;
            const curX = from.x + (to.x - from.x) * t;
            const curY = from.y + (to.y - from.y) * t;
            const isDanger = activeStep.action.status === 'danger';

            return (
              <g>
                {/* Glowing line trace */}
                <line
                  x1={`${from.x}%`}
                  y1={`${from.y}%`}
                  x2={`${curX}%`}
                  y2={`${curY}%`}
                  stroke={isDanger ? '#f43f5e' : '#38bdf8'}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  className="filter drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]"
                />
              </g>
            );
          })()}
        </svg>

        {/* Dynamic Traveling Packet Bubble */}
        {activeStep && activeStep.action.type === 'message' && (() => {
          const from = nodeMap.get(activeStep.action.from);
          const to = nodeMap.get(activeStep.action.to);
          if (!from || !to) return null;

          const t = stepProgress < 0.5 ? 4 * stepProgress * stepProgress * stepProgress : 1 - Math.pow(-2 * stepProgress + 2, 3) / 2;
          const curX = from.x + (to.x - from.x) * t;
          const curY = from.y + (to.y - from.y) * t;
          const isDanger = activeStep.action.status === 'danger';

          return (
            <div
              className="absolute pointer-events-none z-20 -translate-x-1/2 -translate-y-12 transition-transform duration-75"
              style={{ left: `${curX}%`, top: `${curY}%` }}
            >
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl shadow-xl backdrop-blur-md border ${
                  isDanger
                    ? 'bg-rose-950/90 border-rose-500 text-rose-100 shadow-rose-900/50'
                    : 'bg-sky-950/90 border-sky-500 text-sky-100 shadow-sky-900/50'
                }`}
              >
                <DynamicIcon name={activeStep.action.icon || 'key'} size={15} />
                <div className="flex flex-col text-left">
                  <span className="text-[11px] font-bold leading-tight">{activeStep.action.label}</span>
                  {activeStep.action.payload && (
                    <span className="text-[9px] font-mono opacity-80 leading-tight">
                      {activeStep.action.payload}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Nodes Layer */}
        {scenario.nodes.map((node) => {
          const theme = nodeColorStyles[node.color || 'blue'];
          const isTargetOfTransform =
            activeStep?.action.type === 'transform' && activeStep.action.target === node.id;
          const isTargetOfState =
            activeStep?.action.type === 'state' && activeStep.action.target === node.id;
          const isTargetOfResult =
            activeStep?.action.type === 'result' && activeStep.action.target === node.id;
          const isArrivingNode =
            activeStep?.action.type === 'message' &&
            activeStep.action.to === node.id &&
            stepProgress > 0.75;

          const scale = isArrivingNode ? 1.06 : isTargetOfTransform ? 1.04 : 1;
          const nodeCustomScale = node.scale || 1.0;
          const totalScale = scale * nodeCustomScale;
          const isFramed = node.frame !== false;
          const isArrivingDanger =
            isArrivingNode && activeStep?.action.type === 'message' && activeStep.action.status === 'danger';

          return (
            <div
              key={node.id}
              onMouseDown={() => handleMouseDown(node.id)}
              className="absolute cursor-grab active:cursor-grabbing z-10 group transition-transform duration-150 ease-out"
              style={{
                left: `${node.x}%`,
                top: `${node.y}%`,
                transform: `translate(-50%, -50%) scale(${totalScale})`,
              }}
            >
              {/* Message Arrival Ripple Ring */}
              {isArrivingNode && (
                <div
                  className={`absolute -inset-4 rounded-3xl animate-ping pointer-events-none ${
                    isArrivingDanger ? 'bg-rose-500/40' : 'bg-sky-500/40'
                  }`}
                  style={{ animationDuration: '0.6s' }}
                />
              )}

              {/* Pulsing ring when transforming */}
              {isTargetOfTransform && (
                <div
                  className="absolute -inset-3 rounded-2xl bg-purple-500/30 animate-ping pointer-events-none"
                  style={{ animationDuration: '1.2s' }}
                />
              )}

              {/* Node Card / Borderless Avatar */}
              {isFramed ? (
                <div
                  className={`relative flex flex-col items-center justify-center min-w-[96px] px-3.5 py-2.5 rounded-xl bg-gradient-to-b ${theme.bg} border ${theme.border} shadow-lg transition-transform duration-200 group-hover:scale-105 group-hover:border-slate-300/60`}
                >
                  <div className={`rounded-lg overflow-hidden mb-1 flex items-center justify-center ${node.image ? 'w-10 h-10' : `p-1.5 bg-slate-800/80 ${theme.text}`}`}>
                    {node.image ? (
                      <img
                        src={node.image}
                        alt={node.label}
                        className="w-full h-full object-contain pointer-events-none"
                        style={{
                          transform: node.flipX ? 'scaleX(-1)' : undefined,
                        }}
                      />
                    ) : (
                      <DynamicIcon name={node.icon} size={20} />
                    )}
                  </div>
                  <span className="text-xs font-semibold text-slate-100 leading-tight">
                    {node.label}
                  </span>
                  {node.sublabel && (
                    <span className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                      {node.sublabel}
                    </span>
                  )}
                </div>
              ) : (
                /* Borderless Standalone Avatar (e.g. Character standing) */
                <div className="relative flex flex-col items-center justify-center group-hover:scale-105 transition-transform duration-200">
                  <div className="relative mb-1 flex items-center justify-center filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                    {node.image ? (
                      <img
                        src={node.image}
                        alt={node.label}
                        className="w-16 h-20 object-contain pointer-events-none"
                        style={{
                          transform: node.flipX ? 'scaleX(-1)' : undefined,
                        }}
                      />
                    ) : (
                      <div className={`p-3 rounded-2xl bg-slate-800/90 border border-slate-700/60 ${theme.text}`}>
                        <DynamicIcon name={node.icon} size={28} />
                      </div>
                    )}
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-slate-900/85 backdrop-blur border border-slate-700/60 text-[10px] font-semibold text-slate-200 shadow-md whitespace-nowrap">
                    {node.label}
                  </span>
                </div>
              )}

              {/* Transform Action Badge Popup */}
              {isTargetOfTransform && activeStep.action.type === 'transform' && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap z-30">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-900/90 border border-purple-500/60 text-purple-200 text-[10px] font-bold shadow-lg animate-bounce">
                    <Sparkles size={12} className="text-purple-300" />
                    <span>{activeStep.action.label}</span>
                    {activeStep.action.badge && (
                      <span className="px-1 py-0.5 rounded bg-purple-700/60 text-[9px]">
                        {activeStep.action.badge}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* State Action Badge Popup */}
              {isTargetOfState && activeStep.action.type === 'state' && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap z-30">
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-lg ${
                      activeStep.action.status === 'danger'
                        ? 'bg-rose-900/90 border border-rose-500/60 text-rose-200'
                        : 'bg-emerald-900/90 border border-emerald-500/60 text-emerald-200'
                    }`}
                  >
                    <AlertTriangle size={12} />
                    <span>{activeStep.action.label}</span>
                  </div>
                </div>
              )}

              {/* Result Action Badge Popup */}
              {isTargetOfResult && activeStep.action.type === 'result' && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap z-30">
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-xl border ${
                      activeStep.action.status === 'success'
                        ? 'bg-emerald-900/95 border-emerald-500 text-emerald-100 shadow-emerald-950/50'
                        : 'bg-rose-900/95 border-rose-500 text-rose-100 shadow-rose-950/50'
                    }`}
                  >
                    <ShieldCheck size={14} />
                    <span>{activeStep.action.label}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Video Explanation Caption Banner at Bottom */}
        <div className="absolute bottom-3 inset-x-3 sm:inset-x-4 z-20">
          <div className="flex items-start sm:items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 rounded-xl bg-slate-900/90 backdrop-blur-md border border-sky-500/30 shadow-xl">
            <span className="flex-shrink-0 mt-0.5 sm:mt-0 px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 text-[10px] font-bold tracking-wide border border-sky-500/40">
              STEP {activeStepIndex + 1}/{scenario.steps.length}
            </span>
            <p className="text-[11px] sm:text-xs md:text-sm font-medium text-slate-100 leading-snug break-words flex-1">
              {activeStep?.caption || 'アニメーション待機中'}
            </p>
          </div>
        </div>
      </div>

      {/* Playback Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between w-full max-w-4xl px-4 py-3 bg-slate-800/80 backdrop-blur border border-slate-700/60 rounded-xl shadow-lg gap-3">
        {/* Play/Pause & Step Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => jumpToStep(Math.max(0, activeStepIndex - 1))}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-700/50 transition-colors"
            title="前ステップへ"
          >
            <SkipBack size={18} />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl shadow-md transition-all active:scale-95"
            title={isPlaying ? '一時停止' : '再生'}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} className="translate-x-0.5" />}
          </button>
          <button
            onClick={() => jumpToStep(Math.min(scenario.steps.length - 1, activeStepIndex + 1))}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-700/50 transition-colors"
            title="次ステップへ"
          >
            <SkipForward size={18} />
          </button>
          <button
            onClick={() => {
              setCurrentTime(0);
              setIsPlaying(true);
            }}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-700/50 transition-colors"
            title="最初から再生"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        {/* Timeline Slider */}
        <div className="flex-1 min-w-[200px] flex items-center gap-3">
          <span className="text-xs font-mono text-slate-400 min-w-[40px]">
            {(currentTime / 1000).toFixed(1)}s
          </span>
          <input
            type="range"
            min="0"
            max={totalDuration}
            step="50"
            value={currentTime}
            onChange={(e) => {
              setCurrentTime(Number(e.target.value));
            }}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-400"
          />
          <span className="text-xs font-mono text-slate-500 min-w-[40px]">
            {(totalDuration / 1000).toFixed(1)}s
          </span>
        </div>

        {/* Speed & Loop toggles */}
        <div className="flex items-center gap-2">
          {/* Loop toggle */}
          <button
            onClick={() => setIsLooping(!isLooping)}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
              isLooping
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="ループ再生"
          >
            <Repeat size={14} />
          </button>

          {/* Speed selector */}
          <div className="flex items-center bg-slate-900/60 rounded-lg border border-slate-700/60 p-0.5 text-xs font-medium text-slate-300">
            {[0.5, 1, 1.5, 2].map((s) => (
              <button
                key={s}
                onClick={() => setPlaybackSpeed(s)}
                className={`px-2 py-0.5 rounded ${
                  playbackSpeed === s ? 'bg-sky-500 text-slate-950 font-bold' : 'hover:text-white'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
