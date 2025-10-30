import React, { useState, useCallback, useRef } from 'react';
import { UploadIcon } from './icons/UploadIcon';
import { CameraIcon } from './icons/CameraIcon';

interface ImageUploaderProps {
  onImageUpload: (file: File) => void;
  label: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, label }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((files: FileList | null) => {
    if (files && files[0]) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        onImageUpload(file);
        const objectURL = URL.createObjectURL(file);
        setPreview(objectURL);
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

  const onUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  const onCameraClick = () => {
    cameraInputRef.current?.click();
  };
  
  const handlePreviewClick = () => {
    // Revoke previous URL to prevent memory leaks
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    // Allow re-uploading or taking a new photo
    setPreview(null);
    setFileName('');
  }

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-300 h-64 flex flex-col justify-center items-center ${
        isDragging ? 'border-indigo-500 bg-gray-800' : 'border-gray-600'
      }`}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileChange(e.target.files)}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFileChange(e.target.files)}
      />

      {preview ? (
        <div className="flex flex-col items-center justify-center cursor-pointer" onClick={handlePreviewClick}>
            <img src={preview} alt="Previsualización" className="mx-auto max-h-48 rounded-lg object-contain" />
            <p className="mt-2 text-sm text-gray-400 truncate w-full px-2">{fileName}</p>
            <p className="mt-1 text-xs text-indigo-400 font-medium">Haz clic para cambiar la imagen</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center space-y-3 text-gray-400 w-full">
          <p className="font-semibold text-lg">
            {label}
          </p>
          <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full justify-center">
             <button
               type="button"
               onClick={onUploadClick}
               className="flex w-full sm:w-auto items-center justify-center px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
             >
                <UploadIcon className="w-5 h-5 mr-2"/>
                Subir Archivo
             </button>
             <button
                type="button"
                onClick={onCameraClick}
                className="flex w-full sm:w-auto items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
             >
                <CameraIcon className="w-5 h-5 mr-2"/>
                Tomar Foto
             </button>
          </div>
          <p className="text-sm pt-2">
            o arrastra y suelta una imagen aquí
          </p>
        </div>
      )}
    </div>
  );
};