import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { ErrorCode } from '../../common/enums/error-code.enum';
import { AppException } from '../../common/exceptions/base.exception';
import { CreateUserDto, QueryUserDto, UpdateUserDto, UserResponseDto } from './dto';
import { User } from './entities/user.entity';
import { UserRole } from './enums/user-role.enum';
import { UserStatus } from './enums/user-status.enum';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let repository: any;
  let cacheManager: any;

  const mockUser = {
    id: 'uuid-1',
    name: 'Dr. Budi',
    email: 'budi@lumira.ai',
    password: 'hashed-password',
    role: UserRole.DOCTOR,
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  const mockUsersRepository = {
    findByEmail: jest.fn(),
    findAllWithFilter: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    store: {
      keys: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: mockUsersRepository,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<UsersRepository>(UsersRepository);
    cacheManager = module.get(CACHE_MANAGER);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreateUserDto = {
      name: 'Dr. Budi',
      email: 'budi@lumira.ai',
      password: 'StrongPass123!',
      role: UserRole.DOCTOR,
      status: UserStatus.ACTIVE,
    };

    it('should create a new user and return UserResponseDto', async () => {
      repository.findByEmail.mockResolvedValue(null);
      repository.create.mockReturnValue(mockUser);
      repository.save.mockResolvedValue(mockUser);
      mockCacheManager.store.keys.mockResolvedValue([]);

      const result = await service.create(createDto);

      expect(repository.findByEmail).toHaveBeenCalledWith(createDto.email);
      expect(repository.save).toHaveBeenCalled();
      expect(result).toEqual(UserResponseDto.fromEntity(mockUser));
    });

    it('should throw 409 if email already exists', async () => {
      repository.findByEmail.mockResolvedValue(mockUser);

      await expect(service.create(createDto)).rejects.toThrow(
        new AppException(
          ErrorCode.USER_ALREADY_EXISTS,
          'Email already registered',
          HttpStatus.CONFLICT,
        ),
      );
    });
  });

  describe('findAll', () => {
    const query: QueryUserDto = { page: 1, limit: 10 };

    it('should return users from cache if available', async () => {
      const cachedResult = [[UserResponseDto.fromEntity(mockUser)], 1];
      cacheManager.get.mockResolvedValue(cachedResult);

      const result = await service.findAll(query);

      expect(cacheManager.get).toHaveBeenCalled();
      expect(repository.findAllWithFilter).not.toHaveBeenCalled();
      expect(result).toEqual(cachedResult);
    });

    it('should query DB and cache result if cache miss', async () => {
      cacheManager.get.mockResolvedValue(null);
      repository.findAllWithFilter.mockResolvedValue([[mockUser], 1]);

      const result = await service.findAll(query);

      expect(repository.findAllWithFilter).toHaveBeenCalledWith(query);
      expect(cacheManager.set).toHaveBeenCalled();
      expect(result[1]).toBe(1);
    });
  });

  describe('findById', () => {
    it('should return a user if found', async () => {
      repository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById('uuid-1');

      expect(result.id).toBe(mockUser.id);
    });

    it('should throw 404 if user not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(
        new AppException(ErrorCode.USER_NOT_FOUND, 'User not found', HttpStatus.NOT_FOUND),
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateUserDto = { name: 'Dr. Budi Updated' };

    it('should update user and invalidate cache', async () => {
      repository.findOne.mockResolvedValue(mockUser);
      repository.save.mockResolvedValue({ ...mockUser, ...updateDto });
      mockCacheManager.store.keys.mockResolvedValue(['users:list:1']);

      const result = await service.update('uuid-1', updateDto);

      expect(repository.save).toHaveBeenCalled();
      expect(cacheManager.del).toHaveBeenCalledWith('users:list:1');
      expect(result.name).toBe(updateDto.name);
    });

    it('should throw 404 if user not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update('uuid-1', updateDto)).rejects.toThrow(
        new AppException(ErrorCode.USER_NOT_FOUND, 'User not found', HttpStatus.NOT_FOUND),
      );
    });
  });

  describe('delete', () => {
    it('should soft delete user and invalidate cache', async () => {
      repository.findOne.mockResolvedValue(mockUser);
      mockCacheManager.store.keys.mockResolvedValue(['users:list:1']);

      await service.delete('uuid-1');

      expect(repository.softDelete).toHaveBeenCalledWith('uuid-1');
      expect(cacheManager.del).toHaveBeenCalledWith('users:list:1');
    });

    it('should throw 404 if user not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.delete('uuid-1')).rejects.toThrow(
        new AppException(ErrorCode.USER_NOT_FOUND, 'User not found', HttpStatus.NOT_FOUND),
      );
    });
  });
});
