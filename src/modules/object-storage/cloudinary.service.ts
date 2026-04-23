import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UploadApiErrorResponse, UploadApiOptions, v2 as cloudinary } from 'cloudinary';

import { ObjectStorageUploadOptions, StorageUploadResult } from './object-storage.types';

interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  uploadPrefix: string;
  uploadTimeoutMs: number;
}

interface CloudinaryDestroyResponse {
  result?: string;
}

@Injectable()
export class CloudinaryStorageService {
  private readonly cloudinaryConfig: CloudinaryConfig;

  constructor(private readonly configService: ConfigService) {
    const configRaw: unknown = this.configService.get('cloudinary');
    this.cloudinaryConfig = this.normalizeConfig(configRaw);

    const { cloudName, apiKey, apiSecret, uploadPrefix } = this.cloudinaryConfig;

    if (cloudName && apiKey && apiSecret) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
        ...(uploadPrefix ? { upload_prefix: uploadPrefix } : {}),
      });
    }
  }

  async uploadBuffer(
    fileBuffer: Buffer,
    options: ObjectStorageUploadOptions = {},
  ): Promise<StorageUploadResult> {
    this.assertCloudinaryConfigured();
    const timeout = this.cloudinaryConfig.uploadTimeoutMs;
    const cloudinaryOptions: UploadApiOptions = {
      timeout,
      ...options,
    };

    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      cloudinary.uploader
        .upload_stream(cloudinaryOptions, (error: UploadApiErrorResponse | undefined, result: any) => {
          if (error) {
            return reject(
              new InternalServerErrorException(
                `Cloudinary upload failed: ${error.message || 'Unknown error'}`,
              ),
            );
          }

          if (!result) {
            return reject(new InternalServerErrorException('Cloudinary upload returned no result'));
          }

          return resolve(result);
        })
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        .end(fileBuffer);
    });
  }

  async destroyAsset(publicId: string): Promise<void> {
    if (!publicId) {
      return;
    }

    this.assertCloudinaryConfigured();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const response: unknown = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
      invalidate: true,
    });
    const result = this.extractDestroyResult(response);

    if (result !== 'ok' && result !== 'not found') {
      throw new InternalServerErrorException(
        `Cloudinary destroy failed for public_id ${publicId}: ${result}`,
      );
    }
  }

  private assertCloudinaryConfigured(): void {
    const { cloudName, apiKey, apiSecret } = this.cloudinaryConfig;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new InternalServerErrorException(
        'Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
      );
    }
  }

  private normalizeConfig(configRaw: unknown): CloudinaryConfig {
    const configObject = this.asRecord(configRaw);

    return {
      cloudName: this.getString(configObject, 'cloudName'),
      apiKey: this.getString(configObject, 'apiKey'),
      apiSecret: this.getString(configObject, 'apiSecret'),
      uploadPrefix: this.getString(configObject, 'uploadPrefix'),
      uploadTimeoutMs: this.getNumber(configObject, 'uploadTimeoutMs', 60000),
    };
  }

  private extractDestroyResult(response: unknown): string {
    const parsed = this.asRecord(response) as CloudinaryDestroyResponse;
    return typeof parsed.result === 'string' ? parsed.result : 'unknown';
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  }

  private getString(source: Record<string, unknown>, key: string): string {
    const value = source[key];
    return typeof value === 'string' ? value : '';
  }

  private getNumber(source: Record<string, unknown>, key: string, fallback: number): number {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return value;
    }

    return fallback;
  }
}
