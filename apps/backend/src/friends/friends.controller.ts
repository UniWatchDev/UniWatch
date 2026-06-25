import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import type { Request } from 'express';

import { FRIENDS_CONTROLLER_PATH } from '@repo/consts/friends';
import type { PublicProfile } from '@repo/schemas/profile';

import { getAuthenticatedUserId } from '@/auth/get-authenticated-user-id';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import {
  FriendActionSuccessDto,
  FriendRequestIdParamsDto,
  FriendRequestResponseDto,
  FriendUserIdParamsDto,
  PublicProfileDto,
  RespondFriendRequestBodyDto,
  SendFriendRequestBodyDto,
  SendFriendRequestResponseDto,
  type FriendActionSuccess,
  type FriendRequestResponse,
  type SendFriendRequestResponse
} from './friends.dto';
import { FriendsService } from './friends.service';

@ApiTags('friends')
@Controller(FRIENDS_CONTROLLER_PATH)
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(private readonly friends: FriendsService) {}

  @Get()
  @ZodResponse({ status: 200, description: 'Friend list', type: [PublicProfileDto] })
  getFriends(@Req() req: Request): Promise<PublicProfile[]> {
    return this.friends.getFriendList(getAuthenticatedUserId(req));
  }

  @Delete(':userId')
  @ZodResponse({ status: 200, description: 'Unfriend', type: FriendActionSuccessDto })
  async unfriend(
    @Req() req: Request,
    @Param() params: FriendUserIdParamsDto
  ): Promise<FriendActionSuccess> {
    await this.friends.unfriend(getAuthenticatedUserId(req), params.userId);
    return { success: true };
  }

  @Get('requests')
  @ZodResponse({ status: 200, description: 'Pending incoming requests', type: [FriendRequestResponseDto] })
  getPendingRequests(@Req() req: Request): Promise<FriendRequestResponse[]> {
    return this.friends.getPendingInbox(getAuthenticatedUserId(req));
  }

  @Post('requests')
  @ZodResponse({ status: 201, description: 'Send friend request', type: SendFriendRequestResponseDto })
  sendRequest(
    @Req() req: Request,
    @Body() body: SendFriendRequestBodyDto
  ): Promise<SendFriendRequestResponse> {
    return this.friends.sendRequest(getAuthenticatedUserId(req), body.targetUserId);
  }

  @Patch('requests/:requestId')
  @ZodResponse({ status: 200, description: 'Accept or reject a request', type: FriendActionSuccessDto })
  async respondToRequest(
    @Req() req: Request,
    @Param() params: FriendRequestIdParamsDto,
    @Body() body: RespondFriendRequestBodyDto
  ): Promise<FriendActionSuccess> {
    await this.friends.respondToRequest({
      actorUserId: getAuthenticatedUserId(req),
      requestId: params.requestId,
      action: body.action
    });
    return { success: true };
  }
}
