import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

import { Alert, AlertDescription } from '@earn/components/ui/alert';
import { Button } from '@earn/components/ui/button';

export function TalentButton({
  showMessage,
  isLoading,
  checkTalent,
}: {
  showMessage?: boolean;
  isLoading?: boolean;
  checkTalent: () => void;
}) {
  return (
    <>
      {!!showMessage && (
        <Alert variant="default" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Please log in to continue!</AlertDescription>
        </Alert>
      )}
      <Link href="#" className="block">
        <Button
          className="bg-brand-grey hover:bg-brand-grey-dark h-12 w-full rounded text-white"
          onClick={() => checkTalent()}
          disabled={isLoading}
        >
          {isLoading ? (
            <span>Redirecting...</span>
          ) : (
            <span>Continue as Talent</span>
          )}
        </Button>
      </Link>
    </>
  );
}
