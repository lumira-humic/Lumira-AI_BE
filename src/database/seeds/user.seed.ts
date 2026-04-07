import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from '../../modules/users/entities/user.entity';
import { UserRole } from '../../modules/users/enums/user-role.enum';
import { UserStatus } from '../../modules/users/enums/user-status.enum';
import { Patient } from '../../modules/patients/entities/patient.entity';

/**
 * Seeds admin, doctor and patient records from environment variables.
 *
 * Environment variables (optional per-role):
 * - Admin: `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`
 * - Doctor: `SEED_DOCTOR_NAME`, `SEED_DOCTOR_EMAIL`, `SEED_DOCTOR_PASSWORD`
 * - Patient: `SEED_PATIENT_NAME`, `SEED_PATIENT_EMAIL`, `SEED_PATIENT_PASSWORD`
 */
export async function seedUsers(dataSource: DataSource): Promise<void> {
  const userRepository = dataSource.getRepository(User);
  const patientRepository = dataSource.getRepository(Patient);

  // Admin
  try {
    const adminName = process.env.SEED_ADMIN_NAME;
    const adminEmail = process.env.SEED_ADMIN_EMAIL;
    const adminPassword = process.env.SEED_ADMIN_PASSWORD;

    if (adminName && adminEmail && adminPassword) {
      const adminExists = await userRepository.findOne({ where: { email: adminEmail } });
      if (!adminExists) {
        const hashed = await bcrypt.hash(adminPassword, 10);
        const admin = userRepository.create({
          name: adminName,
          email: adminEmail,
          password: hashed,
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
        });
        await userRepository.save(admin);
        console.log(`[Seed] Admin user created → ${adminEmail}`);
      } else {
        console.log(`[Seed] Admin user already exists → skipping (${adminEmail})`);
      }
    } else {
      console.log('[Seed] Admin env vars not fully defined → skipping admin seed');
    }
  } catch (err) {
    console.error('[Seed] Error seeding admin:', err);
  }

  // Doctor
  try {
    const doctorName = process.env.SEED_DOCTOR_NAME;
    const doctorEmail = process.env.SEED_DOCTOR_EMAIL;
    const doctorPassword = process.env.SEED_DOCTOR_PASSWORD;

    if (doctorName && doctorEmail && doctorPassword) {
      const docExists = await userRepository.findOne({ where: { email: doctorEmail } });
      if (!docExists) {
        const hashed = await bcrypt.hash(doctorPassword, 10);
        const doctor = userRepository.create({
          name: doctorName,
          email: doctorEmail,
          password: hashed,
          role: UserRole.DOCTOR,
          status: UserStatus.ACTIVE,
        });
        await userRepository.save(doctor);
        console.log(`[Seed] Doctor user created → ${doctorEmail}`);
      } else {
        console.log(`[Seed] Doctor user already exists → skipping (${doctorEmail})`);
      }
    } else {
      console.log('[Seed] Doctor env vars not fully defined → skipping doctor seed');
    }
  } catch (err) {
    console.error('[Seed] Error seeding doctor:', err);
  }

  // Patient
  try {
    const patientName = process.env.SEED_PATIENT_NAME;
    const patientEmail = process.env.SEED_PATIENT_EMAIL;
    const patientPassword = process.env.SEED_PATIENT_PASSWORD;

    if (patientName && patientEmail && patientPassword) {
      const patientExists = await patientRepository.findOne({ where: { email: patientEmail } });
      if (!patientExists) {
        const hashed = await bcrypt.hash(patientPassword, 10);
        const patient = patientRepository.create({
          name: patientName,
          email: patientEmail,
          password: hashed,
          phone: null,
          address: null,
        });
        await patientRepository.save(patient);
        console.log(`[Seed] Patient created → ${patientEmail}`);
      } else {
        console.log(`[Seed] Patient already exists → skipping (${patientEmail})`);
      }
    } else {
      console.log('[Seed] Patient env vars not fully defined → skipping patient seed');
    }
  } catch (err) {
    console.error('[Seed] Error seeding patient:', err);
  }
}
