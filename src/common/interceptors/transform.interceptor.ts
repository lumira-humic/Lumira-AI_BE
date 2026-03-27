import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ResponseHelper } from '../helpers/response.helper';
import { ApiResponse } from '../interfaces/api-response.interface';

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();

    return next.handle().pipe(
      map((data: any) => {
        // If response is undefined/null (e.g. DELETE requests)
        if (data === undefined) {
          return ResponseHelper.success(null as any, 'Success', response.statusCode);
        }

        // If the data is already formatted as ApiResponse (like manually by controller)
        if (
          data &&
          typeof data === 'object' &&
          'status' in data &&
          (data.status === 'success' || data.status === 'error')
        ) {
          return data;
        }

        // Auto-wrap raw data into ApiResponse
        return ResponseHelper.success(data, 'Success', response.statusCode);
      }),
    );
  }
}
