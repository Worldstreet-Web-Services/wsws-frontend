import {
  type OAuthProviderType,
  useLoginWithOAuth,
} from '@privy-io/react-auth';
import { useCallback, useState } from 'react';

interface UsePopupAuthState {
  isLoading: boolean;
  error: string | null;
}

interface UsePopupAuthReturn extends UsePopupAuthState {
  signIn: (provider: OAuthProviderType) => Promise<boolean>;
  clearError: () => void;
}

export function usePopupAuth(): UsePopupAuthReturn {
  const [state, setState] = useState<UsePopupAuthState>({
    isLoading: false,
    error: null,
  });

  const { initOAuth, loading } = useLoginWithOAuth();

  const signIn = useCallback(
    async (provider: OAuthProviderType): Promise<boolean> => {
      setState({ isLoading: true, error: null });

      try {
        await initOAuth({ provider });
        setState({ isLoading: false, error: null });
        return true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Authentication failed';
        setState({ isLoading: false, error: errorMessage });
        return false;
      }
    },
    [initOAuth],
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    isLoading: state.isLoading || loading,
    signIn,
    clearError,
  };
}
