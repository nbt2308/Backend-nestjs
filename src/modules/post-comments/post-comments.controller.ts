import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PostCommentsService } from './post-comments.service';
import { CreatePostCommentDto } from './dto/create-post-comment.dto';
import { UpdatePostCommentDto } from './dto/update-post-comment.dto';

@Controller('post-comments')
export class PostCommentsController {
  constructor(private readonly postCommentsService: PostCommentsService) {}

  @Post()
  create(@Body() createPostCommentDto: CreatePostCommentDto) {
    return this.postCommentsService.create(createPostCommentDto);
  }

  @Get()
  findAll() {
    return this.postCommentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.postCommentsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePostCommentDto: UpdatePostCommentDto) {
    return this.postCommentsService.update(+id, updatePostCommentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.postCommentsService.remove(+id);
  }
}
