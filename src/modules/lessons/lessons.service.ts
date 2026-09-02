import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { YoutubeService } from '@/youtube/youtube.service';

@Injectable()
export class LessonsService {
  constructor(private prisma: PrismaService, private readonly youtubeService: YoutubeService) { }
  async create(createLessonDto: CreateLessonDto) {
    try {
      const section = await this.prisma.section.findUnique({
        where: {
          id: createLessonDto.sectionId
        }
      })
      if (!section) {
        throw new BadRequestException("Không tìm thấy chương")
      }
      let videoId: string = "";
      let duration: number = 0;

      if (createLessonDto.videoUrl) {
        const ytData = await this.youtubeService.getVideoDetails(createLessonDto.videoUrl);
        videoId = ytData.videoId;
        duration = ytData.duration;
      }
      const lesson = await this.prisma.lesson.create({
        data: {
          title: createLessonDto.title,
          videoUrl: createLessonDto.videoUrl,
          content: createLessonDto.content,
          order: createLessonDto.order,
          isPreview: createLessonDto.isPreview,
          sectionId: createLessonDto.sectionId,
          videoId: videoId,
          duration: duration,
        }
      })
      return lesson;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error
      }
      throw new BadRequestException("Lỗi khi tạo bài giảng")
    }

  }

  findAll() {
    return `This action returns all lessons`;
  }

  findOne(id: number) {
    return `This action returns a #${id} lesson`;
  }

  async update(id: number, instructorId: string, updateLessonDto: UpdateLessonDto) {
    try {
      const lesson = await this.prisma.lesson.findUnique({
        where: {
          id: id
        },
        include: {
          section: {
            select: {
              courseId: true,
              course: {
                select: {
                  instructorId: true
                }
              }
            }
          }
        }
      })
      if (!lesson) {
        throw new BadRequestException("Không tìm thấy bài giảng")
      }
      if (lesson.section.course.instructorId !== instructorId) {
        throw new ForbiddenException("Bạn không có quyền cập nhật bài giảng này")
      }
      let videoId: string = "";
      let duration: number = 0;

      if (updateLessonDto.videoUrl) {
        const ytData = await this.youtubeService.getVideoDetails(updateLessonDto.videoUrl);
        videoId = ytData.videoId;
        duration = ytData.duration;
      }
      const updatedLesson = await this.prisma.lesson.update({
        where: {
          id: id
        },
        data: {
          title: updateLessonDto.title,
          videoUrl: updateLessonDto.videoUrl,
          content: updateLessonDto.content,
          order: updateLessonDto.order,
          isPreview: updateLessonDto.isPreview,
          sectionId: updateLessonDto.sectionId,
          videoId: videoId,
          duration: duration,
        }
      })
      return updatedLesson;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error
      }
      throw new BadRequestException("Lỗi khi cập nhật bài giảng")
    }
  }

  async remove(id: number, instructorId: string) {
    try {
      const lesson = await this.prisma.lesson.findUnique({
        where: {
          id: id
        },
        include: {
          section: {
            select: {
              courseId: true,
              course: {
                select: {
                  instructorId: true
                }
              }
            }
          }
        }
      })
      if (!lesson) {
        throw new BadRequestException("Không tìm thấy bài giảng")
      }
      if (lesson.section.course.instructorId !== instructorId) {
        throw new ForbiddenException("Bạn không có quyền xóa bài giảng này")
      }
      await this.prisma.lesson.update({
        where: {
          id: id
        },
        data: {
          deletedAt: new Date(),
        }
      })
      return lesson;
    }
    catch (error) {
      if (error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error
      }
      throw new BadRequestException("Lỗi khi xóa bài giảng")
    }
  }
}
