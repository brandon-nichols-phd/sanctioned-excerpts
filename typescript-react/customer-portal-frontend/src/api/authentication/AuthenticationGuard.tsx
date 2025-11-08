import * as React from 'react'
import { Redirect } from 'react-router-dom'
import useAuthContext from './useAuthContext'
import { AuthContext } from './AuthenticationContext'
interface AuthGuardType {
  children: React.ReactNode
}

function AuthenticationGuard({ children }: AuthGuardType) {
  const { authState } = useAuthContext()

  if (authState.initialized && authState.currentContext !== AuthContext.loggedIn) {
    const afterLogin = window.location.pathname + window.location.search
    return (
      <Redirect
        to={{
          pathname: '/login',
          state: { afterLogin },
        }}
      />
    )
  }

  return <>{children}</>
}

export default AuthenticationGuard
