import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { QueryUserDto } from './dto/query-user.dto';

@Injectable()
export class UsersRepository extends Repository<User> {
  constructor(
    @InjectRepository(User)
    private repository: Repository<User>,
  ) {
    super(repository.target, repository.manager, repository.queryRunner);
  }

  /**
   * Find a user by email address.
   *
   * @param email - User's email.
   * @returns User entity or null if not found.
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.findOne({ where: { email } });
  }

  /**
   * Find a user by email and include the password field.
   *
   * Used for authentication (LocalStrategy).
   *
   * @param email - User's email.
   * @returns User entity with password or null if not found.
   */
  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  /**
   * Find a user by ID and include the password field.
   *
   * Used for updating password.
   *
   * @param id - User's UUID.
   * @returns User entity with password or null if not found.
   */
  async findByIdWithPassword(id: string): Promise<User | null> {
    return this.createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id })
      .getOne();
  }

  /**
   * Find and count users with filters, search, and pagination.
   *
   * @param queryDto - Filtering and pagination parameters.
   * @returns Tuple of [User entities, total count].
   */
  async findAllWithFilter(queryDto: QueryUserDto): Promise<[User[], number]> {
    const {
      page = 1,
      limit = 10,
      search,
      role,
      status,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = queryDto;

    const query = this.createQueryBuilder('user');

    // Filtering by status
    if (status) {
      query.andWhere('user.status = :status', { status });
    }

    // Filtering by role
    if (role) {
      query.andWhere('user.role = :role', { role });
    }

    // Searching by name or email (ILIKE)
    if (search) {
      query.andWhere('(user.name ILIKE :search OR user.email ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    // Sorting
    query.orderBy(`user.${sortBy}`, sortOrder);

    // Pagination
    query.skip((page - 1) * limit).take(limit);

    return query.getManyAndCount();
  }
}
