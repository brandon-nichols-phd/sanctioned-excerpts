import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import _ from 'lodash'
import { CModal, CModalBody, CModalHeader, CPopover } from '@coreui/react'
import {
  pathspotPrimary,
  pathspotSecondary,
  pathspotWhite,
  toastifyError,
  toastifyError50,
} from '../../../../webapp-lib/pathspot-react/styles/ts/colors'
import { Atomic, StyledSpinner, unixToMoment } from '../../../../webapp-lib/pathspot-react'
import { useFela } from 'react-fela'
import { defaultButtonAttributes } from '../../../../webapp-lib/pathspot-react/atomic/styles/buttons'
import { modalHeader, modalTitleText } from '../../../../webapp-lib/pathspot-react/atomic/styles/modal'
import { dropdown } from '../../../../webapp-lib/pathspot-react/atomic/styles/selectors'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { PathSpotAlert } from '../../../../webapp-lib/pathspot-react/assets/icons/pathspot/catalog'
import { itemText } from '../../../../webapp-lib/pathspot-react/atomic/styles/text'
import moment from 'moment'
import { saveAlertSuppressionRequest } from '../../api/sensor-requests.api'
import { notifyToast } from '../../utils/utils'
import { ToastContainer } from 'react-toastify'
import { iconAlignment, tooltipAlignment } from '../../../../webapp-lib/pathspot-react/atomic/styles/containers'
const baseBorder = {
  borderColor: pathspotPrimary,
  borderWidth: '2px',
  borderRadius: '0.25rem',
  borderStyle: 'solid',
}

const datepicker = (args: any) => {
  const { width, height, color, backgroundColor, fontSize } = args
  return {
    color: pathspotPrimary,
    backgroundColor: pathspotWhite,
    height: args?.height ? args.height : '2rem',
    justifyContent: 'center',
    textAlign: 'center',
    alignItems: 'center',
    fontSize: '1.25rem',
    width: '100%',
    ...baseBorder,
  }
}

export const modalContainer = (args: any) => {
  return {
    display: 'inline-flex !important',
    width: '99%',
    justifyContent: 'flex-start',
    flexDirection: 'column',
    flexWrap: 'nowrap',
    alignItems: 'center',
  }
}
const buttonMargins = {
  marginLeft: '0.5rem',
  marginRight: '0.5rem',
}
export const saveButton = {
  defaultButtonAttributes,
  name: 'createButton',
  text: 'Save',
  icon: 'cil-chevron-right',
  margin: { ...buttonMargins, marginTop: '1rem' },
  backgroundColor: pathspotSecondary,
  color: pathspotWhite,
}

export const cancelButton = {
  defaultButtonAttributes,
  name: 'cancelButton',
  text: 'Cancel',
  icon: 'cil-x',
  margin: { ...buttonMargins, marginTop: '1rem' },
  backgroundColor: toastifyError,
  disabledColor: toastifyError50,
  color: pathspotWhite,
}

const tooltipMessage =
  "Determine how long you want to pause all alerts for this sensor. PathSpot won't notify you of any temperature issues during this time. This feature is ideal for pausing alerts for units that are under repair or just unused for a period. You can change this at any time. Just navigate back to the alert and remove or change the saved time!"

const AlertSuppressionModal = (props: any) => {
  const { showModal, closeModal, sensorCardData } = props
  const [selectedDateTime, _setSelectedDateTime] = useState<any>(null)
  const [isFetching, setIsFetching] = useState<boolean>(false)

  const { css } = useFela()

  const setSelectedDateTime = (args: any) => {
    _setSelectedDateTime(args)
  }
  const saveAlertSuppression = async () => {
    const momentDT = moment(new Date(selectedDateTime)).unix()
    try {
      setIsFetching(true)
      const response = await saveAlertSuppressionRequest(sensorCardData.sensorId, { suppressUntil: momentDT })
      setIsFetching(false)
      closeModal()

      notifyToast(true, 'Alert suppression saved successfully...')
    } catch (e: any) {
      notifyToast(false, 'Something went wrong...')
    }
  }
  useLayoutEffect(() => {
    if (sensorCardData && sensorCardData.suppressUntil && sensorCardData.suppressUntil.epoch) {
      const existingDate = unixToMoment(sensorCardData.suppressUntil.epoch).toDate()
      setSelectedDateTime(existingDate)
    }
  }, [sensorCardData])

  if (!sensorCardData || sensorCardData === null) {
    return <StyledSpinner />
  }
  return (
    <div>
      <ToastContainer />
      <CModal size="lg" show={showModal} onClose={() => closeModal()} color={pathspotWhite} borderColor={pathspotWhite}>
        <CModalHeader className={css(modalHeader)} closeButton>
          <Atomic.PContent width="100%" alignItems="center" justifyContent="center" margin={{ marginTop: '1.5rem' }}>
            <Atomic.PContent isRow width="90%" alignItems="center" justifyContent="center" margin={{ marginLeft: '1.5rem' }}>
              <span
                className={css(
                  modalTitleText({ fontSize: '1.5rem', margin: { marginLeft: '1.5rem' }, textAlign: 'center', justifyContent: 'center' })
                )}
              >
                Suppress Sensor Alerts
              </span>
              <CPopover header="Details" content={tooltipMessage}>
                <span className={css(tooltipAlignment)}>
                  <PathSpotAlert className={css(iconAlignment)} fillColor={pathspotPrimary} />
                </span>
              </CPopover>
            </Atomic.PContent>
            <span
              className={css(
                modalTitleText({
                  margin: { marginTop: '1rem' },
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  fontStyle: 'normal',
                  textAlign: 'center',
                  justifyContent: 'center',
                })
              )}
            >
              {sensorCardData.sensorName}
            </span>
            <span
              className={css(
                modalTitleText({
                  margin: { marginTop: '1rem' },
                  fontSize: '1rem',
                  fontWeight: 'normal',
                  fontStyle: 'italic',
                  textAlign: 'center',
                  justifyContent: 'center',
                })
              )}
            >
              {sensorCardData.locationName}
            </span>
          </Atomic.PContent>
        </CModalHeader>
        {isFetching && <StyledSpinner message="Saving suppression details..." />}

        {!isFetching && (
          <CModalBody>
            <Atomic.PContent width="100%" alignItems="center" justifyContent="center" margin={{ marginBottom: '1rem' }}>
              <Atomic.PContent justifyContent="center">
                <span
                  className={css(
                    itemText({
                      fontSize: '1rem',
                      color: pathspotPrimary,
                      fontWeight: 400,
                      flexWrap: 'noWrap',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      textAlign: 'left',
                      margin: { marginBottom: '2rem' },
                    })
                  )}
                >
                  Until when would you like to snooze the alerts for this sensor?
                </span>
              </Atomic.PContent>
              <div className={css(dropdown({ width: '60%' }))}>
                <DatePicker
                  className={css(datepicker)}
                  showTimeSelect
                  dateFormat="Pp"
                  selected={selectedDateTime}
                  onSelect={setSelectedDateTime}
                  onChange={setSelectedDateTime}
                />
              </div>
            </Atomic.PContent>
            <Atomic.PCenterButtonRow
              buttons={[
                { ...cancelButton, onClick: closeModal },
                { ...saveButton, onClick: saveAlertSuppression },
              ]}
            />
          </CModalBody>
        )}
      </CModal>
    </div>
  )
}
export default AlertSuppressionModal
