import 'react-native-get-random-values';
import React from 'react';
import { LogBox, AppRegistry } from 'react-native';
import {
  MD3LightTheme as PaperDefaultTheme,
  Provider as PaperProvider,
} from 'react-native-paper';
import { Provider as StoreProvider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PersistGate } from 'redux-persist/integration/react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { withIAPContext } from 'react-native-iap';

import App from './App';
import { name as appName } from './app.json';
import { persistor, store } from './store/store';
import { BLEProvider } from './src/hooks/use-ble';

LogBox.ignoreAllLogs();

//TODO: Explain to Nathan we should not use two themes

const paperTheme = {
  ...PaperDefaultTheme,
  colors: {
    ...PaperDefaultTheme.colors,
    background: 'white',
  },
};

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: 'white',
  },
};

export const Main = () => {
  return (
    <StoreProvider store={store}>
      <PaperProvider theme={paperTheme}>
        <PersistGate loading={null} persistor={persistor}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <BLEProvider>
              <SafeAreaProvider>
                <NavigationContainer theme={navigationTheme}>
                  <App />
                </NavigationContainer>
              </SafeAreaProvider>
            </BLEProvider>
          </GestureHandlerRootView>
        </PersistGate>
      </PaperProvider>
    </StoreProvider>
  );
};

AppRegistry.registerComponent(appName, () => withIAPContext(Main));
