import { Router, Request, Response } from 'express';
import { VESPER_CONFIG } from '@/packages/config/index.ts';

export const mediaRouter = Router();

// POST /api/media/upload
mediaRouter.post('/upload', (req: Request, res: Response) => {
  const { fileName, fileData, mimeType, duration } = req.body;

  if (!fileName || !fileData) {
    return res.status(400).json({ error: 'fileName and base64 fileData are required' });
  }

  // Server-side MIME type validation
  const effectiveMime = mimeType || 'application/octet-stream';
  const isAllowed = VESPER_CONFIG.media.allowedMimeTypes.some(
    (allowed: string) => effectiveMime.startsWith(allowed.split('/')[0]) || effectiveMime === allowed
  );

  if (!isAllowed) {
    return res.status(400).json({ error: `File type ${effectiveMime} is not permitted.` });
  }

  // Calculate approximate file size from base64
  const sizeBytes = Math.round((fileData.length * 3) / 4);
  if (sizeBytes > VESPER_CONFIG.rateLimits.mediaUploadLimitMb * 1024 * 1024) {
    return res.status(400).json({ error: 'File size exceeds maximum 50MB threshold.' });
  }

  const mediaId = 'att_' + Math.random().toString(36).substring(2, 9);
  // In production this uploads to S3/MinIO bucket. For this environment we return the data URI or hosted preview
  const mediaUrl = fileData.startsWith('data:')
    ? fileData
    : `data:${effectiveMime};base64,${fileData}`;

  return res.status(201).json({
    success: true,
    attachment: {
      id: mediaId,
      url: mediaUrl,
      fileName,
      fileSize: sizeBytes,
      mimeType: effectiveMime,
      duration: duration || undefined,
      uploadedAt: new Date().toISOString(),
    },
  });
});
