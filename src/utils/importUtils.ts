/**
 * Utility for parsing CSV into objects
 */

export async function parseCSV(file: File): Promise<any[]> {
  const text = await file.text();
  const rows = text.split(/\r?\n/).filter(row => row.trim() !== '');
  
  if (rows.length < 2) return [];

  // Detect delimiter (comma or semicolon)
  const firstRow = rows[0];
  const commaCount = (firstRow.match(/,/g) || []).length;
  const semicolonCount = (firstRow.match(/;/g) || []).length;
  const delimiter = semicolonCount > commaCount ? ';' : ',';

  const headers = rows[0].split(delimiter).map(h => h.trim().replace(/"/g, ''));
  const results: any[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let charIdx = 0; charIdx < row.length; charIdx++) {
      const char = row[charIdx];
      if (char === '"' && row[charIdx + 1] === '"') {
        current += '"';
        charIdx++;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        values.push(current.trim().replace(/"/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/"/g, ''));

    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || null;
    });
    results.push(obj);
  }

  return results;
}
