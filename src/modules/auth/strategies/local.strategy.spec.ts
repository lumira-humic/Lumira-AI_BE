import * as bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { AppException } from '../../../common/exceptions/base.exception';
import { LocalStrategy } from './local.strategy';

describe('LocalStrategy', () => {
  const mockUsersRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockPatientsRepository = {
    createQueryBuilder: jest.fn(),
  };

  const createQueryBuilderMock = (
    entity: { email: string; password: string } | null,
    expectedEmail?: string,
  ) => {
    const getOneMock = jest.fn<() => Promise<{ email: string; password: string } | null>>();
    if (!entity || !expectedEmail) {
      getOneMock.mockResolvedValue(entity);
    } else {
      getOneMock.mockImplementation(function (this: { __emailParam?: string }) {
        return Promise.resolve(this.__emailParam === expectedEmail ? entity : null);
      });
    }

    const qb = {
      __emailParam: undefined,
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn(function (
        this: { __emailParam?: string },
        _query: unknown,
        params: { email: string },
      ) {
        this.__emailParam = params.email;
        return this;
      }),
      getOne: getOneMock,
    };

    return qb;
  };

  let strategy: LocalStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new LocalStrategy(mockUsersRepository as never, mockPatientsRepository as never);
  });

  it('authenticates user with exact-case password', async () => {
    const hashedPassword = await bcrypt.hash('P@ssW0rd!', 4);

    mockUsersRepository.createQueryBuilder.mockReturnValue(
      createQueryBuilderMock(
        { email: 'doctor@lumira.ai', password: hashedPassword },
        'doctor@lumira.ai',
      ),
    );
    mockPatientsRepository.createQueryBuilder.mockReturnValue(createQueryBuilderMock(null));

    const result = await strategy.validate('doctor@lumira.ai', 'P@ssW0rd!');

    expect(result.actorType).toBe('user');
    expect(mockUsersRepository.createQueryBuilder).toHaveBeenCalledWith('user');
  });

  it('rejects login when password capitalization differs', async () => {
    const hashedPassword = await bcrypt.hash('P@ssW0rd!', 4);

    mockUsersRepository.createQueryBuilder.mockReturnValue(
      createQueryBuilderMock(
        { email: 'doctor@lumira.ai', password: hashedPassword },
        'doctor@lumira.ai',
      ),
    );
    mockPatientsRepository.createQueryBuilder.mockReturnValue(createQueryBuilderMock(null));

    await expect(strategy.validate('doctor@lumira.ai', 'p@ssw0rd!')).rejects.toBeInstanceOf(
      AppException,
    );
  });

  it('rejects login when email capitalization differs', async () => {
    const hashedPassword = await bcrypt.hash('P@ssW0rd!', 4);

    const userQb = createQueryBuilderMock(
      { email: 'doctor@lumira.ai', password: hashedPassword },
      'doctor@lumira.ai',
    );
    mockUsersRepository.createQueryBuilder.mockReturnValue(userQb);
    mockPatientsRepository.createQueryBuilder.mockReturnValue(createQueryBuilderMock(null));

    await expect(strategy.validate('Doctor@lumira.ai', 'P@ssW0rd!')).rejects.toBeInstanceOf(
      AppException,
    );
  });

  it('rejects non-string password input', async () => {
    await expect(strategy.validate('doctor@lumira.ai', undefined as never)).rejects.toBeInstanceOf(
      AppException,
    );
  });
});
