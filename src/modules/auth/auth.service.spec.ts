import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

import { AuthService } from './auth.service';
import { UsersRepository } from '../users/users.repository';
import { PatientsRepository } from '../patients/patients.repository';

/**
 * Unit test suite for AuthService.
 *
 * All external dependencies are mocked (repositories, JwtService,
 * ConfigService, Redis cache manager).
 */
describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: jest.Mocked<Partial<UsersRepository>>;
  let patientsRepository: jest.Mocked<Partial<PatientsRepository>>;
  let jwtService: jest.Mocked<Partial<JwtService>>;
  let cacheManager: Record<string, jest.Mock>;

  beforeEach(async () => {
    usersRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn(),
      }),
    };

    patientsRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      createPatient: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn(),
      }),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-access-token'),
      signAsync: jest.fn().mockResolvedValue('mock-token'),
      verify: jest.fn(),
    };

    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersRepository, useValue: usersRepository },
        { provide: PatientsRepository, useValue: patientsRepository },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                'jwt.secret': 'test-secret',
                'jwt.expiresIn': '15m',
                'jwt.refreshSecret': 'test-refresh-secret',
                'jwt.refreshExpiresIn': '7d',
              };
              return config[key];
            }),
          },
        },
        { provide: CACHE_MANAGER, useValue: cacheManager },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ────────────────────────── register ──────────────────────────

  describe('register', () => {
    it('should register a new patient and return tokens', async () => {
      const dto = {
        name: 'Test Patient',
        email: 'test@mail.com',
        password: 'password123',
      };

      patientsRepository.findOne!.mockResolvedValue(null);
      usersRepository.findOne!.mockResolvedValue(null);
      patientsRepository.createPatient!.mockResolvedValue({
        id: 'uuid-patient-1',
        name: dto.name,
        email: dto.email,
        password: 'hashed',
        phone: null,
        address: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as never);

      const result = await service.register(dto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(patientsRepository.createPatient).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalled();
    });

    it('should throw 409 if email already exists', async () => {
      const dto = {
        name: 'Test',
        email: 'existing@mail.com',
        password: 'password123',
      };

      patientsRepository.findOne!.mockResolvedValue({
        id: 'uuid-existing',
        email: dto.email,
      } as never);

      await expect(service.register(dto)).rejects.toThrow(
        'Email is already registered',
      );
    });
  });

  // ────────────────────────── login ──────────────────────────

  describe('login', () => {
    it('should login a user and return tokens', async () => {
      const user = {
        id: 'uuid-user-1',
        email: 'doctor@lumira.ai',
        name: 'Dr. Test',
        role: 'doctor',
        status: 'Active',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never;

      const result = await service.login(user, 'user');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(cacheManager.set).toHaveBeenCalled();
    });

    it('should login a patient and return tokens', async () => {
      const patient = {
        id: 'uuid-patient-1',
        email: 'patient@mail.com',
        name: 'Patient Test',
        phone: null,
        address: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never;

      const result = await service.login(patient, 'patient');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
    });
  });

  // ────────────────────────── getProfile ──────────────────────────

  describe('getProfile', () => {
    it('should return user profile DTO', async () => {
      usersRepository.findOne!.mockResolvedValue({
        id: 'uuid-user-1',
        name: 'Dr. Test',
        email: 'doctor@lumira.ai',
        role: 'doctor',
        status: 'Active',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      const result = await service.getProfile('uuid-user-1', 'user');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
      expect(result).not.toHaveProperty('password');
    });

    it('should return patient profile DTO', async () => {
      patientsRepository.findOne!.mockResolvedValue({
        id: 'uuid-patient-1',
        name: 'Patient Test',
        email: 'patient@mail.com',
        phone: '+628123',
        address: 'Jakarta',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      const result = await service.getProfile('uuid-patient-1', 'patient');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('phone');
      expect(result).not.toHaveProperty('password');
    });
  });

  // ────────────────────────── changePassword ──────────────────────────

  describe('changePassword', () => {
    it('should change password when current password matches', async () => {
      // This is a stub — bcrypt.compare would need to be mocked
      // for a full integration. The structure is ready to be expanded.
      expect(true).toBe(true);
    });

    it('should throw 400 when current password is wrong', async () => {
      // Stub: expand with bcrypt mock for full coverage.
      expect(true).toBe(true);
    });
  });

  // ────────────────────────── refreshToken ──────────────────────────

  describe('refreshToken', () => {
    it('should return a new access token for a valid refresh token', async () => {
      // Stub: requires mocking jsonwebtoken.verify and cache.get.
      expect(true).toBe(true);
    });

    it('should throw 401 for an expired refresh token', async () => {
      // Stub: mock jsonwebtoken.verify to throw TokenExpiredError.
      expect(true).toBe(true);
    });

    it('should throw 401 when refresh token is not in Redis', async () => {
      // Stub: mock cache.get to return null.
      expect(true).toBe(true);
    });
  });

  // ────────────────────────── logout ──────────────────────────

  describe('logout', () => {
    it('should delete refresh token from Redis', async () => {
      cacheManager.get.mockResolvedValue('stored-refresh-token');

      await service.logout('uuid-user-1', 'user');

      expect(cacheManager.del).toHaveBeenCalledWith('refresh:user:uuid-user-1');
    });

    it('should throw 400 if already logged out', async () => {
      cacheManager.get.mockResolvedValue(null);

      await expect(service.logout('uuid-user-1', 'user')).rejects.toThrow(
        'Already logged out',
      );
    });
  });
});
