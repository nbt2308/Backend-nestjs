import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { StorageService } from '@/storage/storage.service';
import { uuidv4 } from 'uuidv7';
import { fileTypeFromBuffer } from 'file-type';
import { LessonAccessService } from './lessons-access.service';
import { VideoUploadService } from '@/video/video-upload.service';
import { unlink } from 'fs/promises';
import { CleanupService } from '@/cleanup/cleanup.service';
import { extractPublicIdsFromHtml } from '@/media/media.utils';
import { CourseStatus } from '@prisma/client';
import { stripHtmlTags } from '@/helpers/stripHtml.util';
import { AuthorizationService } from '@/authorization/authorization.service';

@Injectable()
export class LessonsService {
  constructor(private prisma: PrismaService,
    private readonly lessonAccessService: LessonAccessService,
    private readonly storageService: StorageService,
    private readonly videoUploadService: VideoUploadService,
    private readonly authorizationService: AuthorizationService,
    private readonly cleanupService: CleanupService) { }

  async uploadResources(userId: string, lessonId: number, files: Express.Multer.File[]) {
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
            course: {
              select: {
                instructorId: true,
                status: true,
              }
            }
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Bài giảng không tồn tại');
    }
    const isAdmin = await this.authorizationService.hasRole(userId, 'ADMIN');

    if (!isAdmin && lesson.section.course.instructorId !== userId) {
      throw new ForbiddenException(
        'Bạn không có quyền thêm tài nguyên vào bài giảng này',
      );
    }
    if (!([CourseStatus.DRAFT, CourseStatus.REJECTED, CourseStatus.UNPUBLISHED] as CourseStatus[]).includes(lesson.section.course.status)) {
      throw new BadRequestException('Không thể chỉnh sửa nội dung khi khóa học đang xuất bản hoặc chờ duyệt');
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

    

    //check file exist in db
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

    //check file exist on R2
    const fileExist = await this.storageService.headObject(resource.key);
    if (!fileExist) {
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

  async create(userId: string, createLessonDto: CreateLessonDto, videoFile: Express.Multer.File) {
    const filePath = videoFile?.path;
    let lessonId: number | null = null;
    try {
      if (!videoFile) {
        throw new BadRequestException('Phải upload video cho bài giảng');
      }
      const section = await this.prisma.section.findUnique({
        where: {
          id: createLessonDto.sectionId
        },
        include: { course: true }
      })
      if (!section) {
        throw new BadRequestException("Không tìm thấy chương")
      }
      const isAdmin = await this.authorizationService.hasRole(userId, 'ADMIN');

      if (!isAdmin && section.course.instructorId !== userId) {
        throw new ForbiddenException(
          'Bạn không có quyền thêm bài giảng vào khóa học này',
        );
      }
      if (!([CourseStatus.DRAFT, CourseStatus.REJECTED, CourseStatus.UNPUBLISHED] as CourseStatus[]).includes(section.course.status)) {
        throw new BadRequestException('Không thể chỉnh sửa nội dung khi khóa học đang xuất bản hoặc chờ duyệt');
      }


      const lesson = await this.prisma.lesson.create({
        data: {
          title: createLessonDto.title,
          content: createLessonDto.content,
          order: createLessonDto.order,
          isPreview: createLessonDto.isPreview,
          sectionId: createLessonDto.sectionId,
          videoId: null,
          duration: null,
          videoStatus: 'PENDING',
        }

      })
      lessonId = lesson.id;

      //thêm vào queue để upload video lên youtube (đưa job cho anh công nhân)
      await this.videoUploadService.addUploadJob({
        lessonId: lesson.id,
        filePath: videoFile.path,
        title: createLessonDto.title,
        description: stripHtmlTags(createLessonDto.content),
      });
      return lesson;
    } catch (error) {
      //nếu trong quá trình tạo bài giảng có lỗi thì xoá bài giảng vừa tạo và xoá file video đã lưu trong temp
      if (lessonId) {
        await this.prisma.lesson.delete({
          where: {
            id: lessonId,
          },
        }).catch(() => { });
      }

      //xoá file video đã lưu trong temp
      if (filePath) {
        await unlink(filePath).catch(() => { });
      }

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

  async update(id: number, userId: string, updateLessonDto: UpdateLessonDto, videoFile?: Express.Multer.File) {
    const filePath = videoFile?.path;
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
                  instructorId: true,
                  status: true
                }
              }
            }
          }
        }
      })
      if (!lesson) {
        throw new BadRequestException("Không tìm thấy bài giảng")
      }
      const isAdmin = await this.authorizationService.hasRole(userId, 'ADMIN');

      if (!isAdmin && lesson.section.course.instructorId !== userId) {
        throw new ForbiddenException("Bạn không có quyền cập nhật bài giảng này")
      }
      if (!([CourseStatus.DRAFT, CourseStatus.REJECTED, CourseStatus.UNPUBLISHED] as CourseStatus[]).includes(lesson.section.course.status)) {
        throw new BadRequestException('Không thể chỉnh sửa nội dung khi khóa học đang xuất bản hoặc chờ duyệt');
      }
      if (videoFile && ['PENDING', 'UPLOADING', 'PROCESSING'].includes(lesson.videoStatus)) {
        throw new ConflictException('Video hiện đang được xử lý, vui lòng chờ video hoàn tất trước khi upload video mới');
      }


      const updatedLesson = await this.prisma.lesson.update({
        where: {
          id: id
        },
        data: {
          title: updateLessonDto.title,
          content: updateLessonDto.content,
          order: updateLessonDto.order,
          isPreview: updateLessonDto.isPreview,
          sectionId: updateLessonDto.sectionId,
            ...(videoFile && {
            oldVideoId: lesson.videoId, // lưu videoId cũ để processor xóa sau khi video mới process xong
            videoId: null,
            duration: null,
            videoStatus: 'PENDING',
            videoError: null,
          }),
        }
      })

      // Dọn ảnh Cloudinary bị gỡ khỏi nội dung (ảnh vẫn còn dùng thì giữ lại)
      if (updateLessonDto.content !== undefined) {
        const oldIds = extractPublicIdsFromHtml(lesson.content);
        const newIds = new Set(extractPublicIdsFromHtml(updateLessonDto.content));
        const removed = oldIds.filter((publicId) => !newIds.has(publicId));
        if (removed.length > 0) {
          await this.cleanupService.addCloudinaryCleanupJob(removed);
        }
      }
      if (videoFile) {
        //bọc try catch tại vì nếu addjob thất bại thì rollback lại dữ liệu cũ
        try {
          await this.videoUploadService.addUploadJob({
            lessonId: lesson.id,
            filePath: videoFile.path,
            title: updateLessonDto.title ?? lesson.title,
            description: stripHtmlTags(updateLessonDto.content),
          });
        }
        catch (error) {
          await this.prisma.lesson.update({
            where: { id: lesson.id },
            data: {
              videoId: lesson.videoId,
              oldVideoId: lesson.oldVideoId,
              duration: lesson.duration,
              videoStatus: lesson.videoStatus,
              videoError: lesson.videoError,
            },
          })
          throw error;
        }

      }
      return updatedLesson;
    } catch (error) {
      if (filePath) {
        await unlink(filePath).catch(() => { });
      }
      if (error instanceof BadRequestException || error instanceof ForbiddenException || error instanceof ConflictException) {
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
                  instructorId: true,
                  status: true
                }
              }
            }
          }
        }
      })
      if (!lesson) {
        throw new BadRequestException("Không tìm thấy bài giảng")
      }
      const isAdmin = await this.authorizationService.hasRole(
        instructorId,
        'ADMIN',
      );
      if (!isAdmin && lesson.section.course.instructorId !== instructorId) {
        throw new ForbiddenException("Bạn không có quyền xóa bài giảng này")
      }
      if (!([CourseStatus.DRAFT, CourseStatus.REJECTED, CourseStatus.UNPUBLISHED] as CourseStatus[]).includes(lesson.section.course.status)) {
        throw new BadRequestException('Không thể xóa bài giảng khi khóa học đang xuất bản hoặc chờ duyệt');
      }
      await this.prisma.lesson.update({
        where: {
          id: id
        },
        data: {
          deletedAt: new Date(),
        }
      })
      this.cleanupService.addLessonCleanupJob(id);
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
