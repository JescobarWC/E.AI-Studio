import { GoogleGenAI, Modality } from '@google/genai';

// Helper function to initialize the AI client just-in-time.
const getAiClient = () => {
  const API_KEY = process.env.API_KEY;
  if (!API_KEY) {
    throw new Error("Falta la clave de la API. Por favor, asegúrate de que esté configurada en el entorno.");
  }
  return new GoogleGenAI({ apiKey: API_KEY });
}

export async function generateCarScene(
  carBase64: string, 
  carMimeType: string, 
  backgroundBase64: string, 
  backgroundMimeType: string
): Promise<string | null> {
  try {
    const ai = getAiClient();
    
    // Un prompt más simple y directo para mejorar la fiabilidad.
    const prompt = 'Añade el coche de la segunda imagen a la primera imagen, que es la escena de fondo. El coche debe colocarse en la plataforma giratoria central. Haz que la imagen final parezca una fotografía real de alta calidad, con iluminación, sombras y reflejos realistas. Posiciona el coche de manera que su techo quede justo debajo del letrero "World Cars", y asegúrate de que el coche se vea grande y prominente en la escena. Si no puedes replicar perfectamente la matrícula de la foto original del coche, genera el coche sin matrícula.';

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          // El prompt de texto debe ir primero para dar contexto al modelo.
          {
            text: prompt,
          },
          // La primera imagen es el fondo.
          {
            inlineData: {
              data: backgroundBase64,
              mimeType: backgroundMimeType,
            },
          },
          // La segunda imagen es el coche.
          {
            inlineData: {
              data: carBase64,
              mimeType: carMimeType,
            },
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }
    
    return null;

  } catch (error) {
    console.error('Error al llamar a la API de Gemini para generar la escena:', error);
    throw new Error('Error al generar la escena del coche con el modelo de IA.');
  }
}