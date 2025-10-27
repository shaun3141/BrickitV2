import { SupabaseClient } from '@supabase/supabase-js';
import { Creation, CreationData } from '../types/index';
import { getSupabaseClient } from './supabase';

/**
 * Service for managing creation operations
 */
export class CreationService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = getSupabaseClient();
  }

  /**
   * Get all creations for a user
   * Note: pixel_data was dropped from the database - it's reconstructed client-side from preview PNG
   */
  async getUserCreations(userId: string): Promise<Creation[]> {
    const { data, error } = await this.supabase
      .from('creations')
      .select('id, user_id, title, description, width, height, original_image_url, preview_image_url, rendered_image_url, is_public, filter_options, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch creations: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get a single creation by ID
   * Note: pixel_data was dropped from the database - it's reconstructed client-side from preview PNG
   */
  async getCreationById(creationId: string, userId: string): Promise<Creation | null> {
    const { data, error } = await this.supabase
      .from('creations')
      .select('id, user_id, title, description, width, height, original_image_url, preview_image_url, rendered_image_url, is_public, filter_options, created_at, updated_at')
      .eq('id', creationId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch creation: ${error.message}`);
    }

    return data;
  }

  /**
   * Get a public creation by ID (no authentication required)
   * Returns null if creation is not public
   */
  async getPublicCreationById(creationId: string): Promise<Creation | null> {
    const { data, error } = await this.supabase
      .from('creations')
      .select('id, user_id, title, description, width, height, original_image_url, preview_image_url, rendered_image_url, is_public, filter_options, created_at, updated_at')
      .eq('id', creationId)
      .eq('is_public', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found or not public
      }
      throw new Error(`Failed to fetch creation: ${error.message}`);
    }

    return data;
  }

  /**
   * Get all public creations (no authentication required)
   * Returns list of public creations with pagination
   */
  async getPublicCreations(page: number = 1, limit: number = 20): Promise<{ creations: Creation[]; total: number }> {
    const offset = (page - 1) * limit;

    // Get total count
    const { count, error: countError } = await this.supabase
      .from('creations')
      .select('*', { count: 'exact', head: true })
      .eq('is_public', true);

    if (countError) {
      throw new Error(`Failed to count creations: ${countError.message}`);
    }

    // Get creations
    const { data, error } = await this.supabase
      .from('creations')
      .select('id, user_id, title, description, width, height, original_image_url, preview_image_url, rendered_image_url, is_public, filter_options, created_at, updated_at')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch creations: ${error.message}`);
    }

    return {
      creations: data || [],
      total: count || 0,
    };
  }

  /**
   * Create a new creation
   */
  async createCreation(userId: string, creationData: CreationData): Promise<Creation> {
    const { data, error } = await this.supabase
      .from('creations')
      .insert({
        user_id: userId,
        ...creationData,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create creation: ${error.message}`);
    }

    return data;
  }

  /**
   * Update an existing creation
   */
  async updateCreation(
    creationId: string,
    userId: string,
    creationData: Partial<CreationData>
  ): Promise<Creation> {
    const { data, error } = await this.supabase
      .from('creations')
      .update({
        ...creationData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', creationId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update creation: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a creation and its associated files
   */
  async deleteCreation(creationId: string, userId: string): Promise<void> {
    // First, get the creation to find associated files
    const { data: creation, error: fetchError } = await this.supabase
      .from('creations')
      .select('original_image_url, preview_image_url, rendered_image_url')
      .eq('id', creationId)
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        throw new Error('Creation not found');
      }
      throw new Error(`Failed to fetch creation: ${fetchError.message}`);
    }

    // Delete files from storage
    const filesToDelete: string[] = [];

    if (creation?.original_image_url) {
      const path = this.extractFilePath(creation.original_image_url);
      if (path) filesToDelete.push(path);
    }

    if (creation?.preview_image_url) {
      const path = this.extractFilePath(creation.preview_image_url);
      if (path) filesToDelete.push(path);
    }

    if (creation?.rendered_image_url) {
      const path = this.extractFilePath(creation.rendered_image_url);
      if (path) filesToDelete.push(path);
    }

    if (filesToDelete.length > 0) {
      const { error: storageError } = await this.supabase.storage
        .from('creation-images')
        .remove(filesToDelete);

      if (storageError) {
        console.error('Error deleting files from storage:', storageError);
        // Continue anyway - better to delete the DB record
      }
    }

    // Delete the creation record
    const { error: deleteError } = await this.supabase
      .from('creations')
      .delete()
      .eq('id', creationId)
      .eq('user_id', userId);

    if (deleteError) {
      throw new Error(`Failed to delete creation: ${deleteError.message}`);
    }
  }

  /**
   * Extract file path from Supabase storage URL
   */
  private extractFilePath(url: string): string | null {
    const urlParts = url.split('/');
    const pathIndex = urlParts.indexOf('creation-images');
    
    if (pathIndex === -1) {
      return null;
    }

    return urlParts.slice(pathIndex + 1).join('/');
  }
}

