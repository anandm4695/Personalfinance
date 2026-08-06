// Client-side PDF -> text extraction for CAS (Consolidated Account Statement) imports.
// Uses pdfjs-dist entirely in the browser — the PDF never leaves the device.

/** Thrown when a PDF is encrypted. `incorrect` distinguishes "needs a password"
 * from "the password just tried was wrong" so the UI can show the right copy. */
export class PdfPasswordRequiredError extends Error {
  incorrect: boolean;
  constructor(incorrect = false) {
    super(incorrect ? "Incorrect password." : "This PDF is password-protected.");
    this.name = "PdfPasswordRequiredError";
    this.incorrect = incorrect;
  }
}

let workerConfigured = false;

// CAS PDFs (CAMS/KFintech) render as text-position tables, not tagged paragraphs — pdf.js
// hands back individual glyph-run items with x/y coordinates, not lines. Both regex parsers
// in this app expect one logical row per text line, so we re-group items into lines by
// clustering on y-position (rounded, with a small tolerance for sub-pixel baseline jitter
// across items in the same visual row) and ordering left-to-right within each line.
function itemsToLines(items: any[]): string[] {
  const rows: { y: number; parts: { x: number; str: string }[] }[] = [];
  for (const item of items) {
    const str = item?.str;
    if (!str) continue;
    const x = item.transform?.[4] ?? 0;
    const y = item.transform?.[5] ?? 0;
    let row = rows.find((r) => Math.abs(r.y - y) <= 2.5);
    if (!row) {
      row = { y, parts: [] };
      rows.push(row);
    }
    row.parts.push({ x, str });
  }
  // PDF y-coordinates increase upward; sort top-to-bottom then left-to-right.
  rows.sort((a, b) => b.y - a.y);
  return rows.map((r) =>
    r.parts
      .sort((a, b) => a.x - b.x)
      .map((p) => p.str)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * Extracts text from a PDF file entirely client-side. Pass `password` once the caller has
 * one (e.g. after catching a PdfPasswordRequiredError and prompting the user) — CAMS/KFintech
 * CAS PDFs are typically protected with a password derived from the investor's PAN.
 */
export async function extractPdfText(file: File, password?: string): Promise<string> {
  const pdfjsLib: any = await import("pdfjs-dist");

  if (!workerConfigured) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
    workerConfigured = true;
  }

  const data = await file.arrayBuffer();
  let pdf: any;
  try {
    pdf = await pdfjsLib.getDocument({ data, password }).promise;
  } catch (e: any) {
    if (e?.name === "PasswordException") {
      const NEED_PASSWORD = pdfjsLib.PasswordResponses?.NEED_PASSWORD ?? 1;
      throw new PdfPasswordRequiredError(e.code !== NEED_PASSWORD);
    }
    throw new Error("Could not read that PDF — it may be corrupted or in an unsupported format.");
  }

  const pageTexts: string[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    pageTexts.push(itemsToLines(textContent.items).join("\n"));
  }
  return pageTexts.join("\n\n");
}
