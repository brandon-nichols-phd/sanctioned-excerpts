import { createSlice } from '@reduxjs/toolkit'
import { SENSOR_DASHBOARD_PATHNAME } from '../../api/constants'

type AppState = {
  sidebarShow: 'responsive' | boolean
  sidebarMinimize: boolean
  asideShow: boolean
  darkMode: boolean
  navToggleElements: NavToggleElements
}

const storedSidebarShow = localStorage.getItem('sidebarShow')
const storedSidebarMinimize = localStorage.getItem('sidebarMinimize')
const initialState: AppState = {
  sidebarShow: !storedSidebarShow || storedSidebarShow === 'responsive' ? 'responsive' : storedSidebarShow === 'true',
  sidebarMinimize: storedSidebarMinimize === 'true',
  asideShow: false,
  darkMode: false,
  navToggleElements: { ...NavToggleDefaults },
}

export const appkey = 'app'

export enum AppAction {
  setState = 'setState',
  setSidebarState = 'setSidebarState',
  toggleNavElements = 'toggleNavElements',
  setNavElementValue = 'setNavElementValue',
}

export const AppDispatches = {
  [AppAction.setState]: `${appkey}/${AppAction.setState}`,
  [AppAction.setSidebarState]: `${appkey}/${AppAction.setSidebarState}`,
  [AppAction.toggleNavElements]: `${appkey}/${AppAction.toggleNavElements}`,
  [AppAction.setNavElementValue]: `${appkey}/${AppAction.setNavElementValue}`,
}

type SidebarState = Partial<Pick<AppState, 'sidebarShow' | 'sidebarMinimize'>>

export const appSlice = createSlice({
  name: appkey,
  initialState,
  reducers: {
    [AppAction.setState]: (state: AppState, action: { payload: Partial<AppState> }) => {
      return { ...state, ...action.payload }
    },
    [AppAction.setSidebarState]: (state: AppState, action: { payload: SidebarState }) => {
      for (const currentKey of Object.keys(action.payload) as (keyof SidebarState)[]) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        localStorage.setItem(currentKey, action.payload[currentKey]!.toString())
      }
      return { ...state, ...action.payload }
    },
    [AppAction.toggleNavElements]: (state: AppState, action: any) => {
      const toggleElement = NavToggleElement[action.payload.element as keyof typeof NavToggleElement]
      const currentPath = action.payload.location
      if (toggleElement && currentPath) {
        const pathKey = state.navToggleElements[toggleElement].pathkey
        const isPathKeyRegex = pathKey instanceof RegExp && pathKey.test(currentPath)
        const isPathKeyString = typeof pathKey === 'string' && currentPath.includes(state.navToggleElements[toggleElement].pathkey)
        if (isPathKeyRegex || isPathKeyString) {
          if (state.navToggleElements[toggleElement].isVisible === state.navToggleElements[toggleElement].visibleAtPath) {
          } else {
            state.navToggleElements[toggleElement].isVisible = state.navToggleElements[toggleElement].visibleAtPath
          }
        } else {
          if (state.navToggleElements[toggleElement].isVisible === !state.navToggleElements[toggleElement].visibleAtPath) {
          } else {
            state.navToggleElements[toggleElement].isVisible = !state.navToggleElements[toggleElement].visibleAtPath
          }
        }
      }
    },
    [AppAction.setNavElementValue]: (state: AppState, action: any) => {
      const toggleElement = NavToggleElement[action.payload.element as keyof typeof NavToggleElement]
      if (toggleElement) {
        state.navToggleElements[toggleElement].elementValue = action.payload.value
      }
    },
  },
})

export const { setState, toggleNavElements } = appSlice.actions
export default appSlice.reducer
