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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
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
import { UserRole } from '../users';
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
  @ApiOperation({
    summary: 'Add a new patient',
    description: 'Create a new patient record in the system.',
  })
  @ApiBody({ type: PatientRequestDto })
  @ApiResponse({
    status: 201,
    type: PatientDto,
    description: 'Patient created successfully',
  })
  @ApiResponse({
    status: 409,
    description: 'Patient already exists',
  })
  async addPatient(@Body() dto: PatientRequestDto): Promise<ApiResponseType<PatientDto>> {
    const result = await this.patientsService.createPatient(dto);
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
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiResponseType<PatientDto>> {
    if (user.actorType === 'patient' && user.sub !== id) {
      throw new ForbiddenException('You are not allowed to update this patient');
    }

    if (user.actorType === 'user' && user.role === UserRole.DOCTOR) {
      throw new ForbiddenException('Doctor is not allowed to  update patient');
    }

    const result = await this.patientsService.update(id, dto);
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
  async deletePatient(@Param('id') id: string): Promise<ApiResponseType<PatientDto>> {
    const result = await this.patientsService.delete(id);
    return ResponseHelper.success(result, 'Deleted successfully');
  }
}
