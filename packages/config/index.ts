/**
 * Vesper Messenger - System Configuration & Constants
 */

export const VESPER_CONFIG = {
  appName: 'Vesper Messenger',
  version: '2.4.0',
  apiPrefix: '/api',
  auth: {
    otpLength: 6,
    otpExpirySeconds: 300, // 5 minutes
    maxOtpAttempts: 5,
    jwtExpirySeconds: 3600 * 24 * 7, // 7 days
    refreshTokenExpirySeconds: 3600 * 24 * 30, // 30 days
  },
  rateLimits: {
    otpRequestsPerHour: 5,
    messageSendRatePerSec: 10,
    mediaUploadLimitMb: 50,
  },
  media: {
    maxImageSizeMb: 15,
    maxVideoSizeMb: 100,
    maxAudioSizeMb: 25,
    maxDocSizeMb: 50,
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'audio/mpeg',
      'audio/ogg',
      'audio/wav',
      'audio/webm',
      'application/pdf',
      'application/zip',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ],
  },
  webrtc: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      {
        urls: 'turn:turn.vespermessenger.org:3478',
        username: 'turn_vesper_user',
        credential: 'turn_vesper_secure_password',
      },
    ],
  },
  stories: {
    lifespanHours: 24,
  },
};
