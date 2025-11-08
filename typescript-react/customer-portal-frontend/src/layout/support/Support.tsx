import React, { Fragment } from 'react'
import { useHistory } from 'react-router'

const Support = () => {
  const history = useHistory()
  const url = 'https://pathspot.com/customer-support-contact/'
  const newWindow = window.open(url, '_blank', 'noopener,noreferrer')
  if (newWindow) newWindow.opener = null
  history.push('/dashboard')
  return <Fragment>{}</Fragment>
}

export default Support
