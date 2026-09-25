# 🏦 AI Loan Eligibility Checker — BFSI Financial Intelligence Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Backend-Python%203.9%2B%20Flask-3776ab.svg)](https://flask.palletsprojects.com/)
[![Frontend](https://img.shields.io/badge/Frontend-HTML5%20%7C%20CSS3%20%7C%20ES6%2B%20JS-e34f26.svg)](frontend/)
[![AI Integration](https://img.shields.io/badge/AI-Anthropic%20Claude%203.5%20Sonnet-d97706.svg)](https://console.anthropic.com/)
[![Design](https://img.shields.io/badge/UI-Dark%20Glassmorphism%20Fintech-6366f1.svg)](frontend/css/style.css)

> **BFSI Project Showcase:** An educational personal finance and lending analytics platform featuring four core fintech tools in a single, responsive dark glassmorphism dashboard: **Loan Eligibility Checker**, **Credit Score Analyzer**, **Interactive EMI Calculator**, and **Claude AI Financial Tips**.

---

## 📌 Table of Contents

1. [Project Overview](#-project-overview)
2. [Key Features & Modules](#-key-features--modules)
3. [Financial Formulas & Underwriting Logic](#-financial-formulas--underwriting-logic)
4. [Technology Stack](#-technology-stack)
5. [Project Architecture & Directory Structure](#-project-architecture--directory-structure)
6. [Prerequisites & System Requirements](#-prerequisites--system-requirements)
7. [Installation & Setup Guide](#-installation--setup-guide)
8. [Configuration (Claude API & Google Sheets)](#-configuration-claude-api--google-sheets)
9. [How to Run the Application](#-how-to-run-the-application)
10. [GitHub Upload Instructions](#-github-upload-instructions)
11. [Deployment Options](#-deployment-options)
12. [Viva & Project Review Quick Q&A](#-viva--project-review-quick-qa)
13. [Security & Educational Disclaimer](#-security--educational-disclaimer)

---

## 🌟 Project Overview

The **AI Loan Eligibility Checker** is a production-style, institutional-grade Banking, Financial Services & Insurance (BFSI) web application. Designed for students, fintech developers, and financial planners, it bridges traditional banking underwriting math (FOIR, DTI, amortized PV) with modern generative AI (Claude 3.5 Sonnet) for accessible personal finance education.

### Core Philosophy
* **Zero Sensitive Data:** The application **never** asks for or records sensitive banking credentials, passwords, card CVVs, OTPs, PAN, or Aadhaar numbers.
* **100% Offline Resilience:** If the Claude API key is absent or the backend is offline, the frontend seamlessly engages an embedded BFSI knowledge engine so demonstrations never fail.
* **Premium Fintech UI:** Built with dark glassmorphism, responsive CSS variables, smooth SVG gauges, interactive donut charts, and micro-animations.

---

## 🎯 Key Features & Modules

### 1. Loan Eligibility Checker
* **Multi-Field Input:** Evaluates Name, Age, Monthly Income, Monthly Living Expenses, Existing EMIs, Employment Type (Salaried/Self-employed/Business), Experience, Desired Loan, Desired Tenure, and Credit Score.
* **Transparent FOIR Calculation:** Applies institutional Fixed Obligation to Income Ratio (32%–55%) customized to employment stability and credit score brackets.
* **Key Metric Readouts:**
  * Estimated Eligible Loan Ceiling (₹)
  * Estimated Monthly EMI (₹/mo)
  * Debt-to-Income (DTI) Ratio (%)
  * Credit Profile & Employment Stability Ratings
  * Animated SVG Radial Progress Match Ring
* **"Try Demo Data" Button:** Instant 1-click loading of safe, fictional example records.
* **Application Persistence:** Allows saving demo applications to Google Sheets (or local session storage).
* **One-Click AI Profile Transfer:** Passes calculated DTI and capacity parameters straight into the AI Advisor.

### 2. Credit Score Analyzer
* **Interactive Credit Gauge:** Dynamic SVG semicircular gauge with smooth animated needle rotation across standard 300 to 900 score ranges.
* **Institutional Credit Tiers:**
  * `300–579` → Poor (Red)
  * `580–669` → Fair (Amber)
  * `670–739` → Good (Blue)
  * `740–799` → Very Good (Emerald)
  * `800–900` → Excellent (Cyan)
* **5 Credit Health Pillars:** Explains the percentage impact of Payment History (35%), Credit Utilization (30%), Length of History (15%), Credit Mix (10%), and Inquiries (10%).

### 3. Interactive EMI Calculator
* **Synchronized Controls:** Dual range sliders and number input boxes for Principal Loan Amount, Annual Interest Rate (% p.a.), and Tenure.
* **Flexible Tenure Mode:** Toggle seamlessly between **Years** and **Months**.
* **Quick Presets:** Instant selection chips (₹5L, ₹10L, ₹25L, ₹50L) and interest presets (Home 7.5%, Prime 8.5%, Auto 10.5%, Personal 12.5%).
* **Visual Breakdown Donut Chart:** Animated SVG chart displaying the exact proportion of Principal vs Total Interest Payable.
* **Amortization Schedule:** Expandable year-by-year table displaying Opening Balance, EMI, Principal Paid, Interest Paid, and Closing Balance.

### 4. AI Financial Tips (Powered by Claude)
* **Topic Selection:** Choose from 7 specialized BFSI financial planning domains:
  1. Saving Money
  2. Managing Debt
  3. Improving Credit Score
  4. Loan Planning
  5. Emergency Fund
  6. Budgeting
  7. Financial Planning
* **Context-Aware Prompts:** Optional toggle to inject applicant DTI and income parameters into Claude's prompt for personalized feedback.
* **Enterprise Claude API Integration:** Backend sends requests to Claude 3.5 Sonnet (`anthropic-version: 2023-06-01`).
* **Intelligent Built-in Fallback:** When no API key is provided, the internal knowledge base produces structured, high-value advice and takeaways.

---

## 📐 Financial Formulas & Underwriting Logic

### 1. Standard Loan EMI Formula
$$\text{EMI} = \frac{P \times r \times (1+r)^n}{(1+r)^n - 1}$$
* $P$ = Principal Loan Amount
* $r$ = Monthly interest rate = $\frac{\text{Annual Rate}}{12 \times 100}$
* $n$ = Total number of monthly installments ($\text{Tenure in Years} \times 12$)

### 2. Maximum Allowable FOIR (Fixed Obligation to Income Ratio)
* **Credit Score $\ge 750$:** Max FOIR = $50\%$ (Salaried) or $45\%$ (Self-employed)
* **Credit Score $670 - 749$:** Max FOIR = $42\%$ (Salaried) or $40\%$ (Self-employed)
* **Credit Score $< 670$:** Max FOIR = $32\%$
* **High-Income Buffer:** +$5\%$ FOIR bonus for monthly incomes $\ge ₹1,50,000$.

### 3. Eligible Loan Amount (Present Value of Cash Flows)
$$\text{Net Monthly EMI Capacity} = (\text{Monthly Income} \times \text{Max FOIR}) - \text{Existing EMIs}$$
$$\text{Max Eligible Loan} = \text{Capacity} \times \frac{(1+r)^n - 1}{r \times (1+r)^n}$$

### 4. Debt-to-Income (DTI) Ratio
$$\text{DTI (\%)} = \left(\frac{\text{Existing Monthly EMIs} + \text{Projected Monthly EMI}}{\text{Monthly Income}}\right) \times 100$$
* $\text{DTI} \le 35\%$: Healthy (Low Risk)
* $35\% < \text{DTI} \le 50\%$: Moderate Risk
* $\text{DTI} > 50\%$: High Risk (Lenders require co-applicant or loan reduction)

---

## 💻 Technology Stack

| Layer | Technologies Used | Description |
| :--- | :--- | :--- |
| **Frontend** | HTML5, CSS3, Vanilla ES6+ JavaScript | Dark glassmorphism, responsive grid, SVG charts, no bulky frameworks |
| **Backend** | Python 3.9+, Flask 2.3+, Flask-CORS | Lightweight REST API, static asset server, validation pipeline |
| **AI Engine** | Anthropic Claude 3.5 Sonnet API | Server-side prompt engineering, natural language financial advisory |
| **Persistence** | Google Sheets API (`gspread`) / Local JSON | Non-sensitive demo data logging with fallback |
| **Styling** | Modern CSS Variables, Flexbox, CSS Grid | Zero dependencies, custom SVG animations, Inter & Outfit typography |

---

## 📂 Project Architecture & Directory Structure

```text
AI-Loan-Eligibility-Checker/
│
├── frontend/                        # Client-Side Application
│   ├── index.html                   # Semantic Single-Page Dashboard
│   ├── css/
│   │   └── style.css                # Dark Glassmorphism, Responsive Tokens & Animations
│   ├── js/
│   │   └── script.js                # FOIR Engine, Amortization Math, Claude Client, Gauges
│   └── assets/
│       └── logo.svg                 # Vector Shield & AI Sparkle Brand Identity
│
├── backend/                         # Server-Side Application
│   ├── app.py                       # Flask REST Endpoints & Static File Server
│   ├── requirements.txt             # Python Package Dependencies
│   ├── services/
│   │   ├── __init__.py              # Python Services Package
│   │   ├── claude_service.py        # Anthropic Claude API Client & Knowledge Fallback
│   │   └── sheets_service.py        # Google Sheets Connector & Local JSON Backup
│   └── data/
│       ├── .gitkeep                 # Ensures empty data folder is tracked in Git
│       └── demo_applications.json   # Local sample demo records for review/viva
│
├── .env.example                     # Environment Configuration Template
├── .gitignore                       # Git Ignore for venv, keys, and credentials
├── LICENSE                          # MIT Open Source License
├── README.md                        # Complete Documentation & Viva Guide
└── run.bat                          # 1-Click Windows Launcher Script
```

---

## ⚙️ Prerequisites & System Requirements

* **Operating System:** Windows, macOS, or Linux
* **Web Browser:** Google Chrome, Mozilla Firefox, Microsoft Edge, or Safari (modern version with CSS Backdrop-Filter support)
* **Python:** Python 3.9 or higher (optional for standalone frontend mode; required for Flask REST API backend)

---

## 🚀 Installation & Setup Guide

### Step 1: Clone or Open the Repository
```bash
git clone https://github.com/your-username/AI-Loan-Eligibility-Checker.git
cd AI-Loan-Eligibility-Checker
```

### Step 2: Set Up Python Virtual Environment (Backend)
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

### Step 3: Install Required Dependencies
```bash
pip install -r backend/requirements.txt
```

---

## 🔑 Configuration (Claude API & Google Sheets)

Copy `.env.example` to create your private `.env` file:
```bash
cp .env.example .env
```
*(On Windows Command Prompt: `copy .env.example .env`)*

### Environment Variables Reference

| Variable Name | Required | Default Value | Description |
| :--- | :--- | :--- | :--- |
| `ANTHROPIC_API_KEY` | Optional | `""` | Your Claude API Key from [Anthropic Console](https://console.anthropic.com/) |
| `CLAUDE_MODEL` | Optional | `claude-3-5-sonnet-20241022` | Anthropic model identifier |
| `FLASK_PORT` | Optional | `5000` | Port for Flask web server |
| `FLASK_DEBUG` | Optional | `True` | Flask debug reloader |
| `GOOGLE_SHEETS_ENABLED` | Optional | `False` | Set `True` to enable cloud sheets logging |
| `GOOGLE_SERVICE_ACCOUNT_FILE`| Optional | `credentials.json` | Path to Google Service Account JSON |
| `GOOGLE_SHEETS_SPREADSHEET_ID`| Optional | `""` | Google Sheet Document ID |

> 🔒 **Security Notice:** The `.env` file is explicitly included in `.gitignore`. **Never commit your actual API keys or Google credentials to GitHub!**

### Configuring Anthropic Claude API
1. Visit [https://console.anthropic.com/](https://console.anthropic.com/) and generate an API key.
2. Open `.env` and set:
   ```env
   ANTHROPIC_API_KEY=sk-ant-api03-...
   ```
3. Restart the Flask backend. The status indicator in the app header will immediately display **"Claude AI Live"**.

### Configuring Google Sheets (Optional)
If you wish to log demo submissions to a shared Google Sheet:
1. Create a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the **Google Drive API** and **Google Sheets API**.
3. Create a **Service Account**, generate a JSON key, and save it as `backend/credentials.json`.
4. Create a Google Sheet and share it with the service account email (`...@...gserviceaccount.com`) as **Editor**.
5. Set `GOOGLE_SHEETS_ENABLED=True` and `GOOGLE_SHEETS_SPREADSHEET_ID=<YOUR_SHEET_ID>` in `.env`.
*(If omitted, the backend saves data locally into `backend/data/demo_applications.json` without errors).*

---

## 🏃 How to Run the Application

You can run the application in two ways:

### Mode A: Full Stack (Flask Backend + Frontend) [Recommended]
```bash
# Ensure virtual environment is activated
python backend/app.py
```
Open your browser and navigate to:
**`http://localhost:5000`**

Both the frontend UI and REST API will be served simultaneously.

### Mode B: Standalone Frontend (No Python Required)
Double-click `frontend/index.html` or open it with VS Code Live Server.
* All financial formulas, credit gauges, and EMI amortization charts run 100% locally in vanilla JavaScript.
* AI Tips automatically uses the built-in BFSI intelligence fallback engine.

### Mode C: Windows 1-Click Launcher
Double-click the included `run.bat` file in the project root directory.

---

## 📡 REST API Documentation

| Method | Endpoint | Description | Sample Request / Response |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Backend & service health check | `{"status": "online", "features": {"claude_api_configured": true}}` |
| `POST` | `/api/financial-tips` | Generate AI financial guidance | Body: `{"topic": "Managing Debt", "question": "..."}` |
| `POST` | `/api/save-application` | Store sanitized demo application | Body: `{"full_name": "Demo", "monthly_income": 85000, ...}` |
| `GET` | `/api/applications` | Retrieve recent demo entries | Returns latest demo applications for review |

---

## 📤 GitHub Upload Instructions

Follow these exact steps to push this project to your GitHub repository:

### Step 1: Initialize Git
```bash
git init
```

### Step 2: Check Status & Stage Files
```bash
git status
git add .
```
*(Verify that `.env` and `credentials.json` are NOT staged).*

### Step 3: Create Initial Commit
```bash
git commit -m "feat: initial commit of AI Loan Eligibility Checker BFSI platform"
```

### Step 4: Link Your GitHub Repository
1. Go to [GitHub.com](https://github.com) and click **New Repository**.
2. Name it: `AI-Loan-Eligibility-Checker`.
3. Leave "Initialize with README" unchecked.
4. Copy the remote URL and run:
```bash
git branch -M main
git remote add origin https://github.com/your-username/AI-Loan-Eligibility-Checker.git
git push -u origin main
```

---

## 🌐 Deployment Options

### 1. Free Frontend Hosting (GitHub Pages / Vercel / Netlify)
* If deploying frontend only:
  * Simply push the `frontend/` folder to GitHub Pages, Vercel, or Netlify.
  * It will run flawlessly in client-side fallback mode with zero server costs!

### 2. Full-Stack Cloud Deployment (Render / Railway)
* **Render.com:**
  1. Create a **New Web Service** connected to your GitHub repo.
  2. Set Build Command: `pip install -r backend/requirements.txt`
  3. Set Start Command: `python backend/app.py`
  4. Add Environment Variable: `ANTHROPIC_API_KEY=your_key` in the Render dashboard.

---

## 🎓 Viva & Project Review Quick Q&A

**Q1: What is FOIR and how does your application use it?**  
*Answer:* FOIR stands for **Fixed Obligation to Income Ratio**. Lenders use it to determine how much of a borrower's monthly earnings are already tied up in debts. Our system dynamically sets an upper FOIR ceiling (typically between 32% and 55% depending on credit score and employment stability) to calculate the maximum safe monthly installment the applicant can afford.

**Q2: How does the EMI formula handle front-loaded interest?**  
*Answer:* Using the standard compound amortization formula $P \times r \times (1+r)^n / ((1+r)^n - 1)$, every installment is constant, but in early years the outstanding principal is high, so the interest component dominates. As principal is repaid, the interest portion decreases while the principal repayment accelerates. Our expandable schedule explicitly demonstrates this.

**Q3: How do you prevent sensitive financial data leaks?**  
*Answer:* The application architecture adheres to privacy-by-design. We do not solicit PAN, Aadhaar, account numbers, card CVVs, or OTPs. Furthermore, the backend endpoint `/api/save-application` has a strict whitelist sanitizer that drops any unauthorized keys.

**Q4: How does the Claude API integration maintain high availability?**  
*Answer:* In `backend/services/claude_service.py`, requests to Claude are wrapped in structured exception handlers with timeouts. If the API key is not configured, or if Anthropic's service is temporarily unreachable, the system automatically falls back to an internal BFSI knowledge engine without throwing an unhandled exception or degrading the user experience.

---

## 🛡️ Security & Educational Disclaimer

> **IMPORTANT DISCLAIMER:**  
> This software is an **academic and educational simulation** built for demonstration and learning purposes. The eligibility numbers, interest rates, and loan estimates generated by this tool do not represent formal credit decisions, financial commitments, or formal financial advice from any registered bank or Non-Banking Financial Company (NBFC). Users should consult accredited banking professionals before making borrowing commitments.

---

## 📄 License

This project is licensed under the terms of the [MIT License](LICENSE).
