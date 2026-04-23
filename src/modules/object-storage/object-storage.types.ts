export type ObjectStorageMode = 'auto' | 'cloudinary' | 'local';

export interface StorageUploadResult {
  secure_url: string;
  public_id: string;
}

export interface ObjectStorageUploadOptions {
  resource_type?: 'image';
  format?: string;
  folder?: string;
  public_id?: string;
  use_filename?: boolean;
  unique_filename?: boolean;
  overwrite?: boolean;
}
