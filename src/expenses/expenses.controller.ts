import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpenseDto } from './dto/query-expense.dto';

const ALLOWED_ATTACHMENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
];

@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  create(@Body() dto: CreateExpenseDto) {
    return this.expensesService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryExpenseDto) {
    return this.expensesService.findAll(query);
  }

  @Get('view')
  getView(@Query() query: QueryExpenseDto) {
    return this.expensesService.getView(query);
  }

  @Get('trash')
  findDeleted(@Query('userId') userId: string) {
    return this.expensesService.findDeleted(userId);
  }

  @Post('trash/:id/restore')
  restore(@Param('id') id: string, @Query('userId') userId: string) {
    return this.expensesService.restore(id, userId);
  }

  @Delete('trash/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  permanentlyDelete(@Param('id') id: string, @Query('userId') userId: string) {
    return this.expensesService.permanentlyDelete(id, userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('userId') userId: string) {
    return this.expensesService.findOneDetailed(id, userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Query('userId') userId: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(id, userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Query('userId') userId: string) {
    return this.expensesService.softDelete(id, userId);
  }

  @Post(':id/duplicate')
  duplicate(@Param('id') id: string, @Query('userId') userId: string) {
    return this.expensesService.duplicate(id, userId);
  }

  @Post(':id/attachment')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/expenses',
        filename: (_req, file, callback) => {
          callback(null, `${randomUUID()}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_ATTACHMENT_TYPES.includes(file.mimetype)) {
          callback(
            new BadRequestException(
              'Only JPEG, PNG, WEBP, HEIC, or PDF attachments are allowed',
            ),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  addAttachment(
    @Param('id') id: string,
    @Query('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.expensesService.addAttachment(id, userId, {
      url: `/uploads/expenses/${file.filename}`,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      uploadedAt: new Date(),
    });
  }

  @Delete(':id/attachment')
  removeAttachment(
    @Param('id') id: string,
    @Query('userId') userId: string,
    @Query('url') url: string,
  ) {
    return this.expensesService.removeAttachment(id, userId, url);
  }
}
