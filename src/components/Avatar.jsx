import { useState } from 'react';

export default function Avatar({ name, photoUrl, gradient, size = 46, ringColor = 'var(--avatar-ring)', className = '', style }) {
  const [photoFailed, setPhotoFailed] = useState(false);
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
      {photoUrl && !photoFailed ? (
        <img
          src={`/api/photo-proxy?url=${encodeURIComponent(photoUrl)}`}
          alt={name}
          className="h-full w-full rounded-full object-cover"
          onError={() => setPhotoFailed(true)}
        />
      ) : (
        initials
      )}
    </div>
  );
}
