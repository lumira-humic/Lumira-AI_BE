import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from '../../modules/users/entities/user.entity';
import { UserRole } from '../../modules/users/enums/user-role.enum';
import { UserStatus } from '../../modules/users/enums/user-status.enum';

/**
 * Seeds a default admin user into the `users` table.
 */
export async function seedAdminUser(dataSource: DataSource): Promise<void> {
  const userRepository = dataSource.getRepository(User);

  const adminName = process.env.SEED_ADMIN_NAME;
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const rawPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!adminName || !adminEmail || !rawPassword) {
    console.error(
      '[Seed] Error: SEED_ADMIN_NAME, SEED_ADMIN_EMAIL, or SEED_ADMIN_PASSWORD is not defined in environment variables.',
    );
    return;
  }

  const exists = await userRepository.findOne({
    where: { email: adminEmail },
  });

  if (exists) {
    console.log(`[Seed] Admin user already exists → skipping (${adminEmail})`);
    return;
  }

  const hashedPassword = await bcrypt.hash(rawPassword, 10);

  const admin = userRepository.create({
    name: adminName,
    email: adminEmail,
    password: hashedPassword,
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
  });

  await userRepository.save(admin);

  console.log(`[Seed] Admin user created → ${adminEmail}`);
}
