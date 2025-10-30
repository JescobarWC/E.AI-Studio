import React, { useState, useCallback } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { ResultDisplay } from './components/ResultDisplay';
import { generateCarScene } from './services/geminiService';
import { fileToBase64, urlToBase64 } from './utils/fileUtils';

const App: React.FC = () => {
  const [carFile, setCarFile] = useState<File | null>(null);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string>('');
  const [backgroundInputMethod, setBackgroundInputMethod] = useState<'upload' | 'url'>('upload');

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
    setBackgroundUrl('');
    setResultImage(null);
    setError(null);
  }, []);
  
  const handleBackgroundUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBackgroundUrl(e.target.value);
    setBackgroundFile(null);
    setResultImage(null);
    setError(null);
  };

  const handleGenerate = async () => {
    if (!carFile || (!backgroundFile && !backgroundUrl)) {
      setError('Por favor, sube una imagen del coche y proporciona un fondo (archivo o URL).');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResultImage(null);
    setLoadingMessage('Preparando imágenes y generando tu escena...');

    try {
      const carBase64 = await fileToBase64(carFile);
      let backgroundBase64: string;
      let backgroundMimeType: string;

      if (backgroundInputMethod === 'upload' && backgroundFile) {
        backgroundBase64 = await fileToBase64(backgroundFile);
        backgroundMimeType = backgroundFile.type;
      } else if (backgroundInputMethod === 'url' && backgroundUrl) {
        setLoadingMessage('Descargando imagen de fondo desde la URL...');
        const urlData = await urlToBase64(backgroundUrl);
        backgroundBase64 = urlData.base64;
        backgroundMimeType = urlData.mimeType;
      } else {
        throw new Error("No se ha proporcionado una fuente de imagen de fondo válida.");
      }
      
      setLoadingMessage('La IA está creando tu escena, esto puede tardar un momento...');
      const generatedImageBase64 = await generateCarScene(
        carBase64,
        carFile.type,
        backgroundBase64,
        backgroundMimeType
      );

      if (generatedImageBase64) {
        setResultImage(`data:image/jpeg;base64,${generatedImageBase64}`);
      } else {
        setError('El modelo no devolvió una imagen. Por favor, inténtalo de nuevo.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ocurrió un error desconocido.';
      setError(`Error: ${errorMessage}. Asegúrate de que la URL sea una imagen directa y accesible (sin problemas de CORS).`);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };
  
  const isGenerateDisabled = isLoading || !carFile || (backgroundInputMethod === 'upload' && !backgroundFile) || (backgroundInputMethod === 'url' && !backgroundUrl);

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
              <h2 className="text-2xl font-semibold mb-4 text-indigo-300">2. Elige la Escena de Fondo</h2>
               <div className="flex mb-4 rounded-lg bg-gray-800 p-1">
                <button
                  onClick={() => setBackgroundInputMethod('upload')}
                  className={`w-full py-2 px-4 rounded-md text-sm font-medium transition-colors ${backgroundInputMethod === 'upload' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                >
                  Subir Archivo
                </button>
                <button
                  onClick={() => setBackgroundInputMethod('url')}
                  className={`w-full py-2 px-4 rounded-md text-sm font-medium transition-colors ${backgroundInputMethod === 'url' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                >
                  Pegar URL
                </button>
              </div>

              {backgroundInputMethod === 'upload' ? (
                 <ImageUploader onImageUpload={handleBackgroundUpload} label="Sube una imagen de fondo" />
              ) : (
                <div className="h-64 flex flex-col justify-center items-center bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg p-4">
                    <label htmlFor="bg-url" className="text-gray-400 mb-2 font-semibold">URL de la imagen de fondo</label>
                    <input
                        id="bg-url"
                        type="text"
                        value={backgroundUrl}
                        onChange={handleBackgroundUrlChange}
                        placeholder="https://ejemplo.com/fondo.jpg"
                        className="w-full bg-gray-900 border border-gray-500 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                     {backgroundUrl && <img src={backgroundUrl} alt="Previsualización de URL" className="mt-4 max-h-32 rounded-lg object-contain" onError={(e) => e.currentTarget.style.display='none'} />}
                </div>
              )}
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerateDisabled}
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
