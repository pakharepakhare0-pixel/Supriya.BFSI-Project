/**
 * ============================================================================
 * AI Loan Eligibility Checker - Core Frontend Controller
 * ============================================================================
 * Architecture:
 * - State Management
 * - REST API Communication (Claude AI & Application Persistence)
 * - Transparent Rule-Based FOIR & Credit Scoring Engine
 * - Interactive Dynamic EMI Amortization Engine
 * - Client-Side Fallback Engine for 100% Offline Resilience
 * ============================================================================
 */

(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // 1. CONFIGURATION & STATE
  // --------------------------------------------------------------------------
  const API_BASE = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
    ? '' // Relative path when served via Flask
    : 'http://127.0.0.1:5000'; // Fallback if opened via file:// or separate dev server

  const APP_STATE = {
    backendOnline: false,
    claudeReady: false,
    currentEligibility: null,
    emi: {
      amount: 1000000,
      rate: 8.5,
      tenure: 5,
      tenureUnit: 'years' // 'years' or 'months'
    },
    creditScore: 750,
    selectedTopic: 'Saving Money',
    savedApplications: []
  };

  // Safe client-side fallback knowledge base for AI tips if backend is offline
  const CLIENT_KNOWLEDGE_BASE = {
    'Saving Money': {
      title: 'Smart Saving Strategies for Personal Finance',
      points: [
        '**Automate 20% of Income:** Set up an automatic sweep into a liquid fund or high-interest account on payday before discretionary spending begins.',
        '**Quarterly Subscription Audits:** Cancel unused streaming services, gym memberships, and duplicate digital tools to save ₹5,000–₹15,000 annually.',
        '**The 24-Hour Purchase Rule:** Delay impulse non-essential purchases over ₹2,000 for 24 hours to separate genuine utility from emotional impulse.'
      ],
      takeaway: 'Disciplined automated saving compounds exponentially without demanding extreme lifestyle cuts.'
    },
    'Managing Debt': {
      title: 'Strategic Debt Elimination & FOIR Control',
      points: [
        '**Cap FOIR at 40%:** Maintain your Fixed Obligation to Income Ratio (total monthly EMIs / net monthly income) below 40% for financial agility.',
        '**Deploy Debt Avalanche:** Channel extra cash towards the loan with the highest interest rate (typically credit cards or unsecured personal loans).',
        '**Avoid Revolving Credit Cards:** Never settle for minimum payments. Interest accumulates at 36%–42% p.a., compounding against you.'
      ],
      takeaway: 'Minimizing existing debt obligations immediately inflates your borrowing power and protects cash flows.'
    },
    'Improving Credit Score': {
      title: 'Proven Action Plan to Elevate Credit Score to 750+',
      points: [
        '**100% On-Time Payments:** Payment history carries a 35% weight in credit scoring. Enable auto-debit for all credit card and loan installments.',
        '**Credit Utilization Below 30%:** Use less than ₹30,000 on a ₹1,00,000 limit card. High utilization flags risk to credit bureaus.',
        '**Preserve Old Accounts:** Average account age accounts for 15% of your score. Keep your oldest active card open to maintain credit history length.',
        '**Limit Hard Inquiries:** Applying for multiple loans within a short window triggers multiple hard inquiries, dragging your score down.'
      ],
      takeaway: 'Consistent 6 to 9 months of disciplined repayment reliably lifts sub-700 scores into prime lending territory.'
    },
    'Loan Planning': {
      title: 'Prudent Loan Planning & Amortization Insights',
      points: [
        '**Front-Loaded Interest Awareness:** Standard amortizing loans charge majority interest in the initial third of tenure. Make prepayments early to maximize savings.',
        '**Compare APR, Not Just Base Rates:** Account for processing fees, documentation charges, and foreclosure terms when comparing lenders.',
        '**Maintain an EMI Safety Reserve:** Always maintain at least 3 to 6 months of EMI obligations in liquid savings.'
      ],
      takeaway: 'Borrow conservatively based on verifiable repayment capacity rather than maximum allowable credit limit.'
    },
    'Emergency Fund': {
      title: 'Building a Resilient Financial Safety Buffer',
      points: [
        '**Target 6 Months of Living Costs:** Sum up rent, groceries, utility bills, insurance premiums, and ongoing EMIs.',
        '**Prioritize Instant Liquidity:** Hold emergency reserves in sweep-in FDs, high-yield savings, or overnight liquid mutual funds.',
        '**Define Qualifying Emergencies:** Strictly reserve funds for medical emergencies, sudden job pauses, or critical home repairs.'
      ],
      takeaway: 'A robust emergency fund prevents distressed liquidation of investments or expensive emergency borrowing.'
    },
    'Budgeting': {
      title: 'The 50/30/20 Budgeting Blueprint',
      points: [
        '**50% to Essential Needs:** Housing, groceries, utility bills, healthcare, and baseline debt obligations.',
        '**30% to Discretionary Wants:** Dining out, vacations, lifestyle upgrades, and leisure.',
        '**20% to Future Investments:** Systematic Investment Plans (SIPs), debt prepayments, and emergency reserve building.'
      ],
      takeaway: 'A structured budget is an allocation blueprint that empowers guilt-free spending on what matters to you.'
    },
    'Financial Planning': {
      title: 'Comprehensive BFSI Wealth Roadmap',
      points: [
        '**Step 1 — Insurance First:** Secure adequate pure Term Life Insurance (10–15x annual income) and independent Family Health Insurance.',
        '**Step 2 — Debt Optimization:** Keep non-mortgage liabilities to zero and eliminate high-cost debt.',
        '**Step 3 — Long-Term Wealth:** Invest consistently in broad-market index funds, PPF, and diversified equities aligned to long-term goals.'
      ],
      takeaway: 'Financial peace of mind begins with downside protection before pursuing high-risk returns.'
    }
  };

  // --------------------------------------------------------------------------
  // 2. DOM ELEMENTS CACHE
  // --------------------------------------------------------------------------
  const DOM = {
    // Navigation
    header: document.getElementById('site-header'),
    navLinks: document.querySelectorAll('.nav-link, .mobile-nav-link'),
    mobileToggle: document.getElementById('mobile-toggle'),
    mobileDrawer: document.getElementById('mobile-drawer'),
    systemStatus: document.getElementById('system-status'),
    toastContainer: document.getElementById('toast-container'),

    // Hero
    heroLoanDisplay: document.getElementById('hero-loan-display'),

    // Tool 1: Loan Eligibility
    eligibilityForm: document.getElementById('loan-eligibility-form'),
    loadDemoBtn: document.getElementById('load-demo-data-btn'),
    resetEligibilityBtn: document.getElementById('reset-eligibility-btn'),
    submitEligibilityBtn: document.getElementById('submit-eligibility-btn'),
    eligibilityPlaceholder: document.getElementById('eligibility-placeholder'),
    eligibilityContent: document.getElementById('eligibility-content'),
    radialProgressBar: document.getElementById('radial-progress-bar'),
    eligibilityPctVal: document.getElementById('eligibility-pct-val'),
    resultStatusBadge: document.getElementById('result-status-badge'),
    resultEligibleAmount: document.getElementById('result-eligible-amount'),
    resultDesiredComparison: document.getElementById('result-desired-comparison'),
    resultEstimatedEmi: document.getElementById('result-estimated-emi'),
    resultTenureSummary: document.getElementById('result-tenure-summary'),
    resultDtiVal: document.getElementById('result-dti-val'),
    resultDtiStatus: document.getElementById('result-dti-status'),
    resultCreditProfile: document.getElementById('result-credit-profile'),
    resultCreditScoreVal: document.getElementById('result-credit-score-val'),
    resultStabilityVal: document.getElementById('result-stability-val'),
    resultTenureProfile: document.getElementById('result-tenure-profile'),
    resultExplanationText: document.getElementById('result-explanation-text'),
    saveDemoAppBtn: document.getElementById('save-demo-app-btn'),
    transferToAiBtn: document.getElementById('transfer-to-ai-btn'),

    // Tool 2: Credit Score Analyzer
    creditScoreSlider: document.getElementById('credit-score-slider'),
    creditScoreNumber: document.getElementById('credit-score-number'),
    gaugeNeedle: document.getElementById('gauge-needle'),
    gaugeScoreText: document.getElementById('gauge-score-text'),
    gaugeTierBadge: document.getElementById('gauge-tier-badge'),
    tierTitle: document.getElementById('tier-title'),
    tierDesc: document.getElementById('tier-desc'),
    presetPills: document.querySelectorAll('.preset-pill'),

    // Tool 3: EMI Calculator
    emiAmountSlider: document.getElementById('emi-amount-slider'),
    emiAmountInput: document.getElementById('emi-amount-input'),
    emiRateSlider: document.getElementById('emi-rate-slider'),
    emiRateInput: document.getElementById('emi-rate-input'),
    emiTenureSlider: document.getElementById('emi-tenure-slider'),
    emiTenureInput: document.getElementById('emi-tenure-input'),
    tenureYearsBtn: document.getElementById('tenure-years-btn'),
    tenureMonthsBtn: document.getElementById('tenure-months-btn'),
    tenureUnitLabel: document.getElementById('tenure-unit-label'),
    resetEmiBtn: document.getElementById('reset-emi-btn'),
    displayMonthlyEmi: document.getElementById('display-monthly-emi'),
    displayPrincipalAmt: document.getElementById('display-principal-amt'),
    displayTotalInterest: document.getElementById('display-total-interest'),
    displayTotalRepayment: document.getElementById('display-total-repayment'),
    donutPrincipalRing: document.getElementById('donut-principal-ring'),
    donutInterestRing: document.getElementById('donut-interest-ring'),
    donutInterestPct: document.getElementById('donut-interest-pct'),
    legendPrincipalPct: document.getElementById('legend-principal-pct'),
    legendInterestPct: document.getElementById('legend-interest-pct'),
    toggleScheduleBtn: document.getElementById('toggle-schedule-btn'),
    closeScheduleBtn: document.getElementById('close-schedule-btn'),
    amortizationWrapper: document.getElementById('amortization-table-wrapper'),
    amortizationTbody: document.getElementById('amortization-tbody'),
    emiChips: document.querySelectorAll('.quick-chip'),

    // Tool 4: AI Financial Tips
    topicPills: document.querySelectorAll('.topic-pill'),
    suggestionChips: document.querySelectorAll('.chip-suggestion'),
    aiQuestionInput: document.getElementById('ai-question-input'),
    includeProfileContext: document.getElementById('include-profile-context'),
    generateAiTipsBtn: document.getElementById('generate-ai-tips-btn'),
    aiSpinner: document.getElementById('ai-spinner'),
    aiBtnText: document.getElementById('ai-btn-text'),
    aiSourceTag: document.getElementById('ai-source-tag'),
    aiTimestamp: document.getElementById('ai-timestamp'),
    copyAiTipsBtn: document.getElementById('copy-ai-tips-btn'),
    aiPlaceholderView: document.getElementById('ai-placeholder-view'),
    aiMarkdownRendered: document.getElementById('ai-markdown-rendered'),
    aiDisclaimerText: document.getElementById('ai-disclaimer-text'),

    // Modal
    viewRecordsBtn: document.getElementById('view-records-btn'),
    recordsModal: document.getElementById('records-modal'),
    closeModalBtn: document.getElementById('close-modal-btn'),
    closeModalFooterBtn: document.getElementById('close-modal-footer-btn'),
    recordsTbody: document.getElementById('records-tbody')
  };

  // --------------------------------------------------------------------------
  // 3. UTILITY FUNCTIONS
  // --------------------------------------------------------------------------

  /** Format numbers into Indian Rupee representation (e.g. 15,00,000) */
  function formatINR(val) {
    if (isNaN(val) || val === null) return '₹0';
    const num = Math.round(Number(val));
    return '₹' + num.toLocaleString('en-IN');
  }

  /** Display a floating toast notification */
  function showToast(message, type = 'info', duration = 3800) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
      success: '✅',
      info: '💡',
      warning: '⚠️',
      error: '❌'
    };
    
    toast.innerHTML = `<span>${icons[type] || '🔔'}</span> <span>${message}</span>`;
    DOM.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px) scale(0.95)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  /** Animate a number counting up smoothly */
  function animateValue(elem, start, end, duration = 800, prefix = '₹', isFloat = false) {
    if (!elem) return;
    const startTime = performance.now();
    
    function update(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * ease;
      
      if (isFloat) {
        elem.textContent = (prefix ? prefix : '') + current.toFixed(1);
      } else {
        elem.textContent = (prefix ? prefix : '') + Math.round(current).toLocaleString('en-IN');
      }

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        if (isFloat) {
          elem.textContent = (prefix ? prefix : '') + end.toFixed(1);
        } else {
          elem.textContent = (prefix ? prefix : '') + Math.round(end).toLocaleString('en-IN');
        }
      }
    }
    requestAnimationFrame(update);
  }

  /** Convert simple markdown into clean HTML */
  function renderMarkdown(mdText) {
    if (!mdText) return '';
    let html = mdText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
      .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^\- (.*$)/gim, '<li>$1</li>');

    // Group continuous <li> items inside <ul>
    html = html.replace(/(<li>[\s\S]*?<\/li>)/g, function(match) {
      return '<ul>' + match + '</ul>';
    }).replace(/<\/ul>\s*<ul>/g, '');

    // Wrap paragraphs for remaining plain text blocks
    return html.split('\n\n').map(p => {
      const trimmed = p.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('<h') || trimmed.startsWith('<ul') || trimmed.startsWith('<block')) {
        return trimmed;
      }
      return `<p>${trimmed}</p>`;
    }).filter(Boolean).join('');
  }

  // --------------------------------------------------------------------------
  // 4. BACKEND CONNECTIVITY & HEALTH
  // --------------------------------------------------------------------------
  async function checkBackendHealth() {
    try {
      const response = await fetch(`${API_BASE}/api/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        APP_STATE.backendOnline = true;
        APP_STATE.claudeReady = data.features?.claude_api_configured || false;

        const statusDot = DOM.systemStatus.querySelector('.status-dot');
        const statusText = DOM.systemStatus.querySelector('.status-text');

        if (APP_STATE.claudeReady) {
          statusText.textContent = 'Claude AI Live';
          statusDot.style.backgroundColor = '#10b981';
          DOM.systemStatus.title = 'Flask Backend connected with live Claude API';
        } else {
          statusText.textContent = 'Backend Ready (Demo)';
          statusDot.style.backgroundColor = '#38bdf8';
          DOM.systemStatus.title = 'Flask Backend active with built-in financial knowledge engine';
        }
        return;
      }
    } catch (err) {
      // Backend not running on local machine - use seamless browser fallback mode
      APP_STATE.backendOnline = false;
      const statusDot = DOM.systemStatus.querySelector('.status-dot');
      const statusText = DOM.systemStatus.querySelector('.status-text');
      statusText.textContent = 'Demo Mode (Offline)';
      statusDot.style.backgroundColor = '#f59e0b';
      DOM.systemStatus.title = 'Client-side standalone mode active. All calculations and fallback tips work 100% locally.';
    }
  }

  // --------------------------------------------------------------------------
  // 5. NAVIGATION & UI INTERACTIONS
  // --------------------------------------------------------------------------
  function setupNavigation() {
    // Mobile Drawer Toggle
    DOM.mobileToggle.addEventListener('click', () => {
      const isOpen = DOM.mobileDrawer.classList.toggle('open');
      DOM.mobileToggle.setAttribute('aria-expanded', isOpen);
    });

    // Close mobile drawer on link click
    DOM.navLinks.forEach(link => {
      link.addEventListener('click', () => {
        DOM.mobileDrawer.classList.remove('open');
        DOM.mobileToggle.setAttribute('aria-expanded', 'false');

        // Update active class
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        if (link.classList.contains('nav-link')) {
          link.classList.add('active');
        }
      });
    });

    // Highlight active link based on scroll position
    window.addEventListener('scroll', () => {
      const scrollPos = window.scrollY + 120;
      const sections = ['home', 'tools', 'loan-eligibility', 'credit-score', 'emi-calculator', 'ai-tips'];

      for (const sectionId of sections) {
        const sectionElem = document.getElementById(sectionId);
        if (sectionElem) {
          const top = sectionElem.offsetTop;
          const height = sectionElem.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            document.querySelectorAll('.nav-link').forEach(l => {
              if (l.getAttribute('href') === `#${sectionId}`) {
                l.classList.add('active');
              } else {
                l.classList.remove('active');
              }
            });
            break;
          }
        }
      }
    });
  }

  // --------------------------------------------------------------------------
  // 6. TOOL 1: LOAN ELIGIBILITY LOGIC & HANDLERS
  // --------------------------------------------------------------------------

  /** Clear all form validation error messages */
  function clearEligibilityErrors() {
    document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
  }

  /** Populate form with realistic fictional demo profile */
  function loadDemoData() {
    clearEligibilityErrors();
    document.getElementById('applicant-name').value = 'Rahul Sharma';
    document.getElementById('applicant-age').value = 29;
    document.getElementById('monthly-income').value = 85000;
    document.getElementById('monthly-expenses').value = 25000;
    document.getElementById('existing-emi').value = 8000;
    document.getElementById('employment-type').value = 'Salaried';
    document.getElementById('experience-years').value = 4;
    document.getElementById('desired-loan-amount').value = 1500000;
    document.getElementById('desired-tenure-years').value = 5;
    document.getElementById('applicant-credit-score').value = 760;

    showToast('Safe demo profile loaded! Calculating eligibility...', 'info', 2500);
    calculateLoanEligibility();
  }

  /** Reset the loan eligibility form */
  function resetEligibilityForm() {
    DOM.eligibilityForm.reset();
    clearEligibilityErrors();
    DOM.eligibilityPlaceholder.classList.remove('hidden');
    DOM.eligibilityContent.classList.add('hidden');
    APP_STATE.currentEligibility = null;
    showToast('Form reset successfully.', 'info', 2000);
  }

  /** Validate form fields before calculation */
  function validateEligibilityForm() {
    clearEligibilityErrors();
    let isValid = true;

    const name = document.getElementById('applicant-name').value.trim();
    const age = parseInt(document.getElementById('applicant-age').value, 10);
    const income = parseFloat(document.getElementById('monthly-income').value);
    const expenses = parseFloat(document.getElementById('monthly-expenses').value);
    const existingEmi = parseFloat(document.getElementById('existing-emi').value);
    const experience = parseFloat(document.getElementById('experience-years').value);
    const desiredLoan = parseFloat(document.getElementById('desired-loan-amount').value);
    const tenure = parseFloat(document.getElementById('desired-tenure-years').value);
    const score = parseInt(document.getElementById('applicant-credit-score').value, 10);

    if (!name) {
      document.getElementById('error-applicant-name').textContent = 'Please enter a name or demo alias.';
      isValid = false;
    }
    if (isNaN(age) || age < 18 || age > 75) {
      document.getElementById('error-applicant-age').textContent = 'Age must be between 18 and 75.';
      isValid = false;
    }
    if (isNaN(income) || income <= 5000) {
      document.getElementById('error-monthly-income').textContent = 'Monthly income must be at least ₹5,000.';
      isValid = false;
    }
    if (isNaN(expenses) || expenses < 0) {
      document.getElementById('error-monthly-expenses').textContent = 'Expenses cannot be negative.';
      isValid = false;
    }
    if (isNaN(existingEmi) || existingEmi < 0) {
      document.getElementById('error-existing-emi').textContent = 'Existing EMI cannot be negative.';
      isValid = false;
    }
    if (isNaN(experience) || experience < 0) {
      document.getElementById('error-experience-years').textContent = 'Work experience cannot be negative.';
      isValid = false;
    }
    if (isNaN(desiredLoan) || desiredLoan < 10000) {
      document.getElementById('error-desired-loan-amount').textContent = 'Loan amount must be at least ₹10,000.';
      isValid = false;
    }
    if (isNaN(tenure) || tenure < 1 || tenure > 30) {
      document.getElementById('error-desired-tenure-years').textContent = 'Tenure must be between 1 and 30 years.';
      isValid = false;
    }
    if (isNaN(score) || score < 300 || score > 900) {
      document.getElementById('error-applicant-credit-score').textContent = 'Credit score must be between 300 and 900.';
      isValid = false;
    }

    return isValid;
  }

  /** Rule-based institutional loan eligibility calculation */
  function calculateLoanEligibility() {
    if (!validateEligibilityForm()) {
      showToast('Please correct form validation errors.', 'error', 3000);
      return;
    }

    const name = document.getElementById('applicant-name').value.trim();
    const age = parseInt(document.getElementById('applicant-age').value, 10);
    const income = parseFloat(document.getElementById('monthly-income').value);
    const expenses = parseFloat(document.getElementById('monthly-expenses').value);
    const existingEmi = parseFloat(document.getElementById('existing-emi').value);
    const empType = document.getElementById('employment-type').value;
    const experience = parseFloat(document.getElementById('experience-years').value);
    const desiredLoan = parseFloat(document.getElementById('desired-loan-amount').value);
    const tenureYears = parseFloat(document.getElementById('desired-tenure-years').value);
    const creditScore = parseInt(document.getElementById('applicant-credit-score').value, 10);

    // 1. Determine Benchmark FOIR (Fixed Obligation to Income Ratio)
    let maxFoir = 0.40; // Default 40%
    if (creditScore >= 750) {
      maxFoir = empType === 'Salaried' ? 0.50 : 0.45;
    } else if (creditScore >= 670) {
      maxFoir = empType === 'Salaried' ? 0.42 : 0.40;
    } else {
      maxFoir = 0.32; // Lower limit for sub-prime scores
    }

    // High income bonus (income > ₹1.5 Lakh gets higher disposable allowance)
    if (income >= 150000) maxFoir += 0.05;

    // 2. Monthly EMI Capacity
    const maxAllowableObligation = income * maxFoir;
    const monthlyEmiCapacity = Math.max(0, maxAllowableObligation - existingEmi);

    // 3. Projected Benchmark Interest Rate based on Credit & Employment
    let interestRate = 9.5; // Base 9.5% p.a.
    if (creditScore >= 780) interestRate = 8.5;
    else if (creditScore >= 740) interestRate = 8.75;
    else if (creditScore >= 680) interestRate = 10.25;
    else if (creditScore >= 600) interestRate = 12.0;
    else interestRate = 14.5;

    if (empType !== 'Salaried') interestRate += 0.5; // Slight risk adjustment for business/self-employed

    // 4. Calculate Maximum Loan Amount (Present Value of EMI Capacity)
    // Formula: PV = EMI * [(1+r)^n - 1] / [r * (1+r)^n]
    const monthlyRate = (interestRate / 12) / 100;
    const totalInstallments = tenureYears * 12;
    const compoundFactor = Math.pow(1 + monthlyRate, totalInstallments);
    
    let maxEligibleLoan = 0;
    if (monthlyEmiCapacity > 0 && monthlyRate > 0) {
      maxEligibleLoan = monthlyEmiCapacity * (compoundFactor - 1) / (monthlyRate * compoundFactor);
    }
    // Round to nearest 1,000
    maxEligibleLoan = Math.round(maxEligibleLoan / 1000) * 1000;

    // 5. Projected Monthly EMI for Desired Loan Amount
    const desiredMonthlyEmi = Math.round((desiredLoan * monthlyRate * compoundFactor) / (compoundFactor - 1));

    // 6. Calculate Debt-to-Income (DTI) Ratio with projected loan
    const projectedTotalObligations = existingEmi + desiredMonthlyEmi;
    const dtiRatio = parseFloat(((projectedTotalObligations / income) * 100).toFixed(1));

    // 7. Calculate Match / Eligibility Percentage
    const eligibilityRatio = desiredLoan > 0 ? (maxEligibleLoan / desiredLoan) : 0;
    const eligibilityPct = Math.min(100, Math.round(eligibilityRatio * 100));

    // 8. Determine Risk Indicators & Qualitative Badges
    let dtiStatus = 'Healthy (Low Risk)';
    let dtiClass = 'text-green';
    if (dtiRatio > 50) {
      dtiStatus = 'High Risk (Exceeds 50%)';
      dtiClass = 'text-red';
    } else if (dtiRatio > 38) {
      dtiStatus = 'Moderate Risk';
      dtiClass = 'text-amber';
    }

    let creditTier = 'Good';
    let creditClass = 'text-blue';
    if (creditScore >= 800) { creditTier = 'Excellent'; creditClass = 'text-green'; }
    else if (creditScore >= 740) { creditTier = 'Very Good'; creditClass = 'text-green'; }
    else if (creditScore >= 670) { creditTier = 'Good'; creditClass = 'text-blue'; }
    else if (creditScore >= 580) { creditTier = 'Fair'; creditClass = 'text-amber'; }
    else { creditTier = 'Poor'; creditClass = 'text-red'; }

    let stabilityRating = 'Moderate';
    if (experience >= 3) stabilityRating = 'Strong';
    else if (experience < 1) stabilityRating = 'Entry Level';

    let resultStatus = 'High Probability';
    let badgeBg = '#10b981';
    if (eligibilityPct < 60 || creditScore < 600 || dtiRatio > 55) {
      resultStatus = 'Co-Applicant Advised';
      badgeBg = '#ef4444';
    } else if (eligibilityPct < 90 || dtiRatio > 45) {
      resultStatus = 'Moderate Eligibility';
      badgeBg = '#f59e0b';
    }

    // Save calculation to state
    APP_STATE.currentEligibility = {
      full_name: name,
      age: age,
      monthly_income: income,
      monthly_expenses: expenses,
      existing_emi: existingEmi,
      employment_type: empType,
      experience_years: experience,
      desired_loan_amount: desiredLoan,
      desired_tenure_years: tenureYears,
      credit_score: creditScore,
      eligible_amount: maxEligibleLoan,
      estimated_emi: desiredMonthlyEmi,
      dti_ratio: dtiRatio,
      eligibility_pct: eligibilityPct,
      risk_profile: `${resultStatus} (${dtiStatus})`,
      benchmark_interest: interestRate
    };

    // 9. Update UI Displays
    DOM.eligibilityPlaceholder.classList.add('hidden');
    DOM.eligibilityContent.classList.remove('hidden');

    DOM.resultStatusBadge.textContent = resultStatus;
    DOM.resultStatusBadge.style.backgroundColor = badgeBg;
    DOM.resultStatusBadge.style.color = '#ffffff';

    // Animate radial meter (circumference = 2 * PI * 42 = 263.89)
    const circumference = 263.89;
    const offset = circumference - (circumference * (eligibilityPct / 100));
    DOM.radialProgressBar.style.strokeDashoffset = offset;
    DOM.radialProgressBar.style.stroke = eligibilityPct >= 80 ? '#10b981' : (eligibilityPct >= 50 ? '#f59e0b' : '#ef4444');
    DOM.eligibilityPctVal.textContent = `${eligibilityPct}%`;

    // Major values with counter animations
    DOM.resultEligibleAmount.textContent = formatINR(maxEligibleLoan);
    DOM.resultDesiredComparison.textContent = `Requested: ${formatINR(desiredLoan)} • Cap: ${(maxFoir * 100).toFixed(0)}% FOIR`;
    DOM.resultEstimatedEmi.innerHTML = `${formatINR(desiredMonthlyEmi)}<span class="per-month">/mo</span>`;
    DOM.resultTenureSummary.textContent = `At ~${interestRate}% p.a. for ${tenureYears} Years`;

    DOM.resultDtiVal.textContent = `${dtiRatio}%`;
    DOM.resultDtiStatus.textContent = dtiStatus;
    DOM.resultDtiStatus.className = `tele-status ${dtiClass}`;

    DOM.resultCreditProfile.textContent = creditTier;
    DOM.resultCreditScoreVal.textContent = `Score: ${creditScore}`;
    DOM.resultCreditScoreVal.className = `tele-status ${creditClass}`;

    DOM.resultStabilityVal.textContent = stabilityRating;
    DOM.resultTenureProfile.textContent = `${experience} Yrs (${empType})`;

    // Explanation text
    DOM.resultExplanationText.innerHTML = `
      Based on your monthly net earnings of <strong>${formatINR(income)}</strong>, your calculated safe monthly installment limit is <strong>${formatINR(monthlyEmiCapacity)}</strong> (applying a ${(maxFoir * 100).toFixed(0)}% institutional FOIR ceiling minus existing obligations). 
      Your estimated borrowing ceiling is <strong>${formatINR(maxEligibleLoan)}</strong> over ${tenureYears} years.
      ${dtiRatio > 45 ? '⚠️ <em>Note: Your projected DTI exceeds 45%. Lenders may request a co-applicant or longer tenure to reduce monthly burden.</em>' : '✅ <em>Your debt-to-income balance shows favorable financial leeway.</em>'}
    `;

    showToast('Eligibility calculated successfully!', 'success', 2500);

    // Also update Hero display to reflect live action
    DOM.heroLoanDisplay.textContent = Math.round(maxEligibleLoan).toLocaleString('en-IN');
  }

  /** Save application summary via backend API or local storage */
  async function saveApplicationSummary() {
    if (!APP_STATE.currentEligibility) {
      showToast('Please calculate eligibility before saving.', 'warning', 2500);
      return;
    }

    const payload = APP_STATE.currentEligibility;

    try {
      if (APP_STATE.backendOnline) {
        const res = await fetch(`${API_BASE}/api/save-application`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Application saved! Ref: ${data.reference_id}`, 'success', 3500);
          APP_STATE.savedApplications.push(data.data || payload);
          return;
        }
      }
    } catch (err) {
      console.warn('Backend save encountered issue, using local session memory.', err);
    }

    // Local fallback save
    const refId = `DEMO-${Date.now().toString().slice(-4)}`;
    const savedRecord = {
      reference_id: refId,
      applicant_alias: payload.full_name,
      monthly_income: payload.monthly_income,
      desired_loan_amount: payload.desired_loan_amount,
      estimated_eligible_amount: payload.eligible_amount,
      estimated_emi: payload.estimated_emi,
      debt_to_income_pct: payload.dti_ratio
    };
    APP_STATE.savedApplications.push(savedRecord);
    showToast(`Saved to session memory! Ref: ${refId}`, 'success', 3500);
  }

  // --------------------------------------------------------------------------
  // 7. TOOL 2: CREDIT SCORE ANALYZER
  // --------------------------------------------------------------------------
  const CREDIT_TIERS = [
    { min: 300, max: 579, label: 'Poor', color: '#ef4444', desc: 'High risk of rejection or steep interest rates. Focus on clearing overdue balances and avoid applying for new credit.' },
    { min: 580, max: 669, label: 'Fair', color: '#f59e0b', desc: 'Sub-prime tier. Some lenders approve secured loans or loans with higher interest and collateral requirements.' },
    { min: 670, max: 739, label: 'Good', color: '#3b82f6', desc: 'Acceptable credit profile. Qualifies for competitive retail loan rates from major commercial banks.' },
    { min: 740, max: 799, label: 'Very Good', color: '#10b981', desc: 'Strong creditworthiness. Fast approvals, waived processing fees, and prime borrowing rates.' },
    { min: 800, max: 900, label: 'Excellent', color: '#06b6d4', desc: 'Top tier borrowing profile. Lenders compete to offer their lowest interest rates and premium credit terms.' }
  ];

  function updateCreditScore(score) {
    score = Math.max(300, Math.min(900, parseInt(score, 10) || 300));
    APP_STATE.creditScore = score;

    DOM.creditScoreSlider.value = score;
    DOM.creditScoreNumber.value = score;
    DOM.gaugeScoreText.textContent = score;

    // Calculate Gauge Needle Rotation
    // Arc is from -90deg (300 score) to +90deg (900 score)
    const pct = (score - 300) / (900 - 300);
    const angle = (pct * 180) - 90;
    DOM.gaugeNeedle.style.transform = `rotate(${angle}deg)`;

    // Find Tier
    const tier = CREDIT_TIERS.find(t => score >= t.min && score <= t.max) || CREDIT_TIERS[2];

    DOM.gaugeTierBadge.textContent = tier.label;
    DOM.gaugeTierBadge.style.backgroundColor = `${tier.color}22`;
    DOM.gaugeTierBadge.style.borderColor = `${tier.color}66`;
    DOM.gaugeTierBadge.style.color = tier.color;

    DOM.tierTitle.textContent = `${tier.label} Credit (${tier.min} – ${tier.max})`;
    DOM.tierTitle.style.color = tier.color;
    DOM.tierDesc.textContent = tier.desc;

    // Update active preset button
    DOM.presetPills.forEach(pill => {
      if (parseInt(pill.dataset.score, 10) === score) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });
  }

  function setupCreditAnalyzer() {
    DOM.creditScoreSlider.addEventListener('input', (e) => {
      updateCreditScore(e.target.value);
    });

    DOM.creditScoreNumber.addEventListener('change', (e) => {
      updateCreditScore(e.target.value);
    });

    DOM.presetPills.forEach(pill => {
      pill.addEventListener('click', () => {
        const score = parseInt(pill.dataset.score, 10);
        updateCreditScore(score);
      });
    });

    // Initialize with default 750
    updateCreditScore(750);
  }

  // --------------------------------------------------------------------------
  // 8. TOOL 3: EMI CALCULATOR & DONUT VISUALIZATION
  // --------------------------------------------------------------------------
  function calculateEMI() {
    const P = parseFloat(APP_STATE.emi.amount);
    const annualRate = parseFloat(APP_STATE.emi.rate);
    const tenureVal = parseFloat(APP_STATE.emi.tenure);
    const tenureMonths = APP_STATE.emi.tenureUnit === 'years' ? tenureVal * 12 : tenureVal;

    if (P <= 0 || annualRate <= 0 || tenureMonths <= 0) return;

    // Standard formula: EMI = [P * r * (1+r)^n] / [(1+r)^n - 1]
    const r = (annualRate / 12) / 100;
    const compound = Math.pow(1 + r, tenureMonths);
    const monthlyEmi = Math.round((P * r * compound) / (compound - 1));

    const totalRepayment = Math.round(monthlyEmi * tenureMonths);
    const totalInterest = Math.max(0, totalRepayment - P);

    // Update Text Displays
    DOM.displayMonthlyEmi.textContent = monthlyEmi.toLocaleString('en-IN');
    DOM.displayPrincipalAmt.textContent = formatINR(P);
    DOM.displayTotalInterest.textContent = formatINR(totalInterest);
    DOM.displayTotalRepayment.textContent = formatINR(totalRepayment);

    // Update Donut Chart
    const principalPct = parseFloat(((P / totalRepayment) * 100).toFixed(1));
    const interestPct = parseFloat(((totalInterest / totalRepayment) * 100).toFixed(1));

    DOM.donutInterestPct.textContent = `${interestPct}%`;
    DOM.legendPrincipalPct.textContent = `${principalPct}%`;
    DOM.legendInterestPct.textContent = `${interestPct}%`;

    // SVG Circle Circumference = 2 * PI * 60 ≈ 376.99
    const circumference = 376.99;
    const principalOffset = circumference - (circumference * (principalPct / 100));
    DOM.donutPrincipalRing.style.strokeDashoffset = principalOffset;

    // Generate Amortization Schedule Data
    renderAmortizationSchedule(P, r, monthlyEmi, tenureMonths);
  }

  /** Render year-by-year loan amortization schedule */
  function renderAmortizationSchedule(principal, monthlyRate, emi, totalMonths) {
    DOM.amortizationTbody.innerHTML = '';
    let balance = principal;
    const totalYears = Math.ceil(totalMonths / 12);

    for (let year = 1; year <= totalYears; year++) {
      const startBalance = balance;
      let yearlyPrincipalPaid = 0;
      let yearlyInterestPaid = 0;

      for (let m = 1; m <= 12; m++) {
        if (balance <= 0) break;
        const interestMonth = balance * monthlyRate;
        const principalMonth = Math.min(balance, emi - interestMonth);
        yearlyInterestPaid += interestMonth;
        yearlyPrincipalPaid += principalMonth;
        balance -= principalMonth;
      }

      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>Year ${year}</strong></td>
        <td>${formatINR(startBalance)}</td>
        <td>${formatINR(yearlyPrincipalPaid + yearlyInterestPaid)}</td>
        <td style="color: #60a5fa;">${formatINR(yearlyPrincipalPaid)}</td>
        <td style="color: #fbbf24;">${formatINR(yearlyInterestPaid)}</td>
        <td>${formatINR(Math.max(0, balance))}</td>
      `;
      DOM.amortizationTbody.appendChild(row);

      if (balance <= 0) break;
    }
  }

  function setupEmiCalculator() {
    // Principal Amount Sync
    DOM.emiAmountSlider.addEventListener('input', (e) => {
      APP_STATE.emi.amount = parseFloat(e.target.value);
      DOM.emiAmountInput.value = e.target.value;
      calculateEMI();
    });
    DOM.emiAmountInput.addEventListener('change', (e) => {
      let val = Math.max(10000, Math.min(20000000, parseFloat(e.target.value) || 100000));
      APP_STATE.emi.amount = val;
      DOM.emiAmountSlider.value = Math.min(10000000, val);
      calculateEMI();
    });

    // Quick Chips for Principal
    DOM.emiChips.forEach(chip => {
      chip.addEventListener('click', () => {
        if (chip.dataset.amount) {
          const amt = parseFloat(chip.dataset.amount);
          APP_STATE.emi.amount = amt;
          DOM.emiAmountInput.value = amt;
          DOM.emiAmountSlider.value = amt;
          document.querySelectorAll('.quick-chip[data-amount]').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          calculateEMI();
        } else if (chip.dataset.rate) {
          const rate = parseFloat(chip.dataset.rate);
          APP_STATE.emi.rate = rate;
          DOM.emiRateInput.value = rate;
          DOM.emiRateSlider.value = rate;
          document.querySelectorAll('.quick-chip[data-rate]').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          calculateEMI();
        }
      });
    });

    // Interest Rate Sync
    DOM.emiRateSlider.addEventListener('input', (e) => {
      APP_STATE.emi.rate = parseFloat(e.target.value);
      DOM.emiRateInput.value = e.target.value;
      calculateEMI();
    });
    DOM.emiRateInput.addEventListener('change', (e) => {
      let val = Math.max(1, Math.min(30, parseFloat(e.target.value) || 8.5));
      APP_STATE.emi.rate = val;
      DOM.emiRateSlider.value = Math.min(20, val);
      calculateEMI();
    });

    // Tenure Sync
    DOM.emiTenureSlider.addEventListener('input', (e) => {
      APP_STATE.emi.tenure = parseFloat(e.target.value);
      DOM.emiTenureInput.value = e.target.value;
      calculateEMI();
    });
    DOM.emiTenureInput.addEventListener('change', (e) => {
      let maxVal = APP_STATE.emi.tenureUnit === 'years' ? 30 : 360;
      let val = Math.max(1, Math.min(maxVal, parseFloat(e.target.value) || 5));
      APP_STATE.emi.tenure = val;
      DOM.emiTenureSlider.value = val;
      calculateEMI();
    });

    // Tenure Unit Toggle
    DOM.tenureYearsBtn.addEventListener('click', () => {
      if (APP_STATE.emi.tenureUnit === 'years') return;
      APP_STATE.emi.tenureUnit = 'years';
      DOM.tenureYearsBtn.classList.add('active');
      DOM.tenureMonthsBtn.classList.remove('active');
      DOM.tenureUnitLabel.textContent = 'Yr';

      // Convert months to years
      const years = Math.max(1, Math.round(APP_STATE.emi.tenure / 12));
      APP_STATE.emi.tenure = years;
      DOM.emiTenureSlider.max = 30;
      DOM.emiTenureSlider.value = years;
      DOM.emiTenureInput.max = 30;
      DOM.emiTenureInput.value = years;
      calculateEMI();
    });

    DOM.tenureMonthsBtn.addEventListener('click', () => {
      if (APP_STATE.emi.tenureUnit === 'months') return;
      APP_STATE.emi.tenureUnit = 'months';
      DOM.tenureMonthsBtn.classList.add('active');
      DOM.tenureYearsBtn.classList.remove('active');
      DOM.tenureUnitLabel.textContent = 'Mo';

      // Convert years to months
      const months = Math.min(360, APP_STATE.emi.tenure * 12);
      APP_STATE.emi.tenure = months;
      DOM.emiTenureSlider.max = 360;
      DOM.emiTenureSlider.value = months;
      DOM.emiTenureInput.max = 360;
      DOM.emiTenureInput.value = months;
      calculateEMI();
    });

    // Reset Button
    DOM.resetEmiBtn.addEventListener('click', () => {
      APP_STATE.emi = { amount: 1000000, rate: 8.5, tenure: 5, tenureUnit: 'years' };
      DOM.emiAmountInput.value = 1000000;
      DOM.emiAmountSlider.value = 1000000;
      DOM.emiRateInput.value = 8.5;
      DOM.emiRateSlider.value = 8.5;
      DOM.emiTenureInput.value = 5;
      DOM.emiTenureSlider.value = 5;
      DOM.tenureYearsBtn.click();
      calculateEMI();
      showToast('EMI calculator reset.', 'info', 1800);
    });

    // Schedule Toggle
    DOM.toggleScheduleBtn.addEventListener('click', () => {
      DOM.amortizationWrapper.classList.toggle('hidden');
      if (!DOM.amortizationWrapper.classList.contains('hidden')) {
        DOM.amortizationWrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });

    DOM.closeScheduleBtn.addEventListener('click', () => {
      DOM.amortizationWrapper.classList.add('hidden');
    });

    // Initialize calculation
    calculateEMI();
  }

  // --------------------------------------------------------------------------
  // 9. TOOL 4: AI FINANCIAL TIPS (CLAUDE & SMART FALLBACK)
  // --------------------------------------------------------------------------
  async function generateAIFinancialTips() {
    const topic = APP_STATE.selectedTopic;
    const question = DOM.aiQuestionInput.value.trim();
    const includeContext = DOM.includeProfileContext.checked && APP_STATE.currentEligibility;

    // Show loading state
    DOM.generateAiTipsBtn.disabled = true;
    DOM.aiSpinner.classList.remove('hidden');
    DOM.aiBtnText.textContent = 'Consulting AI Advisor...';

    const payload = {
      topic: topic,
      question: question,
      profile_context: includeContext ? APP_STATE.currentEligibility : null
    };

    let result = null;

    try {
      if (APP_STATE.backendOnline) {
        const response = await fetch(`${API_BASE}/api/financial-tips`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          result = await response.json();
        }
      }
    } catch (err) {
      console.warn('Backend unavailable, activating browser fallback intelligence.', err);
    }

    // Client-side fallback if backend call was not possible
    if (!result || !result.success) {
      const fallback = CLIENT_KNOWLEDGE_BASE[topic] || CLIENT_KNOWLEDGE_BASE['Financial Planning'];
      let adviceMarkdown = `### 💡 ${fallback.title}\n\n`;
      if (question) {
        adviceMarkdown += `> **Inquiry:** *"${question}"*\n\n`;
      }
      if (includeContext && APP_STATE.currentEligibility) {
        adviceMarkdown += `#### 🎯 Profile Observations\n`;
        adviceMarkdown += `- **FOIR / DTI:** Your current DTI is ${APP_STATE.currentEligibility.dti_ratio}%. Keep it below 40% before submitting applications.\n`;
        adviceMarkdown += `- **Credit Health:** Score of ${APP_STATE.currentEligibility.credit_score} puts you in the ${APP_STATE.currentEligibility.risk_profile.split(' ')[0]} bracket.\n\n`;
      }
      adviceMarkdown += `#### 📌 Recommended Action Items\n`;
      fallback.points.forEach(p => {
        adviceMarkdown += `- ${p}\n`;
      });
      adviceMarkdown += `\n> **Key Principle:** ${fallback.takeaway}\n`;

      result = {
        success: true,
        source: 'fallback',
        topic: topic,
        advice: adviceMarkdown,
        disclaimer: 'AI guidance is for educational planning and does not constitute formal financial advisory.'
      };
    }

    // Render result
    DOM.aiPlaceholderView.classList.add('hidden');
    DOM.aiMarkdownRendered.classList.remove('hidden');
    DOM.aiMarkdownRendered.innerHTML = renderMarkdown(result.advice);

    // Source & Timestamp badges
    if (result.source === 'claude') {
      DOM.aiSourceTag.textContent = `Source: Claude 3.5 Sonnet (${result.model || 'Anthropic API'})`;
      DOM.aiSourceTag.style.color = '#38bdf8';
    } else {
      DOM.aiSourceTag.textContent = 'Source: BFSI Rules Knowledge Engine';
      DOM.aiSourceTag.style.color = '#a78bfa';
    }
    DOM.aiTimestamp.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (result.disclaimer) {
      DOM.aiDisclaimerText.textContent = result.disclaimer;
    }

    // Reset button
    DOM.generateAiTipsBtn.disabled = false;
    DOM.aiSpinner.classList.add('hidden');
    DOM.aiBtnText.textContent = '✨ Generate Financial Tips';

    showToast('Financial recommendations ready!', 'success', 2500);
  }

  function setupAIFinancialTips() {
    // Topic Pills
    DOM.topicPills.forEach(pill => {
      pill.addEventListener('click', () => {
        DOM.topicPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        APP_STATE.selectedTopic = pill.dataset.topic;
      });
    });

    // Suggestion Chips
    DOM.suggestionChips.forEach(chip => {
      chip.addEventListener('click', () => {
        DOM.aiQuestionInput.value = chip.dataset.prompt;
        DOM.aiQuestionInput.focus();
      });
    });

    // Generate Button
    DOM.generateAiTipsBtn.addEventListener('click', generateAIFinancialTips);

    // Copy Button
    DOM.copyAiTipsBtn.addEventListener('click', () => {
      const textToCopy = DOM.aiMarkdownRendered.innerText;
      if (!textToCopy) {
        showToast('Generate tips first before copying.', 'warning', 2000);
        return;
      }
      navigator.clipboard.writeText(textToCopy).then(() => {
        showToast('Tips copied to clipboard!', 'success', 2000);
      }).catch(() => {
        showToast('Failed to copy to clipboard.', 'error', 2000);
      });
    });
  }

  // --------------------------------------------------------------------------
  // 10. SAVED DEMO RECORDS MODAL
  // --------------------------------------------------------------------------
  async function openRecordsModal() {
    DOM.recordsModal.classList.remove('hidden');
    DOM.recordsModal.setAttribute('aria-hidden', 'false');
    DOM.recordsTbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-dim);">Loading demo records...</td></tr>';

    let records = [...APP_STATE.savedApplications];

    // Try fetching from backend if online
    if (APP_STATE.backendOnline) {
      try {
        const res = await fetch(`${API_BASE}/api/applications`);
        if (res.ok) {
          const data = await res.json();
          if (data.applications && data.applications.length > 0) {
            records = data.applications;
          }
        }
      } catch (e) {
        console.warn('Could not fetch remote records, using local cache.', e);
      }
    }

    DOM.recordsTbody.innerHTML = '';
    if (records.length === 0) {
      DOM.recordsTbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding: 1.5rem;">No demo records saved yet in this session. Calculate eligibility and click "Save Demo Summary".</td></tr>';
      return;
    }

    records.slice().reverse().forEach(rec => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><code style="color: #93c5fd;">${rec.reference_id || 'N/A'}</code></td>
        <td>${rec.applicant_alias || 'Demo User'}</td>
        <td>${formatINR(rec.monthly_income)}</td>
        <td>${formatINR(rec.desired_loan_amount)}</td>
        <td style="color: #34d399; font-weight: 600;">${formatINR(rec.estimated_eligible_amount || rec.eligible_amount)}</td>
        <td>${formatINR(rec.estimated_emi)}</td>
        <td><span class="badge-pill" style="font-size: 0.72rem; background: rgba(59, 130, 246, 0.2);">${rec.debt_to_income_pct || rec.dti_ratio}%</span></td>
      `;
      DOM.recordsTbody.appendChild(row);
    });
  }

  function closeRecordsModal() {
    DOM.recordsModal.classList.add('hidden');
    DOM.recordsModal.setAttribute('aria-hidden', 'true');
  }

  function setupModal() {
    DOM.viewRecordsBtn.addEventListener('click', openRecordsModal);
    DOM.closeModalBtn.addEventListener('click', closeRecordsModal);
    DOM.closeModalFooterBtn.addEventListener('click', closeRecordsModal);
    DOM.recordsModal.addEventListener('click', (e) => {
      if (e.target === DOM.recordsModal) closeRecordsModal();
    });
  }

  // --------------------------------------------------------------------------
  // 11. CROSS-TOOL INTEGRATIONS
  // --------------------------------------------------------------------------
  function setupCrossToolTriggers() {
    // Transfer eligibility profile to AI tips section
    DOM.transferToAiBtn.addEventListener('click', () => {
      document.querySelector('a[href="#ai-tips"]').click();
      DOM.includeProfileContext.checked = true;
      DOM.aiQuestionInput.value = 'Based on my calculated eligibility and DTI ratio, what steps can I take to optimize my loan terms?';
      DOM.aiQuestionInput.focus();
      showToast('Profile transferred to AI advisor context!', 'info', 2500);
    });

    // Save Demo Application Button
    DOM.saveDemoAppBtn.addEventListener('click', saveApplicationSummary);

    // Form Event Listeners
    DOM.eligibilityForm.addEventListener('submit', (e) => {
      e.preventDefault();
      calculateLoanEligibility();
    });

    DOM.loadDemoBtn.addEventListener('click', loadDemoData);
    DOM.resetEligibilityBtn.addEventListener('click', resetEligibilityForm);
  }

  // --------------------------------------------------------------------------
  // 12. INITIALIZATION
  // --------------------------------------------------------------------------
  function init() {
    setupNavigation();
    setupCreditAnalyzer();
    setupEmiCalculator();
    setupAIFinancialTips();
    setupCrossToolTriggers();
    setupModal();
    checkBackendHealth();

    console.log('🚀 AI Loan Eligibility Checker initialized successfully.');
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
