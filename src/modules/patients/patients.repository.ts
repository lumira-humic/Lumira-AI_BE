import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Patient } from './entities/patient.entity';
import { generatePrefixedId } from '../../common/utils/id-generator.util';

/**
 * Custom repository for the Patient entity.
 *
 * Extends TypeORM's Repository and provides domain-specific
 * query helpers for the patients table.
 */
@Injectable()
export class PatientsRepository extends Repository<Patient> {
  constructor(
    @InjectRepository(Patient)
    private repository: Repository<Patient>,
  ) {
    super(repository.target, repository.manager, repository.queryRunner);
  }

  /**
   * Retrieve patients with pagination and optional search.
   *
   * @param page - Current page number
   * @param limit - Number of items per page
   * @param search - Optional search keyword (name/email)
   * @returns Tuple of [patients, totalCount]
   */
  // async findAll(
  //   page: number,
  //   limit: number,
  //   search?: string,
  //   status?: 'waitingForReview' | 'needAttention' | 'completed',
  // ): Promise<[Patient[], number]> {
  //   const skip = (page - 1) * limit;

  //   const queryBuilder = this.repository
  //     .createQueryBuilder('patient')
  //     .leftJoinAndSelect(
  //       'patient.medicalRecords',
  //       'rootRecord',
  //       'rootRecord.parent_record_id IS NULL',
  //     )
  //     .leftJoinAndSelect('rootRecord.children', 'childRecord')
  //     .leftJoinAndSelect('childRecord.validator', 'childDoctor')
  //     .leftJoinAndSelect('rootRecord.validator', 'rootDoctor')
  //     .distinct(true);

  //   if (search) {
  //     queryBuilder.andWhere('(patient.name ILIKE :search OR patient.email ILIKE :search)', {
  //       search: `%${search}%`,
  //     });
  //   }

  //   if (status === 'waitingForReview') {
  //     queryBuilder
  //       .andWhere('childRecord.id IS NULL')
  //       .andWhere('LOWER(rootRecord.ai_diagnosis) != :malignant', {
  //         malignant: 'malignant',
  //       });
  //   }

  //   if (status === 'needAttention') {
  //     queryBuilder
  //       .andWhere('childRecord.id IS NULL')
  //       .andWhere('LOWER(rootRecord.ai_diagnosis) = :malignant', {
  //         malignant: 'malignant',
  //       });
  //   }

  //   if (status === 'completed') {
  //     queryBuilder.andWhere('childRecord.id IS NOT NULL');
  //   }

  //   queryBuilder.skip(skip).take(limit).orderBy('patient.createdAt', 'DESC');

  //   return queryBuilder.getManyAndCount();
  // }
  async findAll(page: number, limit: number, search?: string): Promise<[Patient[], number]> {
    const skip = (page - 1) * limit;

    const queryBuilder = this.repository
      .createQueryBuilder('patient')
      .leftJoinAndSelect('patient.medicalRecords', 'record')
      .leftJoinAndSelect('record.validator', 'doctor')
      .distinct(true);

    if (search) {
      queryBuilder.andWhere('(patient.name ILIKE :search OR patient.email ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    queryBuilder.skip(skip).take(limit).orderBy('patient.createdAt', 'DESC');

    return queryBuilder.getManyAndCount();
  }

  /**
   * Create and persist a new patient record.
   *
   * @param data - Partial patient data to persist.
   * @returns The newly created patient.
   */
  async createPatient(data: Partial<Patient>): Promise<Patient> {
    const patient = this.repository.create({
      ...data,
      id: generatePrefixedId('PAS'),
    });
    return this.repository.save(patient);
  }

  /**
   * Retrieve a patient by ID along with all associated medical records.
   *
   * @param id - Patient UUID
   * @returns Patient with related medical recrods (if found), otherwise null
   */
  async findById(id: string): Promise<Patient | null> {
    return this.repository.findOne({
      where: { id },
      relations: {
        medicalRecords: {
          validator: true,
        },
      },
      order: {
        medicalRecords: {
          createdAt: 'DESC',
        },
      },
    });
  }
}
