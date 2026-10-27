/**
 * CTET Paper 2 Abhyasi - Core Application Logic
 * 
 * Includes:
 * - Exclusively Tailored for CTET Paper 2 (Social Science Stream)
 * - Screen Wake Lock API (keeps device screen awake only during active test)
 * - Persistent Candidate Name Locking & 3D Welcome Screen
 * - Pre-Test Countdown Modal with Safe Cancel Button
 * - Last 5 Attempts Dashboard with Subject-Wise Breakdown
 * - Exam Refresh Lock & Crash Recovery (restores mid-exam on reload)
 * - Expand Fullscreen Toggle (Desktop, Tablet & Mobile)
 * - 100% Hindi Medium Question & Option Presentation on Exam Screen
 * - Clean English UI Shell, Topbar, Palette & Navigation
 * - 5-State Question Palette & Real-Time Warning Timer
 * - Chart.js Scorecard & Detailed Solution Review
 */

(function () {
  'use strict';

  // Application State
  let state = {
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

  // DOM Elements
  const el = {
    // Screens
    landingScreen: document.getElementById('landing-screen'),
    examScreen: document.getElementById('exam-screen'),
    resultScreen: document.getElementById('result-screen'),

    // Name & Greetings
    namePromptModal: document.getElementById('name-prompt-modal'),
    candidateNameInput: document.getElementById('candidate-name-input'),
    btnSaveName: document.getElementById('btn-save-name'),
    greeting3dModal: document.getElementById('greeting-3d-modal'),
    greeting3dName: document.getElementById('greeting-3d-name'),
    btnDismiss3d: document.getElementById('btn-dismiss-3d'),
    userGreetingDisplay: document.getElementById('user-greeting-display'),
    userNameSpan: document.getElementById('user-name-span'),
    btnEditName: document.getElementById('btn-edit-name'),

    // Theme Toggle
    themeToggle: document.getElementById('theme-toggle'),

    // Pre-test countdown modal
    countdownModal: document.getElementById('countdown-modal'),
    cdNum: document.getElementById('cd-num'),
    cdTestTitle: document.getElementById('cd-test-title'),
    cdTestMeta: document.getElementById('cd-test-meta'),
    btnCancelCountdown: document.getElementById('btn-cancel-countdown'),
    btnFastLaunch: document.getElementById('btn-fast-launch'),

    // Attempts History
    attemptsContainer: document.getElementById('recent-attempts-list'),
    emptyAttemptsMsg: document.getElementById('empty-attempts-msg'),

    // Coverage Dashboard
    coveragePct: document.getElementById('coverage-percentage'),
    coverageBar: document.getElementById('coverage-progress-bar'),
    covCdp: document.getElementById('cov-cdp'),
    covSst: document.getElementById('cov-sst'),
    covHi: document.getElementById('cov-hi'),
    covEn: document.getElementById('cov-en'),
    covAlertBox: document.getElementById('coverage-alert-box'),
    covAlertText: document.getElementById('coverage-alert-text'),
    btnScrollReplenish: document.getElementById('btn-scroll-replenish'),

    // AI Replenisher Controls
    apiKeyInput: document.getElementById('gemini-api-key'),
    saveKeyBtn: document.getElementById('btn-save-key'),
    replenishSectionSelect: document.getElementById('replenish-section-select'),
    replenishCountSelect: document.getElementById('replenish-count-select'),
    btnReplenishBank: document.getElementById('btn-replenish-bank'),
    genStatus: document.getElementById('ai-gen-status'),

    // Exam Top Bar
    examPaperTitle: document.getElementById('exam-paper-title'),
    examPaperMeta: document.getElementById('exam-paper-meta'),
    timerDisplay: document.getElementById('timer-display'),
    sectionTabsContainer: document.getElementById('section-tabs'),
    btnFullscreen: document.getElementById('btn-fullscreen'),
    fsIcon: document.getElementById('fs-icon'),
    fsText: document.getElementById('fs-text'),

    // Question Area
    qNumberBadge: document.getElementById('q-number-badge'),
    qMarksBadge: document.getElementById('q-marks-badge'),
    qTextEn: document.getElementById('q-text-en'),
    qTextHi: document.getElementById('q-text-hi'),
    optionsList: document.getElementById('options-list'),

    // Palette
    paletteGrid: document.getElementById('palette-grid'),

    // Exam Footer Actions
    btnSaveNext: document.getElementById('btn-save-next'),
    btnMarkReview: document.getElementById('btn-mark-review'),
    btnClear: document.getElementById('btn-clear'),
    btnPrev: document.getElementById('btn-prev'),
    btnSubmit: document.getElementById('btn-submit-exam'),

    // Submit Modal
    submitModal: document.getElementById('submit-modal'),
    modalAnswered: document.getElementById('modal-answered'),
    modalNotAnswered: document.getElementById('modal-not-answered'),
    modalMarked: document.getElementById('modal-marked'),
    modalNotVisited: document.getElementById('modal-not-visited'),
    btnConfirmSubmit: document.getElementById('btn-confirm-submit'),
    btnCancelSubmit: document.getElementById('btn-cancel-submit'),

    // Results Dashboard
    resScore: document.getElementById('res-score'),
    resTotal: document.getElementById('res-total'),
    resAccuracy: document.getElementById('res-accuracy'),
    resTimeTaken: document.getElementById('res-time-taken'),
    resSectionBreakdown: document.getElementById('res-section-breakdown'),
    solutionsContainer: document.getElementById('solutions-container'),
    btnBackHome: document.getElementById('btn-back-home'),
    toast: document.getElementById('toast')
  };

  // Active Exam Session Key for Refresh Lock & Crash Recovery
  const ACTIVE_SESSION_KEY = 'ctet_active_exam_session_v1';

  // Initialize Application
  function init() {
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
    if (!('wakeLock' in navigator)) {
      return;
    }
    try {
      if (wakeLockSentinel === null && state.inExam) {
        wakeLockSentinel = await navigator.wakeLock.request('screen');
        wakeLockSentinel.addEventListener('release', () => {
          wakeLockSentinel = null;
        });
      }
    } catch (err) {
      console.warn('Screen Wake Lock request notice:', err.name, err.message);
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
  // Fullscreen Management
  // ==========================================
  function toggleFullscreen() {
    const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
    if (!isFs) {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(() => {});
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen();
      } else if (docEl.mozRequestFullScreen) {
        docEl.mozRequestFullScreen();
      } else if (docEl.msRequestFullscreen) {
        docEl.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
    setTimeout(updateFullscreenBtn, 150);
  }

  function updateFullscreenBtn() {
    const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
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
      el.examPaperTitle.textContent = state.currentTest.title;
      el.examPaperMeta.textContent = `${state.currentTest.totalQuestions} Questions • ${state.currentTest.duration} Minutes • 1 Mark Each`;

      // Hide landing and activate exam screen directly
      el.landingScreen.style.display = 'none';
      el.examScreen.classList.add('active');

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
        el.namePromptModal.classList.add('active');
        el.candidateNameInput.focus();
      }, 400);
    }

    // Load saved API key if any
    const savedKey = window.ctetGenerator.getSavedApiKey();
    if (savedKey) el.apiKeyInput.value = savedKey;
  }

  function renderCandidateGreeting() {
    el.userNameSpan.textContent = state.candidateName;
    el.userGreetingDisplay.style.display = 'inline-flex';
  }

  function promptSaveName() {
    const name = el.candidateNameInput.value.trim();
    if (!name) {
      alert('Please enter your full name to personalize your CTET Paper 2 portal.');
      return;
    }
    state.candidateName = name;
    localStorage.setItem('ctet_candidate_name', name);
    el.namePromptModal.classList.remove('active');
    renderCandidateGreeting();

    // Trigger 3D Greeting Modal
    el.greeting3dName.textContent = name;
    el.greeting3dModal.classList.add('active');
  }

  // Setup Event Listeners
  function setupEventListeners() {
    // Name save
    el.btnSaveName.addEventListener('click', promptSaveName);
    el.candidateNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') promptSaveName();
    });
    el.btnDismiss3d.addEventListener('click', () => {
      el.greeting3dModal.classList.remove('active');
    });
    el.btnEditName.addEventListener('click', () => {
      el.candidateNameInput.value = state.candidateName;
      el.namePromptModal.classList.add('active');
      el.candidateNameInput.focus();
    });

    // Save API key
    el.saveKeyBtn.addEventListener('click', () => {
      const val = el.apiKeyInput.value.trim();
      window.ctetGenerator.saveApiKey(val);
      showToast(val ? '✅ Gemini API Key saved!' : 'API Key cleared.');
    });

    // AI Storage Replenisher
    el.btnReplenishBank.addEventListener('click', handleReplenishBank);
    if (el.btnScrollReplenish) {
      el.btnScrollReplenish.addEventListener('click', () => {
        const target = document.getElementById('replenish-section');
        if (target) target.scrollIntoView({ behavior: 'smooth' });
      });
    }

    // Pre-test Countdown modal buttons
    el.btnCancelCountdown.addEventListener('click', cancelTestCountdown);
    el.btnFastLaunch.addEventListener('click', () => {
      clearInterval(state.cdTimer);
      el.countdownModal.classList.remove('active');
      launchExam(state.pendingTestPaper);
    });

    // Fullscreen Toggle Buttons & Change Events
    if (el.btnFullscreen) {
      el.btnFullscreen.addEventListener('click', toggleFullscreen);
    }
    document.addEventListener('fullscreenchange', updateFullscreenBtn);
    document.addEventListener('webkitfullscreenchange', updateFullscreenBtn);
    document.addEventListener('mozfullscreenchange', updateFullscreenBtn);
    document.addEventListener('MSFullscreenChange', updateFullscreenBtn);

    // Exam navigation
    el.btnSaveNext.addEventListener('click', onSaveAndNext);
    el.btnMarkReview.addEventListener('click', onMarkForReview);
    el.btnClear.addEventListener('click', onClearResponse);
    el.btnPrev.addEventListener('click', onPrevQuestion);
    el.btnSubmit.addEventListener('click', showSubmitModal);

    // Submit Modal
    el.btnCancelSubmit.addEventListener('click', () => el.submitModal.classList.remove('active'));
    el.btnConfirmSubmit.addEventListener('click', () => {
      el.submitModal.classList.remove('active');
      finalizeTest();
    });

    // Back to Home from Results
    el.btnBackHome.addEventListener('click', () => {
      releaseWakeLock();
      el.resultScreen.classList.remove('active');
      el.landingScreen.style.display = 'block';
      loadRecentAttempts();
      updateCoverageUI();
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
    showToast('⏳ Fetching unique, unattempted CTET Social Science questions...');
    try {
      const testPaper = await window.ctetGenerator.fetchPaper('social_studies', mode);
      state.pendingTestPaper = testPaper;
      openPreTestCountdown(testPaper);
    } catch (err) {
      alert('Error fetching test: ' + err.message);
    }
  };

  // Pre-test countdown modal
  function openPreTestCountdown(testPaper) {
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

  function cancelTestCountdown() {
    clearInterval(state.cdTimer);
    state.pendingTestPaper = null;
    clearActiveSession();
    releaseWakeLock();
    el.countdownModal.classList.remove('active');
    showToast('Test cancelled. No attempt recorded.');
  }

  // Launch Exam Environment
  function launchExam(testPaper) {
    state.inExam = true;
    state.currentTest = testPaper;
    state.currentIndex = 0;
    state.answers = {};
    state.marked = {};
    state.visited = { 0: true };
    state.timeRemaining = testPaper.duration * 60;

    // Populate Top Bar (In English)
    el.examPaperTitle.textContent = testPaper.title;
    el.examPaperMeta.textContent = `${testPaper.totalQuestions} Questions • ${testPaper.duration} Minutes • 1 Mark Each`;

    // Switch Screens
    el.landingScreen.style.display = 'none';
    el.examScreen.classList.add('active');

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
    const questions = state.currentTest.questions;
    const sections = [...new Set(questions.map(q => q.section))];

    el.sectionTabsContainer.innerHTML = '';
    sections.forEach((sec, idx) => {
      const count = questions.filter(q => q.section === sec).length;
      const tab = document.createElement('button');
      tab.className = `sec-tab ${idx === 0 ? 'active' : ''}`;
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
    const q = state.currentTest.questions[state.currentIndex];
    if (!q) return;

    state.visited[state.currentIndex] = true;

    // English label for badge
    el.qNumberBadge.textContent = `Question ${state.currentIndex + 1} of ${state.currentTest.totalQuestions}`;
    
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

    updateActiveSectionTab();
    renderPalette();
    persistActiveSession();
  }

  // Question Palette Logic
  function renderPalette() {
    el.paletteGrid.innerHTML = '';
    const total = state.currentTest.questions.length;

    for (let i = 0; i < total; i++) {
      const btn = document.createElement('button');
      btn.className = `pal-btn ${getPaletteStatusClass(i)} ${i === state.currentIndex ? 'current' : ''}`;
      btn.textContent = i + 1;
      btn.addEventListener('click', () => jumpToQuestion(i));
      el.paletteGrid.appendChild(btn);
    }
  }

  function updatePaletteItem(idx) {
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

    el.modalAnswered.textContent = ansCount;
    el.modalNotAnswered.textContent = Math.max(0, notAnsCount);
    el.modalMarked.textContent = markedCount;
    el.modalNotVisited.textContent = notVisitedCount;

    el.submitModal.classList.add('active');
  }

  // Finalize & Calculate Results
  function finalizeTest() {
    state.inExam = false; // Turn off refresh lock
    clearActiveSession();
    releaseWakeLock(); // Release screen wake lock
    clearInterval(state.timerInterval);
    el.examScreen.classList.remove('active');

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
    el.resScore.textContent = score;
    el.resTotal.textContent = totalQ;
    el.resAccuracy.textContent = accuracy + '%';
    el.resTimeTaken.textContent = `${minsTaken}m ${secsTaken}s`;

    // Render Section Breakdown
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

    el.resultScreen.classList.add('active');
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
          backgroundColor: ['#138808', '#EF4444', '#64748B'],
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
    if (!window.ctetGenerator) return;
    const stats = window.ctetGenerator.getCoverageStats();

    el.coveragePct.textContent = stats.percentage + '%';
    el.coverageBar.style.width = stats.percentage + '%';

    const sub = stats.subjectStats;
    if (sub.cdp) el.covCdp.textContent = `${sub.cdp.attempted}/${sub.cdp.total} (${sub.cdp.percentage}%)`;
    if (sub.social_studies) el.covSst.textContent = `${sub.social_studies.attempted}/${sub.social_studies.total} (${sub.social_studies.percentage}%)`;
    if (sub.language_hindi) el.covHi.textContent = `${sub.language_hindi.attempted}/${sub.language_hindi.total} (${sub.language_hindi.percentage}%)`;
    if (sub.language_english) el.covEn.textContent = `${sub.language_english.attempted}/${sub.language_english.total} (${sub.language_english.percentage}%)`;

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

  // AI Bank Storage Replenisher (Rolling FIFO Replacement - Zero Extra Storage)
  async function handleReplenishBank() {
    const key = el.apiKeyInput.value.trim();
    if (!key) {
      alert('Please enter your Gemini API key in the field to replenish questions.');
      el.apiKeyInput.focus();
      return;
    }

    const sectionKey = el.replenishSectionSelect.value;
    const count = parseInt(el.replenishCountSelect.value, 10) || 10;

    el.genStatus.textContent = `🤖 Asking Gemini 3.8 Flash to synthesize ${count} new questions...`;
    el.btnReplenishBank.disabled = true;

    try {
      const res = await window.ctetGenerator.replenishStorageWithGemini(
        key, 
        sectionKey, 
        count, 
        (progressMsg) => {
          el.genStatus.textContent = `🤖 ${progressMsg}`;
        }
      );
      
      el.genStatus.textContent = `✅ Replaced ${res.evictedCount} oldest questions with ${res.addedCount} fresh questions in ${res.sectionLabel}! Pool size remains steady at ${res.constantPoolSize} questions (zero extra space used).`;
      showToast(`🔄 Replaced ${res.addedCount} questions in storage!`);
      
      updateCoverageUI();

    } catch (err) {
      el.genStatus.textContent = '❌ Replenishment error: ' + err.message;
    } finally {
      el.btnReplenishBank.disabled = false;
    }
  }

  // Toast Notification
  function showToast(msg) {
    el.toast.textContent = msg;
    el.toast.style.display = 'block';
    setTimeout(() => {
      el.toast.style.display = 'none';
    }, 3500);
  }

  // Run on load
  document.addEventListener('DOMContentLoaded', init);
})();
