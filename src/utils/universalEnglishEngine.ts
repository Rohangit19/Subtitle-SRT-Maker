import fs from 'fs';
import wordList from 'word-list';
import { metaphone } from 'metaphone';

let englishSet: Set<string> = new Set();
const metaphoneToWords: Map<string, string[]> = new Map();

try {
  const filePath = typeof wordList === 'string' ? wordList : (wordList as any).default || String(wordList);
  const dictData = fs.readFileSync(filePath, 'utf8');
  const words = dictData.split('\n').filter(Boolean);
  englishSet = new Set(words);

  for (const w of words) {
    if (w.length < 3) continue;
    const m = metaphone(w);
    if (!metaphoneToWords.has(m)) {
      metaphoneToWords.set(m, []);
    }
    metaphoneToWords.get(m)!.push(w);
  }
} catch (err) {
  console.warn('English dictionary initialization warning:', err);
}

/**
 * Standard English Acronyms commonly spoken in Indian business, technical, legal, and conversational contexts
 */
export const KNOWN_ACRONYMS = new Set([
  'GST', 'HSN', 'PDF', 'API', 'CGST', 'SGST', 'IGST', 'ITC', 'OTP', 'SMS',
  'CPU', 'RAM', 'ROM', 'URL', 'HTTP', 'HTTPS', 'PAN', 'TDS', 'KYC', 'ATM',
  'VIP', 'UPI', 'IT', 'ID', 'AI', 'ML', 'NGO', 'FIR', 'SIM', 'PIN',
  'LED', 'LCD', 'USB', 'FAQ', 'WIFI', 'GPS', 'IP', 'DNS', 'SQL', 'HTML',
  'CSS', 'JS', 'SDK', 'JSON', 'XML', 'CSV', 'POS', 'CA', 'MBA', 'BBA', 'BTECH',
  'MBBS', 'MD', 'HR', 'CEO', 'CTO', 'CFO', 'CPA', 'RTO', 'EMI', 'FD', 'RD',
  'NEFT', 'RTGS', 'IMPS', 'IFSC', 'MICR', 'CIBIL', 'CVV', 'PR', 'SEO', 'SEM'
]);

/**
 * Protected native Indic grammatical and functional vocabulary that must NEVER be altered or Romanized
 */
export const INDIC_NATIVE_WORDS = new Set([
  // Hindi pronouns, conjunctions, verbs, adverbs, prepositions
  'आज', 'आजा', 'कल', 'परसों', 'हम', 'आप', 'तुम', 'मैं', 'मुझे', 'हमे', 'हमें',
  'हमारा', 'हमारी', 'हमारे', 'तुम्हारा', 'तुम्हारी', 'तुम्हारे', 'उनका', 'उनकी', 'उनके',
  'इसका', 'इसकी', 'इसके', 'उसका', 'उसकी', 'उसके', 'मेरा', 'मेरी', 'मेरे',
  'के', 'का', 'की', 'को', 'से', 'में', 'पर', 'ने', 'और', 'या', 'नहीं', 'हाँ',
  'बात', 'बारे', 'करेंगे', 'करते', 'किया', 'होगा', 'होगी', 'होंगे', 'था', 'थी', 'थे', 'है', 'हैं',
  'नया', 'नई', 'नए', 'पुराना', 'पुरानी', 'पुराने', 'एक', 'दो', 'तीन', 'चार', 'पाँच', 'दस', 'सब', 'लोग', 'भाई', 'दोस्त',
  'रहा', 'रही', 'रहे', 'कर', 'करके', 'कहा', 'कहो', 'बोलो', 'सुनो', 'देख', 'देखो', 'जाइए', 'आइए',
  'वाला', 'वाली', 'वाले', 'लिए', 'वहाँ', 'यहाँ', 'कहाँ', 'कब', 'कैसे', 'क्यूँ', 'क्योंकि',
  'खाना', 'खाइए', 'खाओ', 'घर', 'साथ', 'होना', 'हुआ', 'हुई', 'हुए', 'जाना', 'गया', 'गई', 'गए',
  'आना', 'आया', 'आई', 'आए', 'देना', 'दिया', 'दी', 'दिए', 'लेना', 'लिया', 'ली', 'लिए',
  'करना', 'करो', 'कीजिए', 'बताओ', 'बताइए', 'चल', 'चलो', 'रहो', 'रहिए', 'समझ', 'समझा',

  // Gujarati pronouns, conjunctions, verbs, adverbs, postpositions
  'આજે', 'આપણે', 'અમે', 'તમે', 'હું', 'મને', 'અમને', 'તમને', 'તેમને', 'તેઓ', 'તે',
  'અમારું', 'અમારી', 'અમારા', 'તમારું', 'તમારી', 'તમારા', 'તેમનું', 'તેમની', 'તેમના',
  'મારું', 'મારી', 'મારા', 'અને', 'કે', 'નો', 'ની', 'નું', 'ના', 'થી', 'માં', 'પર',
  'માટે', 'વિશે', 'સાથે', 'વાત', 'કરીશું', 'કરો', 'થશે', 'છે', 'નથી', 'હતા', 'હતી', 'હતો', 'કરીને',
  'કરે', 'કરે છે', 'આવો', 'જાઓ', 'જુઓ', 'જોઈ', 'કહી', 'કહો', 'અહીં', 'ત્યાં', 'ક્યાં',
  'કેમ', 'કારણ', 'જ્યારે', 'ત્યારે', 'બધા', 'લોકો', 'ભાઈ', 'મિત્ર', 'નવું', 'નવી', 'નવા',
  'જૂનું', 'જૂની', 'જૂના', 'એક', 'બે', 'ત્રણ', 'ચાર', 'પાંચ', 'દસ', 'શું', 'ક્યારે', 'આવશો',
  'જશો', 'કરશો', 'લઈ', 'આપી', 'દીધું', 'ગયું', 'આવ્યા', 'ગયા', 'રહ્યા', 'જોઈએ', 'સારું', 'ખરાબ'
]);

/**
 * Common Romanized Indic words to protect when written in Latin script
 */
export const INDIC_ROMANIZED_WORDS = new Set([
  'chhe', 'nathi', 'aaj', 'hum', 'karo', 'vishe', 'saathe', 'kem', 'kare',
  'pan', 'bhi', 'toh', 'tha', 'thi', 'avsho', 'badha', 'loko', 'shu',
  'karjo', 'sikhisu', 'mali', 'maro', 'mari', 'tamaro', 'tamari', 'apne',
  'aapanne', 'ame', 'tame', 'mane', 'hun', 'kyaare', 'ke', 'ane', 'mate',
  'mein', 'hai', 'hain', 'kaha', 'raha', 'rahe', 'gaya', 'gaye', 'hoga',
  'dosto', 'mitra', 'naam', 'ghar', 'khana', 'khaiye', 'aaiye', 'hamare',
  'hamara', 'hamari', 'unka', 'unki', 'unke', 'mera', 'meri', 'mere'
]);

// Phonetic letter names for English acronym recognition in Devanagari
const DEVA_ACRONYM_MAP: Record<string, string> = {
  'जी': 'G', 'एस': 'S', 'टी': 'T', 'एच': 'H', 'एन': 'N', 'पी': 'P', 'डी': 'D',
  'एफ': 'F', 'ए': 'A', 'ऐ': 'A', 'सी': 'C', 'बी': 'B', 'आई': 'I', 'आइ': 'I',
  'जे': 'J', 'के': 'K', 'एल': 'L', 'एम': 'M', 'ओ': 'O', 'क्यू': 'Q', 'आर': 'R',
  'यू': 'U', 'वी': 'V', 'डब्ल्यू': 'W', 'डब्लू': 'W', 'एक्स': 'X', 'वाई': 'Y', 'वाय': 'Y', 'जेड': 'Z'
};

// Phonetic letter names for English acronym recognition in Gujarati
const GUJ_ACRONYM_MAP: Record<string, string> = {
  'જી': 'G', 'એસ': 'S', 'ટી': 'T', 'એચ': 'H', 'એન': 'N', 'પી': 'P', 'ડી': 'D',
  'એફ': 'F', 'એ': 'A', 'ઐ': 'A', 'સી': 'C', 'બી': 'B', 'આઈ': 'I', 'આઇ': 'I',
  'જે': 'J', 'કે': 'K', 'એલ': 'L', 'એમ': 'M', 'ઓ': 'O', 'ક્યૂ': 'Q', 'આર': 'R',
  'યુ': 'U', 'વી': 'V', 'ડબલ્યુ': 'W', 'ડબ્લ્યુ': 'W', 'એક્સ': 'X', 'વાય': 'Y', 'ઝેડ': 'Z'
};

// Character transliteration tables
const GUJ_CONSONANTS: Record<string, string> = {
  'ક': 'k', 'ખ': 'kh', 'ગ': 'g', 'ઘ': 'gh', 'ઙ': 'ng', 'ચ': 'ch', 'છ': 'chh', 'જ': 'j', 'ઝ': 'jh', 'ઞ': 'ny',
  'ટ': 't', 'ઠ': 'th', 'ડ': 'd', 'ઢ': 'dh', 'ણ': 'n', 'ત': 't', 'થ': 'th', 'દ': 'd', 'ધ': 'dh', 'ન': 'n',
  'પ': 'p', 'ફ': 'f', 'બ': 'b', 'ભ': 'bh', 'મ': 'm', 'ય': 'y', 'ર': 'r', 'લ': 'l', 'વ': 'v', 'શ': 'sh', 'ષ': 'sh', 'સ': 's', 'હ': 'h', 'ળ': 'l'
};
const GUJ_VOWELS: Record<string, string> = {
  'અ': 'a', 'આ': 'a', 'ઇ': 'i', 'ઈ': 'ee', 'ઉ': 'u', 'ઊ': 'oo', 'ઋ': 'ri', 'એ': 'e', 'ઐ': 'ai', 'ઓ': 'o', 'ઔ': 'au', 'ઑ': 'o'
};
const GUJ_MATRAS: Record<string, string> = {
  'ા': 'a', 'િ': 'i', 'ી': 'i', 'ુ': 'u', 'ૂ': 'u', 'ૃ': 'ri', 'ે': 'e', 'ૈ': 'ai', 'ો': 'o', 'ૌ': 'au', 'ૉ': 'o', 'ં': 'n', 'ઃ': 'h'
};

const DEVA_CONSONANTS: Record<string, string> = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng', 'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n', 'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'f', 'ब': 'b', 'भ': 'bh', 'म': 'm', 'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
  'क़': 'q', 'ख़': 'kh', 'ग़': 'gh', 'ज़': 'z', 'ड़': 'r', 'ढ़': 'rh', 'फ़': 'f'
};
const DEVA_VOWELS: Record<string, string> = {
  'अ': 'a', 'आ': 'a', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo', 'ऋ': 'ri', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'ऑ': 'o', 'ॲ': 'a'
};
const DEVA_MATRAS: Record<string, string> = {
  'ा': 'a', 'ि': 'i', 'ी': 'i', 'ु': 'u', 'ू': 'u', 'ृ': 'ri', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ॉ': 'o', 'ॅ': 'a', 'ं': 'n', 'ः': 'h'
};

export function transliterateIndicToLatin(word: string): string {
  let res = '';
  for (let i = 0; i < word.length; i++) {
    const ch = word[i];
    const next = word[i + 1];
    if (GUJ_CONSONANTS[ch]) {
      if (next === '્') { res += GUJ_CONSONANTS[ch]; i++; }
      else if (GUJ_MATRAS[next]) { res += GUJ_CONSONANTS[ch] + GUJ_MATRAS[next]; i++; }
      else { res += GUJ_CONSONANTS[ch] + (i < word.length - 1 ? 'a' : ''); }
    } else if (GUJ_VOWELS[ch]) { res += GUJ_VOWELS[ch]; }
    else if (GUJ_MATRAS[ch]) { res += GUJ_MATRAS[ch]; }
    else if (DEVA_CONSONANTS[ch]) {
      if (next === '्') { res += DEVA_CONSONANTS[ch]; i++; }
      else if (DEVA_MATRAS[next]) { res += DEVA_CONSONANTS[ch] + DEVA_MATRAS[next]; i++; }
      else { res += DEVA_CONSONANTS[ch] + (i < word.length - 1 ? 'a' : ''); }
    } else if (DEVA_VOWELS[ch]) { res += DEVA_VOWELS[ch]; }
    else if (DEVA_MATRAS[ch]) { res += DEVA_MATRAS[ch]; }
    else if (ch !== '્' && ch !== '्') { res += ch; }
  }
  return res.toLowerCase();
}

/**
 * Universal Acronym Recognizer
 * Converts spoken English acronyms (e.g. જીએસટી, એચએસએન, પીડીએફ, એપીઆઈ, આઈટીસી)
 * into standard uppercase Latin abbreviations (GST, HSN, PDF, API, ITC, CGST, SGST, etc.)
 */
export function parseIndicAcronym(rawWord: string): string | null {
  const clean = rawWord.replace(/[-_.]/g, '');
  if (INDIC_NATIVE_WORDS.has(clean)) return null;

  // 1. Devanagari acronym parse
  let remaining = clean;
  let acronym = '';
  const devaKeys = Object.keys(DEVA_ACRONYM_MAP).sort((a, b) => b.length - a.length);
  while (remaining.length > 0) {
    let matched = false;
    for (const k of devaKeys) {
      if (remaining.startsWith(k)) {
        acronym += DEVA_ACRONYM_MAP[k];
        remaining = remaining.slice(k.length);
        matched = true;
        break;
      }
    }
    if (!matched) break;
  }
  if (remaining.length === 0 && acronym.length >= 2 && (KNOWN_ACRONYMS.has(acronym) || acronym.length >= 3)) {
    return acronym;
  }

  // 2. Gujarati acronym parse
  remaining = clean;
  acronym = '';
  const gujKeys = Object.keys(GUJ_ACRONYM_MAP).sort((a, b) => b.length - a.length);
  while (remaining.length > 0) {
    let matched = false;
    for (const k of gujKeys) {
      if (remaining.startsWith(k)) {
        acronym += GUJ_ACRONYM_MAP[k];
        remaining = remaining.slice(k.length);
        matched = true;
        break;
      }
    }
    if (!matched) break;
  }
  if (remaining.length === 0 && acronym.length >= 2 && (KNOWN_ACRONYMS.has(acronym) || acronym.length >= 3)) {
    return acronym;
  }

  return null;
}

export function capitalizeWord(s: string): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function findBestDictionaryMatch(query: string): string | null {
  if (englishSet.has(query)) return query;

  const m = metaphone(query);
  const candidates = metaphoneToWords.get(m) || [];
  if (candidates.length === 0) return null;

  let best: string | null = null;
  let minCost = 999;
  for (const c of candidates) {
    let cost = levenshtein(query, c);
    if (c.slice(0, 3) === query.slice(0, 3)) cost -= 0.6;
    if (cost < minCost) {
      minCost = cost;
      best = c;
    }
  }
  return minCost <= 2 ? best : null;
}

/**
 * Universal Morphological Loanword Resolution
 * High-confidence phonetic candidate generator for genuine English vocabulary.
 * Strictly avoids broad fuzzy guessing to prevent false-positive Indic conversions.
 */
function resolveIndicToEnglishLoanword(indicWord: string): string | null {
  if (INDIC_NATIVE_WORDS.has(indicWord)) return null;

  const rawLatin = transliterateIndicToLatin(indicWord);
  if (!rawLatin || rawLatin.length < 3) return null;

  const cands: string[] = [rawLatin];

  // Specific high-frequency English loanword root alignments
  cands.push(rawLatin.replace(/menej[a-z]*/, 'management'));
  cands.push(rawLatin.replace(/tekanol[a-z]*/, 'technology'));
  cands.push(rawLatin.replace(/teknol[a-z]*/, 'technology'));
  cands.push(rawLatin.replace(/eplike[a-z]*/, 'application'));
  cands.push(rawLatin.replace(/aplike[a-z]*/, 'application'));
  cands.push(rawLatin.replace(/apadet[a-z]*/, 'update'));
  cands.push(rawLatin.replace(/apdet[a-z]*/, 'update'));
  cands.push(rawLatin.replace(/bijnes[a-z]*/, 'business'));
  cands.push(rawLatin.replace(/biznas[a-z]*/, 'business'));
  cands.push(rawLatin.replace(/gavarn[a-z]*/, 'government'));
  cands.push(rawLatin.replace(/inavois[a-z]*/, 'invoice'));
  cands.push(rawLatin.replace(/invois[a-z]*/, 'invoice'));
  cands.push(rawLatin.replace(/ritarn[a-z]*/, 'return'));
  cands.push(rawLatin.replace(/retarn[a-z]*/, 'return'));
  cands.push(rawLatin.replace(/daunalod[a-z]*/, 'download'));
  cands.push(rawLatin.replace(/daunlod[a-z]*/, 'download'));
  cands.push(rawLatin.replace(/sistam[a-z]*/, 'system'));
  cands.push(rawLatin.replace(/kanekt[a-z]*/, 'connect'));
  cands.push(rawLatin.replace(/knekt[a-z]*/, 'connect'));
  cands.push(rawLatin.replace(/kampyutar[a-z]*/, 'computer'));
  cands.push(rawLatin.replace(/kompyutar[a-z]*/, 'computer'));
  cands.push(rawLatin.replace(/hospitla[a-z]*/, 'hospital'));
  cands.push(rawLatin.replace(/haspital[a-z]*/, 'hospital'));
  cands.push(rawLatin.replace(/doktar[a-z]*/, 'doctor'));
  cands.push(rawLatin.replace(/doktor[a-z]*/, 'doctor'));
  cands.push(rawLatin.replace(/pasavard[a-z]*/, 'password'));
  cands.push(rawLatin.replace(/pasvard[a-z]*/, 'password'));
  cands.push(rawLatin.replace(/mesaj[a-z]*/, 'message'));
  cands.push(rawLatin.replace(/akavunt[a-z]*/, 'account'));
  cands.push(rawLatin.replace(/akount[a-z]*/, 'account'));

  // English Morphological Suffixes:
  // -શન / -शन -> -tion / -cation / -sion
  if (indicWord.endsWith('શન') || indicWord.endsWith('शन')) {
    cands.push(rawLatin.replace(/ikeshan[a]?$/, 'ication'));
    cands.push(rawLatin.replace(/keshan[a]?$/, 'cation'));
    cands.push(rawLatin.replace(/shan[a]?$/, 'tion'));
    cands.push(rawLatin.replace(/shan[a]?$/, 'sion'));
    cands.push(rawLatin.replace(/jheshan[a]?$/, 'zation'));
    cands.push(rawLatin.replace(/jashan[a]?$/, 'zation'));
  }

  // -મેન્ટ / -मेंट -> -ment
  if (indicWord.endsWith('મેન્ટ') || indicWord.endsWith('मेंट')) {
    cands.push(rawLatin.replace(/ament[a]?$/, 'ment'));
    cands.push(rawLatin.replace(/ment[a]?$/, 'ment'));
  }

  // -વેર / -वेयर -> -ware
  if (indicWord.endsWith('વેર') || indicWord.endsWith('वेयर')) {
    cands.push(rawLatin.replace(/(?:veyar|ver)[a]?$/, 'ware'));
  }

  // -લોજી / -લૉજી / -लॉजी -> -logy
  if (indicWord.endsWith('લોજી') || indicWord.endsWith('લૉજી') || indicWord.endsWith('लॉजी')) {
    cands.push(rawLatin.replace(/loji$/, 'logy'));
  }

  // -ઇંગ / -િંગ / -इंग -> -ing
  if (indicWord.endsWith('ઇંગ') || indicWord.endsWith('િંગ') || indicWord.endsWith('इंग')) {
    cands.push(rawLatin.replace(/in[g]?$/, 'ing'));
  }

  // English Candra-O vowel marker (ૉ or ॉ)
  if (indicWord.includes('ૉ') || indicWord.includes('ॉ')) {
    cands.push(rawLatin.replace(/tar[a]?$/, 'tor'));
    cands.push(rawLatin);
  }

  // Check candidate in universal English dictionary
  for (const c of cands) {
    if (c.length >= 4 && englishSet.has(c)) {
      return capitalizeWord(c);
    }
  }

  return null;
}

export interface WordClassificationResult {
  token: string;
  classifiedLanguage: 'english' | 'gujarati' | 'hindi' | 'indic-romanized' | 'unknown';
  script: 'gujarati' | 'devanagari' | 'latin' | 'mixed' | 'punctuation';
  restoredWord: string;
  wasCorrected: boolean;
  reason: string;
}

export interface DiagnosticsReport {
  wordsClassifiedAsEnglish: string[];
  wordsClassifiedAsGujarati: string[];
  wordsClassifiedAsHindi: string[];
  wordsCorrected: Array<{ original: string; restored: string; reason: string }>;
  wordsUnchanged: Array<{ word: string; language: string }>;
}

/**
 * Word-level Language Identification & Script Preservation Inspector
 */
export function classifyAndRestoreWord(rawWord: string): WordClassificationResult {
  const trimmed = rawWord.trim();
  if (!trimmed) {
    return {
      token: rawWord,
      classifiedLanguage: 'unknown',
      script: 'punctuation',
      restoredWord: rawWord,
      wasCorrected: false,
      reason: 'whitespace_or_empty',
    };
  }

  const isGujarati = /[\u0A80-\u0AFF]/.test(trimmed);
  const isDevanagari = /[\u0900-\u097F]/.test(trimmed);
  const isLatin = /^[a-zA-Z]+$/.test(trimmed);

  // 1. Guard native Indic functional words
  if (INDIC_NATIVE_WORDS.has(trimmed)) {
    const lang = isGujarati ? 'gujarati' : 'hindi';
    return {
      token: trimmed,
      classifiedLanguage: lang,
      script: isGujarati ? 'gujarati' : 'devanagari',
      restoredWord: trimmed,
      wasCorrected: false,
      reason: 'native_indic_grammatical_guard',
    };
  }

  // 2. Acronyms in Indic Script (GST, HSN, PDF, API, etc.)
  const acr = parseIndicAcronym(trimmed);
  if (acr) {
    return {
      token: trimmed,
      classifiedLanguage: 'english',
      script: isGujarati ? 'gujarati' : 'devanagari',
      restoredWord: acr,
      wasCorrected: true,
      reason: 'indic_acronym_decompile',
    };
  }

  // 3. Latin Tokens
  if (isLatin) {
    const lower = trimmed.toLowerCase();
    if (INDIC_ROMANIZED_WORDS.has(lower)) {
      return {
        token: trimmed,
        classifiedLanguage: 'indic-romanized',
        script: 'latin',
        restoredWord: trimmed,
        wasCorrected: false,
        reason: 'indic_romanized_vocabulary',
      };
    }

    if (KNOWN_ACRONYMS.has(trimmed.toUpperCase())) {
      const restored = trimmed.toUpperCase();
      return {
        token: trimmed,
        classifiedLanguage: 'english',
        script: 'latin',
        restoredWord: restored,
        wasCorrected: trimmed !== restored,
        reason: 'latin_known_acronym',
      };
    }

    if (englishSet.has(lower)) {
      const restored = capitalizeWord(lower);
      return {
        token: trimmed,
        classifiedLanguage: 'english',
        script: 'latin',
        restoredWord: restored,
        wasCorrected: trimmed !== restored,
        reason: 'latin_english_dictionary_match',
      };
    }

    const bestMatch = findBestDictionaryMatch(lower);
    if (bestMatch && Math.abs(bestMatch.length - lower.length) <= 2) {
      const restored = capitalizeWord(bestMatch);
      return {
        token: trimmed,
        classifiedLanguage: 'english',
        script: 'latin',
        restoredWord: restored,
        wasCorrected: true,
        reason: 'latin_spelling_typo_correction',
      };
    }

    return {
      token: trimmed,
      classifiedLanguage: 'unknown',
      script: 'latin',
      restoredWord: trimmed,
      wasCorrected: false,
      reason: 'unclassified_latin_word',
    };
  }

  // 4. Indic loanword resolution (Morphological, Candra-O, Phonetic)
  if (isGujarati || isDevanagari) {
    const loanMatch = resolveIndicToEnglishLoanword(trimmed);
    if (loanMatch) {
      return {
        token: trimmed,
        classifiedLanguage: 'english',
        script: isGujarati ? 'gujarati' : 'devanagari',
        restoredWord: loanMatch,
        wasCorrected: true,
        reason: 'indic_phonetic_loanword_resolution',
      };
    }

    // STRICT SCRIPT PRESERVATION:
    // If not confidently identified as English, KEEP IN ORIGINAL SCRIPT!
    const lang = isGujarati ? 'gujarati' : 'hindi';
    return {
      token: trimmed,
      classifiedLanguage: lang,
      script: isGujarati ? 'gujarati' : 'devanagari',
      restoredWord: trimmed,
      wasCorrected: false,
      reason: 'strict_script_preservation',
    };
  }

  return {
    token: trimmed,
    classifiedLanguage: 'unknown',
    script: 'mixed',
    restoredWord: trimmed,
    wasCorrected: false,
    reason: 'mixed_or_punctuation',
  };
}

/**
 * Restores all English words in a text line to their native English Latin spelling
 * Strictly preserves Gujarati words in Gujarati script, Hindi words in Devanagari script,
 * and tracks full diagnostics.
 */
export function restoreUniversalEnglishInTextWithDiagnostics(text: string): {
  restoredText: string;
  diagnostics: DiagnosticsReport;
} {
  const diag: DiagnosticsReport = {
    wordsClassifiedAsEnglish: [],
    wordsClassifiedAsGujarati: [],
    wordsClassifiedAsHindi: [],
    wordsCorrected: [],
    wordsUnchanged: [],
  };

  if (!text) return { restoredText: '', diagnostics: diag };

  const tokens = text.split(/(\s+|[।.,!?;:()]+)/);
  const resultTokens: string[] = [];

  for (const token of tokens) {
    const trimmed = token.trim();
    if (!trimmed || /[।.,!?;:()]/.test(trimmed)) {
      resultTokens.push(token);
      continue;
    }

    const res = classifyAndRestoreWord(trimmed);
    resultTokens.push(res.restoredWord);

    if (res.classifiedLanguage === 'english') {
      diag.wordsClassifiedAsEnglish.push(res.restoredWord);
    } else if (res.classifiedLanguage === 'gujarati') {
      diag.wordsClassifiedAsGujarati.push(res.restoredWord);
    } else if (res.classifiedLanguage === 'hindi') {
      diag.wordsClassifiedAsHindi.push(res.restoredWord);
    }

    if (res.wasCorrected) {
      diag.wordsCorrected.push({
        original: res.token,
        restored: res.restoredWord,
        reason: res.reason,
      });
    } else {
      diag.wordsUnchanged.push({
        word: res.token,
        language: res.classifiedLanguage,
      });
    }
  }

  return {
    restoredText: resultTokens.join(''),
    diagnostics: diag,
  };
}

export function restoreUniversalEnglishInText(text: string): string {
  return restoreUniversalEnglishInTextWithDiagnostics(text).restoredText;
}

/**
 * Dedicated Multilingual English Spelling Preservation Stage for Subtitle Cues
 * Applied after transcription and before final SRT generation
 * Strictly preserves cue IDs, exact timestamps, and non-English sentence structure.
 */
export function restoreUniversalEnglishInCues(
  cues: Array<{ id: number; startMs: number; endMs: number; startTime: string; endTime: string; text: string }>
): {
  cues: Array<{ id: number; startMs: number; endMs: number; startTime: string; endTime: string; text: string }>;
  diagnostics: DiagnosticsReport;
} {
  const cumulativeDiag: DiagnosticsReport = {
    wordsClassifiedAsEnglish: [],
    wordsClassifiedAsGujarati: [],
    wordsClassifiedAsHindi: [],
    wordsCorrected: [],
    wordsUnchanged: [],
  };

  const restoredCues = cues.map((cue) => {
    const { restoredText, diagnostics } = restoreUniversalEnglishInTextWithDiagnostics(cue.text);
    cumulativeDiag.wordsClassifiedAsEnglish.push(...diagnostics.wordsClassifiedAsEnglish);
    cumulativeDiag.wordsClassifiedAsGujarati.push(...diagnostics.wordsClassifiedAsGujarati);
    cumulativeDiag.wordsClassifiedAsHindi.push(...diagnostics.wordsClassifiedAsHindi);
    cumulativeDiag.wordsCorrected.push(...diagnostics.wordsCorrected);
    cumulativeDiag.wordsUnchanged.push(...diagnostics.wordsUnchanged);
    return {
      ...cue,
      text: restoredText,
    };
  });

  return {
    cues: restoredCues,
    diagnostics: cumulativeDiag,
  };
}
