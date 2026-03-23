import useSWR from 'swr';
import { Meeting } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export interface MeetingsResponse {
  meetings: Meeting[];
  updatedAt: string;
  error?: string;
}

export function useMeetings() {
  const { data, error, isLoading, mutate } = useSWR<MeetingsResponse>(
    '/api/meetings',
    fetcher,
    {
      refreshInterval: 5 * 60 * 1000, // re-fetch every 5 minutes
      revalidateOnFocus: false,
    }
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
