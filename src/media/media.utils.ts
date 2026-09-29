/**
 * Helpers dùng chung cho việc dọn ảnh Cloudinary.
 *
 * Ảnh mới chèn từ editor có `data-public-id` do frontend ghi thẳng ra HTML.
 * Ảnh cũ (và mọi ảnh bên ngoài dự án) chỉ có `src` nên cần suy ra `public_id`
 * từ URL của Cloudinary.
 */

/** Giá trị `thumbnail_publicID` tạm thời do frontend set trước khi upload xong. */
const TEMP_PUBLIC_ID = 'temp_public_id';

/** Ký tự mở đầu một thẻ `<img ...>` trong HTML. */
const IMG_TAG_REGEX = /<img\b[^>]*>/gi;

/** `data-public-id="..."` hoặc `data-public-id='...'`. */
const PUBLIC_ID_ATTR_REGEX = /data-public-id\s*=\s*["']([^"']*)["']/i;

/** `src="..."` hoặc `src='...'`. */
const SRC_ATTR_REGEX = /src\s*=\s*["']([^"']*)["']/i;

/**
 * URL Cloudinary dạng:
 * https://res.cloudinary.com/<cloud>/image/upload/<transform>/<version>/<public_id>.<ext>
 * hoặc https://res.cloudinary.com/<cloud>/image/fetch/<...>
 */
const CLOUDINARY_URL_REGEX =
    /^https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/(?:upload|fetch)\/(.+)$/i;

/** Segment transform dạng `w_300,h_400,c_fill,f_auto` (chỉ gồm ký tự an toàn của transform). */
const TRANSFORM_SEGMENT_REGEX = /^[a-z]{1,3}_[0-9a-z_,:./-]+$/i;

/** Segment version của Cloudinary, ví dụ `v1234567890`. */
const VERSION_SEGMENT_REGEX = /^v\d+$/i;

/**
 * `public_id` không hợp lệ để gọi API xóa — chặn sớm để tránh xóa nhầm
 * hoặc gọi Cloudinary với giá trị rỗng.
 */
export function isDeletablePublicId(value: unknown): value is string {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (trimmed === TEMP_PUBLIC_ID) return false;
    // Chỉ chấp nhận public_id của Cloudinary (dạng `folder/ten`, không phải URL tuyệt đối)
    if (/^https?:\/\//i.test(trimmed)) return false;
    if (trimmed.startsWith('/')) return false;
    return true;
}

/**
 * Suy ra `public_id` từ URL Cloudinary.
 * Bỏ qua các segment transform và version, bỏ query/hash và đuôi file.
 *
 * Lưu ý: `public_id` có thể chứa dấu chấm và folder (`my_lms/courses/abc.123`),
 * nên không được dùng `split('.')[0]`.
 *
 * @returns public_id hoặc null nếu URL không thuộc Cloudinary.
 */
export function extractPublicIdFromUrl(url: string | null | undefined): string | null {
    if (!url || typeof url !== 'string') return null;

    const decoded = url.trim();
    const match = decoded.match(CLOUDINARY_URL_REGEX);
    if (!match) return null;

    let rest = match[1];

    // Bỏ query string và hash
    rest = rest.split('?')[0].split('#')[0];
    if (!rest) return null;

    // Cloudinary có thể mã hoá ký tự (ví dụ khoảng trắng thành %20)
    let segments: string[];
    try {
        segments = rest.split('/').map((segment) => decodeURIComponent(segment));
    } catch {
        // URL có ký tự escape sai định dạng -> dùng nguyên bản
        segments = rest.split('/');
    }

    segments = segments.filter((segment) => segment.length > 0);

    // Bỏ segment transform ở đầu (thường có 1 segment, ví dụ `c_scale,w_300`)
    if (segments.length > 1 && TRANSFORM_SEGMENT_REGEX.test(segments[0])) {
        segments = segments.slice(1);
    }

    // Bỏ segment version (ví dụ `v1755000000`)
    if (segments.length > 1 && VERSION_SEGMENT_REGEX.test(segments[0])) {
        segments = segments.slice(1);
    }

    if (segments.length === 0) return null;

    const last = segments[segments.length - 1];
    // Bỏ đuôi file: chỉ bỏ khi dấu chấm nằm sau segment cuối cùng và
    // phần sau là extension hợp lệ (để giữ dấu chấm trong tên file như `abc.123`)
    const dotIndex = last.lastIndexOf('.');
    if (dotIndex > 0) {
        const extension = last.slice(dotIndex + 1);
        if (/^[a-z0-9]{1,5}$/i.test(extension)) {
            segments[segments.length - 1] = last.slice(0, dotIndex);
        }
    }

    const publicId = segments.join('/');
    return isDeletablePublicId(publicId) ? publicId : null;
}

/**
 * Duyệt mọi thẻ `<img>` trong HTML và trả về danh sách `public_id` đã dedupe.
 *
 * Ưu tiên `data-public-id`; nếu không có thì suy ra từ `src`.
 * Ảnh không thuộc Cloudinary (ảnh ngoài, base64) bị bỏ qua.
 */
export function extractPublicIdsFromHtml(html: string | null | undefined): string[] {
    if (!html || typeof html !== 'string') return [];

    const result: string[] = [];
    const seen = new Set<string>();

    const push = (publicId: string | null) => {
        if (!publicId || seen.has(publicId)) return;
        seen.add(publicId);
        result.push(publicId);
    };

    for (const tag of html.match(IMG_TAG_REGEX) ?? []) {
        const attrMatch = tag.match(PUBLIC_ID_ATTR_REGEX);
        const attrValue = attrMatch?.[1]?.trim();

        if (attrValue && attrValue !== TEMP_PUBLIC_ID) {
            push(attrValue);
            continue;
        }

        const srcMatch = tag.match(SRC_ATTR_REGEX);
        push(extractPublicIdFromUrl(srcMatch?.[1]));
    }

    return result;
}
