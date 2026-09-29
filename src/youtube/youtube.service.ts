import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream } from 'fs';
import { google, youtube_v3 } from 'googleapis';
import { unlink } from 'node:fs/promises';
export interface YoutubeVideoInfo {
    videoId: string;
    title: string;
    description: string;
    duration: number; // Tính bằng giây
    thumbnail: string;
    channelTitle: string;
}
@Injectable()
export class YoutubeService {
    private youtube: youtube_v3.Youtube;

    constructor(private readonly prisma: PrismaService, private readonly configService: ConfigService) {
        const apiKey = this.configService.get<string>('YOUTUBE_API_KEY');

        if (!apiKey) {
            throw new InternalServerErrorException(
                'Chưa cấu hình YOUTUBE_API_KEY trong file .env',
            );
        }

        this.youtube = google.youtube({
            version: 'v3',
            auth: apiKey,
        });
    }
    private readonly oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI,
    );
    //kết nối tài khoản youtube với ứng dụng và lấy url để redirect sang trang xác thực
    getAuthUrl() {
        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            prompt: 'consent',
            scope: [
                'https://www.googleapis.com/auth/youtube.upload',
                'https://www.googleapis.com/auth/youtube.readonly',
                'https://www.googleapis.com/auth/youtube'
            ],
        });
    }

    // xử lý callback khi người dùng xác thực kết nối Youtube với ứng dụng thành công
    async handleOAuthCallback(code: string) {
        const { tokens } = await this.oauth2Client.getToken(code);

        if (!tokens.refresh_token) {
            throw new BadRequestException(
                'Google did not return refresh token',
            );
        }

        await this.prisma.youtubeCredential.upsert({
            where: {
                id: 1,
            },
            create: {
                id: 1,
                refreshToken: tokens.refresh_token,
                accessToken: tokens.access_token,
                expiryDate: tokens.expiry_date
                    ? BigInt(tokens.expiry_date)
                    : null,
            },
            update: {
                refreshToken: tokens.refresh_token,
                accessToken: tokens.access_token,
                expiryDate: tokens.expiry_date
                    ? BigInt(tokens.expiry_date)
                    : null,
            },
        });

        this.oauth2Client.setCredentials(tokens);

        return {
            message: 'YouTube connected successfully',
        };
    }

    //lấy token đã được lưu trữ và làm mới khi hết hạn
    private async getAuthenticatedClient() {
        const credential =
            await this.prisma.youtubeCredential.findUnique({
                where: { id: 1 },
            });

        if (!credential) {
            throw new BadRequestException(
                'YouTube account has not been connected',
            );
        }

        this.oauth2Client.setCredentials({
            refresh_token: credential.refreshToken,
        });

        return this.oauth2Client;
    }

    //Upload video to youtube
    async uploadVideo(
        filePath: string,
        title: string,
        description?: string,
    ) {
        const auth = await this.getAuthenticatedClient();

        const youtube = google.youtube({
            version: 'v3',
            auth,
        });

        const response = await youtube.videos.insert({
            part: ['snippet', 'status'],
            requestBody: {
                snippet: {
                    title,
                    description: description ?? '',
                    categoryId: '27', //danh mục Education
                },
                status: {
                    privacyStatus: 'unlisted',
                    selfDeclaredMadeForKids: false,
                },
            },
            media: {
                body: createReadStream(filePath),
            },
        });

        return {
            videoId: response.data.id,
            status: response.data.status,
        };
    }

    // xử lý queue upload video
    async processVideoUpload(data: {
        lessonId: number;
        filePath: string;
        title: string;
        description?: string;
    }) {
        const { lessonId, filePath, title, description } = data;
        let uploadedVideoId: string | null = null;
        try {
            //update trạng thái video khi bắt đầu xử lý
            await this.prisma.lesson.update({
                where: { id: lessonId },
                data: {
                    videoStatus: 'UPLOADING',
                    videoError: null,
                },
            });

            //thực hiện upload video lên youtube thông qua API của youtube
            const result = await this.uploadVideo(
                filePath,
                title,
                description,
            );

            if (!result.videoId) {
                throw new Error('YouTube did not return a video ID');
            }

            uploadedVideoId = result.videoId;

            const lesson = await this.prisma.lesson.findUnique({
                where: { id: lessonId },
                select: {
                    id: true,
                    deletedAt: true,
                },
            });
            //lesson bị xóa trong lúc upload
            if (!lesson || lesson.deletedAt) {
                await this.deleteVideo(uploadedVideoId);
                uploadedVideoId = null;

                return {
                    lessonId,
                    videoId: null,
                    status: 'LESSON_DELETED',
                };
            }

            //trả về videoId thì update videoStatus thành PROCESSING
            //Lưu ý: duration sẽ được lấy sau khi YouTube xử lý xong video (status = succeeded)
            //vì lúc này YouTube chưa process xong nên contentDetails.duration luôn là PT0S (0 giây)
            const updated = await this.prisma.lesson.updateMany({
                where: {
                    id: lessonId,
                    deletedAt: null,
                },
                data: {
                    videoId: uploadedVideoId,
                    videoStatus: 'PROCESSING',
                    videoError: null,
                    processingStartedAt: new Date(),
                },
            });
            //lesson bị xóa hoặc update trong lúc đang xử lý (Race condition)
            if (updated.count === 0) {
                await this.deleteVideo(uploadedVideoId);
                uploadedVideoId = null;

                return {
                    lessonId,
                    videoId: null,
                    status: 'LESSON_DELETED',
                };
            }
            uploadedVideoId = null;
            return {
                lessonId,
                videoId: result.videoId,
                status: 'PROCESSING',
            };
        } catch (error) {
            //nếu video đã đc upload lên youtube mà không thể lưu lesson hoặc xảy ra lỗi trong lúc upload thì xóa video đó khỏi youtube
            if (uploadedVideoId) {
                try {
                    await this.deleteVideo(uploadedVideoId);
                } catch (deleteError) {
                    console.error(`Không thể xóa video mồ côi ${uploadedVideoId}:`, deleteError,);
                }
            }
            await this.prisma.lesson.update({
                where: { id: lessonId },
                data: {
                    videoStatus: 'FAILED',
                    videoError:error instanceof Error? error.message: 'Video upload failed',
                },
            });

            throw error;
        } finally {
            await unlink(filePath).catch(() => { });
        }
    }

    //check xem video đã được xử lý đăng lên youtube xong chưa
    async checkVideoProcessing(videoId: string) {
        //lấy token đã được lưu trữ và làm mới khi hết hạn
        const auth = await this.getAuthenticatedClient();
        //khởi tạo youtube service
        const youtube = google.youtube({
            version: 'v3',
            auth,
        });

        //cost 1 unit
        const response = await youtube.videos.list({
            part: ['processingDetails'],
            id: [videoId],
        });
        //vì chỉ upload 1 file 1 lần nên lấy phần tử đầu tiên
        const video = response.data.items?.[0];

        if (!video) {
            return {
                status: 'failed' as const,
                error: 'Không tìm thấy video trên YouTube',
            };
        }

        const status =
            video.processingDetails?.processingStatus;

        if (status === 'succeeded') {
            return {
                status: 'succeeded' as const,
            };
        }

        if (status === 'failed') {
            return {
                status: 'failed' as const,
                error: video.processingDetails?.processingFailureReason ?? 'YouTube xử lý video thất bại',
            };
        }

        return {
            status: 'processing' as const,
        };
    }

    //delete video trên youtube sau khi update video mới thành công khi update lesson
    async deleteVideo(videoId: string) {
        const auth = await this.getAuthenticatedClient();
        const youtube = google.youtube({ version: 'v3', auth });
        try {
            await youtube.videos.delete({
                id: videoId,
            });
        }
        catch (error: any) {
            const status = error?.response?.status;
            //Không quan tâm nếu video không tồn tại (404)
            //Vì lúc này video có thể đang bị xóa ở db
            if (status === 404) {
                return;
            }

            throw error;
        }

    }
    //Test 
    async getChannelInfo() {
        const auth = await this.getAuthenticatedClient();

        const youtube = google.youtube({
            version: 'v3',
            auth,
        });

        const response = await youtube.channels.list({
            part: ['snippet', 'statistics'],
            mine: true,
        });

        return response.data.items?.[0];
    }

    //lấy duration của video trên youtube
    async getVideoDuration(
        videoId: string,
    ): Promise<number | null> {
        const auth = await this.getAuthenticatedClient();

        const youtube = google.youtube({
            version: 'v3',
            auth,
        });

        const response = await youtube.videos.list({
            part: ['contentDetails'],
            id: [videoId],
        });

        const video = response.data.items?.[0];

        if (!video?.contentDetails?.duration) {
            return null;
        }

        return this.parseISO8601ToSeconds(
            video.contentDetails.duration,
        );
    }

    /**
     * Trích xuất videoId từ chuỗi URL YouTube
     */
    extractVideoId(url: string): string {
        const regExp =
            /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(\&.*)?$/;
        const match = url.match(regExp);

        if (match && match[5]) {
            return match[5];
        }

        throw new BadRequestException('Không thể trích xuất Video ID từ URL này');
    }

    /**
     * Quy đổi định dạng ISO 8601 (VD: PT1H2M30S) sang Giây
     */
    parseISO8601ToSeconds(isoDuration: string): number {
        const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
        const matches = isoDuration.match(regex);

        if (!matches) return 0;

        const hours = parseInt(matches[1] || '0', 10);
        const minutes = parseInt(matches[2] || '0', 10);
        const seconds = parseInt(matches[3] || '0', 10);

        return hours * 3600 + minutes * 60 + seconds;
    }

    /**
     * Gọi API lấy thông tin chi tiết video từ YouTube
     */
    async getVideoDetails(videoUrl: string): Promise<YoutubeVideoInfo> {
        const videoId = this.extractVideoId(videoUrl);

        try {
            const response = await this.youtube.videos.list({
                part: ['snippet', 'contentDetails'],
                id: [videoId],
            });

            const video = response.data.items?.[0];

            if (!video) {
                throw new BadRequestException('Không tìm thấy video trên YouTube');
            }

            const durationInSeconds = this.parseISO8601ToSeconds(
                video.contentDetails?.duration || 'PT0S',
            );

            return {
                videoId: video.id!,
                title: video.snippet?.title || '',
                description: video.snippet?.description || '',
                duration: durationInSeconds,
                thumbnail:
                    video.snippet?.thumbnails?.maxres?.url ||
                    video.snippet?.thumbnails?.high?.url ||
                    video.snippet?.thumbnails?.default?.url ||
                    '',
                channelTitle: video.snippet?.channelTitle || '',
            };
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException('Không thể lấy dữ liệu từ YouTube API');
        }
    }
}