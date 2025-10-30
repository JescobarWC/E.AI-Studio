export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // el resultado es "data:mime/type;base64,xxxxxxxx"
        // necesitamos quitar el prefijo para la API de Gemini
        resolve(reader.result.split(',')[1]);
      } else {
        reject(new Error('Error al leer el archivo como cadena base64.'));
      }
    };
    reader.onerror = (error) => reject(error);
  });
}

export async function urlToBase64(url: string): Promise<{ base64: string; mimeType: string; }> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error al obtener la imagen: ${response.status} ${response.statusText}`);
    }
    const blob = await response.blob();
    
    // Validar si el blob es realmente una imagen
    if (!blob.type.startsWith('image/')) {
        throw new Error('La URL no apunta a un tipo de imagen válido.');
    }
    
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve({
                    base64: reader.result.split(',')[1],
                    mimeType: blob.type
                });
            } else {
                reject(new Error('No se pudo convertir la imagen de la URL a base64.'));
            }
        };
        reader.onerror = (error) => reject(error);
    });
  } catch(error) {
      console.error("Error en urlToBase64:", error);
      if (error instanceof TypeError && error.message === "Failed to fetch") {
          throw new Error("No se pudo obtener la imagen. Esto puede deberse a un problema de red o a restricciones de CORS en el sitio de origen de la imagen.");
      }
      throw error;
  }
}
