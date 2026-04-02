import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';

import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, QueryUserDto } from './dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from './enums/user-role.enum';
import { ResponseHelper } from '../../common/helpers/response.helper';

/**
 * Controller for managing system users.
 *
 * Access is restricted via JWT and Role-Based Access Control (RBAC).
 */
@ApiTags('Users')
@ApiBearerAuth()
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
   * Get paginated list of users (Admin and Doctor).
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  @ApiOperation({
    summary: 'Get list of users',
    description: 'Accessible by Admin and Doctor.',
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
   * Get user detail by ID (Admin and Doctor).
   */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'User fetched successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string) {
    const result = await this.usersService.findById(id);
    return ResponseHelper.success(result, 'User fetched successfully');
  }

  /**
   * Update user details (Admin only).
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update user',
    description: 'Admin only. Password cannot be updated here.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Email already taken' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const result = await this.usersService.update(id, updateUserDto);
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
  async remove(@Param('id') id: string) {
    await this.usersService.delete(id);
    return ResponseHelper.success(null, 'User deleted successfully');
  }
}
