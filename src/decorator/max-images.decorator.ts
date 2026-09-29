import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
import { MAX_IMAGES } from '../constants/image.constants';

@ValidatorConstraint({ async: false })
export class MaxImagesConstraint implements ValidatorConstraintInterface {
    validate(content: any, args: ValidationArguments) {
        if (typeof content !== 'string') return true;
        // Count number of <img tags in the content
        const match = content.match(/<img/g);
        const imageCount = match ? match.length : 0;
        return imageCount <= MAX_IMAGES;
    }

    defaultMessage(args: ValidationArguments) {
        return `Nội dung không được chứa quá ${MAX_IMAGES} hình ảnh.`;
    }
}

export function IsMaxImages(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: MaxImagesConstraint,
        });
    };
}
