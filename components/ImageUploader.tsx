import React, { useState, useCallback, useRef } from 'react';
import { UploadIcon } from './icons/UploadIcon';
import { CameraIcon } from './icons/CameraIcon';

interface ImageUploaderProps {
  onImageUpload: (file: File) => void;
  label: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, label }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((files: FileList | null) => {
    if (files && files[0]) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        // Revoke previous URL if it exists
        if (preview) {
            URL.revokeObjectURL(preview);
        }
        const objectURL = URL.createObjectURL(file);
        setPreview(objectURL);
        onImageUpload(file);
      }
    }
  }, [onImageUpload, preview]);

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
  
  const handleContainerClick = () => {
    // If there is a preview, this click should re-trigger the upload flow
    if (preview) {
        onUploadClick();
    }
  }

  return (
    <div
      className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-all duration-300 h-64 flex flex-col justify-center items-center group cursor-pointer overflow-hidden ${
        isDragging ? 'border-orange-500 bg-orange-50 scale-105 shadow-lg' : 'border-gray-300 bg-white hover:border-gray-400'
      }`}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={handleContainerClick}
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
        <>
            <img src={preview} alt="Previsualización" className="absolute inset-0 w-full h-full object-cover rounded-xl transition-transform duration-300 group-hover:scale-105" />
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl">
                <p className="text-white font-semibold text-lg">Cambiar imagen</p>
            </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center space-y-4 text-gray-500 w-full">
          <p className="font-semibold text-lg text-gray-600">
            {label}
          </p>
          <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4 w-full justify-center">
             <button
               type="button"
               onClick={(e) => { e.stopPropagation(); onUploadClick(); }}
               className="flex w-full sm:w-auto items-center justify-center px-5 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors duration-300 font-semibold"
             >
                <UploadIcon className="w-5 h-5 mr-2"/>
                Subir Archivo
             </button>
             <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onCameraClick(); }}
                className="flex w-full sm:w-auto items-center justify-center px-5 py-2.5 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-lg hover:opacity-90 transition-opacity duration-300 font-semibold"
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