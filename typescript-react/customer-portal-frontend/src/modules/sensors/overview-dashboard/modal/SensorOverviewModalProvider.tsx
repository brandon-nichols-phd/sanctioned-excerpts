import { useCallback, useState } from 'react'
import { SensorGridItem } from '../../api/sensor-types'
import React from 'react'

export enum OverviewModalContext {
  sensorItemGraph = 'sensorItemGraph',
  sensorItemAlertSuppression = 'sensorItemAlertSuppression',
}

export type SensorOverviewModalContextType = {
  clearModal: () => void
  showModal: boolean
  modalContext: OverviewModalContext
  onSensorItemAlertClick: (sensor: SensorGridItem) => void
  onSensorItemClick: (sensor: SensorGridItem) => void
  singleSensorCardData: SensorGridItem | null
}

export const SensorOverviewModalContext = React.createContext<SensorOverviewModalContextType | undefined>(undefined)

type SensorOverviewModalProviderProps = {
  children: React.ReactNode
  onCloseExternal?: () => void
}

export const SensorOverviewModalProvider: React.FC<SensorOverviewModalProviderProps> = ({ children, onCloseExternal }) => {
  const [showModal, setShowModal] = useState<boolean>(false)
  const [modalContext, setModalContext] = useState<OverviewModalContext>(OverviewModalContext.sensorItemGraph)
  const [singleSensorCardData, setSingleSensorCardData] = useState<SensorGridItem | null>(null)

  const onSensorItemClick = useCallback((sensorItem: SensorGridItem) => {
    setSingleSensorCardData(sensorItem)
    setModalContext(OverviewModalContext.sensorItemGraph)
    setShowModal(true)
  }, [])

  const onSensorItemAlertClick = useCallback((sensorItem: SensorGridItem) => {
    if (sensorItem.primaryDataAlerts?.some((alert) => alert.criticality)) {
      setSingleSensorCardData(sensorItem)
      setModalContext(OverviewModalContext.sensorItemAlertSuppression)
      setShowModal(true)
    }
  }, [])

  const clearModal = useCallback(() => {
    setShowModal(false)
    setSingleSensorCardData(null)
    if (onCloseExternal !== undefined) {
      onCloseExternal()
    }
  }, [onCloseExternal])

  return (
    <SensorOverviewModalContext.Provider
      value={{
        clearModal,
        showModal,
        modalContext,
        onSensorItemAlertClick,
        onSensorItemClick,
        singleSensorCardData,
      }}
    >
      {children}
    </SensorOverviewModalContext.Provider>
  )
}
