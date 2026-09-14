import { createWorker } from 'tesseract.js';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

export interface OcrProcessingResult {
  confidence: number;
  extractedName: string | null;
  extractedDob: Date | null;
  extractedAge: number | null;
  nameMatchScore: number; // 0 to 100
  dobMatched: boolean;
  notes: string[];
}

/**
 * Calculates string similarity using Jaro-Winkler metric (0 to 1).
 */
export function calculateStringSimilarity(s1: string, s2: string): number {
  const clean1 = s1.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
  const clean2 = s2.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();

  if (clean1 === clean2) return 1.0;
  if (!clean1 || !clean2) return 0.0;

  const words1 = clean1.split(/\s+/).filter(Boolean);
  const words2 = clean2.split(/\s+/).filter(Boolean);

  // Check token intersection
  let matchedTokens = 0;
  for (const w1 of words1) {
    if (words2.some(w2 => w2 === w1 || (w1.length > 3 && w2.includes(w1)) || (w2.length > 3 && w1.includes(w2)))) {
      matchedTokens++;
    }
  }

  const tokenScore = (2 * matchedTokens) / (words1.length + words2.length);

  // Character-level match
  let matches = 0;
  const maxDist = Math.floor(Math.max(clean1.length, clean2.length) / 2) - 1;
  const s1Matches = new Array(clean1.length).fill(false);
  const s2Matches = new Array(clean2.length).fill(false);

  for (let i = 0; i < clean1.length; i++) {
    const start = Math.max(0, i - maxDist);
    const end = Math.min(i + maxDist + 1, clean2.length);
    for (let j = start; j < end; j++) {
      if (!s2Matches[j] && clean1[i] === clean2[j]) {
        s1Matches[i] = true;
        s2Matches[j] = true;
        matches++;
        break;
      }
    }
  }

  if (matches === 0) return tokenScore * 0.5;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < clean1.length; i++) {
    if (s1Matches[i]) {
      while (!s2Matches[k]) k++;
      if (clean1[i] !== clean2[k]) transpositions++;
      k++;
    }
  }

  const jaro = (matches / clean1.length + matches / clean2.length + (matches - transpositions / 2) / matches) / 3;
  return Math.max(tokenScore, jaro);
}

/**
 * Preprocesses an image to maximize OCR text accuracy with strict memory and dimension bounds.
 * Protects against decompression bombs and strips EXIF metadata.
 */
export async function preprocessImage(imagePath: string): Promise<Buffer> {
  const safePath = path.resolve(imagePath);
  if (!fs.existsSync(safePath)) {
    throw new Error('Image file does not exist for preprocessing.');
  }

  // Set sharp input pixel limits to prevent decompression bombs (max 268 million pixels)
  const image = sharp(safePath, { limitInputPixels: 268435456 });
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height || metadata.width < 50 || metadata.height < 50) {
    throw new Error('Image dimensions too small to be a readable document.');
  }
  if (metadata.width > 8000 || metadata.height > 8000) {
    throw new Error('Image dimensions exceed maximum allowed dimensions (8000x8000).');
  }

  let pipeline = image.rotate(); // auto-orient based on EXIF before stripping

  // Downscale if wider than 2000px to conserve worker memory and boost OCR speed
  if (metadata.width > 2000) {
    pipeline = pipeline.resize({ width: 2000, withoutEnlargement: true });
  }

  return await pipeline
    .grayscale()
    .normalize()
    .sharpen()
    .toBuffer(); // sharp strips all EXIF/ICC metadata by default unless withMetadata() is explicitly called
}

/**
 * Parses dates from OCR text using common Indian/International ID formats.
 */
function extractDatesFromText(text: string): { date: Date; year: number }[] {
  const dates: { date: Date; year: number }[] = [];

  // Patterns with explicit DOB/Birth keywords
  const labeledDateRegex = /(?:DOB|Date\s*of\s*Birth|Birth\s*Date|D\.?O\.?B\.?|जन्म\s*तिथि)[\s:]*([0-3]?[0-9][\/\-\.][0-1]?[0-9][\/\-\.](?:19|20)\d{2})/gi;
  let match;
  while ((match = labeledDateRegex.exec(text)) !== null) {
    const parsed = parseDateString(match[1]);
    if (parsed) dates.push(parsed);
  }

  // Pattern for Year of Birth: e.g., "Year of Birth : 1958"
  const yobRegex = /(?:Year\s*of\s*Birth|YOB|Y\.?O\.?B\.?|जन्म\s*का\s*वर्ष)[\s:]*((?:19|20)\d{2})/gi;
  while ((match = yobRegex.exec(text)) !== null) {
    const y = parseInt(match[1], 10);
    if (y >= 1920 && y <= new Date().getFullYear()) {
      dates.push({ date: new Date(Date.UTC(y, 0, 1)), year: y });
    }
  }

  // Standalone DD/MM/YYYY or DD-MM-YYYY patterns
  const genericDateRegex = /\b([0-3]?[0-9][\/\-\.][0-1]?[0-9][\/\-\.](?:19|20)\d{2})\b/g;
  while ((match = genericDateRegex.exec(text)) !== null) {
    const parsed = parseDateString(match[1]);
    if (parsed) dates.push(parsed);
  }

  return dates;
}

function parseDateString(str: string): { date: Date; year: number } | null {
  const parts = str.split(/[\/\-\.]/);
  if (parts.length !== 3) return null;

  let d = parseInt(parts[0], 10);
  let m = parseInt(parts[1], 10);
  let y = parseInt(parts[2], 10);

  // Check if first is 4-digit year (YYYY-MM-DD)
  if (parts[0].length === 4) {
    y = parseInt(parts[0], 10);
    m = parseInt(parts[1], 10);
    d = parseInt(parts[2], 10);
  }

  if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
  if (y < 1920 || y > new Date().getFullYear()) return null;
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > 31) return null;

  const date = new Date(Date.UTC(y, m - 1, d));
  return { date, year: y };
}

/**
 * Runs local Tesseract OCR on a document image and matches against declared user information.
 * Free, self-hosted, and never sends data to external cloud APIs.
 * Sensitive text is not logged or persisted.
 */
export async function processDocumentOcr(
  imagePath: string,
  declaredName: string,
  declaredDob: Date
): Promise<OcrProcessingResult> {
  const notes: string[] = [];
  let rawText = '';
  let confidence = 0;

  try {
    // 1. Preprocess image safely
    const processedBuffer = await preprocessImage(imagePath);

    // 2. Initialize local Tesseract worker
    const worker = await createWorker('eng');
    const ret = await worker.recognize(processedBuffer);
    rawText = ret.data.text || '';
    confidence = Math.round(ret.data.confidence || 0);
    await worker.terminate();

    notes.push(`OCR completed with confidence ${confidence}%.`);
  } catch (err: any) {
    console.error('OCR Processing Warning (handled):', err.message || err);
    notes.push(`OCR processing warning: ${err.message || 'Image text could not be fully recognized'}`);
  }

  // 3. Extract and Match DOB
  const extractedDates = extractDatesFromText(rawText);
  let bestDobMatch: { date: Date; year: number } | null = null;
  let dobMatched = false;
  let extractedAge: number | null = null;

  const declaredYear = declaredDob.getUTCFullYear();
  const declaredMonth = declaredDob.getUTCMonth();
  const declaredDay = declaredDob.getUTCDate();
  const currentYear = new Date().getFullYear();

  if (extractedDates.length > 0) {
    for (const d of extractedDates) {
      if (d.year === declaredYear) {
        bestDobMatch = d;
        if (d.date.getUTCMonth() === declaredMonth && d.date.getUTCDate() === declaredDay) {
          dobMatched = true;
          notes.push(`Exact DOB match found (${d.date.toISOString().split('T')[0]}).`);
          break;
        } else {
          dobMatched = true;
          notes.push(`Birth year match found (${d.year}).`);
        }
      }
    }

    if (!bestDobMatch) {
      bestDobMatch = extractedDates[0];
      notes.push(`Extracted DOB (${bestDobMatch.date.toISOString().split('T')[0]}) does not match declared year (${declaredYear}).`);
    }

    extractedAge = currentYear - bestDobMatch.year;
  } else {
    notes.push('No legible date of birth detected in document image.');
  }

  // 4. Fuzzy Name Match against candidate lines
  const lines = rawText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length >= 3 && !/^(government|india|republic|authority|card|identity|department)/i.test(l));

  let maxNameScore = 0;
  let bestCandidateName: string | null = null;

  for (const line of lines) {
    const score = calculateStringSimilarity(declaredName, line);
    if (score > maxNameScore) {
      maxNameScore = score;
      bestCandidateName = line;
    }
  }

  const fullTextScore = calculateStringSimilarity(declaredName, rawText);
  if (fullTextScore > maxNameScore) {
    maxNameScore = fullTextScore;
  }

  const nameMatchPercentage = Math.round(maxNameScore * 100);
  notes.push(`Name similarity score: ${nameMatchPercentage}%.`);

  return {
    confidence,
    extractedName: bestCandidateName,
    extractedDob: bestDobMatch ? bestDobMatch.date : null,
    extractedAge,
    nameMatchScore: nameMatchPercentage,
    dobMatched,
    notes
  };
}
