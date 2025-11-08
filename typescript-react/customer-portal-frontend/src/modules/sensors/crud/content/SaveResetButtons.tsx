import React from 'react'
import CIcon from '@coreui/icons-react'
import { CButtonToolbar, CButton } from '@coreui/react'
import { Atomic } from '../../../../webapp-lib/pathspot-react'
import useSensorDetails from '../containers/useSensorDetails'

const SaveResetButtons: React.FC = () => {
  const { onSaveClick, onResetClick, canViewSensorAndActions, canEditAlerts, canEditSensor } = useSensorDetails()

  if (!canViewSensorAndActions) {
    return null
  }

  return (
    <Atomic.PContainer isRow className="justify-content-center">
      <Atomic.PContent className="justify-content-center">
        <CButtonToolbar justify="center">
          <CButton disabled={!(canEditAlerts && canEditSensor)} onClick={onSaveClick} color="success" className="px-4 mx-1">
            <CIcon name="cil-check" /> Save Changes
          </CButton>
          <CButton disabled={!(canEditSensor && canEditAlerts)} onClick={onResetClick} color="danger" className="px-4 mx-1">
            <CIcon name="cil-loop" /> Reset
          </CButton>
        </CButtonToolbar>
      </Atomic.PContent>
    </Atomic.PContainer>
  )
}
export default SaveResetButtons
