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
