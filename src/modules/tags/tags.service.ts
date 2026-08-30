import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateTagDto } from './dto/create-tag.dto';
import { BulkDeleteDto, BulkStatusDto, ChangeStatusDto, UpdateTagDto } from './dto/update-tag.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { generateSlug } from '@/helpers/slug.util';
import { uuidv7 } from 'uuidv7';

@Injectable()
export class TagsService {
    constructor(private prisma: PrismaService) { }

    async create(createTagDto: CreateTagDto) {
        try {
            let slug = generateSlug(createTagDto.name)
            //check name & slug exist
            const existTags = await this.prisma.tag.findMany({
                where: {
                    OR: [
                        {
                            name: createTagDto.name
                        },
                        {
                            slug: slug
                        }
                    ]
                }
            })

            for (const existTag of existTags) {
                if (existTag.name === createTagDto.name) {
                    throw new BadRequestException('Tên đã tồn tại');
                }
                if (existTag.slug === slug) {
                    slug = `${slug}-${Date.now().toString(36)}`;
                }
            }
            const tag = await this.prisma.tag.create({
                data: {
                    ...createTagDto,
                    slug
                }
            })
            return tag;
        } catch (error) {
            // console.log(error);
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException('Có lỗi xảy ra khi tạo Tag');
        }
    }

    async findAllPaginate(page: number, limit: number, sortBy: string, sortOrder: 'asc' | 'desc', search?: string) {
        const allowedFields = ['name', 'createdAt'];
        const finalSortBy = allowedFields.includes(sortBy) ? sortBy : 'createdAt';

        const whereCondition: any = {};

        if (search && search.trim() !== "") {
            whereCondition.OR = [
                {
                    name: {
                        contains: search.trim(),
                        mode: 'insensitive', // Không phân biệt chữ hoa / chữ thường (Chỉ hỗ trợ tốt trên PostgreSQL)
                    },
                },
                {
                    slug: {
                        contains: search.trim(),
                        mode: 'insensitive',
                    },
                },
                {
                    description: {
                        contains: search.trim(),
                        mode: 'insensitive',
                    },
                },
            ];
        }

        const skip = (page - 1) * limit;
        const take = limit;
        const [tags, totalItems] = await Promise.all([
            this.prisma.tag.findMany({
                where: whereCondition,
                skip: skip,
                take: take,
                orderBy: {
                    [finalSortBy]: sortOrder
                },
                include: {
                    _count: {
                        select: {
                            courses: true,
                            posts: true
                        }
                    }
                }
            }),
            this.prisma.tag.count({
                where: whereCondition
            })
        ])
        const totalPages = Math.ceil(totalItems / take);
        return { tags, totalItems, totalPages };
    }

    async findAll() {
        try {
            return this.prisma.tag.findMany({
                where: {
                    status: true,
                },

            });
        } catch (error) {
            throw error;
        }
    }
    async findAllForUser() {
        try {
            return this.prisma.tag.findMany({
                where: {
                    status: true,
                },

            });
        } catch (error) {
            throw error;
        }
    }

    findOne(id: number) {
        return `This action returns a #${id} tag`;
    }

    async update(id: number, updateTagDto: UpdateTagDto) {
        try {
            const tag = await this.prisma.tag.findUnique({
                where: { id },
                include: {
                    _count: {
                        select: {
                            courses: true,
                            posts: true
                        }
                    }
                }
            });
            if (!tag) {
                throw new NotFoundException('Không tìm thấy tag');
            }
            if (updateTagDto.status !== undefined && updateTagDto.status !== tag.status && updateTagDto.status === false) {
                if (tag._count.courses > 0 || tag._count.posts > 0) {
                    throw new BadRequestException('Không thể thay đổi trạng thái tag này vì đang được sử dụng trong khóa học hoặc bài viết');
                }
            }
            let slug = tag.slug;
            if (updateTagDto.name !== undefined && updateTagDto.name !== tag.name) {
                slug = generateSlug(updateTagDto.name);
                const existTags = await this.prisma.tag.findMany({
                    where: {
                        OR: [
                            { name: updateTagDto.name },
                            { slug: slug }
                        ],
                        id: { not: id }
                    }
                });

                for (const existTag of existTags) {
                    if (existTag.name === updateTagDto.name) {
                        throw new BadRequestException('Tên đã tồn tại');
                    }
                    if (existTag.slug === slug) {
                        slug = `${slug}-${Date.now().toString(36)}`;
                    }
                }
            }

            return await this.prisma.tag.update({
                where: { id },
                data: {
                    ...updateTagDto,
                    slug
                }
            });
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException('Có lỗi xảy ra khi cập nhật Tag');
        }
    }

    async remove(id: number) {
        try {
            const tag = await this.prisma.tag.findUnique({
                where: {
                    id: id
                },
                include: {
                    _count: {
                        select: {
                            courses: true,
                            posts: true
                        }
                    }
                }
            })
            if (!tag) {
                throw new NotFoundException('Không tìm thấy tag');
            }

            if (tag._count.courses > 0 || tag._count.posts > 0) {
                throw new BadRequestException('Không thể xóa tag này vì đang được sử dụng trong khóa học hoặc bài viết');
            }

            return await this.prisma.tag.delete({
                where: {
                    id: id
                }
            })
        } catch (error: any) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException(error.message);
        }
    }

    async changeStatus(changeStatusDto: ChangeStatusDto) {
        try {
            const { id, status } = changeStatusDto;

            const tag = await this.prisma.tag.findUnique({
                where: {
                    id: id
                },
                include: {
                    _count: {
                        select: {
                            courses: true,
                            posts: true
                        }
                    }
                }
            })
            if (!tag) {
                throw new NotFoundException('Không tìm thấy tag')
            }
            if (changeStatusDto.status === tag.status) {
                return { id: tag.id };
            }
            if (status === false && (tag._count.courses > 0 || tag._count.posts > 0)) {
                throw new BadRequestException('Không thể thay đổi trạng thái tag này vì đang được sử dụng trong khóa học hoặc bài viết');
            }
            const changeStatusTag = await this.prisma.tag.update({
                where: {
                    id: id
                },
                data: {
                    status: status
                }
            })
            return {
                id: changeStatusTag.id,
                name: changeStatusTag.name,
            }
        }
        catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException('Có lỗi xảy ra khi thay đổi trạng thái');
        }
    }

    async bulkStatus(bulkStatusDto: BulkStatusDto) {
        try {
            const { ids, status } = bulkStatusDto;
            const tag = await this.prisma.tag.findMany({
                where: {
                    id: {
                        in: ids
                    }
                },
                include: {
                    _count: {
                        select: {
                            courses: true,
                            posts: true
                        }
                    }
                }
            })
            if (tag.length === 0) {
                throw new NotFoundException('Không tìm thấy tag nào để cập nhật');
            }
            const tagsToUpdate = tag.filter((t: any) => t.status !== status);
            if (tagsToUpdate.length === 0) {
                return { count: 0 };
            }
            if (status === false) {
                const tagsInUse = tagsToUpdate.filter((t: any) => t._count.courses > 0 || t._count.posts > 0);
                if (tagsInUse.length > 0) {
                    const names = tagsInUse.map((t: any) => t.name).join(', ');
                    throw new BadRequestException(`Không thể tắt các tag đang được sử dụng: ${names}`);
                }
            }
            const updateIds = tagsToUpdate.map((t: any) => t.id);
            const result = await this.prisma.tag.updateMany({
                where: {
                    id: {
                        in: updateIds
                    }
                },
                data: {
                    status: status
                }
            })
            return {
                count: result.count
            }
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Có lỗi xảy ra khi cập nhật trạng thái tag');
        }
    }

    async bulkDelete(bulkDeleteDto: BulkDeleteDto) {
        try {
            const { ids } = bulkDeleteDto;
            const tags = await this.prisma.tag.findMany({
                where: {
                    id: {
                        in: ids
                    }
                },
                include: {
                    _count: {
                        select: {
                            courses: true,
                            posts: true
                        }
                    }
                }
            })
            if (tags.length === 0) {
                throw new NotFoundException('Không tìm thấy tag nào để xoá');
            }

            const tagsInUse = tags.filter((tag: any) => tag._count.courses > 0 || tag._count.posts > 0);
            if (tagsInUse.length > 0) {
                const names = tagsInUse.map((t: any) => t.name).join(', ');
                throw new BadRequestException(`Không thể xóa các tag đang được sử dụng: ${names}`);
            }

            const result = await this.prisma.tag.deleteMany({
                where: {
                    id: {
                        in: ids
                    }
                }
            })
            return {
                count: result.count
            }
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Có lỗi xảy ra khi xóa tag');
        }
    }
}
