import { FileValidator } from '@nestjs/common';

/**
 * 图片文件类型验证器
 * 验证上传的文件是否为支持的图片格式
 */
export class ImageFileTypeValidator extends FileValidator {
  private readonly allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];

  buildErrorMessage(): string {
    return `文件类型不支持，仅支持 JPG、JPEG、PNG、GIF 格式`;
  }

  isValid(file?: Express.Multer.File): boolean {
    if (!file) {
      return false;
    }

    return this.allowedMimeTypes.includes(file.mimetype);
  }
}
