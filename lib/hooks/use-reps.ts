// MOCK MODE — swap this import for the SWR version below when going live
import { REPS } from '@/lib/mock-data';
import { Rep } from '@/types';

export function useReps() {
  return {
    reps: REPS,
    isLoading: false,
    isError: false,
  };
}

/* ── Live version (uncomment when API credentials are ready) ──────────────
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useReps() {
  const { data, error, isLoading } = useSWR<{ reps: Rep[]; error?: string }>(
    '/api/reps',
    fetcher,
    { revalidateOnFocus: false }
  );
  return {
    reps: data?.reps ?? [],
    isLoading,
    isError: !!error || !!data?.error,
  };
}
──────────────────────────────────────────────────────────────────────────── */
