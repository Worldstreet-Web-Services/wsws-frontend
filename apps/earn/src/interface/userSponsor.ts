import type { SponsorType } from '@earn/interface/sponsor';
import type { User } from '@earn/interface/user';
import type { Role } from '@earn/prisma/enums';

interface UserSponsor {
  userId?: string;
  sponsorId?: string;
  role?: Role;
  createdAt?: string;
  updatedAt?: string;
  user?: User;
  sponsor?: SponsorType;
}
export type { UserSponsor };
