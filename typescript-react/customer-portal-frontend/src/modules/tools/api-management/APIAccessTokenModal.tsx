import React, { useState, useEffect } from 'react'
import Select from 'react-select'
import { CInvalidFeedback, CLabel } from '@coreui/react'
import {
  CModalGroup,
  CancelContinueButtons,
  confirmButton,
  cancelButtonLight,
  unzipb64Payload,
  b64decode,
} from '../../../webapp-lib/pathspot-react'
import { Formik } from 'formik'
import moment from 'moment'
import CreateAPIAccessTokenPanel from './CreateAPIAccessTokenPanel'
import { generateAPIAccessToken } from './api-management.api'
import { ModalProps } from '../../../webapp-lib/pathspot-react/api/modal/modal.types'
import { momentToString } from '../../operations/locations/handwashing-goals/api/time'

const APIAccessTokenModal = (props: any) => {
  const { modalState, handlers, context, data, actions, dispatcher, contextState } = props
  const [tokenValue, setTokenValue] = useState<string>('')
  const [confirmClicked, setConfirmClicked] = useState<any>(null)

  if (modalState?.display) {
    const initialFormValues = {}
    const newModalProps: any = { ...modalState }
    newModalProps.headerColor = 'primary'
    newModalProps.onClose = () => handlers.onClose()
    const continueButtonProps: any = { ...confirmButton, buttonType: 'submit' }
    const cancelButtonProps: any = { ...cancelButtonLight }
    // continueButtonProps.onClickAction = async (val: any) => {
    //   handlers.onConfirm(val)
    // }
    cancelButtonProps.onClickAction = () => handlers.onCancel()
    newModalProps.content.title = confirmClicked ? 'Please Copy Access Token And Close Window' : 'Select Token Privileges'
    newModalProps.content.footer = <CancelContinueButtons continueButtonProps={continueButtonProps} cancelButtonProps={cancelButtonProps} />
    newModalProps.content.body = (
      <Formik
        initialValues={{ ...initialFormValues }}
        validate={(values) => {
          let errors: any = {}
          let errorCount = 0
          let missingFields: any[] = []
          if (values.name === '') {
            errors = { ...errors, name: 'Token name is a required field.' }
            errorCount++
          }
          if (values.expiration < moment()) {
            if (values.expiration.dayOfYear() < moment().dayOfYear()) {
              errors = { ...errors, expiration: 'Expiration date is in the past. Please choose another date.' }
              errorCount++
            }
          }
          if (errorCount > 0) {
            setConfirmClicked(false)
          }
          return errors
        }}
        onSubmit={async (values, { setSubmitting, setFieldError, setStatus, resetForm, setFieldValue }) => {
          try {
            let status = {}
            const data = {
              name: values.name === '' ? undefined : values.name,
              readDeviceStatus: values.readDeviceStatus,
              readScanDetails: values.readScanDetails,
              readLocationMetrics: values.readLocationMetrics,
              readLabelDetails: values.readLabelDetails,
              readSensorMetrics: values.readSensorMetrics,
              readDfsMetrics: values.readDfsMetrics,
              expiration: momentToString(values.expiration, 'YYYY-MM-DD'),
            }
            //send request to the API
            const response = await generateAPIAccessToken(data)

            const returnedToken = b64decode(response.data)
            setTokenValue(returnedToken)
            setSubmitting(false)
            return status
          } catch (e) {
            setSubmitting(false)
          }
        }}
      >
        {(formikProps: any) => {
          if (confirmClicked === true) {
            continueButtonProps.buttonHide = true
            cancelButtonProps.buttonHide = true
          }

          continueButtonProps.onClickAction = async () => {
            if (!(confirmClicked === true) && Object.keys(formikProps.errors)?.length === 0) {
              setConfirmClicked(true)
              return await formikProps.submitForm()
            }
          }
          return (
            <CreateAPIAccessTokenPanel
              {...formikProps}
              {...{ handlers, context, data, actions }}
              {...newModalProps}
              tokenValue={tokenValue}
            />
          )
        }}
      </Formik>
    )
    return (
      <span>
        <CModalGroup bodyDivClass="modalBreakLine" modal={newModalProps} />;
      </span>
    )
  } else {
    return <></>
  }
}
export default APIAccessTokenModal
