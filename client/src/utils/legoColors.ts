export interface LegoColor {
  id: number;
  name: string;
  rgb: [number, number, number];
  hex: string;
}

// Official LEGO colors commonly available in 1x1 plates
export const LEGO_COLORS: LegoColor[] = [
  { id: 1, name: "Black", rgb: [27, 42, 52], hex: "#1B2A34" },
  { id: 2, name: "Blue", rgb: [30, 90, 168], hex: "#1E5AA8" },
  { id: 3, name: "Bright Green", rgb: [88, 171, 65], hex: "#58AB41" },
  { id: 4, name: "Bright Light Blue", rgb: [151, 203, 217], hex: "#97CBD9" },
  { id: 5, name: "Bright Light Orange", rgb: [255, 127, 0], hex: "#FF7F00" },
  { id: 6, name: "Bright Light Yellow", rgb: [255, 255, 0], hex: "#FFFF00" },
  { id: 7, name: "Bright Pink", rgb: [211, 53, 157], hex: "#D3359D" },
  { id: 8, name: "Brown", rgb: [84, 51, 36], hex: "#543324" },
  { id: 9, name: "Dark Azure", rgb: [6, 157, 159], hex: "#069D9F" },
  { id: 10, name: "Dark Blue", rgb: [0, 0, 139], hex: "#00008B" },
  { id: 11, name: "Dark Bluish Gray", rgb: [84, 89, 85], hex: "#545955" },
  { id: 12, name: "Dark Brown", rgb: [92, 64, 51], hex: "#5C4033" },
  { id: 13, name: "Dark Gray", rgb: [84, 89, 85], hex: "#545955" },
  { id: 14, name: "Dark Green", rgb: [47, 79, 47], hex: "#2F4F2F" },
  { id: 15, name: "Dark Orange", rgb: [255, 140, 0], hex: "#FF8C00" },
  { id: 16, name: "Dark Pink", rgb: [211, 53, 157], hex: "#D3359D" },
  { id: 17, name: "Dark Purple", rgb: [135, 31, 120], hex: "#871F78" },
  { id: 18, name: "Dark Red", rgb: [139, 0, 0], hex: "#8B0000" },
  { id: 19, name: "Dark Tan", rgb: [151, 105, 79], hex: "#97694F" },
  { id: 20, name: "Dark Turquoise", rgb: [0, 206, 209], hex: "#00CED1" },
  { id: 21, name: "Green", rgb: [0, 133, 43], hex: "#00852B" },
  { id: 22, name: "Lavender", rgb: [230, 230, 250], hex: "#E6E6FA" },
  { id: 23, name: "Light Aqua", rgb: [0, 170, 164], hex: "#00AAA4" },
  { id: 24, name: "Light Bluish Gray", rgb: [138, 146, 141], hex: "#8A928D" },
  { id: 25, name: "Light Gray", rgb: [138, 146, 141], hex: "#8A928D" },
  { id: 26, name: "Lime", rgb: [0, 255, 0], hex: "#00FF00" },
  { id: 27, name: "Maersk Blue", rgb: [102, 153, 204], hex: "#6699CC" },
  { id: 28, name: "Medium Azure", rgb: [114, 160, 193], hex: "#72A0C1" },
  { id: 29, name: "Medium Blue", rgb: [0, 0, 205], hex: "#0000CD" },
  { id: 30, name: "Medium Lavender", rgb: [147, 112, 219], hex: "#9370DB" },
  { id: 31, name: "Medium Nougat", rgb: [166, 125, 61], hex: "#A67D3D" },
  { id: 32, name: "Olive Green", rgb: [79, 79, 47], hex: "#4F4F2F" },
  { id: 33, name: "Orange", rgb: [255, 165, 0], hex: "#FFA500" },
  { id: 34, name: "Red", rgb: [180, 0, 0], hex: "#B40000" },
  { id: 35, name: "Reddish Brown", rgb: [166, 42, 42], hex: "#A62A2A" },
  { id: 36, name: "Sand Blue", rgb: [95, 159, 159], hex: "#5F9F9F" },
  { id: 37, name: "Sand Green", rgb: [82, 127, 118], hex: "#527F76" },
  { id: 38, name: "Tan", rgb: [151, 105, 79], hex: "#97694F" },
  { id: 39, name: "White", rgb: [255, 255, 255], hex: "#FFFFFF" },
  { id: 40, name: "Yellow", rgb: [255, 255, 0], hex: "#FFFF00" },
];

/**
 * Calculates the Euclidean distance between two RGB colors
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
 * Finds the closest LEGO color to a given RGB value
 */
export function findClosestLegoColor(rgb: [number, number, number]): LegoColor {
  let closestColor = LEGO_COLORS[0];
  let minDistance = colorDistance(rgb, closestColor.rgb);

  for (const color of LEGO_COLORS) {
    const distance = colorDistance(rgb, color.rgb);
    if (distance < minDistance) {
      minDistance = distance;
      closestColor = color;
    }
  }

  return closestColor;
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

