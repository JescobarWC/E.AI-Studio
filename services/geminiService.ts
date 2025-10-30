
import { GoogleGenAI, Modality } from '@google/genai';

// Helper function to initialize the AI client just-in-time.
const getAiClient = () => {
  const API_KEY = process.env.API_KEY;
  if (!API_KEY) {
    throw new Error("Falta la clave de la API. Por favor, asegúrate de que esté configurada en el entorno.");
  }
  return new GoogleGenAI({ apiKey: API_KEY });
}

export async function generateScene(
  type: 'exterior' | 'interior',
  carBase64: string, 
  carMimeType: string, 
  backgroundBase64?: string, 
  backgroundMimeType?: string,
  backgroundFilename?: string
): Promise<string | null> {
  try {
    const ai = getAiClient();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let prompt: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parts: any[];

    if (type === 'exterior') {
      if (!backgroundBase64 || !backgroundMimeType) {
        throw new Error('Para la escena exterior se requiere una imagen de fondo.');
      }
      
      if (backgroundFilename === 'fondo-final.jpg') {
        prompt = 'Añade el coche de la segunda imagen a la primera imagen, que es la escena de fondo. El coche debe colocarse en la plataforma giratoria central. Haz que la imagen final parezca una fotografía real de alta calidad, con iluminación, sombras y reflejos realistas. Posiciona el coche de manera que su techo quede justo debajo del letrero "World Cars", y asegúrate de que el coche se vea grande y prominente en la escena. Si no puedes replicar perfectamente la matrícula de la foto original del coche, genera el coche sin matrícula. El letrero "World Cars" en la imagen de fondo debe permanecer como está en la imagen original; no lo cambies a un estilo de neón naranja.';
      } else {
        prompt = 'Añade el coche de la segunda imagen a la primera imagen, que es la escena de fondo. El coche debe colocarse en la plataforma giratoria central. Haz que la imagen final parezca una fotografía real de alta calidad, con iluminación, sombras y reflejos realistas. Posiciona el coche de manera que su techo quede justo debajo del letrero "World Cars", y asegúrate de que el coche se vea grande y prominente en la escena. Si no puedes replicar perfectamente la matrícula de la foto original del coche, genera el coche sin matrícula. Si alguna vez tienes que añadir un letrero o cartel de "World Cars", debe ser en estilo de neón naranja.';
      }

      parts = [
        { text: prompt },
        { inlineData: { data: backgroundBase64, mimeType: backgroundMimeType } },
        { inlineData: { data: carBase64, mimeType: carMimeType } },
      ];
    } else { // interior
      prompt = 'Dada la imagen del interior de un coche, genera una nueva imagen fotorrealista de calidad de estudio. El objetivo principal es eliminar por completo la vista del exterior a través de las ventanillas y el parabrisas. Reemplaza el fondo exterior con un fondo de estudio neutro y limpio, con un ligero desenfoque para mantener el enfoque en el interior del coche. Mejora la iluminación dentro del coche para resaltar los detalles del salpicadero, los asientos y el volante. Además, limpia el interior del coche eliminando cualquier objeto personal o desorden, como papeles, botellas u otros artículos que puedan estar en los asientos, especialmente en el asiento del copiloto, o en el salpicadero. Si el interior del coche original está sucio, con manchas en la tapicería o polvo, la imagen generada deberá mostrarlo completamente limpio, como si estuviera nuevo. El interior debe verse impecable y como si fuera de exposición. El resultado final no debe mostrar nada del mundo exterior, solo el interior del coche como si estuviera en un estudio fotográfico profesional.';
      parts = [
        { text: prompt },
        { inlineData: { data: carBase64, mimeType: carMimeType } },
      ];
    }
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: parts,
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