export interface LegoColor {
  id: number;
  name: string;
  rgb: [number, number, number];
  hex: string;
}

// Official LEGO colors commonly available in 1x1 plates
export const LEGO_COLORS: LegoColor[] = [
  { id: 1, name: "White", rgb: [242, 243, 242], hex: "#F2F3F2" },
  { id: 26, name: "Black", rgb: [27, 42, 52], hex: "#1B2A34" },
  { id: 21, name: "Bright Red", rgb: [196, 40, 27], hex: "#C4281B" },
  { id: 23, name: "Bright Blue", rgb: [13, 105, 171], hex: "#0D69AB" },
  { id: 24, name: "Bright Yellow", rgb: [245, 205, 47], hex: "#F5CD2F" },
  { id: 28, name: "Dark Green", rgb: [40, 127, 70], hex: "#287F46" },
  { id: 106, name: "Bright Orange", rgb: [218, 133, 64], hex: "#DA8540" },
  { id: 102, name: "Medium Blue", rgb: [110, 153, 201], hex: "#6E99C9" },
  { id: 119, name: "Bright Yellowish Green", rgb: [164, 189, 70], hex: "#A4BD46" },
  { id: 192, name: "Reddish Brown", rgb: [105, 64, 39], hex: "#694027" },
  { id: 18, name: "Nougat", rgb: [204, 142, 104], hex: "#CC8E68" },
  { id: 140, name: "Earth Blue", rgb: [32, 58, 86], hex: "#203A56" },
  { id: 141, name: "Earth Green", rgb: [39, 70, 44], hex: "#27462C" },
  { id: 312, name: "Medium Nougat", rgb: [170, 125, 85], hex: "#AA7D55" },
  { id: 124, name: "Bright Reddish Violet", rgb: [146, 57, 120], hex: "#923978" },
  { id: 221, name: "Bright Purple", rgb: [205, 98, 152], hex: "#CD6298" },
  { id: 222, name: "Light Purple", rgb: [228, 173, 200], hex: "#E4ADC8" },
  { id: 226, name: "Cool Yellow", rgb: [253, 234, 140], hex: "#FDEA8C" },
  { id: 268, name: "Medium Lilac", rgb: [52, 43, 117], hex: "#342B75" },
  { id: 283, name: "Light Nougat", rgb: [249, 214, 179], hex: "#F9D6B3" },
  { id: 322, name: "Medium Azur", rgb: [104, 195, 226], hex: "#68C3E2" },
  { id: 321, name: "Dark Azur", rgb: [70, 155, 195], hex: "#469BC3" },
  { id: 151, name: "Sand Green", rgb: [120, 144, 129], hex: "#789081" },
  { id: 138, name: "Sand Yellow", rgb: [149, 138, 115], hex: "#958A73" },
  { id: 37, name: "Bright Green", rgb: [75, 151, 74], hex: "#4B974A" },
  { id: 153, name: "Sand Blue", rgb: [112, 129, 154], hex: "#70819A" },
  { id: 212, name: "Light Royal Blue", rgb: [135, 192, 234], hex: "#87C0EA" },
  { id: 5, name: "Brick Yellow", rgb: [215, 197, 153], hex: "#D7C599" },
  { id: 103, name: "Light Grey", rgb: [199, 193, 183], hex: "#C7C1B7" },
  { id: 85, name: "Medium Lavender", rgb: [172, 120, 186], hex: "#AC78BA" },
  { id: 11, name: "Pastel Blue", rgb: [128, 187, 219], hex: "#80BBDB" },
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

