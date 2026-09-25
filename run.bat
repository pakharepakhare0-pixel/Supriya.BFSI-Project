@echo off
title AI Loan Eligibility Checker
echo =====================================================================
echo  AI Loan Eligibility Checker - BFSI Web Application Launcher
echo =====================================================================
echo.

where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Python detected on system.
    echo Installing / verifying requirements...
    pip install -r backend\requirements.txt
    echo.
    echo Starting Flask Backend on http://localhost:5000 ...
    start "" http://localhost:5000
    python backend\app.py
) else (
    echo [NOTE] Python not found in system PATH.
    echo Opening frontend dashboard directly in your default web browser...
    echo (All financial calculations, gauges, and AI fallback tips work 100% locally!)
    echo.
    start "" frontend\index.html
)

pause
