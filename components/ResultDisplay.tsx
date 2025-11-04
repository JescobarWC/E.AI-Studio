import React, { useState, useEffect } from 'react';

interface ResultDisplayProps {
  isLoading: boolean;
  resultImage: string | null;
  error: string | null;
  loadingMessage: string;
  kilometers?: string;
  carModel?: string;
}

const ShimmerLoader: React.FC<{ message: string }> = ({ message }) => (
    <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
        <div className="relative w-full h-full overflow-hidden rounded-lg bg-gray-100">
            <div
                className="absolute top-0 right-0 bottom-0 left-0 bg-gradient-to-r from-transparent via-orange-400/20 to-transparent"
                style={{
                    transform: 'translateX(-100%)',
                    animation: 'shimmer 2s infinite',
                }}
            ></div>
            <style>
            {`
                @keyframes shimmer {
                    100% {
                        transform: translateX(100%);
                    }
                }
            `}
            </style>
        </div>
        <p className="absolute text-lg text-gray-600">{message}</p>
    </div>
);


export const ResultDisplay: React.FC<ResultDisplayProps> = ({ isLoading, resultImage, error, loadingMessage, kilometers, carModel }) => {
  const [processedImage, setProcessedImage] = useState<string | null>(null);

  useEffect(() => {
    const shouldProcessImage = resultImage && !isLoading;

    if (shouldProcessImage) {
      const img = new Image();
      img.src = resultImage;
      img.crossOrigin = "anonymous";

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          setProcessedImage(resultImage);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const hasKilometers = kilometers && kilometers.trim() !== '';
        
        const disclaimerOverlayHeight = canvas.height * 0.07;
        const mileageOverlayHeight = hasKilometers ? canvas.height * 0.10 : 0;
        const totalOverlayHeight = disclaimerOverlayHeight + mileageOverlayHeight;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, canvas.height - totalOverlayHeight, canvas.width, totalOverlayHeight);

        if (hasKilometers) {
          const fontSize = mileageOverlayHeight * 0.45; 
          ctx.fillStyle = 'white';
          ctx.font = `600 ${fontSize}px Montserrat, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const text = `Kilometraje: ${kilometers} km`;
          ctx.fillText(text, canvas.width / 2, canvas.height - totalOverlayHeight + (mileageOverlayHeight / 2));
        }

        const disclaimerFontSize = disclaimerOverlayHeight * 0.4;
        ctx.fillStyle = 'white';
        ctx.font = `400 ${disclaimerFontSize}px Montserrat, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const disclaimerText = 'Imagen conceptual, solicita mas fotos a tu asesor comercial.';
        ctx.fillText(disclaimerText, canvas.width / 2, canvas.height - (disclaimerOverlayHeight / 2));

        setProcessedImage(canvas.toDataURL('image/jpeg'));
      };
      
      img.onerror = () => {
        setProcessedImage(resultImage);
      };
    } else {
      setProcessedImage(null);
    }
  }, [resultImage, isLoading, kilometers]);

  const displayImage = processedImage || resultImage;

  const slugify = (text: string) => text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
  
  const fileName = carModel
    ? `${slugify(carModel)}-generado-con-world-cars.jpg`
    : 'escena-coche-world-cars.jpg';
    
  const altText = carModel
    ? `${carModel} - Imagen generada para World Cars`
    : 'Resultado generado para World Cars';

  return (
    <div className="relative w-full aspect-video bg-white border border-gray-200 rounded-2xl flex items-center justify-center overflow-hidden shadow-md">
      {isLoading && (
        <ShimmerLoader message={loadingMessage} />
      )}
      {error && !isLoading && (
        <div className="p-6 text-center text-red-600">
          <p className="font-bold text-lg">Ocurrió un error:</p>
          <p className="mt-2">{error}</p>
        </div>
      )}
      {displayImage && !isLoading && (
        <>
          <img src={displayImage} alt={altText} className="w-full h-full object-contain" />
          <a
            href={displayImage}
            download={fileName}
            className="absolute bottom-5 right-5 bg-gradient-to-r from-orange-500 to-pink-500 text-white px-5 py-2.5 rounded-lg font-semibold hover:opacity-90 transition-opacity shadow-lg z-20"
          >
            Descargar
          </a>
        </>
      )}
       {!isLoading && !displayImage && !error && (
        <div className="text-center text-gray-500 p-6">
            <p className="text-xl font-medium">Tu imagen generada aparecerá aquí.</p>
        </div>
       )}
    </div>
  );
};
