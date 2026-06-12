import type { Phase } from '@/timer/engine';

/** Full-screen background color per phase — the at-a-glance state cue. */
export const PHASE_COLORS: Record<Phase | 'warning', string> = {
  prep: '#1f2933', // neutral slate
  work: '#0a7d34', // green = fight
  rest: '#11497e', // blue = rest
  warning: '#b8860b', // amber = final seconds of a round
  done: '#3a0d0d', // deep red = finished
};

export const PHASE_LABEL: Record<Phase, string> = {
  prep: 'GET READY',
  work: 'FIGHT',
  rest: 'REST',
  done: 'DONE',
};

export function phaseColor(phase: Phase, isWarning: boolean): string {
  if (isWarning) return PHASE_COLORS.warning;
  return PHASE_COLORS[phase];
}

export const colors = {
  text: '#ffffff',
  textDim: 'rgba(255,255,255,0.7)',
  surface: '#10161d',
  surfaceAlt: '#1b2530',
  border: 'rgba(255,255,255,0.12)',
  accent: '#208AEF',
  danger: '#d64545',
};
