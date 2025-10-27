/**
 * Represents a LEGO color with ID, name, and RGB values.
 * Provides helper methods for color format conversions.
 */
export class LegoColor {
  id: number;
  name: string;
  rgb: [number, number, number];
  
  constructor(id: number, name: string, rgb: [number, number, number]) {
    this.id = id;
    this.name = name;
    this.rgb = rgb;
  }
  
  /**
   * Gets the RGB color values
   * @returns RGB tuple [r, g, b] where each value is 0-255
   */
  getRgb(): [number, number, number] {
    return this.rgb;
  }
  
  /**
   * Gets the hexadecimal color representation
   * @returns Hex string in format "#RRGGBB"
   */
  getHex(): string {
    const [r, g, b] = this.rgb;
    return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase();
  }
  
  /**
   * Gets the CSS rgb() function string
   * @returns CSS rgb string in format "rgb(r, g, b)"
   */
  getRgbString(): string {
    const [r, g, b] = this.rgb;
    return `rgb(${r}, ${g}, ${b})`;
  }
  
  /**
   * Gets the HSV representation of this color
   * @returns HSV tuple [Hue: 0-360, Saturation: 0-100, Value: 0-100]
   */
  getHsv(): [number, number, number] {
    return rgbToHsv(this.rgb);
  }
  
  /**
   * Gets the hex color value (alias for getHex for backward compatibility)
   */
  get hex(): string {
    return this.getHex();
  }
  
  /**
   * Gets the HSV value (computed property for backward compatibility)
   */
  get hsv(): [number, number, number] {
    return this.getHsv();
  }
}

// Official LEGO colors commonly available in 1x1 plates
// Sorted intelligently: grayscale colors first (by brightness), then chromatic colors (by hue)
export const LEGO_COLORS: LegoColor[] = [
  // Grayscale colors (saturation ≤ 10%), sorted by brightness
  new LegoColor(1, "Black", [25, 25, 25]),
  new LegoColor(11, "Dark Bluish Gray", [111,110,115]),
  new LegoColor(24, "Light Bluish Gray", [187,186,191]),
  new LegoColor(39, "White", [255, 255, 255]),
  
  // Chromatic colors, sorted by hue (red → orange → yellow → green → cyan → blue → purple → pink)
  new LegoColor(34, "Red", [179,14,13]),
  new LegoColor(18, "Dark Red", [131,33,31]),
  new LegoColor(35, "Reddish Brown", [103,49,26]),
  // new LegoColor(12, "Dark Brown", [92, 64, 51]),
  new LegoColor(19, "Dark Tan", [171,145,107]),
  // new LegoColor(31, "Medium Nougat", [166, 125, 61]),
  new LegoColor(38, "Tan", [228,213,159]),
  new LegoColor(5, "Bright Light Orange", [255, 184, 22]),
  new LegoColor(33, "Orange", [254, 135, 42]),
  new LegoColor(40, "Yellow", [247, 201, 4]),
  new LegoColor(26, "Lime", [176,225,57]),
  new LegoColor(21, "Green", [33,143,71]),
  new LegoColor(37, "Dark Green", [47,88,56]),
  // new LegoColor(23, "Light Aqua", [0, 170, 164]),
  // new LegoColor(36, "Sand Blue", [95, 159, 159]),
  // new LegoColor(20, "Dark Turquoise", [0, 206, 209]),
  new LegoColor(9, "Dark Azure", [44,173,229]),
  // new LegoColor(4, "Bright Light Blue", [151, 203, 217]),
  new LegoColor(28, "Medium Azure", [134,225,249]),
  new LegoColor(2, "Blue", [34,107,180]),
  new LegoColor(29, "Medium Blue", [0, 0, 205]),
  new LegoColor(10, "Dark Blue", [0, 0, 139]),
  new LegoColor(30, "Medium Lavender", [190,144,208]),
  new LegoColor(17, "Dark Purple", [110,80,180]),
  new LegoColor(7, "Bright Pink", [211, 53, 157]),
  new LegoColor(16, "Dark Pink", [211, 53, 157]),
];

/**
 * Calculates the Euclidean distance between two RGB colors
 * @deprecated Use colorDistanceHSV for better perceptual matching
 */
export function colorDistance(
  rgb1: [number, number, number],
  rgb2: [number, number, number]
): number {
  const [r1, g1, b1] = rgb1;
  const [r2, g2, b2] = rgb2;
  
  // Euclidean distance in RGB space
  return Math.sqrt(
    Math.pow(r2 - r1, 2) +
    Math.pow(g2 - g1, 2) +
    Math.pow(b2 - b1, 2)
  );
}

/**
 * Calculates perceptually-weighted color distance in HSV space
 * Prioritizes hue matching, with special handling for grayscale colors
 * 
 * @param hsv1 - First color in HSV [Hue: 0-360, Saturation: 0-100, Value: 0-100]
 * @param hsv2 - Second color in HSV [Hue: 0-360, Saturation: 0-100, Value: 0-100]
 * @param hueWeight - Weight for hue difference (default: 3.0)
 * @param saturationWeight - Weight for saturation difference (default: 1.0)
 * @param valueWeight - Weight for value difference (default: 1.0)
 * @returns Weighted distance (lower is more similar)
 */
export function colorDistanceHSV(
  hsv1: [number, number, number],
  hsv2: [number, number, number],
  hueWeight: number = 3.0,
  saturationWeight: number = 1.0,
  valueWeight: number = 1.0
): number {
  const [h1, s1, v1] = hsv1;
  const [h2, s2, v2] = hsv2;
  
  const GRAYSCALE_THRESHOLD = 10;
  const isGrayscale1 = s1 <= GRAYSCALE_THRESHOLD;
  const isGrayscale2 = s2 <= GRAYSCALE_THRESHOLD;
  
  // If both colors are grayscale, ignore hue and focus on value (brightness)
  if (isGrayscale1 && isGrayscale2) {
    return Math.sqrt(
      Math.pow((s2 - s1) * saturationWeight, 2) +
      Math.pow((v2 - v1) * valueWeight * 2, 2) // Extra weight on brightness for grayscale
    );
  }
  
  // If only one is grayscale, penalize the match heavily unless values are very different
  if (isGrayscale1 !== isGrayscale2) {
    // Large penalty for grayscale vs chromatic mismatch
    const grayscalePenalty = 100;
    return grayscalePenalty + Math.sqrt(
      Math.pow((s2 - s1) * saturationWeight, 2) +
      Math.pow((v2 - v1) * valueWeight, 2)
    );
  }
  
  // Both colors are chromatic - use weighted HSV distance
  // Hue is circular (0° and 360° are the same), so we need to handle wraparound
  let hueDiff = Math.abs(h2 - h1);
  if (hueDiff > 180) {
    hueDiff = 360 - hueDiff;
  }
  
  // Normalize hue difference to 0-100 range for consistent weighting
  const normalizedHueDiff = (hueDiff / 180) * 100;
  
  return Math.sqrt(
    Math.pow(normalizedHueDiff * hueWeight, 2) +
    Math.pow((s2 - s1) * saturationWeight, 2) +
    Math.pow((v2 - v1) * valueWeight, 2)
  );
}

/**
 * Finds the closest LEGO color to a given RGB value using perceptual HSV matching
 * Prioritizes hue matching for better color accuracy
 */
export function findClosestLegoColor(rgb: [number, number, number]): LegoColor {
  const inputHsv = rgbToHsv(rgb);
  
  let closestColor = LEGO_COLORS[0];
  let minDistance = colorDistanceHSV(inputHsv, closestColor.hsv);

  for (const color of LEGO_COLORS) {
    const distance = colorDistanceHSV(inputHsv, color.hsv);
    if (distance < minDistance) {
      minDistance = distance;
      closestColor = color;
    }
  }

  return closestColor;
}

/**
 * Converts RGB to HSV color space
 * @param rgb - RGB values [0-255, 0-255, 0-255]
 * @returns HSV values [Hue: 0-360, Saturation: 0-100, Value: 0-100]
 */
export function rgbToHsv(rgb: [number, number, number]): [number, number, number] {
  const [r, g, b] = rgb.map(v => v / 255);
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  
  let h = 0;
  let s = 0;
  const v = max;
  
  if (delta !== 0) {
    s = delta / max;
    
    if (max === r) {
      h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
    } else if (max === g) {
      h = ((b - r) / delta + 2) / 6;
    } else {
      h = ((r - g) / delta + 4) / 6;
    }
  }
  
  return [
    Math.round(h * 360),
    Math.round(s * 100),
    Math.round(v * 100)
  ];
}

/**
 * Converts hex color to RGB tuple
 */
export function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : null;
}

/**
 * Converts RGB tuple to hex string
 */
export function rgbToHex(rgb: [number, number, number]): string {
  const [r, g, b] = rgb;
  return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase();
}

/**
 * Sorts colors in a human-intuitive way:
 * 1. Grayscale colors (low saturation) sorted by brightness (dark to light)
 * 2. Chromatic colors sorted by hue (red → orange → yellow → green → cyan → blue → purple → pink)
 * 
 * This prevents grayscale colors from being randomly scattered due to meaningless hue values.
 * 
 * @param colors - Array of colors to sort
 * @param grayscaleThreshold - Saturation threshold (0-100) below which colors are considered grayscale. Default: 10
 * @returns A new sorted array
 */
export function sortColorsByHue(colors: LegoColor[], grayscaleThreshold: number = 10): LegoColor[] {
  const grayscale = colors.filter(c => c.hsv[1] <= grayscaleThreshold);
  const chromatic = colors.filter(c => c.hsv[1] > grayscaleThreshold);
  
  // Sort grayscale by value (brightness) - dark to light
  grayscale.sort((a, b) => a.hsv[2] - b.hsv[2]);
  
  // Sort chromatic by hue, then by saturation (more saturated first), then by value
  chromatic.sort((a, b) => {
    if (a.hsv[0] !== b.hsv[0]) return a.hsv[0] - b.hsv[0]; // Sort by hue
    if (a.hsv[1] !== b.hsv[1]) return b.hsv[1] - a.hsv[1]; // Higher saturation first
    return b.hsv[2] - a.hsv[2]; // Higher value (brighter) first
  });
  
  return [...grayscale, ...chromatic];
}

