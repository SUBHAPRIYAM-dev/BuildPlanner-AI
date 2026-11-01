/**
 * BuildPlanner AI - Precision Unit Conversion Engine
 * 
 * Internal canonical standard is MILLIMETERS (mm) for length
 * and SQUARE METERS (sqm) or SQUARE MILLIMETERS (mm2) for area.
 */

export const MM_PER_INCH = 25.4;
export const MM_PER_FOOT = 304.8;
export const MM_PER_METER = 1000.0;
export const MM_PER_CM = 10.0;
export const SQM_PER_SQFT = 0.09290304;
export const SQFT_PER_SQM = 1 / SQM_PER_SQFT; // ~10.763910416709722

export type UnitType = 'mm' | 'cm' | 'm' | 'ft' | 'in';
export type AreaUnitType = 'sqm' | 'sqft';

/** Convert feet to millimeters */
export function ftToMm(ft: number): number {
  return Math.round(ft * MM_PER_FOOT);
}

/** Convert millimeters to feet */
export function mmToFt(mm: number): number {
  return mm / MM_PER_FOOT;
}

/** Convert inches to millimeters */
export function inToMm(inches: number): number {
  return Math.round(inches * MM_PER_INCH);
}

/** Convert millimeters to inches */
export function mmToIn(mm: number): number {
  return mm / MM_PER_INCH;
}

/** Convert meters to millimeters */
export function mToMm(m: number): number {
  return Math.round(m * MM_PER_METER);
}

/** Convert millimeters to meters */
export function mmToM(mm: number): number {
  return mm / MM_PER_METER;
}

/** Convert centimeters to millimeters */
export function cmToMm(cm: number): number {
  return Math.round(cm * MM_PER_CM);
}

/** Convert millimeters to centimeters */
export function mmToCm(mm: number): number {
  return mm / MM_PER_CM;
}

/** Convert square meters to square feet */
export function sqmToSqft(sqm: number): number {
  return sqm * SQFT_PER_SQM;
}

/** Convert square feet to square meters */
export function sqftToSqm(sqft: number): number {
  return sqft * SQM_PER_SQFT;
}

/** Convert square millimeters to square meters */
export function mm2ToSqm(mm2: number): number {
  return mm2 / 1_000_000.0;
}

/** Convert square millimeters to square feet */
export function mm2ToSqft(mm2: number): number {
  return sqmToSqft(mm2ToSqm(mm2));
}

/** Convert square meters to square millimeters */
export function sqmToMm2(sqm: number): number {
  return sqm * 1_000_000.0;
}

/** Convert square feet to square millimeters */
export function sqftToMm2(sqft: number): number {
  return sqmToMm2(sqftToSqm(sqft));
}

/**
 * Parses user input strings into exact millimeters.
 * Supports:
 * - "30 ft", "30ft", "30'"
 * - "12' 6\"", "12'-6\"", "12 ft 6 in", "12ft 6in"
 * - "10 m", "10m"
 * - "3000 mm", "3000mm"
 * - "300 cm", "300cm"
 * - Raw numeric with fallback unit (defaults to 'ft' if unspecified)
 */
export function parseLengthToMm(input: string | number, defaultUnit: UnitType = 'ft'): number {
  if (typeof input === 'number') {
    if (isNaN(input)) return 0;
    switch (defaultUnit) {
      case 'mm': return Math.round(input);
      case 'cm': return cmToMm(input);
      case 'm': return mToMm(input);
      case 'in': return inToMm(input);
      case 'ft':
      default: return ftToMm(input);
    }
  }

  const str = input.trim().toLowerCase();
  if (!str) return 0;

  // Composite feet and inches (e.g. 12' 6", 12'-6", 12 ft 6 in, 12ft 6in, 12'6")
  const compositeFtInRegex = /^(\d+(?:\.\d+)?)\s*(?:'|ft|feet)?\s*(?:-)?\s*(\d+(?:\.\d+)?)\s*(?:"|''|in|inches)?$/i;
  // Ensure it has at least feet or inch indicator or a hyphen separator
  if (/[0-9]+.*(?:'|ft|feet|-).*?[0-9]+/i.test(str)) {
    const compositeMatch = str.match(compositeFtInRegex);
    if (compositeMatch) {
      const feet = parseFloat(compositeMatch[1]);
      const inches = parseFloat(compositeMatch[2]);
      return Math.round(feet * MM_PER_FOOT + inches * MM_PER_INCH);
    }
  }

  // Pure feet (e.g. 30ft, 30 ft, 30')
  const ftRegex = /^(\d+(?:\.\d+)?)\s*(?:'|ft|feet)$/i;
  const ftMatch = str.match(ftRegex);
  if (ftMatch) {
    return ftToMm(parseFloat(ftMatch[1]));
  }

  // Pure inches (e.g. 36in, 36 in, 36")
  const inRegex = /^(\d+(?:\.\d+)?)\s*(?:"|''|in|inches)$/i;
  const inMatch = str.match(inRegex);
  if (inMatch) {
    return inToMm(parseFloat(inMatch[1]));
  }

  // Meters (e.g. 9.144m, 9.144 m, 9.144 meters)
  const mRegex = /^(\d+(?:\.\d+)?)\s*(?:m|meters)$/i;
  const mMatch = str.match(mRegex);
  if (mMatch) {
    return mToMm(parseFloat(mMatch[1]));
  }

  // Centimeters (e.g. 300cm, 300 cm)
  const cmRegex = /^(\d+(?:\.\d+)?)\s*(?:cm|centimeters)$/i;
  const cmMatch = str.match(cmRegex);
  if (cmMatch) {
    return cmToMm(parseFloat(cmMatch[1]));
  }

  // Millimeters (e.g. 3810mm, 3810 mm)
  const mmRegex = /^(\d+(?:\.\d+)?)\s*(?:mm|millimeters)$/i;
  const mmMatch = str.match(mmRegex);
  if (mmMatch) {
    return Math.round(parseFloat(mmMatch[1]));
  }

  // Fallback to numeric value with defaultUnit
  const val = parseFloat(str);
  if (!isNaN(val)) {
    return parseLengthToMm(val, defaultUnit);
  }

  return 0;
}

/**
 * Format millimeters into human-readable strings.
 */
export function formatLength(mm: number, mode: 'imperial' | 'metric' | 'both' = 'imperial'): string {
  const totalInches = mm / MM_PER_INCH;
  const feet = Math.floor(totalInches / 12);
  const remainingInches = Math.round(totalInches % 12);
  const meters = (mm / MM_PER_METER).toFixed(2);

  const imperialStr = remainingInches === 12 
    ? `${feet + 1}'-0"` 
    : `${feet}'-${remainingInches}"`;
  const metricStr = `${meters} m`;

  switch (mode) {
    case 'imperial': return imperialStr;
    case 'metric': return metricStr;
    case 'both': return `${imperialStr} (${metricStr})`;
  }
}

/**
 * Format square meters into area representation
 */
export function formatArea(sqm: number, mode: 'sqft' | 'sqm' | 'both' = 'both'): string {
  const sqft = Math.round(sqmToSqft(sqm));
  const roundedSqm = Number(sqm.toFixed(1));

  switch (mode) {
    case 'sqft': return `${sqft.toLocaleString()} sq.ft`;
    case 'sqm': return `${roundedSqm.toLocaleString()} sq.m`;
    case 'both': return `${sqft.toLocaleString()} sq.ft (${roundedSqm.toLocaleString()} sq.m)`;
  }
}
