import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 21);

export interface R2UploadResult {
  url: string;
  pathname: string;
  contentType: string;
  contentDisposition: string;
}

export class R2Storage {
  private bucketName: string;
  private publicUrl: string;

  constructor(
    private r2: R2Bucket,
    bucketName: string,
    publicUrl: string
  ) {
    this.bucketName = bucketName;
    this.publicUrl = publicUrl;
  }

  async upload(
    file: File,
    options?: {
      access?: 'public' | 'private';
      contentType?: string;
    }
  ): Promise<R2UploadResult> {
    const filename = `${nanoid()}-${file.name}`;
    const contentType = options?.contentType || file.type || 'application/octet-stream';
    
    // Upload to R2
    await this.r2.put(filename, file.stream(), {
      httpMetadata: {
        contentType,
        contentDisposition: `inline; filename="${file.name}"`,
      },
    });

    return {
      url: `${this.publicUrl}/${filename}`,
      pathname: filename,
      contentType,
      contentDisposition: `inline; filename="${file.name}"`,
    };
  }

  async delete(pathname: string): Promise<void> {
    await this.r2.delete(pathname);
  }

  async get(pathname: string): Promise<R2ObjectBody | null> {
    return await this.r2.get(pathname);
  }

  async list(options?: {
    prefix?: string;
    limit?: number;
    cursor?: string;
  }): Promise<R2Objects> {
    return await this.r2.list({
      prefix: options?.prefix,
      limit: options?.limit || 1000,
      cursor: options?.cursor,
    });
  }
}