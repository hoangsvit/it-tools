import { describe, expect, it } from 'vitest';
import {
  convertCssUnitToPx,
  convertPxToCssUnit,
  formatCssUnitValue,
  getCssUnitFormula,
} from './css-unit-converter.service';

describe('CSS unit converter service', () => {
  it('converts PX to REM and REM to PX', () => {
    expect(convertPxToCssUnit(16, 'rem', 16)).toBe(1);
    expect(convertPxToCssUnit(24, 'rem', 16)).toBe(1.5);
    expect(convertCssUnitToPx(1.5, 'rem', 16)).toBe(24);
  });

  it('converts PX to EM and EM to PX using the parent font size', () => {
    expect(convertPxToCssUnit(20, 'em', 16)).toBe(1.25);
    expect(convertCssUnitToPx(2, 'em', 18)).toBe(36);
  });

  it('converts PX to percentage and percentage to PX using the reference size', () => {
    expect(convertPxToCssUnit(250, '%', 1000)).toBe(25);
    expect(convertCssUnitToPx(25, '%', 1000)).toBe(250);
  });

  it('supports negative CSS values', () => {
    expect(convertPxToCssUnit(-8, 'rem', 16)).toBe(-0.5);
    expect(convertCssUnitToPx(-0.5, 'rem', 16)).toBe(-8);
  });

  it('rejects invalid or non-positive reference sizes', () => {
    expect(convertPxToCssUnit(16, 'rem', 0)).toBeNull();
    expect(convertCssUnitToPx(1, 'em', -16)).toBeNull();
    expect(convertPxToCssUnit(Number.NaN, 'rem', 16)).toBeNull();
  });

  it('rounds floating point results for copy-friendly CSS values', () => {
    expect(convertPxToCssUnit(10, 'rem', 16)).toBe(0.625);
    expect(convertPxToCssUnit(1, 'rem', 3)).toBe(0.333333);
    expect(formatCssUnitValue(0.333333)).toBe('0.333333');
  });

  it('builds readable formulas for each supported conversion family', () => {
    expect(getCssUnitFormula({
      value: 24,
      unit: 'rem',
      referencePx: 16,
      direction: 'px-to-relative',
      result: 1.5,
    })).toBe('24px ÷ 16px = 1.5rem');

    expect(getCssUnitFormula({
      value: 25,
      unit: '%',
      referencePx: 1000,
      direction: 'relative-to-px',
      result: 250,
    })).toBe('25% ÷ 100 × 1000px = 250px');
  });
});
