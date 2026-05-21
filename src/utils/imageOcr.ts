import * as FileSystem from "expo-file-system/legacy";
import Tesseract from "tesseract.js";

export type OcrProgress = (percent: number) => void;

/** OCR from image URI (Tamil + English, same languages as web Transaction.js). */
export async function extractTextFromImageUri(
  uri: string,
  onProgress?: OcrProgress
): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const dataUrl = `data:image/jpeg;base64,${base64}`;

  const tamResult = await Tesseract.recognize(dataUrl, "tam+eng", {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) {
        onProgress(Math.floor(m.progress * 50));
      }
    },
  });

  const engResult = await Tesseract.recognize(dataUrl, "eng", {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) {
        onProgress(50 + Math.floor(m.progress * 50));
      }
    },
  });

  return `${tamResult.data.text}\n${engResult.data.text}`;
}
