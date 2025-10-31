
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
      
      prompt = 'Usando la segunda imagen como referencia del modelo y color del coche, y la primera imagen como la escena de fondo, genera una imagen completamente nueva y fotorrealista. En esta nueva creación, el coche debe estar integrado en la escena de fondo, colocado en la plataforma giratoria central. La toma debe ser un plano más cercano del coche, con un ligero ángulo contrapicado para realzar su presencia y asegurar que los logos sean visibles. Es crucial que el coche no sea un simple recorte de la imagen original, sino una recreación generada por IA que coincida con el entorno en términos de iluminación, sombras y reflejos realistas para lograr una calidad fotográfica de alta gama. Posiciona el coche de manera que su techo quede justo debajo del letrero "World Cars", y asegúrate de que el coche se vea grande y prominente en la escena. Si no puedes replicar perfectamente la matrícula de la foto original del coche, genera el coche sin matrícula. El letrero "World Cars" en la imagen de fondo debe permanecer como está en la imagen original; no lo modifiques ni cambies su estilo.';

      parts = [
        { text: prompt },
        { inlineData: { data: backgroundBase64, mimeType: backgroundMimeType } },
        { inlineData: { data: carBase64, mimeType: carMimeType } },
      ];
    } else { // interior
      prompt = 'Basado en la imagen proporcionada del interior de un coche, tu tarea es editarla para crear una versión mejorada y profesional. Es fundamental que mantengas el mismo ángulo de cámara, encuadre y composición que la foto original. Los cambios deben centrarse exclusivamente en lo siguiente: 1. Eliminar el exterior: Borra completamente cualquier vista del exterior que se vea a través de las ventanillas y el parabrisas. Reemplaza estas áreas con un fondo neutro y desenfocado de estudio. 2. Limpiar el desorden: Elimina cualquier objeto que no sea parte del coche (papeles, chalecos, botellas, etc.). 3. Limpieza profunda: Si el interior muestra polvo, manchas o suciedad, la imagen final debe mostrarlo impecable, como si fuera nuevo. El resultado final debe ser una imagen fotorrealista del mismo interior y perspectiva, pero impecablemente limpio y sin vistas al exterior.';
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