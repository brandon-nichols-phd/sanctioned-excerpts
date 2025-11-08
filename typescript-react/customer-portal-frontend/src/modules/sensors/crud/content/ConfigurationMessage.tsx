import { CCard, CCardBody, CCol, CRow } from '@coreui/react'
import React from 'react'

const ConfigurationMessage = () => {
  return (
    <CRow className="justify-content-center">
      <CCol md="11" className="py-3">
        <CCard>
          <CCardBody className="py-4 px-4">
            <p>
              If you need any help adding sensors or want to add a new sensor category please contact PathSpot Support at{' '}
              <b>support@null.com</b> or <b>718-550-0040</b>.
            </p>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}
export default ConfigurationMessage
