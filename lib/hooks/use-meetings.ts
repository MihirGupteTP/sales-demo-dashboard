import useSWR from 'swr';
import { Meeting } from '@/types';

export interface MeetingsResponse {
  meetings: Meeting[];
  updatedAt: string;
  error?: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useMeetings() {
  const { data, error, isLoading, mutate } = useSWR<MeetingsResponse>(
    '/api/meetings',
    fetcher,
    { refreshInterval: 5 * 60 * 1000, revalidateOnFocus: false }
  );
  return {
    meetings: data?.meetings ?? [],
    updatedAt: data?.updatedAt,
    isLoading,
    isError: !!error || !!data?.error,
    errorMessage: data?.error ?? error?.message,
    refresh: mutate,
  };
}
