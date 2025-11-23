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
 * Separate caches for bricks and plates
 */
const cachedColors: Map<'brick' | 'plate', LegoColor[]> = new Map();
const fetchPromises: Map<'brick' | 'plate', Promise<LegoColor[]>> = new Map();

/**
 * Fetches the universal color palette from the API
 * Implements caching to avoid repeated API calls
 * @param type - 'brick' or 'plate' (defaults to 'brick')
 */
export async function fetchColorPalette(type: 'brick' | 'plate' = 'brick'): Promise<LegoColor[]> {
  console.log('[fetchColorPalette] Called with type:', type);
  // Return cached colors if available (wrap in Promise.resolve to ensure async behavior)
  if (cachedColors.has(type)) {
    const cached = cachedColors.get(type)!;
    console.log('[fetchColorPalette] Returning cached colors:', cached.length);
    // Return a resolved promise with a new array reference to ensure React detects changes
    return Promise.resolve([...cached]);
  }
  
  console.log('[fetchColorPalette] No cache found, fetching from API...');

  // If a fetch is already in progress, return that promise
  if (fetchPromises.has(type)) {
    return fetchPromises.get(type)!;
  }

  // Start a new fetch
  const promise = (async () => {
    try {
      const response = await fetch(`/api/colors/palette?type=${type}`);
      
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
      cachedColors.set(type, colors);
      console.log('[fetchColorPalette] Fetched and cached colors:', colors.length);
      
      return colors;
    } catch (error) {
      console.error('Error fetching color palette:', error);
      // Clear the fetch promise so we can retry next time
      fetchPromises.delete(type);
      throw error;
    } finally {
      // Remove the promise from the map once it completes
      fetchPromises.delete(type);
    }
  })();

  fetchPromises.set(type, promise);
  return promise;
}

/**
 * Clears the color cache (useful for testing or manual refresh)
 * @param type - Optional type to clear specific cache, or clears all if not specified
 */
export function clearColorCache(type?: 'brick' | 'plate'): void {
  if (type) {
    cachedColors.delete(type);
    fetchPromises.delete(type);
  } else {
    cachedColors.clear();
    fetchPromises.clear();
  }
}

/**
 * Gets cached colors if available, otherwise returns null
 * @param type - 'brick' or 'plate' (defaults to 'brick')
 */
export function getCachedColors(type: 'brick' | 'plate' = 'brick'): LegoColor[] | null {
  return cachedColors.get(type) || null;
}

