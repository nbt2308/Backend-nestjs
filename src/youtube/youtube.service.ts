import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, youtube_v3 } from 'googleapis';
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

    constructor(private readonly configService: ConfigService) {
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