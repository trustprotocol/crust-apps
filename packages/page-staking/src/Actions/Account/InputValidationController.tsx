// Copyright 2017-2020 @polkadot/app-staking authors & contributors
// This software may be modified and distributed under the terms
// of the Apache-2.0 license. See the LICENSE file for details.

import { AccountId, StakingLedger } from '@polkadot/types/interfaces';

import React, { useEffect, useState } from 'react';
import { Icon } from '@polkadot/react-components';
import { Option } from '@polkadot/types';
import { useApi, useCall } from '@polkadot/react-hooks';

import { useTranslation } from '../../translate';

interface Props {
  accountId: string | null;
  controllerId: string | null;
  defaultController?: string;
  onError: (error: string | null, isFatal: boolean) => void;
}

interface ErrorState {
  error: string | null;
  isFatal: boolean;
}

function ValidateController ({ accountId, controllerId, defaultController, onError }: Props): React.ReactElement<Props> | null {
  const { t } = useTranslation();
  const { api } = useApi();
  const stashBondedId = useCall<string | null>(api.query.staking.bonded, [accountId], {
    transform: (value: Option<AccountId>): string | null =>
      value.isSome
        ? value.unwrap().toString()
        : null
  });
  const bondedId = useCall<string | null>(api.query.staking.bonded, [controllerId], {
    transform: (value: Option<AccountId>): string | null =>
      value.isSome
        ? value.unwrap().toString()
        : null
  });
  const stashId = useCall<string | null>(controllerId ? api.query.staking.ledger : null, [controllerId], {
    transform: (value: Option<StakingLedger>): string | null =>
      value.isSome
        ? value.unwrap().stash.toString()
        : null
  });
  const [{ error, isFatal }, setError] = useState<ErrorState>({ error: null, isFatal: false });

  useEffect((): void => {
    // don't show an error if the selected controller is the default
    // this applies when changing controller
    if (defaultController !== controllerId) {
      let newError: string | null = null;
      let isFatal = false;
 
      // if (bondedId) {
      //   isFatal = true;
      //   newError = t<string>('A controller account should not map to another stash. This selected controller is a stash, controlled by {{bondedId}}', { replace: { bondedId } });
      // } else 
      // in crust system, a stash can be a controller, but can not controlled by multiple controller account
      if (stashBondedId) {
        isFatal = true;
        newError = t<string>('A stash account should not map to another controller. This selected stash already controlled by {{stashBondedId}}', { replace: { stashBondedId } });
      } else if (stashId) {
        isFatal = true;
        newError = t<string>('A controller account should not be set to manages multiple stashes. The selected controller is already controlling {{stashId}}', { replace: { stashId } });
      } else if (controllerId === accountId) {
        newError = t<string>('Distinct stash and controller accounts are recommended to ensure fund security. You will be allowed to make the transaction, but take care to not tie up all funds, only use a portion of the available funds during this period.');
      }

      onError(newError, isFatal);
      setError((state) => state.error !== newError ? { error: newError, isFatal } : state);
    }
  }, [accountId, bondedId, controllerId, defaultController, onError, stashId, t]);

  if (!error || !accountId) {
    return null;
  }

  return (
    <article className={isFatal ? 'error' : 'warning'}>
      <div><Icon name='warning sign' />{error}</div>
    </article>
  );
}

export default React.memo(ValidateController);
