import fs from 'fs/promises';
import path from 'path';

/**
 * Color variant for a brick
 */
export interface ColorVariant {
  color_name: string;
  element_id: string | null;
  rgb: string;
  price: number;
  is_substitute?: boolean;
  substitutes?: Array<{
    brick_type: string;
    element_id: string;
    quantity: number;
  }>;
}

/**
 * Brick item with all color variants
 */
export interface BrickItem {
  element_id: string;
  brick_type: string;
  num_colors: number;
  colors: ColorVariant[];
}

/**
 * Service for accessing LEGO Pick a Brick data
 */
export class BricksService {
  private static cachedData: BrickItem[] | null = null;
  private static readonly DATA_PATH = path.join(__dirname, '../../public/bricks_and_plates_universal.json');

  /**
   * Get all brick data
   */
  static async getAllBricks(): Promise<BrickItem[]> {
    if (this.cachedData) {
      return this.cachedData;
    }

    const data = await fs.readFile(this.DATA_PATH, 'utf-8');
    this.cachedData = JSON.parse(data);
    return this.cachedData!;
  }

  /**
   * Get brick by element ID
   */
  static async getBrickByElementId(elementId: string): Promise<BrickItem | null> {
    const bricks = await this.getAllBricks();
    return bricks.find(brick => brick.element_id === elementId) || null;
  }

  /**
   * Get brick by type name (e.g., "BRICK 2X4")
   */
  static async getBrickByType(brickType: string): Promise<BrickItem | null> {
    const bricks = await this.getAllBricks();
    return bricks.find(brick => brick.brick_type === brickType) || null;
  }

  /**
   * Get all available colors across all bricks
   */
  static async getAllColors(): Promise<ColorVariant[]> {
    const bricks = await this.getAllBricks();
    const allColors = bricks.flatMap(brick => brick.colors);
    
    // Remove duplicates by element_id
    const uniqueColors = allColors.filter((color, index, self) =>
      index === self.findIndex(c => c.element_id === color.element_id)
    );
    
    return uniqueColors;
  }

  /**
   * Get the universal color palette (from BRICK 1X1)
   * These are the 27 colors available as both bricks and plates
   */
  static async getUniversalPalette(): Promise<ColorVariant[]> {
    const bricks = await this.getAllBricks();
    const brick1x1 = bricks.find(brick => brick.brick_type === 'BRICK 1X1');
    
    if (!brick1x1) {
      throw new Error('BRICK 1X1 not found in data');
    }

    // Filter out substitutes - only return direct colors
    const directColors = brick1x1.colors.filter(color => !color.is_substitute);
    
    // Sort colors intelligently
    return this.sortColorsByHue(directColors);
  }

  /**
   * Convert hex RGB string to RGB tuple
   */
  private static hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) {
      return [0, 0, 0];
    }
    return [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16),
    ];
  }

  /**
   * Convert RGB to HSV color space
   */
  private static rgbToHsv(rgb: [number, number, number]): [number, number, number] {
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
   * Sort colors intelligently: grayscale by brightness, chromatic by hue
   */
  private static sortColorsByHue(colors: ColorVariant[], grayscaleThreshold: number = 10): ColorVariant[] {
    const colorsWithHsv = colors.map(color => {
      const rgb = this.hexToRgb(color.rgb);
      const hsv = this.rgbToHsv(rgb);
      return { color, hsv };
    });

    const grayscale = colorsWithHsv.filter(c => c.hsv[1] <= grayscaleThreshold);
    const chromatic = colorsWithHsv.filter(c => c.hsv[1] > grayscaleThreshold);
    
    // Sort grayscale by value (brightness) - dark to light
    grayscale.sort((a, b) => a.hsv[2] - b.hsv[2]);
    
    // Sort chromatic by hue, then by saturation (more saturated first), then by value
    chromatic.sort((a, b) => {
      if (a.hsv[0] !== b.hsv[0]) return a.hsv[0] - b.hsv[0]; // Sort by hue
      if (a.hsv[1] !== b.hsv[1]) return b.hsv[1] - a.hsv[1]; // Higher saturation first
      return b.hsv[2] - a.hsv[2]; // Higher value (brighter) first
    });
    
    return [...grayscale, ...chromatic].map(c => c.color);
  }

  /**
   * Search colors by name (case-insensitive)
   */
  static async searchColorsByName(searchTerm: string): Promise<ColorVariant[]> {
    const colors = await this.getAllColors();
    const lowerSearch = searchTerm.toLowerCase();
    return colors.filter(color => 
      color.color_name.toLowerCase().includes(lowerSearch)
    );
  }

  /**
   * Get bricks by price range
   */
  static async getBricksByPriceRange(minPrice?: number, maxPrice?: number): Promise<BrickItem[]> {
    const bricks = await this.getAllBricks();
    
    if (minPrice === undefined && maxPrice === undefined) {
      return bricks;
    }

    return bricks.map(brick => ({
      ...brick,
      colors: brick.colors.filter(color => {
        if (color.price === null) return true;
        if (minPrice !== undefined && color.price < minPrice) return false;
        if (maxPrice !== undefined && color.price > maxPrice) return false;
        return true;
      })
    })).filter(brick => brick.colors.length > 0);
  }

  /**
   * Clear the cache (useful for reloading data)
   */
  static clearCache(): void {
    this.cachedData = null;
  }
}

