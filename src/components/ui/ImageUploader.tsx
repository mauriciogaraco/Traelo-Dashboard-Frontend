import { useRef, useState } from 'react';
import type { DragEvent } from 'react';
import type { SerializedError } from '@reduxjs/toolkit';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { ImagePlus, Loader2, UploadCloud } from 'lucide-react';
import clsx from 'clsx';
import { useToast } from './ToastProvider';
import { getErrorMessage } from '@/lib/getErrorMessage';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

interface ImageUploaderProps {
  currentImageUrl?: string | null;
  onUpload: (file: File) => Promise<unknown>;
  successMessage?: string;
  shape?: 'square' | 'circle';
}

export function ImageUploader({
  currentImageUrl,
  onUpload,
  successMessage = 'Imagen actualizada',
  shape = 'square',
}: ImageUploaderProps) {
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('El archivo debe ser una imagen', 'error');
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      showToast('La imagen no puede pesar más de 5 MB', 'error');
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setIsUploading(true);
    try {
      await onUpload(file);
      showToast(successMessage, 'success');
    } catch (error) {
      showToast(getErrorMessage(error as FetchBaseQueryError | SerializedError), 'error');
    } finally {
      setIsUploading(false);
      URL.revokeObjectURL(localPreview);
      setPreviewUrl(null);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    handleFile(event.dataTransfer.files[0]);
  }

  const displayUrl = previewUrl ?? currentImageUrl ?? null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={clsx(
        'relative flex h-28 w-28 cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden border-2 border-dashed bg-slate-50 text-center transition-colors',
        shape === 'circle' ? 'rounded-full' : 'rounded-xl',
        isDragging ? 'border-brand-500 bg-brand-50' : 'border-slate-300 hover:border-brand-400',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {displayUrl ? (
        <img src={displayUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <>
          <ImagePlus className="h-6 w-6 text-slate-400" />
          <span className="px-2 text-[11px] leading-tight text-slate-500">
            Arrastrá o hacé clic
          </span>
        </>
      )}

      {isUploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40">
          <Loader2 className="h-5 w-5 animate-spin text-white" />
        </div>
      )}

      {!isUploading && displayUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/0 opacity-0 transition-opacity hover:bg-slate-900/40 hover:opacity-100">
          <UploadCloud className="h-5 w-5 text-white" />
        </div>
      )}
    </div>
  );
}
