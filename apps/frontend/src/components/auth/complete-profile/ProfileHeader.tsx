'use client';
import Image from 'next/image';

interface ProfileHeaderProps {
  googleAvatar: string;
}

export default function ProfileHeader({ googleAvatar }: ProfileHeaderProps) {
  return (
    <>
      <div className="auth-card-header">
        <Image src="/assets/siryan-logo.png" alt="Siryan Logo" className="auth-logo" width={64} height={64} priority />
        <span className="auth-brand">Siryan</span>
      </div>

      {googleAvatar && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={googleAvatar}
            alt=""
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid var(--border)',
            }}
          />
        </div>
      )}

      <h1 className="auth-title">Complete your account</h1>
      <p className="auth-lede">Just a few more details to get you started.</p>
    </>
  );
}
