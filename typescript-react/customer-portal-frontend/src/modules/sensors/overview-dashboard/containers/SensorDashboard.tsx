import '../../styles/sensors-overview.scss'
import React from 'react'
import SensorDataReportsModal from '../data-reports/modal/SensorDataReportsModal'
import SensorOverview from './SensorOverview'
import { SensorOverviewProvider } from '../context/SensorOverviewProvider'
import DashboardContainer from '../../../../components/common/DashboardContainer'

const SensorDashboard = () => {
  return (
    <DashboardContainer>
      <SensorDataReportsModal />
      <SensorOverviewProvider>
        <SensorOverview />
      </SensorOverviewProvider>
    </DashboardContainer>
  )
}

export default SensorDashboard
