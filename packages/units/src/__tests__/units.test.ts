import { describe, it, expect } from 'vitest';
import {
  ftToMm,
  mmToFt,
  inToMm,
  mToMm,
  parseLengthToMm,
  formatLength,
  sqmToSqft,
  sqftToSqm,
  formatArea
} from '../index';

describe('Units Package', () => {
  it('converts exact feet to millimeters', () => {
    // 30 ft = 9144 mm
    expect(ftToMm(30)).toBe(9144);
    // 40 ft = 12192 mm
    expect(ftToMm(40)).toBe(12192);
    // 1 ft = 304.8 -> rounded to 305 or exact float conversion
    expect(mmToFt(9144)).toBe(30);
  });

  it('converts inches to millimeters', () => {
    expect(inToMm(1)).toBe(25);
    expect(inToMm(6)).toBe(152);
    expect(inToMm(12)).toBe(305);
  });

  it('converts meters to millimeters', () => {
    expect(mToMm(10)).toBe(10000);
    expect(mToMm(3.81)).toBe(3810);
  });

  it('parses composite feet and inches', () => {
    // 12 ft 6 in = 12 * 304.8 + 6 * 25.4 = 3657.6 + 152.4 = 3810 mm
    expect(parseLengthToMm("12' 6\"")).toBe(3810);
    expect(parseLengthToMm("12'-6\"")).toBe(3810);
    expect(parseLengthToMm("12 ft 6 in")).toBe(3810);
    expect(parseLengthToMm("30 ft")).toBe(9144);
    expect(parseLengthToMm("40'")).toBe(12192);
  });

  it('parses metric inputs', () => {
    expect(parseLengthToMm("9.144m")).toBe(9144);
    expect(parseLengthToMm("3810mm")).toBe(3810);
    expect(parseLengthToMm("300cm")).toBe(3000);
  });

  it('formats lengths correctly', () => {
    expect(formatLength(9144, 'imperial')).toBe("30'-0\"");
    expect(formatLength(3810, 'imperial')).toBe("12'-6\"");
    expect(formatLength(3810, 'both')).toContain("12'-6\"");
    expect(formatLength(3810, 'both')).toContain("3.81 m");
  });

  it('calculates areas correctly', () => {
    // 1200 sqft (30x40 ft)
    const sqft = 1200;
    const sqm = sqftToSqm(sqft);
    expect(sqm).toBeCloseTo(111.48, 1);
    expect(sqmToSqft(sqm)).toBeCloseTo(1200, 1);
    expect(formatArea(sqm, 'both')).toContain('1,200 sq.ft');
  });
});
