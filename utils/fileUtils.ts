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