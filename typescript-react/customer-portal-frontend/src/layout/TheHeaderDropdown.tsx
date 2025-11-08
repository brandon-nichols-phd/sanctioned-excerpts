import CIcon from '@coreui/icons-react'
import { CDropdown, CDropdownItem, CDropdownMenu, CDropdownToggle } from '@coreui/react'
import React, { useCallback, useEffect } from 'react'
import { useHistory } from 'react-router-dom'
import _ from 'lodash'
import useAuthContext from '../api/authentication/useAuthContext'
import { DISPLAY_PAGES, PATHNAME_EDIT_USER } from '../api/constants'

export const TheHeaderDropdown = () => {
  const history = useHistory()
  const { authState, userLogout, currentUser } = useAuthContext()
  const logOut = () => {
    userLogout()
    history.push('/login')
  }

  return (
    <CDropdown inNav className="c-header-nav-items mx-2">
      <CDropdownToggle className="c-header-nav-link" caret={false}>
        <div> {authState?.currentUser?.userEmail} &nbsp;</div>
        <CIcon name="cil-chevron-bottom" />
      </CDropdownToggle>

      <CDropdownMenu className="pt-0" placement="bottom-end">
        <CDropdownItem header tag="div" color="light" className="text-center">
          <strong>Account</strong>
        </CDropdownItem>
        {authState.developerOptions && (
          <CDropdownItem onClick={() => history.push('/api-management')}>
            <CIcon name="cil-code" className="mfe-2" />
            Developer Tools
          </CDropdownItem>
        )}
        {authState.displayPages.includes(DISPLAY_PAGES.ITEM_VIEW_USERS) && (
          <CDropdownItem onClick={() => history.push(`/${PATHNAME_EDIT_USER}/${currentUser.userId}`)}>
            <CIcon name="cil-user" className="mfe-2" />
            View Profile
          </CDropdownItem>
        )}

        <CDropdownItem onClick={() => history.push(`/change-password?redirect=${history.location.pathname}`)}>
          <CIcon name="cil-lock-locked" className="mfe-2" />
          Change Password
        </CDropdownItem>
        <CDropdownItem divider />
        <CDropdownItem onClick={() => logOut()}>
          <CIcon name="cil-account-logout" className="mfe-2" />
          Log Out
        </CDropdownItem>
      </CDropdownMenu>
    </CDropdown>
  )
}

export default TheHeaderDropdown
