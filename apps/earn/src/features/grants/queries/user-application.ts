import { queryOptions } from '@tanstack/react-query';

import { api } from '@earn/lib/api';
import { type GrantApplicationModel } from '@earn/prisma/models/GrantApplication';
import { type GrantTrancheModel } from '@earn/prisma/models/GrantTranche';
import { type UserModel } from '@earn/prisma/models/User';

export interface GrantApplicationWithTranchesAndUser extends GrantApplicationModel {
  GrantTranche: GrantTrancheModel[];
  user: UserModel;
}

const fetchUserApplication = async (grantId: string) => {
  const response = await api.get<GrantApplicationWithTranchesAndUser>(
    '/api/grant-application/get',
    { params: { id: grantId } },
  );
  return response.data;
};

export const userApplicationQuery = (id: string) =>
  queryOptions({
    queryKey: ['userApplication', id],
    queryFn: () => fetchUserApplication(id),
    retry: false,
  });
