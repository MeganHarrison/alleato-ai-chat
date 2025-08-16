import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { cloudflareClient } from '@/lib/cloudflare/client';

// Use Blob instead of File since File is not available in Node.js environment
const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 5 * 1024 * 1024, {
      message: 'File size should be less than 5MB',
    })
    // Update the file type based on the kind of files you want to accept
    .refine((file) => ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type), {
      message: 'File type should be JPEG, PNG, GIF, or WebP',
    }),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (request.body === null) {
    return new Response('Request body is empty', { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.errors
        .map((error) => error.message)
        .join(', ');

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    try {
      // Use Cloudflare R2 instead of Vercel Blob
      const { isCloudflareServiceEnabled } = await import('@/lib/config/cloudflare');
      const useCloudflareStorage = isCloudflareServiceEnabled('storage');
      
      if (useCloudflareStorage) {
        // Upload to Cloudflare R2 via Worker
        const data = await cloudflareClient.uploadFile(file);
        return NextResponse.json(data);
      } else {
        // Fallback to Vercel Blob if not using Cloudflare
        const { put } = await import('@vercel/blob');
        const fileBuffer = await file.arrayBuffer();
        const data = await put(file.name, fileBuffer, {
          access: 'public',
        });
        return NextResponse.json(data);
      }
    } catch (error) {
      console.error('Upload error:', error);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
  } catch (error) {
    console.error('Request processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 },
    );
  }
}