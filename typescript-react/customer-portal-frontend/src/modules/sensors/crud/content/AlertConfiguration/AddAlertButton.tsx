import React from 'react'
import { Atomic } from '../../../../../webapp-lib/pathspot-react'
import CIcon from '@coreui/icons-react'
import { CButtonToolbar, CButton } from '@coreui/react'

const AddAlertButton = (props: { viewOnly: boolean; onClick: () => void }) => {
  const { viewOnly, onClick } = props
  return (
    <Atomic.PContainer isRow className="justify-content-center">
      <Atomic.PContent className="justify-content-center">
        <CButtonToolbar justify="center">
          <CButton disabled={viewOnly} onClick={onClick} color="info" className="px-4 mx-1">
            <CIcon name="cil-plus" /> Add Alert
          </CButton>
        </CButtonToolbar>
      </Atomic.PContent>
    </Atomic.PContainer>
  )
}
export default AddAlertButton
