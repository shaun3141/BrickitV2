import { LegoColor, hexToRgb } from '@/utils/bricks/colors';

/**
 * API response structure for the color palette endpoint
 */
interface ColorPaletteResponse {
  success: boolean;
  data: Array<{
    color_name: string;
    element_id: string | null;
    rgb: string;
    price: number;
  }>;
  meta: {
    total_colors: number;
    description: string;
  };
}

/**
 * Cached colors to avoid repeated API calls
 */
let cachedColors: LegoColor[] | null = null;
let fetchPromise: Promise<LegoColor[]> | null = null;

/**
 * Fetches the universal color palette from the API
 * Implements caching to avoid repeated API calls
 */
export async function fetchColorPalette(): Promise<LegoColor[]> {
  // Return cached colors if available
  if (cachedColors) {
    return cachedColors;
  }

  // If a fetch is already in progress, return that promise
  if (fetchPromise) {
    return fetchPromise;
  }

  // Start a new fetch
  fetchPromise = (async () => {
    try {
      const response = await fetch('/api/colors/palette');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch color palette: ${response.statusText}`);
      }

      const data: ColorPaletteResponse = await response.json();
      
      if (!data.success || !data.data) {
        throw new Error('Invalid response from color palette API');
      }

      // Convert API colors to LegoColor objects
      const colors = data.data.map(colorData => {
        const rgb = hexToRgb(colorData.rgb);
        if (!rgb) {
          console.warn(`Invalid RGB value for color ${colorData.color_name}: ${colorData.rgb}`);
          return new LegoColor(colorData.color_name, [0, 0, 0]);
        }
        return new LegoColor(colorData.color_name, rgb);
      });

      // Cache the colors
      cachedColors = colors;
      
      return colors;
    } catch (error) {
      console.error('Error fetching color palette:', error);
      // Clear the fetch promise so we can retry next time
      fetchPromise = null;
      throw error;
    }
  })();

  return fetchPromise;
}

/**
 * Clears the color cache (useful for testing or manual refresh)
 */
export function clearColorCache(): void {
  cachedColors = null;
  fetchPromise = null;
}

/**
 * Gets cached colors if available, otherwise returns null
 */
export function getCachedColors(): LegoColor[] | null {
  return cachedColors;
}

