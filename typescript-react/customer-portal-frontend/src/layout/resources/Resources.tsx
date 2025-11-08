import React, { Fragment } from 'react'
import { useHistory } from 'react-router'

const Resources = () => {
  const history = useHistory()
  const url = 'https://pathspot.com/account-support-resources/'
  const newWindow = window.open(url, '_blank', 'noopener,noreferrer')
  if (newWindow) newWindow.opener = null
  history.push('/dashboard')
  return <Fragment>{}</Fragment>
}

export default Resources
