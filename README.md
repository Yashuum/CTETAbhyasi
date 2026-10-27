# CTET Abhyasi 2.0 – CTET Paper 2 (Social Science) Mock Test Portal

[![Live Website](https://img.shields.io/badge/Live_Website-https%3A%2F%2Fyashuum.github.io%2FCTETAbhyasi%2F-brightgreen?style=for-the-badge&logo=github)](https://yashuum.github.io/CTETAbhyasi/)
[![Platform](https://img.shields.io/badge/Platform-CBSE%20CTET%20Paper%202%20(Classes%20VI--VIII)-blue?style=for-the-badge)](https://yashuum.github.io/CTETAbhyasi/)
[![License](https://img.shields.io/badge/License-MIT-orange?style=for-the-badge)](LICENSE)

> **🌐 Live Practice Portal:** [https://yashuum.github.io/CTETAbhyasi/](https://yashuum.github.io/CTETAbhyasi/)

A modern, responsive, high-performance Computer Based Test (CBT) portal designed specifically for candidates preparing for **CTET Paper 2 (Social Science / Elementary Stage Classes VI–VIII)**.

Inspired by [NishuAbhyasi 2.0](https://yashuum.github.io/NishuAbhyasi2.0/), this project delivers a state-of-the-art practice environment with automated question assembly, zero daily duplicate repetition, screen wake lock protection, and continuous mid-exam crash recovery.

---

## 🌟 Key Features & Highlights

1. **🌐 Dedicated Social Science (SST) Focus**:
   - Streamlined specifically for Social Science candidates.
   - Mathematics and Science content has been completely removed to keep the interface simple, clutter-free, and lightweight.

2. **💡 Screen Wake Lock (Never Sleep During Exam)**:
   - Powered by the Web **Screen Wake Lock API**.
   - When taking a mock test, the screen is automatically prevented from turning off or going to sleep.
   - The wake lock is strictly confined to the active exam screen and is automatically released when submitting, cancelling, or exiting the test.

3. **🇮🇳 Hindi-Medium Questions with Clean English UI**:
   - **Exam Content:** Questions stems, options (A, B, C, D), and pedagogical explanations are presented in complete **Hindi medium** for authentic CTET preparation.
   - **Interface:** Navigation buttons, timers, fullscreen controls, palette legends, and scorecards use a clean, standard English shell.

4. **⛶ Expand Fullscreen Mode**:
   - Dedicated `⛶ Fullscreen` toggle button on the exam topbar.
   - Prevents browser address bar cutoffs, hidden navigation buttons, or viewport clipping across smartphones, tablets, and laptops.

5. **🔒 Exam Refresh Lock & Crash Recovery**:
   - Prevents loss of progress on accidental reload, browser refresh, or tab closure.
   - Continuously saves live exam snapshots (timer, current question index, chosen answers, review marks, and palette colors) to browser `localStorage` (`ctet_active_exam_session_v1`).
   - If reloaded mid-test, the portal instantly restores the exact test state right where you left off.

6. **2,120+ Verified Authentic Question Bank**:
   - Comprehensive past-year and syllabus-aligned questions:
     * **Child Development & Pedagogy (CDP):** 600 Questions (Piaget, Vygotsky, Kohlberg, Inclusive Education, Progressive Education)
     * **Social Studies / Social Science (SST):** 800 Questions (History, Geography, Social & Political Life / Civics, SST Pedagogy)
     * **Language I (Hindi):** 360 Questions (Language acquisition, comprehension, Hindi grammar & pedagogy)
     * **Language II (English Pedagogy in Hindi Medium):** 360 Questions (Krashen's hypothesis, skimming/scanning, CLT)

7. **Zero-Duplicate Daily Engine**:
   - Guarantees zero duplicate questions in the same mock paper.
   - Daily attempt tracker ensures subsequent tests attempted on the same day automatically prioritize fresh, unseen questions.

8. **📊 Last 5 Attempts Dashboard with Subject-Wise Breakdown**:
   - Retains your last 5 attempts on the browser without requiring any login credentials.
   - Displays overall score ($X / 150$), accuracy percentage, time taken, qualification status (60%+), and subject-wise score tags:
     * **CDP:** $X / 30$
     * **Social Studies:** $Y / 60$
     * **Hindi:** $Z / 30$
     * **English:** $W / 30$

9. **🔄 Token-Efficient AI Replenishment (Zero Device Bloat)**:
   - Candidates can optionally use their Gemini API key to synthesize fresh batches of questions.
   - Utilizes strict **Rolling FIFO Replacement**: adding $N$ new questions removes the oldest $N$ practiced questions, keeping the device storage footprint strictly constant.

10. **Pre-Test Countdown with Safe Cancel Protection**:
    - 5-second countdown with animated ring before launch.
    - Includes a prominent **"✕ Cancel Test"** button to abort accidental clicks without recording an empty attempt.

---

## 📋 CTET Paper 2 (Social Science) Exam Structure

| Section | Subject | Questions | Marks | Medium |
| :--- | :--- | :---: | :---: | :--- |
| **Part I** | Child Development & Pedagogy | 30 | 30 | Hindi |
| **Part II** | Social Studies / Social Science | 60 | 60 | Hindi |
| **Part III** | Language I (Hindi) | 30 | 30 | Hindi |
| **Part IV** | Language II (English Pedagogy) | 30 | 30 | Hindi Translation |
| **Total** | **Official CTET Paper 2 Pattern** | **150** | **150** | **Duration: 150 Mins** |

---

## 🚀 Quick Start & Local Testing

### Running in Browser
Simply open `index.html` in any modern web browser (Google Chrome, Microsoft Edge, Safari, Firefox). No backend server or Node.js environment is required!

### Testing via Local Web Server
```powershell
# Using Python
python -m http.server 8000

# Using Node.js
npx serve .
```
Visit `http://localhost:8000` or the displayed local port.

---

## 🛠️ Technology Stack

- **Frontend:** Pure HTML5, CSS3 (Modern CSS Grid, Flexbox, Dynamic Viewport Units `100dvh`), Vanilla JavaScript (ES6+).
- **APIs Used:**
  - [Screen Wake Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API)
  - [Fullscreen API](https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API)
  - [Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- **Data Visualization:** [Chart.js 4.4](https://www.chartjs.org/) for doughnut attempt breakdown.
- **AI Synthesis (Optional):** Google Gemini Interactions API (`gemini-3.8-flash`).

---

## 🌐 Live Deployment

The portal is published and freely accessible on GitHub Pages:
**[https://yashuum.github.io/CTETAbhyasi/](https://yashuum.github.io/CTETAbhyasi/)**

To push your own updates:
```bash
git add .
git commit -m "Update portal"
git push origin main
```

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
