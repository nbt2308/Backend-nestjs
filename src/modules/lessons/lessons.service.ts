import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { YoutubeService } from '@/youtube/youtube.service';
import { StorageService } from '@/storage/storage.service';
import { uuidv4 } from 'uuidv7';
import { fileTypeFromBuffer } from 'file-type';
import { LessonAccessService } from './lessons-access.service';
@Injectable()
export class LessonsService {
  constructor(private prisma: PrismaService,
    private readonly lessonAccessService: LessonAccessService,
    private readonly youtubeService: YoutubeService,
    private readonly storageService: StorageService) { }

  async uploadResources(lessonId: number, files: Express.Multer.File[]) {
    //validate mảng files gửi xuống
    if (!files || files.length === 0) {
      throw new BadRequestException('Phải có ít nhất 1 file');
    }

    if (files.length > 5) {
      throw new BadRequestException('Tối đa 5 files mỗi lần tải lên');
    }

    const lesson = await this.prisma.lesson.findFirst({
      where: {
        id: lessonId,
        deletedAt: null,
      },
      select: {
        id: true,
        section: {
          select: {
            courseId: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Bài giảng không tồn tại');
    }

    const allowedTypes = {
      pdf: 'application/pdf',
      zip: 'application/zip',
    };

    const uploadedKeys: string[] = [];
    const resources: { name: string, key: string, mimeType: string, size: number, lessonId: number }[] = [];

    try {
      for (const file of files) {
        const extension = file.originalname
          .split('.')
          .pop()
          ?.toLowerCase();

        if (!extension || !['pdf', 'zip'].includes(extension)) {
          throw new BadRequestException(
            `File "${file.originalname}" không được hỗ trợ`,
          );
        }

        //validate file thật 
        const detectedType = await fileTypeFromBuffer(file.buffer);

        if (!detectedType) {
          throw new BadRequestException(
            `Không thể xác định kiểu dữ liệu của file: "${file.originalname}"`,
          );
        }

        //validate kiểu dữ liệu của file: pdf
        if (extension === 'pdf') {
          if (
            detectedType.ext !== 'pdf' ||
            detectedType.mime !== allowedTypes.pdf
          ) {
            throw new BadRequestException(
              `File "${file.originalname}" không phải là file PDF hợp lệ`,
            );
          }
        }
        //validate kiểu dữ liệu của file: zip
        if (extension === 'zip') {
          if (
            detectedType.ext !== 'zip' ||
            ![
              'application/zip',
              'application/x-zip-compressed',
            ].includes(detectedType.mime)
          ) {
            throw new BadRequestException(
              `File "${file.originalname}" không phải là file ZIP hợp lệ`,
            );
          }
        }
        //sinh file name ngẫu nhiên không lấy file name của FE gửi
        const fileName = `${uuidv4()}.${extension}`;

        //tạo key: courses/${courseId}/lessons/${lessonId}/${fileName}
        const key = `courses/${lesson.section.courseId}/lessons/${lesson.id}/${fileName}`;

        //upload file lên cloudflare
        await this.storageService.uploadFile(
          key,
          file.buffer,
          file.mimetype,
        );
        uploadedKeys.push(key);
        resources.push({
          name: file.originalname,
          key,
          mimeType: detectedType.mime,
          size: file.size,
          lessonId: lesson.id,
        });
      }
      return await this.prisma.lessonResource.createMany({
        data: resources,
      });
    }
    catch (error) {
      await Promise.all(
        uploadedKeys.map((key) =>
          this.storageService.deleteFile(key),
        ),
      );
      throw error;
    }
  }

  async downloadResources(userId: string, lessonId: number, resourceId: number) {
    // kiểm tra quyền truy cập tài nguyên
    await this.lessonAccessService.assertCanDownloadResource(userId, lessonId);

    const resource = await this.prisma.lessonResource.findFirst({
      where: {
        id: resourceId,
        lessonId,
      },
      select: {
        id: true,
        name: true,
        key: true,
        mimeType: true,
        size: true,
      },
    });

    if (!resource) {
      throw new NotFoundException('Tài nguyên không tồn tại');
    }

    const url = await this.storageService.getSignedUrl(
      resource.key,
      300, //5 phút
    );

    return {
      url,
      name: resource.name,
      mimeType: resource.mimeType,
      size: resource.size,
      expiresIn: 300,
    };



  }

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
