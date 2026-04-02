import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { ErrorCode } from '../../../common/enums/error-code.enum';
import { AppException } from '../../../common/exceptions/base.exception';

import { Patient } from '../../patients/entities/patient.entity';
import { PatientsRepository } from '../../patients/patients.repository';
import { User } from '../../users/entities/user.entity';
import { UsersRepository } from '../../users/users.repository';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

/**
 * Passport JWT strategy.
 *
 * Extracts the Bearer token from the Authorization header, decodes the
 * payload, and resolves the full actor entity from the appropriate
 * repository based on `actorType`.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersRepository: UsersRepository,
    private readonly patientsRepository: PatientsRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      secretOrKey: configService.get<string>('jwt.secret') as string,
    });
  }

  /**
   * Called after token verification succeeds.
   *
   * Resolves the full entity from the database and attaches `actorType`
   * so guards and controllers can distinguish between user and patient.
   *
   * @param payload - Decoded JWT payload.
   * @returns The authenticated actor entity with `actorType`.
   * @throws AppException when the actor cannot be found.
   */
  async validate(
    payload: JwtPayload,
  ): Promise<(User | Patient) & { actorType: 'user' | 'patient' }> {
    let actor: User | Patient | null = null;

    if (payload.actorType === 'user') {
      actor = await this.usersRepository.findOne({
        where: { id: payload.sub },
      });
    } else if (payload.actorType === 'patient') {
      actor = await this.patientsRepository.findOne({
        where: { id: payload.sub },
      });
    }

    if (!actor) {
      throw new AppException(ErrorCode.AUTH_TOKEN_INVALID, 'Token invalid or expired', 401);
    }

    return Object.assign(actor, { actorType: payload.actorType });
  }
}
