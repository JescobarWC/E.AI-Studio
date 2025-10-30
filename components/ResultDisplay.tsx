import React from 'react';
import { Loader } from './Loader';

interface ResultDisplayProps {
  isLoading: boolean;
  resultImage: string | null;
  error: string | null;
  loadingMessage: string;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ isLoading, resultImage, error, loadingMessage }) => {
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
      {resultImage && !isLoading && (
        <>
          <img src={resultImage} alt="Resultado generado" className="w-full h-full object-contain" />
          <a
            href={resultImage}
            download="escena-coche.jpg"
            className="absolute bottom-4 right-4 bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors shadow-lg"
          >
            Descargar
          </a>
        </>
      )}
       {!isLoading && !resultImage && !error && (
        <div className="text-center text-gray-500">
            <p className="text-xl font-medium">Tu imagen generada aparecerá aquí.</p>
        </div>
       )}
    </div>
  );
};