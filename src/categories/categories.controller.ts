import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { QueryCategoryDto } from './dto/query-category.dto';
import { DeleteCategoryDto } from './dto/delete-category.dto';
import { MergeCategoriesDto } from './dto/merge-categories.dto';
import { CreateSubCategoryDto } from './dto/create-subcategory.dto';
import { UpdateSubCategoryDto } from './dto/update-subcategory.dto';
import { DeleteSubCategoryDto } from './dto/delete-subcategory.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryCategoryDto) {
    return this.categoriesService.findAllForUser(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('userId') userId: string) {
    return this.categoriesService.findOne(id, userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Query('userId') userId: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, userId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Body() dto: DeleteCategoryDto) {
    return this.categoriesService.remove(id, dto.userId, dto);
  }

  @Post(':id/merge')
  merge(@Param('id') id: string, @Body() dto: MergeCategoriesDto) {
    return this.categoriesService.merge(id, dto.userId, dto);
  }

  @Post(':id/subcategories')
  addSubCategory(
    @Param('id') id: string,
    @Body() dto: CreateSubCategoryDto,
  ) {
    return this.categoriesService.addSubCategory(id, dto);
  }

  @Patch(':id/subcategories/:subId')
  updateSubCategory(
    @Param('id') id: string,
    @Param('subId') subId: string,
    @Body() dto: UpdateSubCategoryDto,
  ) {
    return this.categoriesService.updateSubCategory(id, subId, dto);
  }

  @Delete(':id/subcategories/:subId')
  removeSubCategory(
    @Param('id') id: string,
    @Param('subId') subId: string,
    @Body() dto: DeleteSubCategoryDto,
  ) {
    return this.categoriesService.removeSubCategory(id, subId, dto);
  }
}
