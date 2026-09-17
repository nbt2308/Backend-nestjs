import { Module } from '@nestjs/common';
import { InteractionService } from './interaction.service';
import { InteractionController } from './interaction.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthorizationModule } from '@/authorization/authorization.module';

@Module({
  imports: [PrismaModule, AuthorizationModule],
  controllers: [InteractionController],
  providers: [InteractionService],
  exports: [InteractionService]
})
export class InteractionModule { }
