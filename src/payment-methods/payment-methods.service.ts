import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PaymentMethod,
  PaymentMethodDocument,
} from './schemas/payment-method.schema';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';

@Injectable()
export class PaymentMethodsService {
  constructor(
    @InjectModel(PaymentMethod.name)
    private readonly paymentMethodModel: Model<PaymentMethodDocument>,
  ) {}

  async create(dto: CreatePaymentMethodDto): Promise<PaymentMethod> {
    const existing = await this.paymentMethodModel.findOne({
      userId: dto.userId,
      name: dto.name,
    });
    if (existing) {
      throw new ConflictException(
        `Payment method "${dto.name}" already exists`,
      );
    }
    return this.paymentMethodModel.create(dto);
  }

  async findAllForUser(userId: string): Promise<PaymentMethod[]> {
    return this.paymentMethodModel
      .find({ userId })
      .sort({ name: 1 })
      .exec();
  }

  async findOne(id: string, userId: string): Promise<PaymentMethod> {
    const paymentMethod = await this.paymentMethodModel.findOne({
      _id: id,
      userId,
    });
    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }
    return paymentMethod;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdatePaymentMethodDto,
  ): Promise<PaymentMethod> {
    const paymentMethod = await this.paymentMethodModel.findOneAndUpdate(
      { _id: id, userId },
      dto,
      { new: true },
    );
    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }
    return paymentMethod;
  }

  async remove(id: string, userId: string): Promise<void> {
    const result = await this.paymentMethodModel.deleteOne({
      _id: id,
      userId,
    });
    if (result.deletedCount === 0) {
      throw new NotFoundException('Payment method not found');
    }
  }
}
