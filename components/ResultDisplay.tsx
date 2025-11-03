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
    // Siempre procesaremos la imagen para añadir el aviso legal.
    const shouldProcessImage = resultImage && !isLoading;

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

        // 2. Prepara los overlays.
        const hasKilometers = kilometers && kilometers.trim() !== '';
        
        // Define las alturas para cada overlay.
        const disclaimerOverlayHeight = canvas.height * 0.07; // 7% para el aviso
        const mileageOverlayHeight = hasKilometers ? canvas.height * 0.10 : 0; // 10% para el kilometraje
        const totalOverlayHeight = disclaimerOverlayHeight + mileageOverlayHeight;

        // 3. Dibuja un único fondo para todos los overlays.
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, canvas.height - totalOverlayHeight, canvas.width, totalOverlayHeight);

        // 4. Dibuja el texto del kilometraje (si aplica) en la parte superior del overlay.
        if (hasKilometers) {
          const fontSize = mileageOverlayHeight * 0.45; 
          ctx.fillStyle = 'white';
          ctx.font = `600 ${fontSize}px Montserrat, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const text = `Kilometraje: ${kilometers} km`;
          // Lo posiciona en la sección superior del overlay.
          ctx.fillText(text, canvas.width / 2, canvas.height - totalOverlayHeight + (mileageOverlayHeight / 2));
        }

        // 5. Dibuja el texto del aviso legal en la parte inferior del overlay.
        const disclaimerFontSize = disclaimerOverlayHeight * 0.4; // Ajustado de 0.5 a 0.4
        ctx.fillStyle = 'white';
        ctx.font = `400 ${disclaimerFontSize}px Montserrat, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const disclaimerText = 'Imagen conceptual, solicita mas fotos a tu asesor comercial.';
        // Lo posiciona en la sección inferior del overlay.
        ctx.fillText(disclaimerText, canvas.width / 2, canvas.height - (disclaimerOverlayHeight / 2));

        // 6. Convierte el canvas a una nueva imagen base64 y actualiza el estado.
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
