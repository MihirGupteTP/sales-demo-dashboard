import useSWR from 'swr';
import { Meeting, ComplianceSummary } from '@/types';

export interface MeetingsResponse {
  meetings: Meeting[];
  compliance?: ComplianceSummary;
  updatedAt: string;
  error?: string;
}

const EMPTY_COMPLIANCE: ComplianceSummary = {
  noDeal: [],
  blankDemoStatus: [],
  noContact: [],
  noLead: [],
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useMeetings() {
  const { data, error, isLoading, mutate } = useSWR<MeetingsResponse>(
    '/api/meetings',
    fetcher,
    { refreshInterval: 5 * 60 * 1000, revalidateOnFocus: false }
  );
  return {
    meetings: data?.meetings ?? [],
    compliance: data?.compliance ?? EMPTY_COMPLIANCE,
    updatedAt: data?.updatedAt,
    isLoading,
    isError: !!error || !!data?.error,
    errorMessage: data?.error ?? error?.message,
    refresh: mutate,
  };
}
