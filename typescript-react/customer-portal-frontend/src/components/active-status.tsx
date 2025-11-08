import React, { FC } from 'react'
import { CBadge } from '@coreui/react'

type Props = {
  val: string
}

export const ActiveStatus: FC<Props> = ({ val }) => {
  const bColor = val === 'Yes' ? 'success' : 'danger'
  return (
    <td className="text-center">
      <CBadge className="py-2 px-4" color={bColor}>
        {val}
      </CBadge>
    </td>
  )
}
