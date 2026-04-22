import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PassportModule } from '@nestjs/passport';
import { beforeAll, afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import request from 'supertest';
import * as bcrypt from 'bcrypt';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LocalStrategy } from './strategies/local.strategy';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { UsersRepository } from '../users/users.repository';
import { PatientsRepository } from '../patients/patients.repository';

describe('POST /auth/login (e2e-like)', () => {
  let app: INestApplication;

  const loginMock = jest.fn<() => Promise<unknown>>();
  loginMock.mockResolvedValue({
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    user: {
      id: 'user-1',
      email: 'doctor@lumira.ai',
    },
  });

  const authServiceMock = {
    login: loginMock,
  };

  const usersRepositoryMock = {
    createQueryBuilder: jest.fn(),
  };

  const patientsRepositoryMock = {
    createQueryBuilder: jest.fn(),
  };

  const createQueryBuilderMock = (
    entity: { id?: string; email?: string; password: string } | null,
    expectedEmail?: string,
  ) => {
    const getOneMock =
      jest.fn<() => Promise<{ id?: string; email?: string; password: string } | null>>();
    if (!entity || !expectedEmail) {
      getOneMock.mockResolvedValue(entity);
    } else {
      getOneMock.mockImplementation(function (this: {
        __emailParam?: string;
        __entity?: { id?: string; email?: string; password: string };
      }) {
        return Promise.resolve(this.__emailParam === expectedEmail ? this.__entity ?? null : null);
      });
    }

    const qb: {
      __emailParam?: string;
      __entity?: { id?: string; email?: string; password: string };
      addSelect: jest.Mock;
      where: jest.Mock;
      getOne: typeof getOneMock;
    } = {
      __emailParam: undefined,
      __entity: entity ?? undefined,
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn(function (
        this: { __emailParam?: string },
        _query: string,
        params: { email: string },
      ) {
        this.__emailParam = params.email;
        return this;
      }),
      getOne: getOneMock,
    };

    return qb;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'local' })],
      controllers: [AuthController],
      providers: [
        LocalAuthGuard,
        LocalStrategy,
        { provide: AuthService, useValue: authServiceMock },
        { provide: UsersRepository, useValue: usersRepositoryMock },
        { provide: PatientsRepository, useValue: patientsRepositoryMock },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    authServiceMock.login.mockResolvedValue({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      user: {
        id: 'user-1',
        email: 'doctor@lumira.ai',
      },
    });
  });

  it('returns 200 for exact-case password', async () => {
    const hashedPassword = await bcrypt.hash('P@ssW0rd!', 4);

    usersRepositoryMock.createQueryBuilder.mockReturnValue(
      createQueryBuilderMock(
        {
          id: 'user-1',
          email: 'doctor@lumira.ai',
          password: hashedPassword,
        },
        'doctor@lumira.ai',
      ),
    );
    patientsRepositoryMock.createQueryBuilder.mockReturnValue(createQueryBuilderMock(null));

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'doctor@lumira.ai', password: 'P@ssW0rd!' })
      .expect(200);

    expect(response.body.status).toBe('success');
    expect(response.body.data.accessToken).toBe('mock-access-token');
    expect(authServiceMock.login).toHaveBeenCalledTimes(1);
  });

  it('returns 401 when password capitalization differs', async () => {
    const hashedPassword = await bcrypt.hash('P@ssW0rd!', 4);

    usersRepositoryMock.createQueryBuilder.mockReturnValue(
      createQueryBuilderMock(
        {
          id: 'user-1',
          email: 'doctor@lumira.ai',
          password: hashedPassword,
        },
        'doctor@lumira.ai',
      ),
    );
    patientsRepositoryMock.createQueryBuilder.mockReturnValue(createQueryBuilderMock(null));

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'doctor@lumira.ai', password: 'p@ssw0rd!' })
      .expect(401);

    expect(authServiceMock.login).not.toHaveBeenCalled();
  });

  it('returns 401 when email capitalization differs', async () => {
    const hashedPassword = await bcrypt.hash('P@ssW0rd!', 4);

    usersRepositoryMock.createQueryBuilder.mockReturnValue(
      createQueryBuilderMock(
        {
          id: 'user-1',
          email: 'doctor@lumira.ai',
          password: hashedPassword,
        },
        'doctor@lumira.ai',
      ),
    );
    patientsRepositoryMock.createQueryBuilder.mockReturnValue(createQueryBuilderMock(null));

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'Doctor@lumira.ai', password: 'P@ssW0rd!' })
      .expect(401);

    expect(authServiceMock.login).not.toHaveBeenCalled();
  });
});
