// Copyright 2017-2020 @polkadot/app-staking authors & contributors
// This software may be modified and distributed under the terms
// of the Apache-2.0 license. See the LICENSE file for details.

import { DeriveHeartbeats, DeriveStakingOverview } from '@polkadot/api-derive/types';
import { AccountId, Nominations } from '@polkadot/types/interfaces';
import { Authors } from '@polkadot/react-query/BlockAuthors';

import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Input, Table } from '@polkadot/react-components';
import { useApi, useCall, useFavorites } from '@polkadot/react-hooks';
import { BlockAuthorsContext } from '@polkadot/react-query';
import { Option, StorageKey } from '@polkadot/types';

import { STORE_FAVS_BASE } from '../constants';
import { useTranslation } from '../translate';
import Address from './Address';

interface Props {
  hasQueries: boolean;
  isIntentions?: boolean;
  next?: string[];
  setNominators?: (nominators: string[]) => void;
  stakingOverview?: DeriveStakingOverview;
  nominators?: string[]
}

type AccountExtend = [string, boolean, boolean];

interface Filtered {
  elected?: AccountExtend[];
  validators?: AccountExtend[];
  waiting?: AccountExtend[];
}

const EmptyAuthorsContext: React.Context<Authors> = React.createContext<Authors>({ byAuthor: {}, eraPoints: {}, lastBlockAuthors: [], lastHeaders: [] });

function filterAccounts (accounts: string[] = [], elected: string[], favorites: string[], without: string[]): AccountExtend[] {
  return accounts
    .filter((accountId): boolean => !without.includes(accountId as any))
    .map((accountId): AccountExtend => [
      accountId,
      elected.includes(accountId),
      favorites.includes(accountId)
    ])
    .sort(([,, isFavA]: AccountExtend, [,, isFavB]: AccountExtend): number =>
      isFavA === isFavB
        ? 0
        : (isFavA ? -1 : 1)
    );
}

function accountsToString (accounts: AccountId[]): string[] {
  return accounts.map((accountId): string => accountId.toString());
}

function getFiltered (stakingOverview: DeriveStakingOverview, favorites: string[], next?: string[]): Filtered {
  const allElected = accountsToString(stakingOverview.nextElected);
  const validatorIds = accountsToString(stakingOverview.validators);
  const validators = filterAccounts(validatorIds, allElected, favorites, []);
  const elected = filterAccounts(allElected, allElected, favorites, validatorIds);
  const waiting = filterAccounts(next, [], favorites, allElected);

  return {
    elected,
    validators,
    waiting
  };
}

function extractNominators (nominations: [StorageKey, Option<Nominations>][]): Record<string, [string, number][]> {
  return nominations.reduce((mapped: Record<string, [string, number][]>, [key, optNoms]) => {
    if (optNoms.isSome) {
      const nominatorId = key.args[0].toString();

      optNoms.unwrap().targets.forEach((_validatorId, index): void => {
        const validatorId = _validatorId.toString();
        const info: [string, number] = [nominatorId, index + 1];

        if (!mapped[validatorId]) {
          mapped[validatorId] = [info];
        } else {
          mapped[validatorId].push(info);
        }
      });
    }

    return mapped;
  }, {});
}

function CurrentList ({ hasQueries, isIntentions, next, setNominators, stakingOverview, nominators }: Props): React.ReactElement<Props> | null {
  const { t } = useTranslation();
  const { api } = useApi();
  const { byAuthor, eraPoints, lastBlockAuthors } = useContext(isIntentions ? EmptyAuthorsContext : BlockAuthorsContext);
  const recentlyOnline = useCall<DeriveHeartbeats>(!isIntentions && api.derive.imOnline?.receivedHeartbeats, []);
  const nominatorsInfo = useCall<[StorageKey, Option<Nominations>][]>(isIntentions && nominators && api.query.staking.guarantors.entries as any, [nominators]);
  const [favorites, toggleFavorite] = useFavorites(STORE_FAVS_BASE);
  const [{ elected, validators, waiting }, setFiltered] = useState<Filtered>({});
  const [nameFilter, setNameFilter] = useState<string>('');
  const [nominatedBy, setNominatedBy] = useState<Record<string, [string, number][]> | null>();

  useEffect((): void => {
    stakingOverview && setFiltered(
      getFiltered(stakingOverview, favorites, next)
    );
  }, [favorites, next, stakingOverview]);

  useEffect((): void => {
    nominatorsInfo && setNominatedBy(
      extractNominators(nominatorsInfo)
    );
  }, [nominatorsInfo]);

  const headerWaiting = useMemo(() => [
    [t('intentions'), 'start', 3],
    [t('guarantors'), 'start', 1],
    [t('stake limit')],
    [t('total stake')],
    [t('own stake')],
    [t('guarantee fee'), 'number', 1]
    
  ], [t]);

  const headerActive = useMemo(() => [
    [t('validators'), 'start', 3],
    [t('other stake')],
    [t('stake limit')],
    [t('total stake')],
    [t('own stake')],
    [t('guarantee fee')],
    [t('points')],
    [t('last #')],
    []
  ], [t]);

  const filter = useMemo(() => (
    <Input
      autoFocus
      isFull
      label={t<string>('filter by name, address or index')}
      onChange={setNameFilter}
      value={nameFilter}
    />
  ), [nameFilter, t]);

  const _renderRows = useCallback(
    (addresses?: AccountExtend[], isMain?: boolean): React.ReactNode[] =>
      (addresses || []).map(([address, isElected, isFavorite]): React.ReactNode => (
        <Address
          address={address}
          filterName={nameFilter}
          hasQueries={hasQueries}
          isAuthor={lastBlockAuthors.includes(address)}
          isElected={isElected}
          isFavorite={isFavorite}
          isMain={isMain}
          key={address}
          lastBlock={byAuthor[address]}
          nominatedBy={nominatedBy ? (nominatedBy[address] || []) : undefined}
          onlineCount={recentlyOnline?.[address]?.blockCount.toNumber()}
          onlineMessage={recentlyOnline?.[address]?.hasMessage}
          points={eraPoints[address]}
          setNominators={setNominators}
          toggleFavorite={toggleFavorite}
        />
      )),
    [byAuthor, eraPoints, hasQueries, lastBlockAuthors, nameFilter, nominatedBy, recentlyOnline, setNominators, toggleFavorite]
  );

  return isIntentions
    ? (
      <Table
        empty={waiting && t<string>('No waiting validators found')}
        header={headerWaiting}
      >
        {_renderRows(elected, false).concat(..._renderRows(waiting, false))}
      </Table>
    )
    : (
      <Table
        empty={validators && t<string>('No active validators found')}
        filter={filter}
        header={headerActive}
      >
        {_renderRows(validators, true)}
      </Table>
    );
}

export default React.memo(CurrentList);
