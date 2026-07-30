import { queryOptions } from '@tanstack/react-query';

import { type SubmissionWithUser } from '@earn/interface/submission';
import { api } from '@earn/lib/api';

interface ApplicationsParams {
  id?: string;
  evaluationCompleted?: boolean;
}

const fetchUnreviewedSubmissions = async (
  params: ApplicationsParams,
): Promise<SubmissionWithUser[]> => {
  const { data } = await api.get(
    `/api/sponsor-dashboard/submissions/ai/unreviewed`,
    { params },
  );
  return data;
};

export const unreviewedSubmissionsQuery = (
  params: ApplicationsParams,
  slug?: string,
  enabled?: boolean,
) =>
  queryOptions({
    queryKey: ['unreviewed-submissions', slug, params],
    queryFn: () => fetchUnreviewedSubmissions(params),
    enabled: !!slug && !!params.id && !!params.evaluationCompleted && !!enabled,
  });
