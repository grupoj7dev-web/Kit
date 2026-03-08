export const OFFLINE_USER = {
  id: "offline-user-123",
  email: "jheferson@gmail.com",
  user_metadata: {
    name: "Jheferson",
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export const isOfflineMode = () => {
  // Only return true if explicitly set (for testing purposes)
  return false
}

export const getOfflineSession = () => ({
  access_token: "offline-token",
  refresh_token: "offline-refresh",
  expires_in: 3600,
  token_type: "bearer",
  user: OFFLINE_USER,
})
