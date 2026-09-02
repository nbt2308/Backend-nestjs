import { Module } from '@nestjs/common';
import { TagsService } from './tags.service';
import { TagsController } from './tags.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthorizationModule } from '@/authorization/authorization.module';

@Module({
  imports: [PrismaModule, AuthorizationModule],
  controllers: [TagsController],
  providers: [TagsService],
  exports: [TagsService]
})
export class TagsModule { }
