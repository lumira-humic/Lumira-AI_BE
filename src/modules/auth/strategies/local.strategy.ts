import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import * as bcrypt from 'bcrypt';

import { AppException } from '../../../common/exceptions/base.exception';
import { ErrorCode } from '../../../common/enums/error-code.enum';

import { UsersRepository } from '../../users/users.repository';
import { PatientsRepository } from '../../patients/patients.repository';
import { User } from '../../users/entities/user.entity';
import { Patient } from '../../patients/entities/patient.entity';

/**
 * Passport local strategy for email + password authentication.
 *
 * Attempts to find the actor in the `users` table first; if not found,
 * falls back to the `patients` table. The resolved entity has its
 * `actorType` attached so downstream consumers (AuthService) know
 * which table the actor belongs to.
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly patientsRepository: PatientsRepository,
  ) {
    super({ usernameField: 'email' });
  }

  /**
   * Validate the given email and password against both actor tables.
   *
   * @param email - Login email address.
   * @param password - Plain-text password.
   * @returns The authenticated actor with `actorType` attached.
   * @throws AppException when credentials are invalid.
   */
  async validate(
    email: string,
    password: string,
  ): Promise<(User | Patient) & { actorType: 'user' | 'patient' }> {
    const normalizedEmail = email.toLowerCase().trim();

    // Try users table first
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email: normalizedEmail })
      .getOne();

    if (user) {
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (isPasswordValid) {
        return Object.assign(user, { actorType: 'user' as const });
      }
    }

    // Try patients table
    const patient = await this.patientsRepository
      .createQueryBuilder('patient')
      .addSelect('patient.password')
      .where('patient.email = :email', { email: normalizedEmail })
      .getOne();

    if (patient) {
      const isPasswordValid = await bcrypt.compare(password, patient.password);
      if (isPasswordValid) {
        return Object.assign(patient, { actorType: 'patient' as const });
      }
    }

    throw new AppException(ErrorCode.AUTH_INVALID_CREDENTIALS, 'Invalid email or password', 401);
  }
}
