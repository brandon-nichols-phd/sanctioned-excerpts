import CIcon from '@coreui/icons-react'
import { CRow, CCard, CCardHeader, CCol, CLink, CCollapse, CCardBody } from '@coreui/react'
import React, { useState } from 'react'

import { Atomic, StyledSpinner } from '../../../../webapp-lib/pathspot-react'

import SensorAlertConfigurationItem from '../content/AlertConfiguration/SensorAlertConfigurationItem'
import useSensorDetails from './useSensorDetails'
import AddAlertButton from '../content/AlertConfiguration/AddAlertButton'

const SensorAlertConfigurations = () => {
  const {
    alertableUserOptions,
    sensorDetails,
    permissions,
    editAlert,
    removeAlert,
    addAlert,
    userPreferredTemperatureUnit,
    errors,
    canViewSensorAndActions: canViewSensor,
    canEditAlerts,
  } = useSensorDetails()

  const disableEditAlerts = !canEditAlerts

  const [collapse, setCollapse] = useState<boolean>(true)

  if (alertableUserOptions == null || permissions == null || sensorDetails == null) {
    return <StyledSpinner message={'Fetching Sensor Alert Configuration Information...'} />
  }

  if (!canViewSensor) {
    return null
  }

  return (
    <CRow className="justify-content-center">
      <CCol md="11" className="py-3">
        <CCard>
          <CCardHeader style={{ cursor: 'pointer' }} onClick={() => setCollapse(collapse ? false : true)} className={''}>
            <CRow>
              <CCol xs="6">
                <CCol xs="5" className={''}>
                  <span style={{ display: 'inline-block' }} className={''}>
                    {'Alert Configurations'}
                  </span>
                </CCol>
              </CCol>
              <CCol xs="6" className="text-end">
                <CRow className="justify-content-end mr-1">
                  <CLink className={''}>
                    <CIcon name={collapse ? 'cil-chevron-top' : 'cil-chevron-bottom'} />
                  </CLink>
                </CRow>
              </CCol>
            </CRow>
          </CCardHeader>
          <CCollapse show={collapse}>
            <CCardBody className="mb-3">
              {sensorDetails.alerts?.flatMap((alertConfig, index) => {
                if (alertConfig.active) {
                  return [
                    <SensorAlertConfigurationItem
                      key={`${index}`}
                      alertIndex={index}
                      editAlert={editAlert}
                      removeAlert={removeAlert}
                      alertConfig={alertConfig}
                      userPreferredTemperatureUnit={userPreferredTemperatureUnit}
                      alertableUserOptions={alertableUserOptions}
                      errors={errors?.alerts?.at(index)}
                      viewOnly={disableEditAlerts}
                    />,
                  ]
                }
                return []
              }, []) ?? null}
              <Atomic.PContainer>
                <AddAlertButton viewOnly={disableEditAlerts} onClick={addAlert} />
              </Atomic.PContainer>
            </CCardBody>
          </CCollapse>
        </CCard>
      </CCol>
    </CRow>
  )
}
export default SensorAlertConfigurations
