import * as React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider, focusManager } from 'react-query';

import { useAppState } from '@app/hooks/useAppState';
import { MoviesStack } from '@app/navigation/MoviesStack';
import { useOnlineManager } from '@app/hooks/useOnlineManager';

function onAppStateChange(status: string) {
  // React Query already supports in web browser refetch on window focus by default
  if (Platform.OS !== 'web') {
    focusManager.setFocused(status === 'active');
  }
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2 } },
});

export default function App() {
  useOnlineManager();

  useAppState(onAppStateChange);

  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <MoviesStack />
      </NavigationContainer>
    </QueryClientProvider>
  );
}
