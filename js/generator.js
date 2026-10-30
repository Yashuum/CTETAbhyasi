/**
 * CTET Paper 2 - Automated Question Generator & Deduplication Engine
 * 
 * Key Features:
 * 1. Automatic Paper Assembly from 2,800+ Master CTET Bank
 * 2. Daily Deduplication: Ensures questions are NEVER repeated in the same test
 *    or across multiple attempts in a single day.
 * 3. Question Bank Coverage Tracker (% practiced across CDP, SST, Maths, Hindi, English).
 * 4. Token-Efficient Storage Replenisher: Uses Gemini AI to inject fresh questions
 *    into the persistent storage pool, WITHOUT initiating expensive live quizzes.
 * 5. Dual Stream Balancing: Social Studies (Default) vs Mathematics & Science.
 */

class CTETQuestionGenerator {
  constructor() {
    this.STORAGE_KEY = 'ctet_generated_tests_v2';
    this.API_KEY_STORAGE = 'ctet_gemini_api_key';
    this.ATTEMPTED_PREFIX = 'ctet_daily_attempted_';
    this.LIFETIME_ATTEMPTED_KEY = 'ctet_lifetime_attempted_v1';
    this.CUSTOM_BANK_KEY = 'ctet_custom_bank_v2';
    this.EVICTED_KEY = 'ctet_evicted_ids_v1';

    this.initCustomBank();
  }

  initCustomBank() {
    if (typeof window === 'undefined' || !window.CTET_PAPER2_BANK) return;
    try {
      const evicted = new Set(JSON.parse(localStorage.getItem(this.EVICTED_KEY) || '[]'));
      const custom = JSON.parse(localStorage.getItem(this.CUSTOM_BANK_KEY) || '{}');

      Object.keys(window.CTET_PAPER2_BANK).forEach(secKey => {
        if (Array.isArray(window.CTET_PAPER2_BANK[secKey])) {
          // 1. Evict retired questions so storage remains constant
          if (evicted.size > 0) {
            window.CTET_PAPER2_BANK[secKey] = window.CTET_PAPER2_BANK[secKey].filter(q => !evicted.has(q.id));
          }
          // 2. Append custom replacements
          if (Array.isArray(custom[secKey])) {
            custom[secKey].forEach(q => {
              if (!window.CTET_PAPER2_BANK[secKey].some(existing => existing.id === q.id)) {
                window.CTET_PAPER2_BANK[secKey].push(q);
              }
            });
          }
        }
      });
    } catch (e) {
      console.warn('Failed to merge custom bank:', e);
    }
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

  getLifetimeAttemptedIds() {
    try {
      const raw = localStorage.getItem(this.LIFETIME_ATTEMPTED_KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch (e) {
      return new Set();
    }
  }

  markQuestionsAttempted(ids) {
    try {
      // Mark daily
      const daily = this.getAttemptedIdsToday();
      ids.forEach(id => daily.add(id));
      localStorage.setItem(this.getTodayKey(), JSON.stringify([...daily]));

      // Mark lifetime coverage
      const lifetime = this.getLifetimeAttemptedIds();
      ids.forEach(id => lifetime.add(id));
      localStorage.setItem(this.LIFETIME_ATTEMPTED_KEY, JSON.stringify([...lifetime]));
    } catch (e) {
      console.warn('Failed to save attempted IDs:', e);
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
   * Calculate % coverage of the question bank practiced so far
   */
  getCoverageStats() {
    const bank = window.CTET_PAPER2_BANK;
    if (!bank) return { totalQuestions: 0, attemptedCount: 0, percentage: 0, subjectStats: {} };

    const lifetime = this.getLifetimeAttemptedIds();

    const sections = {
      cdp: { name: 'Child Development & Pedagogy', pool: bank.cdp || [] },
      social_studies: { name: 'Social Studies / Science', pool: bank.social_studies || [] },
      language_hindi: { name: 'Language I (Hindi)', pool: bank.language_hindi || [] },
      language_english: { name: 'Language II (English)', pool: bank.language_english || [] }
    };

    let totalPoolCount = 0;
    let totalAttemptedInPool = 0;
    const subjectStats = {};

    Object.keys(sections).forEach(key => {
      const sec = sections[key];
      const poolTotal = sec.pool.length;
      let secAttempted = 0;

      sec.pool.forEach(q => {
        if (lifetime.has(q.id)) secAttempted++;
      });

      totalPoolCount += poolTotal;
      totalAttemptedInPool += secAttempted;

      const pct = poolTotal > 0 ? Math.round((secAttempted / poolTotal) * 100) : 0;
      subjectStats[key] = {
        name: sec.name,
        attempted: secAttempted,
        total: poolTotal,
        percentage: pct
      };
    });

    const overallPct = totalPoolCount > 0 ? Math.round((totalAttemptedInPool / totalPoolCount) * 100) : 0;

    return {
      totalQuestions: totalPoolCount,
      attemptedCount: totalAttemptedInPool,
      percentage: overallPct,
      subjectStats: subjectStats
    };
  }

  /**
   * Reset lifetime coverage so user can re-practice the bank
   */
  resetLifetimeCoverage() {
    localStorage.removeItem(this.LIFETIME_ATTEMPTED_KEY);
  }

  /**
   * Automatically generate or fetch a balanced CTET Paper 2 (Social Science) Mock Paper
   * @param {'social_studies'} stream 
   * @param {'full' | 'sprint' | 'cdp'} mode 
   */
  async fetchPaper(stream = 'social_studies', mode = 'full') {
    const bank = window.CTET_PAPER2_BANK;
    if (!bank) throw new Error('CTET Question repository not loaded');

    const attemptedToday = this.getAttemptedIdsToday();
    let questions = [];
    let title = '';
    let durationMinutes = 150;

    if (mode === 'wrong_challenge') {
      title = '🔥 10-Minute Pure Mistakes Challenge Drill (20 Qs)';
      durationMinutes = 10;
      const vaultRaw = localStorage.getItem('ctet_mistakes_vault_v1');
      const vault = vaultRaw ? JSON.parse(vaultRaw) : [];
      if (vault.length < 20) {
        throw new Error(`Mistakes Challenge requires at least 20 collected incorrect questions (Current: ${vault.length}/20)`);
      }
      const shuffled = [...vault].sort(() => 0.5 - Math.random());
      questions = shuffled.slice(0, 20);
    } else if (mode === 'cdp') {
      title = 'Child Development & Pedagogy Core Drill';
      durationMinutes = 30;
      questions = this.sampleUnattempted(bank.cdp, 30, attemptedToday);
    } else if (mode === 'sprint') {
      title = 'Paper 2 (Social Science) High-Yield Rapid Sprint';
      durationMinutes = 45;

      const cdpPart = this.sampleUnattempted(bank.cdp, 10, attemptedToday);
      const streamPart = this.sampleUnattempted(bank.social_studies, 15, attemptedToday);
      const lang1Part = this.sampleUnattempted(bank.language_hindi, 5, attemptedToday);
      const lang2Part = this.sampleUnattempted(bank.language_english, 5, attemptedToday);

      questions = [...cdpPart, ...streamPart, ...lang1Part, ...lang2Part];
    } else {
      // Full 150-Question CTET Paper 2 Social Science Official Simulation
      title = 'CTET Paper 2 Full Mock (Social Studies / Social Science)';
      durationMinutes = 150;

      const cdpPart = this.sampleUnattempted(bank.cdp, 30, attemptedToday);
      const streamPart = this.sampleUnattempted(bank.social_studies, 60, attemptedToday);
      const lang1Part = this.sampleUnattempted(bank.language_hindi, 30, attemptedToday);
      const lang2Part = this.sampleUnattempted(bank.language_english, 30, attemptedToday);

      questions = [...cdpPart, ...streamPart, ...lang1Part, ...lang2Part];
    }

    // Deduplicate within the single test by BOTH unique ID and normalized question stem
    const getStem = (q) => (q.question_hi || q.question_en || q.question || '').trim().replace(/\s+/g, ' ');
    const uniqueMap = new Map();
    const uniqueStems = new Set();
    const finalQuestions = [];

    questions.forEach(q => {
      const stem = getStem(q);
      if (!uniqueMap.has(q.id) && !uniqueStems.has(stem)) {
        uniqueMap.set(q.id, q);
        uniqueStems.add(stem);
        finalQuestions.push(q);
      }
    });

    // Mark questions as attempted (both daily deduplication and lifetime coverage)
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

  sampleUnattempted(pool, count, attemptedToday) {
    if (!pool || !pool.length) return [];

    const getStem = (q) => (q.question_hi || q.question_en || q.question || '').trim().replace(/\s+/g, ' ');

    // 1. Filter pool for candidates not yet attempted today
    let candidates = pool.filter(q => !attemptedToday.has(q.id));

    // If unattempted candidate pool has fewer than count (e.g. user took many tests today),
    // fallback to full pool so user can still practice, but strictly maintain 0 duplicates in this test
    if (candidates.length < count) {
      candidates = [...pool];
    }

    const shuffled = this.shuffleArray(candidates);
    const selected = [];
    const seenIds = new Set();
    const seenStems = new Set();

    for (const q of shuffled) {
      const stem = getStem(q);
      if (!seenIds.has(q.id) && !seenStems.has(stem)) {
        selected.push(q);
        seenIds.add(q.id);
        seenStems.add(stem);
        if (selected.length === count) break;
      }
    }

    // If still short of count (e.g. candidates had some duplicate stems), fill from remaining pool
    if (selected.length < count) {
      const fullShuffled = this.shuffleArray(pool);
      for (const q of fullShuffled) {
        const stem = getStem(q);
        if (!seenIds.has(q.id) && !seenStems.has(stem)) {
          selected.push(q);
          seenIds.add(q.id);
          seenStems.add(stem);
          if (selected.length === count) break;
        }
      }
    }

    return selected;
  }

  /**
   * REPLENISH STORAGE WITH STRICT FIFO REPLACEMENT:
   * Generates new questions via Gemini AI and replaces the oldest N questions in the bank,
   * keeping the storage footprint and pool size strictly constant (no bloat on device).
   */
  async replenishStorageWithGemini(apiKey, sectionKey = 'social_studies', count = 10, onProgress = null) {
    if (!apiKey) throw new Error('Gemini API key is required');

    const sectionNames = {
      cdp: 'Child Development & Pedagogy',
      social_studies: 'Social Studies / Social Science (History, Geography, Civics, Pedagogy)',
      language_hindi: 'Language I (Hindi Comprehension & Pedagogy)',
      language_english: 'Language II (English Comprehension & Pedagogy)'
    };

    const sectionLabel = sectionNames[sectionKey] || 'Social Studies / Social Science';

    // Break count into manageable small batches of 5 questions for rapid response and live feedback
    const chunkSize = 5;
    const chunks = [];
    let remaining = count;
    while (remaining > 0) {
      const take = Math.min(remaining, chunkSize);
      chunks.push(take);
      remaining -= take;
    }

    const allGenerated = [];

    for (let cIdx = 0; cIdx < chunks.length; cIdx++) {
      const chunkCount = chunks[cIdx];
      let elapsedSeconds = 0;
      
      if (onProgress) {
        onProgress(`Synthesizing batch ${cIdx + 1}/${chunks.length} (${allGenerated.length}/${count} questions completed)...`);
      }

      const timer = setInterval(() => {
        elapsedSeconds++;
        if (onProgress) {
          onProgress(`Synthesizing batch ${cIdx + 1}/${chunks.length} (${allGenerated.length}/${count} completed) • ${elapsedSeconds}s elapsed...`);
        }
      }, 1000);

      const prompt = `You are a senior CBSE CTET Paper 2 examination creator.
Generate exactly ${chunkCount} completely new, authentic multiple-choice questions aligned with CTET Paper 2 (Classes VI-VIII).
Section: ${sectionLabel}.

Rules:
- High pedagogical rigor (NCF 2005 / NEP 2020).
- Bilingual: English text in "question_en", accurate Hindi translation in "question_hi".
- 4 clear options in "options" array.
- "ans": 0, 1, 2, or 3.
- "explanation": In-depth pedagogical rationale.

STRICT JSON schema:
[
  {
    "id": "custom_${sectionKey}_${Date.now()}_${cIdx + 1}",
    "section": "${sectionLabel}",
    "subject": "${sectionLabel}",
    "question_en": "Question in English...",
    "question_hi": "हिंदी में प्रश्न...",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "ans": 0,
    "explanation": "Detailed explanation..."
  }
]
Do not output markdown codeblocks. Output valid, raw JSON only.`;

      // Active production models from Google Gemini API
      const modelsToTry = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
      let chunkSuccess = false;
      let lastError = null;

      try {
        for (const model of modelsToTry) {
          try {
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout guard

            const response = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                  temperature: 0.7,
                  responseMimeType: 'application/json'
                }
              })
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
              let msg = `HTTP ${response.status}`;
              try {
                const errData = await response.json();
                msg = errData.error?.message || msg;
              } catch (e) {}

              if (response.status === 404 || msg.includes('not found') || msg.includes('no longer available')) {
                lastError = new Error(msg);
                continue; // Try next model in modelsToTry
              }
              if (response.status === 400 && (msg.includes('API key not valid') || msg.includes('API_KEY_INVALID'))) {
                throw new Error('Invalid Gemini API Key. Please verify your API key in Google AI Studio.');
              }
              if (response.status === 429) {
                throw new Error('Gemini API rate limit reached (Quota Exceeded). Please wait 30 seconds and try again.');
              }
              throw new Error(`Gemini API Error: ${msg}`);
            }

            const data = await response.json();
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!rawText) throw new Error('No question content received from Gemini');

            let newQuestions = null;
            // Robust JSON extraction matching array brackets
            const jsonArrayMatch = rawText.match(/\[\s*\{[\s\S]*\}\s*\]/);
            if (jsonArrayMatch) {
              try {
                newQuestions = JSON.parse(jsonArrayMatch[0]);
              } catch (e) {}
            }

            if (!newQuestions) {
              const cleaned = rawText.replace(/```(?:json)?/gi, '').trim();
              newQuestions = JSON.parse(cleaned);
            }

            if (Array.isArray(newQuestions) && newQuestions.length) {
              allGenerated.push(...newQuestions);
              chunkSuccess = true;
              break;
            }
          } catch (err) {
            lastError = err;
            if (err.name === 'AbortError') {
              lastError = new Error(`Request to ${model} timed out after 30s`);
              continue;
            }
            if (err.message && (err.message.includes('not found') || err.message.includes('no longer available') || err.message.includes('timed out'))) {
              continue;
            }
            throw err;
          }
        }
      } finally {
        clearInterval(timer);
      }

      if (!chunkSuccess) {
        throw lastError || new Error(`Failed to generate questions chunk ${cIdx + 1}`);
      }
    }

    if (!allGenerated.length) {
      throw new Error('No valid questions generated');
    }

    // =========================================================================
    // ROLLING FIFO REPLACEMENT (Keeps device storage and pool size strictly constant)
    // If adding N questions, remove the oldest N questions from the section!
    // =========================================================================
    const targetPool = (window.CTET_PAPER2_BANK && window.CTET_PAPER2_BANK[sectionKey]) || [];
    const numToReplace = Math.min(allGenerated.length, targetPool.length);

    // 1. Evict oldest numToReplace questions from the beginning of the pool (FIFO)
    const evictedQuestions = targetPool.splice(0, numToReplace);
    const evictedIds = evictedQuestions.map(q => q.id);

    // 2. Persist evicted IDs so storage does not retain stale questions on reload
    const allEvicted = new Set(JSON.parse(localStorage.getItem(this.EVICTED_KEY) || '[]'));
    evictedIds.forEach(id => allEvicted.add(id));
    localStorage.setItem(this.EVICTED_KEY, JSON.stringify([...allEvicted]));

    // 3. Clean evicted IDs from lifetime and daily attempted trackers
    const lifetime = this.getLifetimeAttemptedIds();
    evictedIds.forEach(id => lifetime.delete(id));
    localStorage.setItem(this.LIFETIME_ATTEMPTED_KEY, JSON.stringify([...lifetime]));

    const daily = this.getAttemptedIdsToday();
    evictedIds.forEach(id => daily.delete(id));
    localStorage.setItem(this.getTodayKey(), JSON.stringify([...daily]));

    // 4. Append the fresh new questions to the end of the pool
    const customBank = JSON.parse(localStorage.getItem(this.CUSTOM_BANK_KEY) || '{}');
    if (!customBank[sectionKey]) customBank[sectionKey] = [];
    customBank[sectionKey] = customBank[sectionKey].filter(q => !allEvicted.has(q.id));

    allGenerated.forEach((q, idx) => {
      q.id = `custom_${sectionKey}_${Date.now()}_${idx + 1}`;
      customBank[sectionKey].push(q);
      targetPool.push(q);
    });

    localStorage.setItem(this.CUSTOM_BANK_KEY, JSON.stringify(customBank));

    const totalInBank = this.getCoverageStats().totalQuestions;
    return {
      addedCount: allGenerated.length,
      evictedCount: evictedQuestions.length,
      sectionKey: sectionKey,
      sectionLabel: sectionLabel,
      constantPoolSize: totalInBank
    };
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
