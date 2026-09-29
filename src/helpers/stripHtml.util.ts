/**
 * Xoá tất cả HTML tags khỏi chuỗi, trả về plain text.
 * Dùng cho các API bên thứ 3 không chấp nhận HTML (vd: YouTube description).
 */
export function stripHtmlTags(html: string | null | undefined): string {
    if (!html) return '';
    return html
        .replace(/<[^>]*>/g, '') // xoá tags
        .replace(/&nbsp;/g, ' ') // thay &nbsp; bằng space
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')    // gộp khoảng trắng
        .trim();
}
