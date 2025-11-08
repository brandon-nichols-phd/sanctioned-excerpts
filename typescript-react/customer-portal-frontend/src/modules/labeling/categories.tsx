import React, { FC, useMemo } from 'react'
import CIcon from '@coreui/icons-react'
import { CButton, CCardBody, CCardHeader, CDataTable } from '@coreui/react'
import { Link, useHistory } from 'react-router-dom'

import { ShowDetails } from '../../components/show-details'
import { ActiveStatus } from '../../components/active-status'
import { TECH_DEBT, type CategoryForTable, type PhaseKey } from './item'
import { useCategories } from './use-categories'
import useAuthContext from '../../api/authentication/useAuthContext'
import { DISPLAY_PAGES } from '../../api/constants'

const baseColumnHeaders = {
  name: 'Name',
  itemsCount: 'Ingredients',
  customerName: 'Customer',
  active: 'Active',
  options: <CIcon name={'cil-options'} className={'mx-2'} />,
}

const baseTableFieldsLeft = [
  { key: 'name', _style: { width: 'auto' } },
  { key: 'itemsCount', _style: { width: 'auto' } },
]

const baseTableFieldsRight = [
  { key: 'customerName', _style: { width: 'auto' } },
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
  const { itemsForTable, extraColumnsForTable, isLoading, toggleActiveStatus } = useCategories()
  const { checkPermissions } = useAuthContext()

  const viewLabelsDisabled: boolean = !checkPermissions(DISPLAY_PAGES.ITEM_VIEW_LABELS)
  const editLabelsDisabled: boolean = !checkPermissions(DISPLAY_PAGES.ITEM_EDIT_LABELS)
  const createLabelsDisabled: boolean = !checkPermissions(DISPLAY_PAGES.ITEM_CREATE_LABELS)

  const { columnHeaders, tableFields, scopedSlots } = useMemo(() => {
    // For now show at most 4 phases.
    const extraColumnsEntries = Object.entries(extraColumnsForTable)
      .sort(([, fName], [, sName]) => {
        return fName.toLowerCase().localeCompare(sName.toLowerCase())
      })
      .slice(0, TECH_DEBT.MAXIMUM_NUMBER_OF_DISPLAYED_PHASES)

    return {
      columnHeaders: {
        ...baseColumnHeaders,
        ...extraColumnsForTable,
      },
      tableFields: [
        ...baseTableFieldsLeft,
        ...extraColumnsEntries.map(([phaseKey]) => ({
          key: phaseKey,
          _style: { width: 'auto' },
        })),
        ...baseTableFieldsRight,
      ],
      scopedSlots: extraColumnsEntries.reduce((accum, [phaseKey]) => {
        accum[phaseKey] = (row: CategoryForTable) => <td className="text-center">{row[phaseKey as PhaseKey] ?? '-'}</td>
        return accum
      }, {} as Record<string, (row: CategoryForTable) => JSX.Element>),
    }
  }, [extraColumnsForTable])

  return (
    <div className="mb-5">
      <CCardHeader>
        Category List
        <div className="float-right display-inline-block mx-1">
          <Link to={{ pathname: '/labels/categories/new' }}>
            <CButton block shape="pill" color="primary" size="sm" className="float-right mx-1" disabled={createLabelsDisabled}>
              Create Category
            </CButton>
          </Link>
        </div>
      </CCardHeader>

      <CCardBody style={{ backgroundColor: 'white' }}>
        <CDataTable
          items={itemsForTable}
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
            active: (row: CategoryForTable) => <ActiveStatus val={row.active} />,
            options: (row: CategoryForTable, index: number) => (
              <ShowDetails
                index={index}
                item={row}
                disabled={viewLabelsDisabled || editLabelsDisabled}
                disableView={viewLabelsDisabled}
                disableEdit={editLabelsDisabled}
                onViewClick={(category) => {
                  history.push({ pathname: `categories/${category.id}` })
                }}
                onActiveClick={(category) => {
                  toggleActiveStatus(category.id)
                }}
              />
            ),
            ...scopedSlots,
          }}
        />
      </CCardBody>
    </div>
  )
}

export default Categories
