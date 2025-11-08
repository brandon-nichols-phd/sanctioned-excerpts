import { useContext } from 'react'
import { SensorOverviewModalContext, SensorOverviewModalContextType } from './SensorOverviewModalProvider'

export const useSensorOverviewModal = (): SensorOverviewModalContextType => {
  const context = useContext(SensorOverviewModalContext)
  if (!context) {
    throw new Error('Sensor overview modal context not defined.')
  }
  return context
}
