import React from 'react'
import { AppActions, AppDispatches, selectAppSidebarShow, selectAppSidebarMinimize } from '../redux/store'
import {
  CCreateElement,
  CSidebar,
  CSidebarBrand,
  CSidebarNav,
  CSidebarNavDivider,
  CSidebarNavTitle,
  CSidebarMinimizer,
  CSidebarNavDropdown,
  CSidebarNavItem,
} from '@coreui/react'
import navigation, { NavigationOption } from './_nav'
import { dispatchResizeEvent } from '../webapp-lib/pathspot-react/events/eventDispatcher'
import { PIcon } from '../webapp-lib/pathspot-react'
import useAppSelector from '../redux/useAppSelector'
import useAppDispatch from '../redux/useAppDispatch'
import useAuthContext from '../api/authentication/useAuthContext'
import { DISPLAY_PAGES } from '../api/constants'

export const TheSidebar = () => {
  const { checkPermissions } = useAuthContext()
  const dispatch = useAppDispatch()
  const show = useAppSelector(selectAppSidebarShow)
  const minimize = useAppSelector(selectAppSidebarMinimize)

  const authorizedNavigation = navigation.reduce((accum, navigationOption) => {
    const authorizedNavigationOption = constructAuthorizedNavigationOption(navigationOption, checkPermissions)
    if (authorizedNavigationOption) {
      accum.push(authorizedNavigationOption)
    }
    return accum
  }, [] as AuthorizedNavigationOption[])

  return (
    <CSidebar
      show={show}
      minimize={minimize}
      dropdownMode="noAction"
      onShowChange={(val: boolean) => dispatch({ type: AppDispatches[AppActions.setSidebarState], payload: { sidebarShow: val } })}
      onMinimizeChange={(val: boolean) => dispatch({ type: AppDispatches[AppActions.setSidebarState], payload: { sidebarMinimize: !val } })}
      className="my-sidebar print-hide"
    >
      <CSidebarBrand className="p-header-sizing d-md-down-none" to="/account">
        <PIcon className="p-sidebar-header-logo" name="pathspot-horizontal" sizeRef={null} />
      </CSidebarBrand>
      <CSidebarNav>
        <CCreateElement
          items={authorizedNavigation}
          components={{
            CSidebarNavDivider,
            CSidebarNavDropdown,
            CSidebarNavItem,
            CSidebarNavTitle,
          }}
        />
      </CSidebarNav>
      <div
        style={{
          flex: '0 0 50px',
          justifyContent: 'flex-end',
          width: 'inherit',
        }}
        onClick={() => dispatchResizeEvent(300)}
      >
        <CSidebarMinimizer className="c-d-md-down-none " />
      </div>
    </CSidebar>
  )
}

export default React.memo(TheSidebar)

type AuthorizedNavigationOption = NavigationOption & {
  badge?: {
    color: string
    text: string
  }
  _children?: AuthorizedNavigationOption[]
}

function constructAuthorizedNavigationOption(navigationOption: NavigationOption, checkPermissions: (permission: DISPLAY_PAGES) => boolean) {
  let authorizedOption: AuthorizedNavigationOption | null = navigationOption
  const canAccess = !authorizedOption.permissions || authorizedOption.permissions.some((permission) => checkPermissions(permission))

  if (canAccess) {
    const authorizedChildren = authorizedOption._children?.reduce((accum, child) => {
      const authorizedChild = constructAuthorizedNavigationOption(child, checkPermissions)
      if (authorizedChild) {
        accum.push(authorizedChild)
      }
      return accum
    }, [] as AuthorizedNavigationOption[])

    authorizedOption = {
      ...authorizedOption,
      ...(authorizedChildren && { _children: authorizedChildren }),
    }
  } else if (authorizedOption.hideIfNotPermitted) {
    return null
  } else {
    authorizedOption = {
      ...authorizedOption,
      ...{
        _tag: 'CSidebarNavItem',
        badge: {
          color: 'danger',
          text: 'Pro',
        },
        to: undefined,
        onClick: undefined,
        _children: undefined,
      },
    }
  }

  delete authorizedOption.hideIfNotPermitted
  return authorizedOption
}
