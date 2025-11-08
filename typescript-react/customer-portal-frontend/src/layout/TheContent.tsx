import React, { Suspense } from 'react'
import { Redirect, Route, Switch, useLocation } from 'react-router-dom'
import { CContainer, CFade } from '@coreui/react'
import queryString from 'query-string'
import routes from '../routes'
import useAuthContext from '../api/authentication/useAuthContext'
const loading = () => {
  return (
    <div className="pt-3 text-center">
      <div className="sk-spinner sk-spinner-pulse"></div>
    </div>
  )
}
export const TheContent = () => {
  const { checkPermissions, authState } = useAuthContext()
  const filteredRoutes = routes.filter((route) => {
    return !route.requiredpermission || checkPermissions(route.requiredpermission)
  })
  const destinationPath = useLocation().pathname
  const destinationParams = queryString.parse(useLocation().search)
  const notLoggedInRoute = (destinationPath: string, destinationParams: queryString.ParsedQuery<string>) => {
    let redirectStr = '/login'
    if (destinationPath) {
      redirectStr = destinationPath
      if (Object.keys(destinationParams).length > 0) {
        const paramStr = Object.keys(destinationParams).map((key) => `${key}=${destinationParams[key]}`)
        redirectStr = `${redirectStr}?${paramStr.join('&')}`
      }
    }
    return redirectStr
  }
  const userId = authState.currentUser?.userId;
  const isLoggedIn = typeof userId === 'number' && userId > 0;
  const afterLogin = !isLoggedIn? notLoggedInRoute(destinationPath, destinationParams): '/account';
  const currentPath = window.location.pathname
  return (
    <main className="c-main">
      <CContainer fluid={true}>
        <Suspense fallback={loading()}>
          <Switch>
            {!isLoggedIn && (
              <Redirect
                to={{
                  pathname: '/login',
                  state: { afterLogin: afterLogin },
                }}
              />
            )}
            {filteredRoutes.map((route, idx) => {
              return (
                route.component && (
                  <Route
                    key={idx}
                    path={route.path}
                    exact={route.exact}
                    children={(props) => (
                      <CFade>
                        <route.component {...props} />
                      </CFade>
                    )}
                  />
                )
              )
            })}
            <Redirect from={currentPath} to={afterLogin} />
          </Switch>
        </Suspense>
      </CContainer>
    </main>
  )
}

export default React.memo(TheContent)
