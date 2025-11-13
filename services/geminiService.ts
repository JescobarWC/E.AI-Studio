// FIX: Corrected file content by removing XML wrapper that was causing parsing errors.
import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface CarDescription {
  make: string;
  model: string;
  year: string;
  color: string;
}

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
  carViewPerspective?: 'front' | 'side' | 'rear';
  interiorViewType?: 'general' | 'detail';
  onProgress?: (message: string) => void;
}

interface GenerateSceneFromDescriptionParams {
    description: CarDescription;
    backgroundImageBase64: string;
    backgroundMimeType: string;
    licensePlate: string;
    additionalInstructions: string;
    carViewPerspective: 'front' | 'side' | 'rear';
}

const findImagePart = (response: GenerateContentResponse): string => {
    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) {
        return imagePart.inlineData.data;
    }
    throw new Error('La respuesta del modelo de imagen no contenía datos de imagen.');
};

export async function generateScene({
  sceneType,
  carImageBase64,
  carMimeType,
  backgroundImageBase64,
  backgroundMimeType,
  licensePlate,
  isExtremeClean,
  kilometers,
  additionalInstructions,
  carViewPerspective,
  interiorViewType,
  onProgress = () => {},
}: GenerateSceneParams): Promise<{ generatedImageBase64: string; identifiedModel: string; }> {
  
  const carPart = {
    inlineData: {
      mimeType: carMimeType,
      data: carImageBase64,
    },
  };

  if (sceneType === 'exterior') {
      onProgress('Analizando detalles únicos del vehículo...');

      if (!backgroundImageBase64 || !backgroundMimeType || !carViewPerspective || licensePlate === undefined || additionalInstructions === undefined) {
          throw new Error("Faltan parámetros para la generación de la escena exterior.");
      }
      
      const backgroundPart = {
        inlineData: {
            data: backgroundImageBase64,
            mimeType: backgroundMimeType,
        },
      };

      // PASO 1: Análisis detallado del coche para extraer características en formato JSON.
      const analysisModel = 'gemini-2.5-pro';
      const analysisPrompt = `
      Analiza la imagen del coche y extrae sus características visuales con extremo detalle para que un artista CGI pueda recrearlo a la perfección.
      Tu respuesta DEBE ser un objeto JSON con la siguiente estructura:
      {
        "make": "Marca del coche",
        "model": "Modelo del coche",
        "year": "Año aproximado de fabricación",
        "color": "Color principal de la carrocería",
        "uniqueDetails": [
          "Lista de detalles únicos y específicos. Ej: 'Retrovisores de color blanco'",
          "Ej: 'Llantas de aleación de 5 radios dobles en dos tonos (plata y negro)'",
          "Ej: 'Anagrama floral de color blanco en el pilar C'"
        ]
      }
      Si no puedes identificar alguna característica, déjala como una cadena vacía. Sé muy específico con los detalles únicos.`;
      
      const analysisResponse = await ai.models.generateContent({
        model: analysisModel,
        contents: { parts: [carPart, { text: analysisPrompt }] },
      });

      let carDetails: CarDescription & { uniqueDetails: string[] } = {
          make: '', model: '', year: '', color: '', uniqueDetails: []
      };
      let identifiedModel = 'Vehículo no identificado';

      try {
          const jsonText = analysisResponse.text.replace(/```json|```/g, '').trim();
          const parsedJson = JSON.parse(jsonText);
          carDetails = { ...carDetails, ...parsedJson };
          if (carDetails.make && carDetails.model) {
              identifiedModel = `${carDetails.make} ${carDetails.model} ${carDetails.year}`.trim();
          }
      } catch (e) {
          console.error("Error al analizar los detalles del coche (JSON):", e);
          throw new Error('No se pudieron analizar los detalles únicos del vehículo. Inténtalo con otra imagen.');
      }

      onProgress('Generando escena fotorrealista...');

      // PASO 2: Generar la imagen usando la descripción de texto, sin la imagen original del coche.
      let perspectiveText = '';
      if (carViewPerspective === 'front') {
          perspectiveText = 'una pose dinámica de tres cuartos frontal, mostrando el lado del copiloto (apuntando hacia la izquierda de la imagen), con las ruedas delanteras ligeramente giradas para mostrar la llanta';
      } else if (carViewPerspective === 'side') {
          perspectiveText = 'una vista de perfil lateral estricta, llenando el encuadre para que el coche se vea grande y dominante en la imagen.';
      } else { // rear
          perspectiveText = `una **toma de tres cuartos trasera (mostrando más el lateral que la parte trasera directa)**. El ángulo de la cámara debe ser **bajo y dramático** para que el coche parezca **dominante y poderoso**, llenando la mayor parte del encuadre. El resultado debe ser una imagen imponente.`;
      }

      const generationPrompt = `
      Eres un director de fotografía y artista CGI para un concesionario de coches de lujo llamado "World Cars".
      Tu misión es crear la foto de anuncio "heroica" y definitiva a partir de una descripción detallada y una imagen de fondo (IMAGEN 1).

      **DESCRIPCIÓN DEL COCHE A GENERAR:**
      -   **Vehículo**: ${carDetails.make} ${carDetails.model} (${carDetails.year})
      -   **Color**: ${carDetails.color}
      -   **DETALLES ÚNICOS A REPLICAR CON MÁXIMA PRECISIÓN**: ${carDetails.uniqueDetails.length > 0 ? carDetails.uniqueDetails.join(', ') : 'Ninguno especificado, usar la versión de serie.'}

      **REGLAS CRÍTICAS DE COMPOSICIÓN Y REALISMO:**
      1.  **Generación Precisa**: Genera el coche descrito con el máximo nivel de fotorrealismo. El modelo, año, color y **TODOS los detalles únicos** deben ser precisos. El coche debe estar en un estado impecable y perfecto.
      2.  **Análisis del Fondo (IMAGEN 1)**: Antes de colocar el coche, analiza la composición de la IMAGEN 1. Identifica la superficie del suelo, la perspectiva y si existe una **plataforma giratoria**.
      3.  **Posicionamiento (MÁXIMA PRIORIDAD)**:
          -   El coche debe estar **firmemente plantado en el suelo** de la IMAGEN 1.
          -   **Si identificas una plataforma giratoria, es absolutamente crucial que las CUATRO RUEDAS del coche se sitúen DENTRO de los límites de dicha plataforma.**
          -   La iluminación, las sombras y los reflejos del coche deben coincidir perfectamente con la luz ambiental de la IMAGEN 1.
      4.  **Perspectiva y Encuadre**: La perspectiva del coche debe ser de **${perspectiveText}**. El ángulo de la cámara debe ser un ligero contrapicado para que el coche parezca **grande, imponente y heroico**.
      5.  **Matrícula/Logo**: ${licensePlate ? `Añade al coche una matrícula con el texto: "${licensePlate}". La matrícula debe tener un diseño europeo estándar (banda azul a la izquierda) sobre un portamatrículas negro.` : `El coche no debe tener matrícula. En su lugar, el portamatrículas debe ser negro y mostrar el logo 'WORLDCARS'. Este logo consiste en la palabra 'WORLDCARS' en un gradiente de amarillo a naranja, con una silueta de coche por encima y un globo terráqueo estilizado dentro de la 'O'.`}
      6.  **Instrucciones Adicionales**: ${additionalInstructions || 'El resultado final debe ser una foto de anuncio premium, con una calidad visual espectacular.'}

      Genera la imagen final.`;

      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
              parts: [
                  backgroundPart, // Solo la imagen de fondo
                  { text: generationPrompt },
              ],
          },
          config: {
              responseModalities: [Modality.IMAGE],
          },
      });
      const generatedImageBase64 = findImagePart(response);

      return { generatedImageBase64, identifiedModel };

  } else { // Interior
    onProgress('Identificando modelo de coche...');

    const modelIdentificationModel = 'gemini-2.5-pro';
    const modelPrompt = 'Identifica la marca, modelo y año del coche en la imagen. Responde solo con MARCA MODELO AÑO. Por ejemplo: "Volkswagen Golf 2022". Si no puedes identificarlo con certeza, responde "Vehículo no identificado".';
    
    const modelResponse = await ai.models.generateContent({
        model: modelIdentificationModel,
        contents: { parts: [carPart, { text: modelPrompt }] },
    });
    
    const identifiedModel = modelResponse.text?.trim() ?? 'Vehículo no identificado';

    onProgress('Limpiando el interior del vehículo...');

    let interiorPrompt: string;

    if (interiorViewType === 'detail') {
        interiorPrompt = `
Eres un retocador digital de élite, especializado en fotografía de producto para catálogos de coches de lujo.
Tu tarea es analizar y perfeccionar esta **FOTO DE DETALLE** del interior de un coche.

Reglas Inquebrantables:
1.  **ENCUADRE FIJO (MÁXIMA PRIORIDAD):** Es un error crítico si alteras el encuadre. **NO PUEDES** inventar, generar o añadir ninguna parte del coche que no sea visible en la foto original. Tu trabajo se limita exclusivamente a lo que se ve en la imagen.
2.  **RE-ILUMINACIÓN DE ESTUDIO**: IGNORA la iluminación original. RE-ILUMINA el detalle desde cero con una luz de estudio suave, difusa y profesional que resalte las texturas y la calidad de los materiales.
3.  **LIMPIEZA Y RESTAURACIÓN**: Limpia cada superficie visible a la perfección. ${isExtremeClean ? `Restaura plásticos y gomas a un negro profundo y elimina cualquier signo de desgaste.` : ''}
4.  **PANTALLAS VIBRANTES**: Si hay pantallas (cuentakilómetros, infotainment), haz que se vean nítidas, con colores vibrantes y un brillo atractivo.
5.  **VISTAS EXTERIORES**: Reemplaza cualquier vista del exterior a través de las ventanillas con un fondo de estudio gris suave y neutro.
${kilometers ? `6.  **CUENTAKILÓMETROS**: Ajusta el cuentakilómetros para que muestre exactamente "${kilometers} km".` : ''}
7.  **Instrucciones Adicionales**: ${additionalInstructions || 'El resultado debe ser una imagen de detalle súper atractiva y de alta calidad.'}

Genera la imagen del detalle del interior.`;
    } else { // general view
        interiorPrompt = `
Eres un experto en detallado de coches para un concesionario premium.
Tu tarea es limpiar y rejuvenecer el interior del coche de la imagen.

Reglas:
1.  **Iluminación de Estudio (Prioridad #1)**: IGNORA por completo la iluminación original de la foto. **RE-ILUMINA todo el interior desde cero** con una iluminación de estudio fotográfico profesional. La luz debe ser suave, difusa y uniforme, sin sombras duras ni reflejos extraños. El objetivo es que el interior se vea premium y lujoso, resaltando la calidad de los materiales.
2.  **Limpieza Profunda**: Realiza una limpieza exhaustiva. Elimina cualquier suciedad, mancha, polvo o desorden. Deja todas las superficies (salpicadero, asientos, alfombrillas, puertas) impecables, como si el coche fuera nuevo.
${isExtremeClean ? '3. **Limpieza Extrema con RESTAURACIÓN PROFUNDA**: Además de una limpieza impecable, debes restaurar los materiales a su estado de fábrica. Presta especial atención a los plásticos, gomas y molduras. Aquellas partes que se vean desgastadas, descoloridas o que hayan adquirido tonos marrones por el sol, deben ser restauradas a su color negro o gris oscuro original y profundo, con un acabado satinado de coche nuevo.' : ''}
4.  **Vistas Exteriores (Importante)**: Reemplaza CUALQUIER vista del exterior que se vea a través de las ventanillas, parabrisas o luneta trasera con un fondo de estudio de un gris suave y neutro. El objetivo es aislar el interior y eliminar cualquier distracción del exterior.
5.  **Mantener Originalidad**: No cambies el color, los materiales ni el diseño del interior. El objetivo es limpiar y restaurar, no modificar.
${kilometers ? `6.  **Cuentakilómetros**: Si es visible el cuadro de instrumentos, ajusta el cuentakilómetros para que muestre exactamente "${kilometers} km". Si no es visible, ignora esta instrucción.` : ''}
7.  **Instrucciones Adicionales**: ${additionalInstructions || 'El resultado final debe ser una imagen que haga que el interior parezca espacioso, limpio y muy atractivo.'}

Genera la imagen del interior limpio y detallado.`;
    }

    const imageGenerationModel = 'gemini-2.5-flash-image';
    const response = await ai.models.generateContent({
        model: imageGenerationModel,
        contents: {
            parts: [
                carPart,
                { text: interiorPrompt },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    const generatedImageBase64 = findImagePart(response);
    return { generatedImageBase64, identifiedModel };
  }
}


export async function generateSceneFromDescription({
    description,
    backgroundImageBase64,
    backgroundMimeType,
    licensePlate,
    additionalInstructions,
    carViewPerspective,
}: GenerateSceneFromDescriptionParams): Promise<string> {

    const backgroundPart = {
        inlineData: {
            data: backgroundImageBase64,
            mimeType: backgroundMimeType,
        },
    };

    let perspectiveText = '';
    if (carViewPerspective === 'front') {
        perspectiveText = 'una pose dinámica de tres cuartos frontal, mostrando el lado del copiloto (apuntando hacia la izquierda de la imagen), con las ruedas delanteras ligeramente giradas para mostrar la llanta';
    } else if (carViewPerspective === 'side') {
        perspectiveText = 'una vista de perfil lateral estricta, llenando el encuadre para que el coche se vea grande y dominante en la imagen.';
    } else { // rear
        perspectiveText = `una **toma de tres cuartos trasera (mostrando más el lateral que la parte trasera directa)**. El ángulo de la cámara debe ser **bajo y dramático** para que el coche parezca **dominante y poderoso**, llenando la mayor parte del encuadre. El resultado debe ser una imagen imponente.`;
    }

    const carGenPrompt = `
Eres un director de fotografía y artista CGI para un concesionario de coches de lujo llamado "World Cars".
Tu misión es crear la foto de anuncio "heroica" y definitiva. La imagen debe hacer que el cliente desee subirse al coche.

Descripción del Coche a Generar:
-   **Marca**: ${description.make}
-   **Modelo**: ${description.model}
-   **Año**: ${description.year}
-   **Color**: ${description.color}

Reglas Inquebrantables:
1.  **Plano y Composición (Máxima Prioridad)**: La toma debe ser un **plano cercano con un ligero contrapicado**. Este ángulo es esencial para que el coche parezca **grande, imponente y heroico**. El coche debe estar perfectamente plantado en el suelo.
2.  **Generación Realista**: Genera el coche descrito con el máximo nivel de fotorrealismo. El modelo, año y color deben ser precisos. El coche debe estar en un estado impecable y perfecto.
3.  **Perspectiva**: La perspectiva del coche generado debe ser de ${perspectiveText}.
4.  **Matrícula/Logo**: ${licensePlate ? `Añade al coche una matrícula con el texto: "${licensePlate}". La matrícula debe tener un diseño europeo estándar (banda azul a la izquierda) sobre un portamatrículas negro.` : `El coche no debe tener matrícula. En su lugar, el portamatrículas debe ser negro y mostrar el logo 'WORLDCARS'. Este logo consiste en la palabra 'WORLDCARS' en un gradiente de amarillo a naranja, con una silueta de coche por encima y un globo terráqueo estilizado dentro de la 'O'.`}
5.  **Instrucciones Adicionales**: ${additionalInstructions || 'El resultado final debe ser una foto de anuncio premium, con una calidad visual espectacular.'}

Genera la imagen final con estas directrices.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                backgroundPart,
                { text: carGenPrompt },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    return findImagePart(response);
}