'use client';

interface AuthDividerProps {
  text?: string;
}

export default function AuthDivider({ text = 'or continue with' }: AuthDividerProps) {
  return (
    <div className="auth-divider">
      <span>{text}</span>
    </div>
  );
}
