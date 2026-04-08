import {
  Controller,
  Post,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  HttpStatus,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { ResponseHelper } from '../../common/helpers/response.helper';
import { ApiResponse as ApiResponseType } from '../../common/interfaces/api-response.interface';

import { MedicalRecordsService } from './medical-records.service';
import { MedicalRecordDto, SaveDoctorReviewDto } from './dto';
import { RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { UserRole } from '../users';

/**
 * Controller for medical records and AI analysis workflows.
 *
 * Handles ultrasound image upload, AI prediction, and doctor validation.
 */
@ApiTags('Medical Records')
@ApiBearerAuth('BearerAuth')
@UseGuards(RolesGuard)
@Controller()
export class MedicalRecordsController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  /**
   * Upload a medical record image and trigger AI analysis.
   */
  @Post('medical-records/upload')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload a medical record image and trigger AI',
    description: 'Upload an ultrasound image for a patient and initiate AI prediction.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['patient_id', 'file'],
      properties: {
        patient_id: {
          type: 'string',
          format: 'uuid',
          description: 'Patient UUID',
        },
        file: {
          type: 'string',
          format: 'binary',
          description: 'Ultrasound image file',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    type: MedicalRecordDto,
    description: 'Upload successful and AI processing initiated',
  })
  async uploadMedicalRecord(
    @Body('patient_id') patientId: string,
    @UploadedFile() file: unknown,
  ): Promise<ApiResponseType<MedicalRecordDto>> {
    const result = await this.medicalRecordsService.uploadAndAnalyze(patientId, file);
    return ResponseHelper.success(result, 'Upload successful and AI processing initiated');
  }

  /**
   * Submit doctor review for an AI diagnosis.
   */
  @Post('medical-records/:id/review')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit Doctor Review for an AI diagnosis',
    description: 'Doctor validates AI analysis and submits their diagnosis.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Medical Record UUID',
  })
  @ApiBody({ type: SaveDoctorReviewDto })
  @ApiResponse({
    status: 200,
    type: MedicalRecordDto,
    description: 'Review successfully saved',
  })
  @ApiResponse({
    status: 404,
    description: 'Medical record not found',
  })
  async saveDoctorReview(
    @Param('id') id: string,
    @Body() dto: SaveDoctorReviewDto,
  ): Promise<ApiResponseType<MedicalRecordDto>> {
    const result = await this.medicalRecordsService.submitDoctorReview(id, dto);
    return ResponseHelper.success(result, 'Review successfully saved');
  }

  /**
   * Re-run AI analysis on the latest patient image.
   */
  @Post('patients/:id/reanalyze')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Re-run AI analysis on the latest patient image',
    description: 'Trigger re-analysis of the most recent medical record for a patient.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Patient UUID',
  })
  @ApiResponse({
    status: 200,
    type: MedicalRecordDto,
    description: 'Re-analysis successful',
  })
  @ApiResponse({
    status: 404,
    description: 'Patient or medical records not found',
  })
  async reanalyzePatient(
    @Param('id') patientId: string,
  ): Promise<ApiResponseType<MedicalRecordDto>> {
    const result = await this.medicalRecordsService.reanalyzePatient(patientId);
    return ResponseHelper.success(result, 'Re-analysis successful');
  }
}
