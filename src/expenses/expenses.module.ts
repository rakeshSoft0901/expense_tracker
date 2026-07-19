import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { ExpensesCleanupTask } from './expenses-cleanup.task';
import { Expense, ExpenseSchema } from './schemas/expense.schema';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Expense.name, schema: ExpenseSchema }]),
    CategoriesModule,
  ],
  controllers: [ExpensesController],
  providers: [ExpensesService, ExpensesCleanupTask],
  exports: [ExpensesService],
})
export class ExpensesModule {}
