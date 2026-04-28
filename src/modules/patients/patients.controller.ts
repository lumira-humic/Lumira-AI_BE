import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  HttpStatus,
  HttpCode,
  UseGuards,
  Query,
  ForbiddenException,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';

import { ResponseHelper } from '../../common/helpers/response.helper';
import { ApiResponse as ApiResponseType } from '../../common/interfaces/api-response.interface';

import { PatientsService } from './patients.service';
import {
  PatientRequestDto,
  PatientListResponseDto,
  PatientDetailResponseDto,
  PatientDto,
  QueryPatientDto,
} from './dto';
import { RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { User, UserRole } from '../users';
import { Patient } from '../patients/entities/patient.entity';
import { CurrentUser, JwtPayload } from '../auth';

/**
 * Controller for managing patients.
 *
 * Patients represent individuals whose medical records are managed
 * by doctors in the system.
 */
@ApiTags('Patients')
@Controller('patients')
@UseGuards(RolesGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  /**
   * Get list of all patients.
   */
  @Get()
  @ApiBearerAuth('BearerAuth')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  @ApiOperation({
    summary: 'Get list of patients',
    description: 'Retrieve all patients in the system with their latest record status.',
  })
  @ApiResponse({
    status: 200,
    type: PatientListResponseDto,
    isArray: true,
    description: 'List of patients',
  })
  async getPatients(
    @Query() query: QueryPatientDto,
  ): Promise<ApiResponseType<PatientListResponseDto[]>> {
    const result = await this.patientsService.findAll(query);
    return ResponseHelper.paginate<PatientListResponseDto>(
      result.data,
      result.total,
      result.page,
      result.limit,
      'List of patients retrieved successfully',
    );
  }

  /**
   * Create a new patient.
   */
  @Post()
  @ApiBearerAuth('BearerAuth')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('medicalRecordImage', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
          return cb(new BadRequestException('Only JPG/JPEG/PNG allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Add a new patient',
    description: 'Create a new patient record in the system.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'email', 'password'],
      properties: {
        name: { type: 'string', example: 'Budi Santoso' },
        email: { type: 'string', example: 'budi@mail.com' },
        password: { type: 'string', example: 'S3cur3P@ss' },
        phone: { type: 'string', example: '+6281234567890' },
        address: { type: 'string', example: 'Jl. Merdeka No. 10, Jakarta' },
        medicalRecordImage: {
          type: 'string',
          format: 'binary',
          description: 'Optional initial medical record image (JPG/JPEG/PNG)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    type: PatientDto,
    description: 'Patient created successfully',
  })
  @ApiResponse({
    status: 409,
    description: 'Patient already exists',
  })
  async addPatient(
    @Body() dto: PatientRequestDto,
    @UploadedFile() medicalRecordImage: Express.Multer.File | undefined,
    @CurrentUser() user: User,
  ): Promise<ApiResponseType<PatientDto>> {
    const result = await this.patientsService.createPatient(dto, user.id, medicalRecordImage);
    return ResponseHelper.success<PatientDto>(result, 'Created', HttpStatus.CREATED);
  }

  /**
   * Get patient details by ID with all their medical records.
   */
  @Get(':id')
  @ApiBearerAuth('BearerAuth')
  @ApiOperation({
    summary: 'Get a specific patient by ID with their records',
    description: 'Retrieve detailed patient information including all associated medical records.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'string',
    description: 'Patient UUID',
  })
  @ApiResponse({
    status: 200,
    type: PatientDetailResponseDto,
    description: 'Patient details',
  })
  @ApiResponse({
    status: 404,
    description: 'Patient not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden',
  })
  async getPatientById(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiResponseType<PatientDetailResponseDto>> {
    if (user.actorType === 'patient' && user.sub !== id) {
      throw new ForbiddenException('You are not allowed to access this patient');
    }
    const result = await this.patientsService.findById(id);
    return ResponseHelper.success<PatientDetailResponseDto>(
      result,
      'Patient details retrieved successfully',
    );
  }

  /**
   * Update patient information.
   */
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('BearerAuth')
  @ApiOperation({
    summary: 'Update a patient',
    description: 'Modify patient information.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'string',
    description: 'Patient UUID',
  })
  @ApiBody({ type: PatientRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Patient not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden',
  })
  async updatePatient(
    @Param('id') id: string,
    @Body() dto: PatientRequestDto,
    @CurrentUser() user: (User | Patient) & { actorType: string },
  ): Promise<ApiResponseType<PatientDto>> {
    if (user.actorType === 'patient' && user.id !== id) {
      throw new ForbiddenException('You are not allowed to update this patient');
    }

    if (user.actorType === 'user' && (user as User).role === UserRole.DOCTOR) {
      throw new ForbiddenException('Doctor is not allowed to update patient');
    }

    const result = await this.patientsService.update(id, dto, user.id);
    return ResponseHelper.success(result, 'Updated efficiently');
  }

  /**
   * Delete a patient (soft delete).
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('BearerAuth')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Delete a patient',
    description: 'Soft-delete a patient record.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'string',
    description: 'Patient UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Patient not found',
  })
  async deletePatient(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<ApiResponseType<PatientDto>> {
    const result = await this.patientsService.delete(id, user.id);
    return ResponseHelper.success(result, 'Deleted successfully');
  }
}
