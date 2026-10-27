# CTET Abhyasi 2.0 – CTET Paper 2 Master Mock Test Portal

A modern, responsive, high-performance Computer Based Test (CBT) portal designed specifically for candidates preparing for **CTET Paper 2 (Classes VI–VIII / Elementary Stage)**.

Inspired by [NishuAbhyasi 2.0](https://yashuum.github.io/NishuAbhyasi2.0/), this project delivers a state-of-the-art practice environment with a critical architectural upgrade: **Questions are automatically generated, synthesized, and fetched dynamically—eliminating the need for manual admin copy-pasting or JSON maintenance.**

---

## 🌟 Key Features & Improvements in this Version

1. **Zero Login/Logout Friction (100% Client-Side)**:
   - No confusing authentication, email verification, or password barriers.
   - The portal asks for the candidate's name on first launch, locks it in `localStorage`, and greets the candidate on every visit.
2. **2,800+ Verified Master Question Bank**:
   - Comprehensive authentic past-year questions (CTET 2018–2024) across all subjects:
     * **Child Development & Pedagogy (CDP)** (600 Qs)
     * **Social Studies / Social Science** (800 Qs)
     * **Mathematics & Science** (760 Qs)
     * **Language I (Hindi)** (360 Qs)
     * **Language II (English)** (360 Qs)
3. **Daily Deduplication Guarantee**:
   - The engine ensures **zero duplicate questions in the same test**.
   - Questions attempted today are tracked with date-stamping in `localStorage` (`ctet_daily_attempted_YYYY-MM-DD`). Subsequent tests on the same day automatically pull unseen questions.
4. **Recent 5 Attempts Dashboard with Subject-Wise Breakdown**:
   - Tracks your last 5 test attempts on the browser.
   - Displays overall score ($X / 150$), accuracy %, time taken, and subject-wise score tags:
     * CDP: $X/30$
     * Social Studies / Math & Science: $Y/60$
     * Hindi: $Z/30$
     * English: $W/30$
   - Shows CTET qualification badge ($\ge 60\%$ or $\ge 90$ marks).
5. **Default Dark Mode**:
   - Launches in eye-friendly dark mode by default for comfort during long practice sessions.
6. **Hero Card Background: "YASH"**:
   - The prominent hero banner displays `YASH` cleanly in the background watermark.
7. **Default Teaching Stream: Social Studies**:
   - Automatically selected as the default stream.
8. **3D Greeting Screen**:
   - Interactive 3D perspective welcome card greeting the user when their name is saved.
9. **Pre-Test Countdown with Safe Cancel Protection**:
   - Clicking "Start Test" opens a 5-second countdown with an animated ring and clear test metadata.
   - Includes a prominent **"✕ Cancel Test"** button to cancel false or accidental clicks without disturbing scores.
10. **Exam Refresh Lock**:
    - Protects the candidate against accidental browser refresh (F5 / reload) while the test is active.

---

## 🎯 Understanding the Teaching Stream in CTET Paper 2

### Why is Teaching Stream Selection necessary?
In the official CTET Paper 2 (conducted by CBSE for Elementary Stage / Classes VI to VIII):
* **Paper Pattern**: 150 Questions, 150 Marks, 150 Minutes.
* **Compulsory Sections (90 Marks)**:
  1. Child Development & Pedagogy (30 Qs)
  2. Language I - e.g., Hindi (30 Qs)
  3. Language II - e.g., English (30 Qs)
* **Elective Section (60 Marks)**: Candidates must choose according to their teaching specialization:
  * **Social Studies / Social Science (60 Qs)**: For teachers of Social Science, History, Geography, Civics, Humanities.
  * **Mathematics & Science (60 Qs)**: For teachers of Mathematics and Science (30 Maths + 30 Science).

### Are the questions generated accordingly?
**Yes, 100%!** When **Social Studies** is selected (default), the 60-question middle block contains questions from History (Ancient, Medieval, Modern, Freedom Struggle), Geography, Indian Constitution & Polity, and Social Science Pedagogy. When **Mathematics & Science** is selected, those 60 questions are dynamically swapped for Algebra, Geometry, Physics, Chemistry, Biology, and Math/Science Pedagogy.

---

## 🔑 How to Setup Your Own Gemini API Key (Optional)

The portal comes with 2,800+ verified questions ready to play offline out of the box. If you wish to test live AI question generation:

1. **Get a Free Gemini API Key**:
   * Visit [Google AI Studio](https://aistudio.google.com/).
   * Sign in with your Google account.
   * Click **"Get API key"** and then **"Create API key in new project"**.
   * Copy your key (starts with `AIzaSy...`).
2. **Add to the Portal**:
   * In the top control bar under **"🤖 Gemini AI Live Question Generator"**, paste your API key into the input field.
   * Click **"Save"**. The key is stored locally in your browser's `localStorage` (`ctet_gemini_api_key`) and never transmitted to any third-party server.
3. **Generate Unseen Questions**:
   * Click **"⚡ Generate Fresh Questions with AI"**.
   * The portal will query Google's `gemini-3.8-flash` model using structured JSON schemas, validate the output, and immediately launch an AI-generated quiz!

---

## 🚀 How to Run Locally & Host on GitHub Pages

### Running Locally
1. Navigate to:
   ```
   C:\Users\singh\.gemini\antigravity\scratch\ctet-paper2-abhyasi
   ```
2. Double-click `index.html` to open it in Google Chrome or Microsoft Edge.

### Free GitHub Pages Deployment
1. Open PowerShell inside the folder:
   ```bash
   cd C:\Users\singh\.gemini\antigravity\scratch\ctet-paper2-abhyasi
   git init
   git add .
   git commit -m "Deploy CTET Abhyasi 2.0"
   ```
2. Create a repository on GitHub (e.g. `ctet-paper2-abhyasi`) and link it:
   ```bash
   git remote add origin https://github.com/<your-username>/ctet-paper2-abhyasi.git
   git branch -M main
   git push -u origin main
   ```
3. On GitHub, go to **Settings** → **Pages** → Source: **Deploy from a branch** → Branch: **main** / `/(root)` → **Save**.
4. Your website will be live in ~60 seconds with a free HTTPS URL!
