import { supabase, STORAGE_BUCKET } from '../config/supabase.config';
import path from 'path';

/**
 * Upload a single file to Supabase Storage
 * @param file - The file buffer and metadata from multer
 * @param folder - Optional folder path within the bucket
 * @returns Public URL of the uploaded file
 */
export const uploadToSupabase = async (
  file: Express.Multer.File,
  folder: string = 'products'
): Promise<string> => {
  try {
    // Generate unique filename
    const fileExt = path.extname(file.originalname);
    const fileName = `${folder}/${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExt}`;

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading to Supabase:', error);
    throw error;
  }
};

/**
 * Upload multiple files to Supabase Storage
 * @param files - Array of files from multer
 * @param folder - Optional folder path within the bucket
 * @returns Array of public URLs
 */
export const uploadMultipleToSupabase = async (
  files: Express.Multer.File[],
  folder: string = 'products'
): Promise<string[]> => {
  try {
    const uploadPromises = files.map((file) => uploadToSupabase(file, folder));
    const urls = await Promise.all(uploadPromises);
    return urls;
  } catch (error) {
    console.error('Error uploading multiple files to Supabase:', error);
    throw error;
  }
};

/**
 * Delete a file from Supabase Storage
 * @param fileUrl - The public URL of the file to delete
 * @returns True if successful
 */
export const deleteFromSupabase = async (fileUrl: string): Promise<boolean> => {
  try {
    // Extract file path from URL
    // URL format: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
    const urlParts = fileUrl.split(`/storage/v1/object/public/${STORAGE_BUCKET}/`);
    if (urlParts.length < 2) {
      throw new Error('Invalid Supabase URL format');
    }
    const filePath = urlParts[1];

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([filePath]);

    if (error) {
      console.error('Supabase delete error:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }

    return true;
  } catch (error) {
    console.error('Error deleting from Supabase:', error);
    throw error;
  }
};

/**
 * Delete multiple files from Supabase Storage
 * @param fileUrls - Array of public URLs to delete
 * @returns True if all deletions successful
 */
export const deleteMultipleFromSupabase = async (
  fileUrls: string[]
): Promise<boolean> => {
  try {
    const deletePromises = fileUrls.map((url) => deleteFromSupabase(url));
    await Promise.all(deletePromises);
    return true;
  } catch (error) {
    console.error('Error deleting multiple files from Supabase:', error);
    throw error;
  }
};
