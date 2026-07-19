import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ExpensesService } from './expenses.service';

@Injectable()
export class ExpensesCleanupTask {
  private readonly logger = new Logger(ExpensesCleanupTask.name);

  constructor(private readonly expensesService: ExpensesService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handlePurgeExpiredTrash() {
    const count = await this.expensesService.purgeExpiredTrash();
    if (count > 0) {
      this.logger.log(`Purged ${count} expense(s) past trash retention`);
    }
  }
}
