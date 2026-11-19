import React, { useEffect, useState } from 'react';
import type { RealmMotif } from '../data/types';
import { resolveArtworkSrc, type ArtworkVariant } from '../data/artworkAssets';

interface ArtworkFrameProps {
  src: string;
  alt: string;
  accentHex: string;
  motif?: RealmMotif;
  variant?: ArtworkVariant;
  loading?: 'lazy' | 'eager';
  decoding?: 'async' | 'sync' | 'auto';
  fetchPriority?: 'high' | 'low' | 'auto';
  className?: string;
}

/**
 * إطار عرض الأعمال الفنية مع مسار بديل آمن متناغم مع الثيم الوردي الفاتح
 */
export const ArtworkFrame = React.memo(function ArtworkFrame({
  src,
  alt,
  accentHex,
  motif = 'crescent',
  variant = 'full',
  loading = 'lazy',
  decoding = 'async',
  fetchPriority = 'auto',
  className = '',
}: ArtworkFrameProps) {
  const resolvedSrc = resolveArtworkSrc(src, variant);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [resolvedSrc]);

  if (failed || !resolvedSrc) {
    return (
      <div
        className={`relative overflow-hidden flex items-center justify-center bg-[#FCEEF2] ${className}`}
        style={{
          backgroundImage: `radial-gradient(circle at 50% 40%, ${accentHex}24 0%, #FCEEF2 78%)`,
        }}
        role="img"
        aria-label={alt}
      >
        <svg viewBox="0 0 100 100" className="w-1/2 h-1/2 opacity-85" aria-hidden="true">
          <circle cx="50" cy="50" r="36" fill="none" stroke={accentHex} strokeWidth="1.2" strokeDasharray="3 4" />
          {motif === 'crescent' && (
            <path
              d="M55 25C43 27 34 37.5 34 50C34 62.5 43 73 55 75C46 77 36 73 30 64C24 55 25 43 32 35C38 28 47 24 55 25Z"
              fill={accentHex}
            />
          )}
          {motif === 'orb' && (
            <>
              <circle cx="50" cy="50" r="18" fill={accentHex} fillOpacity="0.2" stroke={accentHex} strokeWidth="1.5" />
              <circle cx="50" cy="50" r="6" fill={accentHex} />
            </>
          )}
          {motif === 'ribbon' && (
            <path
              d="M25 65C38 35 62 65 75 35"
              fill="none"
              stroke={accentHex}
              strokeWidth="3"
              strokeLinecap="round"
            />
          )}
        </svg>
      </div>
    );
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      loading={loading}
      decoding={decoding}
      fetchPriority={fetchPriority}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`object-cover select-none ${className}`}
    />
  );
});
