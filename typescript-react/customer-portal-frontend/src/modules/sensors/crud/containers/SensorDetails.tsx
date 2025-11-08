import React from 'react'
import { SensorDetailContainer } from './SensorDetailContainer'
import SensorAlertConfigurations from './SensorAlertConfigurations'
import SensorDetailForm from '../content/SensorDetailForm'
import ConfigurationMessage from '../content/ConfigurationMessage'
import SaveResetButtons from '../content/SaveResetButtons'
import { CCard } from '@coreui/react'

const SensorDetails = () => {
  return (
    <SensorDetailContainer>
      <CCard className="wrapper-card">
        <ConfigurationMessage />
        <SensorDetailForm />
        <SensorAlertConfigurations />
        <SaveResetButtons />
      </CCard>
    </SensorDetailContainer>
  )
}
export default SensorDetails
