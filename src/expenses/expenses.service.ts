import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { Expense, ExpenseDocument, Attachment } from './schemas/expense.schema';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpenseDto } from './dto/query-expense.dto';
import { CategoriesService } from '../categories/categories.service';

export const TRASH_RETENTION_DAYS = 30;

interface PopulatedPaymentMethod {
  _id: Types.ObjectId;
  name: string;
}

interface PopulatedCategory {
  _id: Types.ObjectId;
  name: string;
  color: string;
  icon: string;
}

interface ExpenseListItem {
  id: string;
  amount: number;
  title: string;
  category: { id: string; name: string; color: string; icon: string } | null;
  date: Date;
  paymentMethod: { id: string; name: string } | null;
}

interface ExpenseGroup {
  date: string;
  total: number;
  count: number;
  expenses: ExpenseListItem[];
}

export interface ExpenseListView {
  total: number;
  count: number;
  groups: ExpenseGroup[];
}

@Injectable()
export class ExpensesService {
  constructor(
    @InjectModel(Expense.name)
    private readonly expenseModel: Model<ExpenseDocument>,
    private readonly categoriesService: CategoriesService,
  ) {}

  async create(dto: CreateExpenseDto): Promise<Expense> {
    await this.categoriesService.validateForExpense(
      dto.userId,
      dto.categoryId,
      dto.subCategoryId,
    );
    return this.expenseModel.create({
      ...dto,
      date: dto.date ? new Date(dto.date) : new Date(),
    });
  }

  private buildFilter(query: QueryExpenseDto): QueryFilter<ExpenseDocument> {
    const filter: QueryFilter<ExpenseDocument> = {
      userId: query.userId,
      isDeleted: false,
    };

    if (query.categoryId) {
      filter.categoryId = new Types.ObjectId(query.categoryId);
    }
    if (query.subCategoryId) {
      filter.subCategoryId = new Types.ObjectId(query.subCategoryId);
    }
    if (query.tag) {
      filter.tags = query.tag;
    }
    if (query.paymentMethodId) {
      filter.paymentMethodId = new Types.ObjectId(query.paymentMethodId);
    }
    if (query.from || query.to) {
      filter.date = {};
      if (query.from) filter.date.$gte = new Date(query.from);
      if (query.to) filter.date.$lte = new Date(query.to);
    }

    return filter;
  }

  async findAll(query: QueryExpenseDto): Promise<Expense[]> {
    const filter = this.buildFilter(query);
    return this.expenseModel.find(filter).sort({ date: -1 }).exec();
  }

  async getView(query: QueryExpenseDto): Promise<ExpenseListView> {
    const filter = this.buildFilter(query);
    const expenses = await this.expenseModel
      .find(filter)
      .sort({ date: -1 })
      .populate<{ paymentMethodId: PopulatedPaymentMethod | null }>(
        'paymentMethodId',
        'name',
      )
      .populate<{ categoryId: PopulatedCategory | null }>(
        'categoryId',
        'name color icon',
      )
      .lean()
      .exec();

    const groups: ExpenseGroup[] = [];
    const groupIndexByDate = new Map<string, number>();
    let total = 0;

    for (const expense of expenses) {
      total += expense.amount;
      const dateKey = new Date(expense.date).toISOString().slice(0, 10);

      let groupIndex = groupIndexByDate.get(dateKey);
      if (groupIndex === undefined) {
        groupIndex = groups.length;
        groupIndexByDate.set(dateKey, groupIndex);
        groups.push({ date: dateKey, total: 0, count: 0, expenses: [] });
      }

      const group = groups[groupIndex];
      group.total += expense.amount;
      group.count += 1;
      group.expenses.push({
        id: expense._id.toString(),
        amount: expense.amount,
        title: expense.title,
        category: expense.categoryId
          ? {
              id: expense.categoryId._id.toString(),
              name: expense.categoryId.name,
              color: expense.categoryId.color,
              icon: expense.categoryId.icon,
            }
          : null,
        date: expense.date,
        paymentMethod: expense.paymentMethodId
          ? {
              id: expense.paymentMethodId._id.toString(),
              name: expense.paymentMethodId.name,
            }
          : null,
      });
    }

    return { total, count: expenses.length, groups };
  }

  async findOne(id: string, userId: string): Promise<ExpenseDocument> {
    const expense = await this.expenseModel.findOne({
      _id: id,
      userId,
      isDeleted: false,
    });
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }
    return expense;
  }

  async findOneDetailed(id: string, userId: string): Promise<Expense> {
    const expense = await this.expenseModel
      .findOne({ _id: id, userId, isDeleted: false })
      .populate('paymentMethodId', 'name isActive')
      .populate('categoryId', 'name color icon')
      .exec();
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }
    return expense;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateExpenseDto,
  ): Promise<Expense> {
    const existing = await this.findOne(id, userId);

    if (dto.categoryId !== undefined || dto.subCategoryId !== undefined) {
      const effectiveCategoryId =
        dto.categoryId !== undefined
          ? dto.categoryId
          : (existing.categoryId?.toString() ?? null);
      const effectiveSubCategoryId =
        dto.subCategoryId !== undefined
          ? dto.subCategoryId
          : (existing.subCategoryId?.toString() ?? null);
      await this.categoriesService.validateForExpense(
        userId,
        effectiveCategoryId,
        effectiveSubCategoryId,
      );
    }

    const update: Partial<Expense> = { ...dto } as Partial<Expense>;
    if (dto.date) {
      update.date = new Date(dto.date) as unknown as Date;
    }

    const expense = await this.expenseModel.findOneAndUpdate(
      { _id: id, userId, isDeleted: false },
      update,
      { new: true },
    );
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }
    return expense;
  }

  async duplicate(id: string, userId: string): Promise<Expense> {
    const original = await this.findOne(id, userId);
    const clone = original.toObject();
    delete (clone as { _id?: unknown })._id;
    delete (clone as { createdAt?: unknown }).createdAt;
    delete (clone as { updatedAt?: unknown }).updatedAt;
    return this.expenseModel.create({
      ...clone,
      date: new Date(),
    });
  }

  async softDelete(id: string, userId: string): Promise<void> {
    const expense = await this.expenseModel.findOneAndUpdate(
      { _id: id, userId, isDeleted: false },
      { isDeleted: true, deletedAt: new Date() },
    );
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }
  }

  async findDeleted(userId: string): Promise<Expense[]> {
    return this.expenseModel
      .find({ userId, isDeleted: true })
      .sort({ deletedAt: -1 })
      .exec();
  }

  async restore(id: string, userId: string): Promise<Expense> {
    const expense = await this.expenseModel.findOneAndUpdate(
      { _id: id, userId, isDeleted: true },
      { isDeleted: false, deletedAt: null },
      { new: true },
    );
    if (!expense) {
      throw new NotFoundException('Deleted expense not found');
    }
    return expense;
  }

  async permanentlyDelete(id: string, userId: string): Promise<void> {
    const result = await this.expenseModel.deleteOne({
      _id: id,
      userId,
      isDeleted: true,
    });
    if (result.deletedCount === 0) {
      throw new NotFoundException('Deleted expense not found');
    }
  }

  async addAttachment(
    id: string,
    userId: string,
    attachment: Attachment,
  ): Promise<Expense> {
    const expense = await this.expenseModel.findOneAndUpdate(
      { _id: id, userId, isDeleted: false },
      { $push: { attachments: attachment } },
      { new: true },
    );
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }
    return expense;
  }

  async removeAttachment(
    id: string,
    userId: string,
    url: string,
  ): Promise<Expense> {
    const expense = await this.expenseModel.findOneAndUpdate(
      { _id: id, userId, isDeleted: false },
      { $pull: { attachments: { url } } },
      { new: true },
    );
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }
    return expense;
  }

  async purgeExpiredTrash(): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - TRASH_RETENTION_DAYS);
    const result = await this.expenseModel.deleteMany({
      isDeleted: true,
      deletedAt: { $lte: cutoff },
    });
    return result.deletedCount ?? 0;
  }
}
