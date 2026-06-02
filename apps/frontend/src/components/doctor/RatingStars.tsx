import { Star } from 'lucide-react';

interface RatingStarsProps {
  value: number;
  outOf?: number;
  size?: number;
}

export function RatingStars({ value, outOf = 5, size = 14 }: RatingStarsProps) {
  return (
    <div className="flex items-center gap-[2px]">
      {Array.from({ length: outOf }).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={i < value ? 'fill-[var(--brand)] text-[var(--brand)]' : 'text-[var(--fg-4)]'}
        />
      ))}
    </div>
  );
}
