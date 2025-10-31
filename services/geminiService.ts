
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
  backgroundFilename?: string,
  licensePlate?: string,
  isExtremeClean?: boolean
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
      
      let licensePlateInstruction = 'Si no se especifica una matrícula, y la imagen de referencia del coche tiene una matrícula visible, replícala con la mayor fidelidad posible. Si no tiene matrícula o no se puede replicar, genera el coche sin matrícula.';

      if (licensePlate && licensePlate.trim() !== '') {
          licensePlateInstruction = `Es absolutamente crucial que el coche generado tenga la siguiente matrícula: "${licensePlate}". La matrícula debe ser claramente visible, estar correctamente integrada en el parachoques y ser representada con total fidelidad y fotorrealismo.`;
      }
      
      prompt = `Usando la segunda imagen como referencia del modelo, color y perspectiva general del coche (ya sea frontal, trasera o lateral), y la primera imagen como la escena de fondo, genera una imagen completamente nueva y fotorrealista. En esta nueva creación, el coche debe estar integrado en la escena de fondo. La toma debe mantener la perspectiva de la foto de referencia, pero ser un plano más cercano del coche y con un ligero ángulo contrapicado para realzar su presencia. Es crucial que el coche no sea un simple recorte de la imagen original, sino una recreación generada por IA que coincida con el entorno en términos de iluminación, sombras y reflejos realistas para lograr una calidad fotográfica de alta gama. ${licensePlateInstruction}`;

      parts = [
        { text: prompt },
        { inlineData: { data: backgroundBase64, mimeType: backgroundMimeType } },
        { inlineData: { data: carBase64, mimeType: carMimeType } },
      ];
    } else { // interior
        if(backgroundBase64 && backgroundMimeType) {
            prompt = `Tu tarea es una fusión de restauración digital y composición fotorrealista. Trabajarás con dos imágenes: la del interior de un coche y una imagen de fondo. El objetivo es crear una imagen final donde el interior del coche esté impecable y la imagen de fondo se vea a través de las ventanas de manera creíble.

            Sigue estas prioridades estrictamente:
            
            1.  **Restauración y Limpieza del Interior (MÁXIMA PRIORIDAD):**
                *   Mantén el mismo ángulo de cámara, encuadre y composición de la foto original del interior.
                *   **Limpieza Agresiva:** Elimina CUALQUIER objeto que no sea parte intrínseca del coche (papeles, chalecos, botellas, ambientadores, etc.).
                *   **Restauración Digital:** Realiza una limpieza exhaustiva. Elimina todo rastro de polvo, manchas, huellas, suciedad y marcas de uso en TODAS las superficies (salpicadero, asientos, volante, alfombrillas, etc.). Los materiales deben lucir como nuevos, pero conservando su textura y forma original.
            
            2.  **Integración del Fondo y Realismo de la Luz (SEGUNDA PRIORIDAD):**
                *   Reemplaza las vistas originales a través de las ventanillas y el parabrisas con la imagen de fondo proporcionada.
                *   **Perspectiva y Escala:** Ajusta la perspectiva y la escala del fondo para que coincida con el punto de vista desde el interior del coche.
                *   **Iluminación Realista:** Esto es CRÍTICO. La luz de la imagen de fondo debe influir de manera realista en el interior. Genera reflejos creíbles de la escena exterior en las superficies brillantes del interior (cromados, plásticos pulidos, etc.) y ajusta las sombras dentro del coche para que se correspondan con la dirección e intensidad de la luz del fondo. El resultado final debe ser indistinguible de una fotografía real.`;

            parts = [
              { text: prompt },
              { inlineData: { data: carBase64, mimeType: carMimeType } },
              { inlineData: { data: backgroundBase64, mimeType: backgroundMimeType } },
            ];
        } else {
            if (isExtremeClean) {
                prompt = `Basado en la imagen proporcionada del interior de un coche, tu tarea es una **restauración digital extrema**. Es fundamental mantener el mismo ángulo de cámara, encuadre y composición que la foto original. El objetivo es presentar el interior en un estado impecable, como si fuera nuevo de fábrica.
    
                Los cambios deben centrarse en:
                1.  **Limpieza de Desorden:** Elimina cualquier objeto que no sea parte intrínseca del coche (papeles, chalecos, botellas, etc.).
                2.  **Sustitución de Vistas Exteriores:** Borra completamente cualquier vista del exterior a través de las ventanillas y reemplázalas con un fondo de estudio neutro, de color gris pálido o beige claro, con un desenfoque de lente (bokeh) pronunciado y suave.
                3.  **Restauración Extrema de Superficies:**
                    *   Realiza una limpieza digital exhaustiva en TODAS las superficies. Elimina agresivamente polvo, manchas, huellas, suciedad y cualquier marca de uso.
                    *   **Instrucción Especial (CRÍTICA):** Identifica las partes del interior que son de plástico o vinilo negro pero que, debido a una suciedad extrema, parecen marrones o descoloridas. Debes restaurar estas áreas a un color negro intenso y profundo, con el acabado mate o satinado que corresponda. Ten cuidado de NO aplicar este cambio a superficies que sean originalmente de cuero marrón, madera o tela de color beige/marrón. La IA debe ser capaz de distinguir entre suciedad y el material original.
                
                El resultado debe ser una imagen fotorrealista del mismo interior, pero en un estado de limpieza y conservación absolutamente perfecto.`;
            } else {
                prompt = `Basado en la imagen proporcionada del interior de un coche, tu tarea es editarla para crear una versión mejorada y profesional, casi como una restauración digital. Es fundamental que mantengas el mismo ángulo de cámara, encuadre y composición que la foto original. Tu objetivo es preservar la esencia del interior pero presentarlo en un estado impecable. Los cambios deben centrarse exclusivamente en lo siguiente: 1. Eliminar el exterior: Borra completamente cualquier vista del exterior que se vea a través de las ventanillas y el parabrisas. Reemplaza estas áreas con un fondo de estudio neutro, de color gris pálido o beige claro, con un desenfoque de lente (bokeh) pronunciado y suave. 2. Limpiar el desorden: Elimina cualquier objeto que no sea parte intrínseca del coche (papeles, chalecos, botellas, ambientadores, etc.). 3. Limpieza y restauración agresiva: Realiza una limpieza digital exhaustiva. Elimina de forma agresiva todo rastro de polvo, manchas, huellas dactilares, suciedad y cualquier marca de uso o desgaste en todas las superficies (salpicadero, asientos, volante, alfombrillas, etc.). El objetivo es que todos los materiales (plástico, cuero, tela) luzcan como si acabaran de salir de fábrica, con un acabado impecable y sin imperfecciones, pero conservando su textura y forma original. El resultado final debe ser una imagen fotorrealista del mismo interior y perspectiva, pero en un estado de limpieza y conservación absolutamente perfecto, sin vistas al exterior.`;
            }
            parts = [
                { text: prompt },
                { inlineData: { data: carBase64, mimeType: carMimeType } },
            ];
        }
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
