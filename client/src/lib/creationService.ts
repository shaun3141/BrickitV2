import { supabase } from './supabase';
import type { Creation, SaveCreationData } from '@/types';
import { LegoColor } from '@/utils/legoColors';

/**
 * Save a creation (insert new or update existing)
 */
export async function saveCreation(
  userId: string,
  data: SaveCreationData,
  creationId?: string
): Promise<{ data: Creation | null; error: Error | null }> {
  try {
    // For updates, we need the creation ID first to generate preview
    // For inserts, we'll do a two-step process
    if (creationId) {
      // Generate and upload preview for existing creation
      const { url: previewUrl, error: previewError } = await generateAndUploadPreview(
        data.pixel_data,
        data.width,
        data.height,
        userId,
        creationId
      );

      if (previewError) {
        console.error('Failed to generate preview, continuing without it:', previewError);
      }

      // Update existing creation
      const { data: updated, error } = await supabase
        .from('creations')
        .update({
          title: data.title,
          description: data.description,
          width: data.width,
          height: data.height,
          pixel_data: data.pixel_data,
          original_image_url: data.original_image_url,
          preview_image_url: previewUrl || data.preview_image_url,
          is_public: data.is_public,
          filter_options: data.filter_options,
          updated_at: new Date().toISOString(),
        })
        .eq('id', creationId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return { data: updated, error: null };
    } else {
      // Insert new creation first (to get the ID)
      const { data: created, error } = await supabase
        .from('creations')
        .insert({
          user_id: userId,
          title: data.title,
          description: data.description,
          width: data.width,
          height: data.height,
          pixel_data: data.pixel_data,
          original_image_url: data.original_image_url,
          preview_image_url: null, // Will update in next step
          is_public: data.is_public,
          filter_options: data.filter_options,
        })
        .select()
        .single();

      if (error) throw error;

      // Now generate and upload preview with the creation ID
      const { url: previewUrl, error: previewError } = await generateAndUploadPreview(
        data.pixel_data,
        data.width,
        data.height,
        userId,
        created.id
      );

      if (previewError) {
        console.error('Failed to generate preview:', previewError);
        // Return creation even without preview
        return { data: created, error: null };
      }

      // Update the creation with preview URL
      const { data: withPreview, error: updateError } = await supabase
        .from('creations')
        .update({ preview_image_url: previewUrl })
        .eq('id', created.id)
        .select()
        .single();

      if (updateError) {
        console.error('Failed to update preview URL:', updateError);
        return { data: created, error: null };
      }

      return { data: withPreview, error: null };
    }
  } catch (error) {
    console.error('Error saving creation:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Load a creation by ID
 */
export async function loadCreation(
  creationId: string
): Promise<{ data: Creation | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('creations')
      .select('*')
      .eq('id', creationId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error loading creation:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * List all creations for a user
 */
export async function listUserCreations(
  userId: string
): Promise<{ data: Creation[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('creations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error listing creations:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Delete a creation
 */
export async function deleteCreation(
  creationId: string,
  userId: string
): Promise<{ error: Error | null }> {
  try {
    // First, get the creation to find associated files
    const { data: creation } = await supabase
      .from('creations')
      .select('original_image_url, preview_image_url')
      .eq('id', creationId)
      .eq('user_id', userId)
      .single();

    // Delete files from storage
    const filesToDelete: string[] = [];
    
    if (creation?.original_image_url) {
      const urlParts = creation.original_image_url.split('/');
      const path = urlParts.slice(urlParts.indexOf('creation-images') + 1).join('/');
      filesToDelete.push(path);
    }

    if (creation?.preview_image_url) {
      const urlParts = creation.preview_image_url.split('/');
      const path = urlParts.slice(urlParts.indexOf('creation-images') + 1).join('/');
      filesToDelete.push(path);
    }

    if (filesToDelete.length > 0) {
      await supabase.storage.from('creation-images').remove(filesToDelete);
    }

    // Delete the creation record
    const { error } = await supabase
      .from('creations')
      .delete()
      .eq('id', creationId)
      .eq('user_id', userId);

    if (error) throw error;
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
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('creation-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('creation-images')
      .getPublicUrl(fileName);

    return { url: publicUrl, error: null };
  } catch (error) {
    console.error('Error uploading image:', error);
    return { url: null, error: error as Error };
  }
}

/**
 * Ensure pixel data has proper LegoColor structure
 * JSONB deserialization may lose the prototype/methods
 */
function ensureLegoColorStructure(pixelData: any[][]): LegoColor[][] {
  return pixelData.map(row =>
    row.map(pixel => {
      // If pixel already has hex property, it's likely valid
      if (pixel && typeof pixel === 'object' && pixel.hex) {
        return pixel as LegoColor;
      }
      // Otherwise, something went wrong - return a default black color
      console.warn('Invalid pixel data detected, using fallback color');
      return new LegoColor(0, 'Black', [0, 0, 0]);
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
  try {
    // Ensure pixel data has proper structure
    const validPixelData = ensureLegoColorStructure(pixelData);

    // Calculate preview dimensions (max 512px on longest side)
    const maxSize = 512;
    const pixelSize = Math.floor(maxSize / Math.max(width, height));
    
    const canvas = document.createElement('canvas');
    canvas.width = width * pixelSize;
    canvas.height = height * pixelSize;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    // Draw each pixel as a colored square (no grid)
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const color = validPixelData[row][col];
        ctx.fillStyle = color.hex;
        ctx.fillRect(col * pixelSize, row * pixelSize, pixelSize, pixelSize);
      }
    }

    // Convert canvas to blob
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/png', 1.0);
    });

    if (!blob) {
      throw new Error('Failed to generate preview image');
    }

    // Upload to storage
    const fileName = `${userId}/${creationId}-preview.png`;
    const { error: uploadError } = await supabase.storage
      .from('creation-images')
      .upload(fileName, blob, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: true, // Overwrite if exists (for updates)
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('creation-images')
      .getPublicUrl(fileName);

    return { url: publicUrl, error: null };
  } catch (error) {
    console.error('Error generating/uploading preview:', error);
    return { url: null, error: error as Error };
  }
}

