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
      .select('id, user_id, title, description, width, height, original_image_url, preview_image_url, rendered_image_url, sharing_status, filter_options, created_at, updated_at')
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
      .select('id, user_id, title, description, width, height, original_image_url, preview_image_url, rendered_image_url, sharing_status, filter_options, created_at, updated_at')
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
   * Returns null if creation is not link-sharable or gallery-sharable
   * Joins with user_profiles to include display name
   */
  async getPublicCreationById(creationId: string): Promise<Creation | null> {
    const { data, error } = await this.supabase
      .from('creations')
      .select(`
        id, 
        user_id, 
        title, 
        description, 
        width, 
        height, 
        original_image_url, 
        preview_image_url, 
        rendered_image_url, 
        sharing_status, 
        filter_options, 
        created_at, 
        updated_at,
        user_profiles(display_name)
      `)
      .eq('id', creationId)
      .in('sharing_status', ['link', 'gallery'])
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found or not link/gallery sharable
      }
      throw new Error(`Failed to fetch creation: ${error.message}`);
    }

    // Flatten the nested user_profiles object
    return {
      id: data.id,
      user_id: data.user_id,
      title: data.title,
      description: data.description,
      width: data.width,
      height: data.height,
      original_image_url: data.original_image_url,
      preview_image_url: data.preview_image_url,
      rendered_image_url: data.rendered_image_url,
      sharing_status: data.sharing_status,
      filter_options: data.filter_options,
      created_at: data.created_at,
      updated_at: data.updated_at,
      display_name: (data as any).user_profiles?.display_name || 'Anonymous'
    };
  }

  /**
   * Get all gallery creations (no authentication required)
   * Returns list of gallery creations with pagination
   * Joins with user_profiles to include display name
   */
  async getPublicCreations(page: number = 1, limit: number = 20): Promise<{ creations: Creation[]; total: number }> {
    const offset = (page - 1) * limit;

    // Get total count
    const { count, error: countError } = await this.supabase
      .from('creations')
      .select('*', { count: 'exact', head: true })
      .eq('sharing_status', 'gallery');

    if (countError) {
      throw new Error(`Failed to count creations: ${countError.message}`);
    }

    // Get creations with user profile display name via PostgREST join
    const { data, error } = await this.supabase
      .from('creations')
      .select(`
        id, 
        user_id, 
        title, 
        description, 
        width, 
        height, 
        original_image_url, 
        preview_image_url, 
        rendered_image_url, 
        sharing_status, 
        filter_options, 
        created_at, 
        updated_at,
        user_profiles(display_name)
      `)
      .eq('sharing_status', 'gallery')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch creations: ${error.message}`);
    }

    // Flatten the nested user_profiles object
    const creations = (data || []).map((creation: any) => ({
      id: creation.id,
      user_id: creation.user_id,
      title: creation.title,
      description: creation.description,
      width: creation.width,
      height: creation.height,
      original_image_url: creation.original_image_url,
      preview_image_url: creation.preview_image_url,
      rendered_image_url: creation.rendered_image_url,
      sharing_status: creation.sharing_status,
      filter_options: creation.filter_options,
      created_at: creation.created_at,
      updated_at: creation.updated_at,
      display_name: creation.user_profiles?.display_name || 'Anonymous'
    }));

    return {
      creations,
      total: count || 0,
    };
  }

  /**
   * Get all gallery creations for a specific creator/user (no authentication required)
   * Returns list of gallery creations with pagination filtered by creator
   * Joins with user_profiles to include display name
   */
  async getCreatorPublicCreations(creatorId: string, page: number = 1, limit: number = 20): Promise<{ creations: Creation[]; total: number; displayName: string | null }> {
    const offset = (page - 1) * limit;

    // Get total count for this creator
    const { count, error: countError } = await this.supabase
      .from('creations')
      .select('*', { count: 'exact', head: true })
      .eq('sharing_status', 'gallery')
      .eq('user_id', creatorId);

    if (countError) {
      throw new Error(`Failed to count creations: ${countError.message}`);
    }

    // Get creations with user profile display name via PostgREST join
    const { data, error } = await this.supabase
      .from('creations')
      .select(`
        id, 
        user_id, 
        title, 
        description, 
        width, 
        height, 
        original_image_url, 
        preview_image_url, 
        rendered_image_url, 
        sharing_status, 
        filter_options, 
        created_at, 
        updated_at,
        user_profiles(display_name)
      `)
      .eq('sharing_status', 'gallery')
      .eq('user_id', creatorId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch creations: ${error.message}`);
    }

    // Flatten the nested user_profiles object
    const creations = (data || []).map((creation: any) => ({
      id: creation.id,
      user_id: creation.user_id,
      title: creation.title,
      description: creation.description,
      width: creation.width,
      height: creation.height,
      original_image_url: creation.original_image_url,
      preview_image_url: creation.preview_image_url,
      rendered_image_url: creation.rendered_image_url,
      sharing_status: creation.sharing_status,
      filter_options: creation.filter_options,
      created_at: creation.created_at,
      updated_at: creation.updated_at,
      display_name: creation.user_profiles?.display_name || 'Anonymous'
    }));

    // Get display name from first creation or fetch it separately
    let displayName: string | null = null;
    if (creations.length > 0) {
      displayName = creations[0].display_name;
    } else {
      // If no creations, fetch user profile directly
      const { data: profile } = await this.supabase
        .from('user_profiles')
        .select('display_name')
        .eq('user_id', creatorId)
        .single();
      displayName = profile?.display_name || null;
    }

    return {
      creations,
      total: count || 0,
      displayName,
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

