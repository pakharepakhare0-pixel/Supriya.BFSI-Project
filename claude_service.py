"""
Claude AI Service
Handles interactions with Anthropic's Claude API for personalized BFSI financial tips.
Includes a rich educational fallback generator when API keys are not provided or unreachable.
"""

import os
import json
import logging
import requests

logger = logging.getLogger(__name__)

# Topics supported by the application
VALID_TOPICS = [
    "Saving Money",
    "Managing Debt",
    "Improving Credit Score",
    "Loan Planning",
    "Emergency Fund",
    "Budgeting",
    "Financial Planning"
]

FALLBACK_KNOWLEDGE_BASE = {
    "Saving Money": {
        "title": "Smart Saving Strategies for Personal Finance",
        "points": [
            "**Automate Your Savings (Pay Yourself First):** Set up an automatic transfer of 15%–20% of your income into a dedicated high-yield savings account or liquid fund the day your salary is credited.",
            "**Audit Recurring Subscriptions:** Review bank statements quarterly. Cancel unused streaming, gym memberships, or app subscriptions that silently erode your savings.",
            "**The 24-Hour Rule for Discretionary Buys:** Before making any non-essential purchase over ₹2,000, wait 24 hours. This curbs impulsive spending and preserves liquidity.",
            "**Leverage Tiered Savings Goals:** Categorize savings into Short-Term (vacations, gadgets in 6–12 months), Medium-Term (car down-payment in 2–4 years), and Long-Term (wealth creation)."
        ],
        "key_takeaway": "Consistent incremental savings compound dramatically over time without demanding severe lifestyle austerity."
    },
    "Managing Debt": {
        "title": "Strategic Debt Elimination & FOIR Control",
        "points": [
            "**Maintain FOIR Below 40%:** Lenders prefer that your Fixed Obligation to Income Ratio (total monthly EMIs divided by monthly gross income) stays below 40%–50%.",
            "**Avalanche vs. Snowball Method:** If managing multiple credit balances, choose between the *Debt Avalanche* (pay highest interest debt first for maximum rupee savings) or *Debt Snowball* (pay smallest balance first for quick psychological momentum).",
            "**Avoid Paying Minimum Due on Credit Cards:** Credit card revolving interest typically exceeds 36%–42% p.a. Always pay the total statement balance before the due date.",
            "**Refinance High-Cost Debt:** Consider consolidating high-interest personal loans or credit card balances into a lower-interest collateralized loan or balance transfer option."
        ],
        "key_takeaway": "Reducing debt obligations directly improves your loan eligibility and frees up cash flow for wealth generation."
    },
    "Improving Credit Score": {
        "title": "Proven Steps to Elevate Your Credit Score to 750+",
        "points": [
            "**Consistent 100% On-Time Repayments:** Payment history accounts for 35% of your credit score. Never miss an EMI or credit card due date; set up auto-debit reminders.",
            "**Keep Credit Utilization Below 30%:** Using less than 30% of your assigned credit limit (e.g., spending less than ₹30,000 on a ₹1,00,000 credit limit card) signals responsible financial discipline to credit bureaus.",
            "**Maintain Older Accounts:** The length of credit history accounts for 15% of your score. Avoid closing your oldest active credit card accounts unless they carry exorbitant annual fees.",
            "**Space Out Credit Inquiries:** Frequent loan or card applications trigger 'hard inquiries', temporarily reducing your score. Apply only when genuinely required.",
            "**Regularly Review Credit Reports:** Check your report across CIBIL, Experian, or Equifax once every 6 months to spot and dispute inaccurate reporting or clerical errors."
        ],
        "key_takeaway": "Rebuilding credit takes 6 to 12 months of disciplined payment behavior, but unlocking a 750+ score earns preferential interest rates."
    },
    "Loan Planning": {
        "title": "Prudent Loan Planning & Borrowing Guidelines",
        "points": [
            "**Shop with Pre-Calculated Eligibility:** Determine your comfortable EMI capacity before contacting lenders. Your EMI should not exceed 25%–30% of your net monthly take-home pay.",
            "**Evaluate Total Cost of Borrowing, Not Just EMI:** A longer tenure reduces monthly EMI but significantly inflates total interest paid over the life of the loan.",
            "**Plan Prepayments Early in Tenure:** Because of front-loaded interest amortization, making extra principal prepayments in the first 25%–40% of the loan tenure yields massive interest savings.",
            "**Maintain a 3–6 Month EMI Buffer:** In addition to living expenses, hold at least 3 months of EMI reserves in a liquid instrument to protect against unexpected career pauses."
        ],
        "key_takeaway": "Borrow only what you can service comfortably under conservative financial scenarios."
    },
    "Emergency Fund": {
        "title": "Building a Resilient Emergency Safety Net",
        "points": [
            "**Target 3 to 6 Months of Core Living Expenses:** Calculate bare-minimum survival costs (rent, food, utility bills, insurance premiums, and active loan EMIs). Keep this fund strictly isolated.",
            "**High Liquidity Over High Returns:** Emergency reserves should be parked in risk-free, instantly accessible avenues like bank savings accounts, sweep-in fixed deposits, or overnight/liquid mutual funds.",
            "**Strict Access Criteria:** Define what constitutes an emergency: medical emergencies, unforeseen job loss, or critical home/vehicle repairs. Non-essential sales or vacation tickets do not qualify.",
            "**Replenish Promptly:** When an emergency fund is tapped, pause discretionary investing temporarily until the safety cushion is restored to 100%."
        ],
        "key_takeaway": "An adequate emergency fund prevents you from liquidating investments at a loss or taking expensive emergency personal loans."
    },
    "Budgeting": {
        "title": "Modern Budgeting Frameworks: The 50/30/20 Rule",
        "points": [
            "**The 50/30/20 Framework:** Allocate 50% of net income to Needs (housing, groceries, utilities, EMIs), 30% to Wants (dining, hobbies, leisure), and 20% directly to Savings & Debt Acceleration.",
            "**Zero-Based Budgeting:** Give every single rupee a specific assignment at the start of the month so surplus cash doesn't disappear without tracking.",
            "**Track Cash Outflows for 30 Days:** Log all transactions using a spreadsheet or expense tracking tool to identify 'financial leaks' you may not be consciously aware of.",
            "**Separate Discretionary and Fixed Bills:** Keep one checking account for fixed recurring obligations (bills, rent, EMIs) and a secondary account for weekly lifestyle spends."
        ],
        "key_takeaway": "Budgeting isn't restriction; it is conscious allocation that aligns your daily spending with your long-term goals."
    },
    "Financial Planning": {
        "title": "Comprehensive BFSI Personal Financial Roadmap",
        "points": [
            "**Step 1 — Foundation (Protection):** Secure adequate Term Life Insurance (10x–15x annual income) and Health Insurance (separate from employer coverage) before aggressive investing.",
            "**Step 2 — Stability (Liquidity):** Establish your 6-month emergency reserve and clear high-interest liabilities.",
            "**Step 3 — Growth (Wealth Creation):** Invest systematically in diversified index equity funds, PPF/EPF, and debt instruments aligned to your risk tolerance and time horizon.",
            "**Step 4 — Optimization (Tax & Retirement):** Utilize tax-deductible instruments prudently and begin retirement planning in your twenties or early thirties to maximize compound growth."
        ],
        "key_takeaway": "A holistic financial plan protects you against downsides before accelerating wealth accumulation."
    }
}


def is_claude_configured() -> bool:
    """Check if a valid Claude API key is configured in the environment."""
    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        return False
    # Check for placeholder strings
    if "your_" in api_key.lower() or "example" in api_key.lower() or len(api_key) < 15:
        return False
    return True


def generate_fallback_tips(topic: str, question: str = "", profile_context: dict = None) -> dict:
    """Generate high-quality rule-based financial advice when Claude API is unavailable."""
    selected_topic = topic if topic in FALLBACK_KNOWLEDGE_BASE else "Financial Planning"
    base_data = FALLBACK_KNOWLEDGE_BASE[selected_topic]

    context_insights = []
    if profile_context:
        income = profile_context.get("monthly_income")
        dti = profile_context.get("dti_ratio")
        credit_score = profile_context.get("credit_score")
        eligible_amt = profile_context.get("eligible_amount")

        if dti is not None:
            if dti > 45:
                context_insights.append(
                    f"⚠️ **High DTI Observation ({dti}%):** Your existing obligations are high. "
                    "Prioritize aggressive debt paydown to lower this below 40% before taking on new debt."
                )
            else:
                context_insights.append(
                    f"✅ **Healthy DTI Ratio ({dti}%):** Your debt-to-income balance is within safe lender parameters."
                )

        if credit_score is not None:
            if credit_score < 670:
                context_insights.append(
                    f"📈 **Credit Score Note ({credit_score}):** Your score is in a builder tier. "
                    "Keep credit utilization strictly under 25% for 6 consecutive months to unlock prime rates."
                )
            elif credit_score >= 750:
                context_insights.append(
                    f"🌟 **Strong Credit Rating ({credit_score}):** You qualify for prime interest tier discounts. "
                    "Leverage this score when negotiating processing fees with top-tier lenders."
                )

        if eligible_amt is not None and eligible_amt > 0:
            context_insights.append(
                f"💼 **Loan Capacity Context:** Based on your current profile, an estimated eligible ceiling of ₹{eligible_amt:,.0f} "
                "was calculated. Maintain your employment stability to preserve this borrowing power."
            )

    advice_markdown = f"### 💡 {base_data['title']}\n\n"

    if question:
        advice_markdown += f"> **Your Question:** *\"{question.strip()}\"*\n\n"

    if context_insights:
        advice_markdown += "#### 🎯 Profile-Specific Observations\n"
        for insight in context_insights:
            advice_markdown += f"- {insight}\n"
        advice_markdown += "\n"

    advice_markdown += "#### 📌 Core Recommended Action Items\n"
    for pt in base_data["points"]:
        advice_markdown += f"- {pt}\n"

    advice_markdown += f"\n> **Strategic Takeaway:** {base_data['key_takeaway']}\n"

    return {
        "success": True,
        "source": "fallback",
        "topic": selected_topic,
        "advice": advice_markdown,
        "disclaimer": "AI/Automated guidance is provided strictly for educational purposes and is not formal financial advice."
    }


def generate_financial_tips(topic: str, question: str = "", profile_context: dict = None) -> dict:
    """
    Generate personalized financial tips using Claude API if available,
    otherwise gracefully falling back to our internal BFSI knowledge engine.
    """
    if not topic or topic not in VALID_TOPICS:
        topic = "Financial Planning"

    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    model = os.getenv("CLAUDE_MODEL", "claude-3-5-sonnet-20241022").strip()

    if not is_claude_configured():
        logger.info("Claude API key not configured or placeholder detected. Using rich knowledge fallback.")
        return generate_fallback_tips(topic, question, profile_context)

    # Prepare context prompt
    user_context_str = ""
    if profile_context:
        user_context_str = (
            f"The user has shared the following approximate non-sensitive parameters from their eligibility check:\n"
            f"- Monthly Income: ₹{profile_context.get('monthly_income', 'N/A')}\n"
            f"- Monthly Expenses: ₹{profile_context.get('monthly_expenses', 'N/A')}\n"
            f"- Existing Monthly EMI: ₹{profile_context.get('existing_emi', 'N/A')}\n"
            f"- Employment Type: {profile_context.get('employment_type', 'N/A')}\n"
            f"- Approximate Credit Score: {profile_context.get('credit_score', 'N/A')}\n"
            f"- Calculated Debt-to-Income (DTI): {profile_context.get('dti_ratio', 'N/A')}%\n"
            f"- Estimated Eligible Loan Amount: ₹{profile_context.get('eligible_amount', 'N/A')}\n"
        )

    user_query = question.strip() if question else f"Please provide clear, actionable advice regarding {topic}."

    system_prompt = (
        "You are a friendly, highly professional BFSI (Banking, Financial Services & Insurance) "
        "personal finance educator. Your role is to provide clear, actionable, beginner-friendly financial guidance. "
        "Rules:\n"
        "1. Never ask for or encourage sharing sensitive details like passwords, OTPs, PAN, Aadhaar, or bank account numbers.\n"
        "2. Keep advice structured with clean markdown headers and bullet points.\n"
        "3. Emphasize prudent risk management, emergency funds, debt-to-income control, and responsible borrowing.\n"
        "4. Always maintain an educational tone and include a concluding financial disclaimer."
    )

    prompt_content = (
        f"Topic: {topic}\n\n"
        f"{user_context_str}\n"
        f"User Inquiry: {user_query}\n\n"
        f"Please provide tailored, practical recommendations for the user in clear markdown format."
    )

    try:
        headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        payload = {
            "model": model,
            "max_tokens": 1000,
            "system": system_prompt,
            "messages": [
                {"role": "user", "content": prompt_content}
            ]
        }

        response = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers=headers,
            json=payload,
            timeout=15
        )

        if response.status_code == 200:
            res_data = response.json()
            text_parts = [
                block.get("text", "")
                for block in res_data.get("content", [])
                if block.get("type") == "text"
            ]
            advice_text = "\n\n".join(text_parts).strip()
            return {
                "success": True,
                "source": "claude",
                "model": model,
                "topic": topic,
                "advice": advice_text,
                "disclaimer": "AI-generated information is for educational purposes and is not a substitute for professional financial advice."
            }
        else:
            logger.warning("Claude API returned error code %d: %s. Using fallback.", response.status_code, response.text)
            return generate_fallback_tips(topic, question, profile_context)

    except Exception as e:
        logger.exception("Exception occurred while contacting Claude API: %s. Using fallback.", str(e))
        return generate_fallback_tips(topic, question, profile_context)
