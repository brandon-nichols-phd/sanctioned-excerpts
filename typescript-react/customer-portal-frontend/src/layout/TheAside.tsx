import React from 'react'
import { useDispatch } from 'react-redux'
import { CSidebar, CSidebarClose } from '@coreui/react'

import { AppActions, selectApp, AppDispatches } from '../redux/store'
import useAppSelector from '../redux/useAppSelector'
import useAppDispatch from '../redux/useAppDispatch'
export const TheAside = () => {
  const show = useAppSelector(selectApp).asideShow
  const dispatch = useAppDispatch()
  const setShowState = (state: boolean) => dispatch({ type: AppDispatches[AppActions.setState], payload: { asideShow: state } })

  return (
    <CSidebar aside colorScheme="light" size="lg" overlaid show={show} onShowChange={(state: boolean) => setShowState(state)}>
      <CSidebarClose onClick={() => setShowState(false)} />
      {/*aside content*/}
      <div className="nav-underline">
        <div className="nav nav-tabs">
          <div className="nav-item">{/* <div className="nav-link">Aside</div> */}</div>
        </div>
      </div>
    </CSidebar>
  )
}

export default React.memo(TheAside)
