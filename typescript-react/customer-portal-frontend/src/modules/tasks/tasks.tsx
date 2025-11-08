import React, { FC, useEffect } from 'react'
import CIcon from '@coreui/icons-react'
import { CButton, CCardBody, CCardHeader, CDataTable } from '@coreui/react'
import { Link, useHistory } from 'react-router-dom'

import useAppSelector from '../../redux/useAppSelector'
import { selectAppNavToggleElementValue } from '../../redux/store'
import { AppDispatches, NavToggleElement } from '../../redux/contexts/app'
import { ShowDetails } from '../../components/show-details'
import { ActiveStatus } from '../../components/active-status'
import type { TaskListStatusForTable } from './data/task'
import { useTaskList } from './use-task-list'
import { TaskDashboardModal } from './tasks-dashboard'
import useAppDispatch from '../../redux/useAppDispatch'
import { DISPLAY_PAGES } from '../../api/constants'
import useAuthContext from '../../api/authentication/useAuthContext'

const columnHeaders = {
  name: 'Name',
  customerName: 'Customer',
  taskCount: 'Task Count',
  recurrence: 'Recurrence',
  start: 'Start',
  end: 'End',
  //reminder: 'Reminders',
  active: 'Active',
  options: <CIcon name={'cil-options'} className={'mx-2'} />,
}

const tableFields = [
  { key: 'name', _style: { width: 'auto' } },
  { key: 'customerName', _style: { width: 'auto' } },
  { key: 'taskCount', _style: { width: 'auto' } },
  { key: 'recurrence', _style: { width: 'auto' } },
  { key: 'start', _style: { width: 'auto' } },
  { key: 'end', _style: { width: 'auto' } },
  //{ key: 'reminder', _style: { width: 'auto' } },
  { key: 'active', _style: { width: 'auto' } },
  {
    key: 'options',
    _style: { width: 'auto' },
    label: '',
    sorter: false,
    filter: false,
  },
]

const Tasks: FC = () => {
  const { taskListStatusForTable, isLoading, toggleActiveStatus } = useTaskList()
  const { checkPermissions } = useAuthContext()
  const history = useHistory()
  const dispatch = useAppDispatch()

  const downloadReportValue = useAppSelector((state) => selectAppNavToggleElementValue(state, NavToggleElement.genericDownloadReport))

  // If a user navigates away with modal open and comes back it will show up again
  // This will clear it out
  useEffect(() => {
    dispatch({
      type: AppDispatches.setNavElementValue,
      payload: {
        element: NavToggleElement.genericDownloadReport,
        value: false,
      },
    })
  }, [])

  return (
    <div className="mb-5">
      <CCardHeader>
        Task Lists
        <div className="float-right display-inline-block mx-1">
          <Link
            to={{
              pathname: '/tasks/new',
            }}
          >
            <CButton
              block
              shape="pill"
              color="primary"
              size="sm"
              className="float-right mx-1"
              disabled={!checkPermissions(DISPLAY_PAGES.ITEM_CREATE_TASKS)}
            >
              Create Task
            </CButton>
          </Link>
        </div>
      </CCardHeader>

      <CCardBody style={{ backgroundColor: 'white' }}>
        <CDataTable
          items={taskListStatusForTable}
          fields={tableFields}
          columnHeaderSlot={columnHeaders}
          columnFilter
          loading={isLoading}
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
            options: (item: TaskListStatusForTable, index: number) => (
              <ShowDetails
                index={index}
                item={item}
                disabled={!checkPermissions(DISPLAY_PAGES.ITEM_EDIT_TASKS) && !checkPermissions(DISPLAY_PAGES.ITEM_VIEW_TASKS)}
                disableView={!checkPermissions(DISPLAY_PAGES.ITEM_VIEW_TASKS)}
                disableEdit={!checkPermissions(DISPLAY_PAGES.ITEM_EDIT_TASKS)}
                onViewClick={(item) => {
                  history.push({
                    pathname: `tasks/${item.id}`,
                  })
                }}
                onActiveClick={(item) => {
                  toggleActiveStatus(item.id)
                }}
              />
            ),
          }}
        />
      </CCardBody>
      <TaskDashboardModal
        open={downloadReportValue}
        onClose={() => {
          dispatch({
            type: AppDispatches.setNavElementValue,
            payload: {
              element: NavToggleElement.genericDownloadReport,
              value: false,
            },
          })
        }}
      />
    </div>
  )
}

export default Tasks
