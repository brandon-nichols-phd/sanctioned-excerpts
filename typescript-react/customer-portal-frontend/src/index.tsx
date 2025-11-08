import React from "react";
import "react-app-polyfill/ie11"; // For IE 11 support
import "react-app-polyfill/stable";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";
import useAuthContext from "./api/authentication/useAuthContext";
import {  LoginEvent } from "./api/authentication/AuthenticationContext";
import App from "./App";
import { icons } from "./webapp-lib/pathspot-react/assets/icons";
import { cilLayers } from "@coreui/icons/js/free";
import { cilRestaurant } from "@coreui/icons/js/free";
import { cilBasket } from "@coreui/icons/js/free";
import { cilMenu } from "@coreui/icons/js/free";
import { cilFlagAlt } from "@coreui/icons/js/free";
import "./polyfill";
import * as serviceWorker from "./serviceWorker";
import {store} from "./redux/store";
import { checkTokenBeforeAppLaunch } from "./api/authentication/auth";
import { createRenderer } from 'fela'
import { RendererProvider } from'react-fela'
import { ensureAmplitudeInit } from './amplitude';

import * as Sentry from "@sentry/react";
const worker = new Worker("/my-worker.js"); // 👈 Load from public folder

worker.postMessage("Index initialized.");
worker.onmessage = (event: MessageEvent) => {
  console.debug("Worker:", event.data);
};

Sentry.init({
  dsn: "https://383af1fb2d6483b3d3cc1e174b839a83@o4505716433944576.ingest.sentry.io/4506740277575680",
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === 'production',
  integrations: [
    Sentry.replayIntegration(),
    Sentry.metrics.metricsAggregatorIntegration(),
    new Sentry.BrowserTracing()
  ],

  tracesSampleRate: 0.5,

  // Capture Replay for 10% of all sessions,
  // plus for 100% of sessions with an error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

// In order to use the `CIcon` component globally by name an icon needs to be imported and assigned explicitly to the object below.
React.icons = {
  ...icons,
  cilLayers,
  cilRestaurant,
  cilBasket,
  cilMenu,
  cilFlagAlt,
};

  window.addEventListener('storage', function (event) {
    if (event.key === LoginEvent.logout && event.newValue === null) {
      const {userLogout} = useAuthContext()
      userLogout()
    }
  })

ensureAmplitudeInit();
async function bootstrap() {
  //if new tab was opened or page was refreshed, we want to keep the user logged in
  //the function below will check for the cookie and based on that it may refresh
  //the token and have the user log in (silently)
  // const { silentlyRefreshToken } = useAuthContext()
  const initialAuthState = await checkTokenBeforeAppLaunch()
  const renderer = createRenderer()
  ReactDOM.render(
    <React.StrictMode>
        <Provider store={store}>
          <RendererProvider renderer={renderer}>
            <App initialAuthState={initialAuthState}/>
          </RendererProvider>
        </Provider>
    </React.StrictMode>,
    document.getElementById("root")
  );
  serviceWorker.unregister();
}

bootstrap();