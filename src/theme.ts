import type { Phase } from '@/timer/engine';

/** Full-screen background color per phase — bold, high-energy "fight" palette. */
export const PHASE_COLORS: Record<Phase | 'warning', string> = {
  prep: '#16202b', // dark neutral slate
  work: '#0b9b3d', // vivid green = fight
  rest: '#0e63b0', // strong blue = rest
  warning: '#c81e1e', // alarming red = final seconds
  done: '#2a0b0b', // deep red = finished
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
  textDim: 'rgba(255,255,255,0.72)',
  surface: '#0c1116',
  surfaceAlt: '#19232e',
  border: 'rgba(255,255,255,0.12)',
  accent: '#2f9bff',
  danger: '#d64545',
  /** Track behind the countdown progress ring. */
  ringTrack: 'rgba(255,255,255,0.18)',
  /** Bright overlay used for the warning pulse. */
  flash: '#ffffff',
};
