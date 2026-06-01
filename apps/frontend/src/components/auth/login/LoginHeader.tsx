'use client';
import Link from 'next/link';
import Image from 'next/image';

export default function LoginHeader() {
  return (
    <div className="auth-card-header">
      <Link href="/" className="flex items-center gap-2">
        <Image
          src="/assets/siryan-logo.png"
          alt="Siryan Logo"
          className="auth-logo"
          width={64}
          height={64}
          priority
        />
        <span className="auth-brand">Siryan</span>
      </Link>
    </div>
  );
}
