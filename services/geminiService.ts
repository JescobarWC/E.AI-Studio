import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Identifies the car model from an image.
 */
export const identifyCarModel = async (
  carImageBase64: string,
  mimeType: string
): Promise<string> => {
  const model = 'gemini-2.5-flash';
  const prompt = 'Identifica la marca y el modelo exactos del coche en esta imagen. Responde únicamente con la marca y el modelo. Por ejemplo: "Audi A3" o "BMW Serie 3".';

  const imagePart = { inlineData: { data: carImageBase64, mimeType } };
  const textPart = { text: prompt };

  const response = await ai.models.generateContent({
    model: model,
    contents: { parts: [imagePart, textPart] },
  });

  return response.text.trim().replace(/[\n*]/g, '');
};

/**
 * Generates a photorealistic scene for a car.
 */
export const generateScene = async (
  sceneType: 'exterior' | 'interior',
  carImageBase64: string,
  carMimeType: string,
  backgroundImageBase64?: string,
  backgroundMimeType?: string,
  licensePlate?: string,
  isExtremeClean?: boolean,
  kilometers?: string,
  additionalInstructions?: string,
  makeBigger?: boolean
): Promise<string> => {
  const model = 'gemini-2.5-flash-image';
  const parts: ({ text: string; } | { inlineData: { data: string; mimeType: string; }; })[] = [];
  let prompt = '';

  if (sceneType === 'exterior') {
    if (!backgroundImageBase64 || !backgroundMimeType) {
      throw new Error('Background image is required for exterior scenes.');
    }

    parts.push({ inlineData: { data: backgroundImageBase64, mimeType: backgroundMimeType } });
    parts.push({ inlineData: { data: carImageBase64, mimeType: carMimeType } });

    if (makeBigger) {
       prompt = `
        Vuelve a generar la escena anterior, pero con una modificación clave:
        REGLA DE AJUSTE (MÁXIMA PRIORIDAD): Es OBLIGATORIO que el coche sea aproximadamente un 10-15% MÁS GRANDE de lo que era en el intento anterior.
        Recuerda la regla de la pose: las ruedas delanteras DEBEN estar giradas hacia la cámara.
      `;
    } else {
       prompt = `
        Tu objetivo es actuar como un fotógrafo de coches profesional creando la imagen final.
        Te he dado dos imágenes: la primera es la escena de fondo, la segunda es una imagen de referencia del coche.
        Tu tarea es generar una NUEVA imagen fotorrealista. Sigue estas reglas maestras:

        1.  **SUJETO:** Usa la imagen de referencia del coche para identificar el modelo exacto, el color, las llantas y los detalles. El coche en tu imagen final DEBE ser idéntico a ese.

        2.  **ESCENA:** Coloca ese coche en la escena de fondo que te he proporcionado.

        3.  **POSE (REGLA OBLIGATORIA E INVIOLABLE):** No copies la pose de la imagen de referencia. En tu nueva imagen generada, el coche DEBE tener una 'pose dinámica de tres cuartos'. Esto significa que las **ruedas delanteras DEBEN estar giradas ligeramente hacia la cámara** para mostrar el diseño de la llanta y crear una sensación de dinamismo. La carrocería del coche debe mantener la misma perspectiva general que la imagen de referencia (no cambies el ángulo de la cámara).

        4.  **REALISMO Y CALIDAD:** Usa todo tu poder creativo para la iluminación, sombras proyectadas en el suelo y reflejos sobre la carrocería. La integración debe ser perfecta y fotorrealista.

        5.  **ENCUADRE COMERCIAL:** El coche debe ser el protagonista claro de la imagen, ocupando una porción significativa del encuadre para un look de alto impacto, como en una fotografía de catálogo.
      `;
    }

    if (licensePlate) {
      prompt += ` Adicionalmente, si es visible, la matrícula debe ser "${licensePlate}".`;
    }

  } else { // interior
    parts.push({ inlineData: { data: carImageBase64, mimeType: carMimeType } });

    prompt = 'Modifica la imagen del interior de este coche. El resultado debe ser fotorrealista.';
    if (isExtremeClean) {
      prompt += ' Realiza una "limpieza extrema", dejando el interior impecable, como si fuera de fábrica. Elimina toda la suciedad, manchas, polvo y signos de desgaste.';
    }
    if (kilometers) {
      prompt += ` Muestra claramente el kilometraje en el odómetro del cuadro de instrumentos como "${kilometers} km".`;
    }
  }

  if (additionalInstructions) {
    prompt += ` El usuario ha añadido esta instrucción especial: "${additionalInstructions}".`;
  }

  parts.push({ text: prompt });

  const response = await ai.models.generateContent({
    model: model,
    contents: { parts: parts },
    config: {
      responseModalities: [Modality.IMAGE],
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return part.inlineData.data;
    }
  }

  throw new Error('El modelo no devolvió una imagen.');
};
