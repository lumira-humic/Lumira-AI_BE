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
  ) {}

  /**
   * Retrieve all patients with their latest medical record status.
   */
  async findAll(
    query: QueryPatientDto,
  ): Promise<{ data: PatientListResponseDto[]; total: number; page: number; limit: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const search = query.search;

    const [patients, total] = await this.patientsRepository.findAll(page, limit, search);

    const data = patients.map((patient) => {
      const records = patient.medicalRecords ?? [];
      const latestRecord = records[0];
      return PatientListResponseDto.fromEntity(
        patient,
        latestRecord?.originalImagePath ?? null,
        latestRecord?.validationStatus ?? 'PENDING',
        records,
      );
    });

    return { data, total, page, limit };
  }

  /**
   * Create a new patient.
   */
  async createPatient(dto: PatientRequestDto): Promise<PatientDto> {
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

    // Log activity
    await this.activityLogRepo.save({
      id: generatePrefixedId('ACT'),
      userId: null, // Admin action
      actionType: 'ADD_PATIENT',
      description: `Added new patient: ${dto.name}`,
      timestamp: new Date(),
    });

    return PatientDto.fromEntity(patient);
  }

  /**
   * Retrieve a patient by ID with all their medical records.
   */
  async findById(id: string): Promise<PatientDetailResponseDto> {
    const patient = await this.patientsRepository.findById(id);

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    const records = patient.medicalRecords ?? [];
    const latestRecord: MedicalRecord | undefined = records[0];

    return PatientDetailResponseDto.fromEntity(patient, latestRecord, records);
  }

  /**
   * Update patient information.
   */
  async update(id: string, dto: PatientRequestDto): Promise<PatientDto> {
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
    return PatientDto.fromEntity(updated);
  }

  /**
   * Soft-delete a patient.
   */
  async delete(id: string): Promise<PatientDto> {
    const patient = await this.patientsRepository.findById(id);

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    const dto = PatientDto.fromEntity(patient);
    await this.patientsRepository.softRemove(patient);
    return dto;
  }
}
