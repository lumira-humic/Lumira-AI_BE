import { applyDecorators, HttpStatus, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ApiMetaDto } from '../dto/api-meta.dto';
import { ApiResponseDto } from '../dto/api-response.dto';

export const ApiPaginatedResponse = <Model extends Type<unknown>>(model: Model) => {
  return applyDecorators(
    ApiExtraModels(ApiResponseDto, ApiMetaDto, model),
    ApiResponse({
      status: HttpStatus.OK,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiResponseDto) },
          {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
              meta: {
                $ref: getSchemaPath(ApiMetaDto),
              },
            },
          },
        ],
      },
    }),
  );
};
