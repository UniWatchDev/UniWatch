import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { UserRepository } from '@/auth/user.repository';
import type { UserDocument } from '@/auth/user.schema';
import type { Env } from '@/utils/env.validation';

@Injectable()
export class AdminRoleService implements OnModuleInit {
  private readonly logger = new Logger(AdminRoleService.name);

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly users: UserRepository
  ) {}

  onModuleInit(): void {
    void this.syncFromConfig();
  }

  getConfiguredAdminEmails(): string[] {
    return this.config.get('ADMIN_EMAILS', { infer: true });
  }

  shouldBeAdmin(email: string): boolean {
    return this.getConfiguredAdminEmails().includes(email.trim().toLowerCase());
  }

  async syncFromConfig(): Promise<void> {
    const emails = this.getConfiguredAdminEmails();
    const promoted = await this.users.promoteEmailsToAdmin(emails);
    const demoted = await this.users.demoteAdminsNotInEmails(emails);
    if (promoted > 0 || demoted > 0) {
      this.logger.log(
        `Admin roles synced: promoted=${String(promoted)}, demoted=${String(demoted)}`
      );
    }
  }

  async syncUser(doc: UserDocument): Promise<UserDocument> {
    const shouldBeAdmin = this.shouldBeAdmin(doc.email);
    if (doc.isAdmin === shouldBeAdmin) {
      return doc;
    }
    const updated = await this.users.setIsAdmin(doc._id.toString(), shouldBeAdmin);
    return updated ?? doc;
  }

  async isUserAdmin(userId: string): Promise<boolean> {
    const user = await this.users.findById(userId);
    return user?.isAdmin === true;
  }
}
