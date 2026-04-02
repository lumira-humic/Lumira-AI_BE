import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Cache } from 'cache-manager';

import { ErrorCode } from '../../common/enums/error-code.enum';
import { AppException } from '../../common/exceptions/base.exception';
import { CreateUserDto, QueryUserDto, UpdateUserDto, UserResponseDto } from './dto';
import { UsersRepository } from './users.repository';

/** bcrypt salt rounds used for password hashing. */
const BCRYPT_ROUNDS = 12;

/** Cache TTL in seconds for user list. */
const LIST_CACHE_TTL = 60;

/**
 * Service for managing system users (Admin & Doctors).
 *
 * Provides CRUD operations with Redis caching and password hashing.
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /**
   * Create a new user account.
   *
   * @param dto - User details.
   * @returns Mapped response DTO.
   * @throws AppException if email is already registered.
   */
  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) {
      throw new AppException(
        ErrorCode.USER_ALREADY_EXISTS,
        'Email already registered',
        HttpStatus.CONFLICT,
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const newUser = this.usersRepository.create({
      ...dto,
      password: hashedPassword,
    });

    const savedUser = await this.usersRepository.save(newUser);

    // Invalidate list cache
    await this.invalidateListCache();

    this.logger.log({ action: 'CREATE_USER', userId: savedUser.id });

    return UserResponseDto.fromEntity(savedUser);
  }

  /**
   * Get paginated list of users with filters.
   *
   * Uses Redis to cache query results for 60 seconds.
   *
   * @param query - Pagination and filter parameters.
   * @returns Tuple of [mapped DTOs, total count].
   */
  async findAll(query: QueryUserDto): Promise<[UserResponseDto[], number]> {
    const cacheKey = `users:list:${JSON.stringify(query)}`;
    const cached = await this.cacheManager.get<[UserResponseDto[], number]>(cacheKey);

    if (cached) {
      return cached;
    }

    const [users, total] = await this.usersRepository.findAllWithFilter(query);
    const result: [UserResponseDto[], number] = [UserResponseDto.fromEntities(users), total];

    // Store in Redis with 60s TTL (TTL in milliseconds for some cache-manager versions)
    await this.cacheManager.set(cacheKey, result, LIST_CACHE_TTL * 1000);

    return result;
  }

  /**
   * Find a single user by ID.
   *
   * @param id - User UUID.
   * @returns Mapped response DTO.
   * @throws AppException if user not found.
   */
  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new AppException(ErrorCode.USER_NOT_FOUND, 'User not found', HttpStatus.NOT_FOUND);
    }

    return UserResponseDto.fromEntity(user);
  }

  /**
   * Update an existing user account.
   *
   * @param id - User UUID.
   * @param dto - Updated fields.
   * @returns Mapped response DTO.
   * @throws AppException if user not found or email is taken.
   */
  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new AppException(ErrorCode.USER_NOT_FOUND, 'User not found', HttpStatus.NOT_FOUND);
    }

    // Check email duplication if email is changing
    if (dto.email && dto.email !== user.email) {
      const existing = await this.usersRepository.findByEmail(dto.email);
      if (existing) {
        throw new AppException(
          ErrorCode.USER_ALREADY_EXISTS,
          'Email already taken',
          HttpStatus.CONFLICT,
        );
      }
    }

    Object.assign(user, dto);
    const updatedUser = await this.usersRepository.save(user);

    // Invalidate list cache
    await this.invalidateListCache();

    this.logger.log({ action: 'UPDATE_USER', userId: id });

    return UserResponseDto.fromEntity(updatedUser);
  }

  /**
   * Soft-delete a user account.
   *
   * @param id - User UUID.
   * @throws AppException if user not found.
   */
  async delete(id: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new AppException(ErrorCode.USER_NOT_FOUND, 'User not found', HttpStatus.NOT_FOUND);
    }

    await this.usersRepository.softDelete(id);

    // Invalidate list cache
    await this.invalidateListCache();

    this.logger.log({ action: 'DELETE_USER', userId: id });
  }

  // ──────────────────────────── Private Helpers ────────────────────────────

  /**
   * Invalidate all user list cache entries in Redis.
   */
  private async invalidateListCache(): Promise<void> {
    // Note: Better implementation would use cache-manager's scan/del if available,
    // but for simple Redis store, we can rely on pattern matching or clearing keys.
    const store = (
      this.cacheManager as unknown as { store?: { keys?: (pattern: string) => Promise<string[]> } }
    ).store;
    if (store && typeof store.keys === 'function') {
      const keys = await store.keys('users:list:*');
      if (keys && keys.length > 0) {
        await Promise.all(keys.map((key: string) => this.cacheManager.del(key)));
      }
    }
  }
}
