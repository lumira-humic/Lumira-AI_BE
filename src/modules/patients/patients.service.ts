import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { ActivityLog } from '../activities/entities/activity-log.entity';
import {
  PatientRequestDto,
  PatientListResponseDto,
  PatientDetailResponseDto,
  PatientDto,
  QueryPatientDto,
} from './dto';
import { PatientsRepository } from './patients.repository';
import { MedicalRecord } from '../medical-records';
import { MedicalRecordsService } from '../medical-records/medical-records.service';
import { AppException, ErrorCode } from '../../common';
import { generatePrefixedId } from '../../common/utils/id-generator.util';

/**
 * Service layer for patient-related business logic.
 */
@Injectable()
export class PatientsService {
  constructor(
    private readonly patientsRepository: PatientsRepository,
    @InjectRepository(ActivityLog)
    private readonly activityLogRepo: Repository<ActivityLog>,
    private readonly medicalRecordsService: MedicalRecordsService,
  ) {}

  /**
   * Retrieve all patients with their latest medical record status.
   */
  // async findAll(
  //   query: QueryPatientDto,
  // ): Promise<{ data: PatientListResponseDto[]; total: number; page: number; limit: number }> {
  //   const page = query.page ?? 1;
  //   const limit = query.limit ?? 10;
  //   const search = query.search;
  //   const status = query.status;

  //   const [patients, total] = await this.patientsRepository.findAll(page, limit, search, status);

  //   const data = patients.map((patient) => {
  //     const records = patient.medicalRecords ?? [];

  //     let finalRecords = this.getFinalMedicalRecords(records);

  //     if (status === 'completed') {
  //       finalRecords = finalRecords.filter((r) => r.validationStatus === 'REVIEWED');
  //     }

  //     const latestRecord = finalRecords.sort(
  //       (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  //     )[0];

  //     return PatientListResponseDto.fromEntity(
  //       patient,
  //       latestRecord?.originalImagePath ?? null,
  //       latestRecord?.validationStatus,
  //       finalRecords,
  //     );
  //   });

  //   return { data, total, page, limit };
  // }
  async findAll(query: QueryPatientDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const search = query.search;
    const status = query.status;

    const [patients] = await this.patientsRepository.findAll(page, limit, search);

    const mapped = patients.map((patient) => {
      const records = patient.medicalRecords ?? [];

      let finalRecords = this.getFinalMedicalRecords(records);

      if (status === 'completed') {
        finalRecords = finalRecords.filter((r) => r.validationStatus === 'REVIEWED');
      }

      if (status === 'waitingForReview') {
        finalRecords = finalRecords.filter(
          (r) => r.validationStatus === 'PENDING' && r.aiDiagnosis?.toLowerCase() !== 'malignant',
        );
      }

      if (status === 'needAttention') {
        finalRecords = finalRecords.filter(
          (r) => r.validationStatus === 'PENDING' && r.aiDiagnosis?.toLowerCase() === 'malignant',
        );
      }

      const latestRecord = finalRecords.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      )[0];

      return {
        patient,
        finalRecords,
        latestRecord,
      };
    });

    const filtered = mapped.filter((item) => item.finalRecords.length > 0);

    const data = filtered.map((item) =>
      PatientListResponseDto.fromEntity(
        item.patient,
        item.latestRecord?.originalImagePath ?? null,
        item.finalRecords,
      ),
    );

    return {
      data,
      total: data.length,
      page,
      limit,
    };
  }

  /**
   * Create a new patient.
   */
  async createPatient(
    dto: PatientRequestDto,
    actorId: string,
    medicalRecordImage?: Express.Multer.File,
  ): Promise<PatientDto> {
    const existingPatient = await this.patientsRepository.findOne({
      where: { email: dto.email },
    });

    if (existingPatient) {
      throw new AppException(
        ErrorCode.USER_ALREADY_EXISTS,
        'Patient with this email already exists',
        409,
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const patient = await this.patientsRepository.createPatient({
      name: dto.name,
      email: dto.email,
      password: hashedPassword, // Temporary
      phone: dto.phone ?? null,
      address: dto.address ?? null,
    });
    if (medicalRecordImage) {
      await this.medicalRecordsService.uploadAndAnalyze(patient.id, medicalRecordImage, actorId);
    }

    // Log activity
    await this.activityLogRepo.save({
      id: generatePrefixedId('ACT'),
      userId: actorId,
      actionType: 'ADD_PATIENT',
      description: `Added new patient: ${dto.name}`,
      timestamp: new Date(),
    });

    return PatientDto.fromEntity(patient);
  }

  /**
   * Retrieve a patient by ID with all their medical records.
   */
  // async findById(id: string): Promise<PatientDetailResponseDto> {
  //   const patient = await this.patientsRepository.findById(id);

  //   if (!patient) {
  //     throw new NotFoundException('Patient not found');
  //   }

  //   const records = patient.medicalRecords ?? [];

  //   const finalRecords = this.getFinalMedicalRecords(records);

  //   const latestRecord = finalRecords.sort(
  //     (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  //   )[0];

  //   return PatientDetailResponseDto.fromEntity(patient, latestRecord, finalRecords);
  // }
  async findById(id: string): Promise<PatientDetailResponseDto> {
    const patient = await this.patientsRepository.findById(id);

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    const records = patient.medicalRecords ?? [];

    const finalRecords = this.getFinalMedicalRecords(records);

    const latestRecord = finalRecords.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    )[0];

    return PatientDetailResponseDto.fromEntity(patient, latestRecord, finalRecords);
  }

  /**
   * Update patient information.
   */
  async update(id: string, dto: PatientRequestDto, actorId: string): Promise<PatientDto> {
    const patient = await this.patientsRepository.findById(id);

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    if (dto.email && dto.email !== patient.email) {
      const existingPatient = await this.patientsRepository.findOne({
        where: { email: dto.email },
      });
      if (existingPatient) {
        throw new AppException(ErrorCode.USER_ALREADY_EXISTS, 'Email already in use', 409);
      }
    }

    patient.name = dto.name;
    patient.email = dto.email;
    patient.phone = dto.phone ?? null;
    patient.address = dto.address ?? null;
    const updated = await this.patientsRepository.save(patient);

    // Log activity
    await this.activityLogRepo.save({
      id: generatePrefixedId('ACT'),
      userId: actorId,
      actionType: 'UPDATE_PATIENT',
      description: `Updated patient info: ${patient.name} (${patient.id})`,
      timestamp: new Date(),
    });

    return PatientDto.fromEntity(updated);
  }

  /**
   * Soft-delete a patient.
   */
  async delete(id: string, actorId: string): Promise<PatientDto> {
    const patient = await this.patientsRepository.findById(id);

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    const dto = PatientDto.fromEntity(patient);
    await this.patientsRepository.softRemove(patient);

    // Log activity
    await this.activityLogRepo.save({
      id: generatePrefixedId('ACT'),
      userId: actorId,
      actionType: 'DELETE_PATIENT',
      description: `Deleted patient: ${patient.name} (${patient.id})`,
      timestamp: new Date(),
    });

    return dto;
  }

  private getFinalMedicalRecords(records: MedicalRecord[]): MedicalRecord[] {
    const result: MedicalRecord[] = [];

    const rootRecords = records.filter((r) => !r.parentRecordId);

    for (const root of rootRecords) {
      const children = records.filter((r) => r.parentRecordId === root.id);

      if (children.length > 0) {
        const latestChild = children.sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
        )[0];

        result.push(latestChild);
      } else {
        result.push(root);
      }
    }

    return result;
  }
}
