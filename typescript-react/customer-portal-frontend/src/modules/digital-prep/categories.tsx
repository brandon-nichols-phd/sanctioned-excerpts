import React, { FC } from 'react'
import CIcon from '@coreui/icons-react'
import { CButton, CCardBody, CCardHeader, CDataTable } from '@coreui/react'
import { Link, useHistory } from 'react-router-dom'

import { ShowDetails } from '../../components/show-details'
import { ActiveStatus } from '../../components/active-status'
import { useCategories } from './use-categories'
import useAuthContext from '../../api/authentication/useAuthContext'
import { DISPLAY_PAGES } from '../../api/constants'
import { CategoryForTable } from './category'

const baseColumnHeaders = {
  name: 'Name',
  customerName: 'Customer',
  locationName: 'Location',
  order: 'Order',
  active: 'Active',
  options: <CIcon name={'cil-options'} className={'mx-2'} />,
}

const baseTableFields = [
  { key: 'name', _style: { width: 'auto' } },
  { key: 'customerName', _style: { width: 'auto' } },
  { key: 'locationName', _style: { width: 'auto' } },
  { key: 'order', _style: { width: 'auto' } },
  { key: 'active', _style: { width: 'auto' } },
  {
    key: 'options',
    _style: { width: 'auto' },
    label: '',
    sorter: false,
    filter: false,
  },
]

const Categories: FC = () => {
  const history = useHistory()
  const { categoriesForTable, isLoading, toggleActiveStatus } = useCategories()
  const { checkPermissions } = useAuthContext()

  const viewDigitalPrepDisabled = !checkPermissions(DISPLAY_PAGES.ITEM_VIEW_DIGITAL_PREP)
  const editDigitalPrepDisabled = !checkPermissions(DISPLAY_PAGES.ITEM_EDIT_DIGITAL_PREP)
  const createDigitalPrepDisabled = !checkPermissions(DISPLAY_PAGES.ITEM_CREATE_DIGITAL_PREP)

  return (
    <div className="mb-5">
      <CCardHeader>
        Category List
        <div className="float-right display-inline-block mx-1">
          <Link to={{ pathname: '/digital-prep/categories/new' }}>
            <CButton block shape="pill" color="primary" size="sm" className="float-right mx-1" disabled={createDigitalPrepDisabled}>
              Create Category
            </CButton>
          </Link>
        </div>
      </CCardHeader>

      <CCardBody style={{ backgroundColor: 'white' }}>
        <CDataTable
          items={categoriesForTable}
          fields={baseTableFields}
          columnHeaderSlot={baseColumnHeaders}
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
            active: (row: CategoryForTable) => <ActiveStatus val={row.active} />,
            options: (row: CategoryForTable, index: number) => (
              <ShowDetails
                index={index}
                item={row}
                disabled={viewDigitalPrepDisabled || editDigitalPrepDisabled}
                disableView={viewDigitalPrepDisabled}
                disableEdit={editDigitalPrepDisabled}
                onViewClick={(item) => {
                  history.push({ pathname: `categories/${item.id}` })
                }}
                onActiveClick={(item) => {
                  toggleActiveStatus(item.id)
                }}
              />
            ),
          }}
        />
      </CCardBody>
    </div>
  )
}

export default Categories
