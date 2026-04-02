import { HttpStatus } from '@nestjs/common';
import { ApiResponse } from '../interfaces/api-response.interface';
import { ErrorCode } from '../enums/error-code.enum';

export class ResponseHelper {
  static success<T>(data: T, message = 'Success', statusCode = HttpStatus.OK): ApiResponse<T> {
    return {
      status: 'success',
      statusCode,
      message,
      data,
    };
  }

  static paginate<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
    message = 'Data fetched successfully',
  ): ApiResponse<T[]> {
    return {
      status: 'success',
      statusCode: HttpStatus.OK,
      message,
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static error(
    message: string,
    statusCode: number,
    errorCode: string = ErrorCode.INTERNAL_SERVER_ERROR,
    errors?: { field: string; message: string }[] | null,
    stack?: string,
  ): ApiResponse<null> {
    return {
      status: 'error',
      statusCode,
      message,
      errorCode,
      ...(errors && { errors }),
      ...(stack && { stack }),
      data: null,
    };
  }
}
