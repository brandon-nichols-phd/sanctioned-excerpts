import React from 'react'
import { Atomic } from '../../../../../webapp-lib/pathspot-react'
import SensorDataReportTable from '../containers/SensorDataReportTable'

const SensorCollapseCardContent = (props: any) => {
  const { items, context, rowContext, currentReport } = props

  return (
    <Atomic.PContainer>
      <SensorDataReportTable {...({ items, context, rowContext, currentReport } as any)} />
    </Atomic.PContainer>
  )
}

export default SensorCollapseCardContent
