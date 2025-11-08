import React, { useCallback, useEffect, useState } from 'react'
import CIcon from '@coreui/icons-react'
import { CButton, CCardBody, CCardHeader, CDataTable } from '@coreui/react'
import { editSensor, getSensorModels, getSensorTableData, getSensorUnitTypes } from '../../api/sensor-requests.api'
import { formatTimeZonedDateTime, getTimeZone } from '../../../../webapp-lib/pathspot-react/api/time/date-handler'
import { Link, useHistory } from 'react-router-dom'
import { SensorListItem } from '../../api/sensor-types'
import { getPermissions } from '../../api/sensor-requests.api'
import { ShowDetails } from '../../../../components/show-details'
import { ActiveStatus } from '../../../../components/active-status'

const SensorTablePanel = (props: any) => {
  const { colHeaders, tableFields } = props
  const [isFetching, setIsFetching] = useState(false)
  const [sensors, setSensors] = useState<SensorListItem[]>([])
  const [tableData, setTableData] = useState<any>(null)
  const [canCreateNewSensor, setCanCreateNewSensor] = useState<boolean>(false)
  const [permissions, setPermissions] = useState<any>()

  const history = useHistory()

  const fetchSensorTableData = useCallback(async () => {
    setIsFetching(true)
    const modelRes = await getSensorModels()
    const models: any = [];

    (modelRes.data as any[]).forEach((model: any) => {
      models[model.sensorModelId] = { ...model }
    })

    const responseObj = await getSensorTableData()
    if (responseObj.data) {
      const data = (responseObj.data as any[]).map((sensor: any) => {
        return {
          sensorName: sensor?.sensorName,
          sensorType: models[sensor?.sensorModelId]?.protocol || '-',
          sensorEui: sensor?.publicAddr || '-',
          category: sensor?.tag?.join(', ') || '-', // will either be an arr or strings
          unitType: sensor?.unitTypeName,
          locationName: sensor?.locationName,
          departmentName: sensor?.departmentName || '-',
          locationId: sensor?.locationId,
          alertsConfigured: sensor?.sensorActionCount,
          sensorId: sensor?.sensorId,
          lastModified: formatTimeZonedDateTime(sensor?.lastModifiedWhen, getTimeZone()) || '',
          active: sensor?.active ? 'Yes' : 'No',
          sensorModelId: sensor?.sensorModelId,
        }
      })

      setSensors(data as unknown as SensorListItem[])
      setIsFetching(false)
    }
  }, [])

  const fetchSensorPermissions = useCallback(async () => {
    const perms = await getPermissions()
    // if edit_sensors contains locations, you can create new sensors
    if (perms.editSensor?.length) {
      setCanCreateNewSensor(true)
    } else {
      setCanCreateNewSensor(false)
    }
    setPermissions(perms)
  }, [])

  useEffect(() => {
    fetchSensorTableData()
    fetchSensorPermissions()
  }, [fetchSensorPermissions, fetchSensorTableData])

  useEffect(() => {
    if (permissions) {
      setTableData(sensors)
    } else {
      setTableData([])
    }
  }, [permissions, sensors])

  return (
    <div className="mb-5">
      <CCardHeader>
        Sensors
        <div className="float-right display-inline-block ml-3 my-2">
          <CIcon // todo: add onclick download
            name="cil-cloud-download"
            className="float-right"
            style={{ cursor: 'pointer' }}
            onClick={() => {
              // nada
            }}
          />
        </div>
        {canCreateNewSensor && (
          <div className="float-right display-inline-block mx-1">
            <Link
              to={{
                pathname: '/sensors/new',
                state: {
                  permissions: permissions,
                },
              }}
            >
              <CButton block shape="pill" color="primary" size="sm" className="float-right mx-1">
                {' '}
                Create Sensor
              </CButton>
            </Link>
          </div>
        )}
      </CCardHeader>

      <CCardBody style={{ backgroundColor: 'white' }}>
        <CDataTable
          items={tableData}
          fields={tableFields}
          columnHeaderSlot={colHeaders}
          columnFilter
          loading={isFetching}
          itemsPerPageSelect={{
            label: 'Items per page: ',
            values: [10, 25, 50],
          }}
          itemsPerPage={10}
          hover
          sorter
          pagination={{
            align: 'center',
          }}
          scopedSlots={{
            active: (item: any) => <ActiveStatus val={item.active} />,
            options: (item: any, index: number) => (
              <ShowDetails
                item={item}
                index={index}
                disabled={permissions?.editSensor?.length <= 0}
                disableEdit={permissions?.editSensor?.length <= 0}
                disableView={false}
                onActiveClick={async (item) => {
                  const res: unknown = await editSensor(item.sensorId, {
                    active: !item.active,
                    locationId: item?.locationId,
                    departmentId: item?.departmentId,
                    sensorModelId: item?.sensorModelId,
                  })
                  if (res) {
                    item.active = !item.active ? 'Yes' : 'No'
                    fetchSensorTableData() // refetch data
                  }
                }}
                onViewClick={async (item) => {
                  if (item.sensorId && permissions?.viewSensor?.length > 0) {
                    history.push({
                      pathname: `sensors/${item.sensorId}`,
                      state: {
                        sensorId: item.sensorId,
                        permissions: permissions,
                      },
                    })
                  }
                }}
              />
            ),
          }}
          // columnFilterSlot={{
          //   active: (filter: any) =>
          // }}
        />
      </CCardBody>
    </div>
  )
}

export default SensorTablePanel
