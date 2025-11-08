import { useContext } from 'react'
import { SensorDetailConfigurationContext } from './SensorDetailContainer'
import { SelectableItem } from '../../../../api/types'
const useSensorDetails = () => {
  const context = useContext(SensorDetailConfigurationContext)

  if (context === null) {
    throw new Error('useSensorDetails must be used within a SensorDetailContainer')
  }

  return context
}

export default useSensorDetails
