/**
 * Clean storage service using backend API
 * 
 * Note: We use our backend API instead of @supabase/supabase-js storage methods
 * because the SDK's .upload() method hangs/times out on the client side.
 * The backend uses the service role key which bypasses RLS and is more reliable.
 */

import { getAuthSession } from '@/features/auth/session';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
const SUPABASE_URL = 'https://jqytlypjsoueilbqjqkm.supabase.co';
const STORAGE_BUCKET = 'creation-images';

/**
 * Upload a file to Supabase Storage via backend API
 * 
 * @param file - File or Blob to upload
 * @param path - Path within the bucket (e.g., "userId/filename.png")
 * @param options - Upload options
 * @returns Public URL of the uploaded file
 */
export async function uploadFile(
  file: File | Blob,
  path: string,
  options?: {
    upsert?: boolean;
    contentType?: string;
  }
): Promise<string> {
  const session = getAuthSession();
  if (!session) throw new Error('Not authenticated. Please sign in to upload files.');

  const formData = new FormData();
  formData.append('file', file);
  formData.append('path', path);
  formData.append('upsert', options?.upsert ? 'true' : 'false');
  
  const response = await fetch(`${API_URL}/api/storage/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: formData,
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      `Storage upload failed (${response.status}): ${errorData.error || 'Unknown error'}`
    );
  }
  
  const { url } = await response.json();
  return url;
}

/**
 * Get public URL for a file in storage
 * 
 * @param path - Path within the bucket
 * @returns Public URL
 */
export function getPublicUrl(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
}

/**
 * Delete a file from storage via backend API
 * 
 * @param path - Path within the bucket
 */
export async function deleteFile(path: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/storage/${path}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      `Storage delete failed (${response.status}): ${errorData.error || 'Unknown error'}`
    );
  }
}

