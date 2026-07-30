import { type GrantWithApplicationCount } from '@earn/features/grants/types';
import { type Listing } from '@earn/features/listings/types';

export type GrantsSearch = GrantWithApplicationCount & {
  approvedApplications: number;
  searchType: 'grants';
};

export type ListingSearch = Listing & { searchType: 'listing' };

export type SearchResult = GrantsSearch | ListingSearch;
