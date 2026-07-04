import { useEffect, useState, type CSSProperties } from 'react';

export interface AvatarProps {
  /** Person's name — used to derive initials shown when no image is available. */
  name?: string;
  /** Fully-resolved image URL. When omitted or it fails to load, initials are shown. */
  src?: string;
  /** CSS background (usually a gradient) shown behind the initials. */
  gradient?: string;
  /** Diameter in pixels. */
  size?: number;
  /** Color of the ring/border around the avatar. */
  ringColor?: string;
  className?: string;
  style?: CSSProperties;
}

/** A circular avatar that shows a photo when available, otherwise the person's initials on a colored ring. */
export default function Avatar({
  name,
  src,
  gradient,
  size = 46,
  ringColor = 'var(--avatar-ring)',
  className = '',
  style,
}: AvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => setImgFailed(false), [src]);
  const initials = (name || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={`flex items-center justify-center rounded-full font-extrabold ${className}`}
      style={{
        width: size,
        height: size,
        background: gradient,
        border: `3px solid ${ringColor}`,
        color: '#211008',
        fontSize: size * 0.35,
        ...style,
      }}
    >
      {src && !imgFailed ? (
        <img
          src={src}
          alt={name}
          className="h-full w-full rounded-full object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        initials
      )}
    </div>
  );
}
