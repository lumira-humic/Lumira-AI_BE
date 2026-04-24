import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CloudinaryStorageService } from './cloudinary.service';
import { LocalStorageService } from './local-storage.service';
import { ObjectStorageService } from './object-storage.service';

@Module({
  imports: [ConfigModule],
  providers: [CloudinaryStorageService, LocalStorageService, ObjectStorageService],
  exports: [CloudinaryStorageService, LocalStorageService, ObjectStorageService],
})
export class ObjectStorageModule {}
