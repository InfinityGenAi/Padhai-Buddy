@echo off
cd /d C:\Users\admin\Desktop\Padhai Buddy\padhai-buddy
echo Running Playwright tests...
timeout 300 npx playwright test --reporter=list 2>&1
echo.
echo Tests completed.