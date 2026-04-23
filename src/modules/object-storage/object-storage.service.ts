import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CloudinaryStorageService } from './cloudinary.service';
import { LocalStorageService } from './local-storage.service';
import {
  ObjectStorageMode,
  ObjectStorageUploadOptions,
  StorageUploadResult,
} from './object-storage.types';

@Injectable()
export class ObjectStorageService {
  constructor(
    private readonly configService: ConfigService,
    private readonly cloudinaryStorageService: CloudinaryStorageService,
    private readonly localStorageService: LocalStorageService,
  ) {}

  async uploadBuffer(
    fileBuffer: Buffer,
    options: ObjectStorageUploadOptions = {},
  ): Promise<StorageUploadResult> {
    if (options.resource_type && options.resource_type !== 'image') {
      throw new BadRequestException('Only image uploads are supported');
    }

    const mode = this.getResolvedMode();

    if (mode === 'local') {
      return this.localStorageService.uploadBuffer(fileBuffer, options);
    }

    return this.cloudinaryStorageService.uploadBuffer(fileBuffer, options);
  }

  async destroyAsset(publicId: string): Promise<void> {
    if (!publicId) {
      return;
    }

    if (publicId.startsWith('local:')) {
      await this.localStorageService.destroyAsset(publicId);
      return;
    }

    const mode = this.getResolvedMode();
    if (mode === 'local') {
      return;
    }

    await this.cloudinaryStorageService.destroyAsset(publicId);
  }

  private getResolvedMode(): Exclude<ObjectStorageMode, 'auto'> {
    const modeRaw = this.configService.get<string>('cloudinary.mode', 'auto').toLowerCase();
    const appEnv = this.configService.get<string>('app.env', 'development');

    if (modeRaw === 'cloudinary' || modeRaw === 'local') {
      return modeRaw;
    }

    return appEnv === 'production' ? 'cloudinary' : 'local';
  }
}
