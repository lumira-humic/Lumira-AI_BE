import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../enums/error-code.enum';

export class AppException extends HttpException {
  constructor(
    public readonly errorCode: ErrorCode | string,
    message: string,
    statusCode = HttpStatus.BAD_REQUEST,
  ) {
    super(message, statusCode);
  }
}
