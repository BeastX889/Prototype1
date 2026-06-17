/** Shared formatting/parsing helpers for time/count inputs in the settings UI. */

/** Seconds -> "M:SS". */
export const mmss = (sec: number) => `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;

/** Parse "M:SS" / "MM:SS", or a plain number treated as seconds. null if unparseable. */
export const parseMmss = (text: string): number | null => {
  const t = text.trim();
  if (!t) return null;
  if (t.includes(':')) {
    const [m, s = '0'] = t.split(':');
    const mins = parseInt(m || '0', 10);
    const secs = parseInt(s || '0', 10);
    if (Number.isNaN(mins) || Number.isNaN(secs)) return null;
    return mins * 60 + secs;
  }
  const n = parseInt(t, 10);
  return Number.isNaN(n) ? null : n;
};

/** Parse a plain integer, ignoring non-digit characters (e.g. a trailing "s"). */
export const parseCount = (text: string): number | null => {
  const digits = text.replace(/[^0-9]/g, '');
  if (!digits) return null;
  const n = parseInt(digits, 10);
  return Number.isNaN(n) ? null : n;
};
