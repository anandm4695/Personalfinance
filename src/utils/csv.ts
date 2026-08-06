// Minimal RFC-4180-ish CSV row parser: handles quoted fields, commas and escaped ("")
// quotes inside them. A plain `line.split(",")` breaks the moment a scheme name contains
// a comma (e.g. `"Axis Small Cap Fund, Direct - Growth"`), silently shifting every column
// after it — this walks the string char-by-char instead of splitting on a fixed delimiter.
export function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(field.trim());
      field = "";
    } else {
      field += ch;
    }
  }
  fields.push(field.trim());
  return fields;
}
