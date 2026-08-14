export const MOCK_SESSIONS_RESPONSE = {
  sessions: [
    {
      id: "test-session-1",
      device: "Desktop",
      browser: "Chromium",
      os: "Windows",
      userAgent: "Playwright Test",
      lastActive: Date.now(),
      current: true,
      createdAt: Date.now() - 3600000,
    },
  ],
};

export const MOCK_SESSION_SUCCESS = { success: true };

export const MOCK_BULK_REVOKE = { success: true, revoked: 0 };
