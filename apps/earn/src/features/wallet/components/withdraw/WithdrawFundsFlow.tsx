import { Button } from '@earn/components/ui/button';

import { type TokenAsset } from '../../types/TokenAsset';
import { type TxData } from '../../types/TxData';
import { type DrawerView } from '../../types/WalletTypes';

interface WithdrawFlowProps {
  tokens: TokenAsset[];
  view: DrawerView;
  setView: (view: DrawerView) => void;
  txData: TxData;
  setTxData: (txData: TxData) => void;
}

export function WithdrawFundsFlow({
  tokens: _tokens,
  view: _view,
  setView: _setView,
  txData: _txData,
  setTxData: _setTxData,
}: WithdrawFlowProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-medium text-slate-700">
        Withdrawals are not available in this build.
      </p>
      <Button className="mt-4" disabled variant="outline">
        Withdrawals disabled
      </Button>
    </div>
  );
}
