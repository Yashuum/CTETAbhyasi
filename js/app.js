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
    cdTimer: null
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

  // Render Question (Question text & options in Hindi medium)
  function renderCurrentQuestion() {
    if (!state.currentTest || !state.currentTest.questions) return;
    const q = state.currentTest.questions[state.currentIndex];
    if (!q) return;

    state.visited[state.currentIndex] = true;

    // English label for badge
    if (el.qNumberBadge) {
      el.qNumberBadge.textContent = `Question ${state.currentIndex + 1} of ${state.currentTest.totalQuestions}`;
    }
    
    // Question text in Hindi
    if (el.qTextHi) {
      el.qTextHi.textContent = q.question_hi || q.question_en;
      el.qTextHi.style.display = 'block';
    }
    if (el.qTextEn) {
      el.qTextEn.textContent = q.question_en || '';
      el.qTextEn.style.display = 'none';
    }

    // Render Options in Hindi
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
    renderPalette();
    persistActiveSession();
  }

  // Question Palette Logic
  function renderPalette() {
    if (!el.paletteGrid || !state.currentTest) return;
    el.paletteGrid.innerHTML = '';
    const total = state.currentTest.questions.length;

    for (let i = 0; i < total; i++) {
      const btn = document.createElement('button');
      btn.className = `pal-btn ${getPaletteStatusClass(i)} ${i === state.currentIndex ? 'current' : ''}`;
      btn.type = 'button';
      btn.textContent = i + 1;
      btn.addEventListener('click', () => {
        jumpToQuestion(i);
        // Auto-close palette drawer on mobile/tablet when question selected
        togglePalette(false);
      });
      el.paletteGrid.appendChild(btn);
    }
  }

  function updatePaletteItem(idx) {
    if (!el.paletteGrid) return;
    const btns = el.paletteGrid.children;
    if (btns[idx]) {
      btns[idx].className = `pal-btn ${getPaletteStatusClass(idx)} ${idx === state.currentIndex ? 'current' : ''}`;
    }
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
    state.currentIndex = idx;
    renderCurrentQuestion();
    persistActiveSession();
  }

  // Footer Actions
  function onSaveAndNext() {
    if (state.marked[state.currentIndex] && state.answers[state.currentIndex] !== undefined) {
      delete state.marked[state.currentIndex];
    }
    persistActiveSession();
    nextQuestion();
  }

  function onMarkForReview() {
    state.marked[state.currentIndex] = true;
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
    if (state.currentIndex > 0) {
      state.currentIndex--;
      renderCurrentQuestion();
      persistActiveSession();
    }
  }

  function nextQuestion() {
    if (state.currentIndex < state.currentTest.totalQuestions - 1) {
      state.currentIndex++;
      renderCurrentQuestion();
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

  // Render Solutions Review (Hindi Questions & Explanations)
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

      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
          <span class="sol-badge ${statusClass}">${badgeText}</span>
          <span style="font-size:12px;color:var(--mt);font-weight:600;">${q.section} • ${q.subject || ''}</span>
        </div>
        <div style="font-weight:700;margin:10px 0;line-height:1.6;font-size:15px;">
          Question ${idx + 1}. ${q.question_hi || q.question_en}
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

      el.solutionsContainer.appendChild(card);
    });
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

  // Safe Multi-Environment Bootloader
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
