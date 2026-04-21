// lib/upload.ts

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_TOTAL_UPLOAD_SIZE = 100 * 1024 * 1024; // 100MB
export const MAX_FILES = 5;

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
] as const;

export function isAllowedFileType(type: string) {
  return (
    ALLOWED_IMAGE_TYPES.includes(type as any) ||
    ALLOWED_VIDEO_TYPES.includes(type as any)
  );
}

export function isImage(type: string) {
  return ALLOWED_IMAGE_TYPES.includes(type as any);
}

export function isVideo(type: string) {
  return ALLOWED_VIDEO_TYPES.includes(type as any);
}

export function sanitizeFileName(name: string, maxLength = 120) {
  const safe = name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  return safe.slice(0, maxLength) || `file_${Date.now()}`;
}

export function validateFileSize(file: File) {
  if (file.size <= 0) {
    return "Empty files are not allowed.";
  }

  if (isImage(file.type) && file.size > MAX_IMAGE_SIZE) {
    return "Image size exceeds 10MB limit.";
  }

  if (isVideo(file.type) && file.size > MAX_VIDEO_SIZE) {
    return "Video size exceeds 50MB limit.";
  }

  return null;
}

export function validateTotalUploadSize(files: File[]) {
  const total = files.reduce((sum, file) => sum + file.size, 0);

  if (total > MAX_TOTAL_UPLOAD_SIZE) {
    return "Total upload size exceeds allowed limit.";
  }

  return null;
}