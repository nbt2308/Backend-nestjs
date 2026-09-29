import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthorizationModule } from '@/authorization/authorization.module';

@Module({
  imports: [PrismaModule, AuthorizationModule],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
