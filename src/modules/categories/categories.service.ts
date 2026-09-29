import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { BulkDeleteDto, BulkStatusDto, ChangeStatusDto, UpdateCategoryDto } from './dto/update-category.dto';
import { generateSlug } from '@/helpers/slug.util';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createCategoryDto: CreateCategoryDto) {
    if (!createCategoryDto.name) {
      throw new BadRequestException('Tên không hợp lệ để tạo slug');
    }

    let slug = generateSlug(createCategoryDto.name);

    const existingCategory = await this.prisma.category.findUnique({
      where: { slug }
    });

    if (existingCategory) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    if (createCategoryDto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: {
          id: createCategoryDto.parentId
        },
        select: {
          id: true,
          parentId: true,
          status: true,
        },
      });
      if (!parent) {
        throw new BadRequestException('Danh mục cha không tồn tại');
      }
      if (!parent.status) {
        throw new BadRequestException('Danh mục cha không hoạt động');
      }
      if (parent.parentId !== null) {
        throw new BadRequestException(
          'Chỉ cho phép danh mục tối đa 2 cấp',
        );
      }
    }

    return this.prisma.category.create({
      data: {
        ...createCategoryDto,
        slug,
      },
    });
  }

  async findAll() {
    const categories = await this.prisma.category.findMany({
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            courses: true,
            children: true,
          },
        },
      },
    });
    const total = categories.length;
    const countActiveCategories = categories.filter(cat => cat.status === true).length;
    const countInactiveCategories = categories.filter(cat => cat.status === false).length;
    //đệ quy để tạo cây 
    const buildTree = (parentId: number | null = null): any[] => {
      return categories
        .filter((cat) => cat.parentId === parentId)
        .map((cat) => ({
          ...cat,
          children: buildTree(cat.id),
        }));
    };

    return {
      categories: buildTree(),
      count: {
        total: total,
        active: countActiveCategories,
        inactive: countInactiveCategories
      },
    };
  }

  async findOne(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục');
    }

    return category;
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            courses: true,
            children: true
          }
        }
      }
    });

    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục');
    }


    let slug = category.slug;

    if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
      slug = generateSlug(updateCategoryDto.name);
      const existingCategory = await this.prisma.category.findUnique({
        where: { slug }
      });
      if (existingCategory && existingCategory.id !== id) {
        slug = `${slug}-${Date.now().toString(36)}`;
      }
    }

    if (updateCategoryDto.parentId !== undefined && updateCategoryDto.parentId !== category.parentId) {
      if (updateCategoryDto.parentId === id) {
        throw new BadRequestException('Danh mục không thể là danh mục cha của chính nó');
      }
      if (updateCategoryDto.parentId !== null) {
        const parent = await this.prisma.category.findUnique({
          where: { id: updateCategoryDto.parentId },
          select: {
            id: true,
            parentId: true,
            status: true
          },
        });
        if (!parent) {
          throw new BadRequestException('Danh mục cha không tồn tại');
        }
        if (!parent.status) {
          throw new BadRequestException('Danh mục cha không hoạt động');
        }
        if (parent.parentId !== null) {
          throw new BadRequestException(
            'Chỉ cho phép danh mục tối đa 2 cấp',
          );
        }
        if (category._count.children > 0) {
            throw new BadRequestException(
                'Danh mục đang chứa danh mục con nên không thể chuyển thành danh mục con',
            );
        }
      }

    }


    return this.prisma.category.update({
      where: { id },
      data: {
        ...updateCategoryDto,
        slug,
      },
    });
  }

  async remove(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        children: true,
      }
    });

    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục');
    }

    if (category.children && category.children.length > 0) {
      throw new BadRequestException('Không thể xóa danh mục đang chứa danh mục con');
    }

    const courseCount = await this.prisma.course.count({
      where: {
        categoryId: id,
      },
    })

    if (courseCount > 0) {
      throw new BadRequestException('Không thể xóa danh mục đang được sử dụng trong khóa học');
    }

    return this.prisma.category.delete({
      where: { id }
    });
  }

  async changeStatus(changeStatusDto: ChangeStatusDto) {
    try {
      const { id, status } = changeStatusDto;
      const category = await this.prisma.category.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              courses: true
            }
          }
        }
      });

      if (!category) {
        throw new NotFoundException(
          'Không tìm thấy category',
        );
      }

      if (category.status === status) {
        return category;
      }

      if (!status) {
        const activeChildren =
          await this.prisma.category.count({
            where: {
              parentId: id,
              status: true,
            },
          });

        if (activeChildren > 0) {
          throw new BadRequestException(
            'Không thể vô hiệu hóa danh mục đang có danh mục con hoạt động',
          );
        }
      }
      if (status === false && category._count.courses > 0) {
        throw new BadRequestException('Không thể thay đổi trạng thái danh mục này vì đang được sử dụng trong khóa học');
      }

      return this.prisma.category.update({
        where: { id },
        data: {
          status: status,
        },
      });
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
      const category = await this.prisma.category.findMany({
        where: {
          id: {
            in: ids
          }
        },
        include: {
          _count: {
            select: {
              courses: true,
              children: true
            }
          }
        }
      })
      if (category.length === 0) {
        throw new NotFoundException('Không tìm thấy danh mục nào để cập nhật');
      }
      const categoryToUpdate = category.filter((t: any) => t.status !== status);
      if (categoryToUpdate.length === 0) {
        return { count: 0 };
      }
      if (status === false) {
        const categoriesInUse = categoryToUpdate.filter((t: any) => t._count.courses > 0);
        if (categoriesInUse.length > 0) {
          const names = categoriesInUse.map((t: any) => t.name).join(', ');
          throw new BadRequestException(`Không thể tắt các danh mục đang được sử dụng: ${names}`);
        }

      }

      const updateIds = categoryToUpdate.map((t: any) => t.id);
      const result = await this.prisma.category.updateMany({
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
      throw new InternalServerErrorException('Có lỗi xảy ra khi cập nhật trạng thái danh mục');
    }
  }

  async bulkDelete(bulkDeleteDto: BulkDeleteDto) {
    try {
      const { ids } = bulkDeleteDto;
      const categories = await this.prisma.category.findMany({
        where: {
          id: {
            in: ids
          }
        },
        include: {
          _count: {
            select: {
              courses: true,
              children: true,
            }
          }
        }
      })
      if (categories.length === 0) {
        throw new NotFoundException('Không tìm thấy danh mục nào để xoá');
      }

      const categoriesInUse = categories.filter((category: any) => category._count.courses > 0);
      if (categoriesInUse.length > 0) {
        const names = categoriesInUse.map((c: any) => c.name).join(', ');
        throw new BadRequestException(`Không thể xóa các danh mục đang được sử dụng: ${names}`);
      }
      const categoriesWithSubcategories = categories.filter((t: any) => t._count.children > 0);
      if (categoriesWithSubcategories.length > 0) {
        const names = categoriesWithSubcategories.map((t: any) => t.name).join(', ');
        throw new BadRequestException(`Không thể xóa các danh mục đang chứa danh mục con: ${names}`);
      }

      const result = await this.prisma.category.deleteMany({
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
      throw new InternalServerErrorException('Có lỗi xảy ra khi xóa danh mục');
    }
  }
}
