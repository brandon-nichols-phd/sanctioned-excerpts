import { configureStore, ThunkAction, Action } from '@reduxjs/toolkit'
import appReducer, { AppAction, AppDispatches, NavToggleElement, appkey } from './contexts/app'
import filtersbarReducer, { FiltersBarActions, filtersbarKey, FiltersBarDispatch } from './contexts/filtersbar'

export const store = configureStore({
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          FiltersBarDispatch[FiltersBarActions.setFilterBarState],
          FiltersBarDispatch[FiltersBarActions.initializeFilterBarState],
          FiltersBarDispatch[FiltersBarActions.reconcileFilterStateWithResponse],
          FiltersBarDispatch[FiltersBarActions.setFilterSelections],
          FiltersBarDispatch[FiltersBarActions.setFiltersPrivileges],
        ],
        ignoreActionPaths: [],
        ignoreState: true,
      },
    }),
  reducer: {
    [appkey]: appReducer,
    [filtersbarKey]: filtersbarReducer,
  },
})

export type AppDispatch = typeof store.dispatch
export type RootState = ReturnType<typeof store.getState>
export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, RootState, unknown, Action<string>>

//App Selectors
export const selectApp = (state: RootState) => state.app
export const selectAppDarkMode = (state: RootState) => state.app.darkMode
export const selectAppSidebarShow = (state: RootState) => state.app.sidebarShow
export const selectAppSidebarMinimize = (state: RootState) => state.app.sidebarMinimize
export const selectAppAsideShow = (state: RootState) => state.app.asideShow
export const selectAppNavToggleElements = (state: RootState) => state.app.navToggleElements
export const selectAppNavToggleElementValue = (state: RootState, toggleElement: NavToggleElement) =>
  state.app.navToggleElements[toggleElement].elementValue

//Filters Bar Selectors
export const selectFiltersBar = (state: RootState) => state.filtersbar
export const selectFiltersState = (state: RootState) => state.filtersbar.filtersState
export const selectFiltersStateSelections = (state: RootState) => state.filtersbar.filtersState.selections

export { FiltersBarActions, FiltersBarDispatch, AppDispatches, AppAction as AppActions }
