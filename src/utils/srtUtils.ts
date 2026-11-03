import { SubtitleCue } from '../types/subtitle';

/**
 * Format milliseconds into SRT timestamp: HH:MM:SS,mmm
 */
export function msToSrtTime(ms: number): string {
  if (isNaN(ms) || ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const milliseconds = Math.floor(ms % 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const mmm = String(milliseconds).padStart(3, '0');

  return `${hh}:${mm}:${ss},${mmm}`;
}

/**
 * Format milliseconds into WebVTT timestamp: HH:MM:SS.mmm
 */
export function msToVttTime(ms: number): string {
  return msToSrtTime(ms).replace(',', '.');
}

/**
 * Format milliseconds into human readable display: MM:SS.s
 */
export function msToDisplayTime(ms: number): string {
  if (isNaN(ms) || ms < 0) ms = 0;
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = (totalSeconds % 60).toFixed(1);
  return `${String(minutes).padStart(2, '0')}:${seconds.padStart(4, '0')}`;
}

/**
 * Parse an SRT timestamp string (HH:MM:SS,mmm or HH:MM:SS.mmm) into milliseconds
 */
export function srtTimeToMs(timeStr: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim().replace(',', '.');
  const parts = clean.split(':');
  if (parts.length === 3) {
    const hours = parseFloat(parts[0]) || 0;
    const minutes = parseFloat(parts[1]) || 0;
    const seconds = parseFloat(parts[2]) || 0;
    return Math.round((hours * 3600 + minutes * 60 + seconds) * 1000);
  } else if (parts.length === 2) {
    const minutes = parseFloat(parts[0]) || 0;
    const seconds = parseFloat(parts[1]) || 0;
    return Math.round((minutes * 60 + seconds) * 1000);
  }
  const directSec = parseFloat(clean);
  return isNaN(directSec) ? 0 : Math.round(directSec * 1000);
}

/**
 * Count words in a string, respecting multi-language unicode spaces
 */
export function countWords(text: string): number {
  if (!text) return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

/**
 * Convert cues array to standardized .SRT string
 */
export function cuesToSrt(cues: SubtitleCue[]): string {
  return cues
    .map((cue, index) => {
      const id = index + 1;
      const start = msToSrtTime(cue.startMs);
      const end = msToSrtTime(cue.endMs);
      const cleanText = normalizeEnglishWords(cue.text.trim());
      return `${id}\n${start} --> ${end}\n${cleanText}\n`;
    })
    .join('\n');
}

/**
 * Convert cues array to standardized .VTT string
 */
export function cuesToVtt(cues: SubtitleCue[]): string {
  const body = cues
    .map((cue, index) => {
      const id = index + 1;
      const start = msToVttTime(cue.startMs);
      const end = msToVttTime(cue.endMs);
      return `${id}\n${start} --> ${end}\n${cue.text.trim()}`;
    })
    .join('\n\n');
  return `WEBVTT\n\n${body}\n`;
}

/**
 * Convert cues array to clean plain text transcript
 */
export function cuesToPlainText(cues: SubtitleCue[]): string {
  return cues.map((cue) => cue.text.trim()).join(' ');
}

/**
 * Parse an uploaded .srt file string into SubtitleCue[]
 */
export function parseSrt(srtContent: string): SubtitleCue[] {
  const normalized = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split(/\n\s*\n/);
  const cues: SubtitleCue[] = [];

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;

    let timeLineIndex = 0;
    if (/^\d+$/.test(lines[0].trim())) {
      timeLineIndex = 1;
    }

    if (lines.length <= timeLineIndex) continue;
    const timeLine = lines[timeLineIndex];
    const match = timeLine.match(/(\d{1,2}:\d{2}:\d{2}[,\.]\d{2,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,\.]\d{2,3})/);

    if (match) {
      const startStr = match[1];
      const endStr = match[2];
      const startMs = srtTimeToMs(startStr);
      const endMs = srtTimeToMs(endStr);
      const text = lines.slice(timeLineIndex + 1).join(' ').trim();

      cues.push({
        id: cues.length + 1,
        startTime: msToSrtTime(startMs),
        endTime: msToSrtTime(endMs),
        startMs,
        endMs,
        text,
      });
    }
  }

  return cues;
}

/**
 * Shift all cues in time by offsetMs (+ or -)
 */
export function shiftCues(cues: SubtitleCue[], offsetMs: number): SubtitleCue[] {
  return cues.map((cue) => {
    const newStart = Math.max(0, cue.startMs + offsetMs);
    const duration = cue.endMs - cue.startMs;
    const newEnd = Math.max(newStart + 300, newStart + duration);
    return {
      ...cue,
      startMs: newStart,
      endMs: newEnd,
      startTime: msToSrtTime(newStart),
      endTime: msToSrtTime(newEnd),
    };
  });
}

/**
 * Auto-split a cue containing >6 words into chunks of targetWords (default 4-5 words)
 * with proportional timing distributed evenly across the word lengths
/**
 * Partition text strictly into 4 to 5 words chunks
 */
export function partitionTextInto4to5Words(text: string): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const n = words.length;
  if (n <= 5) return [text.trim()];

  let bestA = 0;
  let bestB = 0;
  let exact = false;

  // Try exact partition into 4s and 5s (e.g. 8 -> 4,4; 9 -> 5,4; 10 -> 5,5; 13 -> 5,4,4)
  for (let b = Math.floor(n / 5); b >= 0; b--) {
    const rem = n - 5 * b;
    if (rem % 4 === 0) {
      bestA = rem / 4;
      bestB = b;
      exact = true;
      break;
    }
  }

  const sizes: number[] = [];
  if (exact) {
    for (let i = 0; i < bestB; i++) sizes.push(5);
    for (let i = 0; i < bestA; i++) sizes.push(4);
  } else {
    let rem = n;
    while (rem > 0) {
      if (rem >= 10) {
        sizes.push(5);
        rem -= 5;
      } else if (rem === 9) {
        sizes.push(5, 4);
        rem -= 9;
      } else if (rem === 8) {
        sizes.push(4, 4);
        rem -= 8;
      } else if (rem === 7) {
        sizes.push(4, 3);
        rem -= 7;
      } else if (rem === 6) {
        sizes.push(3, 3);
        rem -= 6;
      } else {
        sizes.push(rem);
        rem = 0;
      }
    }
  }

  const chunks: string[] = [];
  let curr = 0;
  for (const s of sizes) {
    const chunkWords = words.slice(curr, curr + s);
    if (chunkWords.length > 0) {
      chunks.push(chunkWords.join(' '));
    }
    curr += s;
  }
  return chunks;
}

/**
 * Split a cue containing >5 words into strictly 4 to 5 words chunks with proportional timestamps
 */
export function splitCueIntoChunks(cue: SubtitleCue): SubtitleCue[] {
  const rawText = cue.text.trim();
  const wordCount = rawText.split(/\s+/).filter(Boolean).length;
  if (wordCount <= 5) {
    return [cue];
  }

  const chunks = partitionTextInto4to5Words(rawText);
  const totalDuration = cue.endMs - cue.startMs;
  const totalChars = chunks.reduce((acc, c) => acc + c.length, 0);

  let currentStart = cue.startMs;
  const result: SubtitleCue[] = [];

  chunks.forEach((chunkText, idx) => {
    const proportion = totalChars > 0 ? chunkText.length / totalChars : 1 / chunks.length;
    const chunkDuration = Math.max(500, Math.round(totalDuration * proportion));
    const chunkEnd = idx === chunks.length - 1 ? cue.endMs : currentStart + chunkDuration;

    result.push({
      id: cue.id + idx,
      startMs: currentStart,
      endMs: Math.max(currentStart + 500, chunkEnd),
      startTime: msToSrtTime(currentStart),
      endTime: msToSrtTime(Math.max(currentStart + 500, chunkEnd)),
      text: chunkText,
    });

    currentStart = chunkEnd;
  });

  return result;
}

/**
 * Comprehensive English words & loanwords normalization for client-side processing
 */
const CLIENT_DEVA_ENGLISH_LOANWORDS: Record<string, string> = {
  // Greetings, conversation & discourse
  'वेलकम': 'welcome', 'वेलकाम': 'welcome', 'वेल्कम': 'welcome',
  'बैक': 'back', 'बॅक': 'back', 'बेक': 'back',
  'हाय': 'Hi', 'हे': 'Hey', 'हेलो': 'Hello', 'हॅलो': 'Hello',
  'गाइज': 'guys', 'गाइज़': 'guys', 'गायज': 'guys', 'गायस': 'guys',
  'फ्रेंड्स': 'friends', 'फ्रेंड': 'friend', 'फ्रेन्ड्स': 'friends', 'फ्रेन्ड': 'friend',
  'थैंक': 'thank', 'थैंक्स': 'thanks', 'थैंक्यू': 'thank you', 'थैंक यू': 'thank you',
  'प्लीज': 'please', 'प्लीज़': 'please', 'सॉरी': 'sorry',
  'ओके': 'OK', 'यस': 'yes', 'नो': 'no',
  'बाय': 'bye', 'गुडबाय': 'goodbye',
  'टु': 'to', 'टू': 'to',
  'द': 'the', 'दी': 'the',
  'आवर': 'our', 'आर': 'our', 'अवर': 'our',
  'माय': 'my', 'योर': 'your',
  'ऑल': 'all', 'राइट': 'right', 'ऑलराइट': 'alright',
  'सो': 'so', 'बट': 'but', 'एंड': 'and', 'ऑर': 'or', 'इफ': 'if',
  'बिकॉज': 'because', 'देन': 'then', 'नाउ': 'now',
  'जस्ट': 'just', 'ओनली': 'only', 'आल्सो': 'also',
  'वेरी': 'very', 'मच': 'much', 'मोर': 'more',
  'सम': 'some', 'एनी': 'any', 'एवरी': 'every',
  'हियर': 'here', 'हेयर': 'here', 'देयर': 'there',
  'टुडे': 'today', 'टुमॉरो': 'tomorrow', 'यस्टरडे': 'yesterday',
  'सून': 'soon', 'लेटर': 'later',
  'वेल': 'well', 'डन': 'done',
  'लेट्स': "let's", 'कमॉन': 'come on',

  // Pronouns & Common Verbs
  'दिस': 'this', 'दैट': 'that', 'दीज': 'these', 'दोज': 'those',
  'इट': 'it', 'इट्स': "it's",
  'वी': 'we', 'अस': 'us', 'यू': 'you',
  'ही': 'he', 'शी': 'she', 'हिम': 'him', 'हर': 'her', 'दे': 'they', 'देम': 'them',
  'इज': 'is', 'एम': 'am', 'वाज': 'was', 'वर': 'were',
  'हैव': 'have', 'हैज': 'has', 'हैड': 'had',
  'डू': 'do', 'डज': 'does', 'डिड': 'did',
  'कैन': 'can', 'कुड': 'could', 'विल': 'will', 'वुड': 'would', 'शुड': 'should',
  'गो': 'go', 'गोइंग': 'going', 'कम': 'come', 'कमिंग': 'coming',
  'सी': 'see', 'लुक': 'look', 'लुक्स': 'looks',
  'वाच': 'watch', 'वॉच': 'watch', 'वाचिंग': 'watching', 'वॉचिंग': 'watching',
  'थिंक': 'think', 'टेक': 'take', 'गिव': 'give',
  'मेक': 'make', 'मेकिंग': 'making', 'यूज': 'use', 'यूजिंग': 'using',
  'स्टार्ट': 'start', 'स्टॉप': 'stop', 'प्ले': 'play', 'पॉज': 'pause',
  'चेक': 'check', 'आउट': 'out', 'फाइंड': 'find', 'शो': 'show',

  // Media, YouTube, Video & Social Platforms
  'वीडियो': 'video', 'विडियो': 'video', 'विडिओ': 'video', 'विडीयो': 'video',
  'वीडियोज': 'videos', 'विडियोज': 'videos',
  'चैनल': 'channel', 'चेनल': 'channel', 'चैनल्स': 'channels',
  'सब्सक्राइब': 'subscribe', 'सबस्क्राइब': 'subscribe',
  'सब्सक्राइबर्स': 'subscribers', 'सब्सक्राइबर': 'subscriber',
  'लाइक': 'like', 'लाइक्स': 'likes',
  'शेयर': 'share', 'शेअर': 'share',
  'कमेंट': 'comment', 'कमेंट्स': 'comments',
  'फॉलो': 'follow', 'फॉलोवर्स': 'followers', 'फॉलोअर्स': 'followers',
  'स्टूडियो': 'Studio', 'स्टुडियो': 'Studio',
  'सबटाइटल': 'subtitles', 'सबटाइटल्स': 'subtitles', 'कैप्शन': 'captions', 'कैप्शन्स': 'captions',
  'पॉडकास्ट': 'podcast', 'पोडकास्ट': 'podcast',
  'स्ट्रीम': 'stream', 'स्ट्रीमिंग': 'streaming',
  'कंटेंट': 'content', 'कंटेन्ट': 'content',
  'क्रिएटर': 'creator', 'व्लॉग': 'vlog', 'व्लॉगर': 'vlogger',
  'रील': 'reel', 'रील्स': 'reels', 'शॉर्ट्स': 'shorts', 'क्लिप': 'clip', 'क्लिप्स': 'clips',
  'एपिसोड': 'episode', 'पार्ट': 'part', 'सीरीज': 'series',
  'थंबनेल': 'thumbnail', 'बैनर': 'banner', 'लोगो': 'logo',
  'आइकॉन': 'icon', 'आइकन': 'icon', 'बेल': 'bell',
  'नोटिफिकेशन': 'notification', 'नोटिफिकेशन्स': 'notifications',
  'कम्युनिटी': 'community', 'पोस्ट': 'post', 'स्टोरी': 'story',
  'डिस्क्रिप्शन': 'description', 'बॉक्स': 'box', 'बिलो': 'below',
  'यूट्यूब': 'YouTube', 'गूगल': 'Google', 'फेसबुक': 'Facebook',
  'इंस्टाग्राम': 'Instagram', 'ट्विटर': 'Twitter', 'व्हाट्सएप': 'WhatsApp',
  'लिंक्डइन': 'LinkedIn', 'टिकटॉक': 'TikTok', 'टेलीग्राम': 'Telegram',

  // Tech, Web, AI & Computing
  'एआई': 'AI', 'टूल': 'tool', 'टूल्स': 'tools',
  'सॉफ्टवेयर': 'software', 'हार्डवेयर': 'hardware',
  'वेबसाइट': 'website', 'वेबसाईट': 'website', 'साइट': 'site',
  'वेब': 'web', 'इंटरनेट': 'internet', 'इन्टरनेट': 'internet',
  'ऑनलाइन': 'online', 'ऑफलाइन': 'offline',
  'लिंक': 'link', 'लिंक्स': 'links',
  'यूआरएल': 'URL', 'डोमेन': 'domain', 'होस्टिंग': 'hosting',
  'सर्वर': 'server', 'क्लाउड': 'cloud', 'डेटा': 'data', 'डेटाबेस': 'database',
  'ब्राउजर': 'browser', 'क्रोम': 'Chrome', 'सर्च': 'search', 'इंजन': 'engine',
  'ऐप': 'app', 'एप्प': 'app', 'एप्स': 'apps', 'एप्लिकेशन': 'application',
  'मोबाइल': 'mobile', 'फोन': 'phone', 'स्मार्टफोन': 'smartphone',
  'कंप्यूटर': 'computer', 'कम्प्यूटर': 'computer', 'लैपटॉप': 'laptop',
  'पीसी': 'PC', 'डेस्कटॉप': 'desktop', 'टैबलेट': 'tablet',
  'आईपैड': 'iPad', 'आईफोन': 'iPhone', 'मैक': 'Mac', 'मैकबुक': 'MacBook',
  'विंडोज': 'Windows', 'एंड्रॉयड': 'Android', 'आईओएस': 'iOS',
  'सिस्टम': 'system', 'स्क्रीन': 'screen', 'डिस्प्ले': 'display',
  'कीबोर्ड': 'keyboard', 'माउस': 'mouse',
  'बटन': 'button', 'बटन्स': 'buttons', 'क्लिक': 'click', 'क्लिक्स': 'clicks',
  'प्रेस': 'press', 'टैप': 'tap',
  'कैमरा': 'camera', 'कैमरे': 'camera', 'माइक': 'mic', 'माइक्रोफोन': 'microphone',
  'स्पीकर': 'speaker', 'हेडफोन': 'headphone', 'ईयरफोन': 'earphone',
  'ऑडियो': 'audio', 'साउंड': 'sound', 'वॉइस': 'voice', 'म्यूजिक': 'music',
  'वॉल्यूम': 'volume', 'म्यूट': 'mute', 'अनम्यूट': 'unmute',
  'एडिट': 'edit', 'एडिटिंग': 'editing', 'एडिटर': 'editor',
  'कट': 'cut', 'कॉपी': 'copy', 'पेस्ट': 'paste', 'क्रॉप': 'crop', 'ट्रिम': 'trim',
  'फिल्टर': 'filter', 'इफेक्ट': 'effect', 'इफेक्ट्स': 'effects',
  'ट्रांजिशन': 'transition', 'एनिमेशन': 'animation',
  'टेक्स्ट': 'text', 'फॉन्ट': 'font', 'कलर': 'color',
  'साइज': 'size', 'स्टाइल': 'style',
  'रेजोल्यूशन': 'resolution', 'क्वालिटी': 'quality',
  'एचडी': 'HD', 'फुल एचडी': 'Full HD', 'फोरके': '4K',
  'एक्सपोर्ट': 'export', 'इम्पोर्ट': 'import', 'रेंडर': 'render',
  'डाउनलोड': 'download', 'अपलोड': 'upload', 'सेव': 'save', 'डिलीट': 'delete',
  'अपडेट': 'update', 'अपडेट्स': 'updates', 'अपग्रेड': 'upgrade', 'वर्जन': 'version',
  'फीचर': 'feature', 'फीचर्स': 'features',
  'फाइल': 'file', 'फाइल्स': 'files', 'फोल्डर': 'folder', 'फोल्डर्स': 'folders',
  'कोड': 'code', 'कोडिंग': 'coding', 'डेवलपर': 'developer', 'डेवलपर्स': 'developers',
  'प्रोग्राम': 'program', 'प्रोग्रामिंग': 'programming',
  'बग': 'bug', 'एरर': 'error', 'फिक्स': 'fix', 'इशू': 'issue',
  'टेस्ट': 'test', 'रन': 'run', 'बिल्ड': 'build',
  'एपीआई': 'API', 'की': 'key', 'टोकन': 'token',
  'सिक्योरिटी': 'security', 'प्राइवेसी': 'privacy',
  'पासवर्ड': 'password', 'यूजरनेम': 'username', 'अकाउंट': 'account',
  'लॉगिन': 'login', 'साइनअप': 'signup', 'साइन इन': 'sign in', 'लॉगआउट': 'logout',
  'ओटीपी': 'OTP', 'वेरिफिकेशन': 'verification',
  'सेटिंग्स': 'settings', 'ऑप्शन': 'option', 'ऑप्शंस': 'options',
  'मेनू': 'menu', 'डैशबोर्ड': 'dashboard', 'इंटरफेस': 'interface',
  'प्रोजेक्ट': 'project', 'प्रोजेक्ट्स': 'projects',
  'यूजर': 'user', 'यूजर्स': 'users',
  'ईमेल': 'email', 'मैसेज': 'message', 'मैसेजेस': 'messages', 'चैट': 'chat',
  'प्रॉम्प्ट': 'prompt', 'मॉडल': 'model', 'जनरेट': 'generate', 'क्रिएट': 'create',

  // Business, Work & Everyday Terms
  'ऑफिस': 'office', 'वर्क': 'work', 'जॉब': 'job', 'करियर': 'career',
  'बिजनेस': 'business', 'मार्केट': 'market',
  'मनी': 'money', 'कैश': 'cash', 'पेमेंट': 'payment', 'कार्ड': 'card', 'बैंक': 'bank',
  'सैलरी': 'salary', 'पैकेज': 'package', 'कंपनी': 'company',
  'मीटिंग': 'meeting', 'कॉल': 'call', 'टास्क': 'task', 'क्लाइंट': 'client',
  'टीम': 'team', 'लीडर': 'leader', 'मैनेजर': 'manager', 'एचआर': 'HR',
  'स्किल्स': 'skills', 'एक्सपीरियंस': 'experience', 'रिज्यूम': 'resume',
  'टॉपिक': 'topic', 'स्टेप': 'step', 'स्टेप्स': 'steps',
  'टिप्स': 'tips', 'ट्रिक्स': 'tricks', 'ट्यूटोरियल': 'tutorial', 'गाइड': 'guide',
  'रिव्यू': 'review', 'अनबॉक्सिंग': 'unboxing',
  'बजट': 'budget', 'प्राइस': 'price', 'ऑफर': 'offer', 'डिस्काउंट': 'discount',
  'कूपन': 'coupon', 'शॉपिंग': 'shopping', 'ऑर्डर': 'order', 'डिलीवरी': 'delivery',
  'कस्टमर': 'customer', 'सपोर्ट': 'support', 'हेल्प': 'help',
  'प्रॉब्लम': 'problem', 'सॉल्यूशन': 'solution', 'मेथड': 'method', 'रिजल्ट': 'result',
  'कांसेप्ट': 'concept', 'लॉजिक': 'logic', 'प्रैक्टिस': 'practice',
  'व्यू': 'view', 'व्यूज': 'views',
  'टाइम': 'time', 'मिनट': 'minute', 'मिनट्स': 'minutes', 'सेकंड': 'second', 'सेकंड्स': 'seconds',
  'डे': 'day', 'डेज': 'days', 'वीक': 'week', 'मंथ': 'month', 'ईयर': 'year',

  // Tax, Accounting, Invoicing, Banking & Finance (MANDATORY PRESERVATION)
  'जीएसटी': 'GST', 'जी.एस.टी.': 'GST', 'जी.एस.टी': 'GST',
  'जीएसटीआईएन': 'GSTIN', 'जी.एस.टी.आई.एन.': 'GSTIN',
  'एचएसएन': 'HSN', 'एच.एस.एन.': 'HSN',
  'एसएसी': 'SAC', 'एस.ए.सी.': 'SAC',
  'आईटीसी': 'ITC', 'आई.टी.सी.': 'ITC',
  'सीजीएसटी': 'CGST', 'एसजीएसटी': 'SGST', 'आईजीएसटी': 'IGST',
  'टीडीएस': 'TDS', 'टीसीएस': 'TCS',
  'रिटर्न': 'Return', 'रिटर्न्स': 'Returns',
  'इनवॉइस': 'Invoice', 'इनवाइस': 'Invoice', 'इनव्हॉइस': 'Invoice',
  'इनवॉइसेज': 'Invoices', 'इनवॉइसिस': 'Invoices', 'इनव्हॉइसेस': 'Invoices',
  'पोर्टल': 'Portal', 'बिलिंग': 'Billing', 'बिल': 'Bill', 'बिल्स': 'Bills',
  'फाइलिंग': 'Filing', 'फ़ाइलिंग': 'Filing',
  'टैक्स': 'Tax', 'टैक्सेस': 'Taxes', 'टॅक्स': 'Tax', 'टॅक्सेस': 'Taxes',
  'रजिस्ट्रेशन': 'Registration', 'चालान': 'Challan',
  'ऑडिट': 'Audit', 'क्रेडिट': 'Credit', 'डेबिट': 'Debit',
  'अकाउंट्स': 'Accounts',
  'लेजर': 'Ledger', 'वाउचर': 'Voucher',
  'रिसिप्ट': 'Receipt', 'रिसीट': 'Receipt',
  'स्टेटमेंट': 'Statement', 'बैलेंस': 'Balance',
  'ट्रांजैक्शन': 'Transaction', 'ट्रांजैक्शन्स': 'Transactions',
  'पेमेंट्स': 'Payments',
  'इनकम': 'Income', 'फॉर्म': 'Form', 'फॉर्म्स': 'Forms',
  'नंबर': 'Number', 'डेट': 'Date', 'रेट': 'Rate',
  'परसेंट': 'percent', 'परसेंटेज': 'percentage',
  'कस्टमर्स': 'Customers',
  'क्लाइंट्स': 'Clients',
  'वेंडर': 'Vendor', 'सप्लायर': 'Supplier',
  'गुड्स': 'Goods', 'सर्विसेज': 'Services', 'सर्विस': 'Service',

  // Software & Brand Names (MANDATORY PRESERVATION)
  'प्रीमियर': 'Premiere', 'प्रिमियर': 'Premiere',
  'प्रो': 'Pro',
  'आफ्टर': 'After', 'आफ़्टर': 'After',
  'एडोब': 'Adobe', 'एडोबी': 'Adobe',
  'फोटोशॉप': 'Photoshop', 'इलस्ट्रेटर': 'Illustrator',
  'माइक्रोसॉफ्ट': 'Microsoft', 'मायक्रोसॉफ्ट': 'Microsoft',
  'एक्सेल': 'Excel', 'एकसेल': 'Excel',
  'वर्ड': 'Word',
  'पावरपॉइंट': 'PowerPoint', 'पावरपोईंट': 'PowerPoint',
  'गुगल': 'Google',
  'जेमिनी': 'Gemini', 'जेमीनी': 'Gemini',
  'युट्यूब': 'YouTube',
  'कैनवा': 'Canva', 'फिग्मा': 'Figma',
  'विन्डोज़': 'Windows',
  'एप्पल': 'Apple', 'एंड्रॉइड': 'Android',
  'चैटजीपीटी': 'ChatGPT', 'ओपनएआई': 'OpenAI',
  'वीएलसी': 'VLC', 'कैपकट': 'CapCut',

  // Acronyms & Standards (MANDATORY PRESERVATION)
  'पीडीएफ': 'PDF', 'एसआरटी': 'SRT', 'वीटीटी': 'VTT',
  'सीपीयू': 'CPU', 'जीपीयू': 'GPU',
  'रैम': 'RAM', 'रोम': 'ROM',
  'आईडी': 'ID', 'केवाईसी': 'KYC',
  'पैन': 'PAN', 'पिन': 'PIN', 'एटीएम': 'ATM',
  'यूपीआई': 'UPI', 'एसएमएस': 'SMS', 'क्यूआर': 'QR',
  'एसईओ': 'SEO', 'सीए': 'CA',
  'एमबीए': 'MBA', 'बी2बी': 'B2B', 'बी2सी': 'B2C',

  // Common Adjectives & Discourse
  'टॉप': 'top', 'बेस्ट': 'best', 'न्यू': 'new', 'ओल्ड': 'old',
  'गुड': 'good', 'ग्रेट': 'great', 'नाइस': 'nice', 'कूल': 'cool', 'सुपर': 'super',
  'ऑसम': 'awesome', 'अमेजिंग': 'amazing', 'परफेक्ट': 'perfect',
  'इजी': 'easy', 'सिंपल': 'simple', 'फास्ट': 'fast', 'स्लो': 'slow',
  'बिग': 'big', 'स्मॉल': 'small', 'हाई': 'high', 'लो': 'low',
  'फ्री': 'free', 'पेड': 'paid', 'प्रीमियम': 'premium',
  'रियल': 'real', 'फेक': 'fake', 'करेक्ट': 'correct',
  'स्पेशल': 'special', 'पॉपुलर': 'popular', 'फेमस': 'famous',
  'इम्पोर्टेंट': 'important', 'मेन': 'main', 'बेसिक': 'basic', 'एडवांस्ड': 'advanced',
  'ऑफिशियल': 'official', 'ओरिजिनल': 'original', 'पर्सनल': 'personal', 'पब्लिक': 'public',
  'रेडी': 'ready', 'फिनिश': 'finish', 'क्लोज': 'close', 'ओपन': 'open',
  'नेक्स्ट': 'next', 'प्रीवियस': 'previous', 'लास्ट': 'last', 'फर्स्ट': 'first',
  'फाइनल': 'final', 'फाइनली': 'finally',
  'एक्चुअली': 'actually', 'बेसिकली': 'basically', 'ऑब्वियसली': 'obviously',
  'पर्सनली': 'personally', 'डेफिनेटली': 'definitely', 'प्रॉबेबली': 'probably', 'मेबी': 'maybe',
  'डायरेक्टली': 'directly', 'ऑटोमेटिकली': 'automatically',
  'प्रेजेंटेशन': 'presentation', 'प्रस्तुति': 'presentation',
  'इन्फॉर्मेशन': 'information', 'इंफॉर्मेशन': 'information',
  'क्रिएटिव': 'creative', 'डिटेल्स': 'details',
  'प्रोसेस': 'process', 'डिजाइन': 'design',
  'कॉन्सेप्ट': 'concept', 'लेसन': 'lesson', 'कोर्स': 'course',
  'शेड्यूल': 'schedule',
  'वेरिफाई': 'verify', 'कन्फर्म': 'confirm',
  'लेवल': 'level', 'कंट्रोल': 'control',
  'वाईफाई': 'WiFi', 'ब्लूटूथ': 'Bluetooth', 'यूएसबी': 'USB', 'मेमोरी': 'memory',
};

const CLIENT_GUJ_ENGLISH_LOANWORDS: Record<string, string> = {
  // Greetings, conversation & discourse
  'વેલકમ': 'welcome', 'બેક': 'back', 'ટુ': 'to', 'અવર': 'our', 'માય': 'my',
  'હાય': 'Hi', 'હેલો': 'Hello', 'હે': 'Hey',
  'ફ્રેન્ડ્સ': 'friends', 'ફ્રેન્ડ': 'friend', 'ગાઈઝ': 'guys',
  'થેન્ક': 'thank', 'થેન્ક્સ': 'thanks', 'થેન્ક્યુ': 'thank you',
  'ઓકે': 'OK', 'પ્લીઝ': 'please', 'સોરી': 'sorry',
  'ઓલ': 'all', 'રાઈટ': 'right', 'ઓલરાઈટ': 'alright',
  'સો': 'so', 'બટ': 'but', 'એન્ડ': 'and', 'નાઉ': 'now',
  'જસ્ટ': 'just', 'ઓન્લી': 'only', 'વેરી': 'very',
  'ટુડે': 'today', 'સૂન': 'soon', 'લેટર': 'later',

  // Media, video & social platforms
  'વિડિયો': 'video', 'વિડીયો': 'video', 'વિડિયોઝ': 'videos',
  'ચેનલ': 'channel', 'ચેનલ્સ': 'channels',
  'સબ્સ્ક્રાઇબ': 'subscribe', 'સબસ્ક્રાઇબ': 'subscribe', 'સબસ્ક્રાઇબર': 'subscriber', 'સબ્સ્ક્રાઇબર્સ': 'subscribers',
  'લાઇક': 'like', 'લાઈક': 'like', 'લાઇક્સ': 'likes',
  'શેર': 'share',
  'કમેન્ટ': 'comment', 'કમેન્ટ્સ': 'comments',
  'ફોલો': 'follow', 'ફોલોઅર્સ': 'followers',
  'સ્ટુડિયો': 'Studio', 'સ્ટૂડિયો': 'Studio',
  'સબટાઈટલ': 'subtitles', 'સબટાઈટલ્સ': 'subtitles',
  'પોડકાસ્ટ': 'podcast', 'કન્ટેન્ટ': 'content', 'સ્ટ્રીમ': 'stream',
  'રીલ': 'reel', 'રીલ્સ': 'reels', 'શોર્ટ્સ': 'shorts', 'ક્લિપ': 'clip',
  'એપિસોડ': 'episode', 'થંબનેલ': 'thumbnail',
  'આઈકોન': 'icon', 'આઇકોન': 'icon', 'બેલ': 'bell',
  'ડિસ્ક્રિપ્શન': 'description', 'બોક્સ': 'box',
  'યૂટ્યૂબ': 'YouTube', 'ગૂગલ': 'Google', 'ફેસબુક': 'Facebook', 'ઇન્સ્ટાગ્રામ': 'Instagram',

  // Tech, computing & hardware
  'એઆઇ': 'AI', 'એઆઈ': 'AI',
  'ટૂલ': 'tool', 'ટૂલ્સ': 'tools',
  'કમ્પ્યુટર': 'computer', 'મોબાઇલ': 'mobile', 'ફોન': 'phone', 'સ્માર્ટફોન': 'smartphone',
  'એપ': 'app', 'એપ્સ': 'apps',
  'ઓનલાઇન': 'online', 'ઇન્ટરનેટ': 'internet', 'વેબસાઇટ': 'website', 'લિંક': 'link', 'લિંક્સ': 'links',
  'સ્ટાર્ટ': 'start', 'સ્ટોપ': 'stop', 'એડિટ': 'edit', 'એડિટિંગ': 'editing',
  'સોફ્ટવેર': 'software', 'કેમેરા': 'camera',
  'ઓડિયો': 'audio', 'ટેક્સ્ટ': 'text',
  'ડિજિટલ': 'digital', 'ટેકનોલોજી': 'technology',
  'પ્રોજેક્ટ': 'project', 'ફીચર': 'feature', 'ફીચર્સ': 'features',
  'ફાઇલ': 'file', 'ફોલ્ડર': 'folder',
  'ડાઉનલોડ': 'download', 'અપલોડ': 'upload', 'સેવ': 'save', 'અપડેટ': 'update',
  'બટન': 'button', 'ક્લિક': 'click', 'મ્યુઝિક': 'music', 'સ્ક્રીન': 'screen', 'સિસ્ટમ': 'system',
  'કોડ': 'code', 'કોડિંગ': 'coding', 'ડેટા': 'data', 'સર્વર': 'server',
  'પાસવર્ડ': 'password', 'એકાઉન્ટ': 'account', 'લોગિન': 'login', 'સાઇનઅપ': 'signup',
  'ઓપ્શન': 'option', 'સેટિંગ્સ': 'settings',

  // Tax, Accounting, Invoicing, Banking & Finance (MANDATORY PRESERVATION)
  'જીએસટી': 'GST', 'જી.એસ.ટી.': 'GST', 'જી.એસ.ટી': 'GST',
  'જીએસટીઆઇએન': 'GSTIN', 'જીએસટીઆઈએન': 'GSTIN',
  'એચએસએન': 'HSN', 'એસએસી': 'SAC',
  'આઈટીસી': 'ITC', 'આઇટીસી': 'ITC',
  'સીજીએસટી': 'CGST', 'એસજીએસટી': 'SGST', 'આઈજીએસટી': 'IGST', 'આઇજીએસટી': 'IGST',
  'ટીડીએસ': 'TDS', 'टीसीએસ': 'TCS',
  'રિટર્ન': 'Return', 'રિટર્ન્સ': 'Returns',
  'ઇનવોઇસ': 'Invoice', 'ઇનવોઇસીસ': 'Invoices', 'ઇનવોઇસિસ': 'Invoices', 'ઇનવોઇસો': 'Invoices',
  'પોર્ટલ': 'Portal', 'બિલિંગ': 'Billing', 'બિલ': 'Bill', 'બિલ્સ': 'Bills',
  'ફાઇલિંગ': 'Filing', 'ફાઇલીંગ': 'Filing',
  'ટેક્સ': 'Tax', 'ટેક્સીસ': 'Taxes',
  'રજિસ્ટ્રેશન': 'Registration', 'રજીસ્ટ્રેશન': 'Registration',
  'ઓડિટ': 'Audit', 'ક્રેડિટ': 'Credit', 'ડેબિટ': 'Debit',
  'એકાઉન્ટ્સ': 'Accounts',
  'લેજર': 'Ledger', 'વાઉચર': 'Voucher',
  'રીસીપ્ટ': 'Receipt', 'સ્ટેટમેન્ટ': 'Statement', 'બેલેન્સ': 'Balance',
  'ટ્રાન્ઝેક્શન': 'Transaction', 'ટ્રાન્ઝેક્શન્સ': 'Transactions',
  'પેમેન્ટ': 'Payment', 'પેમેન્ટ્સ': 'Payments',
  'ઇનકમ': 'Income', 'ઇન્કમ': 'Income',
  'ફોર્મ': 'Form', 'ફોર્મ્સ': 'Forms',
  'નંબર': 'Number', 'ડેટ': 'Date', 'રેટ': 'Rate',
  'પર્સન્ટ': 'percent', 'પર્સન્ટેજ': 'percentage',
  'કસ્ટમર': 'Customer', 'ક્લાયન્ટ': 'Client', 'ક્લાયંટ': 'Client',
  'વેન્ડર': 'Vendor', 'સપ્લાયર': 'Supplier',
  'ગુડ્સ': 'Goods', 'સર્વિસ': 'Service', 'સર્વિસીસ': 'Services',

  // Software & Brand Names (MANDATORY PRESERVATION)
  'પ્રીમિયર': 'Premiere', 'પ્રો': 'Pro',
  'આફ્ટર': 'After', 'ઇફેક્ટ્સ': 'Effects', 'ઇફેક્ટ': 'Effect',
  'એડોબ': 'Adobe', 'એડોબી': 'Adobe',
  'ફોટોશોપ': 'Photoshop', 'ઇલસ્ટ્રેટર': 'Illustrator',
  'માઇક્રોસોફ્ટ': 'Microsoft', 'માઈક્રોસોફ્ટ': 'Microsoft',
  'એક્સેલ': 'Excel', 'વર્ડ': 'Word',
  'પાવરપોઇન્ટ': 'PowerPoint',
  'જેમિની': 'Gemini',
  'યુટ્યુબ': 'YouTube',
  'કેનવા': 'Canva', 'ફિગ્મા': 'Figma',
  'વિન્ડોઝ': 'Windows', 'એપલ': 'Apple', 'એન્ડ્રોઇડ': 'Android',
  'ક્રોમ': 'Chrome', 'ચેટજીપીટી': 'ChatGPT', 'ઓપનએઆઇ': 'OpenAI',
  'વીએલસી': 'VLC', 'કેપકટ': 'CapCut',

  // Acronyms & Standards (MANDATORY PRESERVATION)
  'પીડીએફ': 'PDF', 'એસઆરટી': 'SRT', 'વીટીટી': 'VTT',
  'એપીઆઈ': 'API', 'એપીઆઇ': 'API',
  'સીપીયુ': 'CPU', 'જીપીયુ': 'GPU',
  'રેમ': 'RAM', 'રોમ': 'ROM', 'યુઆરએલ': 'URL',
  'આઈડી': 'ID', 'આઇડી': 'ID',
  'ઓટીપી': 'OTP', 'કેવાયસી': 'KYC',
  'પાન': 'PAN', 'પિન': 'PIN', 'એટીએમ': 'ATM',
  'યુપીઆઈ': 'UPI', 'યુપીઆઇ': 'UPI',
  'એસએમએસ': 'SMS', 'ક્યૂઆર': 'QR',
  'એસઈઓ': 'SEO', 'એસઇઓ': 'SEO',
  'એચઆર': 'HR', 'સીએ': 'CA',
  'એમબીએ': 'MBA', 'બી2બી': 'B2B', 'બી2સી': 'B2C',

  // Business & adjectives
  'ટોપિક': 'topic', 'સ્ટેપ': 'step', 'સ્ટેપ્સ': 'steps', 'ટિપ્સ': 'tips', 'ટ્રિક્સ': 'tricks', 'ગાઇડ': 'guide',
  'ઓફિસ': 'office', 'વર્ક': 'work', 'જોબ': 'job', 'મીટિંગ': 'meeting', 'કોલ': 'call',
  'ટીમ': 'team', 'મેનેજર': 'manager',
  'ટોપ': 'top', 'બેસ્ટ': 'best', 'ન્યૂ': 'new', 'ગુડ': 'good', 'ગ્રેટ': 'great', 'સુપર': 'super', 'કૂલ': 'cool', 'પરફેક્ટ': 'perfect',
  'ઇઝી': 'easy', 'સિમ્પલ': 'simple', 'ફાસ્ટ': 'fast', 'ફ્રી': 'free', 'પ્રીમિયમ': 'premium',
  'બેઝિકલી': 'basically', 'એક્ચ્યુલી': 'actually', 'ફાઇનલી': 'finally',
  'પ્રેઝન્ટેશન': 'presentation', 'ઇન્ફોર્મેશન': 'information',
  'ક્રિએટ': 'create', 'ક્રિએટિવ': 'creative', 'ડિટેલ્સ': 'details',
  'પ્રોબ્લેમ': 'problem', 'સોલ્યુશન': 'solution', 'રિઝલ્ટ': 'result',
  'પ્રોસેસ': 'process', 'ડિઝાઇન': 'design', 'કોન્સેપ્ટ': 'concept',
  'ટ્યુટોરિયલ': 'tutorial', 'લેસન': 'lesson', 'કોર્સ': 'course',
  'મેસેજ': 'message', 'નોટિફિકેશન': 'notification', 'શેડ્યુલ': 'schedule',
  'ચેક': 'check', 'વેરિફાય': 'verify', 'કન્ફર્મ': 'confirm',
  'લેવલ': 'level', 'કંટ્રોલ': 'control', 'નેટવર્ક': 'network',
  'વાઇફાઇ': 'WiFi', 'વાઇ-ફાઇ': 'WiFi', 'બ્લૂટૂથ': 'Bluetooth', 'યુએસબી': 'USB',
  'મેમરી': 'memory', 'ડિસ્પ્લે': 'display',
};

const CLIENT_PHONETIC_CORRECTIONS: Record<string, string> = {
  velakam: 'welcome',
  velkam: 'welcome',
  welkam: 'welcome',
  baik: 'back',
  aar: 'our',
  avar: 'our',
  vidio: 'video',
  viedo: 'video',
  chenal: 'channel',
  chanel: 'channel',
  subskraib: 'subscribe',
  subskribe: 'subscribe',
  laik: 'like',
  sher: 'share',
  kament: 'comment',
  koment: 'comment',
  komputer: 'computer',
  mobail: 'mobile',
  fon: 'phone',
  intarnet: 'internet',
  websait: 'website',
  daunlod: 'download',
  aplod: 'upload',
  edet: 'edit',
  tekst: 'text',
  sistam: 'system',
  skrin: 'screen',
  batan: 'button',
  klik: 'click',
  myujik: 'music',
  frends: 'friends',
  frnds: 'friends',
  gays: 'guys',
  plis: 'please',
  plz: 'please',
  tenk: 'thank',
  tenks: 'thanks',
  tenkyu: 'thank you',
  sori: 'sorry',
  tuls: 'tools',
  ai: 'AI',
};

const CLIENT_STANDARD_CASING: Record<string, string> = {
  // Acronyms (MANDATORY STRICT PRESERVATION)
  gst: 'GST',
  gstin: 'GSTIN',
  hsn: 'HSN',
  sac: 'SAC',
  itc: 'ITC',
  cgst: 'CGST',
  sgst: 'SGST',
  igst: 'IGST',
  tds: 'TDS',
  tcs: 'TCS',
  pan: 'PAN',
  pin: 'PIN',
  otp: 'OTP',
  kyc: 'KYC',
  atm: 'ATM',
  upi: 'UPI',
  sms: 'SMS',
  qr: 'QR',
  seo: 'SEO',
  hr: 'HR',
  ca: 'CA',
  mba: 'MBA',
  b2b: 'B2B',
  b2c: 'B2C',
  ai: 'AI',
  api: 'API',
  srt: 'SRT',
  vtt: 'VTT',
  ui: 'UI',
  ux: 'UX',
  hd: 'HD',
  cpu: 'CPU',
  gpu: 'GPU',
  ram: 'RAM',
  rom: 'ROM',
  url: 'URL',
  id: 'ID',

  // Software & Brand Names
  premiere: 'Premiere',
  photoshop: 'Photoshop',
  illustrator: 'Illustrator',
  adobe: 'Adobe',
  microsoft: 'Microsoft',
  excel: 'Excel',
  powerpoint: 'PowerPoint',
  gemini: 'Gemini',
  youtube: 'YouTube',
  google: 'Google',
  canva: 'Canva',
  figma: 'Figma',
  facebook: 'Facebook',
  instagram: 'Instagram',
  twitter: 'Twitter',
  whatsapp: 'WhatsApp',
  linkedin: 'LinkedIn',
  apple: 'Apple',
  android: 'Android',
  windows: 'Windows',
  chrome: 'Chrome',
  chatgpt: 'ChatGPT',
  openai: 'OpenAI',
  vlc: 'VLC',
  capcut: 'CapCut',

  // Tax, Invoicing & Business Words
  invoice: 'Invoice',
  invoices: 'Invoices',
  return: 'Return',
  returns: 'Returns',
  portal: 'Portal',
  billing: 'Billing',
  filing: 'Filing',
  audit: 'Audit',
  credit: 'Credit',
  debit: 'Debit',
  ledger: 'Ledger',
  voucher: 'Voucher',
  receipt: 'Receipt',
  challan: 'Challan',
  statement: 'Statement',
  balance: 'Balance',
  transaction: 'Transaction',
  transactions: 'Transactions',
  payment: 'Payment',
  payments: 'Payments',
  account: 'Account',
  accounts: 'Accounts',
  customer: 'Customer',
  customers: 'Customers',
  client: 'Client',
  clients: 'Clients',
  vendor: 'Vendor',
  vendors: 'Vendors',
  supplier: 'Supplier',
  suppliers: 'Suppliers',
  registration: 'Registration',
};

const CLIENT_MULTI_WORD_NORMALIZATIONS: Array<[RegExp, string]> = [
  // Tax, Invoicing & Business multi-words (Devanagari - Hindi/Marathi)
  [/जी(?:\.?स\.?टी\.?|एसटी)\s+रिटर्न(?:्स)?/gi, 'GST Return'],
  [/जी(?:\.?स\.?टी\.?|एसटी)\s+इनवॉइस(?:ेज)?/gi, 'GST Invoice'],
  [/जी(?:\.?स\.?टी\.?|एसटी)\s+इनवाइस(?:ेज)?/gi, 'GST Invoice'],
  [/जी(?:\.?स\.?टी\.?|एसटी)\s+इनव्हॉइस(?:िस)?/gi, 'GST Invoice'],
  [/जी(?:\.?स\.?टी\.?|एसटी)\s+पोर्टल/gi, 'GST Portal'],
  [/जी(?:\.?स\.?टी\.?|एसटी)\s+नंबर/gi, 'GST Number'],
  [/जी(?:\.?स\.?टी\.?|एसटी)\s+रजिस्ट्रेशन/gi, 'GST Registration'],
  [/जी(?:\.?स\.?टी\.?|एसटी)\s+फाइलिंग/gi, 'GST Filing'],
  [/जी(?:\.?स\.?टी\.?|एसटी)\s+चालान/gi, 'GST Challan'],
  [/इनकम\s+टैक्स\s+रिटर्न/gi, 'Income Tax Return'],
  [/इनकम\s+टैक्स/gi, 'Income Tax'],
  [/टैक्स\s+रिटर्न(?:्स)?/gi, 'Tax Return'],
  [/टैक्स\s+इनवॉइस(?:ेज)?/gi, 'Tax Invoice'],
  [/टैक्स\s+इनवाइस(?:ेज)?/gi, 'Tax Invoice'],
  [/टैक्स\s+इनव्हॉइस/gi, 'Tax Invoice'],
  [/टैक्स\s+ऑडिट/gi, 'Tax Audit'],
  [/आईटीसी\s+क्लेम/gi, 'ITC Claim'],
  [/टीडीएस\s+रिटर्न/gi, 'TDS Return'],
  [/एचएसएन\s+कोड/gi, 'HSN code'],
  [/एसएसी\s+कोड/gi, 'SAC code'],

  // Software & Brand multi-words (Devanagari - Hindi/Marathi)
  [/प्रीमियर\s+प्रो/gi, 'Premiere Pro'],
  [/प्रिमियर\s+प्रो/gi, 'Premiere Pro'],
  [/आफ्टर\s+इफेक्ट्स/gi, 'After Effects'],
  [/आफ्टर\s+इफेक्ट/gi, 'After Effects'],
  [/आफ़्टर\s+इफेक्ट्स/gi, 'After Effects'],
  [/एडोब\s+प्रीमियर\s+प्रो/gi, 'Adobe Premiere Pro'],
  [/एडोब\s+प्रीमियर/gi, 'Adobe Premiere'],
  [/एडोब\s+फोटोशॉप/gi, 'Adobe Photoshop'],
  [/एडोब\s+इलस्ट्रेटर/gi, 'Adobe Illustrator'],
  [/एडोब\s+आफ्टर\s+इफेक्ट्स/gi, 'Adobe After Effects'],
  [/माइक्रोसॉफ्ट\s+एक्सेल/gi, 'Microsoft Excel'],
  [/मायक्रोसॉफ्ट\s+एक्सेल/gi, 'Microsoft Excel'],
  [/माइक्रोसॉफ्ट\s+वर्ड/gi, 'Microsoft Word'],
  [/मायक्रोसॉफ्ट\s+वर्ड/gi, 'Microsoft Word'],
  [/माइक्रोसॉफ्ट\s+पावरपॉइंट/gi, 'Microsoft PowerPoint'],
  [/माइक्रोसॉफ्ट\s+ऑफिस/gi, 'Microsoft Office'],
  [/मायक्रोसॉफ्ट\s+ऑफिस/gi, 'Microsoft Office'],
  [/गूगल\s+क्रोम/gi, 'Google Chrome'],
  [/गूगल\s+जेमिनी/gi, 'Google Gemini'],
  [/गूगल\s+ड्राइव/gi, 'Google Drive'],
  [/गूगल\s+डॉक्स/gi, 'Google Docs'],
  [/गूगल\s+शीट्स/gi, 'Google Sheets'],
  [/फाइनल\s+कट\s+प्रो/gi, 'Final Cut Pro'],
  [/दाविंची\s+रिजॉल्व/gi, 'DaVinci Resolve'],

  // Devanagari conversational multi-words
  [/चेक\s+आउट\s+द\s+लिंक/gi, 'check out the link'],
  [/चेक\s+आउट/gi, 'check out'],
  [/डिस्क्रिप्शन\s+बॉक्स/gi, 'description box'],
  [/लिंक\s+इन\s+डिस्क्रिप्शन/gi, 'link in description'],
  [/बेल\s+आइकॉन/gi, 'bell icon'],
  [/बेल\s+आइकन/gi, 'bell icon'],
  [/वेलकम\s+बैक\s+टू\s+माय\s+चैनल/gi, 'welcome back to my channel'],
  [/वेलकम\s+बैक\s+टू\s+आवर\s+वीडियो\s+चैनल/gi, 'welcome back to our video channel'],
  [/वेलकम\s+बैक\s+टू\s+आवर\s+चैनल/gi, 'welcome back to our channel'],
  [/वेलकम\s+बैक\s+टू\s+आवर/gi, 'welcome back to our'],
  [/वेलकम\s+बैक\s+टु\s+आवर/gi, 'welcome back to our'],
  [/वेलकम\s+बैक\s+टू\s+माय/gi, 'welcome back to my'],
  [/वेलकम\s+बैक\s+टु\s+माय/gi, 'welcome back to my'],
  [/वेलकम\s+बैक\s+टू/gi, 'welcome back to'],
  [/वेलकम\s+बैक/gi, 'welcome back'],
  [/वीडियो\s+चैनल/gi, 'video channel'],
  [/विडियो\s+चैनल/gi, 'video channel'],
  [/एआई\s+टूल्स/gi, 'AI tools'],
  [/एआई\s+टूल/gi, 'AI tool'],
  [/लाइक\s+और\s+सब्सक्राइब/gi, 'like and subscribe'],
  [/लाइक\s+शेयर\s+सब्सक्राइब/gi, 'like share subscribe'],
  [/लाइक\s+शेयर\s+एंड\s+सब्सक्राइब/gi, 'like share and subscribe'],
  [/लाइक\s+और\s+शेयर/gi, 'like and share'],
  [/शेयर\s+और\s+सब्सक्राइब/gi, 'share and subscribe'],
  [/थैंक\s+यू\s+सो\s+मच/gi, 'thank you so much'],
  [/थैंक\s+यू/gi, 'thank you'],
  [/सी\s+यू\s+सून/gi, 'see you soon'],
  [/सी\s+यू/gi, 'see you'],
  [/बाय\s+बाय/gi, 'bye bye'],
  [/लेट्स\s+गो/gi, "let's go"],
  [/लेट्स\s+स्टार्ट/gi, "let's start"],
  [/नो\s+प्रॉब्लम/gi, 'no problem'],
  [/डोंट\s+वरी/gi, "don't worry"],
  [/ऑल\s+द\s+बेस्ट/gi, 'all the best'],
  [/स्टेप\s+बाय\s+स्टेप/gi, 'step by step'],

  // Tax, Invoicing & Business multi-words (Gujarati)
  [/જી(?:\.?એસ\.?ટી\.?|એસટી)\s+રિટર્ન(?:્સ)?/gi, 'GST Return'],
  [/જી(?:\.?એસ\.?ટી\.?|એસટી)\s+ઇનવોઇસ(?:િસ)?/gi, 'GST Invoice'],
  [/જી(?:\.?એસ\.?ટી\.?|એસટી)\s+પોર્ટલ/gi, 'GST Portal'],
  [/જી(?:\.?એસ\.?ટી\.?|એસટી)\s+નંબર/gi, 'GST Number'],
  [/જી(?:\.?એસ\.?ટી\.?|એસટી)\s+રજિસ્ટ્રેશન/gi, 'GST Registration'],
  [/જી(?:\.?એસ\.?ટી\.?|એસટી)\s+ફાઇલિંગ/gi, 'GST Filing'],
  [/ઇનકમ\s+ટેક્સ\s+રિટર્ન/gi, 'Income Tax Return'],
  [/ઇનકમ\s+ટેક્સ/gi, 'Income Tax'],
  [/ઇન્કમ\s+ટેક્સ/gi, 'Income Tax'],
  [/ટેક્સ\s+રિટર્ન(?:્સ)?/gi, 'Tax Return'],
  [/ટેક્સ\s+ઇનવોઇસ/gi, 'Tax Invoice'],
  [/ટેક્સ\s+ઓડિટ/gi, 'Tax Audit'],
  [/આઇટીસી\s+ક્લેમ/gi, 'ITC Claim'],
  [/આઈટીસી\s+ક્લેમ/gi, 'ITC Claim'],
  [/ટીડીએસ\s+રિટર્ન/gi, 'TDS Return'],
  [/એચએસએન\s+કોડ/gi, 'HSN code'],

  // Software & Brand multi-words (Gujarati)
  [/પ્રીમિયર\s+પ્રો/gi, 'Premiere Pro'],
  [/આફ્ટર\s+ઇફેક્ટ્સ/gi, 'After Effects'],
  [/આફ્ટર\s+ઇફેક્ટ/gi, 'After Effects'],
  [/એડોબ\s+પ્રીમિયર\s+પ્રો/gi, 'Adobe Premiere Pro'],
  [/એડોબ\s+પ્રીમિયર/gi, 'Adobe Premiere'],
  [/એડોબ\s+ફોટોશોપ/gi, 'Adobe Photoshop'],
  [/એડોબ\s+આફ્ટર\s+ઇફેક્ટ્સ/gi, 'Adobe After Effects'],
  [/માઇક્રોસોફ્ટ\s+એક્સેલ/gi, 'Microsoft Excel'],
  [/માઈક્રોસોફ્ટ\s+એક્સેલ/gi, 'Microsoft Excel'],
  [/માઇક્રોસોફ્ટ\s+વર્ડ/gi, 'Microsoft Word'],
  [/માઇક્રોસોફ્ટ\s+ઓફિસ/gi, 'Microsoft Office'],
  [/ગૂગલ\s+ક્રોમ/gi, 'Google Chrome'],
  [/ગૂગલ\s+જેમિની/gi, 'Google Gemini'],

  // Gujarati conversational multi-words
  [/ચેક\s+આઉટ/gi, 'check out'],
  [/ડિસ્ક્રિપ્શન\s+બોક્સ/gi, 'description box'],
  [/બેલ\s+આઈકોન/gi, 'bell icon'],
  [/બેલ\s+આઇકોન/gi, 'bell icon'],
  [/વેલકમ\s+બેક\s+ટુ\s+માય\s+ચેનલ/gi, 'welcome back to my channel'],
  [/વેલકમ\s+બેક\s+ટુ\s+અવર\s+ચેનલ/gi, 'welcome back to our channel'],
  [/વેલકમ\s+બેક\s+ટુ\s+અવર/gi, 'welcome back to our'],
  [/વેલકમ\s+બેક/gi, 'welcome back'],
  [/વિડિયો\s+ચેનલ/gi, 'video channel'],
  [/એઆઈ\s+ટૂલ્સ/gi, 'AI tools'],
  [/એઆઈ\s+ટૂલ/gi, 'AI tool'],
  [/લાઈક\s+અને\s+સબ્સ્ક્રાઇબ/gi, 'like and subscribe'],
  [/શેર\s+અને\s+સબ્સ્ક્રાઇબ/gi, 'share and subscribe'],
  [/થેન્ક\s+યુ\s+સો\s+મચ/gi, 'thank you so much'],
  [/થેન્ક\s+યુ/gi, 'thank you'],
  [/બાય\s+બાય/gi, 'bye bye'],

  // English/Latin multi-words casing normalization
  [/\bgst\s+returns?\b/gi, 'GST Return'],
  [/\bgst\s+invoices?\b/gi, 'GST Invoice'],
  [/\bgst\s+portal\b/gi, 'GST Portal'],
  [/\bgst\s+number\b/gi, 'GST Number'],
  [/\bgst\s+registration\b/gi, 'GST Registration'],
  [/\bgst\s+filing\b/gi, 'GST Filing'],
  [/\bgst\s+challan\b/gi, 'GST Challan'],
  [/\bgst\s+in\b/gi, 'GSTIN'],
  [/\bincome\s+tax\s+returns?\b/gi, 'Income Tax Return'],
  [/\bincome\s+tax\b/gi, 'Income Tax'],
  [/\btax\s+returns?\b/gi, 'Tax Return'],
  [/\btax\s+invoices?\b/gi, 'Tax Invoice'],
  [/\btax\s+audit\b/gi, 'Tax Audit'],
  [/\bitc\s+claims?\b/gi, 'ITC Claim'],
  [/\btds\s+returns?\b/gi, 'TDS Return'],
  [/\bhsn\s+codes?\b/gi, 'HSN code'],
  [/\bsac\s+codes?\b/gi, 'SAC code'],
  [/\bpremiere\s+pro\b/gi, 'Premiere Pro'],
  [/\bafter\s+effects\b/gi, 'After Effects'],
  [/\badobe\s+premiere\s+pro\b/gi, 'Adobe Premiere Pro'],
  [/\badobe\s+premiere\b/gi, 'Adobe Premiere'],
  [/\badobe\s+photoshop\b/gi, 'Adobe Photoshop'],
  [/\badobe\s+after\s+effects\b/gi, 'Adobe After Effects'],
  [/\badobe\s+illustrator\b/gi, 'Adobe Illustrator'],
  [/\bmicrosoft\s+excel\b/gi, 'Microsoft Excel'],
  [/\bmicrosoft\s+word\b/gi, 'Microsoft Word'],
  [/\bmicrosoft\s+powerpoint\b/gi, 'Microsoft PowerPoint'],
  [/\bmicrosoft\s+office\b/gi, 'Microsoft Office'],
  [/\bgoogle\s+chrome\b/gi, 'Google Chrome'],
  [/\bgoogle\s+gemini\b/gi, 'Google Gemini'],
  [/\bgoogle\s+drive\b/gi, 'Google Drive'],
  [/\byoutube\s+channel\b/gi, 'YouTube channel'],
  [/\byoutube\s+video\b/gi, 'YouTube video'],

  // Romanized phonetic multi-words
  [/\bvelakam\s+baik\s+too\s+aar\b/gi, 'welcome back to our'],
  [/\bvelakam\s+baik\s+to\s+our\b/gi, 'welcome back to our'],
  [/\bvelakam\s+baik\s+to\s+aar\b/gi, 'welcome back to our'],
  [/\bwelcome\s+back\s+too\s+aar\b/gi, 'welcome back to our'],
  [/\bwelcome\s+back\s+to\s+aar\b/gi, 'welcome back to our'],
  [/\bwelcome\s+back\s+too\s+our\b/gi, 'welcome back to our'],
  [/\bvelakam\s+baik\b/gi, 'welcome back'],
  [/\bwelkam\s+bak\b/gi, 'welcome back'],
  [/\btoo\s+aar\b/gi, 'to our'],
  [/\btoo\s+our\b/gi, 'to our'],
  [/\bai\s+tuls\b/gi, 'AI tools'],
  [/\bai\s+tools\b/gi, 'AI tools'],
  [/\bvidio\s+chenal\b/gi, 'video channel'],
  [/\bvideo\s+chenal\b/gi, 'video channel'],
  [/\blik\s+and\s+subskraib\b/gi, 'like and subscribe'],
  [/\blike\s+and\s+subskraib\b/gi, 'like and subscribe'],
  [/\bshare\s+and\s+subskraib\b/gi, 'share and subscribe'],
  [/\btenk\s+yu\b/gi, 'thank you'],
  [/\btenk\s+you\b/gi, 'thank you'],
];

export function normalizeEnglishWords(text: string): string {
  if (!text) return '';
  let str = text;

  // Step 1: Apply all multi-word normalizations
  for (const [regex, replacement] of CLIENT_MULTI_WORD_NORMALIZATIONS) {
    str = str.replace(regex, replacement);
  }

  function cleanToken(token: string): { lead: string; core: string; trail: string } {
    const match = token.match(/^([\s.,!?;:।|"'()\[\]\-]*)(.*?)([\s.,!?;:।|"'()\[\]\-]*)$/);
    if (!match) return { lead: '', core: token, trail: '' };
    return { lead: match[1], core: match[2], trail: match[3] };
  }

  // Word-level token normalization
  const words = str.split(/\s+/).filter(Boolean);
  const normalized = words.map((w) => {
    const { lead: leadPunct, core, trail } = cleanToken(w);
    if (!core) return w;

    // Convert danda to dot when attached to an English word
    const trailPunct = trail.replace(/।/g, '.').replace(/॥/g, '.');
    const lower = core.toLowerCase();

    // Dotted acronym check (e.g. g.s.t. -> GST, a.i. -> AI, p.d.f. -> PDF)
    const undotted = lower.replace(/\./g, '');
    if (CLIENT_STANDARD_CASING[undotted]) {
      return leadPunct + CLIENT_STANDARD_CASING[undotted] + trailPunct;
    }

    // Devanagari loanwords
    if (CLIENT_DEVA_ENGLISH_LOANWORDS[core]) {
      return leadPunct + CLIENT_DEVA_ENGLISH_LOANWORDS[core] + trailPunct;
    }
    // Devanagari plural stem matching
    if (/[\u0900-\u097F]/.test(core)) {
      const strippedPlural = core.replace(/(?:स|्स|ज़|्ज़|ज|्ज|ों)$/, '');
      if (strippedPlural && strippedPlural !== core && CLIENT_DEVA_ENGLISH_LOANWORDS[strippedPlural]) {
        const baseEng = CLIENT_DEVA_ENGLISH_LOANWORDS[strippedPlural];
        const plural = baseEng.endsWith('s') ? baseEng : `${baseEng}s`;
        return leadPunct + plural + trailPunct;
      }
      // Attached postpositions for Marathi/Hindi (जीएसटीला -> GST ला, जीएसटीचे -> GST चे, इनव्हॉइसचे -> Invoice चे)
      const postMatch = core.match(/^(.*?)(साठी|मध्ये|वरून|कडून|मुळे|ला|चे|चा|ची|ना|ने|वर|त|का|की|के|को|से|में|पर)$/);
      if (postMatch && postMatch[1] && CLIENT_DEVA_ENGLISH_LOANWORDS[postMatch[1]]) {
        const baseEng = CLIENT_DEVA_ENGLISH_LOANWORDS[postMatch[1]];
        return leadPunct + baseEng + ' ' + postMatch[2] + trailPunct;
      }
    }

    // Gujarati loanwords
    if (CLIENT_GUJ_ENGLISH_LOANWORDS[core]) {
      return leadPunct + CLIENT_GUJ_ENGLISH_LOANWORDS[core] + trailPunct;
    }
    // Gujarati plural stem matching
    if (/[\u0A80-\u0AFF]/.test(core)) {
      const strippedPlural = core.replace(/(?:સ|્સ|ઝ|્ઝ|ઓ)$/, '');
      if (strippedPlural && strippedPlural !== core && CLIENT_GUJ_ENGLISH_LOANWORDS[strippedPlural]) {
        const baseEng = CLIENT_GUJ_ENGLISH_LOANWORDS[strippedPlural];
        const plural = baseEng.endsWith('s') ? baseEng : `${baseEng}s`;
        return leadPunct + plural + trailPunct;
      }
      // Attached postpositions for Gujarati (જીએસટીનું -> GST નું, ઇનવોઇસમાં -> Invoice માં)
      const postMatchGuj = core.match(/^(.*?)(નું|નો|ની|ના|ને|માં|થી|પર|માટે|દ્વારા)$/);
      if (postMatchGuj && postMatchGuj[1] && CLIENT_GUJ_ENGLISH_LOANWORDS[postMatchGuj[1]]) {
        const baseEng = CLIENT_GUJ_ENGLISH_LOANWORDS[postMatchGuj[1]];
        return leadPunct + baseEng + ' ' + postMatchGuj[2] + trailPunct;
      }
    }

    // Phonetic corrections
    if (CLIENT_PHONETIC_CORRECTIONS[lower]) {
      return leadPunct + CLIENT_PHONETIC_CORRECTIONS[lower] + trailPunct;
    }
    if (CLIENT_STANDARD_CASING[lower]) {
      return leadPunct + CLIENT_STANDARD_CASING[lower] + trailPunct;
    }

    return w;
  });

  return normalized.join(' ');
}

/**
 * Enforce strictly 4 to 5 words on an entire array of subtitle cues
 */
export function enforceStrict4to5Words(cues: SubtitleCue[]): SubtitleCue[] {
  const result: SubtitleCue[] = [];
  for (const cue of cues) {
    const normalizedCue: SubtitleCue = {
      ...cue,
      text: normalizeEnglishWords(cue.text),
    };
    const split = splitCueIntoChunks(normalizedCue);
    result.push(...split);
  }
  return reindexCues(result);
}

/**
 * Re-index cue IDs to 1..N
 */
export function reindexCues(cues: SubtitleCue[]): SubtitleCue[] {
  return cues.map((cue, idx) => ({
    ...cue,
    id: idx + 1,
  }));
}

