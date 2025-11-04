import { GoogleGenAI, Modality } from "@google/genai";
import { worldcarsLogo } from '../assets/worldcarsLogo';

// Initialize the Google Gemini AI client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Describes the properties of a car for generation.
 */
export interface CarDescription {
  make: string;
  model: string;
  year: string;
  color: string;
}

type CarViewPerspective = 'front' | 'side' | 'rear';

/**
 * Analyzes a car image and returns a detailed textual description.
 * @param carImageBase64 The base64 encoded string of the car image.
 * @param mimeType The MIME type of the car image.
 * @returns A promise that resolves to a detailed description of the car.
 */
const _getCarDetailsFromImage = async (carImageBase64: string, mimeType: string): Promise<string> => {
    const model = 'gemini-2.5-flash';
    const imagePart = { inlineData: { data: carImageBase64, mimeType } };
    const textPart = {
        text: `Analiza este coche y proporciona una descripción detallada para un artista de CGI. Incluye: marca, modelo exacto, año de fabricación aproximado, color específico (ej. 'Blanco Nacarado', 'Gris Pirineos Metalizado'), tipo de llantas, y cualquier característica visible distintiva (ej. 'techo solar panorámico', 'barras de techo negras'). Responde de forma concisa en una sola línea.`,
    };

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: { parts: [imagePart, textPart] },
        });
        const text = response.text;
        if (!text) throw new Error('El modelo de análisis no devolvió texto.');
        return text.trim();
    } catch (error) {
        console.error("Error getting car details:", error);
        throw new Error("Error al analizar los detalles del coche.");
    }
};

const _createExteriorPromptFromImageAndBackground = (
    carDetails: string,
    carViewPerspective: CarViewPerspective,
    licensePlate?: string,
    additionalInstructions?: string
): string => {
    let prompt = `**TU MISIÓN:** Eres un fotógrafo y artista CGI de élite. Tu trabajo es RECREAR una FOTOGRAFÍA COMPLETAMENTE NUEVA.

**LAS REFERENCIAS:**
- **IMAGEN 1 (Sujeto):** Es el coche que debes recrear. Analizado como: **${carDetails}**.
- **IMAGEN 2 (Escena):** Es la localización donde debes colocar el coche.

**REGLAS DE EJECUCIÓN (INQUEBRANTABLES):**
1. **MÉTODO: RECREACIÓN, NO EDICIÓN:** NO te limites a recortar y pegar el Sujeto. Debes **REGENERARLO COMPLETAMENTE DESDE CERO** dentro de la Escena. La Imagen 1 es solo una referencia visual de qué coche es; ignora por completo su pose, iluminación y fondo originales.
2. **LA POSE ES TODO (PRIORIDAD #1):** `;

    switch (carViewPerspective) {
        case 'front':
            prompt += `La pose final DEBE ser una "pose dinámica de tres cuartos frontal", mostrando el lado del conductor. La característica más importante de esta pose es que las ruedas delanteras DEBEN estar giradas ligeramente hacia la cámara para mostrar el diseño de la llanta. No generes el coche con las ruedas rectas.`;
            break;
        case 'side':
            prompt += `La pose final DEBE ser una vista de perfil lateral perfecta del coche.`;
            break;
        case 'rear':
            prompt += `La pose final DEBE ser una "pose dinámica de tres cuartos trasera", mostrando la parte trasera y el lateral del coche.`;
            break;
    }

    prompt += `
3. **COMPOSICIÓN Y ESCALA (MÁXIMA PRIORIDAD):** El coche es la estrella. Debe verse grande, imponente y ocupar una porción significativa del encuadre. El coche debe ser alto en el plano. Como referencia visual clave, el techo del coche debe posicionarse casi tocando el final superior de las barras de luz LED verticales del fondo del estudio. Debe estar completamente dentro del encuadre, con las ruedas firmemente plantadas en el suelo.
4. **LA LUZ ES LA ÚNICA VERDAD:** El coche debe ser RE-ILUMINADO DESDE CERO, usando exclusivamente las luces de la Escena. Los reflejos en la carrocería deben mostrar el entorno. Las sombras deben ser perfectas y realistas.
5. **REALISMO FOTOGRÁFICO:** El resultado debe ser indistinguible de una fotografía real de alta gama. Presta atención a cada detalle: texturas de los materiales, reflejos en los cristales, el brillo de la pintura, etc.
`;

    if (licensePlate) {
        prompt += `\n6. **MATRÍCULA:** El coche debe llevar la matrícula "${licensePlate}".`;
    }

    if (additionalInstructions) {
        prompt += `\n7. **INSTRUCCIONES ADICIONALES DEL USUARIO:** ${additionalInstructions}`;
    }

    return prompt;
};


interface GenerateSceneParams {
    sceneType: 'exterior' | 'interior';
    carImageBase64: string;
    carMimeType: string;
    backgroundImageBase64?: string;
    backgroundMimeType?: string;
    licensePlate?: string;
    isExtremeClean?: boolean;
    kilometers?: string;
    additionalInstructions?: string;
    carViewPerspective?: CarViewPerspective;
    onProgress?: (message: string) => void;
}
/**
 * Generates a scene with a car.
 */
export const generateScene = async (params: GenerateSceneParams): Promise<{ generatedImageBase64: string, identifiedModel: string }> => {
    const {
        sceneType, carImageBase64, carMimeType, backgroundImageBase64, backgroundMimeType,
        licensePlate, isExtremeClean, kilometers, additionalInstructions, carViewPerspective, onProgress
    } = params;

    const imageModel = 'gemini-2.5-flash-image';

    if (sceneType === 'exterior') {
        if (!backgroundImageBase64 || !backgroundMimeType || !carViewPerspective) {
            throw new Error('Para escenas exteriores se requiere fondo y perspectiva.');
        }

        onProgress?.('Analizando el coche de referencia...');
        const carDetails = await _getCarDetailsFromImage(carImageBase64, carMimeType);
        
        onProgress?.('Generando el coche desde cero en la nueva escena...');
        const prompt = _createExteriorPromptFromImageAndBackground(carDetails, carViewPerspective, licensePlate, additionalInstructions);
        
        const carImagePart = { inlineData: { data: carImageBase64, mimeType: carMimeType } };
        const backgroundImagePart = { inlineData: { data: backgroundImageBase64, mimeType: backgroundMimeType } };
        
        // The model expects the subject, then the scene/context.
        const parts = [carImagePart, backgroundImagePart, { text: prompt }];

        try {
            const response = await ai.models.generateContent({
                model: imageModel,
                contents: { parts },
                config: { responseModalities: [Modality.IMAGE] },
            });
            const firstPart = response.candidates?.[0]?.content?.parts?.[0];
            if (firstPart?.inlineData) {
                return { generatedImageBase64: firstPart.inlineData.data, identifiedModel: carDetails };
            }
            throw new Error('La respuesta del modelo de imagen no contenía datos de imagen.');
        } catch (error) {
            console.error("Error generating exterior scene from images:", error);
            if (error instanceof Error && error.message.includes('SAFETY')) {
                 throw new Error("La generación de la imagen fue bloqueada por filtros de seguridad. Intenta con otra imagen o prompt.");
            }
            throw new Error("Error al comunicarse con la IA para generar la escena exterior.");
        }
    } else { // Interior
        onProgress?.('Mejorando la escena interior...');
        const carImagePart = { inlineData: { data: carImageBase64, mimeType: carMimeType } };
        let prompt = `Esta es una foto del interior de un coche. Necesito que generes una nueva imagen del mismo interior pero mejorada y fotorrealista.`;
        if (isExtremeClean) {
            prompt += ` El interior debe estar extremadamente limpio, como si acabara de salir de un detallado profesional. Sin polvo, sin manchas, todo impecable.`;
        } else {
            prompt += ` El interior debe verse limpio y en excelentes condiciones.`;
        }
        if (kilometers) {
            prompt += ` El odómetro en el panel de instrumentos debe mostrar aproximadamente "${kilometers}" kilómetros.`;
        }
        if (additionalInstructions) {
            prompt += ` Instrucciones adicionales: ${additionalInstructions}`;
        }
        
        const parts = [carImagePart, { text: prompt }];

        try {
            const response = await ai.models.generateContent({
                model: imageModel,
                contents: { parts },
                config: { responseModalities: [Modality.IMAGE] },
            });
            const firstPart = response.candidates?.[0]?.content?.parts?.[0];
            if (firstPart?.inlineData) {
                // For interior, model identification is less critical, we can return a generic name.
                return { generatedImageBase64: firstPart.inlineData.data, identifiedModel: 'Interior de coche' };
            }
            throw new Error('La respuesta del modelo no contenía una imagen.');
        } catch(error) {
            console.error("Error generating interior scene:", error);
            throw new Error("Error al comunicarse con la IA para generar la escena interior.");
        }
    }
};

const _createExteriorPromptFromText = (
    carDetails: string,
    carViewPerspective: CarViewPerspective,
    licensePlate?: string,
    additionalInstructions?: string
): string => {
    let prompt = `**TU MISIÓN:** Eres un fotógrafo y artista CGI de élite. Tu trabajo es crear una FOTOGRAFÍA COMPLETAMENTE NUEVA DESDE CERO.

**EL COCHE A CREAR (DESCRIPCIÓN):** ${carDetails}.

**LA ESCENA:** La imagen de fondo proporcionada.

**REGLAS DE EJECUCIÓN (INQUEBRANTABLES):**
1. **CREACIÓN DESDE CERO:** NO tienes acceso a ninguna foto original del coche. DEBES GENERARLO DESDE CERO basándote únicamente en la descripción textual.
2. **LA POSE ES TODO (PRIORIDAD #1):** `;

    switch (carViewPerspective) {
        case 'front':
            prompt += `La pose final DEBE ser una "pose dinámica de tres cuartos frontal", mostrando el lado del conductor. La característica más importante de esta pose es que las ruedas delanteras DEBEN estar giradas ligeramente hacia la cámara para mostrar el diseño de la llanta. No generes el coche con las ruedas rectas.`;
            break;
        case 'side':
            prompt += `La pose final DEBE ser una vista de perfil lateral perfecta del coche.`;
            break;
        case 'rear':
            prompt += `La pose final DEBE ser una "pose dinámica de tres cuartos trasera", mostrando la parte trasera y el lateral del coche.`;
            break;
    }

    prompt += `
3. **COMPOSICIÓN Y ESCALA (MÁXIMA PRIORIDAD):** El coche es la estrella. Debe verse grande, imponente y ocupar una porción significativa del encuadre. El coche debe ser alto en el plano. Como referencia visual clave, el techo del coche debe posicionarse casi tocando el final superior de las barras de luz LED verticales del fondo del estudio. Debe estar completamente dentro del encuadre, con las ruedas firmemente plantadas en el suelo.
4. **LA LUZ ES LA ÚNICA VERDAD:** El coche debe ser RE-ILUMINADO DESDE CERO, usando exclusivamente las luces de la imagen de fondo. IGNORA cualquier iluminación que pudieras inferir de la descripción. Los reflejos en la carrocería deben mostrar el entorno. Las sombras deben ser perfectas y realistas.
5. **REALISMO FOTOGRÁFICO:** El resultado debe ser indistinguible de una fotografía real de alta gama. Presta atención a cada detalle: texturas de los materiales, reflejos en los cristales, el brillo de la pintura, etc.
`;

    if (licensePlate) {
        prompt += `\n6. **MATRÍCULA:** El coche debe llevar la matrícula "${licensePlate}".`;
    }

    if (additionalInstructions) {
        prompt += `\n7. **INSTRUCCIONES ADICIONALES DEL USUARIO:** ${additionalInstructions}`;
    }

    return prompt;
};


interface GenerateSceneFromDescriptionParams {
    description: CarDescription;
    backgroundBase64: string;
    backgroundMimeType: string;
    licensePlate?: string;
    additionalInstructions?: string;
    carViewPerspective: CarViewPerspective;
}

/**
 * Generates a car scene from a text description and a background image.
 */
export const generateSceneFromDescription = async ({
    description,
    backgroundBase64,
    backgroundMimeType,
    licensePlate,
    additionalInstructions,
    carViewPerspective,
}: GenerateSceneFromDescriptionParams): Promise<string> => {
    const carDetails = [description.make, description.model, description.year, description.color].filter(Boolean).join(' ');
    const prompt = _createExteriorPromptFromText(carDetails, carViewPerspective, licensePlate, additionalInstructions);

    const backgroundImagePart = { inlineData: { data: backgroundBase64, mimeType: backgroundMimeType } };
    
    // Add logo for license plate
    const logoImagePart = { inlineData: { data: worldcarsLogo.base64, mimeType: worldcarsLogo.mimeType } };

    const promptWithLogo = `${prompt}
    8. **PORTAMATRÍCULAS:** Genera un portamatrículas negro y coloca el logo de la tercera imagen proporcionada en él.`;

    const parts = [backgroundImagePart, { text: promptWithLogo }, logoImagePart];

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
            config: { responseModalities: [Modality.IMAGE] },
        });
        const firstPart = response.candidates?.[0]?.content?.parts?.[0];
        if (firstPart?.inlineData) {
            return firstPart.inlineData.data;
        }
        throw new Error('La respuesta del modelo no contenía una imagen.');
    } catch(error) {
        console.error("Error generating scene from description:", error);
        throw new Error("Error al comunicarse con la IA para generar la escena a partir de la descripción.");
    }
};