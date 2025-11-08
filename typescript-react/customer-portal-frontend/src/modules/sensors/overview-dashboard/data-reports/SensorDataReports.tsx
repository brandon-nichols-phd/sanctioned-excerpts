import '../../styles/sensors-overview.scss'

import React from 'react'
import { Atomic, StyledSpinner } from '../../../../webapp-lib/pathspot-react'
import { useSensorDataReport } from './use-sensor-data-reports'
import SensorDataReportPaneHeader from './content/SensorDataReportPaneHeader'
import SensorDataReportTable from './containers/SensorDataReportTable'

const SensorDataReports = () => {
  const {
    currentReport,
    locationOptions,
    amData,
    pmData,
    isSorting,
    onNextDay,
    onPreviousDay,
    onLocationChange,
    onDepartmentChange,
    onSelectedDayChange,
    tempInC,
    currentUser,
  } = useSensorDataReport()

  if (locationOptions === null || currentReport === null) {
    return <StyledSpinner message="Loading report data..." />
  }
  if (amData === null || pmData === null || isSorting === true || currentUser === null || tempInC === null) {
    return <StyledSpinner message="Sorting reading data..." />
  }
  return (
    <Atomic.PWrapper margin={{ marginBottom: '3rem' }}>
      <SensorDataReportPaneHeader
        reportSelections={currentReport.reportSelections}
        isDepartmentContext={!!currentReport.reportSelections.selectedDepartment}
        locationOptions={locationOptions}
        onNextDay={onNextDay}
        onPreviousDay={onPreviousDay}
        onLocationChange={onLocationChange}
        onDepartmentChange={onDepartmentChange}
        onSelectedDayChange={onSelectedDayChange}
      />
      <Atomic.PContainer>
        {amData.data.length > 0 && (
          <Atomic.PCollapseCard title={`${'am'.toUpperCase()} Checks`}>
            <Atomic.PContainer>
              <SensorDataReportTable
                items={[...amData.data]}
                context="am"
                initialRowContext={amData.rowContext}
                currentReport={currentReport}
                tempInC={tempInC}
                currentUser={currentUser}
              />
            </Atomic.PContainer>
          </Atomic.PCollapseCard>
        )}
        {pmData.data.length > 0 && (
          <Atomic.PCollapseCard title={`${'pm'.toUpperCase()} Checks`}>
            <Atomic.PContainer>
              <SensorDataReportTable
                items={[...pmData.data]}
                context="pm"
                initialRowContext={pmData.rowContext}
                currentReport={currentReport}
                currentUser={currentUser}
                tempInC={tempInC}
              />
            </Atomic.PContainer>
          </Atomic.PCollapseCard>
        )}
        {amData.data.length === 0 && pmData.data.length === 0 && (
          <Atomic.PItemText
            justifyContent="center"
            alignItems="center"
            fontSize="2rem"
            margin={{ marginTop: '2rem' }}
            displayText="No data available for current selections..."
          />
        )}
      </Atomic.PContainer>
    </Atomic.PWrapper>
  )
}
export default SensorDataReports
