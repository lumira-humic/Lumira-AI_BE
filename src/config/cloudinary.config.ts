import { registerAs } from '@nestjs/config';

export const cloudinaryConfig = registerAs('cloudinary', () => ({
  mode: process.env.OBJECT_STORAGE_MODE || 'auto',
  cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  apiKey: process.env.CLOUDINARY_API_KEY || '',
  apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  uploadFolder: process.env.CLOUDINARY_UPLOAD_FOLDER || 'lumira-ai',
  uploadPrefix: process.env.CLOUDINARY_UPLOAD_PREFIX || '',
  uploadTimeoutMs: parseInt(process.env.CLOUDINARY_UPLOAD_TIMEOUT_MS || '60000', 10),
  localUploadDir: process.env.OBJECT_STORAGE_LOCAL_UPLOAD_DIR || 'uploads',
  localBaseUrl: process.env.OBJECT_STORAGE_LOCAL_BASE_URL || '/uploads',
}));

export default cloudinaryConfig;
