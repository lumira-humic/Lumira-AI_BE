import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Cache } from 'cache-manager';
import * as jwt from 'jsonwebtoken';

import { ErrorCode } from '../../common/enums/error-code.enum';
import { AppException } from '../../common/exceptions/base.exception';

import { PatientResponseDto } from '../patients/dto/patient-response.dto';
import { Patient } from '../patients/entities/patient.entity';
import { PatientsRepository } from '../patients/patients.repository';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { User } from '../users/entities/user.entity';
import { UsersRepository } from '../users/users.repository';

import { AccessTokenResponseDto, AuthResponseDto } from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

/** Refresh-token TTL in seconds (7 days). */
const REFRESH_TOKEN_TTL = 604800;

/** bcrypt salt rounds used for password hashing. */
const BCRYPT_ROUNDS = 12;

/**
 * Core authentication service.
 *
 * Handles registration, login, token management, password changes,
 * and logout for both User (admin/doctor) and Patient actors.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly patientsRepository: PatientsRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  // ──────────────────────────── Public Methods ────────────────────────────

  /**
   * Register a new patient account.
   *
   * Only patients can self-register via the mobile app.
   * Users (admin/doctor) are created through internal tools.
   *
   * @param dto - Registration payload.
   * @returns Auth response with tokens and patient profile.
   * @throws AppException if the email is already taken.
   */
  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    // Check if email already exists in patients table
    const existingPatient = await this.patientsRepository.findOne({
      where: { email: dto.email },
    });

    if (existingPatient) {
      throw new AppException(ErrorCode.USER_ALREADY_EXISTS, 'Email is already registered', 409);
    }

    // Also check users table to prevent cross-table email conflicts
    const existingUser = await this.usersRepository.findOne({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new AppException(ErrorCode.USER_ALREADY_EXISTS, 'Email is already registered', 409);
    }

    // Hash password and create patient
    const hashedPassword = await this.hashPassword(dto.password);
    const patient = await this.patientsRepository.createPatient({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      phone: dto.phone ?? null,
      address: dto.address ?? null,
    });

    // Generate tokens
    const payload: JwtPayload = {
      sub: patient.id,
      email: patient.email,
      role: 'patient',
      actorType: 'patient',
    };

    const tokens = await this.generateTokens(payload);

    // Store refresh token in Redis
    await this.cacheManager.set(
      `refresh:patient:${patient.id}`,
      tokens.refreshToken,
      REFRESH_TOKEN_TTL * 1000,
    );

    this.logger.log(`Patient registered: ${patient.email}`);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.mapPatientToDto(patient),
    };
  }

  /**
   * Login an already-validated actor and issue tokens.
   *
   * The actor has already been validated by the LocalStrategy;
   * this method only generates tokens and stores the refresh token.
   *
   * @param actor - Validated user or patient entity.
   * @param actorType - Discriminator (`'user'` or `'patient'`).
   * @returns Auth response with tokens and profile.
   */
  async login(actor: User | Patient, actorType: 'user' | 'patient'): Promise<AuthResponseDto> {
    const role = actorType === 'user' ? (actor as User).role : 'patient';

    const payload: JwtPayload = {
      sub: actor.id,
      email: actor.email,
      role,
      actorType,
    };

    const tokens = await this.generateTokens(payload);

    // Store refresh token in Redis with 7-day TTL
    await this.cacheManager.set(
      `refresh:${actorType}:${actor.id}`,
      tokens.refreshToken,
      REFRESH_TOKEN_TTL * 1000,
    );

    this.logger.log(`${actorType} logged in: ${actor.email}`);

    const userDto =
      actorType === 'user'
        ? this.mapUserToDto(actor as User)
        : this.mapPatientToDto(actor as Patient);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: userDto,
    };
  }

  /**
   * Retrieve the profile of the currently authenticated actor.
   *
   * @param userId - UUID of the actor.
   * @param actorType - Discriminator to select the correct table.
   * @returns Mapped response DTO (never a raw entity).
   */
  async getProfile(
    userId: string,
    actorType: 'user' | 'patient',
  ): Promise<UserResponseDto | PatientResponseDto> {
    if (actorType === 'user') {
      const user = await this.usersRepository.findOne({
        where: { id: userId },
      });
      if (!user) {
        throw new AppException(ErrorCode.NOT_FOUND, 'User not found', 404);
      }
      return this.mapUserToDto(user);
    }

    const patient = await this.patientsRepository.findOne({
      where: { id: userId },
    });
    if (!patient) {
      throw new AppException(ErrorCode.NOT_FOUND, 'Patient not found', 404);
    }
    return this.mapPatientToDto(patient);
  }

  /**
   * Change the password for the currently authenticated actor.
   *
   * @param userId - UUID of the actor.
   * @param actorType - Discriminator to select the correct table.
   * @param dto - Current and new password payload.
   * @throws AppException if the current password is wrong.
   */
  async changePassword(
    userId: string,
    actorType: 'user' | 'patient',
    dto: ChangePasswordDto,
  ): Promise<void> {
    if (actorType === 'user') {
      const user = await this.usersRepository
        .createQueryBuilder('user')
        .addSelect('user.password')
        .where('user.id = :id', { id: userId })
        .getOne();

      if (!user) {
        throw new AppException(ErrorCode.NOT_FOUND, 'User not found', 404);
      }

      const isMatch = await this.comparePassword(dto.currentPassword, user.password);
      if (!isMatch) {
        throw new AppException(
          ErrorCode.AUTH_INVALID_CREDENTIALS,
          'Current password is wrong',
          400,
        );
      }

      user.password = await this.hashPassword(dto.newPassword);
      await this.usersRepository.save(user);
    } else {
      const patient = await this.patientsRepository
        .createQueryBuilder('patient')
        .addSelect('patient.password')
        .where('patient.id = :id', { id: userId })
        .getOne();

      if (!patient) {
        throw new AppException(ErrorCode.NOT_FOUND, 'Patient not found', 404);
      }

      const isMatch = await this.comparePassword(dto.currentPassword, patient.password);
      if (!isMatch) {
        throw new AppException(
          ErrorCode.AUTH_INVALID_CREDENTIALS,
          'Current password is wrong',
          400,
        );
      }

      patient.password = await this.hashPassword(dto.newPassword);
      await this.patientsRepository.save(patient);
    }

    this.logger.log(`Password changed for ${actorType}:${userId}`);
  }

  /**
   * Exchange a valid refresh token for a new access token.
   *
   * Uses the raw `jsonwebtoken` library to verify with the
   * dedicated refresh-token secret.
   *
   * @param dto - Contains the refresh token string.
   * @returns A new access token.
   * @throws AppException if the refresh token is invalid or expired.
   */
  async refreshToken(dto: RefreshTokenDto): Promise<AccessTokenResponseDto> {
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret') as string;

    let decoded: JwtPayload;
    try {
      const verifyResult = jwt.verify(dto.refreshToken, refreshSecret);
      decoded = verifyResult as unknown as JwtPayload;
    } catch {
      throw new AppException(
        ErrorCode.AUTH_REFRESH_TOKEN_INVALID,
        'Refresh token invalid or expired',
        401,
      );
    }

    // Verify token exists in Redis
    const storedToken = await this.cacheManager.get<string>(
      `refresh:${decoded.actorType}:${decoded.sub}`,
    );

    if (!storedToken || storedToken !== dto.refreshToken) {
      throw new AppException(
        ErrorCode.AUTH_REFRESH_TOKEN_INVALID,
        'Refresh token invalid or expired',
        401,
      );
    }

    // Generate a fresh access token
    const accessPayload: JwtPayload = {
      sub: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      actorType: decoded.actorType,
    };

    const accessToken = this.jwtService.sign(accessPayload);

    this.logger.log(`Token refreshed for ${decoded.actorType}:${decoded.sub}`);

    return { accessToken };
  }

  /**
   * Invalidate the refresh token for the current actor by removing
   * it from Redis.
   *
   * @param userId - UUID of the actor.
   * @param actorType - Discriminator.
   * @throws AppException if there is no active session to invalidate.
   */
  async logout(userId: string, actorType: 'user' | 'patient'): Promise<void> {
    const key = `refresh:${actorType}:${userId}`;
    const storedToken = await this.cacheManager.get<string>(key);

    if (!storedToken) {
      throw new AppException(ErrorCode.AUTH_TOKEN_INVALID, 'Already logged out', 400);
    }

    await this.cacheManager.del(key);
    this.logger.log(`${actorType} logged out: ${userId}`);
  }

  // ──────────────────────────── Private Helpers ────────────────────────────

  /**
   * Generate an access token + refresh token pair.
   *
   * The access token uses the standard JWT secret with a short TTL.
   * The refresh token uses a separate secret with a longer TTL.
   */
  private async generateTokens(
    payload: JwtPayload,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync({
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
        actorType: payload.actorType,
      }),
      this.jwtService.signAsync(
        {
          sub: payload.sub,
          email: payload.email,
          role: payload.role,
          actorType: payload.actorType,
        },
        {
          secret: refreshSecret,
          expiresIn: REFRESH_TOKEN_TTL, // 7 days in seconds
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * Hash a plain-text password with bcrypt.
   *
   * @param password - Plain-text password.
   * @returns Hashed password string.
   */
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  /**
   * Compare a plain-text password against a bcrypt hash.
   *
   * @param plain - Plain-text password.
   * @param hashed - Stored bcrypt hash.
   * @returns `true` if they match.
   */
  private async comparePassword(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }

  /**
   * Map a User entity to a safe response DTO.
   */
  private mapUserToDto(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.name = user.name;
    dto.email = user.email;
    dto.role = user.role;
    dto.status = user.status;
    dto.createdAt = user.createdAt;
    dto.updatedAt = user.updatedAt;
    return dto;
  }

  /**
   * Map a Patient entity to a safe response DTO.
   */
  private mapPatientToDto(patient: Patient): PatientResponseDto {
    const dto = new PatientResponseDto();
    dto.id = patient.id;
    dto.name = patient.name;
    dto.email = patient.email;
    dto.phone = patient.phone;
    dto.address = patient.address;
    dto.createdAt = patient.createdAt;
    dto.updatedAt = patient.updatedAt;
    return dto;
  }
}
