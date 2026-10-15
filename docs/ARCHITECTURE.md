# MindEase V2 architecture

Frontend routes: Dashboard, Weekly Analysis, Daily Analysis, Tasks, Journaling, AI Chat, Counsellor Chat, Meditation, Fun Face Scan, History, Profile and Settings.

Keep shared theme in `frontend/src/theme/ThemeProvider.tsx`; pages use the same theme context. The light and dark themes apply globally.

Only eligible chatbot mood-analysis records should feed daily and weekly reports. Face scans, counsellor messages, meditation completion and suggestions must not directly alter mood scores. Weekly emotion percentages shown in the starter are sample values only until the backend analysis is connected.
