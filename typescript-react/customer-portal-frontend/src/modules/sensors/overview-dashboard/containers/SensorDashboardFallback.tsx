import React from 'react'
import { CRow, CCard, CCardHeader, CCardBody } from '@coreui/react'
import { PIcon, PIconLib } from '../../../../webapp-lib/pathspot-react'
import useAuthContext from '../../../../api/authentication/useAuthContext'

const SensorDashboardFallback = (props: any) => {
  const { currentUser } = useAuthContext()
  const currentUserFirstName = currentUser.firstName || currentUser.lastName || currentUser.userEmail || ''

  return (
    <CCard className="mb-3 pb-3">
      <div className="sensor-dashboard-fallback-container">
        <div className="sensor-dashboard-fallback-title-container">
          <div className="sensor-dashboard-fallback-title-icon">
            <PIconLib.PathSpotWarning />
          </div>
          <div className="sensor-dashboard-fallback-title">
            {`Looks like you don't have access to view PathSpot Temperature Sensor information.`}
          </div>
        </div>
        <div>
          <div className="sensor-dashboard-fallback-message-container">
            {/* <span className="column-text-centered-xl"> */}
            <span className="sensor-dashboard-fallback-message">
              {`Please reach out to your PathSpot CSM or send an email to `}
              <a href={'mailto:support@null.com'}>
                <u>
                  <b className="ml-1">{'PathSpot Support'}</b>
                </u>
              </a>
            </span>
          </div>
          <div className="sensor-dashboard-fallback-multi-icon-row-container">
            <div className="sensor-dashboard-fallback-multi-icon-row-icon">
              <PIconLib.PathSpotThermometer className="p-icon-6xl" strokeWidth={10} />
            </div>
            <div className="sensor-dashboard-fallback-multi-icon-row-icon">
              <PIconLib.PathSpotDrop className="p-icon-6xl" strokeWidth={35} />
            </div>
            <div className="sensor-dashboard-fallback-multi-icon-row-icon">
              <PIconLib.PathspotDesktopFallback className="p-icon-8xl" strokeWidth={24} />
            </div>
          </div>
          <div className={'justify-content-center'}>
            <PIcon name="pathspotDesktopFallback" className="p-icon-fallback" />
          </div>
        </div>
      </div>
    </CCard>
  )
}
export default SensorDashboardFallback
// viewBox = '0 125 500 100'
