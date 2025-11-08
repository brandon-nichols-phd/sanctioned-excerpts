import React from 'react'
import { CFooter, CLink } from '@coreui/react'

export const TheFooter = () => {
  return (
    <CFooter className="help-footer">
      <div className="justify-content-center">
        Need help? Contact <a href={'mailto:support@null.com'}>support@null.com</a> or call/text{' '}
        <a href={'tel:718-550-0040'}>718-550-0040</a>
      </div>

      {/* <div>
        <CLink href="https://coreui.io/react/docs/" target="_blank">
          Library documentation
        </CLink>
      </div>
      <div className="ml-auto">
        <span className="mr-1">Right text</span>
      </div> */}
    </CFooter>
  )
}

export default React.memo(TheFooter)
