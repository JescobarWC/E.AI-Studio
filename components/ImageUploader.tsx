import React, { useState, useCallback, useRef } from 'react';
import { UploadIcon } from './icons/UploadIcon';

interface ImageUploaderProps {
  onImageUpload: (file: File) => void;
  label: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, label }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((files: FileList | null) => {
    if (files && files[0]) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        onImageUpload(file);
        setPreview(URL.createObjectURL(file));
        setFileName(file.name);
      }
    }
  }, [onImageUpload]);

  const onDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileChange(e.dataTransfer.files);
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors duration-300 h-64 flex flex-col justify-center items-center ${
        isDragging ? 'border-indigo-500 bg-gray-800' : 'border-gray-600 hover:border-indigo-500'
      }`}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={onButtonClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileChange(e.target.files)}
      />
      {preview ? (
        <div className="flex flex-col items-center justify-center">
            <img src={preview} alt="Previsualización" className="mx-auto max-h-48 rounded-lg object-contain" />
            <p className="mt-2 text-sm text-gray-400 truncate w-full px-2">{fileName}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center space-y-4 text-gray-400">
          <UploadIcon className="w-12 h-12" />
          <p className="font-semibold text-lg">
            {label}
          </p>
          <p className="text-sm">
            <span className="text-indigo-400 font-medium">Haz clic para subir</span> o arrastra y suelta
          </p>
        </div>
      )}
    </div>
  );
};