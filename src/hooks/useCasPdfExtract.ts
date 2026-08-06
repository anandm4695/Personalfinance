import { useCallback, useState } from "react";
import { extractPdfText, PdfPasswordRequiredError } from "../utils/pdfText";

/**
 * Shared PDF-upload -> text-extraction flow for the CAS importers. Handles the
 * password-protected-PDF round trip (CAMS/KFintech CAS PDFs are typically PAN-password
 * protected): select a file, try to extract, and if pdf.js reports it's encrypted, park
 * the file and let the caller collect a password via `submitPassword`.
 */
export function useCasPdfExtract(onExtracted: (text: string) => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [passwordIncorrect, setPasswordIncorrect] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const run = useCallback(
    async (file: File, password?: string) => {
      setBusy(true);
      setError("");
      try {
        const text = await extractPdfText(file, password);
        setBusy(false);
        setNeedsPassword(false);
        setPasswordIncorrect(false);
        setPendingFile(null);
        if (!text.trim()) {
          setError(
            "No readable text found in that PDF — it may be a scanned image rather than a digital statement."
          );
          return;
        }
        onExtracted(text);
      } catch (e: any) {
        setBusy(false);
        if (e instanceof PdfPasswordRequiredError) {
          setNeedsPassword(true);
          setPasswordIncorrect(e.incorrect);
          setPendingFile(file);
        } else {
          setError(e?.message || "Could not read that PDF.");
          setNeedsPassword(false);
          setPendingFile(null);
        }
      }
    },
    [onExtracted]
  );

  const selectFile = useCallback(
    (file: File) => {
      setFileName(file.name);
      setError("");
      run(file);
    },
    [run]
  );

  const submitPassword = useCallback(
    (password: string) => {
      if (pendingFile) run(pendingFile, password);
    },
    [pendingFile, run]
  );

  const cancelPassword = useCallback(() => {
    setNeedsPassword(false);
    setPasswordIncorrect(false);
    setPendingFile(null);
    setFileName("");
  }, []);

  return {
    busy,
    error,
    setError,
    fileName,
    needsPassword,
    passwordIncorrect,
    selectFile,
    submitPassword,
    cancelPassword,
  };
}
