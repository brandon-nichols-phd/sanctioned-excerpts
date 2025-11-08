import React from 'react'

const AlertConfigurationMessages = (permissions: any) => {
  if (permissions?.editAction?.length && permissions?.editSensor?.length) {
    return (
      <p>
        If you need any help adding sensors or want to add a new sensor category please contact PathSpot Support at <b>support@null.com</b>{' '}
        or <b>718-550-0040</b>.
      </p>
    )
  } else if (!permissions?.editAction?.length) {
    return (
      <p>
        If you need any help adding sensors or want to add a new sensor category please contact PathSpot Support at <b>support@null.com</b>{' '}
        or <b>718-550-0040</b>.
      </p>
    )
  } else {
    return (
      <p>
        To edit your sensor Alert information please contact PathSpot Support at please contact PathSpot Support at <b>support@null.com</b>{' '}
        or <b>718-550-0040</b>.
      </p>
    )
  }
}
export default AlertConfigurationMessages
