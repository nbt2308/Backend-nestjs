
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

    /**
     * Kiểm tra 1 ảnh có tồn tại trên Cloudinary hay không.
     * Trả về true nếu tồn tại, false nếu không.
     */
    async checkImageExists(publicId: string): Promise<boolean> {
        try {
            await cloudinary.api.resource(publicId, { resource_type: 'image' });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Kiểm tra hàng loạt ảnh trên Cloudinary.
     * Trả về Set chứa các publicId tồn tại.
     *
     * Lưu ý: Cloudinary Admin API `resources_by_ids` có giới hạn 100 ids/request.
     */
    async checkImagesExist(publicIds: string[]): Promise<Set<string>> {
        const existingIds = new Set<string>();
        const BATCH_SIZE = 100;

        for (let i = 0; i < publicIds.length; i += BATCH_SIZE) {
            const batch = publicIds.slice(i, i + BATCH_SIZE);

            try {
                const result = await cloudinary.api.resources_by_ids(batch, {
                    resource_type: 'image',
                });

                for (const resource of result.resources ?? []) {
                    if (resource.public_id) {
                        existingIds.add(resource.public_id);
                    }
                }
            } catch {
                // Nếu batch check lỗi, fallback từng ảnh một
                for (const publicId of batch) {
                    const exists = await this.checkImageExists(publicId);
                    if (exists) {
                        existingIds.add(publicId);
                    }
                }
            }
        }

        return existingIds;
    }
}