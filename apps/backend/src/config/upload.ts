import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

const avatarDir = path.join(process.cwd(), 'uploads', 'avatars');
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });

const storage = multer.diskStorage({
  destination: avatarDir,
  filename: (_req, file, cb) => {
    const unique = crypto.randomBytes(16).toString('hex');
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

export const uploadAvatar = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
  },
});

const chatbotAudioDir = path.join(process.cwd(), 'uploads', 'chatbot-audio');
if (!fs.existsSync(chatbotAudioDir)) fs.mkdirSync(chatbotAudioDir, { recursive: true });

const audioStorage = multer.diskStorage({
  destination: chatbotAudioDir,
  filename: (_req, file, cb) => {
    const unique = crypto.randomBytes(16).toString('hex');
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

export const uploadChatbotAudio = multer({
  storage: audioStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-wav', 'audio/wave'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only audio files (webm, ogg, mp3, wav) are allowed'));
  },
});
