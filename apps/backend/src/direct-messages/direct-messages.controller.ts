import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import type { Request } from 'express';

import { DM_CONTROLLER_PATH } from '@repo/consts/dm';

import { getAuthenticatedUserId } from '@/auth/get-authenticated-user-id';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { DirectMessageDto, DmUserIdParamsDto, type DirectMessage } from './direct-messages.dto';
import { DirectMessagesService } from './direct-messages.service';

@ApiTags('dm')
@Controller(DM_CONTROLLER_PATH)
@UseGuards(JwtAuthGuard)
export class DirectMessagesController {
  constructor(private readonly dm: DirectMessagesService) {}

  @Get(':userId')
  @ZodResponse({ status: 200, description: 'Last 50 DMs with a user', type: [DirectMessageDto] })
  getHistory(
    @Req() req: Request,
    @Param() params: DmUserIdParamsDto
  ): Promise<DirectMessage[]> {
    return this.dm.getHistory(getAuthenticatedUserId(req), params.userId);
  }
}
