import {
    registerDecorator,
    ValidationOptions,
    ValidationArguments,
} from 'class-validator';

export function MinLines(min: number, validationOptions?: ValidationOptions) {
    return (object: object, propertyName: string) => {
        registerDecorator({
            name: 'minLines',
            target: object.constructor,
            propertyName,
            constraints: [min],
            options: validationOptions,
            validator: {
                validate(value: unknown, args: ValidationArguments) {
                    if (typeof value !== 'string') return false;
                    const lines = value
                        .split(/\r?\n/)
                        .map((l) => l.trim())
                        .filter(Boolean);
                    return lines.length >= args.constraints[0];
                },
                defaultMessage(args: ValidationArguments) {
                    return `Cần nhập ít nhất ${args.constraints[0]} dòng nội dung`;
                },
            },
        });
    };
}