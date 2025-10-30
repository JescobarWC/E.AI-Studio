import React, { useState, useCallback } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { ResultDisplay } from './components/ResultDisplay';
import { generateCarScene } from './services/geminiService';
import { fileToBase64 } from './utils/fileUtils';

const App: React.FC = () => {
  const [carFile, setCarFile] = useState<File | null>(null);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  
  const handleCarUpload = useCallback((file: File) => {
    setCarFile(file);
    setResultImage(null);
    setError(null);
  }, []);

  const handleBackgroundUpload = useCallback((file: File) => {
    setBackgroundFile(file);
    setResultImage(null);
    setError(null);
  }, []);

  const handleGenerate = async () => {
    if (!carFile || !backgroundFile) {
      setError('Por favor, sube una imagen del coche y una del fondo.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResultImage(null);
    setLoadingMessage('Generando tu escena... esto puede tardar un momento.');

    try {
      const carBase64 = await fileToBase64(carFile);
      const backgroundBase64 = await fileToBase64(backgroundFile);

      const generatedImageBase64 = await generateCarScene(
        carBase64,
        carFile.type,
        backgroundBase64,
        backgroundFile.type
      );

      if (generatedImageBase64) {
        setResultImage(`data:image/jpeg;base64,${generatedImageBase64}`);
      } else {
        setError('El modelo no devolvió una imagen. Por favor, inténtalo de nuevo.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error desconocido.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen font-sans">
      <header className="py-6 bg-gray-800 shadow-lg">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold text-center text-indigo-400 tracking-wider">
            E•AI Studio
          </h1>
          <p className="text-center text-gray-400 mt-2">
            Sube una foto de un coche y una de fondo, y deja que la IA cree una nueva escena realista.
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-semibold mb-4 text-indigo-300">1. Sube tu Coche</h2>
              <ImageUploader onImageUpload={handleCarUpload} label="Sube una imagen del coche" />
            </div>
            
            <div>
              <h2 className="text-2xl font-semibold mb-4 text-indigo-300">2. Sube la Escena de Fondo</h2>
              <ImageUploader onImageUpload={handleBackgroundUpload} label="Sube una imagen de fondo" />
            </div>

            <button
              onClick={handleGenerate}
              disabled={isLoading || !carFile || !backgroundFile}
              className="w-full bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-700 transition-all duration-300 disabled:bg-gray-700 disabled:cursor-not-allowed disabled:text-gray-400 flex items-center justify-center shadow-lg"
            >
              {isLoading ? 'Generando...' : '3. Generar Escena'}
            </button>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-4 text-indigo-300">Resultado</h2>
            <ResultDisplay
              isLoading={isLoading}
              resultImage={resultImage}
              error={error}
              loadingMessage={loadingMessage}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;