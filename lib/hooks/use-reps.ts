import useSWR from 'swr';
import { Rep } from '@/types';

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
