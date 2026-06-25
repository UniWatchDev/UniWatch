import { Controller, Get, Param, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import type { Request } from 'express';

import { USERS_CONTROLLER_PATH } from '@repo/consts/profile';

import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import {
  GetUserProfileResponseDto,
  PublicProfileDto,
  UserNameParamsDto,
  UserSearchQueryDto,
  type GetUserProfileResponse,
  type UserSearchResponse
} from '@/users/users.dto';
import { UsersService } from '@/users/users.service';

@ApiTags('users')
@Controller(USERS_CONTROLLER_PATH)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('search')
  @UseGuards(JwtAuthGuard)
  @ZodResponse({
    status: 200,
    description: 'Search users by username (login required)',
    type: [PublicProfileDto]
  })
  searchUsers(
    @Req() req: Request,
    @Query() query: UserSearchQueryDto
  ): Promise<UserSearchResponse> {
    const payload = req.authPayload;
    if (payload === undefined) {
      throw new UnauthorizedException('Missing or invalid access token');
    }
    return this.usersService.searchUsers(payload.sub, query.q);
  }

  @Get(':userName')
  @UseGuards(JwtAuthGuard)
  @ZodResponse({
    status: 200,
    description: 'Public profile card for a username (login required)',
    type: GetUserProfileResponseDto
  })
  getByUserName(
    @Req() req: Request,
    @Param() params: UserNameParamsDto
  ): Promise<GetUserProfileResponse> {
    const payload = req.authPayload;
    if (payload === undefined) {
      throw new UnauthorizedException('Missing or invalid access token');
    }
    return this.usersService.getProfileByUserName(payload.sub, params.userName);
  }
}
