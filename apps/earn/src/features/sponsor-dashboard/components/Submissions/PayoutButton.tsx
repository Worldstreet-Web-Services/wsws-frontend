import { Button } from '@earn/components/ui/button';
import { type SubmissionWithUser } from '@earn/interface/submission';
import { formatNumberWithSuffix } from '@earn/utils/formatNumberWithSuffix';

import { type Listing, type Rewards } from '@earn/features/listings/types';

interface Props {
  bounty: Listing | null;
  submission: SubmissionWithUser;
}

export const PayoutButton = ({ bounty, submission }: Props) => {
  const totalPrizeAmount =
    bounty?.rewards?.[submission?.winnerPosition as keyof Rewards] || 0;

  const totalPaidAmount =
    submission?.paymentDetails?.reduce(
      (sum, payment) => sum + payment.amount,
      0,
    ) || 0;

  const remainingAmount = totalPrizeAmount - totalPaidAmount;

  return (
    <Button
      className="ph-no-capture min-w-[160px] text-center disabled:cursor-not-allowed"
      disabled
      variant="outline"
    >
      Record {formatNumberWithSuffix(remainingAmount, 2, true) || '0'}{' '}
      {bounty?.token}
    </Button>
  );
};
