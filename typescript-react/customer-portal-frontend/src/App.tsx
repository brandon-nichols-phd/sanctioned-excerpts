import React from 'react'
import { HashRouter, Route, Switch } from 'react-router-dom'
import './scss/style.scss'
import { AppThemeProvider } from './theme/ThemeContext'
import { AuthStateAndStatus, AuthenticationProvider } from './api/authentication/AuthenticationContext'
import AmplitudePageTracker from './AmplitudePageTracker'

const loading = (
  <div className="pt-3 text-center">
    <div className="sk-spinner sk-spinner-pulse"></div>
  </div>
)

// Containers
const TheLayout = React.lazy(() => import('./layout/TheLayout'))

// Pages
const Login = React.lazy(() => import('./layout/login/Login'))
const ForgotPassword = React.lazy(() => import('./layout/login/forgot-password/ForgotPassword'))
const EmailUnsubscribed = React.lazy(() => import('./layout/login/email-unsubscribed/EmailUnsubscribed'))
const ForgotPasswordInitial = React.lazy(() => import('./layout/login/forgot-password/ForgotPasswordInitial'))
const SetNewPassword = React.lazy(() => import('./layout/login/set-new-password/SetNewPassword'))
const SetNewPin = React.lazy(() => import('./layout/login/set-new-pin/SetNewPin'))

const location = window.location
const landingPath = location.hash.replace('#', '')

type AppType = {
  initialAuthState: AuthStateAndStatus
}

const App: React.FC<AppType> = ({ initialAuthState }) => {
  return (
    <AppThemeProvider>
      <HashRouter>
        <React.Suspense fallback={loading}>
          <AuthenticationProvider initialAuthState={initialAuthState}>
            <AmplitudePageTracker />
            <Switch>
              <Route exact path="/email-unsubscribed" component={EmailUnsubscribed} />
              <Route exact path="/forgot-password" component={ForgotPassword} />
              <Route exact path="/initial-password" component={ForgotPasswordInitial} />
              <Route exact path="/set-new-password" component={SetNewPassword} />
              <Route exact path="/set-new-pin" component={SetNewPin} />
              <Route exact path="/login" render={(props) => <Login {...props} landingPath={landingPath} />} />
              <Route path="/" component={TheLayout} />
            </Switch>
          </AuthenticationProvider>
        </React.Suspense>
      </HashRouter>
    </AppThemeProvider>
  )
}

export default App