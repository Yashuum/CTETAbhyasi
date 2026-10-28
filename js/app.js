/**
 * CTET Paper 2 Abhyasi - Core Application Logic
 * 
 * Includes:
 * - Exclusively Tailored for CTET Paper 2 (Social Science Stream)
 * - Dual-Layer Button Click Reliability (inline onclick + programmatic listeners)
 * - Cross-Device Fullscreen (Native Fullscreen API + Zero-Latency Simulated Mode)
 * - Slide-in Question Palette Drawer (prevents vertical scrolling on tablets & phones)
 * - Compact Zero-Scroll Question & Options Layout
 * - Screen Wake Lock API (keeps device screen awake only during active test)
 * - Persistent Candidate Name Locking & 3D Welcome Screen
 * - Pre-Test Countdown Modal with Safe Cancel Button
 * - Last 5 Attempts Dashboard with Subject-Wise Breakdown
 * - Exam Refresh Lock & Crash Recovery (restores mid-exam on reload)
 * - 100% Hindi Medium Question & Option Presentation on Exam Screen
 * - Clean English UI Shell, Topbar, Palette & Navigation
 * - 5-State Question Palette & Real-Time Warning Timer
 * - Chart.js Scorecard & Detailed Solution Review
 */

(function () {
  'use strict';

  // Application State
  let state = {
    isInitialized: false,
    currentStream: 'social_studies', // Exclusively Social Studies
    currentTest: null,
    currentIndex: 0,
    answers: {},       // { [qIndex]: optionIndex }
    marked: {},        // { [qIndex]: true }
    visited: {},       // { [qIndex]: true }
    timeRemaining: 0,
    timerInterval: null,
    inExam: false,
    candidateName: '',
    userAttempts: [],
    pendingTestPaper: null,
    cdTimer: null,
    paletteFilter: 'all', // 'all' | 'ans' | 'no' | 'mk'
    fontZoom: 'normal',   // 'small' | 'normal' | 'large'
    lastMistakes: []      // array of questions missed in last submitted test
  };

  // Screen Wake Lock Sentinel
  let wakeLockSentinel = null;

  // DOM Elements Cache
  const el = {};

  function cacheDomElements() {
    // Screens
    el.landingScreen = document.getElementById('landing-screen');
    el.examScreen = document.getElementById('exam-screen');
    el.resultScreen = document.getElementById('result-screen');

    // Name & Greetings
    el.namePromptModal = document.getElementById('name-prompt-modal');
    el.candidateNameInput = document.getElementById('candidate-name-input');
    el.btnSaveName = document.getElementById('btn-save-name');
    el.greeting3dModal = document.getElementById('greeting-3d-modal');
    el.greeting3dName = document.getElementById('greeting-3d-name');
    el.btnDismiss3d = document.getElementById('btn-dismiss-3d');
    el.userGreetingDisplay = document.getElementById('user-greeting-display');
    el.userNameSpan = document.getElementById('user-name-span');
    el.btnEditName = document.getElementById('btn-edit-name');

    // Theme Toggle
    el.themeToggle = document.getElementById('theme-toggle');

    // Pre-test countdown modal
    el.countdownModal = document.getElementById('countdown-modal');
    el.cdNum = document.getElementById('cd-num');
    el.cdTestTitle = document.getElementById('cd-test-title');
    el.cdTestMeta = document.getElementById('cd-test-meta');
    el.btnCancelCountdown = document.getElementById('btn-cancel-countdown');
    el.btnFastLaunch = document.getElementById('btn-fast-launch');

    // Attempts History
    el.attemptsContainer = document.getElementById('recent-attempts-list');
    el.emptyAttemptsMsg = document.getElementById('empty-attempts-msg');

    // Coverage Dashboard
    el.coveragePct = document.getElementById('coverage-percentage');
    el.coverageBar = document.getElementById('coverage-progress-bar');
    el.covCdp = document.getElementById('cov-cdp');
    el.covSst = document.getElementById('cov-sst');
    el.covHi = document.getElementById('cov-hi');
    el.covEn = document.getElementById('cov-en');
    el.covAlertBox = document.getElementById('coverage-alert-box');
    el.covAlertText = document.getElementById('coverage-alert-text');
    el.btnScrollReplenish = document.getElementById('btn-scroll-replenish');

    // AI Replenisher Controls
    el.apiKeyInput = document.getElementById('gemini-api-key');
    el.saveKeyBtn = document.getElementById('btn-save-key');
    el.replenishSectionSelect = document.getElementById('replenish-section-select');
    el.replenishCountSelect = document.getElementById('replenish-count-select');
    el.btnReplenishBank = document.getElementById('btn-replenish-bank');
    el.genStatus = document.getElementById('ai-gen-status');

    // Exam Top Bar
    el.examPaperTitle = document.getElementById('exam-paper-title');
    el.examPaperMeta = document.getElementById('exam-paper-meta');
    el.timerDisplay = document.getElementById('timer-display');
    el.sectionTabsContainer = document.getElementById('section-tabs');
    el.btnFullscreen = document.getElementById('btn-fullscreen');
    el.fsIcon = document.getElementById('fs-icon');
    el.fsText = document.getElementById('fs-text');
    el.btnTogglePalette = document.getElementById('btn-toggle-palette');

    // Question Area
    el.qNumberBadge = document.getElementById('q-number-badge');
    el.qMarksBadge = document.getElementById('q-marks-badge');
    el.qTextEn = document.getElementById('q-text-en');
    el.qTextHi = document.getElementById('q-text-hi');
    el.optionsList = document.getElementById('options-list');

    // Palette
    el.paletteSidebar = document.getElementById('palette-sidebar');
    el.paletteGrid = document.getElementById('palette-grid');
    el.paletteBackdrop = document.getElementById('palette-backdrop');
    el.btnClosePalette = document.getElementById('btn-close-palette');

    // Exam Footer Actions
    el.btnSaveNext = document.getElementById('btn-save-next');
    el.btnMarkReview = document.getElementById('btn-mark-review');
    el.btnClear = document.getElementById('btn-clear');
    el.btnPrev = document.getElementById('btn-prev');
    el.btnSubmit = document.getElementById('btn-submit-exam');

    // Submit Modal
    el.submitModal = document.getElementById('submit-modal');
    el.modalAnswered = document.getElementById('modal-answered');
    el.modalNotAnswered = document.getElementById('modal-not-answered');
    el.modalMarked = document.getElementById('modal-marked');
    el.modalNotVisited = document.getElementById('modal-not-visited');
    el.btnConfirmSubmit = document.getElementById('btn-confirm-submit');
    el.btnCancelSubmit = document.getElementById('btn-cancel-submit');

    // Results Dashboard
    el.resScore = document.getElementById('res-score');
    el.resTotal = document.getElementById('res-total');
    el.resAccuracy = document.getElementById('res-accuracy');
    el.resTimeTaken = document.getElementById('res-time-taken');
    el.resSectionBreakdown = document.getElementById('res-section-breakdown');
    el.solutionsContainer = document.getElementById('solutions-container');
    el.btnBackHome = document.getElementById('btn-back-home');
    el.toast = document.getElementById('toast');

    // Palette Filters (Point 1 Upgrade)
    el.palFltAll = document.getElementById('pal-flt-all');
    el.palFltAns = document.getElementById('pal-flt-ans');
    el.palFltNo = document.getElementById('pal-flt-no');
    el.palFltMk = document.getElementById('pal-flt-mk');
    el.cntFilterAll = document.getElementById('cnt-filter-all');
    el.cntFilterAns = document.getElementById('cnt-filter-ans');
    el.cntFilterNo = document.getElementById('cnt-filter-no');
    el.cntFilterMk = document.getElementById('cnt-filter-mk');

    // Font Zoom Controls (Point 1 Upgrade)
    el.btnZoomOut = document.getElementById('btn-zoom-out');
    el.btnZoomReset = document.getElementById('btn-zoom-reset');
    el.btnZoomIn = document.getElementById('btn-zoom-in');
    el.questionContainer = document.querySelector('.question-container');

    // Star Question (Point 2 Upgrade)
    el.btnStarQuestion = document.getElementById('btn-star-question');
    el.starIcon = document.getElementById('star-icon');
    el.starText = document.getElementById('star-text');
    el.btnOpenStarredModal = document.getElementById('btn-open-starred-modal');
    el.cntStarredTotal = document.getElementById('cnt-starred-total');
    el.starredModal = document.getElementById('starred-modal');
    el.starredListContainer = document.getElementById('starred-list-container');
    el.btnClearStarred = document.getElementById('btn-clear-starred');
    el.btnPracticeStarred = document.getElementById('btn-practice-starred');
    el.btnCloseStarredModal = document.getElementById('btn-close-starred-modal');

    // CTET Qualifying Cutoff Benchmark & Re-Test Mistakes (Point 2 Upgrade)
    el.cutoffStatusPill = document.getElementById('cutoff-status-pill');
    el.cutoffProgressFill = document.getElementById('cutoff-progress-fill');
    el.cutoffVerdictMsg = document.getElementById('cutoff-verdict-msg');
    el.btnRetestMistakes = document.getElementById('btn-retest-mistakes');
    el.mistakesCountBadge = document.getElementById('mistakes-count-badge');
  }

  // Active Exam Session Key for Refresh Lock & Crash Recovery
  const ACTIVE_SESSION_KEY = 'ctet_active_exam_session_v1';

  // Initialize Application (Guaranteed Safe Multi-Entry)
  function init() {
    if (state.isInitialized) return;
    state.isInitialized = true;

    cacheDomElements();
    setupTheme();
    loadCandidateName();
    initFontZoom();
    initPaletteFilters();
    updateStarredUI();
    setupEventListeners();
    setupRefreshLock();
    setupVisibilityWakeLock();
    loadRecentAttempts();
    updateCoverageUI();

    // Check and restore active test session if user refreshed mid-exam!
    checkAndRestoreActiveSession();
  }

  // ==========================================
  // Screen Wake Lock API (Keep Screen Awake during Test)
  // ==========================================
  async function requestWakeLock() {
    if (!('wakeLock' in navigator)) return;
    try {
      if (wakeLockSentinel === null && state.inExam) {
        wakeLockSentinel = await navigator.wakeLock.request('screen');
        wakeLockSentinel.addEventListener('release', () => {
          wakeLockSentinel = null;
        });
      }
    } catch (err) {
      console.warn('Screen Wake Lock notice:', err.name, err.message);
    }
  }

  async function releaseWakeLock() {
    if (wakeLockSentinel !== null) {
      try {
        await wakeLockSentinel.release();
        wakeLockSentinel = null;
      } catch (err) {
        console.warn('Screen Wake Lock release notice:', err);
      }
    }
  }

  function setupVisibilityWakeLock() {
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible' && state.inExam) {
        await requestWakeLock();
      }
    });
  }

  // ==========================================
  // Cross-Device Fullscreen (Native + Fallback Simulated Mode)
  // ==========================================
  function toggleFullscreen() {
    const docEl = document.documentElement;
    const isNativeFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
    const isSimulatedFs = document.body.classList.contains('simulated-fullscreen');

    if (isNativeFs || isSimulatedFs) {
      // Exit fullscreen
      try {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
          document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen();
        }
      } catch (e) {}

      document.body.classList.remove('simulated-fullscreen');
      updateFullscreenBtn(false);
      showToast('Exited Fullscreen mode');
    } else {
      // Enter fullscreen
      let requested = false;
      try {
        if (docEl.requestFullscreen) {
          docEl.requestFullscreen().then(() => {
            updateFullscreenBtn(true);
          }).catch(() => {
            enableSimulatedFullscreen();
          });
          requested = true;
        } else if (docEl.webkitRequestFullscreen) {
          docEl.webkitRequestFullscreen();
          updateFullscreenBtn(true);
          requested = true;
        } else if (docEl.mozRequestFullScreen) {
          docEl.mozRequestFullScreen();
          updateFullscreenBtn(true);
          requested = true;
        } else if (docEl.msRequestFullscreen) {
          docEl.msRequestFullscreen();
          updateFullscreenBtn(true);
          requested = true;
        }
      } catch (err) {
        console.warn('Native fullscreen error, falling back:', err);
      }

      if (!requested) {
        enableSimulatedFullscreen();
      }
    }
  }

  function enableSimulatedFullscreen() {
    document.body.classList.add('simulated-fullscreen');
    window.scrollTo(0, 1);
    updateFullscreenBtn(true);
    showToast('⛶ Expanded Screen Mode Active');
  }

  function updateFullscreenBtn(forceState) {
    const isFs = typeof forceState === 'boolean' 
      ? forceState 
      : !!(document.fullscreenElement || document.webkitFullscreenElement || document.body.classList.contains('simulated-fullscreen'));
    
    if (el.fsIcon && el.fsText) {
      if (isFs) {
        el.fsIcon.textContent = '🗗';
        el.fsText.textContent = 'Exit Fullscreen';
        if (el.btnFullscreen) el.btnFullscreen.title = 'Exit Fullscreen';
      } else {
        el.fsIcon.textContent = '⛶';
        el.fsText.textContent = 'Fullscreen';
        if (el.btnFullscreen) el.btnFullscreen.title = 'Enter Fullscreen';
      }
    }
  }

  // ==========================================
  // Question Palette Drawer Management (Tablets & Mobile)
  // ==========================================
  function togglePalette(forceState) {
    if (!el.examScreen) return;
    if (typeof forceState === 'boolean') {
      if (forceState) {
        el.examScreen.classList.add('palette-open');
      } else {
        el.examScreen.classList.remove('palette-open');
      }
    } else {
      el.examScreen.classList.toggle('palette-open');
    }
  }

  // ==========================================
  // Font Size Zoom Controller (Point 1 Upgrade)
  // ==========================================
  function initFontZoom() {
    const saved = localStorage.getItem('ctet_font_zoom') || 'normal';
    setFontZoom(saved, false);

    if (el.btnZoomOut) el.btnZoomOut.addEventListener('click', () => setFontZoom('small'));
    if (el.btnZoomReset) el.btnZoomReset.addEventListener('click', () => setFontZoom('normal'));
    if (el.btnZoomIn) el.btnZoomIn.addEventListener('click', () => setFontZoom('large'));
  }

  function setFontZoom(level, notify = true) {
    state.fontZoom = level;
    try { localStorage.setItem('ctet_font_zoom', level); } catch (e) {}

    const qc = el.questionContainer || document.querySelector('.question-container');
    if (qc) {
      qc.classList.remove('font-zoom-small', 'font-zoom-normal', 'font-zoom-large');
      qc.classList.add(`font-zoom-${level}`);
    }

    [el.btnZoomOut, el.btnZoomReset, el.btnZoomIn].forEach(btn => {
      if (btn) btn.classList.remove('btn-zoom-active');
    });

    if (level === 'small' && el.btnZoomOut) el.btnZoomOut.classList.add('btn-zoom-active');
    if (level === 'normal' && el.btnZoomReset) el.btnZoomReset.classList.add('btn-zoom-active');
    if (level === 'large' && el.btnZoomIn) el.btnZoomIn.classList.add('btn-zoom-active');

    if (notify) {
      const lbl = level === 'small' ? 'Compact (90%)' : (level === 'large' ? 'Large (115%)' : 'Normal (100%)');
      showToast(`🔍 Font zoom set to ${lbl}`);
    }
  }

  // ==========================================
  // Question Palette Status Filters (Point 1 Upgrade)
  // ==========================================
  function initPaletteFilters() {
    const filterBtns = [
      { btn: el.palFltAll, type: 'all' },
      { btn: el.palFltAns, type: 'ans' },
      { btn: el.palFltNo, type: 'no' },
      { btn: el.palFltMk, type: 'mk' }
    ];

    filterBtns.forEach(({ btn, type }) => {
      if (btn) {
        btn.addEventListener('click', () => applyPaletteFilter(type));
      }
    });
  }

  function applyPaletteFilter(filterType) {
    state.paletteFilter = filterType;

    const btns = [
      { btn: el.palFltAll, type: 'all' },
      { btn: el.palFltAns, type: 'ans' },
      { btn: el.palFltNo, type: 'no' },
      { btn: el.palFltMk, type: 'mk' }
    ];
    btns.forEach(({ btn, type }) => {
      if (btn) {
        if (type === filterType) btn.classList.add('active');
        else btn.classList.remove('active');
      }
    });

    if (!el.paletteGrid) return;
    const palButtons = el.paletteGrid.children;
    for (let i = 0; i < palButtons.length; i++) {
      const btn = palButtons[i];
      const isAnswered = state.answers[i] !== undefined;
      const isMarked = !!state.marked[i];
      let visible = true;

      if (filterType === 'ans') {
        visible = isAnswered;
      } else if (filterType === 'no') {
        visible = !isAnswered;
      } else if (filterType === 'mk') {
        visible = isMarked;
      } else {
        visible = true; // 'all'
      }

      btn.style.display = visible ? '' : 'none';
    }
  }

  function updatePaletteCounts() {
    if (!state.currentTest) return;
    const total = state.currentTest.totalQuestions;
    let ansCount = 0;
    let markedCount = 0;

    for (let i = 0; i < total; i++) {
      if (state.answers[i] !== undefined) ansCount++;
      if (state.marked[i]) markedCount++;
    }
    const notAnsCount = total - ansCount;

    if (el.cntFilterAll) el.cntFilterAll.textContent = total;
    if (el.cntFilterAns) el.cntFilterAns.textContent = ansCount;
    if (el.cntFilterNo) el.cntFilterNo.textContent = Math.max(0, notAnsCount);
    if (el.cntFilterMk) el.cntFilterMk.textContent = markedCount;
  }

  // ==========================================
  // Starred / Bookmarked Questions (Point 2 Upgrade)
  // ==========================================
  const STARRED_STORAGE_KEY = 'ctet_starred_questions_v1';

  function getStarredQuestions() {
    try {
      return JSON.parse(localStorage.getItem(STARRED_STORAGE_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveStarredQuestions(list) {
    try {
      localStorage.setItem(STARRED_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Failed to save starred questions:', e);
    }
  }

  function getQuestionKey(q) {
    if (!q) return '';
    if (q.id) return String(q.id);
    return (q.section || '') + '::' + (q.question_hi || q.question_en || q.question || '').slice(0, 60);
  }

  function isQuestionStarred(q) {
    if (!q) return false;
    const key = getQuestionKey(q);
    const starred = getStarredQuestions();
    return starred.some(item => getQuestionKey(item) === key);
  }

  function toggleStarQuestion(q, notify = true) {
    if (!q) return false;
    const key = getQuestionKey(q);
    let starred = getStarredQuestions();
    const exists = starred.some(item => getQuestionKey(item) === key);
    let isNowStarred = false;

    if (exists) {
      starred = starred.filter(item => getQuestionKey(item) !== key);
      isNowStarred = false;
      if (notify) showToast('☆ Question removed from Starred bookmarks');
    } else {
      starred.unshift({
        id: q.id || `q_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        section: q.section || 'General',
        subject: q.subject || '',
        question_hi: q.question_hi || q.question || '',
        question_en: q.question_en || q.question || '',
        question: q.question || q.question_hi || '',
        options: q.options || [],
        ans: q.ans,
        explanation: q.explanation || '',
        starredAt: Date.now()
      });
      isNowStarred = true;
      if (notify) showToast('⭐ Question added to Starred bookmarks!');
    }

    saveStarredQuestions(starred);
    updateStarredUI();
    updateStarQuestionBtn();
    return isNowStarred;
  }

  function updateStarQuestionBtn() {
    if (!el.btnStarQuestion || !state.currentTest) return;
    const curQ = state.currentTest.questions[state.currentIndex];
    if (!curQ) return;
    const starred = isQuestionStarred(curQ);

    if (starred) {
      el.btnStarQuestion.classList.add('starred');
      if (el.starIcon) el.starIcon.textContent = '⭐';
      if (el.starText) el.starText.textContent = 'Starred';
    } else {
      el.btnStarQuestion.classList.remove('starred');
      if (el.starIcon) el.starIcon.textContent = '☆';
      if (el.starText) el.starText.textContent = 'Star';
    }
  }

  function updateStarredUI() {
    const count = getStarredQuestions().length;
    if (el.cntStarredTotal) el.cntStarredTotal.textContent = count;
  }

  function openStarredModal() {
    updateStarredUI();
    renderStarredList();
    if (el.starredModal) el.starredModal.classList.add('active');
  }

  function closeStarredModal() {
    if (el.starredModal) el.starredModal.classList.remove('active');
  }

  function clearAllStarred() {
    const starred = getStarredQuestions();
    if (!starred.length) {
      showToast('Starred list is already empty.');
      return;
    }
    if (confirm('Are you sure you want to clear all starred questions?')) {
      saveStarredQuestions([]);
      updateStarredUI();
      renderStarredList();
      updateStarQuestionBtn();
      showToast('🗑️ All starred questions cleared.');
    }
  }

  function practiceStarredQuestions() {
    const starred = getStarredQuestions();
    if (!starred.length) {
      alert('You have no starred questions yet! Click the "⭐ Star" button during mock tests or solutions review to save questions for focused practice.');
      return;
    }
    closeStarredModal();

    const testPaper = {
      title: `⭐ Starred Questions Practice Drill (${starred.length} Qs)`,
      totalQuestions: starred.length,
      duration: Math.max(5, Math.ceil(starred.length * 1)),
      questions: JSON.parse(JSON.stringify(starred)),
      mode: 'starred'
    };

    launchExam(testPaper);
    showToast(`🎯 Launching Starred Questions Drill with ${starred.length} questions!`);
  }

  function renderStarredList() {
    if (!el.starredListContainer) return;
    const list = getStarredQuestions();

    if (!list.length) {
      el.starredListContainer.innerHTML = `
        <div style="text-align: center; color: var(--mt); padding: 36px 16px;">
          <div style="font-size: 32px; margin-bottom: 8px;">⭐</div>
          <div style="font-weight: 700; margin-bottom: 4px;">No Starred Questions Yet</div>
          <p style="font-size: 13px;">Click the <strong>"☆ Star"</strong> button on any question during test practice or inside the solution review to save questions you want to revise later.</p>
        </div>
      `;
      if (el.btnPracticeStarred) el.btnPracticeStarred.disabled = true;
      return;
    }

    if (el.btnPracticeStarred) el.btnPracticeStarred.disabled = false;
    el.starredListContainer.innerHTML = '';

    list.forEach((q, idx) => {
      const card = document.createElement('div');
      card.className = 'solution-card';
      card.style.background = 'rgba(255, 255, 255, 0.03)';
      card.style.border = '1px solid rgba(255, 255, 255, 0.08)';
      card.style.padding = '14px';

      const optChar = String.fromCharCode(65 + q.ans);
      const correctOptText = (q.options && q.options[q.ans]) ? q.options[q.ans] : '';

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
          <span style="font-size:11.5px; font-weight:800; color: #38BDF8; background: rgba(56, 189, 248, 0.12); padding: 3px 8px; border-radius: 4px;">
            ${q.section || 'General'}
          </span>
          <button class="btn-sol-star starred" data-key="${getQuestionKey(q)}" type="button" title="Remove from Starred">
            ✕ Remove
          </button>
        </div>
        <div style="font-weight:700; margin:10px 0 8px; font-size:14px; line-height: 1.5;">
          ${idx + 1}. ${q.question_hi || q.question_en}
        </div>
        <div style="font-size:12.5px; color:#4ADE80; background:rgba(34, 197, 94, 0.1); padding:8px 10px; border-radius:6px; margin-bottom:8px;">
          Correct Answer: <strong>(${optChar}) ${correctOptText}</strong>
        </div>
        <div style="font-size:12px; color:var(--mt); line-height:1.45;">
          <strong>Explanation:</strong> ${q.explanation || 'CTET Paper 2 Standard question.'}
        </div>
      `;

      const rmBtn = card.querySelector('.btn-sol-star');
      if (rmBtn) {
        rmBtn.addEventListener('click', () => {
          toggleStarQuestion(q, true);
          renderStarredList();
        });
      }

      el.starredListContainer.appendChild(card);
    });
  }

  // ==========================================
  // Persistent Active Session (Refresh Lock & Crash Recovery)
  // ==========================================
  function persistActiveSession() {
    if (!state.inExam || !state.currentTest) return;
    try {
      const payload = {
        currentTest: state.currentTest,
        currentIndex: state.currentIndex,
        answers: state.answers,
        marked: state.marked,
        visited: state.visited,
        timeRemaining: state.timeRemaining,
        currentStream: 'social_studies',
        lastSavedTimestamp: Date.now(),
        inExam: true
      };
      localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('Failed to persist exam session:', e);
    }
  }

  function clearActiveSession() {
    try {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    } catch (e) {}
  }

  function checkAndRestoreActiveSession() {
    try {
      const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
      if (!raw) return false;
      const session = JSON.parse(raw);
      if (!session || !session.inExam || !session.currentTest) return false;

      const elapsed = Math.floor((Date.now() - (session.lastSavedTimestamp || Date.now())) / 1000);
      const remainingTime = Math.max(1, (session.timeRemaining || 0) - elapsed);

      // Restore full state
      state.inExam = true;
      state.currentTest = session.currentTest;
      state.currentIndex = typeof session.currentIndex === 'number' ? session.currentIndex : 0;
      state.answers = session.answers || {};
      state.marked = session.marked || {};
      state.visited = session.visited || { 0: true };
      state.timeRemaining = remainingTime;
      state.currentStream = 'social_studies';

      // Setup Exam Top Bar
      if (el.examPaperTitle) el.examPaperTitle.textContent = state.currentTest.title;
      if (el.examPaperMeta) el.examPaperMeta.textContent = `${state.currentTest.totalQuestions} Questions • ${state.currentTest.duration} Minutes • 1 Mark Each`;

      // Hide landing and activate exam screen directly
      if (el.landingScreen) el.landingScreen.style.display = 'none';
      if (el.examScreen) el.examScreen.classList.add('active');

      // Rebuild tabs, palette and render question
      buildSectionTabs();
      renderPalette();
      renderCurrentQuestion();

      // Start / resume live timer
      startTimer();

      // Acquire screen wake lock
      requestWakeLock();

      showToast('⚡ Exam session restored! Your answers, time, and progress are intact.');
      return true;
    } catch (e) {
      console.warn('Failed to restore active exam session:', e);
      return false;
    }
  }

  // Dark Mode is Default
  function setupTheme() {
    if (!el.themeToggle) return;
    const isLight = localStorage.getItem('ctet_light_mode') === '1';
    if (isLight) {
      document.body.classList.add('light-mode');
      el.themeToggle.textContent = '🌙 Dark';
    } else {
      document.body.classList.remove('light-mode');
      el.themeToggle.textContent = '☀️ Light';
    }

    el.themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('light-mode');
      const nowLight = document.body.classList.contains('light-mode');
      localStorage.setItem('ctet_light_mode', nowLight ? '1' : '0');
      el.themeToggle.textContent = nowLight ? '🌙 Dark' : '☀️ Light';
    });
  }

  // Candidate Name Locking & 3D Greeting
  function loadCandidateName() {
    const savedName = localStorage.getItem('ctet_candidate_name');
    if (savedName) {
      state.candidateName = savedName;
      renderCandidateGreeting();
    } else {
      // First time launch -> prompt name
      setTimeout(() => {
        if (el.namePromptModal) {
          el.namePromptModal.classList.add('active');
          if (el.candidateNameInput) el.candidateNameInput.focus();
        }
      }, 400);
    }

    // Load saved API key if any
    if (window.ctetGenerator) {
      const savedKey = window.ctetGenerator.getSavedApiKey();
      if (savedKey && el.apiKeyInput) el.apiKeyInput.value = savedKey;
    }
  }

  function renderCandidateGreeting() {
    if (el.userNameSpan && state.candidateName) {
      el.userNameSpan.textContent = state.candidateName;
      if (el.userGreetingDisplay) el.userGreetingDisplay.style.display = 'inline-flex';
    }
  }

  function promptSaveName() {
    if (!el.candidateNameInput) return;
    const name = el.candidateNameInput.value.trim();
    if (!name) {
      alert('Please enter your full name to personalize your CTET Paper 2 portal.');
      return;
    }
    state.candidateName = name;
    localStorage.setItem('ctet_candidate_name', name);
    if (el.namePromptModal) el.namePromptModal.classList.remove('active');
    renderCandidateGreeting();

    // Trigger 3D Greeting Modal
    if (el.greeting3dName) el.greeting3dName.textContent = name;
    if (el.greeting3dModal) el.greeting3dModal.classList.add('active');
  }

  // Setup Event Listeners (Dual Registration: addEventListener + inline onclick backups)
  function setupEventListeners() {
    // Name save
    if (el.btnSaveName) el.btnSaveName.addEventListener('click', promptSaveName);
    if (el.candidateNameInput) {
      el.candidateNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') promptSaveName();
      });
    }
    if (el.btnDismiss3d) {
      el.btnDismiss3d.addEventListener('click', () => {
        if (el.greeting3dModal) el.greeting3dModal.classList.remove('active');
      });
    }
    if (el.btnEditName) {
      el.btnEditName.addEventListener('click', () => {
        if (el.candidateNameInput) el.candidateNameInput.value = state.candidateName;
        if (el.namePromptModal) {
          el.namePromptModal.classList.add('active');
          if (el.candidateNameInput) el.candidateNameInput.focus();
        }
      });
    }

    // Save API key
    if (el.saveKeyBtn) {
      el.saveKeyBtn.addEventListener('click', () => {
        const val = el.apiKeyInput ? el.apiKeyInput.value.trim() : '';
        if (window.ctetGenerator) window.ctetGenerator.saveApiKey(val);
        showToast(val ? '✅ Gemini API Key saved!' : 'API Key cleared.');
      });
    }

    // AI Storage Replenisher
    if (el.btnReplenishBank) el.btnReplenishBank.addEventListener('click', handleReplenishBank);
    if (el.btnScrollReplenish) {
      el.btnScrollReplenish.addEventListener('click', () => {
        const target = document.getElementById('replenish-section');
        if (target) target.scrollIntoView({ behavior: 'smooth' });
      });
    }

    // Pre-test Countdown modal buttons
    if (el.btnCancelCountdown) el.btnCancelCountdown.addEventListener('click', cancelTestCountdown);
    if (el.btnFastLaunch) el.btnFastLaunch.addEventListener('click', fastLaunchExam);

    // Fullscreen Toggle Buttons & Change Events
    if (el.btnFullscreen) {
      el.btnFullscreen.addEventListener('click', toggleFullscreen);
    }
    document.addEventListener('fullscreenchange', () => updateFullscreenBtn());
    document.addEventListener('webkitfullscreenchange', () => updateFullscreenBtn());
    document.addEventListener('mozfullscreenchange', () => updateFullscreenBtn());
    document.addEventListener('MSFullscreenChange', () => updateFullscreenBtn());

    // Palette Drawer Toggles
    if (el.btnTogglePalette) el.btnTogglePalette.addEventListener('click', () => togglePalette());
    if (el.btnClosePalette) el.btnClosePalette.addEventListener('click', () => togglePalette(false));
    if (el.paletteBackdrop) el.paletteBackdrop.addEventListener('click', () => togglePalette(false));

    // Delegated click handler on palette grid for instantaneous, reliable response
    if (el.paletteGrid) {
      el.paletteGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('.pal-btn');
        if (!btn) return;
        const idx = parseInt(btn.dataset.idx, 10);
        if (!isNaN(idx)) {
          jumpToQuestion(idx);
          togglePalette(false);
        }
      });
    }

    // Star Question in CBT Toolbar
    if (el.btnStarQuestion) {
      el.btnStarQuestion.addEventListener('click', () => {
        if (state.currentTest && state.currentTest.questions) {
          const curQ = state.currentTest.questions[state.currentIndex];
          if (curQ) toggleStarQuestion(curQ, true);
        }
      });
    }

    // Starred Modal Controls
    if (el.btnOpenStarredModal) el.btnOpenStarredModal.addEventListener('click', openStarredModal);
    if (el.btnCloseStarredModal) el.btnCloseStarredModal.addEventListener('click', closeStarredModal);
    if (el.btnClearStarred) el.btnClearStarred.addEventListener('click', clearAllStarred);
    if (el.btnPracticeStarred) el.btnPracticeStarred.addEventListener('click', practiceStarredQuestions);
    if (el.starredModal) {
      el.starredModal.addEventListener('click', (e) => {
        if (e.target === el.starredModal) closeStarredModal();
      });
    }

    // Re-Test Mistakes Drill
    if (el.btnRetestMistakes) el.btnRetestMistakes.addEventListener('click', retestMistakes);

    // Exam footer navigation buttons
    if (el.btnSaveNext) el.btnSaveNext.addEventListener('click', onSaveAndNext);
    if (el.btnMarkReview) el.btnMarkReview.addEventListener('click', onMarkForReview);
    if (el.btnClear) el.btnClear.addEventListener('click', onClearResponse);
    if (el.btnPrev) el.btnPrev.addEventListener('click', onPrevQuestion);
    if (el.btnSubmit) el.btnSubmit.addEventListener('click', showSubmitModal);

    // Submit Modal buttons
    if (el.btnCancelSubmit) el.btnCancelSubmit.addEventListener('click', cancelSubmitModal);
    if (el.btnConfirmSubmit) el.btnConfirmSubmit.addEventListener('click', confirmSubmitExam);

    // Back to Home from Results
    if (el.btnBackHome) el.btnBackHome.addEventListener('click', backToHome);

    // Keyboard Shortcuts for desktop/laptop power users
    document.addEventListener('keydown', (e) => {
      if (!state.inExam || el.submitModal?.classList.contains('active')) return;
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        onSaveAndNext();
      } else if (e.key === 'ArrowLeft') {
        onPrevQuestion();
      } else if (e.key === ' ' || e.key === 'm' || e.key === 'M') {
        onMarkForReview();
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        const optIdx = parseInt(e.key, 10) - 1;
        state.answers[state.currentIndex] = optIdx;
        renderCurrentQuestion();
        updatePaletteItem(state.currentIndex);
        persistActiveSession();
      } else if (['a', 'b', 'c', 'd', 'A', 'B', 'C', 'D'].includes(e.key)) {
        const charCode = e.key.toUpperCase().charCodeAt(0);
        const optIdx = charCode - 65;
        state.answers[state.currentIndex] = optIdx;
        renderCurrentQuestion();
        updatePaletteItem(state.currentIndex);
        persistActiveSession();
      }
    });
  }

  // Refresh Lock: Warn candidate & persist state continuously
  function setupRefreshLock() {
    window.addEventListener('beforeunload', (e) => {
      if (state.inExam) {
        persistActiveSession();
        e.preventDefault();
        e.returnValue = 'CTET Exam is currently in progress! If you reload, your exam will resume right here.';
        return e.returnValue;
      }
    });
  }

  // Global launcher with 5-second countdown & cancel protection
  window.startMockTest = async function (mode) {
    init(); // Ensure initialization
    showToast('⏳ Assembling CTET Social Science paper...');
    try {
      if (!window.ctetGenerator) throw new Error('Generator engine not initialized');
      const testPaper = await window.ctetGenerator.fetchPaper('social_studies', mode);
      state.pendingTestPaper = testPaper;
      openPreTestCountdown(testPaper);
    } catch (err) {
      alert('Error fetching test: ' + err.message);
    }
  };

  // Pre-test countdown modal
  function openPreTestCountdown(testPaper) {
    if (!el.countdownModal) return;
    el.cdTestTitle.textContent = testPaper.title;
    el.cdTestMeta.textContent = `${testPaper.totalQuestions} Questions • ${testPaper.duration} Minutes • Social Science`;

    el.countdownModal.classList.add('active');

    let count = 5;
    el.cdNum.textContent = count;
    el.cdNum.style.color = 'var(--sf)';

    clearInterval(state.cdTimer);
    state.cdTimer = setInterval(() => {
      count--;
      if (count > 0) {
        el.cdNum.textContent = count;
      } else {
        el.cdNum.textContent = 'GO!';
        el.cdNum.style.color = '#22C55E';
        clearInterval(state.cdTimer);
        setTimeout(() => {
          el.countdownModal.classList.remove('active');
          launchExam(state.pendingTestPaper);
        }, 600);
      }
    }, 1000);
  }

  function fastLaunchExam() {
    clearInterval(state.cdTimer);
    if (el.countdownModal) el.countdownModal.classList.remove('active');
    if (state.pendingTestPaper) {
      launchExam(state.pendingTestPaper);
    }
  }

  function cancelTestCountdown() {
    clearInterval(state.cdTimer);
    state.pendingTestPaper = null;
    clearActiveSession();
    releaseWakeLock();
    if (el.countdownModal) el.countdownModal.classList.remove('active');
    showToast('Test cancelled. No attempt recorded.');
  }

  // Launch Exam Environment
  function launchExam(testPaper) {
    init(); // Guard
    state.inExam = true;
    state.currentTest = testPaper;
    state.currentIndex = 0;
    state.answers = {};
    state.marked = {};
    state.visited = { 0: true };
    state.timeRemaining = testPaper.duration * 60;

    // Populate Top Bar (In English)
    if (el.examPaperTitle) el.examPaperTitle.textContent = testPaper.title;
    if (el.examPaperMeta) el.examPaperMeta.textContent = `${testPaper.totalQuestions} Questions • ${testPaper.duration} Minutes • 1 Mark Each`;

    // Switch Screens
    if (el.landingScreen) el.landingScreen.style.display = 'none';
    if (el.examScreen) {
      el.examScreen.classList.add('active');
      el.examScreen.classList.remove('palette-open');
    }

    // Acquire Screen Wake Lock so screen never goes to sleep during exam
    requestWakeLock();

    // Build Tabs & Palette
    buildSectionTabs();
    renderPalette();
    renderCurrentQuestion();
    applyPaletteFilter('all');
    updatePaletteCounts();

    // Start Real-Time Timer
    startTimer();

    // Save initial state immediately
    persistActiveSession();
  }

  // Timer Management
  function startTimer() {
    clearInterval(state.timerInterval);
    updateTimerDisplay();

    state.timerInterval = setInterval(() => {
      state.timeRemaining--;
      updateTimerDisplay();

      // Persist active state every 5 seconds for zero loss on reload
      if (state.timeRemaining % 5 === 0) {
        persistActiveSession();
      }

      if (state.timeRemaining <= 0) {
        clearInterval(state.timerInterval);
        showToast('⏰ Time expired! Submitting test automatically...');
        finalizeTest();
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    if (!el.timerDisplay) return;
    const mins = Math.floor(state.timeRemaining / 60);
    const secs = state.timeRemaining % 60;
    el.timerDisplay.textContent = 
      `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    if (state.timeRemaining <= 300) {
      el.timerDisplay.classList.add('warning');
    } else {
      el.timerDisplay.classList.remove('warning');
    }
  }

  // Section Tabs
  function buildSectionTabs() {
    if (!el.sectionTabsContainer || !state.currentTest) return;
    const questions = state.currentTest.questions;
    const sections = [...new Set(questions.map(q => q.section))];

    el.sectionTabsContainer.innerHTML = '';
    sections.forEach((sec, idx) => {
      const count = questions.filter(q => q.section === sec).length;
      const tab = document.createElement('button');
      tab.className = `sec-tab ${idx === 0 ? 'active' : ''}`;
      tab.type = 'button';
      tab.innerHTML = `${sec} <span class="count">${count}</span>`;
      tab.addEventListener('click', () => {
        const firstSecIdx = questions.findIndex(q => q.section === sec);
        if (firstSecIdx !== -1) {
          jumpToQuestion(firstSecIdx);
        }
      });
      el.sectionTabsContainer.appendChild(tab);
    });
  }

  function updateActiveSectionTab() {
    if (!el.sectionTabsContainer || !state.currentTest) return;
    const curQ = state.currentTest.questions[state.currentIndex];
    if (!curQ) return;
    const tabs = el.sectionTabsContainer.querySelectorAll('.sec-tab');
    tabs.forEach(tab => {
      if (tab.textContent.includes(curQ.section)) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
  }

  // Render Question (English format for English subject; Hindi for CDP, SST, Hindi)
  function renderCurrentQuestion() {
    if (!state.currentTest || !state.currentTest.questions) return;
    const q = state.currentTest.questions[state.currentIndex];
    if (!q) return;

    state.visited[state.currentIndex] = true;

    // Badge question number
    if (el.qNumberBadge) {
      el.qNumberBadge.textContent = `Question ${state.currentIndex + 1} of ${state.currentTest.totalQuestions}`;
    }
    
    // Check if current question is Language II (English)
    const isEnglishSection = q.section === 'Language II (English)' || q.section === 'Language II' || (state.currentTest.mode === 'full' && state.currentIndex >= 120);

    // Medium Badge update
    const badgeEl = document.querySelector('.q-badge-hindi');
    if (badgeEl) {
      if (isEnglishSection) {
        badgeEl.textContent = '🇬🇧 English Language & Pedagogy';
        badgeEl.style.background = 'rgba(56, 189, 248, 0.15)';
        badgeEl.style.borderColor = 'rgba(56, 189, 248, 0.4)';
        badgeEl.style.color = '#38BDF8';
      } else {
        badgeEl.textContent = '🇮🇳 Hindi Medium';
        badgeEl.style.background = 'rgba(239, 68, 68, 0.15)';
        badgeEl.style.borderColor = 'rgba(239, 68, 68, 0.35)';
        badgeEl.style.color = '#FCA5A5';
      }
    }

    // Question stem: English for English subject, Hindi for others
    if (el.qTextHi) {
      el.qTextHi.textContent = (isEnglishSection ? (q.question_en || q.question_hi || q.question) : (q.question_hi || q.question_en || q.question)) || '';
      el.qTextHi.style.display = 'block';
    }
    if (el.qTextEn) {
      el.qTextEn.style.display = 'none';
    }

    // Render Options
    if (el.optionsList) {
      el.optionsList.innerHTML = '';
      const selectedAns = state.answers[state.currentIndex];

      (q.options || []).forEach((optText, optIdx) => {
        const optItem = document.createElement('div');
        optItem.className = `option-item ${selectedAns === optIdx ? 'selected' : ''}`;
        
        const charCode = String.fromCharCode(65 + optIdx);
        optItem.innerHTML = `
          <div class="option-key">${charCode}</div>
          <div class="option-text">${optText}</div>
        `;

        optItem.addEventListener('click', () => {
          state.answers[state.currentIndex] = optIdx;
          renderCurrentQuestion();
          updatePaletteItem(state.currentIndex);
          persistActiveSession();
        });

        el.optionsList.appendChild(optItem);
      });
    }

    updateActiveSectionTab();
    updatePaletteCurrent();
    updateStarQuestionBtn();
    persistActiveSession();
  }

  // Question Palette Logic
  function renderPalette() {
    if (!el.paletteGrid || !state.currentTest) return;
    el.paletteGrid.innerHTML = '';
    const total = state.currentTest.questions.length;

    const frag = document.createDocumentFragment();
    for (let i = 0; i < total; i++) {
      const btn = document.createElement('button');
      btn.className = `pal-btn ${getPaletteStatusClass(i)} ${i === state.currentIndex ? 'current' : ''}`;
      btn.type = 'button';
      btn.textContent = i + 1;
      btn.dataset.idx = String(i);
      frag.appendChild(btn);
    }
    el.paletteGrid.appendChild(frag);
    applyPaletteFilter(state.paletteFilter || 'all');
    updatePaletteCounts();
  }

  function updatePaletteCurrent() {
    if (!el.paletteGrid) return;
    const btns = el.paletteGrid.children;
    for (let i = 0; i < btns.length; i++) {
      if (i === state.currentIndex) {
        btns[i].classList.add('current');
      } else {
        btns[i].classList.remove('current');
      }
    }
  }

  function updatePaletteItem(idx) {
    if (!el.paletteGrid) return;
    const btns = el.paletteGrid.children;
    if (btns[idx]) {
      btns[idx].className = `pal-btn ${getPaletteStatusClass(idx)} ${idx === state.currentIndex ? 'current' : ''}`;
      // Respect active palette filter
      if (state.paletteFilter && state.paletteFilter !== 'all') {
        const isAns = state.answers[idx] !== undefined;
        const isMk = !!state.marked[idx];
        let visible = true;
        if (state.paletteFilter === 'ans') visible = isAns;
        else if (state.paletteFilter === 'no') visible = !isAns;
        else if (state.paletteFilter === 'mk') visible = isMk;
        btns[idx].style.display = visible ? '' : 'none';
      }
    }
    updatePaletteCounts();
  }

  function getPaletteStatusClass(idx) {
    const isAnswered = state.answers[idx] !== undefined;
    const isMarked = state.marked[idx];
    const isVisited = state.visited[idx];

    if (isAnswered && isMarked) return 'pal-mka';
    if (isMarked) return 'pal-mk';
    if (isAnswered) return 'pal-ans';
    if (isVisited) return 'pal-no';
    return 'pal-nv';
  }

  function jumpToQuestion(idx) {
    if (idx < 0 || !state.currentTest || idx >= state.currentTest.totalQuestions) return;
    const prevIdx = state.currentIndex;
    state.currentIndex = idx;
    updatePaletteItem(prevIdx);
    renderCurrentQuestion();
    updatePaletteItem(idx);
    persistActiveSession();
  }

  // Navigation Debounce Guard (prevents double skipping e.g. 4 -> 6)
  let lastNavTimestamp = 0;
  function isDebounced() {
    const now = Date.now();
    if (now - lastNavTimestamp < 260) return true;
    lastNavTimestamp = now;
    return false;
  }

  // Footer Actions
  function onSaveAndNext() {
    if (isDebounced()) return;
    if (state.marked[state.currentIndex] && state.answers[state.currentIndex] !== undefined) {
      delete state.marked[state.currentIndex];
    }
    updatePaletteItem(state.currentIndex);
    persistActiveSession();
    nextQuestion();
  }

  function onMarkForReview() {
    if (isDebounced()) return;
    state.marked[state.currentIndex] = true;
    updatePaletteItem(state.currentIndex);
    persistActiveSession();
    nextQuestion();
  }

  function onClearResponse() {
    delete state.answers[state.currentIndex];
    delete state.marked[state.currentIndex];
    renderCurrentQuestion();
    updatePaletteItem(state.currentIndex);
    persistActiveSession();
  }

  function onPrevQuestion() {
    if (isDebounced()) return;
    if (state.currentIndex > 0) {
      const prevIdx = state.currentIndex;
      state.currentIndex--;
      updatePaletteItem(prevIdx);
      renderCurrentQuestion();
      updatePaletteItem(state.currentIndex);
      persistActiveSession();
    }
  }

  function nextQuestion() {
    if (state.currentIndex < state.currentTest.totalQuestions - 1) {
      const prevIdx = state.currentIndex;
      state.currentIndex++;
      updatePaletteItem(prevIdx);
      renderCurrentQuestion();
      updatePaletteItem(state.currentIndex);
      persistActiveSession();
    } else {
      showToast('You have reached the final question. Click "Submit Exam" when ready.');
    }
  }

  // Submit Modal
  function showSubmitModal() {
    if (!state.currentTest || !el.submitModal) return;
    const total = state.currentTest.totalQuestions;
    let ansCount = 0;
    let markedCount = 0;
    let notVisitedCount = 0;

    for (let i = 0; i < total; i++) {
      if (state.answers[i] !== undefined) ansCount++;
      if (state.marked[i]) markedCount++;
      if (!state.visited[i]) notVisitedCount++;
    }

    const notAnsCount = total - ansCount - notVisitedCount;

    if (el.modalAnswered) el.modalAnswered.textContent = ansCount;
    if (el.modalNotAnswered) el.modalNotAnswered.textContent = Math.max(0, notAnsCount);
    if (el.modalMarked) el.modalMarked.textContent = markedCount;
    if (el.modalNotVisited) el.modalNotVisited.textContent = notVisitedCount;

    el.submitModal.classList.add('active');
  }

  function cancelSubmitModal() {
    if (el.submitModal) el.submitModal.classList.remove('active');
  }

  function confirmSubmitExam() {
    if (el.submitModal) el.submitModal.classList.remove('active');
    finalizeTest();
  }

  // Finalize & Calculate Results
  function finalizeTest() {
    state.inExam = false; // Turn off refresh lock
    clearActiveSession();
    releaseWakeLock(); // Release screen wake lock
    clearInterval(state.timerInterval);
    if (el.examScreen) el.examScreen.classList.remove('active');

    const questions = state.currentTest.questions;
    let score = 0;
    let correct = 0;
    let wrong = 0;
    let unattempted = 0;

    const sectionStats = {};

    questions.forEach((q, idx) => {
      const userAns = state.answers[idx];
      const sec = q.section || 'General';

      if (!sectionStats[sec]) {
        sectionStats[sec] = { total: 0, correct: 0, wrong: 0, unattempted: 0 };
      }
      sectionStats[sec].total++;

      if (userAns === undefined) {
        unattempted++;
        sectionStats[sec].unattempted++;
      } else if (userAns === q.ans) {
        score++;
        correct++;
        sectionStats[sec].correct++;
      } else {
        wrong++;
        sectionStats[sec].wrong++;
      }
    });

    const totalQ = questions.length;
    const attempted = correct + wrong;
    const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
    const timeSpentSeconds = (state.currentTest.duration * 60) - Math.max(0, state.timeRemaining);
    const minsTaken = Math.floor(timeSpentSeconds / 60);
    const secsTaken = timeSpentSeconds % 60;

    // Render Results
    if (el.resScore) el.resScore.textContent = score;
    if (el.resTotal) el.resTotal.textContent = totalQ;
    if (el.resAccuracy) el.resAccuracy.textContent = accuracy + '%';
    if (el.resTimeTaken) el.resTimeTaken.textContent = `${minsTaken}m ${secsTaken}s`;

    // Render Section Breakdown
    if (el.resSectionBreakdown) {
      el.resSectionBreakdown.innerHTML = '';
      Object.keys(sectionStats).forEach(secName => {
        const stat = sectionStats[secName];
        const secRow = document.createElement('div');
        secRow.style.cssText = 'display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--bd);font-size:13px;';
        secRow.innerHTML = `
          <span style="font-weight:700">${secName}</span>
          <span>${stat.correct} / ${stat.total} (${Math.round((stat.correct/stat.total)*100)}%)</span>
        `;
        el.resSectionBreakdown.appendChild(secRow);
      });
    }

    // Render Chart
    renderResultChart(correct, wrong, unattempted);

    // Render Solutions
    renderSolutionsReview(questions);

    // Extract Mistakes for Focused Re-Test Drill (Point 2 Upgrade)
    const mistakes = [];
    questions.forEach((q, idx) => {
      const userAns = state.answers[idx];
      if (userAns !== q.ans) {
        mistakes.push(q);
      }
    });
    state.lastMistakes = mistakes;

    if (el.mistakesCountBadge) el.mistakesCountBadge.textContent = mistakes.length;
    if (el.btnRetestMistakes) {
      if (mistakes.length > 0) {
        el.btnRetestMistakes.style.display = 'inline-flex';
        el.btnRetestMistakes.disabled = false;
      } else {
        el.btnRetestMistakes.style.display = 'none';
      }
    }

    // Render Official CTET Cutoff Benchmark Meter (Point 2 Upgrade)
    renderCutoffBenchmark(score, totalQ);

    // Save Attempt to localStorage (Keep last 5 attempts)
    saveAttemptRecord({
      testTitle: state.currentTest.title,
      stream: 'social_studies',
      score: score,
      total: totalQ,
      accuracy: accuracy,
      sectionStats: sectionStats,
      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    });

    // Update Question Bank Coverage
    updateCoverageUI();

    if (el.resultScreen) el.resultScreen.classList.add('active');
  }

  // Save Attempt to localStorage (Max 5 items)
  function saveAttemptRecord(record) {
    try {
      const current = JSON.parse(localStorage.getItem('ctet_attempts_v2') || '[]');
      current.unshift(record);
      // Retain strictly the last 5 attempts
      const trimmed = current.slice(0, 5);
      localStorage.setItem('ctet_attempts_v2', JSON.stringify(trimmed));
    } catch (e) {
      console.warn('Failed to save attempt record:', e);
    }
  }

  // Load and Render Last 5 Attempts on Homepage
  function loadRecentAttempts() {
    try {
      const attempts = JSON.parse(localStorage.getItem('ctet_attempts_v2') || '[]');
      if (!el.attemptsContainer || !el.emptyAttemptsMsg) return;

      if (!attempts.length) {
        el.attemptsContainer.innerHTML = '';
        el.emptyAttemptsMsg.style.display = 'block';
        return;
      }

      el.emptyAttemptsMsg.style.display = 'none';
      el.attemptsContainer.innerHTML = '';

      attempts.forEach((att) => {
        const row = document.createElement('div');
        row.className = 'attempt-card-row';

        const isQualified = att.total >= 150 ? (att.score >= 90) : (att.accuracy >= 60);
        const passBadge = isQualified 
          ? `<span class="pass-status qualified">✅ Qualified (60%+)</span>`
          : `<span class="pass-status unqualified">Attempted</span>`;

        // Render subject breakdown tags
        let subTagsHtml = '';
        if (att.sectionStats) {
          Object.keys(att.sectionStats).forEach(sName => {
            const shortName = sName.includes('Child') ? 'CDP' : (sName.includes('Social') ? 'Social Studies' : (sName.includes('Hindi') ? 'Hindi' : 'English'));
            const s = att.sectionStats[sName];
            subTagsHtml += `<span class="sub-tag">${shortName}: <strong>${s.correct}/${s.total}</strong></span>`;
          });
        }

        row.innerHTML = `
          <div class="attempt-meta">
            <h4>${att.testTitle}</h4>
            <span>📅 ${att.date} • Social Studies Stream</span>
            <div class="subject-breakdown-tags" style="margin-top:6px;">
              ${subTagsHtml}
            </div>
          </div>
          <div class="attempt-score-badge">
            <div class="score-val">${att.score} / ${att.total}</div>
            <div style="font-size:12px;color:var(--mt);">${att.accuracy}% Accuracy</div>
            ${passBadge}
          </div>
        `;

        el.attemptsContainer.appendChild(row);
      });

    } catch (e) {
      console.warn('Error loading attempts:', e);
    }
  }

  // Chart rendering via Chart.js
  let resultChartInstance = null;
  function renderResultChart(correct, wrong, unattempted) {
    const canvas = document.getElementById('results-doughnut-chart');
    if (!canvas || typeof Chart === 'undefined') return;

    if (resultChartInstance) {
      resultChartInstance.destroy();
    }

    resultChartInstance = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Correct', 'Incorrect', 'Unattempted'],
        datasets: [{
          data: [correct, wrong, unattempted],
          backgroundColor: ['#10B981', '#EF4444', '#64748B'],
          borderWidth: 2,
          borderColor: '#141B26'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 }, color: '#E2E8F0' } }
        },
        cutout: '70%'
      }
    });
  }

  // Render Solutions Review (Hindi for CDP, SST, Hindi; authentic English for Language II)
  function renderSolutionsReview(questions) {
    if (!el.solutionsContainer) return;
    el.solutionsContainer.innerHTML = '';

    questions.forEach((q, idx) => {
      const userAns = state.answers[idx];
      const isCorrect = userAns === q.ans;
      const isUnanswered = userAns === undefined;

      const card = document.createElement('div');
      const statusClass = isUnanswered ? 'unanswered' : (isCorrect ? 'correct' : 'wrong');
      card.className = `solution-card ${statusClass}`;

      const badgeText = isUnanswered 
        ? '⚠️ Unattempted' 
        : (isCorrect ? '✅ Correct' : '❌ Incorrect');

      const userOptChar = userAns !== undefined ? String.fromCharCode(65 + userAns) : 'None';
      const correctOptChar = String.fromCharCode(65 + q.ans);

      const userOptText = (userAns !== undefined && q.options && q.options[userAns]) ? q.options[userAns] : 'No option selected';
      const correctOptText = (q.options && q.options[q.ans]) ? q.options[q.ans] : '';

      const isStarred = isQuestionStarred(q);
      const isEnglishSec = q.section === 'Language II (English)' || q.section === 'Language II';
      const questionText = (isEnglishSec ? (q.question_en || q.question_hi || q.question) : (q.question_hi || q.question_en || q.question)) || '';

      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="sol-badge ${statusClass}">${badgeText}</span>
            <span style="font-size:12px;color:var(--mt);font-weight:600;">${q.section} • ${q.subject || ''}</span>
          </div>
          <button class="btn-sol-star ${isStarred ? 'starred' : ''}" type="button" title="Bookmark / Star this question for later practice">
            ${isStarred ? '⭐ Starred' : '☆ Star'}
          </button>
        </div>
        <div style="font-weight:700;margin:10px 0;line-height:1.6;font-size:15px;">
          Question ${idx + 1}. ${questionText}
        </div>
        
        <div style="font-size:13px;display:flex;flex-direction:column;gap:6px;margin-bottom:12px;background:var(--bg);padding:10px 12px;border-radius:8px;">
          <div>Your Answer: <strong style="${isCorrect ? 'color:#4ADE80;' : (isUnanswered ? 'color:var(--mt);' : 'color:#EF4444;')}">(${userOptChar}) ${userOptText}</strong></div>
          <div style="color:#4ADE80;">Correct Answer: <strong>(${correctOptChar}) ${correctOptText}</strong></div>
        </div>

        <div class="sol-explanation">
          <strong>💡 Pedagogical Explanation (शैक्षणिक व्याख्या):</strong><br/>
          ${q.explanation || 'Based on CBSE CTET curriculum standards and NEP 2020 guidelines.'}
        </div>
      `;

      const starBtn = card.querySelector('.btn-sol-star');
      if (starBtn) {
        starBtn.addEventListener('click', () => {
          const nowStarred = toggleStarQuestion(q, true);
          if (nowStarred) {
            starBtn.classList.add('starred');
            starBtn.textContent = '⭐ Starred';
          } else {
            starBtn.classList.remove('starred');
            starBtn.textContent = '☆ Star';
          }
        });
      }

      el.solutionsContainer.appendChild(card);
    });
  }

  // ==========================================
  // Re-Test Mistakes Drill (Point 2 Upgrade)
  // ==========================================
  function retestMistakes() {
    if (!state.lastMistakes || state.lastMistakes.length === 0) {
      showToast('🎉 Outstanding! You had no mistakes to re-test.');
      return;
    }

    const count = state.lastMistakes.length;
    const testPaper = {
      title: `🔁 Mistakes Re-Test Drill (${count} Qs)`,
      totalQuestions: count,
      duration: Math.max(5, Math.ceil(count * 1)),
      questions: JSON.parse(JSON.stringify(state.lastMistakes)),
      mode: 'mistakes'
    };

    if (el.resultScreen) el.resultScreen.classList.remove('active');
    launchExam(testPaper);
    showToast(`🎯 Launching Re-Test Drill with ${count} missed questions! Master them now.`);
  }

  // ==========================================
  // CBSE CTET Official Qualifying Benchmark Meter (Point 2 Upgrade)
  // ==========================================
  function renderCutoffBenchmark(score, totalQ) {
    if (!el.cutoffStatusPill || !el.cutoffProgressFill || !el.cutoffVerdictMsg) return;

    const pct = totalQ > 0 ? Math.round((score / totalQ) * 100) : 0;
    const widthPct = Math.min(100, Math.max(0, pct));
    el.cutoffProgressFill.style.width = widthPct + '%';

    // Benchmark criteria:
    // Full mock is 150 marks:
    // General: 60% = 90 marks
    // Reserved (OBC / SC / ST / PwD): 55% = 82 marks
    const obcCutoffMarks = totalQ === 150 ? 82 : Math.ceil(Math.round(totalQ * 55) / 100);
    const genCutoffMarks = totalQ === 150 ? 90 : Math.ceil(Math.round(totalQ * 60) / 100);

    el.cutoffStatusPill.className = 'cutoff-status-pill';

    if (score >= genCutoffMarks) {
      el.cutoffStatusPill.classList.add('qualified-gen');
      el.cutoffStatusPill.textContent = '✅ QUALIFIED (General & Reserved)';
      el.cutoffVerdictMsg.innerHTML = `
        🎉 <strong>Outstanding Achievement!</strong> You scored <strong>${score} / ${totalQ} (${pct}%)</strong>, safely surpassing both the <strong>General Cutoff (${genCutoffMarks} marks / 60%)</strong> and <strong>Reserved Cutoff (${obcCutoffMarks} marks / 55%)</strong>. You are in prime condition for the official CBSE CTET Paper 2 examination!
      `;
    } else if (score >= obcCutoffMarks) {
      el.cutoffStatusPill.classList.add('qualified-obc');
      el.cutoffStatusPill.textContent = '👍 QUALIFIED (OBC / SC / ST)';
      el.cutoffVerdictMsg.innerHTML = `
        👍 <strong>Qualified for Reserved Categories!</strong> You scored <strong>${score} / ${totalQ} (${pct}%)</strong>, clearing the qualifying cutoff for OBC / SC / ST / PwD (minimum <strong>${obcCutoffMarks} marks / 55%</strong>). Push for <strong>${genCutoffMarks - score} more marks</strong> to clear the General category cutoff (${genCutoffMarks} marks) as well!
      `;
    } else {
      el.cutoffStatusPill.classList.add('not-qualified');
      el.cutoffStatusPill.textContent = '❌ NOT QUALIFIED (< 55%)';
      const neededForObc = obcCutoffMarks - score;
      const neededForGen = genCutoffMarks - score;
      el.cutoffVerdictMsg.innerHTML = `
        📚 <strong>Needs Revision.</strong> You scored <strong>${score} / ${totalQ} (${pct}%)</strong>. CTET qualification requires minimum <strong>${obcCutoffMarks} marks (55%)</strong> for OBC/SC/ST (${neededForObc} marks away) or <strong>${genCutoffMarks} marks (60%)</strong> for General (${neededForGen} marks away). Use the <strong>"Re-Test My Mistakes"</strong> drill below to master the questions you missed!
      `;
    }
  }

  // Update Question Bank Coverage UI (Social Science Pool)
  function updateCoverageUI() {
    if (!window.ctetGenerator || !el.coveragePct || !el.coverageBar) return;
    const stats = window.ctetGenerator.getCoverageStats();

    el.coveragePct.textContent = stats.percentage + '%';
    el.coverageBar.style.width = stats.percentage + '%';

    const sub = stats.subjectStats;
    if (sub.cdp && el.covCdp) el.covCdp.textContent = `${sub.cdp.attempted}/${sub.cdp.total} (${sub.cdp.percentage}%)`;
    if (sub.social_studies && el.covSst) el.covSst.textContent = `${sub.social_studies.attempted}/${sub.social_studies.total} (${sub.social_studies.percentage}%)`;
    if (sub.language_hindi && el.covHi) el.covHi.textContent = `${sub.language_hindi.attempted}/${sub.language_hindi.total} (${sub.language_hindi.percentage}%)`;
    if (sub.language_english && el.covEn) el.covEn.textContent = `${sub.language_english.attempted}/${sub.language_english.total} (${sub.language_english.percentage}%)`;

    if (el.covAlertBox && el.covAlertText) {
      if (stats.percentage >= 70) {
        el.covAlertBox.style.display = 'flex';
        el.covAlertText.innerHTML = `🏆 <strong>Outstanding Coverage!</strong> You have practiced <strong>${stats.percentage}%</strong> (${stats.attemptedCount} / ${stats.totalQuestions}) of the entire Social Science question bank.`;
      } else if (stats.percentage >= 30) {
        el.covAlertBox.style.display = 'flex';
        el.covAlertText.innerHTML = `💪 <strong>Strong Progress!</strong> You have covered <strong>${stats.percentage}%</strong> (${stats.attemptedCount} / ${stats.totalQuestions}) of the question bank.`;
      } else {
        el.covAlertBox.style.display = 'none';
      }
    }
  }

  // AI Bank Storage Replenisher (Rolling FIFO Replacement - Zero Extra Storage)
  async function handleReplenishBank() {
    if (!el.apiKeyInput) return;
    const key = el.apiKeyInput.value.trim();
    if (!key) {
      alert('Please enter your Gemini API key in the field to replenish questions.');
      el.apiKeyInput.focus();
      return;
    }

    const sectionKey = el.replenishSectionSelect ? el.replenishSectionSelect.value : 'social_studies';
    const count = el.replenishCountSelect ? parseInt(el.replenishCountSelect.value, 10) : 10;

    if (el.genStatus) el.genStatus.textContent = `🤖 Asking Gemini 3.8 Flash to synthesize ${count} new questions...`;
    if (el.btnReplenishBank) el.btnReplenishBank.disabled = true;

    try {
      const res = await window.ctetGenerator.replenishStorageWithGemini(
        key, 
        sectionKey, 
        count, 
        (progressMsg) => {
          if (el.genStatus) el.genStatus.textContent = `🤖 ${progressMsg}`;
        }
      );
      
      if (el.genStatus) el.genStatus.textContent = `✅ Replaced ${res.evictedCount} oldest questions with ${res.addedCount} fresh questions in ${res.sectionLabel}! Pool size remains steady at ${res.constantPoolSize} questions (zero extra space used).`;
      showToast(`🔄 Replaced ${res.addedCount} questions in storage!`);
      
      updateCoverageUI();

    } catch (err) {
      if (el.genStatus) el.genStatus.textContent = '❌ Replenishment error: ' + err.message;
    } finally {
      if (el.btnReplenishBank) el.btnReplenishBank.disabled = false;
    }
  }

  function backToHome() {
    releaseWakeLock();
    if (el.resultScreen) el.resultScreen.classList.remove('active');
    if (el.landingScreen) el.landingScreen.style.display = 'block';
    loadRecentAttempts();
    updateCoverageUI();
  }

  // Toast Notification
  function showToast(msg) {
    if (!el.toast) return;
    el.toast.textContent = msg;
    el.toast.style.display = 'block';
    setTimeout(() => {
      if (el.toast) el.toast.style.display = 'none';
    }, 3500);
  }

  // ==========================================
  // EXPOSE GLOBAL HANDLERS FOR UNBREAKABLE INLINE CLICK FALLBACKS
  // ==========================================
  window.onSaveAndNext = onSaveAndNext;
  window.onMarkForReview = onMarkForReview;
  window.onClearResponse = onClearResponse;
  window.onPrevQuestion = onPrevQuestion;
  window.showSubmitModal = showSubmitModal;
  window.cancelSubmitModal = cancelSubmitModal;
  window.confirmSubmitExam = confirmSubmitExam;
  window.fastLaunchExam = fastLaunchExam;
  window.cancelTestCountdown = cancelTestCountdown;
  window.toggleFullscreen = toggleFullscreen;
  window.togglePalette = togglePalette;
  window.backToHome = backToHome;
  window.jumpToQuestion = jumpToQuestion;
  window.openStarredModal = openStarredModal;
  window.closeStarredModal = closeStarredModal;
  window.clearAllStarred = clearAllStarred;
  window.practiceStarredQuestions = practiceStarredQuestions;
  window.retestMistakes = retestMistakes;
  window.setFontZoom = setFontZoom;
  window.applyPaletteFilter = applyPaletteFilter;

  // Safe Multi-Environment Bootloader
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
