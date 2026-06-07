'use client';
import { useRef, useState } from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import apiClient from '@/services/api.client';
import { authService } from '@/services/auth.service';
import { useToast } from '@/hooks/shared';
import { useAuth } from '@/hooks/shared';

interface AvatarUploadProps {
  currentUrl?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  onUpload: (relativeUrl: string) => void;
  onDelete?: () => void;
}

const sizes = { sm: 40, md: 64, lg: 96 };

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function AvatarUpload({ currentUrl, name, size = 'md', onUpload, onDelete }: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadingPreview, setUploadingPreview] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const { setProfile } = useAuth();
  const px = sizes[size];

  const base = process.env.NEXT_PUBLIC_SOCKET_URL ?? '';
  const displayUrl = uploadingPreview ?? (currentUrl && !imgError ? (currentUrl.startsWith('/uploads/') ? `${base}${currentUrl}` : currentUrl) : null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('Image must be under 2 MB', 'error');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('Only JPEG, PNG, or WebP images are allowed', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => setUploadingPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await apiClient.post('/upload/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url: string = res.data.data.avatar_url;

      const { profile: freshProfile } = await authService.getMe();
      setProfile(freshProfile);

      onUpload(url);
      setUploadingPreview(null);
      showToast('Profile photo updated', 'success');
    } catch {
      showToast('Failed to upload photo', 'error');
      setUploadingPreview(null);
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await apiClient.delete('/upload/avatar');
      const { profile: freshProfile } = await authService.getMe();
      setProfile(freshProfile);
      onDelete?.();
      showToast('Profile photo removed', 'success');
    } catch {
      showToast('Failed to remove photo', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const busy = isUploading || isDeleting;

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Circle */}
      <div
        className="avatar-upload-wrap"
        onClick={() => !busy && inputRef.current?.click()}
        style={{
          width: px,
          height: px,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: px * 0.3,
          fontWeight: 600,
          cursor: busy ? 'default' : 'pointer',
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
          userSelect: 'none',
          background: 'var(--brand-soft-bg)',
          color: 'var(--brand)',
        }}
      >
        {displayUrl ? (
          <img src={displayUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setImgError(true)} />
        ) : (
          <span>{getInitials(name) || '?'}</span>
        )}

        {!busy && (
          <div
            className="avatar-upload-overlay"
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
            }}
          >
            <Camera size={px * 0.28} color="white" />
          </div>
        )}

        {busy && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
            }}
          >
            <Loader2 size={px * 0.3} color="white" className="animate-spin" />
          </div>
        )}

        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleFileChange} />
      </div>

      {/* Delete button — only shown when a photo exists */}
      {displayUrl && !busy && (
        <button type="button" onClick={handleDelete} className="btn flex items-center gap-1 text-[12px] text-[var(--critical)] hover:underline mt-0.5">
          <Trash2 size={12} />
          Remove photo
        </button>
      )}
    </div>
  );
}
