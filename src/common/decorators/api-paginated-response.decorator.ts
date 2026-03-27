import { applyDecorators, Type, HttpStatus } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ApiResponseDto } from '../dto/api-response.dto';
import { ApiMetaDto } from '../dto/api-meta.dto';

export const ApiPaginatedResponse = <Model extends Type<any>>(model: Model) => {
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
