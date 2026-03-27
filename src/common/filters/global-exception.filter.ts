import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppException } from '../exceptions/base.exception';
import { ErrorCode } from '../enums/error-code.enum';
import { ResponseHelper } from '../helpers/response.helper';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorCode: string = ErrorCode.INTERNAL_SERVER_ERROR;
    let fieldErrors: { field: string; message: string }[] | null = null;
    let stack: string | undefined = undefined;

    if (exception instanceof AppException) {
      statusCode = exception.getStatus();
      message = exception.message;
      errorCode = exception.errorCode;
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse: any = exception.getResponse();
      
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : exceptionResponse.message || exception.message;

      // Handle class-validator ValidationException which outputs array of strings for messages
      if (
        statusCode === HttpStatus.BAD_REQUEST &&
        Array.isArray(exceptionResponse.message)
      ) {
        statusCode = HttpStatus.UNPROCESSABLE_ENTITY; // 422
        errorCode = ErrorCode.VALIDATION_ERROR;
        message = 'Validation failed';
        fieldErrors = exceptionResponse.message.map((msg: string) => {
          // Extract the exact field name based on class-validator's default message structure.
          // e.g. "email must be an email" -> field: "email"
          const fieldName = msg.split(' ')[0];
          return {
            field: fieldName,
            message: msg,
          };
        });
      } else if (statusCode === HttpStatus.NOT_FOUND) {
        errorCode = ErrorCode.NOT_FOUND;
      } else if (statusCode === HttpStatus.FORBIDDEN) {
        errorCode = ErrorCode.FORBIDDEN;
      } else if (statusCode === HttpStatus.UNAUTHORIZED) {
        errorCode = ErrorCode.UNAUTHORIZED;
      } else if (statusCode === HttpStatus.CONFLICT) {
        errorCode = ErrorCode.CONFLICT;
      } else {
        errorCode = 'HTTP_EXCEPTION';
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (
      process.env.NODE_ENV !== 'production' &&
      exception instanceof Error
    ) {
      stack = exception.stack;
    }

    // Logging
    this.logger.error(
      `${request.method} ${request.url} - Status: ${statusCode} Error: ${message}`,
      exception instanceof Error ? exception.stack : '',
    );

    const errorResponse = ResponseHelper.error(
      message,
      statusCode,
      errorCode,
      fieldErrors,
      stack,
    );

    response.status(statusCode).json(errorResponse);
  }
}
