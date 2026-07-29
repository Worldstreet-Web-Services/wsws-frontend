import { atom } from 'jotai';

import { type TimeoutHandle } from '@earn/hooks/use-timeout';

const popupsShowedAtom = atom(0);
const popupOpenAtom = atom(false);

const popupTimeoutAtom = atom<TimeoutHandle>();

export { popupOpenAtom, popupsShowedAtom, popupTimeoutAtom };
