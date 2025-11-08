import React, { useLayoutEffect } from 'react'
import {
  selectFiltersBar,
  FiltersBarDispatch,
  FiltersBarActions,
  AppDispatches,
  AppActions,
  selectAppSidebarShow,
  selectAppNavToggleElements,
} from '../redux/store'
import { CHeader, CHeaderBrand, CHeaderNav, CHeaderNavItem, CSubheader, CToggler, CBreadcrumbRouter } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { routes, AppRoute } from '../routes'
import { dispatchResizeEvent } from '../webapp-lib/pathspot-react/events/eventDispatcher'
import { TheHeaderDropdown } from './TheHeaderDropdown'
import { useLocation, matchPath } from 'react-router-dom'
import { logInteraction } from '../api/logging.api'
import useAppSelector from '../redux/useAppSelector'
import useAppDispatch from '../redux/useAppDispatch'
import { PIconButton, PWrapperButton } from '../webapp-lib/pathspot-react'
import { PathSpotFilter, PathSpotFilterOff } from '../webapp-lib/pathspot-react/assets/icons/pathspot/catalog'
import { useFela } from 'react-fela'
import { pathspotLavender, pathspotPrimary, pathspotSecondary, pathspotWhite } from '../webapp-lib/pathspot-react/styles/ts/colors'
import { NavToggleElement } from '../redux/contexts/app'
import useAuthContext from '../api/authentication/useAuthContext'
import { DISPLAY_PAGES } from '../api/constants'

const getPaths = (pathname: any) => {
  const paths = ['/']
  if (pathname === '/') return paths
  pathname.split('/').reduce((prev: any, curr: any) => {
    const currPath = `${prev}/${curr}`
    paths.push(currPath)
    return currPath
  })
  return paths
}

const headerButton = (args: any) => {
  const padding = '0.5rem'
  const marginX = '1rem'
  return {
    backgroundColor: args.color || pathspotSecondary,
    color: pathspotWhite,
    paddingTop: padding,
    paddingBottom: padding,
    paddingLeft: padding,
    paddingRight: padding,
    marginRight: args.isLast ? '15px' : '0',
    marginLeft: marginX,
  }
}

const headerButtonIcon = (args: any) => {
  const padding = '0.5rem'
  const marginX = '0.5rem'
  return {
    color: pathspotWhite,
    marginLeft: '0.25rem',
    // paddingLeft: '1rem',
    marginRight: '0.5rem',
  }
}

export const TheHeader = (props: any) => {
  const { headerRef } = props
  const dispatch = useAppDispatch()
  const globalFilterBarState = useAppSelector(selectFiltersBar)
  const sidebarShow = useAppSelector(selectAppSidebarShow)
  const headerToggleElements = useAppSelector(selectAppNavToggleElements)

  const locationPathName = useLocation().pathname
  const locationPath = useLocation().pathname
  const { css } = useFela()
  const displayRoutes = routes.map((route: AppRoute) => {
    return route.name.includes('Home') ? { ...route, name: ' ' } : { ...route }
  })
  const { authState } = useAuthContext()

  useLayoutEffect(() => {
    const paths = getPaths(locationPath)
    const currRoutes = paths
      .map((currPath: any) => {
        const route = routes.find((route: AppRoute) =>
          matchPath(currPath, {
            path: route.path,
            exact: route.exact,
          })
        )
        return route
      })
      .filter((route: any) => route && route.name && route.filtersbar === 'true')
    if (currRoutes?.length > 0) {
      if (!globalFilterBarState.buttonVisible) {
        dispatch({ type: FiltersBarDispatch[FiltersBarActions.toggleFilterButtonVisibility] })
      }
    } else {
      if (globalFilterBarState.buttonVisible) {
        dispatch({ type: FiltersBarDispatch[FiltersBarActions.toggleFilterButtonVisibility] })
      }
    }
  })

  const logPDFClicked = () => {
    let interaction_type_id = 0
    if (locationPathName.includes('account')) {
      interaction_type_id = 1
    } else if (locationPathName.includes('compliance')) {
      interaction_type_id = 16
    } else if (locationPathName.includes('devices')) {
      interaction_type_id = 19
    }
    if (interaction_type_id) {
      logInteraction(interaction_type_id)
    }
  }
  const toggleSidebar = () => {
    const val = [true, 'responsive'].includes(sidebarShow) ? false : 'responsive'
    dispatchResizeEvent(300)
    dispatch({ type: AppDispatches[AppActions.setSidebarState], payload: { sidebarShow: val } })
  }

  const toggleSidebarMobile = () => {
    const val = [false, 'responsive'].includes(sidebarShow) ? true : 'responsive'
    dispatchResizeEvent(300)
    dispatch({ type: AppDispatches[AppActions.setSidebarState], payload: { sidebarShow: val } })
  }

  return (
    <CHeader innerRef={headerRef} withSubheader className="p-header-sizing print-hide">
      <CToggler inHeader className="ml-md-3 d-lg-none" onClick={toggleSidebarMobile} />
      <CToggler inHeader className="ml-3 d-md-down-none" onClick={toggleSidebar} />
      <CHeaderBrand className="mx-auto d-lg-none" to="/">
        <CIcon name="logo" alt="Logo" className="c-sidebar-brand-full" height={40} src="dark-horizontal.png" />
      </CHeaderBrand>

      <CHeaderNav className="d-md-down-none mr-auto">
        <CHeaderNavItem className="px-3">{/* <CHeaderNavLink to="/insights">Insights</CHeaderNavLink> */}</CHeaderNavItem>
      </CHeaderNav>

      <CHeaderNav className="px-3">
        <TheHeaderDropdown />
      </CHeaderNav>
      <CSubheader className="px-3 align-items-center py-2">
        <span className="p-inline">
          <div className="p-inline-half-a">
            <div className="filter-button-header">
              {globalFilterBarState.buttonVisible && (
                <PWrapperButton
                  onClick={() => {
                    dispatch({ type: FiltersBarDispatch[FiltersBarActions.toggleFilterVisibility] })
                  }}
                >
                  {globalFilterBarState.barVisible ? (
                    <PathSpotFilter className="p-icon-auto" />
                  ) : (
                    <PathSpotFilterOff className="p-icon-auto" />
                  )}
                </PWrapperButton>
              )}
            </div>
            <div>
              <CBreadcrumbRouter className="border-0 c-subheader-nav m-0 px-0" routes={displayRoutes} />
            </div>
          </div>

          <div className="p-inline-half-b p-end">
            {headerToggleElements.startReport.isVisible && authState.sidebarItems.includes(DISPLAY_PAGES.ITEM_GENERATE_REPORTS) && (
              <PIconButton
                buttonShape="pill"
                buttonIcon="cil-plus"
                buttonSize="sm"
                buttonClass={css(headerButton)}
                buttonText={'Document Temperatures'}
                buttonContentClass={css(headerButtonIcon)}
                onClick={(args: any) => {
                  const currentElementValue = headerToggleElements.startReport.elementValue
                  if (currentElementValue !== undefined) {
                    dispatch({
                      type: AppDispatches.setNavElementValue,
                      payload: {
                        element: NavToggleElement.startReport,
                        value: !currentElementValue,
                      },
                    })
                  } else {
                    dispatch({
                      type: AppDispatches.setNavElementValue,
                      payload: {
                        element: NavToggleElement.startReport,
                        value: true,
                      },
                    })
                  }
                }}
              />
            )}
            {headerToggleElements.downloadReport.isVisible && authState.sidebarItems.includes(DISPLAY_PAGES.ITEM_GENERATE_REPORTS) && (
              <PIconButton
                buttonShape="pill"
                buttonIcon="cil-data-transfer-down"
                buttonSize="sm"
                buttonClass={css(headerButton({ color: pathspotPrimary }))}
                buttonText={'Download Report'}
                // buttonDisable={true}
                buttonContentClass={css(headerButtonIcon)}
                onClick={(args: any) => {
                  const currentElementValue = headerToggleElements.downloadReport.elementValue
                  if (currentElementValue !== undefined) {
                    dispatch({
                      type: AppDispatches.setNavElementValue,
                      payload: {
                        element: NavToggleElement.downloadReport,
                        value: !currentElementValue,
                      },
                    })
                  } else {
                    dispatch({
                      type: AppDispatches.setNavElementValue,
                      payload: {
                        element: NavToggleElement.downloadReport,
                        value: true,
                      },
                    })
                  }
                }}
              />
            )}
            {headerToggleElements.genericDownloadReport.isVisible && (
              <PIconButton
                buttonShape="pill"
                buttonIcon="cil-data-transfer-down"
                buttonSize="sm"
                buttonClass={css(headerButton({ color: pathspotPrimary }))}
                buttonText={'Download Report'}
                // buttonDisable={true}
                buttonContentClass={css(headerButtonIcon)}
                onClick={(args: any) => {
                  const currentElementValue = headerToggleElements.genericDownloadReport.elementValue
                  if (currentElementValue !== undefined) {
                    dispatch({
                      type: AppDispatches.setNavElementValue,
                      payload: {
                        element: NavToggleElement.genericDownloadReport,
                        value: !currentElementValue,
                      },
                    })
                  } else {
                    dispatch({
                      type: AppDispatches.setNavElementValue,
                      payload: {
                        element: NavToggleElement.genericDownloadReport,
                        value: true,
                      },
                    })
                  }
                }}
              />
            )}
            <PIconButton
              buttonShape="pill"
              buttonIcon="cil-file"
              buttonSize="sm"
              buttonClass={css(headerButton({ color: pathspotLavender, isLast: true }))}
              buttonContentClass={css(headerButtonIcon)}
              buttonText={'Create PDF'}
              onClick={() => {
                logPDFClicked()
                window.print()
              }}
            />
          </div>
        </span>
      </CSubheader>
    </CHeader>
  )
}
export default TheHeader

// {
//   headerToggleElements.createPDFShow.currentval && (
//     <PIconButton
//       buttonShape="pill"
//       buttonIcon="cil-data-transfer-down"
//       buttonSize="sm"
//       buttonClass={css(headerButton({ type: 'screen', isLast: true }))}
//       buttonContentClass={css(headerButtonIcon)}
//       buttonText={'Create PDF'}
//       onClick={() => {
//         logPDFClicked()
//         window.print()
//       }}
//     />
//   )
// }
