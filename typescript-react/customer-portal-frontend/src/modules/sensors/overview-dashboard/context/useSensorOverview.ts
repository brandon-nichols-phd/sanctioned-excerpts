import { useContext } from 'react'
import { SensorOverviewContext, SensorOverviewContextType } from './SensorOverviewProvider'

export const useSensorOverview = (): SensorOverviewContextType => {
  const context = useContext(SensorOverviewContext)
  if (!context) {
    throw new Error('Sensor overview context not defined.')
  }
  return context
}
