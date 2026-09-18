import { ConflictException, Injectable } from '@nestjs/common';
import { CreateInteractionDto } from './dto/create-interaction.dto';
import { UpdateInteractionDto } from './dto/update-interaction.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class InteractionService {
  constructor(private prisma: PrismaService) { }
  async toggleInteraction(userId: string, dto: CreateInteractionDto) {
    const { targetId, targetType, actionType } = dto;

    try {
      // Chạy mọi thao tác bên trong Prisma Transaction
      return await this.prisma.$transaction(async (prisma) => {
      // 1. Tìm xem user đã tương tác với đối tượng này chưa
      const existingInteraction = await prisma.interaction.findUnique({
        where: {
          userId_targetId_targetType: {
            userId,
            targetId,
            targetType,
          },
        },
      });
      


      // Hàm helper để tạo object tăng/giảm likes/dislikes
      const getUpdateCountPayload = (
        isLike: boolean,
        isDislike: boolean,
        isUndo: boolean = false,
        isSwitch: boolean = false
      ) => {
        if (isUndo) {
          return {
            likes: isLike ? { decrement: 1 } : undefined,
            dislikes: isDislike ? { decrement: 1 } : undefined,
          };
        }
        if (isSwitch) {
          return {
            likes: isLike ? { increment: 1 } : { decrement: 1 },
            dislikes: isDislike ? { increment: 1 } : { decrement: 1 },
          };
        }
        return {
          likes: isLike ? { increment: 1 } : undefined,
          dislikes: isDislike ? { increment: 1 } : undefined,
        };
      };

      // Xác định thao tác tiếp theo
      let updatePayload: any = {};
      let resultAction = ''
      let myInteraction: 'LIKE' | 'DISLIKE' | null = null;
      if (existingInteraction) {
        if (existingInteraction.actionType === actionType) {
          // Trường hợp 2: Đã tương tác CÙNG LOẠI -> Bỏ Like/Dislike
          await prisma.interaction.delete({
            where: { id: existingInteraction.id },
          });
          updatePayload = getUpdateCountPayload(actionType === 'LIKE', actionType === 'DISLIKE', true);
          resultAction = 'REMOVED';
        } else {
          // Trường hợp 3: Đổi từ Like sang Dislike hoặc ngược lại
          await prisma.interaction.update({
            where: { id: existingInteraction.id },
            data: { actionType },
          });
          updatePayload = getUpdateCountPayload(actionType === 'LIKE', actionType === 'DISLIKE', false, true);
          resultAction = 'SWITCHED';
          myInteraction = actionType;
        }
      } else {
        // Trường hợp 1: Chưa tương tác -> Tạo mới Like/Dislike
        await prisma.interaction.create({
          data: {
            userId,
            targetId,
            targetType,
            actionType,
          },
        });
        updatePayload = getUpdateCountPayload(actionType === 'LIKE', actionType === 'DISLIKE');
        resultAction = 'ADDED';
        myInteraction = actionType;
      }

      // 2. Cập nhật số lượng đếm (Count) vào bảng tương ứng dựa theo targetType
      let interactionTarget: {
        likes: number;
        dislikes: number;
      } | null = null;
      switch (targetType) {
        case 'COURSE_REVIEW':
          interactionTarget = await prisma.courseReview.update({
            where: { id: parseInt(targetId) }, // Lưu ý: id của CourseReview là Int
            data: updatePayload,
            select:{
              likes: true,
              dislikes: true
            }
          });
          break;
        case 'POST':
          interactionTarget = await prisma.post.update({
            where: { id: parseInt(targetId) },
            data: updatePayload,
          });
          break;
        case 'POST_COMMENT':
          interactionTarget = await prisma.postComment.update({
            where: { id: parseInt(targetId) },
            data: updatePayload,
          });
          break;
        // Thêm các case khác (như COURSE) nếu có thuộc tính likes/dislikes
      }

      return {
        targetId,
        targetType,
        action: resultAction,
        likes:interactionTarget?.likes??0,
        dislikes:interactionTarget?.dislikes??0,
        myInteraction
      };
    });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Thao tác quá nhanh, vui lòng chờ trong giây lát.');
        }
      }
      throw error;
    }
  }


  findAll() {
    return `This action returns all interaction`;
  }

  findOne(id: number) {
    return `This action returns a #${id} interaction`;
  }

  update(id: number, updateInteractionDto: UpdateInteractionDto) {
    return `This action updates a #${id} interaction`;
  }

  remove(id: number) {
    return `This action removes a #${id} interaction`;
  }
}
