import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { Expense, ExpenseDocument, Attachment } from './schemas/expense.schema';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpenseDto } from './dto/query-expense.dto';

export const TRASH_RETENTION_DAYS = 30;

@Injectable()
export class ExpensesService {
  constructor(
    @InjectModel(Expense.name)
    private readonly expenseModel: Model<ExpenseDocument>,
  ) {}

  create(dto: CreateExpenseDto): Promise<Expense> {
    return this.expenseModel.create({
      ...dto,
      date: dto.date ? new Date(dto.date) : new Date(),
      category: dto.category?.trim() || 'Uncategorized',
    });
  }

  async findAll(query: QueryExpenseDto): Promise<Expense[]> {
    const filter: QueryFilter<ExpenseDocument> = {
      userId: query.userId,
      isDeleted: false,
    };

    if (query.category) {
      filter.category = query.category;
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

    return this.expenseModel.find(filter).sort({ date: -1 }).exec();
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

  async update(
    id: string,
    userId: string,
    dto: UpdateExpenseDto,
  ): Promise<Expense> {
    const update: Partial<Expense> = { ...dto } as Partial<Expense>;
    if (dto.date) {
      update.date = new Date(dto.date) as unknown as Date;
    }
    if (dto.category !== undefined) {
      update.category = dto.category.trim() || 'Uncategorized';
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
