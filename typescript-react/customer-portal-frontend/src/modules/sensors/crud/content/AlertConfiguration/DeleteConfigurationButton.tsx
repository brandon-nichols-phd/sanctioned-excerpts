import CIcon from '@coreui/icons-react'
import { CRow, CButton } from '@coreui/react'
import React from 'react'

const DeleteConfigurationButton = (props: any) => {
  const { viewOnly, onClick } = props
  return (
    <CRow
      style={{ width: '100%', alignContent: 'center', alignItems: 'center', alignSelf: 'center' }}
      className="justify-content-center m-2"
    >
      <CButton disabled={viewOnly} onClick={onClick} color="danger" className="px-4 mx-1">
        <CIcon name="cil-trash" />
      </CButton>
    </CRow>
  )
}
export default DeleteConfigurationButton
