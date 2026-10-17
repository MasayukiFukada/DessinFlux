import { NodeColor } from '../types/scenario';

export const nodeColorStyles: Record<NodeColor, {
  bg: string;
  border: string;
  glow: string;
  text: string;
  badge: string;
}> = {
  blue: {
    bg: 'from-blue-900/60 to-slate-900/80',
    border: 'border-blue-500/50 shadow-blue-500/20',
    glow: 'rgba(59, 130, 246, 0.5)',
    text: 'text-blue-400',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  },
  emerald: {
    bg: 'from-emerald-900/60 to-slate-900/80',
    border: 'border-emerald-500/50 shadow-emerald-500/20',
    glow: 'rgba(16, 185, 129, 0.5)',
    text: 'text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  amber: {
    bg: 'from-amber-900/60 to-slate-900/80',
    border: 'border-amber-500/50 shadow-amber-500/20',
    glow: 'rgba(245, 158, 11, 0.5)',
    text: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  purple: {
    bg: 'from-purple-900/60 to-slate-900/80',
    border: 'border-purple-500/50 shadow-purple-500/20',
    glow: 'rgba(168, 85, 247, 0.5)',
    text: 'text-purple-400',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  },
  rose: {
    bg: 'from-rose-900/60 to-slate-900/80',
    border: 'border-rose-500/50 shadow-rose-500/20',
    glow: 'rgba(244, 63, 94, 0.5)',
    text: 'text-rose-400',
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  },
  cyan: {
    bg: 'from-cyan-900/60 to-slate-900/80',
    border: 'border-cyan-500/50 shadow-cyan-500/20',
    glow: 'rgba(6, 182, 212, 0.5)',
    text: 'text-cyan-400',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  },
  slate: {
    bg: 'from-slate-800/80 to-slate-900/90',
    border: 'border-slate-600/50 shadow-slate-600/20',
    glow: 'rgba(100, 116, 139, 0.5)',
    text: 'text-slate-300',
    badge: 'bg-slate-700/40 text-slate-300 border-slate-600/40',
  },
};
