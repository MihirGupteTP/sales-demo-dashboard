import useSWR from 'swr';
import { Deal } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useDeals() {
  const { data, error, isLoading } = useSWR<{ deals: Deal[]; updatedAt: string; error?: string }>(
    '/api/deals',
    fetcher,
    { refreshInterval: 5 * 60 * 1000, revalidateOnFocus: false }
  );
  return {
    deals: data?.deals ?? [],
    updatedAt: data?.updatedAt,
    isLoading,
    isError: !!error || !!data?.error,
  };
}
