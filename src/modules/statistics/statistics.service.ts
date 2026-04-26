import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';

import { ActivityLog } from '../activities/entities/activity-log.entity';
import { MedicalRecord } from '../medical-records/entities/medical-record.entity';
import { ValidationStatus } from '../medical-records/enums/validation-status.enum';
import { Patient } from '../patients/entities/patient.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';

import { ActivityLogDto, DoctorStatsDto, DashboardStatsDto } from './dto';

/**
 * Service for statistics and reporting.
 *
 * Queries are read-only aggregations — no mutations performed here.
 */
@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly activityLogRepo: Repository<ActivityLog>,

    @InjectRepository(MedicalRecord)
    private readonly medicalRecordRepo: Repository<MedicalRecord>,

    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /**
   * Get the 10 most recent activity log entries.
   */
  async getActivityLogs(): Promise<ActivityLogDto[]> {
    const logs = await this.activityLogRepo.find({
      order: { timestamp: 'DESC' },
      take: 10,
      relations: ['user'],
    });

    return logs.map((log) => {
      const dto = new ActivityLogDto();
      dto.id = log.id;
      dto.title = log.description ?? log.actionType ?? 'System Action';
      dto.user = log.user?.name ?? log.userId ?? 'System';
      dto.time = this.getRelativeTime(log.timestamp ?? log.createdAt);
      return dto;
    });
  }

  /**
   * Get admin dashboard statistics (system-wide KPIs).
   *
   * Returns: Total Patients, Total Doctors, Total Scans,
   *          Pending Validations, Approved Records, Rejected Records.
   */
  async getDashboardStats(): Promise<DashboardStatsDto> {
    const [totalPatients, totalDoctors] = await Promise.all([
      this.patientRepo.count(),
      this.userRepo.count({ where: { role: UserRole.DOCTOR } }),
    ]);

    return {
      totalDoctors,
      totalPatients,
    };
  }

  /**
   * Get doctor-specific KPI statistics for the given doctor.
   *
   * @param doctorId - ID of the authenticated doctor (from JWT).
   */
  /**
   * Get statistics for a doctor, or for admin: aggregate of unassigned records.
   */
  async getDoctorStats(user: User): Promise<DoctorStatsDto> {
    if (user.role === UserRole.ADMIN) {
      // For admin: aggregate stats of all unassigned (pending) records
      const [total, pending] = await Promise.all([
        this.medicalRecordRepo.count({ where: { validatorId: IsNull() } }),
        this.medicalRecordRepo.count({
          where: { validatorId: IsNull(), validationStatus: ValidationStatus.PENDING },
        }),
      ]);
      return { total, pending, completed: 0, attention: 0 };
    }

    // For doctor: their assigned records
    const doctorId = user.id;
    const [total, pending, completed, attention] = await Promise.all([
      // All records this doctor has validated (or been assigned to)
      this.medicalRecordRepo.count({ where: { validatorId: doctorId } }),
      // Records still waiting for this doctor's validation
      this.medicalRecordRepo.count({
        where: { validatorId: doctorId, validationStatus: ValidationStatus.PENDING },
      }),
      // Records already approved or reviewed by this doctor
      this.medicalRecordRepo
        .createQueryBuilder('mr')
        .where('mr.validator_id = :doctorId', { doctorId })
        .andWhere('mr.validation_status IN (:...statuses)', {
          statuses: [ValidationStatus.APPROVED, ValidationStatus.REVIEWED],
        })
        .getCount(),
      // Records rejected (requiring attention / follow-up)
      this.medicalRecordRepo.count({
        where: { validatorId: doctorId, validationStatus: ValidationStatus.REJECTED },
      }),
    ]);

    return { total, pending, completed, attention };
  }

  // ──────────────────────────── Helpers ────────────────────────────

  private getRelativeTime(date: Date | null): string {
    if (!date) return 'Unknown';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  }

  private resolveIconColor(actionType: string | null): string {
    if (!actionType) return 'gray';
    const type = actionType.toUpperCase();
    if (type.includes('UPLOAD') || type.includes('ADD')) return 'blue';
    if (type.includes('VALIDATE') || type.includes('APPROVE')) return 'green';
    if (type.includes('REJECT')) return 'red';
    if (type.includes('DELETE') || type.includes('REMOVE')) return 'orange';
    return 'gray';
  }
}
