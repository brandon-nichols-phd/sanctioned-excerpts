import React from 'react'
import SensorCollapseCardContent from '../content/SensorCollapseCardContent'
import { Atomic } from '../../../../../webapp-lib/pathspot-react'

const SensorCollapseCard = (props: any) => {
  const { context, data, rowContext, currentReport } = props
  return (
    <Atomic.PCollapseCard title={`${context.toUpperCase()} Checks`}>
      <SensorCollapseCardContent items={[...data]} rowContext={rowContext} context={context} currentReport={currentReport} />
    </Atomic.PCollapseCard>
  )
}

export default SensorCollapseCard
