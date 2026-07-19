import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from './schemas/category.schema';
import { Expense, ExpenseDocument } from '../expenses/schemas/expense.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { QueryCategoryDto } from './dto/query-category.dto';
import { DeleteCategoryDto } from './dto/delete-category.dto';
import { MergeCategoriesDto } from './dto/merge-categories.dto';
import { CreateSubCategoryDto } from './dto/create-subcategory.dto';
import { UpdateSubCategoryDto } from './dto/update-subcategory.dto';
import { DeleteSubCategoryDto } from './dto/delete-subcategory.dto';

const DEFAULT_CATEGORIES: { name: string; color: string; icon: string }[] = [
  { name: 'Food', color: '#FF7043', icon: 'utensils' },
  { name: 'Transport', color: '#42A5F5', icon: 'car' },
  { name: 'Utilities', color: '#FFCA28', icon: 'bolt' },
  { name: 'Health', color: '#EF5350', icon: 'heart-pulse' },
  { name: 'Entertainment', color: '#AB47BC', icon: 'film' },
  { name: 'Education', color: '#66BB6A', icon: 'graduation-cap' },
];

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(Expense.name)
    private readonly expenseModel: Model<ExpenseDocument>,
  ) {}

  private async ensureDefaultsForUser(userId: string): Promise<void> {
    const existingCount = await this.categoryModel.countDocuments({ userId });
    if (existingCount > 0) {
      return;
    }
    await this.categoryModel.insertMany(
      DEFAULT_CATEGORIES.map((category) => ({
        ...category,
        userId,
        isDefault: true,
      })),
    );
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    const existing = await this.categoryModel.findOne({
      userId: dto.userId,
      name: dto.name,
    });
    if (existing) {
      throw new ConflictException(`Category "${dto.name}" already exists`);
    }
    return this.categoryModel.create(dto);
  }

  async findAllForUser(query: QueryCategoryDto): Promise<Category[]> {
    await this.ensureDefaultsForUser(query.userId);
    const filter: Record<string, unknown> = { userId: query.userId };
    if (!query.includeArchived) {
      filter.isArchived = false;
    }
    return this.categoryModel.find(filter).sort({ name: 1 }).exec();
  }

  async findOne(id: string, userId: string): Promise<CategoryDocument> {
    const category = await this.categoryModel.findOne({ _id: id, userId });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateCategoryDto,
  ): Promise<Category> {
    if (dto.name) {
      const existing = await this.categoryModel.findOne({
        userId,
        name: dto.name,
        _id: { $ne: id },
      });
      if (existing) {
        throw new ConflictException(`Category "${dto.name}" already exists`);
      }
    }
    const category = await this.categoryModel.findOneAndUpdate(
      { _id: id, userId },
      dto,
      { new: true },
    );
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async remove(id: string, userId: string, dto: DeleteCategoryDto) {
    const category = await this.findOne(id, userId);

    let targetCategoryId: string | null = null;
    if (dto.reassignToCategoryId) {
      if (dto.reassignToCategoryId === id) {
        throw new BadRequestException(
          'Cannot reassign expenses to the category being deleted',
        );
      }
      const target = await this.categoryModel.findOne({
        _id: dto.reassignToCategoryId,
        userId,
      });
      if (!target) {
        throw new NotFoundException('Target category for reassignment not found');
      }
      targetCategoryId = target._id.toString();
    }

    await this.expenseModel.updateMany(
      { userId, categoryId: category._id },
      { categoryId: targetCategoryId, subCategoryId: null },
    );

    await category.deleteOne();

    return {
      deletedCategoryId: id,
      expensesReassignedTo: targetCategoryId ?? 'Uncategorized',
    };
  }

  async merge(id: string, userId: string, dto: MergeCategoriesDto) {
    if (id === dto.targetCategoryId) {
      throw new BadRequestException('Cannot merge a category into itself');
    }
    const source = await this.findOne(id, userId);
    const target = await this.findOne(dto.targetCategoryId, userId);

    const subCategoryIdMap = new Map<string, string>();
    for (const sourceSub of source.subCategories) {
      const match = target.subCategories.find(
        (targetSub) =>
          targetSub.name.toLowerCase() === sourceSub.name.toLowerCase(),
      );
      if (match) {
        subCategoryIdMap.set(sourceSub._id.toString(), match._id.toString());
      } else {
        target.subCategories.push({
          name: sourceSub.name,
          isArchived: sourceSub.isArchived,
        } as never);
        const created = target.subCategories[target.subCategories.length - 1];
        subCategoryIdMap.set(sourceSub._id.toString(), created._id.toString());
      }
    }
    await target.save();

    const expensesUnderSource = await this.expenseModel.find({
      userId,
      categoryId: source._id,
    });
    for (const expense of expensesUnderSource) {
      const newSubCategoryId = expense.subCategoryId
        ? (subCategoryIdMap.get(expense.subCategoryId.toString()) ?? null)
        : null;
      await this.expenseModel.updateOne(
        { _id: expense._id },
        { categoryId: target._id, subCategoryId: newSubCategoryId },
      );
    }

    await source.deleteOne();

    return {
      mergedCategoryId: id,
      into: target._id.toString(),
      expensesMoved: expensesUnderSource.length,
    };
  }

  async addSubCategory(
    categoryId: string,
    dto: CreateSubCategoryDto,
  ): Promise<Category> {
    const category = await this.findOne(categoryId, dto.userId);
    const nameTaken = category.subCategories.some(
      (sub) => sub.name.toLowerCase() === dto.name.toLowerCase(),
    );
    if (nameTaken) {
      throw new ConflictException(
        `Sub-category "${dto.name}" already exists under this category`,
      );
    }
    category.subCategories.push({ name: dto.name, isArchived: false } as never);
    await category.save();
    return category;
  }

  async updateSubCategory(
    categoryId: string,
    subCategoryId: string,
    dto: UpdateSubCategoryDto,
  ): Promise<Category> {
    const category = await this.findOne(categoryId, dto.userId);
    const subCategory = category.subCategories.id(subCategoryId);
    if (!subCategory) {
      throw new NotFoundException('Sub-category not found');
    }
    if (dto.name !== undefined) {
      subCategory.name = dto.name;
    }
    if (dto.isArchived !== undefined) {
      subCategory.isArchived = dto.isArchived;
    }
    await category.save();
    return category;
  }

  async removeSubCategory(
    categoryId: string,
    subCategoryId: string,
    dto: DeleteSubCategoryDto,
  ) {
    const category = await this.findOne(categoryId, dto.userId);
    const subCategory = category.subCategories.id(subCategoryId);
    if (!subCategory) {
      throw new NotFoundException('Sub-category not found');
    }

    let targetSubCategoryId: string | null = null;
    if (dto.reassignToSubCategoryId) {
      if (dto.reassignToSubCategoryId === subCategoryId) {
        throw new BadRequestException(
          'Cannot reassign expenses to the sub-category being deleted',
        );
      }
      const targetSub = category.subCategories.id(
        dto.reassignToSubCategoryId,
      );
      if (!targetSub) {
        throw new NotFoundException(
          'Target sub-category for reassignment not found',
        );
      }
      targetSubCategoryId = targetSub._id.toString();
    }

    await this.expenseModel.updateMany(
      { userId: dto.userId, categoryId: category._id, subCategoryId },
      { subCategoryId: targetSubCategoryId },
    );

    subCategory.deleteOne();
    await category.save();

    return {
      deletedSubCategoryId: subCategoryId,
      expensesReassignedTo: targetSubCategoryId,
    };
  }

  async validateForExpense(
    userId: string,
    categoryId?: string | null,
    subCategoryId?: string | null,
  ): Promise<void> {
    if (!categoryId) {
      if (subCategoryId) {
        throw new BadRequestException(
          'subCategoryId cannot be set without a categoryId',
        );
      }
      return;
    }

    const category = await this.categoryModel.findOne({
      _id: categoryId,
      userId,
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    if (category.isArchived) {
      throw new BadRequestException(
        'Cannot assign an archived category to an expense',
      );
    }

    if (subCategoryId) {
      const subCategory = category.subCategories.id(subCategoryId);
      if (!subCategory) {
        throw new NotFoundException('Sub-category not found under this category');
      }
      if (subCategory.isArchived) {
        throw new BadRequestException(
          'Cannot assign an archived sub-category to an expense',
        );
      }
    }
  }
}
