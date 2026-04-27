import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import FormData = require('form-data');

import { ActivityLog } from '../activities/entities/activity-log.entity';
import { MedicalRecordDto, SaveDoctorReviewDto } from './dto';
import { User } from '../users';
import { generatePrefixedId } from '../../common/utils/id-generator.util';
import { ValidationStatus } from './enums';
import { MedicalRecord } from './entities';
import { Patient } from '../patients/entities';
import { CloudinaryStorageService, LocalStorageService } from '../object-storage';

/**
 * Service for medical records and AI analysis workflows.
 */
@Injectable()
export class MedicalRecordsService {
  constructor(
    @InjectRepository(MedicalRecord)
    private readonly medicalRecordRepository: Repository<MedicalRecord>,

    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,

    @InjectRepository(ActivityLog)
    private readonly activityLogRepo: Repository<ActivityLog>,

    private readonly cloudinary: CloudinaryStorageService,
    private readonly localStorage: LocalStorageService,
  ) {}

  /**
   * Upload a medical image and trigger AI analysis.
   */
  async uploadAndAnalyze(
    patientId: string,
    file: Express.Multer.File,
    actorId: string,
  ): Promise<MedicalRecordDto> {
    const patient = await this.patientRepository.findOne({
      where: { id: patientId },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!file.originalname.match(/\.(jpg|jpeg|png)$/i)) {
      throw new BadRequestException('Invalid file extension. Only JPEG, JPG and PNG are allowed');
    }

    const isCloudinary = this.isCloudinary();

    let imageUrl: string;

    if (isCloudinary) {
      const result = await this.cloudinary.uploadBuffer(file.buffer, {
        folder: 'raw',
      });
      imageUrl = result.secure_url;
    } else {
      const result = await this.localStorage.uploadBuffer(file.buffer, {
        folder: 'raw',
      });
      imageUrl = result.secure_url;
    }

    const formData = new FormData();
    formData.append('file', file.buffer, file.originalname);

    type AiResponse = {
      filename: string;
      prediction: number;
      class: 'normal' | 'benign' | 'malignant';
      confidence: number;
      probabilities: number[];
      gradcam_base64: string;
      gradcam_path: string;
      feature_dim: number;
    };
    let aiResult: AiResponse;

    try {
      const response = await axios.post<AiResponse>(
        'https://lumirahumic-integrasi-ai.hf.space/predict',
        formData,
        {
          headers: formData.getHeaders(),
        },
      );
      aiResult = response.data;
    } catch {
      throw new BadRequestException('AI service failed');
    }

    if (!aiResult || !aiResult.class) {
      throw new BadRequestException('Invalid AI response');
    }

    let diagnosis: string;
    switch (aiResult.class) {
      case 'malignant':
        diagnosis = 'Malignant';
        break;
      case 'benign':
        diagnosis = 'Benign';
        break;
      case 'normal':
        diagnosis = 'Normal';
        break;
      default:
        throw new BadRequestException('Unknown AI classification');
    }
    const confidence = aiResult.confidence ?? null;

    let gradcamUrl: string | null = null;
    if (aiResult.gradcam_base64) {
      if (typeof aiResult.gradcam_base64 !== 'string') {
        throw new BadRequestException('Invalid gradcam format');
      }

      const buffer = Buffer.from(aiResult.gradcam_base64, 'base64');

      if (isCloudinary) {
        const result = await this.cloudinary.uploadBuffer(buffer, {
          folder: 'gradcam',
          format: 'png',
        });
        gradcamUrl = result.secure_url;
      } else {
        const result = await this.localStorage.uploadBuffer(buffer, {
          folder: 'gradcam',
          format: 'png',
        });
        gradcamUrl = result.secure_url;
      }
    }

    const record = this.medicalRecordRepository.create({
      id: generatePrefixedId('MED'),
      patientId,
      originalImagePath: imageUrl,
      validationStatus: ValidationStatus.PENDING,
      aiDiagnosis: diagnosis,
      aiConfidence: confidence,
      aiGradcamPath: gradcamUrl ?? null,
      doctorDiagnosis: null,
      doctorNotes: null,
      doctorBrushPath: null,
      isAiAccurate: null,
      validatedAt: null,
    });

    const saved = await this.medicalRecordRepository.save(record);

    // Log activity
    await this.activityLogRepo.save({
      id: generatePrefixedId('ACT'),
      userId: actorId,
      actionType: 'UPLOAD_MEDICAL_RECORD',
      description: `Uploaded medical record for patient ${patient.name}`,
      timestamp: new Date(),
    });

    return this.mapToDto(saved);
  }

  /**
   * Submit doctor review on a medical record.
   */
  async submitDoctorReview(
    id: string,
    dto: SaveDoctorReviewDto,
    user: User,
  ): Promise<MedicalRecordDto> {
    const record = await this.medicalRecordRepository.findOne({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException('Medical record not found');
    }

    const isAgree = dto.agreement === 'agree';

    record.isAiAccurate = isAgree;
    record.doctorNotes = dto.note ?? null;

    if (dto.heatmapImage) {
      if (typeof dto.heatmapImage !== 'string') {
        throw new BadRequestException('Invalid heatmap format');
      }

      const validPrefixes = [
        'data:image/jpeg;base64,',
        'data:image/jpg;base64,',
        'data:image/png;base64,',
      ];
      if (!validPrefixes.some((prefix) => dto.heatmapImage!.startsWith(prefix))) {
        throw new BadRequestException('Invalid heatmap format. Only JPEG, JPG and PNG are allowed');
      }

      const base64 = dto.heatmapImage.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64, 'base64');

      const isCloudinary = this.isCloudinary();

      let maskUrl: string;

      if (isCloudinary) {
        const result = await this.cloudinary.uploadBuffer(buffer, {
          folder: 'mask',
        });
        maskUrl = result.secure_url;
      } else {
        const result = await this.localStorage.uploadBuffer(buffer, {
          folder: 'mask',
        });
        maskUrl = result.secure_url;
      }

      record.doctorBrushPath = maskUrl;
    } else {
      record.doctorBrushPath = null;
    }

    record.validatorId = user.id;
    record.validatedAt = new Date();
    record.validationStatus = isAgree ? ValidationStatus.APPROVED : ValidationStatus.REJECTED;
    record.doctorDiagnosis = isAgree ? record.aiDiagnosis : null;

    const updated = await this.medicalRecordRepository.save(record);

    // Log activity
    await this.activityLogRepo.save({
      id: generatePrefixedId('ACT'),
      userId: user.id,
      actionType: 'VALIDATE_MEDICAL_RECORD',
      description: `${isAgree ? 'Approved' : 'Rejected'} medical record for patient ${
        record.patient?.name ?? record.patientId
      }`,
      timestamp: new Date(),
    });

    return this.mapToDto(updated);
  }

  /**
   * Re-analyze the latest patient image.
   */
  async reanalyzePatient(patientId: string, actorId: string): Promise<MedicalRecordDto> {
    const patient = await this.patientRepository.findOne({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    const record = await this.medicalRecordRepository.findOne({
      where: { patientId },
      order: { uploadedAt: 'DESC' },
    });

    if (!record) {
      throw new NotFoundException('No medical record found for this patient');
    }

    const isCloudinary = this.isCloudinary();

    const imageResponse = await axios.get<ArrayBuffer>(record.originalImagePath, {
      responseType: 'arraybuffer',
    });
    const fileBuffer = Buffer.from(new Uint8Array(imageResponse.data));

    const formData = new FormData();
    formData.append('file', fileBuffer, 'reanalyze.png');

    type AiResponse = {
      filename: string;
      prediction: number;
      class: 'normal' | 'benign' | 'malignant';
      confidence: number;
      probabilities: number[];
      gradcam_base64: string;
      gradcam_path: string;
      feature_dim: number;
    };
    let aiResult: AiResponse;

    try {
      const response = await axios.post<AiResponse>(
        'https://lumirahumic-integrasi-ai.hf.space/predict',
        formData,
        {
          headers: formData.getHeaders(),
        },
      );

      aiResult = response.data;
    } catch (error: unknown) {
      throw new BadRequestException('AI re-analysis failed');
    }

    if (!aiResult || !aiResult.class) {
      throw new BadRequestException('Invalid AI response');
    }

    let diagnosis: string;

    switch (aiResult.class?.toLowerCase()) {
      case 'malignant':
        diagnosis = 'Malignant';
        break;
      case 'benign':
        diagnosis = 'Benign';
        break;
      case 'normal':
        diagnosis = 'Normal';
        break;
      default:
        throw new BadRequestException('Unknown AI classification');
    }

    const confidence = aiResult.confidence ?? null;

    let gradcamUrl: string | null = null;

    if (aiResult.gradcam_base64) {
      if (typeof aiResult.gradcam_base64 !== 'string') {
        throw new BadRequestException('Invalid gradcam format');
      }
      const buffer = Buffer.from(aiResult.gradcam_base64, 'base64');

      if (isCloudinary) {
        const result = await this.cloudinary.uploadBuffer(buffer, {
          folder: 'gradcam',
          format: 'png',
        });
        gradcamUrl = result.secure_url;
      } else {
        const result = await this.localStorage.uploadBuffer(buffer, {
          folder: 'gradcam',
          format: 'png',
        });
        gradcamUrl = result.secure_url;
      }
    }

    record.aiDiagnosis = diagnosis;
    record.aiConfidence = confidence;
    record.aiGradcamPath = gradcamUrl ?? null;

    record.validationStatus = ValidationStatus.PENDING;
    record.doctorDiagnosis = null;
    record.doctorNotes = null;
    record.doctorBrushPath = null;
    record.isAiAccurate = null;
    record.validatedAt = null;

    const updated = await this.medicalRecordRepository.save(record);

    // Log activity
    await this.activityLogRepo.save({
      id: generatePrefixedId('ACT'),
      userId: actorId,
      actionType: 'REANALYZE_MEDICAL_RECORD',
      description: `Re-analyzed medical record for patient ${patient.name}`,
      timestamp: new Date(),
    });

    return this.mapToDto(updated);
  }

  private mapToDto(record: MedicalRecord): MedicalRecordDto {
    return {
      id: record.id,
      patient_id: record.patientId,
      original_image_path: record.originalImagePath,
      validation_status: record.validationStatus,
      ai_diagnosis: record.aiDiagnosis,
      ai_confidence: record.aiConfidence ?? null,
      ai_gradcam_path: record.aiGradcamPath,
      doctor_diagnosis: record.doctorDiagnosis,
      doctor_notes: record.doctorNotes,
      doctor_brush_path: record.doctorBrushPath,
      uploaded_at: record.uploadedAt.toISOString(),
      validated_at: record.validatedAt ? record.validatedAt.toISOString() : null,
    };
  }

  private isCloudinary(): boolean {
    return !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );
  }
}
