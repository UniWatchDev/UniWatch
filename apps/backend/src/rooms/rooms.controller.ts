import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  UseGuards
} from '@nestjs/common';
import type { BlockedUser, RoomPreview } from '@repo/schemas/rooms';
import { ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import type { Request } from 'express';
import type { RoomResponse } from '@repo/schemas/rooms';
import { getAuthenticatedUserId } from '@/auth/get-authenticated-user-id';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import {
  BlockedUserDto,
  CreateRoomDto,
  JoinRoomBodyDto,
  JoinRoomResponseDto,
  RoomBlockedUserParamsDto,
  RoomIdParamsDto,
  RoomPreviewDto,
  RoomResponseDto,
  UpdateRoomDto
} from '@/rooms/rooms.dto';
import { RoomsService } from '@/rooms/rooms.service';

@ApiTags('rooms')
@Controller('rooms')
@UseGuards(JwtAuthGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  @ZodResponse({ status: 200, description: 'List all rooms', type: [RoomResponseDto] })
  list(): Promise<RoomResponse[]> {
    return this.roomsService.list();
  }

  @Get(':id')
  @ZodResponse({ status: 200, description: 'Get a room by id', type: RoomResponseDto })
  get(@Req() req: Request, @Param() params: RoomIdParamsDto): Promise<RoomResponse> {
    return this.roomsService.get(params.id, getAuthenticatedUserId(req));
  }

  @Post()
  @HttpCode(201)
  @ZodResponse({ status: 201, description: 'Create a room', type: RoomResponseDto })
  create(@Req() req: Request, @Body() body: CreateRoomDto): Promise<RoomResponse> {
    return this.roomsService.create(getAuthenticatedUserId(req), body);
  }

  @Get(':id/preview')
  @ZodResponse({ status: 200, description: 'Get public room preview', type: RoomPreviewDto })
  preview(@Param() params: RoomIdParamsDto): Promise<RoomPreview> {
    return this.roomsService.preview(params.id);
  }

  @Post(':id/join')
  @HttpCode(200)
  @ZodResponse({ status: 200, description: 'Join a room', type: JoinRoomResponseDto })
  join(
    @Req() req: Request,
    @Param() params: RoomIdParamsDto,
    @Body() body: JoinRoomBodyDto
  ): Promise<{ success: true }> {
    return this.roomsService.join(params.id, getAuthenticatedUserId(req), body.password);
  }

  @Delete(':id/leave')
  @HttpCode(200)
  @ZodResponse({ status: 200, description: 'Leave a room', type: JoinRoomResponseDto })
  leave(
    @Req() req: Request,
    @Param() params: RoomIdParamsDto
  ): Promise<{ success: true }> {
    return this.roomsService.leave(params.id, getAuthenticatedUserId(req));
  }

  @Get(':id/blocked-users')
  @ZodResponse({ status: 200, description: 'List blocked users', type: [BlockedUserDto] })
  listBlockedUsers(
    @Req() req: Request,
    @Param() params: RoomIdParamsDto
  ): Promise<BlockedUser[]> {
    return this.roomsService.listBlockedUsers(params.id, getAuthenticatedUserId(req));
  }

  @Delete(':id/blocked-users/:userId')
  @HttpCode(200)
  @ZodResponse({ status: 200, description: 'Unblock a user', type: [BlockedUserDto] })
  unblockUser(
    @Req() req: Request,
    @Param() params: RoomBlockedUserParamsDto
  ): Promise<BlockedUser[]> {
    return this.roomsService.unblockUser(
      params.id,
      getAuthenticatedUserId(req),
      params.userId
    );
  }

  @Patch(':id')
  @ZodResponse({ status: 200, description: 'Update a room', type: RoomResponseDto })
  update(
    @Req() req: Request,
    @Param() params: RoomIdParamsDto,
    @Body() body: UpdateRoomDto
  ): Promise<RoomResponse> {
    return this.roomsService.update(params.id, getAuthenticatedUserId(req), body);
  }

  @Delete(':id')
  delete(
    @Req() req: Request,
    @Param() params: RoomIdParamsDto
  ): Promise<{ success: true }> {
    return this.roomsService.delete(params.id, getAuthenticatedUserId(req));
  }
}
