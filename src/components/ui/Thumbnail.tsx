import { useState } from "react";
import { ImageOff } from "lucide-react";
import clsx from "clsx";

interface ThumbnailProps {
  src?: string | null;
  alt: string;
  /** Lado en px (se usa también para pedir a Cloudinary una versión pequeña). */
  size?: number;
  shape?: "square" | "circle";
  className?: string;
}

// Las imágenes de Cloudinary se piden ya recortadas y comprimidas (una lista puede tener 100+
// filas). Si la transformación no está permitida o falla, se cae a la URL original.
function cloudinaryThumb(url: string, size: number): string {
  const marker = "/upload/";
  const index = url.indexOf(marker);
  if (index === -1 || !url.includes("res.cloudinary.com")) return url;
  const px = size * 2; // pantallas de alta densidad
  return `${url.slice(0, index + marker.length)}c_fill,w_${px},h_${px},q_auto,f_auto/${url.slice(index + marker.length)}`;
}

export function Thumbnail({
  src,
  alt,
  size = 40,
  shape = "square",
  className,
}: ThumbnailProps) {
  const [attempt, setAttempt] = useState<"thumb" | "original" | "none">(
    "thumb",
  );
  const shapeClass = shape === "circle" ? "rounded-full" : "rounded-lg";
  const style = { width: size, height: size };

  if (!src || attempt === "none") {
    return (
      <span
        role="img"
        aria-label={`${alt} (sin imagen)`}
        style={style}
        className={clsx(
          "inline-flex shrink-0 items-center justify-center bg-slate-100 text-slate-300",
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
      src={attempt === "thumb" ? cloudinaryThumb(src, size) : src}
      alt={alt}
      loading="lazy"
      style={style}
      className={clsx(
        "shrink-0 border border-slate-200 bg-slate-50 object-cover",
        shapeClass,
        className,
      )}
      onError={() => setAttempt(attempt === "thumb" ? "original" : "none")}
    />
  );
}
