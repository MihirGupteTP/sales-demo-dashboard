// MOCK MODE — swap this import for the SWR version below when going live
import { MEETINGS } from '@/lib/mock-data';
import { Meeting } from '@/types';

export interface MeetingsResponse {
  meetings: Meeting[];
  updatedAt: string;
  error?: string;
}

export function useMeetings() {
  return {
    meetings: MEETINGS,
    updatedAt: new Date().toISOString(),
    isLoading: false,
    isError: false,
    errorMessage: undefined,
    refresh: () => {},
  };
}

/* ── Live version (uncomment when API credentials are ready) ──────────────
import useSWR from 'swr';

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
──────────────────────────────────────────────────────────────────────────── */
