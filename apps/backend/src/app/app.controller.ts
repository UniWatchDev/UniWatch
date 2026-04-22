import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import type { RootResponse } from '@repo/schemas/root';
import { AppService } from '@/app/app.service';
import { RootResponseDto } from '@/app/app.dto';

@ApiTags('root')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ZodResponse({
    status: 200,
    description: 'Starter running message',
    type: RootResponseDto
  })
  getRoot(): RootResponse {
    return { message: this.appService.getHello() };
  }
}
