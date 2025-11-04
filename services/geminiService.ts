import { GoogleGenAI, Modality } from '@google/genai';

interface GenerateFromDescriptionParams {
    description: { make: string; model: string; year: string; color: string; };
    backgroundBase64: string;
    backgroundMimeType: string;
    licensePlate?: string;
    additionalInstructions?: string;
}

// Helper function to initialize the AI client just-in-time.
const getAiClient = () => {
  const API_KEY = process.env.API_KEY;
  if (!API_KEY) {
    throw new Error("Falta la clave de la API. Por favor, asegúrate de que esté configurada en el entorno.");
  }
  return new GoogleGenAI({ apiKey: API_KEY });
}

export async function identifyCarModel(carBase64: string, carMimeType: string): Promise<string> {
  try {
    const ai = getAiClient();
    const prompt = "Identifica la marca y el modelo del coche en esta imagen. Responde únicamente con la marca y el modelo. Por ejemplo: 'Audi R8'. No añadas texto adicional.";
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                { text: prompt },
                { inlineData: { data: carBase64, mimeType: carMimeType } },
            ],
        },
    });

    return response.text.trim();
  } catch (error) {
    console.error('Error al identificar el modelo del coche:', error);
    throw new Error('No se pudo identificar el modelo del coche.');
  }
}

export async function generateSceneFromDescription({
    description,
    backgroundBase64,
    backgroundMimeType,
    licensePlate,
    additionalInstructions
}: GenerateFromDescriptionParams): Promise<string | null> {
    try {
        const ai = getAiClient();
        const userInstructions = (additionalInstructions && additionalInstructions.trim() !== '') 
            ? `\n- **Instrucciones Adicionales del Usuario (Máxima Prioridad):** ${additionalInstructions}`
            : '';
        
        let licensePlateInstruction = 'Genera el coche sin matrícula a menos que se especifique lo contrario.';
        if (licensePlate && licensePlate.trim() !== '') {
            licensePlateInstruction = `Es absolutamente crucial que el coche generado tenga la siguiente matrícula: "${licensePlate}".`;
        }
        
        const prompt = `Tu tarea es generar desde cero una imagen fotorrealista de un coche y luego integrarlo perfectamente en la imagen de fondo proporcionada.

**Descripción del Coche a Generar:**
- **Marca:** ${description.make}
- **Modelo:** ${description.model}
- **Año:** ${description.year}
- **Color:** ${description.color}

**Reglas de Generación (Inquebrantables):**
1.  **Pose y Perspectiva:** Genera el coche en una pose "dinámica de tres cuartos frontal". La característica más importante de esta pose es que **las ruedas delanteras DEBEN estar giradas ligeramente hacia la cámara** para mostrar el diseño de la llanta. NO generes el coche con las ruedas rectas.
2.  **Composición y Escala:** El coche es el protagonista. Debe verse grande, imponente y ocupar entre el 60% y 75% del ancho de la imagen, con las ruedas firmemente plantadas en el suelo y sin que ninguna parte quede cortada.
3.  **Realismo Lumínico:** La iluminación, los reflejos y las sombras del coche deben ser un resultado directo y perfecto de la escena de fondo. El coche debe parecer que fue fotografiado en ese lugar.
4.  **Matrícula:** ${licensePlateInstruction}
${userInstructions}`;

        const parts = [
            { text: prompt },
            { inlineData: { data: backgroundBase64, mimeType: backgroundMimeType } },
        ];

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
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
        console.error('Error al generar la escena desde la descripción:', error);
        throw new Error('Error al generar el coche desde la descripción con el modelo de IA.');
    }
}


export async function generateScene(
  type: 'exterior' | 'interior',
  carBase64: string, 
  carMimeType: string, 
  backgroundBase64?: string, 
  backgroundMimeType?: string,
  backgroundFilename?: string,
  licensePlate?: string,
  isExtremeClean?: boolean,
  kilometers?: string,
  additionalInstructions?: string
): Promise<string | null> {
  try {
    const ai = getAiClient();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let prompt: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parts: any[];

    const userInstructions = (additionalInstructions && additionalInstructions.trim() !== '') 
        ? `\n- **Instrucciones Adicionales del Usuario (Máxima Prioridad):** ${additionalInstructions}`
        : '';

    if (type === 'exterior') {
      if (!backgroundBase64 || !backgroundMimeType) {
        throw new Error('Para la escena exterior se requiere una imagen de fondo.');
      }
      
      let licensePlateInstruction = 'Si no se especifica una matrícula, y la imagen de referencia del coche tiene una matrícula visible, replícala con la mayor fidelidad posible. Si no tiene matrícula o no se puede replicar, genera el coche sin matrícula.';

      if (licensePlate && licensePlate.trim() !== '') {
          licensePlateInstruction = `Es absolutamente crucial que el coche generado tenga la siguiente matrícula: "${licensePlate}". La matrícula debe ser claramente visible, estar correctamente integrada en el parachoques y ser representada con total fidelidad y fotorrealismo.`;
      }
      
      prompt = `Tu tarea es generar una imagen fotorrealista integrando un coche en un fondo.
- La primera imagen proporcionada es el fondo.
- La segunda imagen es la referencia para el coche (modelo, color, perspectiva).
Reglas cruciales:
1. **Integración Perfecta:** El coche debe parecer que realmente está en esa escena. Presta máxima atención a la iluminación, las sombras proyectadas sobre el suelo y los reflejos en la carrocería del coche, que deben corresponder con el entorno.
2. **No Recortar y Pegar:** Es fundamental que generes el coche de nuevo. No es un simple montaje. El coche debe adaptarse a la perspectiva y proporciones de la escena.
3. **Calidad Fotográfica:** El resultado final debe tener la calidad de una fotografía de alta gama.
${licensePlateInstruction}${userInstructions}`;

      parts = [
        { inlineData: { data: backgroundBase64, mimeType: backgroundMimeType } },
        { inlineData: { data: carBase64, mimeType: carMimeType } },
        { text: prompt },
      ];
    } else { // interior
      let kilometerInstruction = `4.  **Regla Especial para Cuentakilómetros:** Si la imagen es un primer plano de un cuadro de instrumentos (cuentakilómetros), es absolutamente crucial que NO AÑADAS ninguna luz de aviso o testigo que no estuviera ya encendida en la foto original. Limpia la pantalla y el plástico, pero mantén las luces de aviso y el kilometraje exactamente como están en la imagen de referencia.`;

      if (kilometers && kilometers.trim() !== '') {
          kilometerInstruction = `4.  **Regla Especial para Cuentakilómetros:** Si la imagen es un primer plano de un cuadro de instrumentos (cuentakilómetros), es OBLIGATORIO que el odómetro muestre exactamente este kilometraje: **"${kilometers} km"**. El número debe estar perfectamente integrado y ser fotorrealista. Además, es crucial que NO AÑADAS ninguna luz de aviso o testigo que no estuviera ya encendida en la foto original. Limpia el cuadro, pero renderiza el kilometraje especificado.`;
      }

      if (isExtremeClean) {
          prompt = `Tu tarea es una **reconstrucción digital EXTREMA Y RADICAL** del interior de un coche. El objetivo es que la imagen final sea fotorrealista y transmita una sensación de **limpieza absoluta y de estar recién detallado de fábrica**. Es fundamental mantener el mismo ángulo de cámara, encuadre y composición que la foto original.

Sigue estas reglas de forma OBLIGATORIA y con MÁXIMA PRIORIDAD:

1.  **Fondo de Estudio:** Reemplaza CUALQUIER vista a través de las ventanillas con un fondo de estudio profesional, liso, uniforme y de color gris muy pálido.
2.  **Eliminación Total de Desorden:** Elimina CUALQUIER objeto que no sea parte del coche (papeles, botellas, etc.).
3.  **RECONSTRUCCIÓN DE SUPERFICIES (LA REGLA MÁS IMPORTANTE):**
    *   Te doy total libertad para **recrear y reconstruir por completo** las texturas de las partes sucias, en lugar de solo limpiarlas.
    *   **Regla Absoluta para el Suelo:** Independientemente de su color o material original (tela o goma), TODAS las alfombrillas y la moqueta del suelo del vehículo DEBEN ser recreadas en un **NEGRO PROFUNDO Y UNIFORME**. La textura debe ser impecable, como si estuviera recién aspirada y completamente nueva. No conserves el color original del suelo bajo ninguna circunstancia.
    *   **Plásticos, Vinilos y Resto de Gomas:** CUALQUIER otra pieza de estos materiales (salpicadero, paneles de puerta, consolas) que se vea marrón, grisácea o descolorida por la suciedad, **DEBE ser recreada en un color NEGRO INTENSO, profundo y con acabado de fábrica.** No dudes. Si parece sucio y debería ser negro, hazlo negro.
${kilometerInstruction}

El resultado final debe ser una imagen fotorrealista de un interior que luce mejor que nuevo. La reconstrucción total de alfombrillas a negro y la restauración del resto de plásticos es la clave del éxito.${userInstructions}`;
      } else {
          prompt = `Tu tarea es realizar una restauración digital profesional de la imagen del interior de un coche. Es VITAL que mantengas el mismo ángulo de cámara, encuadre y composición de la foto original. Tu objetivo es presentar el interior en un estado impecable y listo para una revista.
Los cambios deben ser exclusivamente los siguientes:
1.  **Sustitución de Vistas Exteriores:** Borra completamente cualquier vista del exterior a través de las ventanillas y el parabrisas. Reemplaza estas áreas con un fondo de estudio profesional, completamente neutro y uniforme, de un color gris muy pálido o beige claro. El fondo debe ser liso, sin texturas, gradientes o efectos de desenfoque (bokeh).
2.  **Limpieza de Desorden:** Elimina CUALQUIER objeto que no sea parte intrínseca del coche (papeles, chalecos, botellas, ambientadores, etc.).
3.  **Limpieza Detallada:** Realiza una limpieza digital exhaustiva. Elimina todo rastro de polvo, manchas, huellas, suciedad y marcas de uso en TODAS las superficies (salpicadero, asientos, volante, alfombrillas, etc.). Los materiales deben lucir como nuevos, pero conservando su textura y forma original.
${kilometerInstruction}
El resultado final debe ser una imagen fotorrealista del mismo interior, pero en un estado de limpieza y conservación perfecto.${userInstructions}`;
      }
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