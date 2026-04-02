import { Controller, Post, Get, Body, UseGuards, HttpStatus, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';

import { ResponseHelper } from '../../common/helpers/response.helper';
import { ApiResponse as ApiResponseType } from '../../common/interfaces/api-response.interface';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto, AccessTokenResponseDto } from './dto/auth-response.dto';

import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { LocalAuthGuard } from './guards/local-auth.guard';

import { User } from '../users/entities/user.entity';
import { Patient } from '../patients/entities/patient.entity';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { PatientResponseDto } from '../patients/dto/patient-response.dto';

/**
 * Authentication controller.
 *
 * Provides endpoints for registration, login, profile retrieval,
 * password change, token refresh, and logout. Supports both
 * User (admin/doctor) and Patient actors via a unified API surface.
 */
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Register a new patient account from the mobile app.
   */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register patient account',
    description:
      'Register a new patient account from the mobile app. ' +
      'All registrations via this endpoint are automatically created as patients.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    type: AuthResponseDto,
    description: 'Registration successful',
  })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  @ApiResponse({ status: 422, description: 'Validation error' })
  async register(@Body() dto: RegisterDto): Promise<ApiResponseType<AuthResponseDto>> {
    const result = await this.authService.register(dto);
    return ResponseHelper.success(result, 'Registration successful', HttpStatus.CREATED);
  }

  /**
   * Login for User (admin/doctor) and Patient.
   *
   * Credentials are validated by the LocalAuthGuard (Passport local strategy).
   * Tokens are returned in the response body — **no cookies**.
   */
  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login',
    description:
      'Login for User (dokter/admin) and Patient. ' +
      'Token dikirim via response body, bukan cookie.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    type: AuthResponseDto,
    description: 'Login successful',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @CurrentUser() actor: (User | Patient) & { actorType: 'user' | 'patient' },
  ): Promise<ApiResponseType<AuthResponseDto>> {
    const result = await this.authService.login(actor, actor.actorType);
    return ResponseHelper.success(result, 'Login successful');
  }

  /**
   * Get the profile of the currently authenticated actor.
   */
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile fetched successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(
    @CurrentUser() actor: (User | Patient) & { actorType: 'user' | 'patient' },
  ): Promise<ApiResponseType<UserResponseDto | PatientResponseDto>> {
    const profile = await this.authService.getProfile(actor.id, actor.actorType);
    return ResponseHelper.success(profile, 'Profile fetched successfully');
  }

  /**
   * Change the password of the currently authenticated actor.
   */
  @ApiBearerAuth()
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
  })
  @ApiResponse({ status: 400, description: 'Current password is wrong' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async changePassword(
    @CurrentUser() actor: (User | Patient) & { actorType: 'user' | 'patient' },
    @Body() dto: ChangePasswordDto,
  ): Promise<ApiResponseType<null>> {
    await this.authService.changePassword(actor.id, actor.actorType, dto);
    return ResponseHelper.success(null, 'Password changed successfully');
  }

  /**
   * Exchange a refresh token for a new access token.
   *
   * The client sends the refresh token in the request body
   * (not as a cookie or header) per mobile-first architecture requirements.
   */
  @Public()
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Kirim refreshToken di body untuk mendapatkan accessToken baru. ' +
      'Endpoint ini public — tidak memerlukan Bearer token.',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    type: AccessTokenResponseDto,
    description: 'Token refreshed',
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token invalid or expired',
  })
  async refreshToken(
    @Body() dto: RefreshTokenDto,
  ): Promise<ApiResponseType<AccessTokenResponseDto>> {
    const result = await this.authService.refreshToken(dto);
    return ResponseHelper.success(result, 'Token refreshed successfully');
  }

  /**
   * Logout — invalidate the refresh token in Redis.
   */
  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout',
    description: 'Invalidate refresh token dari Redis.',
  })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(
    @CurrentUser() actor: (User | Patient) & { actorType: 'user' | 'patient' },
  ): Promise<ApiResponseType<null>> {
    await this.authService.logout(actor.id, actor.actorType);
    return ResponseHelper.success(null, 'Logged out successfully');
  }
}
