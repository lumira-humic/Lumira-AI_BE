import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { Roles } from '../../common/decorators/roles.decorator';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { AppException } from '../../common/exceptions/base.exception';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ResponseHelper } from '../../common/helpers/response.helper';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateUserDto, QueryUserDto, UpdateUserDto } from './dto';
import { User } from './entities/user.entity';
import { UserRole } from './enums/user-role.enum';
import { UsersService } from './users.service';

/**
 * Controller for managing system users.
 *
 * Access is restricted via JWT and Role-Based Access Control (RBAC).
 */
@ApiTags('Users')
@ApiBearerAuth('BearerAuth')
@UseGuards(RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Create a new user account (Admin only).
   */
  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create new user',
    description: 'Admin only. Used to create new doctor accounts.',
  })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden — Admin only' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  @ApiResponse({ status: 422, description: 'Validation error' })
  async create(@Body() createUserDto: CreateUserDto) {
    const result = await this.usersService.create(createUserDto);
    return ResponseHelper.success(result, 'User created successfully', HttpStatus.CREATED);
  }

  /**
   * Get paginated list of users (Admin only).
   */
  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get list of users',
    description: 'Admin only. Returns paginated list of users with search and filter capabilities.',
  })
  @ApiResponse({ status: 200, description: 'Users fetched successfully' })
  async findAll(@Query() query: QueryUserDto) {
    const [data, total] = await this.usersService.findAll(query);
    return ResponseHelper.paginate(
      data,
      total,
      query.page || 1,
      query.limit || 10,
      'Users fetched successfully',
    );
  }

  /**
   * Get user detail by ID (Admin or the doctor themselves).
   */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Admin can view any user. Doctor can only view their own profile.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'User fetched successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden — not your profile' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string, @CurrentUser() actor: User & { actorType: string }) {
    if (actor.role === UserRole.DOCTOR && actor.id !== id) {
      throw new AppException(
        ErrorCode.FORBIDDEN,
        'You can only view your own profile',
        HttpStatus.FORBIDDEN,
      );
    }

    const result = await this.usersService.findById(id);
    return ResponseHelper.success(result, 'User fetched successfully');
  }

  /**
   * Update user details (Admin or the doctor themselves).
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  @ApiOperation({
    summary: 'Update user',
    description:
      'Admin can update any user (name, email, role, status). ' +
      "Admin can also reset a doctor's password (not for admin accounts — use /auth/change-password instead). " +
      'Doctor can only update their own name and email. ' +
      'To change their own password, doctors should use POST /auth/change-password.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden — not authorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Email already taken' })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() actor: User & { actorType: string },
  ) {
    const result = await this.usersService.update(id, updateUserDto, actor.id, actor.role);
    return ResponseHelper.success(result, 'User updated successfully');
  }

  /**
   * Soft-delete a user (Admin only).
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Delete user (soft delete)',
    description: 'Admin only. Data remains in database with deletedAt timestamp.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - cannot delete the last active admin account',
  })
  async remove(@Param('id') id: string) {
    await this.usersService.delete(id);
    return ResponseHelper.success(null, 'User deleted successfully');
  }
}
