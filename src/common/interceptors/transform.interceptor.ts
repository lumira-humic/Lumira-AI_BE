import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ResponseHelper } from '../helpers/response.helper';
import { ApiResponse } from '../interfaces/api-response.interface';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<Response>();

    return next.handle().pipe(
      map((data: unknown) => {
        // If response is undefined/null (e.g. DELETE requests)
        if (data === undefined) {
          return ResponseHelper.success(null as T, 'Success', response.statusCode);
        }

        // If the data is already formatted as ApiResponse (like manually by controller)
        if (
          data &&
          typeof data === 'object' &&
          'status' in data &&
          (data.status === 'success' || data.status === 'error')
        ) {
          return data as ApiResponse<T>;
        }

        // Auto-wrap raw data into ApiResponse
        return ResponseHelper.success(data as T, 'Success', response.statusCode);
      }),
    );
  }
}
