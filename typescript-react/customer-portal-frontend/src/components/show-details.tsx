import React, { useState } from 'react'
import CIcon from '@coreui/icons-react'
import { CButton } from '@coreui/react'
import { Popover } from '@mui/material'

type ShowDetailsProps<T> = {
  item: T
  index: number
  disabled: boolean
  disableView: boolean
  disableEdit: boolean
  onViewClick?: (item: T) => void
  onActiveClick: (item: T) => void
}

export const ShowDetails = <T extends { active: string }>(props: ShowDetailsProps<T>) => {
  const { item, index, disabled, disableView, disableEdit, onViewClick, onActiveClick } = props
  const [openPopover, setOpenPopover] = useState<boolean>(false)
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null)
  const active: boolean = item.active == 'Yes'
  return (
    <>
      <td className="py-2">
        <CIcon
          name={'cil-options'}
          className={'mx-2'}
          onClick={(e: any) => {
            setAnchorEl(e?.target)
            setOpenPopover(openPopover ? false : true)
          }}
        />
      </td>

      {anchorEl && openPopover && (
        <Popover
          id={`${index}`}
          open={openPopover}
          anchorOrigin={{
            vertical: 'center',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          onClose={() => {
            setOpenPopover(false)
            setAnchorEl(null)
          }}
          anchorEl={anchorEl}
          style={{ width: '45%', justifyContent: 'center' }}
        >
          <CButton
            block
            shape="square"
            color="white"
            size="m"
            className="p-1 "
            onClick={() => {
              setOpenPopover(false)
              setAnchorEl(null)
              onActiveClick(item)
            }}
            style={{ color: !disabled ? 'black' : '#D3D3D3' }}
            disabled={disableEdit}
          >
            {active ? 'Disable' : 'Enable'}
          </CButton>

          <CButton
            block
            shape="square"
            color={'white'}
            size="m"
            className="p-1 "
            style={{ color: !(disableView && disableEdit) ? 'black' : '#D3D3D3' }}
            disabled={disableView && disableEdit}
            onClick={() => {
              setOpenPopover(false)
              setAnchorEl(null)
              onViewClick?.(item)
            }}
          >
            View/Edit
          </CButton>
        </Popover>
      )}
    </>
  )
}
