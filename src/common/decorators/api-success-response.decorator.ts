import { applyDecorators, HttpStatus, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ApiResponseDto } from '../dto/api-response.dto';

export const ApiSuccessResponse = <Model extends Type<unknown>>(
  model: Model,
  options?: { status?: number; isArray?: boolean },
) => {
  const isArray = options?.isArray || false;
  const status = options?.status || HttpStatus.OK;

  const dataSchema = isArray
    ? { type: 'array', items: { $ref: getSchemaPath(model) } }
    : { $ref: getSchemaPath(model) };

  return applyDecorators(
    ApiExtraModels(ApiResponseDto, model),
    ApiResponse({
      status,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiResponseDto) },
          {
            properties: {
              data: dataSchema,
            },
          },
        ],
      },
    }),
  );
};
