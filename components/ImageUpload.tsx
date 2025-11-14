'use client';

import { useCallback, useState } from 'react';
import { Upload } from 'lucide-react';

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
}

export function ImageUpload({ onImageSelect }: ImageUploadProps) {
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        onImageSelect(file);
      }
    }
  }, [onImageSelect]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      onImageSelect(files[0]);
    }
  }, [onImageSelect]);

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={`relative w-full max-w-md cursor-pointer rounded-lg border-2 border-dashed transition-all ${
        isDragActive
          ? 'border-primary bg-primary/5'
          : 'border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 hover:dark:border-zinc-600'
      }`}
    >
      <input
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
        id="image-input"
      />
      <label
        htmlFor="image-input"
        className="flex flex-col items-center justify-center gap-3 px-6 py-12"
      >
        <Upload className="h-8 w-8 text-zinc-400 dark:text-zinc-600" />
        <div className="text-center">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            PNG, JPG, JPEG (up to 10MB)
          </p>
        </div>
      </label>
    </div>
  );
}
