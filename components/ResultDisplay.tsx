import React, { useState, useEffect } from 'react';
import { Loader } from './Loader';

interface ResultDisplayProps {
  isLoading: boolean;
  resultImage: string | null;
  error: string | null;
  loadingMessage: string;
  kilometers?: string;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ isLoading, resultImage, error, loadingMessage, kilometers }) => {
  const [processedImage, setProcessedImage] = useState<string | null>(null);

  useEffect(() => {
    const shouldProcessImage = resultImage && !isLoading && kilometers && kilometers.trim() !== '';

    if (shouldProcessImage) {
      const img = new Image();
      img.src = resultImage;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          // Si el contexto del canvas falla, muestra la imagen original.
          setProcessedImage(resultImage);
          return;
        }

        // 1. Dibuja la imagen original en el canvas.
        ctx.drawImage(img, 0, 0);

        // 2. Dibuja el overlay.
        const overlayHeight = canvas.height * 0.12; // Altura del overlay (12% de la altura de la imagen).
        const fontSize = overlayHeight * 0.4; // Tamaño de la fuente proporcional al overlay.

        // Rectángulo negro semitransparente.
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, canvas.height - overlayHeight, canvas.width, overlayHeight);

        // Texto del kilometraje.
        ctx.fillStyle = 'white';
        ctx.font = `600 ${fontSize}px Montserrat, sans-serif`; // font-weight 600 (semibold)
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const text = `Kilometraje: ${kilometers} km`;
        ctx.fillText(text, canvas.width / 2, canvas.height - overlayHeight / 2);

        // 3. Convierte el canvas a una nueva imagen base64 y actualiza el estado.
        setProcessedImage(canvas.toDataURL('image/jpeg'));
      };
      
      img.onerror = () => {
        // Si hay un error al cargar la imagen, recurre a la original.
        setProcessedImage(resultImage);
      };
    } else {
      // Si no hay que procesar, limpia la imagen procesada.
      setProcessedImage(null);
    }
  }, [resultImage, isLoading, kilometers]);

  const displayImage = processedImage || resultImage;

  return (
    <div className="relative w-full aspect-video bg-gray-800 rounded-lg flex items-center justify-center border border-gray-700 overflow-hidden">
      {isLoading && (
        <div className="text-center">
            <Loader />
            <p className="mt-4 text-lg text-gray-300 animate-pulse">{loadingMessage}</p>
        </div>
      )}
      {error && !isLoading && (
        <div className="p-4 text-center text-red-400">
          <p className="font-bold">Ocurrió un error:</p>
          <p>{error}</p>
        </div>
      )}
      {displayImage && !isLoading && (
        <>
          <img src={displayImage} alt="Resultado generado" className="w-full h-full object-contain" />
          <a
            href={displayImage}
            download="escena-coche.jpg"
            className="absolute bottom-4 right-4 bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors shadow-lg z-20"
          >
            Descargar
          </a>
        </>
      )}
       {!isLoading && !displayImage && !error && (
        <div className="text-center text-gray-500">
            <p className="text-xl font-medium">Tu imagen generada aparecerá aquí.</p>
        </div>
       )}
    </div>
  );
};
