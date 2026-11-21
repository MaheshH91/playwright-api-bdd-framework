import * as fs from 'fs';
import * as path from 'path';

/** Sentinel expectation value: the field must exist and be non-empty. */
export const ANY_VALUE = '__ANY__';

export interface DatasetExpectations {
  status?: number;
  fields?: Record<string, unknown>;
}

export interface Dataset {
  name?: string;
  payload?: Record<string, unknown>;
  expected?: DatasetExpectations;
}

function resolveTestDataPath(fileName: string): string {
  const normalized = path.normalize(fileName.replace(/\\/g, '/'));
  if (path.isAbsolute(normalized) || normalized.startsWith('..')) {
    throw new Error(`Unsafe test data path: "${fileName}"`);
  }
  return path.join(process.cwd(), 'test-data', normalized);
}

/**
 * Loads a named dataset from a JSON file under test-data/.
 * Expected file shape:
 * {
 *   "datasets": [
 *     { "name": "valid_user", "payload": { ... }, "expected": { "status": 201, "fields": { ... } } }
 *   ]
 * }
 * A top-level array of datasets is also accepted.
 */
export function loadDataset(fileName: string, datasetName: string): Dataset {
  const filePath = resolveTestDataPath(fileName);
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const datasets: Dataset[] = Array.isArray(parsed) ? parsed : parsed.datasets;
  if (!Array.isArray(datasets)) {
    throw new Error(`${fileName} must be an array or contain a "datasets" array`);
  }
  const dataset = datasets.find(d => d.name === datasetName);
  if (!dataset) {
    throw new Error(
      `Dataset "${datasetName}" not found in ${fileName}. Available: ${datasets.map(d => d.name).join(', ')}`
    );
  }
  return dataset;
}

/**
 * Loads one row (1-based, header excluded) of a CSV file under test-data/
 * and converts it into a Dataset:
 *  - "expected_status" column   -> expected HTTP status
 *  - "expected_<field>" columns -> expected response field values
 *  - every other column         -> request payload field
 * An empty expected value means "field must exist" (ANY_VALUE).
 */
export function loadCsvDataset(fileName: string, rowNumber: number): Dataset {
  const rows = parseCsv(fs.readFileSync(resolveTestDataPath(fileName), 'utf-8'));
  if (rowNumber < 1 || rowNumber > rows.length) {
    throw new Error(`Row ${rowNumber} is out of range (1..${rows.length}) in ${fileName}`);
  }
  const row = rows[rowNumber - 1];
  const payload: Record<string, unknown> = {};
  const fields: Record<string, unknown> = {};
  let status: number | undefined;

  for (const [key, value] of Object.entries(row)) {
    if (key === 'expected_status') {
      status = Number(value);
    } else if (key.startsWith('expected_')) {
      fields[key.slice('expected_'.length)] = value === '' ? ANY_VALUE : value;
    } else if (value !== '') {
      payload[key] = value;
    }
  }

  return { name: `${fileName} row ${rowNumber}`, payload, expected: { status, fields } };
}

/** Minimal RFC-4180-ish CSV parser: quoted fields, escaped quotes, CRLF. */
function parseCsv(content: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (inQuotes) {
      if (char === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\r') {
      // Skip: handled together with the following \n.
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const nonEmpty = rows.filter(r => r.some(cell => cell.trim() !== ''));
  if (nonEmpty.length === 0) return [];

  const header = nonEmpty[0].map(h => h.trim());
  return nonEmpty.slice(1).map(cells =>
    Object.fromEntries(header.map((h, i) => [h, (cells[i] ?? '').trim()]))
  );
}
