import { Check, ChevronDown, CopyIcon, Loader2, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@earn/components/ui/badge';
import { Button } from '@earn/components/ui/button';
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@earn/components/ui/command';
import { CopyButton } from '@earn/components/ui/copy-tooltip';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@earn/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@earn/components/ui/popover';
import {
  addTokenToList,
  type Token,
  useTokenList,
} from '@earn/constants/tokenList';
import { cn } from '@earn/utils/cn';
import {
  getTokenSearchRank,
  normalizeTokenSearchValue,
  sortRegistryTokenSearchResults,
  sortTokenSearchResults,
} from '@earn/utils/tokenSearch';
import { truncatePublicKey } from '@earn/utils/truncatePublicKey';

import { useListingForm } from '../../../../hooks';
import { TokenLabel } from './TokenLabel';

interface RegistryToken {
  id: string;
  name: string;
  symbol: string;
  icon?: string | null;
  decimals: number;
  isVerified: boolean;
}

type TokenSearchResponse = {
  registryTokens?: RegistryToken[];
};

type AddTokenResponse = {
  token?: Token;
  error?: string;
};

const supportEmail = 'support@superteam.fun';
const defaultTokenIcon = '/assets/dollar.svg';

function TokenSearchLabel({
  icon,
  name,
  symbol,
  mintAddress,
}: {
  icon?: string | null;
  name: string;
  symbol?: string | null;
  mintAddress: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <img
        src={icon || defaultTokenIcon}
        alt={symbol || name}
        className="h-4 w-4 shrink-0"
      />
      <div className="min-w-0">
        <p className="truncate text-sm">
          {name}
          {symbol ? <span className="text-slate-500"> ({symbol})</span> : null}
        </p>
        <p className="truncate text-xs text-slate-500">
          {truncatePublicKey(mintAddress, 6)}
        </p>
      </div>
    </div>
  );
}

function ReachOutMessage({ registryUrl }: { registryUrl?: string }) {
  return (
    <div className="flex flex-col gap-2 py-8 text-center text-sm">
      <p>Please reach out to us to add your token</p>
      <p className="mx-auto w-2/3 text-slate-500 sm:text-[0.6875rem]">
        {`Send us your token's`}{' '}
        {registryUrl ? (
          <a
            target="_blank"
            href={registryUrl}
            className="text-[#1C4CE7] hover:underline"
          >
            Token Registry link
          </a>
        ) : (
          'Token Registry link'
        )}{' '}
        at
        <CopyButton
          text={supportEmail}
          contentProps={{
            side: 'left',
            className: 'text-[0.6875rem] px-2 py-0.5',
          }}
          content="Click to copy"
        >
          <Badge
            variant="secondary"
            className="border-border mx-1 my-0.5 inline-flex cursor-pointer items-center gap-1 px-1 text-slate-500 sm:text-[11px]"
          >
            {supportEmail}
            <CopyIcon className="h-3 w-3" />
          </Badge>
        </CopyButton>
        to get it added.
      </p>
    </div>
  );
}

export function TokenSelect() {
  const form = useListingForm();
  const tokens = useTokenList();
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [registryTokens, setRegistryTokens] = useState<RegistryToken[]>([]);
  const [isSearchingRegistry, setIsSearchingRegistry] = useState(false);
  const [addingMintAddress, setAddingMintAddress] = useState<string | null>(
    null,
  );

  const trimmedSearchValue = searchValue.trim();
  const normalizedSearchValue = normalizeTokenSearchValue(trimmedSearchValue);
  const filteredTokens = useMemo(() => {
    if (!normalizedSearchValue) return tokens;

    return sortTokenSearchResults(
      tokens.filter(
        (token) =>
          normalizeTokenSearchValue(token.tokenName).includes(
            normalizedSearchValue,
          ) ||
          normalizeTokenSearchValue(token.tokenSymbol).includes(
            normalizedSearchValue,
          ) ||
          normalizeTokenSearchValue(token.mintAddress).includes(
            normalizedSearchValue,
          ),
      ),
      trimmedSearchValue,
    );
  }, [normalizedSearchValue, trimmedSearchValue, tokens]);

  const shouldSearchRegistry = normalizedSearchValue.length >= 2;
  const filteredRegistryTokens = useMemo(
    () =>
      sortRegistryTokenSearchResults(
        registryTokens.filter((token) => {
          const isDuplicateLocalToken = tokens.some(
            (localToken) => localToken.mintAddress === token.id,
          );

          return !isDuplicateLocalToken;
        }),
        trimmedSearchValue,
      ),
    [registryTokens, tokens, trimmedSearchValue],
  );
  const verifiedRegistryTokens = filteredRegistryTokens.filter(
    (token) => token.isVerified,
  );
  const unverifiedRegistryToken = filteredRegistryTokens.find(
    (token) => !token.isVerified,
  );

  useEffect(() => {
    if (!shouldSearchRegistry) {
      setRegistryTokens([]);
      setIsSearchingRegistry(false);
      return;
    }

    const abortController = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setIsSearchingRegistry(true);

      try {
        const response = await fetch(
          `/api/tokens?query=${encodeURIComponent(trimmedSearchValue)}`,
          {
            credentials: 'same-origin',
            cache: 'no-store',
            signal: abortController.signal,
          },
        );

        if (!response.ok) {
          throw new Error('Failed to search Token Registry tokens');
        }

        const data = (await response.json()) as TokenSearchResponse;
        setRegistryTokens(
          Array.isArray(data.registryTokens) ? data.registryTokens : [],
        );
      } catch (error) {
        if (abortController.signal.aborted) return;
        console.error('Failed to search Token Registry tokens', error);
        setRegistryTokens([]);
      } finally {
        if (!abortController.signal.aborted) {
          setIsSearchingRegistry(false);
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
      abortController.abort();
    };
  }, [shouldSearchRegistry, trimmedSearchValue]);

  const addRegistryToken = async (
    mintAddress: string,
    onSelect: (value: string) => void,
  ) => {
    setAddingMintAddress(mintAddress);

    try {
      const response = await fetch('/api/tokens', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mintAddress }),
      });
      const data = (await response.json()) as AddTokenResponse;

      if (!response.ok || !data.token) {
        throw new Error(data.error || 'Failed to add token');
      }

      addTokenToList(data.token);
      onSelect(data.token.tokenSymbol);
      form.saveDraft();
      setSearchValue('');
      setOpen(false);
      toast.success(`${data.token.tokenSymbol} added`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to add token',
      );
    } finally {
      setAddingMintAddress(null);
    }
  };

  return (
    <FormField
      name="token"
      control={form?.control}
      render={({ field }) => {
        const localBestRank = filteredTokens[0]
          ? getTokenSearchRank({
              query: trimmedSearchValue,
              name: filteredTokens[0].tokenName,
              symbol: filteredTokens[0].tokenSymbol,
              mintAddress: filteredTokens[0].mintAddress,
              sortOrder: filteredTokens[0].sortOrder,
            })
          : Number.POSITIVE_INFINITY;
        const registryBestRank = verifiedRegistryTokens[0]
          ? getTokenSearchRank({
              query: trimmedSearchValue,
              name: verifiedRegistryTokens[0].name,
              symbol: verifiedRegistryTokens[0].symbol,
              mintAddress: verifiedRegistryTokens[0].id,
            })
          : Number.POSITIVE_INFINITY;
        const shouldShowRegistryFirst = registryBestRank < localBestRank;

        const localTokenResults =
          filteredTokens.length > 0 ? (
            <CommandGroup>
              {filteredTokens.map((token) => (
                <CommandItem
                  value={`${token.tokenName} ${token.tokenSymbol} ${token.mintAddress}`}
                  key={token.tokenSymbol}
                  onSelect={() => {
                    field.onChange(token.tokenSymbol);
                    form.saveDraft();
                    setOpen(false);
                  }}
                >
                  <TokenSearchLabel
                    icon={token.icon}
                    name={token.tokenName}
                    symbol={token.tokenSymbol}
                    mintAddress={token.mintAddress}
                  />
                  <Check
                    className={cn(
                      'ml-auto',
                      token.tokenSymbol === field.value
                        ? 'opacity-100'
                        : 'opacity-0',
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null;

        const registryTokenResults =
          shouldSearchRegistry &&
          !isSearchingRegistry &&
          verifiedRegistryTokens.length > 0 ? (
            <CommandGroup heading="Found on Token Registry">
              {verifiedRegistryTokens.map((token) => (
                <div
                  key={token.id}
                  className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
                >
                  <TokenSearchLabel
                    icon={token.icon}
                    name={token.name}
                    symbol={token.symbol}
                    mintAddress={token.id}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="ml-auto h-7 gap-1"
                    disabled={!!addingMintAddress}
                    onClick={() => addRegistryToken(token.id, field.onChange)}
                  >
                    {addingMintAddress === token.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Plus className="h-3 w-3" />
                    )}
                    Add
                  </Button>
                </div>
              ))}
            </CommandGroup>
          ) : null;

        return (
          <FormItem className="gap-2">
            <FormLabel>Payment</FormLabel>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                      'w-full justify-between',
                      !field.value && 'text-muted-foreground',
                    )}
                  >
                    {field.value ? (
                      <TokenLabel
                        showIcon
                        showSymbol
                        classNames={{
                          symbol: 'text-slate-900',
                          postfix: 'text-slate-900',
                        }}
                      />
                    ) : (
                      <span>Select Token</span>
                    )}
                    <ChevronDown className="opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-[33rem] p-0">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search token name, ticker, or mint address..."
                    className="h-9"
                    value={searchValue}
                    onValueChange={setSearchValue}
                  />
                  <CommandList>
                    {shouldShowRegistryFirst
                      ? registryTokenResults
                      : localTokenResults}
                    {shouldShowRegistryFirst
                      ? localTokenResults
                      : registryTokenResults}
                    {shouldSearchRegistry && isSearchingRegistry && (
                      <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Searching Token Registry
                      </div>
                    )}
                    {shouldSearchRegistry &&
                      !isSearchingRegistry &&
                      filteredRegistryTokens.length > 0 &&
                      verifiedRegistryTokens.length === 0 && (
                        <ReachOutMessage
                          registryUrl={
                            unverifiedRegistryToken
                              ? `https://worldstreet.example/tokens/${unverifiedRegistryToken.id}`
                              : 'https://worldstreet.example/terminal'
                          }
                        />
                      )}
                    {shouldSearchRegistry &&
                      !isSearchingRegistry &&
                      filteredRegistryTokens.length === 0 &&
                      filteredTokens.length === 0 && <ReachOutMessage />}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
