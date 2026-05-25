import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export interface CurrentUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  defaultPlatform: 'YOUTUBE' | null;
  dailyLimit: number;
}

export function useCurrentUser(options?: { retry?: boolean | number }) {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get('/api/auth/me');
      return res.data.data as CurrentUser;
    },
    ...options,
  });
}
