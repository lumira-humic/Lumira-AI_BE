import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, rm, writeFile } from 'fs/promises';
import { dirname, join } from 'path';

import { ObjectStorageUploadOptions, StorageUploadResult } from './object-storage.types';

interface LocalStorageConfig {
  uploadFolder: string;
  localUploadDir: string;
  localBaseUrl: string;
}

@Injectable()
export class LocalStorageService {
  private readonly localConfig: LocalStorageConfig;

  constructor(private readonly configService: ConfigService) {
    const configRaw: unknown = this.configService.get('cloudinary');
    this.localConfig = this.normalizeConfig(configRaw);
  }

  async uploadBuffer(
    fileBuffer: Buffer,
    options: ObjectStorageUploadOptions = {},
  ): Promise<StorageUploadResult> {
    const folder = this.sanitizePathSegment(
      typeof options.folder === 'string' ? options.folder : this.localConfig.uploadFolder,
    );
    const configuredPublicId =
      typeof options.public_id === 'string' && options.public_id.length > 0
        ? options.public_id
        : `${Date.now()}`;
    const publicId = this.sanitizePathSegment(configuredPublicId);
    const format = this.normalizeImageFormat(options.format);
    const filename = format ? `${this.stripFileExtension(publicId)}.${format}` : publicId;
    const relativePath = folder ? `${folder}/${filename}` : filename;

    const uploadRoot = join(process.cwd(), this.localConfig.localUploadDir);
    const absolutePath = join(uploadRoot, relativePath);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, fileBuffer);

    const baseUrl = this.resolvePublicBaseUrl(this.localConfig.localBaseUrl);
    return {
      secure_url: `${baseUrl}/${relativePath}`,
      public_id: `local:${relativePath}`,
    };
  }

  async destroyAsset(publicId: string): Promise<void> {
    if (!publicId || !publicId.startsWith('local:')) {
      return;
    }

    const localRelativePath = publicId.replace(/^local:/, '');
    const safePath = this.sanitizePathSegment(localRelativePath);
    const absolutePath = join(process.cwd(), this.localConfig.localUploadDir, safePath);
    await rm(absolutePath, { force: true });
  }

  private normalizeConfig(configRaw: unknown): LocalStorageConfig {
    const configObject = this.asRecord(configRaw);

    return {
      uploadFolder: this.getString(configObject, 'uploadFolder') || 'lumira-ai',
      localUploadDir: this.getString(configObject, 'localUploadDir') || 'uploads',
      localBaseUrl: this.getString(configObject, 'localBaseUrl') || '/uploads',
    };
  }

  private sanitizePathSegment(value: string): string {
    return value
      .replace(/\\/g, '/')
      .split('/')
      .filter((segment) => segment && segment !== '.' && segment !== '..')
      .join('/');
  }

  private resolvePublicBaseUrl(baseUrl: string): string {
    const normalized = baseUrl.trim();
    if (!normalized) {
      return this.resolvePublicBaseUrl('/uploads');
    }

    if (/^https?:\/\//i.test(normalized)) {
      return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
    }

    const relativeBasePath = normalized.startsWith('/') ? normalized : `/${normalized}`;
    const appBaseUrl = this.getAppBaseUrl();
    return `${appBaseUrl}${
      relativeBasePath.endsWith('/') ? relativeBasePath.slice(0, -1) : relativeBasePath
    }`;
  }

  private getAppBaseUrl(): string {
    const configuredBaseUrl = this.configService.get<string>('app.baseUrl', '').trim();
    if (configuredBaseUrl) {
      return configuredBaseUrl.endsWith('/') ? configuredBaseUrl.slice(0, -1) : configuredBaseUrl;
    }

    const port = this.configService.get<number>('app.port', 3000);
    return `http://localhost:${port}`;
  }

  private normalizeImageFormat(format?: string): string {
    if (!format || typeof format !== 'string') {
      return '';
    }

    const normalized = format.trim().toLowerCase();
    if (normalized === 'jpeg') {
      return 'jpg';
    }

    return normalized;
  }

  private stripFileExtension(filePath: string): string {
    const sanitized = this.sanitizePathSegment(filePath);
    return sanitized.replace(/\.[a-z0-9]+$/i, '');
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  }

  private getString(source: Record<string, unknown>, key: string): string {
    const value = source[key];
    return typeof value === 'string' ? value : '';
  }
}
