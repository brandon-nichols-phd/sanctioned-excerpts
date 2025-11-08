import React, { useEffect } from 'react'
import { selectAppDarkMode } from '../redux/store'
import { TheSidebar } from './TheSidebar'
import { TheContent } from './TheContent'
import { TheFooter } from './TheFooter'
import { TheHeader } from './TheHeader'
import useAppSelector from '../redux/useAppSelector'
import { useLocation } from 'react-router-dom'
import useAppDispatch from '../redux/useAppDispatch'
import { AppDispatches, NavToggleElement } from '../redux/contexts/app'

export const TheLayout = () => {
  const darkMode = useAppSelector(selectAppDarkMode)
  const classes = `c-app c-default-layout ${darkMode ? 'c-dark-theme' : ''}`
  const location = useLocation().pathname
  const appDispatch = useAppDispatch()

  useEffect(() => {
    Object.keys(NavToggleElement).forEach((element) => {
      appDispatch({ type: AppDispatches.toggleNavElements, payload: { location, element } })
    })
  }, [location, appDispatch])

  return (
    <div className={classes}>
      <TheSidebar />
      {/* <TheAside/> */}
      <div className="c-wrapper">
        <TheHeader />
        <div className="c-body">
          <TheContent />
        </div>
        <TheFooter />
      </div>
    </div>
  )
}
export default TheLayout
