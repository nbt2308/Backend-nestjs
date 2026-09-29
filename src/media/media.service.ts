
import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class MediaService {
    constructor() {
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });
    }

    // 1. Tạo chữ ký cho phép Client Upload
    async getUploadSignature(folder: string) {
        const timestamp = Math.round(new Date().getTime() / 1000);
        const targetFolder = `my_lms/${folder}`; // Phân loại folder (courses, avatars, v.v.)

        const paramsToSign = {
            timestamp,
            folder: targetFolder,
        };

        // Tạo chữ ký mã hóa SHA-1 bằng API Secret ở Server
        const signature = await cloudinary.utils.api_sign_request(
            paramsToSign,
            process.env.CLOUDINARY_API_SECRET as any,
        );

        return {
            timestamp,
            signature,
            cloudName: process.env.CLOUDINARY_CLOUD_NAME,
            apiKey: process.env.CLOUDINARY_API_KEY,
            folder: targetFolder,
        };
    }

    async deleteImage(publicId: string) {
        try {
            return await cloudinary.uploader.destroy(publicId, {
                resource_type: 'image',
            });
        } catch (error: any) {
            console.error('Lỗi xóa ảnh Cloudinary:', error);
            // Ném lỗi để BullMQ retry thay vì coi job là thành công
            throw new Error(error?.message || 'Lỗi xóa ảnh Cloudinary');
        }
    }
}