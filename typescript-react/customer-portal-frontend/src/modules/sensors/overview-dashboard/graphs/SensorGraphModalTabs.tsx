import React from 'react'
import { Box, Tabs, Tab } from '@mui/material'
import { SensorDataType, SensorDataTypeLabel } from '../../api/sensor-types'
import SensorGraphTab from './SensorGraphTab'
import { useSensorGraphs } from './SensorGraphProvider'
import LoadingSpinner from '../../../generic/LoadingSpinner'
import useAuthContext from '../../../../api/authentication/useAuthContext'
import { getAllowedLayoutOrderedSensorDataTypes } from './sensor-graphs.api'

const SensorGraphModalTabs: React.FC = () => {
  const { dataTypeContext: currentTab, sensorData, cardData, isLoading, handleTabChange } = useSensorGraphs()
  const { isPathspotUser, currentUser } = useAuthContext()
  if (sensorData === null || isLoading || currentTab === null || currentUser.userId === null) {
    return <LoadingSpinner message={'Loading graph data...'} />
  }
  const allowedDataTypes = getAllowedLayoutOrderedSensorDataTypes(isPathspotUser)

  return (
    <Box sx={{ width: '100%', mt: 2 }}>
      <Tabs
        value={currentTab}
        onChange={handleTabChange}
        TabIndicatorProps={{ style: { display: 'none' } }} // remove default underline
        sx={{ borderBottom: '1px solid #ccc' }} // bottom line to simulate tab panel border
      >
        {allowedDataTypes.flatMap((dataType) => (
          <Tab
            key={`${sensorData.cardInfo.sensorGridKey}-${dataType}`}
            label={SensorDataTypeLabel.get(dataType as SensorDataType)}
            value={dataType}
            sx={{
              border: '1px solid #ccc',
              borderBottom: '1px solid #ccc', // default for unselected
              borderTopLeftRadius: '8px',
              borderTopRightRadius: '8px',
              backgroundColor: dataType === currentTab ? 'white' : '#f5f5f5',
              zIndex: dataType === currentTab ? 1 : 0,
              marginRight: 1,
              marginLeft: '0.25rem',
              marginTop: '1rem',
              px: 3,
              pt: 1.5,
              transition: 'box-shadow 0.3s ease, background-color 0.3s ease', //make the tab look highlighted
              '&.Mui-selected': {
                boxShadow: '0 0 8px 4px rgba(0, 162, 155, 0.8)',
                backgroundColor: 'white',
                fontWeight: 'bold',
                borderBottom: '5px solid white',
                zIndex: dataType === currentTab ? 1 : 0,
              },
              '&:hover': {
                boxShadow: '0 0 5px 2px rgba(165, 80, 149, 0.6)',
              },
            }}
          />
        ))}
      </Tabs>
      {allowedDataTypes.flatMap((dataType) =>
        currentTab === dataType && sensorData.series[dataType] ? (
          <Box
            key={`${sensorData.cardInfo.sensorGridKey}-${dataType}-Box`}
            sx={{
              border: '1px solid #ccc',
              // borderTop: 'none',
              borderBottomLeftRadius: '8px',
              borderBottomRightRadius: '8px',
              p: 2,
              backgroundColor: 'white',
              position: 'relative',
              top: '-2px',
              zIndex: 0,
            }}
          >
            <SensorGraphTab
              key={dataType}
              dataSeries={sensorData.series[dataType]}
              alertLines={sensorData.alertLines[dataType]}
              sensorContext={dataType}
              isPrint={false}
              cardData={cardData}
            />
          </Box>
        ) : null
      )}
    </Box>
  )
}

export default SensorGraphModalTabs
