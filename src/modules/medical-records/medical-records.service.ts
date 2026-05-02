import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import axios from 'axios';
import FormData = require('form-data');

import { ActivityLog } from '../activities/entities/activity-log.entity';
import { MedicalRecordDto, SaveDoctorReviewDto, UpdateDoctorReviewDto } from './dto';
import { User } from '../users';
import { generatePrefixedId } from '../../common/utils/id-generator.util';
import { ValidationStatus } from './enums';
import { MedicalRecord } from './entities';
import { Patient } from '../patients/entities';
import { CloudinaryStorageService, LocalStorageService } from '../object-storage';

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
      const result = await this.cloudinary.uploadBuffer(file.buffer, { folder: 'raw' });
      imageUrl = result.secure_url;
    } else {
      const result = await this.localStorage.uploadBuffer(file.buffer, { folder: 'raw' });
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
      const response = await axios.post<unknown>(
        'https://lumirahumic-integrasi-ai.hf.space/predict',
        formData,
        { headers: formData.getHeaders() },
      );
      aiResult = this.parseAiResponse(response.data);
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
      agreement: null,
      note: null,
      isAiAccurate: null,
      validatedAt: null,
    });

    const saved = await this.medicalRecordRepository.save(record);

    await this.activityLogRepo.save({
      id: generatePrefixedId('ACT'),
      userId: actorId,
      actionType: 'UPLOAD_MEDICAL_RECORD',
      description: `Uploaded medical record for patient ${patient.name}`,
      timestamp: new Date(),
    });

    // load relasi untuk konsistensi response
    const savedWithRelations = await this.medicalRecordRepository.findOne({
      where: { id: saved.id },
      relations: { validator: true },
    });

    return this.mapToDto(savedWithRelations!);
  }

  async submitDoctorReview(
    id: string,
    dto: SaveDoctorReviewDto,
    user: User,
    doctorBrushFile?: Express.Multer.File,
  ): Promise<MedicalRecordDto> {
    const record = await this.medicalRecordRepository.findOne({
      where: { id },
      relations: { validator: true },
    });

    if (!record) {
      throw new NotFoundException('Medical record not found');
    }

    if (record.parentRecordId) {
      throw new BadRequestException('Cannot review a reviewed record');
    }

    const existingReview = await this.medicalRecordRepository.findOne({
      where: { parentRecordId: id },
    });

    if (existingReview) {
      throw new BadRequestException('This medical record has already been reviewed');
    }

    const aiDiagnosisLower = record.aiDiagnosis?.toLowerCase();

    if (!aiDiagnosisLower) {
      throw new BadRequestException('AI diagnosis not found');
    }

    if (dto.agreement === 'agree' && dto.doctorDiagnosis !== aiDiagnosisLower) {
      throw new BadRequestException(
        'Doctor diagnosis must match AI diagnosis when agreement is agree',
      );
    }

    if (dto.agreement === 'disagree' && dto.doctorDiagnosis === aiDiagnosisLower) {
      throw new BadRequestException(
        'Doctor diagnosis must differ from AI diagnosis when agreement is disagree',
      );
    }

    let brushUrl: string | null = null;

    if (doctorBrushFile) {
      if (!doctorBrushFile.originalname.match(/\.(jpg|jpeg|png)$/i)) {
        throw new BadRequestException('Invalid format. Only JPEG, JPG and PNG are allowed');
      }

      const isCloudinary = this.isCloudinary();
      const result = isCloudinary
        ? await this.cloudinary.uploadBuffer(doctorBrushFile.buffer, { folder: 'mask' })
        : await this.localStorage.uploadBuffer(doctorBrushFile.buffer, { folder: 'mask' });

      brushUrl = result.secure_url;
    }

    const newRecord = this.medicalRecordRepository.create({
      id: generatePrefixedId('MED'),
      patientId: record.patientId,
      parentRecordId: record.id,
      originalImagePath: record.originalImagePath,
      aiDiagnosis: record.aiDiagnosis,
      aiConfidence: record.aiConfidence,
      aiGradcamPath: record.aiGradcamPath,
      uploadedAt: record.uploadedAt,
      validationStatus: ValidationStatus.REVIEWED,
      doctorDiagnosis: dto.doctorDiagnosis.charAt(0).toUpperCase() + dto.doctorDiagnosis.slice(1),
      doctorNotes: dto.note ?? null,
      doctorBrushPath: brushUrl,
      agreement: dto.agreement,
      note: dto.note ?? null,
      isAiAccurate: dto.agreement === 'agree',
      validatorId: user.id,
      validatedAt: new Date(),
    });

    const saved = await this.medicalRecordRepository.save(newRecord);

    await this.activityLogRepo.save({
      id: generatePrefixedId('ACT'),
      userId: user.id,
      actionType: 'VALIDATE_MEDICAL_RECORD',
      description: `Reviewed medical record for patient ${record.patientId}`,
      timestamp: new Date(),
    });

    // load relasi agar validator ter-populate di response
    const savedWithRelations = await this.medicalRecordRepository.findOne({
      where: { id: saved.id },
      relations: { validator: true },
    });

    return this.mapToDto(savedWithRelations!);
  }

  async updateDoctorReview(
    id: string,
    dto: UpdateDoctorReviewDto,
    user: User,
    doctorBrushFile?: Express.Multer.File,
  ): Promise<MedicalRecordDto> {
    const targetRecord = await this.medicalRecordRepository.findOne({
      where: { id },
      relations: { validator: true },
    });

    if (!targetRecord) {
      throw new NotFoundException('Medical record not found');
    }

    const reviewRecord = targetRecord.parentRecordId
      ? targetRecord
      : await this.medicalRecordRepository.findOne({
          where: { parentRecordId: targetRecord.id },
          relations: { validator: true },
        });

    if (!reviewRecord) {
      throw new NotFoundException('Doctor review not found');
    }

    const hasAgreement = Object.prototype.hasOwnProperty.call(dto, 'agreement');
    const hasDoctorDiagnosis = Object.prototype.hasOwnProperty.call(dto, 'doctorDiagnosis');
    const hasNote = Object.prototype.hasOwnProperty.call(dto, 'note');

    if (!hasAgreement && !hasDoctorDiagnosis && !hasNote && !doctorBrushFile) {
      throw new BadRequestException('At least one review field must be provided');
    }

    const nextAgreement = hasAgreement ? dto.agreement : reviewRecord.agreement;
    const currentDoctorDiagnosis = reviewRecord.doctorDiagnosis?.toLowerCase() as
      | 'normal'
      | 'benign'
      | 'malignant'
      | undefined;
    const nextDoctorDiagnosis = hasDoctorDiagnosis ? dto.doctorDiagnosis : currentDoctorDiagnosis;
    const aiDiagnosisLower = reviewRecord.aiDiagnosis?.toLowerCase();

    if (!nextAgreement) {
      throw new BadRequestException('Agreement is required to update this review');
    }

    if (!nextDoctorDiagnosis) {
      throw new BadRequestException('Doctor diagnosis is required to update this review');
    }

    if (!aiDiagnosisLower) {
      throw new BadRequestException('AI diagnosis not found');
    }

    if (nextAgreement === 'agree' && nextDoctorDiagnosis !== aiDiagnosisLower) {
      throw new BadRequestException(
        'Doctor diagnosis must match AI diagnosis when agreement is agree',
      );
    }

    if (nextAgreement === 'disagree' && nextDoctorDiagnosis === aiDiagnosisLower) {
      throw new BadRequestException(
        'Doctor diagnosis must differ from AI diagnosis when agreement is disagree',
      );
    }

    if (doctorBrushFile) {
      if (!doctorBrushFile.originalname.match(/\.(jpg|jpeg|png)$/i)) {
        throw new BadRequestException('Invalid format. Only JPEG, JPG and PNG are allowed');
      }

      const isCloudinary = this.isCloudinary();
      const result = isCloudinary
        ? await this.cloudinary.uploadBuffer(doctorBrushFile.buffer, { folder: 'mask' })
        : await this.localStorage.uploadBuffer(doctorBrushFile.buffer, { folder: 'mask' });

      reviewRecord.doctorBrushPath = result.secure_url;
    }

    reviewRecord.validationStatus = ValidationStatus.REVIEWED;
    reviewRecord.doctorDiagnosis =
      nextDoctorDiagnosis.charAt(0).toUpperCase() + nextDoctorDiagnosis.slice(1);
    reviewRecord.agreement = nextAgreement;
    reviewRecord.isAiAccurate = nextAgreement === 'agree';
    reviewRecord.validatorId = user.id;
    reviewRecord.validatedAt = new Date();

    if (hasNote) {
      reviewRecord.doctorNotes = dto.note ?? null;
      reviewRecord.note = dto.note ?? null;
    }

    const saved = await this.medicalRecordRepository.save(reviewRecord);

    await this.activityLogRepo.save({
      id: generatePrefixedId('ACT'),
      userId: user.id,
      actionType: 'UPDATE_MEDICAL_RECORD_REVIEW',
      description: `Updated review for medical record ${
        reviewRecord.parentRecordId ?? reviewRecord.id
      }`,
      timestamp: new Date(),
    });

    const savedWithRelations = await this.medicalRecordRepository.findOne({
      where: { id: saved.id },
      relations: { validator: true },
    });

    return this.mapToDto(savedWithRelations!);
  }

  async reanalyzePatient(patientId: string, actorId: string): Promise<MedicalRecordDto> {
    const patient = await this.patientRepository.findOne({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    const record = await this.medicalRecordRepository.findOne({
      where: { patientId, parentRecordId: IsNull() },
      order: { createdAt: 'DESC' },
    });

    if (!record) {
      throw new NotFoundException('No medical record found for this patient');
    }

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
      const response = await axios.post<unknown>(
        'https://lumirahumic-integrasi-ai.hf.space/predict',
        formData,
        { headers: formData.getHeaders() },
      );
      aiResult = this.parseAiResponse(response.data);
    } catch {
      throw new BadRequestException('AI re-analysis failed');
    }

    if (!aiResult || !aiResult.class) {
      throw new BadRequestException('Invalid AI response');
    }

    let diagnosis: string;
    switch (aiResult.class.toLowerCase()) {
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
      const isCloudinary = this.isCloudinary();

      const result = isCloudinary
        ? await this.cloudinary.uploadBuffer(buffer, { folder: 'gradcam', format: 'png' })
        : await this.localStorage.uploadBuffer(buffer, { folder: 'gradcam', format: 'png' });

      gradcamUrl = result.secure_url;
    }

    const newRecord = this.medicalRecordRepository.create({
      id: generatePrefixedId('MED'),
      patientId,
      parentRecordId: null,
      originalImagePath: record.originalImagePath,
      aiDiagnosis: diagnosis,
      aiConfidence: confidence,
      aiGradcamPath: gradcamUrl,
      validationStatus: ValidationStatus.PENDING,
      doctorDiagnosis: null,
      doctorNotes: null,
      doctorBrushPath: null,
      agreement: null,
      note: null,
      isAiAccurate: null,
      validatorId: null,
      validatedAt: null,
      uploadedAt: new Date(),
    });

    const saved = await this.medicalRecordRepository.save(newRecord);

    await this.activityLogRepo.save({
      id: generatePrefixedId('ACT'),
      userId: actorId,
      actionType: 'REANALYZE_MEDICAL_RECORD',
      description: `Re-analyzed medical record for patient ${patient.name}`,
      timestamp: new Date(),
    });

    // load relasi untuk konsistensi response (validator akan null tapi tetap konsisten)
    const savedWithRelations = await this.medicalRecordRepository.findOne({
      where: { id: saved.id },
      relations: { validator: true },
    });

    return this.mapToDto(savedWithRelations!);
  }

  private mapToDto(record: MedicalRecord): MedicalRecordDto {
    return {
      id: record.id,
      patient_id: record.patientId,
      parent_record_id: record.parentRecordId,
      original_image_path: record.originalImagePath,
      validation_status: record.validationStatus,
      ai_diagnosis: record.aiDiagnosis,
      ai_confidence: record.aiConfidence ?? null,
      ai_gradcam_path: record.aiGradcamPath,
      doctor_diagnosis: record.doctorDiagnosis,
      doctor_notes: record.doctorNotes,
      doctor_brush_path: record.doctorBrushPath,
      agreement: record.agreement,
      note: record.note,
      uploaded_at: record.uploadedAt.toISOString(),
      validated_at: record.validatedAt ? record.validatedAt.toISOString() : null,
      doctor: record.validator
        ? {
            id: record.validator.id,
            name: record.validator.name,
            email: record.validator.email,
            status: record.validator.status,
          }
        : null,
    };
  }

  private parseAiResponse(data: unknown): {
    filename: string;
    prediction: number;
    class: 'normal' | 'benign' | 'malignant';
    confidence: number;
    probabilities: number[];
    gradcam_base64: string;
    gradcam_path: string;
    feature_dim: number;
  } {
    if (!data || typeof data !== 'object') {
      throw new BadRequestException('Invalid AI response');
    }

    const payload = data as Record<string, unknown>;
    const classValue = payload.class;

    if (classValue !== 'normal' && classValue !== 'benign' && classValue !== 'malignant') {
      throw new BadRequestException('Invalid AI response');
    }

    return {
      filename: typeof payload.filename === 'string' ? payload.filename : '',
      prediction: typeof payload.prediction === 'number' ? payload.prediction : 0,
      class: classValue,
      confidence: typeof payload.confidence === 'number' ? payload.confidence : 0,
      probabilities: Array.isArray(payload.probabilities)
        ? payload.probabilities.filter((x): x is number => typeof x === 'number')
        : [],
      gradcam_base64: typeof payload.gradcam_base64 === 'string' ? payload.gradcam_base64 : '',
      gradcam_path: typeof payload.gradcam_path === 'string' ? payload.gradcam_path : '',
      feature_dim: typeof payload.feature_dim === 'number' ? payload.feature_dim : 0,
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
