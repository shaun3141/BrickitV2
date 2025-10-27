import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase';

/**
 * Service for managing storage operations
 */
export class StorageService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = getSupabaseClient();
  }

  /**
   * Upload a file to Supabase Storage
   * Ensures user can only upload to their own folder
   */
  async uploadFile(
    userId: string,
    filePath: string,
    fileBuffer: Buffer,
    contentType: string,
    upsert: boolean = false
  ): Promise<string> {
    // Enforce userId path prefix - users can only upload to their own folder
    if (!filePath.startsWith(`${userId}/`)) {
      throw new Error('Forbidden: Cannot upload to this path. Files must be uploaded to your own folder.');
    }

    const { data, error } = await this.supabase.storage
      .from('creation-images')
      .upload(filePath, fileBuffer, {
        contentType,
        cacheControl: '3600',
        upsert,
      });

    if (error) {
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = this.supabase.storage
      .from('creation-images')
      .getPublicUrl(filePath);

    return publicUrl;
  }
}

