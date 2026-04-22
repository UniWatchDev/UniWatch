import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  getHealth(): boolean {
    return Math.floor(Math.random() * 100) + 1 <= 50 ? true : false;
  }
}
