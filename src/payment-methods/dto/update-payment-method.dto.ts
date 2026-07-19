import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreatePaymentMethodDto } from './create-payment-method.dto';

export class UpdatePaymentMethodDto extends PartialType(
  OmitType(CreatePaymentMethodDto, ['userId'] as const),
) {}
