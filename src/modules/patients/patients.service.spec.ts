import { PatientsService } from './patients.service';
import { PatientsRepository } from './patients.repository';
import { MedicalRecordsService } from '../medical-records/medical-records.service';
import { MedicalRecord } from '../medical-records/entities/medical-record.entity';
import { Patient } from './entities/patient.entity';

const makeRecord = (id: string, patientId: string): MedicalRecord =>
  ({
    id,
    patientId,
    parentRecordId: null,
    originalImagePath: `uploads/${id}.png`,
    validationStatus: 'PENDING',
    aiDiagnosis: 'benign',
    aiConfidence: 0.9,
    aiGradcamPath: null,
    doctorDiagnosis: null,
    doctorNotes: null,
    doctorBrushPath: null,
    agreement: null,
    note: null,
    validator: null,
    uploadedAt: new Date(),
    validatedAt: null,
    createdAt: new Date(),
  } as MedicalRecord);

const makePatient = (index: number): Patient =>
  ({
    id: `PAS-${index}`,
    name: `Patient ${index}`,
    email: `patient${index}@mail.com`,
    phone: null,
    address: null,
    medicalRecords: [makeRecord(`REC-${index}`, `PAS-${index}`)],
  } as Patient);

describe('PatientsService.findAll', () => {
  it.each([10, 15, 20])('returns %s items for page 1', async (limit) => {
    const patients = Array.from({ length: 25 }, (_, i) => makePatient(i + 1));

    const patientsRepository = {
      findAllWithRecords: jest.fn().mockResolvedValue(patients),
    } as unknown as PatientsRepository;

    const service = new PatientsService(
      patientsRepository,
      {} as never,
      {} as MedicalRecordsService,
    );

    const result = await service.findAll({ page: 1, limit });

    expect(result.data).toHaveLength(limit);
    expect(result.total).toBe(25);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(limit);
  });
});
