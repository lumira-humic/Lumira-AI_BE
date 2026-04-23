import { BadRequestException, HttpStatus, ParseFilePipeBuilder } from '@nestjs/common';

export const MAX_IMAGE_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_MIME_REGEX = /^image\/(png|jpe?g|webp)$/i;

const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

export interface UploadedBinaryFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export function buildImageParseFilePipe(fileIsRequired: boolean) {
  return new ParseFilePipeBuilder()
    .addFileTypeValidator({ fileType: ALLOWED_IMAGE_MIME_REGEX })
    .addMaxSizeValidator({ maxSize: MAX_IMAGE_UPLOAD_SIZE_BYTES })
    .build({
      fileIsRequired,
      errorHttpStatusCode: HttpStatus.BAD_REQUEST,
    });
}

export function validateUploadedImage(file: unknown): UploadedBinaryFile {
  if (!file || typeof file !== 'object') {
    throw new BadRequestException('Image file is invalid');
  }

  const candidate = file as Partial<UploadedBinaryFile>;
  const { buffer, mimetype, size, originalname } = candidate;

  const hasBuffer = Buffer.isBuffer(buffer);
  const hasMimeType = typeof mimetype === 'string' && mimetype.length > 0;

  if (!hasBuffer || !hasMimeType) {
    throw new BadRequestException('Invalid uploaded image file');
  }

  const mimeType = mimetype.toLowerCase();
  if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
    throw new BadRequestException('Only JPG, JPEG, PNG, or WEBP image uploads are allowed');
  }

  const fileSize = typeof size === 'number' && size > 0 ? size : buffer.byteLength;
  if (fileSize > MAX_IMAGE_UPLOAD_SIZE_BYTES) {
    throw new BadRequestException('Image file size exceeds 5MB limit');
  }

  return {
    originalname:
      typeof originalname === 'string' && originalname.length > 0 ? originalname : 'upload',
    mimetype: mimeType,
    size: fileSize,
    buffer,
  };
}
