import { getAuthSession } from '@/features/auth/session';
import { uploadFile } from './storage.service';
import type { Creation, SaveCreationData } from '@/types';
import { LegoColor } from '@/utils/bricks/colors';
import { loadPixelDataFromPng } from '@/utils/image/pngToPixelData';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

/**
 * Save a creation (insert new or update existing) via backend API
 */
export async function saveCreation(
  userId: string,
  data: SaveCreationData,
  creationId?: string
): Promise<{ data: Creation | null; error: Error | null }> {
  console.log('[saveCreation] Starting, creationId:', creationId);
  try {
    const session = getAuthSession();
    if (!session) throw new Error('Not authenticated. Please sign in again.');

    // If creating new, insert first to get ID, then upload preview
    if (!creationId) {
      console.log('[saveCreation] Creating new creation via API...');
      
      // Insert without preview first (excluding pixel_data - too large, not needed)
      const createResponse = await fetch(`${API_URL}/api/creations`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          creationData: {
            title: data.title,
            description: data.description,
            width: data.width,
            height: data.height,
            original_image_url: data.original_image_url,
            preview_image_url: null,
            is_public: data.is_public,
            filter_options: data.filter_options,
          },
        }),
      });

      if (!createResponse.ok) {
        const error = await createResponse.json();
        throw new Error(error.error || 'Failed to create');
      }

      const { creation } = await createResponse.json();
      console.log('[saveCreation] Creation created with ID:', creation.id);

      // Generate and upload preview
      console.log('[saveCreation] Generating preview...');
      const { url: previewUrl, error: previewError } = await generateAndUploadPreview(
        data.pixel_data,
        data.width,
        data.height,
        userId,
        creation.id
      );

      console.log('[saveCreation] Preview result:', { previewUrl, previewError });

      if (previewError) {
        console.error('[saveCreation] Failed to generate preview:', previewError);
        throw new Error(`Failed to generate preview: ${previewError.message}`);
      }

      if (!previewUrl) {
        console.error('[saveCreation] No preview URL returned');
        throw new Error('Failed to generate preview image');
      }

      // Generate and upload rendered image
      console.log('[saveCreation] Generating rendered image...');
      const { url: renderedUrl, error: renderedError } = await generateAndUploadRenderedImage(
        data.pixel_data,
        data.width,
        data.height,
        userId,
        creation.id
      );

      console.log('[saveCreation] Rendered image result:', { renderedUrl, renderedError });

      if (renderedError) {
        console.error('[saveCreation] Failed to generate rendered image:', renderedError);
        // Don't throw - rendered image is optional
      }

      // Update with preview URL and rendered image URL
      console.log('[saveCreation] Updating with preview URL and rendered image URL...');
      const updateResponse = await fetch(`${API_URL}/api/creations`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          creationId: creation.id,
          creationData: {
            title: data.title,
            description: data.description,
            width: data.width,
            height: data.height,
            original_image_url: data.original_image_url,
            preview_image_url: previewUrl,
            rendered_image_url: renderedUrl || null,
            is_public: data.is_public,
            filter_options: data.filter_options,
          },
        }),
      });

      if (!updateResponse.ok) {
        const error = await updateResponse.json();
        throw new Error(error.error || 'Failed to update with preview');
      }

      const { creation: updated } = await updateResponse.json();
      return { data: updated, error: null };
    } else {
      // Update existing creation
      console.log('[saveCreation] Updating existing creation via API...');
      
      // Generate new preview from the current pixel data
      console.log('[saveCreation] Generating new preview from edited pixel data...');
      const { url: previewUrl, error: previewError } = await generateAndUploadPreview(
        data.pixel_data,
        data.width,
        data.height,
        userId,
        creationId
      );

      if (previewError) {
        console.error('[saveCreation] Failed to generate preview:', previewError);
        throw new Error(`Failed to generate preview: ${previewError.message}`);
      }

      if (!previewUrl) {
        console.error('[saveCreation] No preview URL returned');
        throw new Error('Failed to generate preview image');
      }

      console.log('[saveCreation] Preview generated successfully:', previewUrl);

      // Generate and upload rendered image
      console.log('[saveCreation] Generating rendered image...');
      const { url: renderedUrl, error: renderedError } = await generateAndUploadRenderedImage(
        data.pixel_data,
        data.width,
        data.height,
        userId,
        creationId
      );

      console.log('[saveCreation] Rendered image result:', { renderedUrl, renderedError });

      if (renderedError) {
        console.error('[saveCreation] Failed to generate rendered image:', renderedError);
        // Don't throw - rendered image is optional
      }

      const updateResponse = await fetch(`${API_URL}/api/creations`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          creationId,
          creationData: {
            title: data.title,
            description: data.description,
            width: data.width,
            height: data.height,
            original_image_url: data.original_image_url,
            preview_image_url: previewUrl,
            rendered_image_url: renderedUrl || null,
            is_public: data.is_public,
            filter_options: data.filter_options,
          },
        }),
      });

      if (!updateResponse.ok) {
        const error = await updateResponse.json();
        throw new Error(error.error || 'Failed to update');
      }

      const { creation } = await updateResponse.json();
      return { data: creation, error: null };
    }
  } catch (error) {
    console.error('[saveCreation] Error:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Load a creation by ID and reconstruct pixel data from preview PNG
 * Note: pixel_data was dropped from the database - we reconstruct it from the preview PNG
 */
export async function loadCreation(
  creationId: string
): Promise<{ data: Creation | null; error: Error | null }> {
  console.log('[loadCreation] Loading creation:', creationId);
  try {
    const session = getAuthSession();
    if (!session) {
      throw new Error('Not authenticated. Please sign in again.');
    }

    console.log('[loadCreation] Fetching from backend API...');
    const response = await fetch(`${API_URL}/api/creations/${creationId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    console.log('[loadCreation] API response status:', response.status);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to load creation' }));
      throw new Error(error.error || 'Failed to load creation');
    }

    const { creation } = await response.json();
    
    if (!creation) {
      throw new Error('Creation not found');
    }

    console.log('[loadCreation] Creation fetched from API:', {
      id: creation.id,
      title: creation.title,
      width: creation.width,
      height: creation.height,
      hasPreviewUrl: !!creation.preview_image_url,
      previewUrl: creation.preview_image_url
    });

    const data = creation;

    // Reconstruct pixel_data from preview PNG
    if (!data.preview_image_url) {
      throw new Error('This creation has no preview image and cannot be loaded. Please recreate it.');
    }

    console.log('[loadCreation] Reconstructing pixel data from preview PNG...');
    try {
      const pixelData = await loadPixelDataFromPng(
        data.preview_image_url,
        data.width,
        data.height
      );
      
      // Validate the reconstructed data
      if (!pixelData || !Array.isArray(pixelData) || pixelData.length === 0) {
        throw new Error('Reconstructed pixel data is invalid or empty');
      }
      
      // Add the reconstructed pixel_data to the creation
      const creationWithPixelData: Creation = {
        ...data,
        pixel_data: pixelData,
      };
      
      console.log('[loadCreation] Successfully loaded creation with reconstructed pixel data');
      return { data: creationWithPixelData, error: null };
    } catch (pngError) {
      console.error('[loadCreation] Failed to reconstruct pixel data:', pngError);
      const errorMessage = pngError instanceof Error ? pngError.message : 'Could not read preview image';
      throw new Error(`Failed to load creation: ${errorMessage}`);
    }
  } catch (error) {
    console.error('[loadCreation] Error:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * List all creations for a user via backend API
 */
export async function listUserCreations(
  userId: string
): Promise<{ data: Creation[] | null; error: Error | null }> {
  console.log('[listUserCreations] Called with userId:', userId);
  console.log('[listUserCreations] API_URL:', API_URL);
  
  try {
    const session = getAuthSession();
    if (!session) {
      console.error('[listUserCreations] No active session');
      throw new Error('No active session. Please sign in again.');
    }

    console.log('[listUserCreations] Session exists, fetching creations...');
    const url = `${API_URL}/api/creations`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    console.log('[listUserCreations] Response status:', response.status);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to list creations');
    }

    const { creations } = await response.json();
    console.log('[listUserCreations] Received creations:', creations?.length);
    return { data: creations, error: null };
  } catch (error) {
    console.error('[listUserCreations] Error:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Delete a creation via backend API
 */
export async function deleteCreation(
  creationId: string
): Promise<{ error: Error | null }> {
  try {
    const session = getAuthSession();
    if (!session) throw new Error('No active session. Please sign in again.');

    const response = await fetch(`${API_URL}/api/creations/${creationId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete creation');
    }

    return { error: null };
  } catch (error) {
    console.error('Error deleting creation:', error);
    return { error: error as Error };
  }
}

/**
 * Upload original image to Supabase Storage
 */
export async function uploadOriginalImage(
  file: File,
  userId: string
): Promise<{ url: string | null; error: Error | null }> {
  try {
    const fileExt = file.name.split('.').pop();
    const path = `${userId}/${Date.now()}.${fileExt}`;
    
    const url = await uploadFile(file, path, { upsert: false });
    
    return { url, error: null };
  } catch (error) {
    console.error('Error uploading original image:', error);
    return { url: null, error: error as Error };
  }
}

/**
 * Get a public creation by ID (no authentication required)
 */
export async function getPublicCreation(
  creationId: string
): Promise<{ data: Creation | null; error: Error | null }> {
  console.log('[getPublicCreation] Loading public creation:', creationId);
  try {
    const response = await fetch(`${API_URL}/api/creations/public/${creationId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('[getPublicCreation] API response status:', response.status);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to load creation' }));
      throw new Error(error.error || 'Failed to load creation');
    }

    const { creation } = await response.json();
    
    if (!creation) {
      throw new Error('Creation not found');
    }

    console.log('[getPublicCreation] Public creation fetched:', {
      id: creation.id,
      title: creation.title,
      width: creation.width,
      height: creation.height,
      hasPreviewUrl: !!creation.preview_image_url,
    });

    return { data: creation, error: null };
  } catch (error) {
    console.error('[getPublicCreation] Error:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get all public creations (no authentication required)
 */
export async function getPublicCreations(
  page: number = 1,
  limit: number = 20
): Promise<{ data: { creations: Creation[]; total: number } | null; error: Error | null }> {
  console.log('[getPublicCreations] Loading public creations, page:', page);
  try {
    const response = await fetch(`${API_URL}/api/creations/public?page=${page}&limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('[getPublicCreations] API response status:', response.status);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to load creations' }));
      throw new Error(error.error || 'Failed to load creations');
    }

    const result = await response.json();
    
    console.log('[getPublicCreations] Public creations fetched:', {
      count: result.creations?.length,
      total: result.total,
    });

    return { data: result, error: null };
  } catch (error) {
    console.error('[getPublicCreations] Error:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get all public creations for a specific creator (no authentication required)
 */
export async function getCreatorPublicCreations(
  creatorId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ data: { creations: Creation[]; total: number; displayName: string | null } | null; error: Error | null }> {
  console.log('[getCreatorPublicCreations] Loading creator public creations, creatorId:', creatorId, 'page:', page);
  try {
    const response = await fetch(`${API_URL}/api/creations/public/creator/${creatorId}?page=${page}&limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('[getCreatorPublicCreations] API response status:', response.status);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to load creator creations' }));
      throw new Error(error.error || 'Failed to load creator creations');
    }

    const result = await response.json();
    
    console.log('[getCreatorPublicCreations] Creator public creations fetched:', {
      count: result.creations?.length,
      total: result.total,
      displayName: result.displayName,
    });

    return { data: result, error: null };
  } catch (error) {
    console.error('[getCreatorPublicCreations] Error:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Ensure pixel data has proper LegoColor structure
 * JSONB deserialization may lose the prototype/methods
 */
function ensureLegoColorStructure(pixelData: unknown[][]): LegoColor[][] {
  return pixelData.map(row =>
    row.map(pixel => {
      // If pixel already has hex property, it's likely valid
      if (pixel && typeof pixel === 'object' && 'hex' in pixel) {
        return pixel as LegoColor;
      }
      // Otherwise, something went wrong - return a default black color
      console.warn('Invalid pixel data detected, using fallback color');
      return new LegoColor('Black', [0, 0, 0]);
    })
  );
}

/**
 * Generate a thumbnail image from pixel data
 */
export function generateThumbnail(
  pixelData: LegoColor[][],
  width: number,
  height: number,
  pixelSize: number = 4
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width * pixelSize;
  canvas.height = height * pixelSize;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return '';
  }

  // Ensure pixel data has proper structure
  const validPixelData = ensureLegoColorStructure(pixelData);

  // Draw each pixel as a colored square
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const color = validPixelData[row][col];
      ctx.fillStyle = color.hex;
      ctx.fillRect(col * pixelSize, row * pixelSize, pixelSize, pixelSize);
    }
  }

  return canvas.toDataURL('image/png');
}

/**
 * Generate a high-quality preview image and upload to storage
 */
export async function generateAndUploadPreview(
  pixelData: LegoColor[][],
  width: number,
  height: number,
  userId: string,
  creationId: string
): Promise<{ url: string | null; error: Error | null }> {
  console.log('[generateAndUploadPreview] Starting...');
  try {
    // Ensure pixel data has proper structure
    const validPixelData = ensureLegoColorStructure(pixelData);

    // Calculate preview dimensions (max 512px on longest side)
    const maxSize = 512;
    const pixelSize = Math.floor(maxSize / Math.max(width, height));
    
    // Create canvas and draw pixels
    console.log('[generateAndUploadPreview] Creating canvas...');
    const canvas = document.createElement('canvas');
    canvas.width = width * pixelSize;
    canvas.height = height * pixelSize;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    // Draw each pixel as a colored square
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const color = validPixelData[row][col];
        ctx.fillStyle = color.hex;
        ctx.fillRect(col * pixelSize, row * pixelSize, pixelSize, pixelSize);
      }
    }

    // Convert canvas to blob
    console.log('[generateAndUploadPreview] Converting to blob...');
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/png', 1.0);
    });

    if (!blob) {
      throw new Error('Failed to generate preview image');
    }
    console.log('[generateAndUploadPreview] Blob created, size:', blob.size);

    // Upload to storage
    const path = `${userId}/${creationId}-preview.png`;
    console.log('[generateAndUploadPreview] Uploading to:', path);
    const url = await uploadFile(blob, path, { upsert: true });
    console.log('[generateAndUploadPreview] Upload complete, URL:', url);

    return { url, error: null };
  } catch (error) {
    console.error('[generateAndUploadPreview] Error:', error);
    return { url: null, error: error as Error };
  }
}

/**
 * Helper function to draw a LEGO stud with 3D shading effect
 */
function drawLegoStud(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  baseColor: string
) {
  const centerX = x + size / 2;
  const centerY = y + size / 2;
  const studRadius = size * 0.35; // Stud takes up 70% of the brick width

  // Draw the stud with gradient for 3D effect
  const gradient = ctx.createRadialGradient(
    centerX - studRadius * 0.3, // Offset for highlight
    centerY - studRadius * 0.3,
    0,
    centerX,
    centerY,
    studRadius
  );

  // Parse the base color and create lighter/darker variations
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };

  const rgb = hexToRgb(baseColor);
  const lighter = `rgb(${Math.min(255, rgb.r + 40)}, ${Math.min(255, rgb.g + 40)}, ${Math.min(255, rgb.b + 40)})`;
  const darker = `rgb(${Math.max(0, rgb.r - 30)}, ${Math.max(0, rgb.g - 30)}, ${Math.max(0, rgb.b - 30)})`;

  gradient.addColorStop(0, lighter); // Highlight
  gradient.addColorStop(0.6, baseColor); // Base color
  gradient.addColorStop(1, darker); // Shadow

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, studRadius, 0, Math.PI * 2);
  ctx.fill();

  // Add a subtle highlight on top
  const highlightGradient = ctx.createRadialGradient(
    centerX - studRadius * 0.4,
    centerY - studRadius * 0.4,
    0,
    centerX - studRadius * 0.4,
    centerY - studRadius * 0.4,
    studRadius * 0.5
  );
  highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
  highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = highlightGradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, studRadius, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Generate a rendered image with studs but without grid overlay
 */
export async function generateAndUploadRenderedImage(
  pixelData: LegoColor[][],
  width: number,
  height: number,
  userId: string,
  creationId: string
): Promise<{ url: string | null; error: Error | null }> {
  console.log('[generateAndUploadRenderedImage] Starting...');
  try {
    // Ensure pixel data has proper structure
    const validPixelData = ensureLegoColorStructure(pixelData);

    // Calculate rendered dimensions (larger than preview for better quality)
    const maxSize = 1024;
    const pixelSize = Math.floor(maxSize / Math.max(width, height));
    
    // Create canvas and draw pixels
    console.log('[generateAndUploadRenderedImage] Creating canvas...');
    const canvas = document.createElement('canvas');
    canvas.width = width * pixelSize;
    canvas.height = height * pixelSize;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    // Draw each pixel with brick base and stud (no grid)
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const color = validPixelData[row][col];
        const x = col * pixelSize;
        const y = row * pixelSize;
        
        // Draw brick base
        ctx.fillStyle = color.hex;
        ctx.fillRect(x, y, pixelSize, pixelSize);
        
        // Add subtle edge shading to brick base
        if (pixelSize >= 8) {
          // Top-left lighter edge
          ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.fillRect(x, y, pixelSize, 1);
          ctx.fillRect(x, y, 1, pixelSize);
          
          // Bottom-right darker edge
          ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
          ctx.fillRect(x, y + pixelSize - 1, pixelSize, 1);
          ctx.fillRect(x + pixelSize - 1, y, 1, pixelSize);
        }
        
        // Draw the LEGO stud if pixel size is large enough
        if (pixelSize >= 10) {
          drawLegoStud(ctx, x, y, pixelSize, color.hex);
        }
      }
    }

    // Convert canvas to blob
    console.log('[generateAndUploadRenderedImage] Converting to blob...');
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/png', 1.0);
    });

    if (!blob) {
      throw new Error('Failed to generate rendered image');
    }
    console.log('[generateAndUploadRenderedImage] Blob created, size:', blob.size);

    // Upload to storage
    const path = `${userId}/${creationId}-rendered.png`;
    console.log('[generateAndUploadRenderedImage] Uploading to:', path);
    const url = await uploadFile(blob, path, { upsert: true });
    console.log('[generateAndUploadRenderedImage] Upload complete, URL:', url);

    return { url, error: null };
  } catch (error) {
    console.error('[generateAndUploadRenderedImage] Error:', error);
    return { url: null, error: error as Error };
  }
}

