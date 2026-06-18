import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const port = process.env.PORT || 8080;
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        skipMissingProperties: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true, // Tự động hiểu kiểu dữ liệu từ TypeScript
        },
    }));
    app.setGlobalPrefix('api/v1', {
        exclude: [''],
    });
    app.enableCors({
        origin: true,
        credentials: true,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        preflightContinue: false,
    });
    await app.listen(port);
}
bootstrap();
