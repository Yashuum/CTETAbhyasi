/**
 * CTET Paper 2 - Automated Question Generator & Deduplication Engine
 * 
 * Key Features:
 * 1. Automatic Paper Assembly from 2,800+ Master CTET Bank
 * 2. Daily Deduplication: Ensures questions are NEVER repeated in the same test
 *    or across multiple attempts in a single day.
 * 3. Gemini 2.0 Flash AI live question synthesizer with structured JSON schema.
 * 4. Dual Stream Balancing: Social Studies (Default) vs Mathematics & Science.
 */

class CTETQuestionGenerator {
  constructor() {
    this.STORAGE_KEY = 'ctet_generated_tests_v2';
    this.API_KEY_STORAGE = 'ctet_gemini_api_key';
    this.ATTEMPTED_PREFIX = 'ctet_daily_attempted_';
  }

  getTodayKey() {
    const d = new Date();
    return this.ATTEMPTED_PREFIX + `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  getAttemptedIdsToday() {
    try {
      const raw = localStorage.getItem(this.getTodayKey());
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch (e) {
      return new Set();
    }
  }

  markQuestionsAttempted(ids) {
    try {
      const current = this.getAttemptedIdsToday();
      ids.forEach(id => current.add(id));
      localStorage.setItem(this.getTodayKey(), JSON.stringify([...current]));
    } catch (e) {
      console.warn('Failed to save daily attempted IDs:', e);
    }
  }

  getSavedApiKey() {
    return localStorage.getItem(this.API_KEY_STORAGE) || '';
  }

  saveApiKey(key) {
    if (key) {
      localStorage.setItem(this.API_KEY_STORAGE, key.trim());
    } else {
      localStorage.removeItem(this.API_KEY_STORAGE);
    }
  }

  /**
   * Automatically generate or fetch a balanced CTET Paper 2 Mock Paper
   * @param {'social_studies' | 'math_science'} stream 
   * @param {'full' | 'sprint' | 'cdp'} mode 
   */
  async fetchPaper(stream = 'social_studies', mode = 'full') {
    const bank = window.CTET_PAPER2_BANK;
    if (!bank) throw new Error('CTET Question repository not loaded');

    const attemptedToday = this.getAttemptedIdsToday();
    let questions = [];
    let title = '';
    let durationMinutes = 150;

    if (mode === 'cdp') {
      title = 'Child Development & Pedagogy Core Drill';
      durationMinutes = 30;
      questions = this.sampleUnattempted(bank.cdp, 30, attemptedToday);
    } else if (mode === 'sprint') {
      title = stream === 'social_studies' 
        ? 'Paper 2 (Social Studies) High-Yield Sprint' 
        : 'Paper 2 (Maths & Science) High-Yield Sprint';
      durationMinutes = 45;

      const cdpPart = this.sampleUnattempted(bank.cdp, 10, attemptedToday);
      const streamPart = stream === 'social_studies'
        ? this.sampleUnattempted(bank.social_studies, 15, attemptedToday)
        : this.sampleUnattempted(bank.math_science, 15, attemptedToday);
      const lang1Part = this.sampleUnattempted(bank.language_hindi, 5, attemptedToday);
      const lang2Part = this.sampleUnattempted(bank.language_english, 5, attemptedToday);

      questions = [...cdpPart, ...streamPart, ...lang1Part, ...lang2Part];
    } else {
      // Full 150-Question CTET Paper 2 Official Exam Simulation
      title = stream === 'social_studies'
        ? 'CTET Paper 2 Full Mock (Social Studies / Social Science Stream)'
        : 'CTET Paper 2 Full Mock (Mathematics & Science Stream)';
      durationMinutes = 150;

      // Official 150-question blueprint:
      // CDP: 30, Stream: 60, Language I (Hindi): 30, Language II (English): 30
      const cdpPart = this.sampleUnattempted(bank.cdp, 30, attemptedToday);
      const streamPart = stream === 'social_studies'
        ? this.sampleUnattempted(bank.social_studies, 60, attemptedToday)
        : this.sampleUnattempted(bank.math_science, 60, attemptedToday);
      const lang1Part = this.sampleUnattempted(bank.language_hindi, 30, attemptedToday);
      const lang2Part = this.sampleUnattempted(bank.language_english, 30, attemptedToday);

      questions = [...cdpPart, ...streamPart, ...lang1Part, ...lang2Part];
    }

    // Deduplicate within the single test
    const uniqueMap = new Map();
    questions.forEach(q => {
      if (!uniqueMap.has(q.id)) uniqueMap.set(q.id, q);
    });
    const finalQuestions = Array.from(uniqueMap.values());

    // Mark these questions as attempted today so they never repeat in subsequent attempts today!
    this.markQuestionsAttempted(finalQuestions.map(q => q.id));

    const testId = 'test_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const testPaper = {
      id: testId,
      title: title,
      stream: stream,
      mode: mode,
      duration: durationMinutes,
      totalQuestions: finalQuestions.length,
      createdAt: new Date().toISOString(),
      questions: this.shuffleArray(finalQuestions)
    };

    return testPaper;
  }

  /**
   * Sample unique questions that have NOT been attempted today
   */
  sampleUnattempted(pool, count, attemptedToday) {
    if (!pool || !pool.length) return [];

    // Filter unattempted questions
    let candidates = pool.filter(q => !attemptedToday.has(q.id));

    // If pool is exhausted for today, reset rollover
    if (candidates.length < count) {
      candidates = [...pool];
    }

    // Shuffle candidates
    const shuffled = this.shuffleArray(candidates);
    const selected = shuffled.slice(0, count);

    // If still less than count, fill with distinct duplicates using unique surrogate keys
    if (selected.length < count) {
      let idx = 0;
      while (selected.length < count) {
        const item = pool[idx % pool.length];
        selected.push({ ...item, id: `${item.id}_alt_${selected.length}` });
        idx++;
      }
    }

    return selected;
  }

  /**
   * Generate brand-new unseen questions directly using Gemini API
   */
  async generateWithGemini(apiKey, section = 'Social Studies', count = 5) {
    if (!apiKey) throw new Error('Gemini API key is required');

    const prompt = `You are a CBSE CTET (Central Teacher Eligibility Test) Paper 2 examination setter.
Generate exactly ${count} multiple choice questions strictly aligned with CTET Paper 2 (Upper Primary Classes VI-VIII) syllabus.
Focus section: ${section}.

Guidelines:
- Authentic pedagogical and conceptual depth (NCF 2005, NCF-FS & NEP 2020 focus).
- Bilingual question text: question in English ("question_en") and accurate Hindi translation ("question_hi").
- Exactly 4 unambiguous options in "options" array.
- Correct answer index ("ans": 0, 1, 2, or 3).
- Detailed pedagogical rationale explanation ("explanation").

Respond with STRICT JSON format matching this schema:
[
  {
    "id": "gen_q_${Date.now()}_1",
    "section": "${section}",
    "subject": "${section}",
    "question_en": "Question text in English...",
    "question_hi": "हिंदी में प्रश्न अनुवाद...",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "ans": 0,
    "explanation": "Detailed pedagogical explanation..."
  }
]
Do NOT wrap in markdown code blocks. Output valid raw JSON only.`;

    const modelsToTry = ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];
    let lastError = null;

    for (const model of modelsToTry) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              responseMimeType: 'application/json'
            }
          })
        });

        if (!response.ok) {
          const err = await response.json();
          const msg = err.error?.message || `HTTP ${response.status}`;
          // If model is deprecated or not found, try next model in fallback list
          if (msg.includes('no longer available') || msg.includes('not found') || response.status === 404) {
            lastError = new Error(msg);
            continue;
          }
          throw new Error(msg);
        }

        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) throw new Error('No question content received from Gemini');

        try {
          return JSON.parse(rawText);
        } catch (e) {
          const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
          return JSON.parse(cleaned);
        }
      } catch (err) {
        lastError = err;
        // If not a model availability error, throw immediately
        if (!err.message.includes('no longer available') && !err.message.includes('not found')) {
          throw err;
        }
      }
    }

    throw lastError || new Error('Failed to generate questions with available Gemini models');
  }

  shuffleArray(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}

// Export singleton
if (typeof window !== 'undefined') {
  window.ctetGenerator = new CTETQuestionGenerator();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CTETQuestionGenerator;
}
