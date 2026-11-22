export function computeCounterProgress(elapsedMs: number, durationMs: number): number {
  if (durationMs <= 0) return 1;
  return Math.max(0, Math.min(elapsedMs / durationMs, 1));
}

export function easeOutCubic(progress: number): number {
  const clamped = Math.max(0, Math.min(progress, 1));
  return 1 - Math.pow(1 - clamped, 3);
}

export function formatCounterValue(
  value: number,
  decimals = 0,
  prefix = '',
  suffix = ''
): string {
  const safeValue = Math.max(0, value);
  const formatted =
    decimals > 0
      ? safeValue.toFixed(decimals)
      : Math.round(safeValue).toLocaleString('en-IN');
  return `${prefix}${formatted}${suffix}`;
}
