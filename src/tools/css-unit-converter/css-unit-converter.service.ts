export type CssRelativeUnit = 'rem' | 'em' | '%';

export const CSS_UNIT_DEFAULT_REFERENCES: Record<CssRelativeUnit, number> = {
  'rem': 16,
  'em': 16,
  '%': 100,
};

export function roundCssUnitValue(value: number, precision = 6) {
  if (!Number.isFinite(value)) {
    return null;
  }

  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function convertPxToCssUnit(px: number, unit: CssRelativeUnit, referencePx: number) {
  if (!Number.isFinite(px) || !Number.isFinite(referencePx) || referencePx <= 0) {
    return null;
  }

  const converted = unit === '%'
    ? (px / referencePx) * 100
    : px / referencePx;

  return roundCssUnitValue(converted);
}

export function convertCssUnitToPx(value: number, unit: CssRelativeUnit, referencePx: number) {
  if (!Number.isFinite(value) || !Number.isFinite(referencePx) || referencePx <= 0) {
    return null;
  }

  const converted = unit === '%'
    ? (value / 100) * referencePx
    : value * referencePx;

  return roundCssUnitValue(converted);
}

export function formatCssUnitValue(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return '—';
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 6,
    useGrouping: false,
  }).format(value);
}

export function getCssUnitFormula(options: {
  value: number
  unit: CssRelativeUnit
  referencePx: number
  direction: 'px-to-relative' | 'relative-to-px'
  result: number
}) {
  const { value, unit, referencePx, direction, result } = options;
  const source = formatCssUnitValue(value);
  const reference = formatCssUnitValue(referencePx);
  const output = formatCssUnitValue(result);

  if (direction === 'px-to-relative') {
    if (unit === '%') {
      return `${source}px ÷ ${reference}px × 100 = ${output}%`;
    }

    return `${source}px ÷ ${reference}px = ${output}${unit}`;
  }

  if (unit === '%') {
    return `${source}% ÷ 100 × ${reference}px = ${output}px`;
  }

  return `${source}${unit} × ${reference}px = ${output}px`;
}
