#!/usr/bin/env python3
import sys
try:
    with open('src/components/UpdateAvailable.tsx', 'r', encoding='utf8') as f:
        content = f.read()
    
    # Replace the raw apostrophe with HTML entity
    # The issue is "What's New" with a raw apostrophe in JSX
    # We need to use &apos; or ' for the apostrophe
    # But we want to keep the visible text as "What's New"
    # So we replace the apostrophe with &apos;
    content = content.replace("What's New", "What's New")
    
    with open('src/components/UpdateAvailable.tsx', 'w', encoding='utf8') as f:
        f.write(content)
    
    print('Fixed ESLint error: replaced apostrophe with '')
except Exception as e:
    print(f'Error: {e}')
    sys.exit(1)