import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import clsx from 'clsx';

interface ThumbnailProps {
  src?: string | null;
  alt: string;
  /** Lado en px con que se dibuja la miniatura. */
  size?: number;
  shape?: 'square' | 'circle';
  className?: string;
}

// Antes se pedía a Cloudinary cada miniatura recortada al vuelo (c_fill,w_N,q_auto,f_auto), pero cada variante
// cuenta como una "transformación" y consumió casi la mitad de los créditos del plan gratuito. Las fotos ya son
// livianas (~30 KB), así que se muestran tal cual hasta migrarlas a un almacenamiento con tamaños pregenerados.
// Si la imagen falla, cae a un ícono.
function cloudinaryThumb(url: string, _size: number): string {
  return url;
}

export function Thumbnail({ src, alt, size = 40, shape = 'square', className }: ThumbnailProps) {
  const [attempt, setAttempt] = useState<'thumb' | 'original' | 'none'>('thumb');
  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-lg';
  const style = { width: size, height: size };

  if (!src || attempt === 'none') {
    return (
      <span
        role="img"
        aria-label={`${alt} (sin imagen)`}
        style={style}
        className={clsx(
          'inline-flex shrink-0 items-center justify-center bg-slate-100 text-slate-300',
          shapeClass,
          className,
        )}
      >
        <ImageOff className="h-1/2 w-1/2" />
      </span>
    );
  }

  return (
    <img
      src={attempt === 'thumb' ? cloudinaryThumb(src, size) : src}
      alt={alt}
      loading="lazy"
      style={style}
      className={clsx(
        'shrink-0 border border-slate-200 bg-slate-50 object-cover',
        shapeClass,
        className,
      )}
      onError={() => setAttempt(attempt === 'thumb' ? 'original' : 'none')}
    />
  );
}
