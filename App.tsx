import React, { useState, useCallback } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { ResultDisplay } from './components/ResultDisplay';
import { generateScene, identifyCarModel, regenerateScene } from './services/geminiService';
import { fileToBase64, urlToBase64 } from './utils/fileUtils';

const App: React.FC = () => {
  const [sceneType, setSceneType] = useState<'exterior' | 'interior'>('exterior');
  const [carFile, setCarFile] = useState<File | null>(null);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string>('');
  const [backgroundInputMethod, setBackgroundInputMethod] = useState<'upload' | 'url'>('upload');
  const [licensePlate, setLicensePlate] = useState<string>('');
  const [isExtremeClean, setIsExtremeClean] = useState<boolean>(false);
  const [kilometers, setKilometers] = useState<string>('');
  const [additionalInstructions, setAdditionalInstructions] = useState<string>('');

  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [carModel, setCarModel] = useState<string>('');
  
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
    if (!carFile) {
        setError('Por favor, sube una imagen del coche.');
        return;
    }
    if (sceneType === 'exterior' && (!backgroundFile && !backgroundUrl)) {
      setError('Por favor, sube una imagen del coche y proporciona un fondo (archivo o URL).');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResultImage(null);
    setCarModel('');

    try {
      setLoadingMessage('Identificando modelo del coche...');
      const carBase64 = await fileToBase64(carFile);

      try {
        const identifiedModel = await identifyCarModel(carBase64, carFile.type);
        setCarModel(identifiedModel);
      } catch (identificationError) {
        console.warn('No se pudo identificar el modelo del coche, se usará un nombre de archivo genérico.', identificationError);
        // No detenemos el proceso, solo no tendremos el nombre para el archivo
      }

      let generatedImageBase64: string | null = null;
      
      if (sceneType === 'exterior') {
        let backgroundBase64: string | undefined;
        let backgroundMimeType: string | undefined;

        if (backgroundInputMethod === 'upload' && backgroundFile) {
            backgroundBase64 = await fileToBase64(backgroundFile);
            backgroundMimeType = backgroundFile.type;
        } else if (backgroundInputMethod === 'url' && backgroundUrl) {
            setLoadingMessage('Descargando imagen de fondo desde la URL...');
            const urlData = await urlToBase64(backgroundUrl);
            backgroundBase64 = urlData.base64;
            backgroundMimeType = urlData.mimeType;
        }

        if (!backgroundBase64 || !backgroundMimeType) {
          throw new Error("No se ha proporcionado una fuente de imagen de fondo válida para la escena exterior.");
        }
        setLoadingMessage('La IA está creando tu escena, esto puede tardar un momento...');
        generatedImageBase64 = await generateScene(
            'exterior',
            carBase64,
            carFile.type,
            backgroundBase64,
            backgroundMimeType,
            backgroundFile?.name,
            licensePlate,
            undefined,
            undefined,
            additionalInstructions
        );
      } else { // Interior
        setLoadingMessage('La IA está creando tu escena interior...');
        generatedImageBase64 = await generateScene(
          'interior',
          carBase64,
          carFile.type,
          undefined, // No background for interior
          undefined, // No background for interior
          undefined,
          undefined,
          isExtremeClean,
          kilometers,
          additionalInstructions
        );
      }


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
  
  const handleRegenerate = async () => {
    if (!resultImage || !carFile || sceneType !== 'exterior') {
      setError('No hay una imagen de escena exterior para mejorar.');
      return;
    }
    if (!backgroundFile && !backgroundUrl) {
      setError('Se necesita la imagen de fondo original para mejorar la escena.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setLoadingMessage('La IA está refinando tu escena...');

    try {
      const carBase64 = await fileToBase64(carFile);
      const previousResultBase64 = resultImage.split(',')[1];
      
      let backgroundBase64: string;
      let backgroundMimeType: string;

      if (backgroundFile) {
        backgroundBase64 = await fileToBase64(backgroundFile);
        backgroundMimeType = backgroundFile.type;
      } else { // backgroundUrl must be present due to the check above
        const urlData = await urlToBase64(backgroundUrl);
        backgroundBase64 = urlData.base64;
        backgroundMimeType = urlData.mimeType;
      }
      
      const regeneratedImageBase64 = await regenerateScene({
        carBase64,
        carMimeType: carFile.type,
        backgroundBase64,
        backgroundMimeType,
        previousResultBase64,
        additionalInstructions,
      });

      if (regeneratedImageBase64) {
        setResultImage(`data:image/jpeg;base64,${regeneratedImageBase64}`);
      } else {
        setError('El modelo no devolvió una imagen mejorada. El resultado anterior se mantiene.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ocurrió un error desconocido.';
      setError(`Error al mejorar la imagen: ${errorMessage}.`);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const isExteriorFieldsMissing = sceneType === 'exterior' && ((backgroundInputMethod === 'upload' && !backgroundFile) || (backgroundInputMethod === 'url' && !backgroundUrl));
  const isGenerateDisabled = isLoading || !carFile || isExteriorFieldsMissing;


  return (
    <div className="bg-transparent text-gray-800 min-h-screen font-montserrat flex flex-col">
      <header className="py-8">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-5xl md:text-6xl font-bold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-pink-500">
            E•AI Studio Pro
          </h1>
          <p className="text-gray-600 mt-4 max-w-2xl mx-auto">
            Crea escenas fotorrealistas de tu coche, tanto exteriores como interiores, con el poder de la IA.
          </p>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 flex-grow">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          
          <div className="flex flex-col space-y-8">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <h2 className="text-xl font-semibold mb-4 text-gray-700 tracking-wide border-b border-gray-200 pb-3">Tipo de Escena</h2>
                <div className="flex mt-4 rounded-lg bg-gray-100 p-1">
                    <button
                    onClick={() => setSceneType('exterior')}
                    className={`w-full py-2.5 px-4 rounded-md text-sm font-semibold transition-all duration-300 ${sceneType === 'exterior' ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-200'}`}
                    >
                    Exterior
                    </button>
                    <button
                    onClick={() => setSceneType('interior')}
                    className={`w-full py-2.5 px-4 rounded-md text-sm font-semibold transition-all duration-300 ${sceneType === 'interior' ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-200'}`}
                    >
                    Interior
                    </button>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-gray-700 tracking-wide border-b border-gray-200 pb-3">1. Sube tu Imagen</h2>
              <ImageUploader onImageUpload={handleCarUpload} label={sceneType === 'exterior' ? "Sube una imagen del coche" : "Sube una imagen del interior"} />
            </div>
            
            {sceneType === 'interior' && (
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <h2 className="text-xl font-semibold mb-4 text-gray-700 tracking-wide border-b border-gray-200 pb-3">2. Opciones de Interior</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div>
                      <label htmlFor="kilometers" className="text-gray-600 mb-2 font-medium block">Kilometraje (Opcional)</label>
                      <input
                          id="kilometers"
                          type="text"
                          value={kilometers}
                          onChange={(e) => setKilometers(e.target.value)}
                          placeholder="EJ: 95000"
                          className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                      />
                  </div>
                  <div className="flex flex-col justify-center">
                    <label htmlFor="extreme-clean" className="flex items-center cursor-pointer">
                      <div className="relative">
                        <input 
                          type="checkbox" 
                          id="extreme-clean" 
                          className="sr-only" 
                          checked={isExtremeClean}
                          onChange={() => setIsExtremeClean(!isExtremeClean)}
                        />
                        <div className="block bg-gray-200 w-14 h-8 rounded-full"></div>
                        <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform shadow-sm ${isExtremeClean ? 'transform translate-x-6 bg-gradient-to-r from-orange-400 to-pink-500' : ''}`}></div>
                      </div>
                      <div className="ml-3 text-gray-700 font-medium">
                        Limpieza Extrema
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {sceneType === 'exterior' && (
              <>
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                  <h2 className="text-xl font-semibold mb-4 text-gray-700 tracking-wide border-b border-gray-200 pb-3">2. Matrícula (Opcional)</h2>
                  <input
                      id="license-plate"
                      type="text"
                      value={licensePlate}
                      onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                      placeholder="EJ: 1234 ABC"
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all mt-4"
                  />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                  <h2 className="text-xl font-semibold mb-4 text-gray-700 tracking-wide border-b border-gray-200 pb-3">3. Elige la Escena de Fondo</h2>
                  <div className="flex mt-4 rounded-lg bg-gray-100 p-1">
                    <button
                      onClick={() => setBackgroundInputMethod('upload')}
                      className={`w-full py-2.5 px-4 rounded-md text-sm font-semibold transition-all duration-300 ${backgroundInputMethod === 'upload' ? 'bg-orange-500/90 text-white shadow' : 'text-gray-500 hover:bg-gray-200'}`}
                    >
                      Subir Archivo
                    </button>
                    <button
                      onClick={() => setBackgroundInputMethod('url')}
                      className={`w-full py-2.5 px-4 rounded-md text-sm font-semibold transition-all duration-300 ${backgroundInputMethod === 'url' ? 'bg-orange-500/90 text-white shadow' : 'text-gray-500 hover:bg-gray-200'}`}
                    >
                      Pegar URL
                    </button>
                  </div>

                  <div className="mt-4">
                    {backgroundInputMethod === 'upload' ? (
                      <ImageUploader onImageUpload={handleBackgroundUpload} label="Sube una imagen de fondo" />
                    ) : (
                      <div className="h-64 flex flex-col justify-center items-center bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4">
                          <label htmlFor="bg-url" className="text-gray-500 mb-2 font-semibold">URL de la imagen de fondo</label>
                          <input
                              id="bg-url"
                              type="text"
                              value={backgroundUrl}
                              onChange={handleBackgroundUrlChange}
                              placeholder="https://ejemplo.com/fondo.jpg"
                              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                          />
                          {backgroundUrl && <img src={backgroundUrl} alt="Previsualización de URL" className="mt-4 max-h-32 rounded-lg object-contain" onError={(e) => e.currentTarget.style.display='none'} />}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
            
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <h2 className="text-xl font-semibold mb-4 text-gray-700 tracking-wide border-b border-gray-200 pb-3">Instrucciones Adicionales (Opcional)</h2>
                <textarea
                    id="additional-instructions"
                    value={additionalInstructions}
                    onChange={(e) => setAdditionalInstructions(e.target.value)}
                    placeholder="Ej: Quiero el coche en diagonal, mostrando el lado del conductor..."
                    className="w-full mt-4 bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all h-24 resize-y"
                />
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerateDisabled}
              className="w-full text-white font-bold text-lg py-4 px-6 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 hover:shadow-pink-500/30"
            >
              {isLoading ? 'Generando...' : 'Generar Escena'}
            </button>
          </div>

          <div className="sticky top-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800 tracking-wide">Resultado</h2>
            <ResultDisplay
              isLoading={isLoading}
              resultImage={resultImage}
              error={error}
              loadingMessage={loadingMessage}
              kilometers={kilometers}
              carModel={carModel}
              onRegenerate={sceneType === 'exterior' && resultImage && !isLoading ? handleRegenerate : undefined}
            />
          </div>
        </div>
      </main>
      
      <footer className="py-6 text-center text-gray-500 text-sm mt-12">
        <p>E•AI Studio Pro © 2025. Creado por Jose Ignacio Escobar Jiménez.</p>
      </footer>
    </div>
  );
};

export default App;