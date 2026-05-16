import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import type { RoomResponse } from '@repo/schemas/rooms';
import { CreateRoomDto, RoomIdParamsDto, RoomResponseDto } from '@/rooms/rooms.dto';
import { RoomsService } from '@/rooms/rooms.service';

@ApiTags('rooms')
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  @ZodResponse({ status: 200, description: 'List all rooms', type: [RoomResponseDto] })
  list(): Promise<RoomResponse[]> {
    return this.roomsService.list();
  }

  @Get(':id')
  @ZodResponse({ status: 200, description: 'Get a room by id', type: RoomResponseDto })
  get(@Param() params: RoomIdParamsDto): Promise<RoomResponse> {
    return this.roomsService.get(params.id);
  }

  @Post()
  @HttpCode(201)
  @ZodResponse({ status: 201, description: 'Create a room', type: RoomResponseDto })
  create(@Body() body: CreateRoomDto): Promise<RoomResponse> {
    return this.roomsService.create(body);
  }

  @Delete(':id')
  delete(@Param() params: RoomIdParamsDto): Promise<{ success: true }> {
    return this.roomsService.delete(params.id);
  }
}
