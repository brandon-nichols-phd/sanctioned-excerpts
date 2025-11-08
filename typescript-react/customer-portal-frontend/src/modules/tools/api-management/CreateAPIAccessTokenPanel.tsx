import React, { useState, Fragment } from 'react'
import { Link } from 'react-router-dom'

import { CCol, CForm, CRow, CAlert, CButton, CCardText, CCardBody } from '@coreui/react'
import { FToggleGroupRow, FInputGroupRow, SaveCancelButtons, CTimeInputGroupRow, CInputGroupRow } from '../../../webapp-lib/pathspot-react'
export const name = {
  fieldName: 'name',
  inputType: 'text',
  placeholderStr: 'Enter a name for the token.',
  displayStr: 'Token Name: ',
  useDivLabel: true,
  useFormik: true,
  borderStyle: { borderRadius: '0.25rem', width: '14rem' },
}

const CreateAPIAccessTokenPanel = (props: any) => {
  const { handleSubmit, resetForm, values, errors, setFieldValue, modalProps, tokenValue } = props
  const { readDeviceStatus, readScanDetails, readLocationMetrics, readLabelDetails, readDfsMetrics, issuedWhen, expiration } = values
  const [focused, setFocused] = useState()
  const handleChange = (val: any, fieldName: any) => {
    setFieldValue(fieldName, val)
  }
  const expirationBlur = () => {}
  return (
    <CForm onSubmit={handleSubmit}>
      <div className="div-container ">
        <CInputGroupRow {...name} handleChange={handleChange} values={values} errors={errors} />
        <CTimeInputGroupRow
          {...expirationDate}
          handleChange={handleChange}
          values={values}
          errors={errors}
          onBlur={() => expirationBlur()}
        />
        <FToggleGroupRow {...deviceStatus} handleChange={handleChange} values={values} errors={errors} />
        <FToggleGroupRow {...scanDetails} handleChange={handleChange} values={values} errors={errors} />
        <FToggleGroupRow {...locationMetrics} handleChange={handleChange} values={values} errors={errors} />
        <FToggleGroupRow {...labelMetrics} handleChange={handleChange} values={values} errors={errors} />
        <FToggleGroupRow {...sensorMetrics} handleChange={handleChange} values={values} errors={errors} />
        <FToggleGroupRow {...dfsMetrics} handleChange={handleChange} values={values} errors={errors} />
        {tokenValue !== '' && (
          <div>
            <header className="token-header">
              *Below is your access token. Please copy it and store it somewhere safe. You will not be able to view your token once this
              window is closed. You can close this window once you are done.
            </header>
            <div className="form-message-boxed">
              <p className="p-token">{tokenValue}</p>
            </div>
          </div>
        )}
      </div>
    </CForm>
  )
}
export default CreateAPIAccessTokenPanel
