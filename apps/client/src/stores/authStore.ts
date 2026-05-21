import { create } from 'zustand'

interface User {
  id: string
  email: string
  displayName: string
  avatarUrl: string | null
  defaultPlatform: 'YOUTUBE' | null
}

interface AuthState {
  user: User | null
  setUser: (user: User | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}))
