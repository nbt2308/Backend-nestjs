import * as bcrypt from 'bcryptjs';
export const hashPasswordHelper = async (plainPassword: string) => {
    try {
        const salt = await bcrypt.genSalt(10);
        return await bcrypt.hash(plainPassword, salt);
    } catch (error) {
        console.log(error);
        throw error;
    }
}
export const comparePasswordHelper = async (plainPassword: string, hashPassword: string) => {
    try {
        return await bcrypt.compare(plainPassword, hashPassword);
    } catch (error) {
        console.log(error);
        throw error;
    }
}
export const normalizeStringArray = (value?: string | string[]) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.flatMap((item) => String(item).split(',')).map((item) => item.trim()).filter(Boolean);
    return String(value).split(',').map((item) => item.trim()).filter(Boolean);
};
export const normalizeNumberArray = (
    value?: string | string[] | number | number[] | null
): number[] => {
    if (value == null) return [];

    const values = Array.isArray(value) ? value : [value];

    return values
        .flatMap((item) => String(item).split(','))
        .map((item) => Number(item.trim()))
        .filter((item) => Number.isInteger(item));
};
