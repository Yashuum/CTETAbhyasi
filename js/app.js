/**
 * CTET Paper 2 Abhyasi - Core Application Logic
 * 
 * Includes:
 * - Persistent Candidate Name Locking & 3D Welcome Screen
 * - Pre-Test Countdown Modal with Safe Cancel Button
 * - Last 5 Attempts Dashboard with Subject-Wise Breakdown
 * - Exam Refresh Lock (prevents accidental reload/loss)
 * - 5-State Question Palette & Real-Time Warning Timer
 * - Chart.js Scorecard & Detailed Solution Review
 */

(function () {
  'use strict';

  // Application State
  let state = {
    currentStream: 'social_studies', // DEFAULT: Social Studies
    currentTest: null,
    currentIndex: 0,
    answers: {},       // { [qIndex]: optionIndex }
    marked: {},        // { [qIndex]: true }
    visited: {},       // { [qIndex]: true }
    timeRemaining: 0,
    timerInterval: null,
    inExam: false,
    showHindi: true,
    candidateName: '',
    userAttempts: [],
    pendingTestPaper: null,
    cdTimer: null
  };

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

    // Stream & Theme
    streamSstBtn: document.getElementById('stream-sst'),
    streamMathBtn: document.getElementById('stream-math'),
    streamDisplayTitle: document.getElementById('stream-display-title'),
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
    covMs: document.getElementById('cov-ms'),
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

    // Question Area
    qNumberBadge: document.getElementById('q-number-badge'),
    qMarksBadge: document.getElementById('q-marks-badge'),
    langToggleBtn: document.getElementById('lang-toggle-btn'),
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

  // Initialize Application
  function init() {
    setupTheme();
    loadCandidateName();
    setupEventListeners();
    setupRefreshLock();
    loadRecentAttempts();
    setStream('social_studies'); // DEFAULT: Social Studies
    updateCoverageUI();
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
      alert('Please enter your name to personalize your CTET Paper 2 portal.');
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

    // Stream Selection
    el.streamSstBtn.addEventListener('click', () => setStream('social_studies'));
    el.streamMathBtn.addEventListener('click', () => setStream('math_science'));

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

    // Language Toggle
    el.langToggleBtn.addEventListener('click', () => {
      state.showHindi = !state.showHindi;
      el.qTextHi.style.display = state.showHindi ? 'block' : 'none';
      el.langToggleBtn.textContent = state.showHindi ? '🌐 Hindi: ON' : '🌐 Hindi: OFF';
    });

    // Back to Home from Results
    el.btnBackHome.addEventListener('click', () => {
      el.resultScreen.classList.remove('active');
      el.landingScreen.style.display = 'block';
      loadRecentAttempts();
      updateCoverageUI();
    });
  }

  // Refresh Lock: Warn candidate if reloading during an active test
  function setupRefreshLock() {
    window.addEventListener('beforeunload', (e) => {
      if (state.inExam) {
        e.preventDefault();
        e.returnValue = 'CTET Exam is currently in progress! If you refresh or leave, your current answers will be lost.';
        return e.returnValue;
      }
    });
  }

  // Stream Switcher
  function setStream(stream) {
    state.currentStream = stream;
    if (stream === 'social_studies') {
      el.streamSstBtn.classList.add('active');
      el.streamMathBtn.classList.remove('active');
      el.streamDisplayTitle.textContent = 'Social Studies / Social Science';
    } else {
      el.streamMathBtn.classList.add('active');
      el.streamSstBtn.classList.remove('active');
      el.streamDisplayTitle.textContent = 'Mathematics & Science';
    }
  }

  // Global launcher with 5-second countdown & cancel protection
  window.startMockTest = async function (mode) {
    showToast('⏳ Fetching unique, unattempted CTET questions...');
    try {
      const testPaper = await window.ctetGenerator.fetchPaper(state.currentStream, mode);
      state.pendingTestPaper = testPaper;
      openPreTestCountdown(testPaper);
    } catch (err) {
      alert('Error fetching test: ' + err.message);
    }
  };

  // Pre-test countdown modal
  function openPreTestCountdown(testPaper) {
    el.cdTestTitle.textContent = testPaper.title;
    const streamLabel = testPaper.stream === 'social_studies' ? 'Social Studies Stream' : 'Mathematics & Science Stream';
    el.cdTestMeta.textContent = `${testPaper.totalQuestions} Questions • ${testPaper.duration} Minutes • ${streamLabel}`;

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

    // Populate Top Bar
    el.examPaperTitle.textContent = testPaper.title;
    el.examPaperMeta.textContent = `${testPaper.totalQuestions} Questions • ${testPaper.duration} Minutes • 1 Mark Each`;

    // Switch Screens
    el.landingScreen.style.display = 'none';
    el.examScreen.classList.add('active');

    // Build Tabs & Palette
    buildSectionTabs();
    renderPalette();
    renderCurrentQuestion();

    // Start Real-Time Timer
    startTimer();
  }

  // Timer Management
  function startTimer() {
    clearInterval(state.timerInterval);
    updateTimerDisplay();

    state.timerInterval = setInterval(() => {
      state.timeRemaining--;
      updateTimerDisplay();

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

  // Render Question
  function renderCurrentQuestion() {
    const q = state.currentTest.questions[state.currentIndex];
    if (!q) return;

    state.visited[state.currentIndex] = true;

    el.qNumberBadge.textContent = `Question ${state.currentIndex + 1} of ${state.currentTest.totalQuestions}`;
    el.qTextEn.textContent = q.question_en;
    el.qTextHi.textContent = q.question_hi || '';
    el.qTextHi.style.display = state.showHindi ? 'block' : 'none';

    // Render Options
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
      });

      el.optionsList.appendChild(optItem);
    });

    updateActiveSectionTab();
    renderPalette();
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
  }

  // Footer Actions
  function onSaveAndNext() {
    if (state.marked[state.currentIndex] && state.answers[state.currentIndex] !== undefined) {
      delete state.marked[state.currentIndex];
    }
    nextQuestion();
  }

  function onMarkForReview() {
    state.marked[state.currentIndex] = true;
    nextQuestion();
  }

  function onClearResponse() {
    delete state.answers[state.currentIndex];
    delete state.marked[state.currentIndex];
    renderCurrentQuestion();
    updatePaletteItem(state.currentIndex);
  }

  function onPrevQuestion() {
    if (state.currentIndex > 0) {
      state.currentIndex--;
      renderCurrentQuestion();
    }
  }

  function nextQuestion() {
    if (state.currentIndex < state.currentTest.totalQuestions - 1) {
      state.currentIndex++;
      renderCurrentQuestion();
    } else {
      showToast('You have reached the final question. Click Submit Test when ready.');
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
      stream: state.currentStream,
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

      attempts.forEach((att, idx) => {
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
            const shortName = sName.includes('Child') ? 'CDP' : (sName.includes('Social') ? 'SST' : (sName.includes('Math') ? 'Math/Sci' : (sName.includes('Hindi') ? 'Hindi' : 'English')));
            const s = att.sectionStats[sName];
            subTagsHtml += `<span class="sub-tag">${shortName}: <strong>${s.correct}/${s.total}</strong></span>`;
          });
        }

        row.innerHTML = `
          <div class="attempt-meta">
            <h4>${att.testTitle}</h4>
            <span>📅 ${att.date} • ${att.stream === 'social_studies' ? 'Social Studies' : 'Maths & Science'}</span>
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

  // Render Solutions Review
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

      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span class="sol-badge ${statusClass}">${badgeText}</span>
          <span style="font-size:12px;color:var(--mt);font-weight:600;">${q.section}</span>
        </div>
        <div style="font-weight:700;margin:8px 0;line-height:1.5;">Q${idx + 1}. ${q.question_en}</div>
        ${q.question_hi ? `<div style="font-size:13px;color:var(--mt);margin-bottom:12px;font-style:italic;">${q.question_hi}</div>` : ''}
        
        <div style="font-size:13px;display:flex;gap:20px;margin-bottom:8px;">
          <div>Your Answer: <strong>${userOptChar}</strong></div>
          <div style="color:#4ADE80;">Correct Answer: <strong>${correctOptChar}</strong></div>
        </div>

        <div class="sol-explanation">
          <strong>Pedagogical Explanation:</strong> ${q.explanation || 'Refer to CBSE CTET curriculum standards.'}
        </div>
      `;

      el.solutionsContainer.appendChild(card);
    });
  }

  // Update Question Bank Coverage UI
  function updateCoverageUI() {
    if (!window.ctetGenerator) return;
    const stats = window.ctetGenerator.getCoverageStats();

    el.coveragePct.textContent = stats.percentage + '%';
    el.coverageBar.style.width = stats.percentage + '%';

    const sub = stats.subjectStats;
    if (sub.cdp) el.covCdp.textContent = `${sub.cdp.attempted}/${sub.cdp.total} (${sub.cdp.percentage}%)`;
    if (sub.social_studies) el.covSst.textContent = `${sub.social_studies.attempted}/${sub.social_studies.total} (${sub.social_studies.percentage}%)`;
    if (sub.math_science) el.covMs.textContent = `${sub.math_science.attempted}/${sub.math_science.total} (${sub.math_science.percentage}%)`;
    if (sub.language_hindi) el.covHi.textContent = `${sub.language_hindi.attempted}/${sub.language_hindi.total} (${sub.language_hindi.percentage}%)`;
    if (sub.language_english) el.covEn.textContent = `${sub.language_english.attempted}/${sub.language_english.total} (${sub.language_english.percentage}%)`;

    if (stats.percentage >= 70) {
      el.covAlertBox.style.display = 'flex';
      el.covAlertText.innerHTML = `🏆 <strong>Exceptional coverage!</strong> You have practiced <strong>${stats.percentage}%</strong> (${stats.attemptedCount} / ${stats.totalQuestions}) of the entire question repository. If you want fresh questions, expand your storage pool below with your Gemini API key.`;
    } else if (stats.percentage >= 30) {
      el.covAlertBox.style.display = 'flex';
      el.covAlertText.innerHTML = `💪 <strong>Strong Progress!</strong> You have covered <strong>${stats.percentage}%</strong> (${stats.attemptedCount} / ${stats.totalQuestions}) of the question bank.`;
    } else {
      el.covAlertBox.style.display = 'none';
    }
  }

  // AI Bank Storage Replenisher (Stores in DB, NO Live Quiz, Saves Tokens!)
  async function handleReplenishBank() {
    const key = el.apiKeyInput.value.trim();
    if (!key) {
      alert('Please enter your Gemini API key in the field to replenish questions.');
      el.apiKeyInput.focus();
      return;
    }

    const sectionKey = el.replenishSectionSelect.value;
    const count = parseInt(el.replenishCountSelect.value, 10) || 10;

    el.genStatus.textContent = `🤖 Asking Gemini 3.8 Flash to synthesize ${count} new questions into storage...`;
    el.btnReplenishBank.disabled = true;

    try {
      const res = await window.ctetGenerator.replenishStorageWithGemini(key, sectionKey, count);
      
      el.genStatus.textContent = `✅ Successfully added ${res.addedCount} questions into ${res.sectionLabel}! Total bank in storage is now ${res.newTotalPool} questions.`;
      showToast(`📥 Saved ${res.addedCount} new questions into storage!`);
      
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
