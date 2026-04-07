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
} from './dto';
import { RolesGuard } from 'src/common/guards';
import { Roles } from 'src/common/decorators';
import { UserRole } from '../users';

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
  async getPatients(): Promise<ApiResponseType<PatientListResponseDto[]>> {
    const result = await this.patientsService.findAll();
    return ResponseHelper.success<PatientListResponseDto[]>(result, 'List of patients');
  }

  /**
   * Create a new patient.
   */
  @Post()
  @ApiBearerAuth('BearerAuth')
  @HttpCode(HttpStatus.CREATED)
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
  async addPatient(@Body() dto: PatientRequestDto): Promise<ApiResponseType<PatientDto>> {
    const result = await this.patientsService.create(dto);
    return ResponseHelper.success<PatientDto>(result, 'Created', HttpStatus.CREATED);
  }

  /**
   * Get patient details by ID with all their medical records.
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get a specific patient by ID with their records',
    description: 'Retrieve detailed patient information including all associated medical records.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
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
  async getPatientById(
    @Param('id') id: string,
  ): Promise<ApiResponseType<PatientDetailResponseDto>> {
    const result = await this.patientsService.findById(id);
    return ResponseHelper.success<PatientDetailResponseDto>(result, 'Patient details');
  }

  /**
   * Update patient information.
   */
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update a patient',
    description: 'Modify patient information.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
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
  async updatePatient(
    @Param('id') id: string,
    @Body() dto: PatientRequestDto,
  ): Promise<ApiResponseType<null>> {
    await this.patientsService.update(id, dto);
    return ResponseHelper.success<null>(null, 'Updated efficiently');
  }

  /**
   * Delete a patient (soft delete).
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a patient',
    description: 'Soft-delete a patient record.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
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
  async deletePatient(@Param('id') id: string): Promise<ApiResponseType<null>> {
    await this.patientsService.delete(id);
    return ResponseHelper.success<null>(null, 'Deleted successfully');
  }
}
