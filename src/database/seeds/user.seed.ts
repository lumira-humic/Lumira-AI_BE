import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from '../../modules/users/entities/user.entity';
import { UserRole } from '../../modules/users/enums/user-role.enum';
import { UserStatus } from '../../modules/users/enums/user-status.enum';
import { Patient } from '../../modules/patients/entities/patient.entity';
import { generatePrefixedId } from '../../common/utils/id-generator.util';

const BCRYPT_ROUNDS = 10;
const DEFAULT_SEED_PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? 'Lumira@2026';

const userSeeds: Array<{
  idPrefix: 'ADM' | 'DOC';
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}> = [
  {
    idPrefix: 'ADM',
    name: 'Admin Lumira',
    email: 'admin@lumira.ai',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
  },
  {
    idPrefix: 'DOC',
    name: 'dr. Andini Prameswari',
    email: 'andini.prameswari@lumira.ai',
    role: UserRole.DOCTOR,
    status: UserStatus.ACTIVE,
  },
  {
    idPrefix: 'DOC',
    name: 'dr. Bima Prakasa',
    email: 'bima.prakasa@lumira.ai',
    role: UserRole.DOCTOR,
    status: UserStatus.ACTIVE,
  },
  {
    idPrefix: 'DOC',
    name: 'dr. Citra Kusumawardani',
    email: 'citra.kusumawardani@lumira.ai',
    role: UserRole.DOCTOR,
    status: UserStatus.ACTIVE,
  },
  {
    idPrefix: 'DOC',
    name: 'dr. Dimas Suryanto',
    email: 'dimas.suryanto@lumira.ai',
    role: UserRole.DOCTOR,
    status: UserStatus.ACTIVE,
  },
  {
    idPrefix: 'DOC',
    name: 'dr. Farah Nabila',
    email: 'farah.nabila@lumira.ai',
    role: UserRole.DOCTOR,
    status: UserStatus.ACTIVE,
  },
];

const patientSeeds: Array<{
  name: string;
  email: string;
  phone: string;
}> = [
  {
    name: 'Ayu Lestari',
    email: 'ayu.lestari@lumira.ai',
    phone: '+6281218457731',
  },
  {
    name: 'Bagus Santoso',
    email: 'bagus.santoso@lumira.ai',
    phone: '+6281386249105',
  },
  {
    name: 'Clara Widjaja',
    email: 'clara.widjaja@lumira.ai',
    phone: '+6281570392864',
  },
  {
    name: 'Dewi Kartika',
    email: 'dewi.kartika@lumira.ai',
    phone: '+6281695084127',
  },
  {
    name: 'Eko Prasetyo',
    email: 'eko.prasetyo@lumira.ai',
    phone: '+6281774236589',
  },
];

async function upsertUser(
  userRepository: Repository<User>,
  seed: (typeof userSeeds)[number],
  password: string,
): Promise<User> {
  const existing = await userRepository.findOne({
    where: { email: seed.email },
    withDeleted: true,
  });
  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = userRepository.create({
    id: existing?.id ?? generatePrefixedId(seed.idPrefix),
    name: seed.name,
    email: seed.email,
    password: hashedPassword,
    role: seed.role,
    status: seed.status,
    deletedAt: null,
  });

  return userRepository.save(user);
}

async function upsertPatient(
  patientRepository: Repository<Patient>,
  seed: (typeof patientSeeds)[number],
  password: string,
): Promise<Patient> {
  const existing = await patientRepository.findOne({
    where: { email: seed.email },
    withDeleted: true,
  });
  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const patient = patientRepository.create({
    id: existing?.id ?? generatePrefixedId('PAS'),
    name: seed.name,
    email: seed.email,
    password: hashedPassword,
    phone: seed.phone,
    deletedAt: null,
  });

  return patientRepository.save(patient);
}

export async function seedUsers(dataSource: DataSource): Promise<void> {
  const userRepository = dataSource.getRepository(User);
  const patientRepository = dataSource.getRepository(Patient);

  for (const seed of userSeeds) {
    const user = await upsertUser(userRepository, seed, DEFAULT_SEED_PASSWORD);
    console.log(`[Seed] User ready: ${user.email} (${user.role}, id: ${user.id})`);
  }

  for (const seed of patientSeeds) {
    const patient = await upsertPatient(patientRepository, seed, DEFAULT_SEED_PASSWORD);
    console.log(`[Seed] Patient ready: ${patient.email} (id: ${patient.id})`);
  }
}
