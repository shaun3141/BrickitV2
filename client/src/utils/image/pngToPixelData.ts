import { findClosestLegoColor, hexToRgb, LegoColor } from '@/utils/bricks/colors';

/**
 * Loads a PNG image from a URL and reconstructs the LegoColor pixel data
 * Each pixel in the PNG represents a LEGO stud with its exact color
 * 
 * @param imageUrl - URL of the preview PNG image
 * @param width - Expected width of the mosaic (in studs)
 * @param height - Expected height of the mosaic (in studs)
 * @returns Promise resolving to LegoColor[][] array
 */
export async function loadPixelDataFromPng(
  imageUrl: string,
  width: number,
  height: number
): Promise<LegoColor[][]> {
  console.log('[loadPixelDataFromPng] Starting...', { imageUrl, width, height });
  
  // Validate inputs
  if (!imageUrl || typeof imageUrl !== 'string') {
    throw new Error('Invalid image URL provided');
  }
  
  if (!width || !height || width <= 0 || height <= 0) {
    throw new Error(`Invalid dimensions: ${width}x${height}`);
  }
  
  return new Promise((resolve, reject) => {
    // Set a timeout to prevent hanging
    const timeoutId = setTimeout(() => {
      reject(new Error('Image loading timeout - check CORS configuration or network connection'));
    }, 5000); // 5 second timeout
    
    const img = new Image();
    // crossOrigin is required to read pixel data from canvas
    // Public Supabase Storage buckets should have CORS enabled by default
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      clearTimeout(timeoutId); // Clear the timeout
      console.log('[loadPixelDataFromPng] Image loaded', { 
        imageWidth: img.width, 
        imageHeight: img.height 
      });
      
      try {
        // Create canvas to read pixel data
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // The PNG might be scaled up (e.g., each stud = 4x4 pixels)
        // So we need to calculate the pixel size
        const pixelSize = Math.floor(img.width / width);
        console.log('[loadPixelDataFromPng] Calculated pixel size:', pixelSize);
        
        if (pixelSize < 1) {
          reject(new Error(`Image is too small: ${img.width}x${img.height} for ${width}x${height} mosaic`));
          return;
        }
        
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw the image to the canvas
        ctx.drawImage(img, 0, 0);
        
        // Read all pixel data once (much more efficient than multiple getImageData calls)
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const data = imageData.data;
        
        // Extract pixel data
        const pixelData: LegoColor[][] = [];
        
        for (let row = 0; row < height; row++) {
          const rowData: LegoColor[] = [];
          
          for (let col = 0; col < width; col++) {
            // Sample from the center of each "stud block"
            const x = col * pixelSize + Math.floor(pixelSize / 2);
            const y = row * pixelSize + Math.floor(pixelSize / 2);
            
            // Access pixel data from cached array (RGBA format: 4 bytes per pixel)
            const index = (y * img.width + x) * 4;
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            
            // Find the closest LEGO color
            const legoColor = findClosestLegoColor([r, g, b]);
            rowData.push(legoColor);
          }
          
          pixelData.push(rowData);
        }
        
        console.log('[loadPixelDataFromPng] Successfully reconstructed pixel data', {
          rows: pixelData.length,
          cols: pixelData[0]?.length,
        });
        
        // Validate the result
        if (pixelData.length !== height) {
          reject(new Error(`Reconstructed data has wrong height: ${pixelData.length} vs expected ${height}`));
          return;
        }
        
        if (pixelData[0]?.length !== width) {
          reject(new Error(`Reconstructed data has wrong width: ${pixelData[0]?.length} vs expected ${width}`));
          return;
        }
        
        resolve(pixelData);
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('[loadPixelDataFromPng] Error during processing:', error);
        reject(error);
      }
    };
    
    img.onerror = (e) => {
      clearTimeout(timeoutId);
      console.error('[loadPixelDataFromPng] Failed to load image:', e);
      reject(new Error(`Failed to load image from URL: ${imageUrl}. Check if the file exists and CORS is configured.`));
    };
    
    console.log('[loadPixelDataFromPng] Setting image src...');
    img.src = imageUrl;
  });
}

/**
 * Alternative method: reconstruct from color hex values if we stored them differently
 * This is a backup in case the PNG approach has issues
 */
export async function loadPixelDataFromColorArray(
  hexColors: string[][],
  width: number,
  height: number
): Promise<LegoColor[][]> {
  const pixelData: LegoColor[][] = [];
  
  for (let row = 0; row < height; row++) {
    const rowData: LegoColor[] = [];
    
    for (let col = 0; col < width; col++) {
      const hex = hexColors[row]?.[col];
      if (!hex) {
        throw new Error(`Missing color at position [${row}][${col}]`);
      }
      
      const rgb = hexToRgb(hex);
      if (!rgb) {
        throw new Error(`Invalid hex color: ${hex}`);
      }
      
      const legoColor = findClosestLegoColor(rgb);
      rowData.push(legoColor);
    }
    
    pixelData.push(rowData);
  }
  
  return pixelData;
}

