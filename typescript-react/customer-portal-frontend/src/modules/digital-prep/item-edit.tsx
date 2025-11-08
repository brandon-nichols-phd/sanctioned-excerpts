import React, { FC, useState } from 'react'

import { match } from 'ts-pattern'

import ScopedCssBaseline from '@mui/material/ScopedCssBaseline'
import Box from '@mui/material/Box'
import { StyledSpinner } from '../../webapp-lib/pathspot-react'
import { SelectInitialValues } from '../../components/select-initial-values'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { pathspotPrimary } from '../../webapp-lib/pathspot-react/styles/ts/colors'

import { useParams } from 'react-router-dom'
import useAuthContext from '../../api/authentication/useAuthContext'
import { DISPLAY_PAGES } from '../../api/constants'
import { useItemOptions } from './use-item-options'
import ItemDetails from './item-detail'

const theme = createTheme({
  palette: {
    primary: { main: pathspotPrimary },
  },
})

const ItemEdit: FC = () => {
  const { checkPermissions } = useAuthContext()
  const editDigitalPrepDisabled = !checkPermissions(DISPLAY_PAGES.ITEM_EDIT_DIGITAL_PREP)

  const { itemId } = useParams<{ itemId?: string }>()
  const [customerId, setCustomerId] = useState<string>('')
  const { optionsPerCustomer, isLoading } = useItemOptions({ itemId })

  if (isLoading) {
    return <StyledSpinner message="Retrieving item details..." />
  }

  return (
    <ScopedCssBaseline>
      <ThemeProvider theme={theme}>
        <Box
          sx={{
            '& .MuiFormControl-root': { my: 1 },
            '& .MuiCard-root': { mb: 2 },
            '& > .MuiCard-root': { mb: 8 },
            '& .MuiCardHeader-root': { backgroundColor: 'lightgrey' },
          }}
        >
          {match(!itemId && !customerId)
            .with(true, () => {
              const customerOptions = Object.entries(optionsPerCustomer).map(([cusId, cusOpts]) => ({
                itemId: parseInt(cusId, 10),
                itemName: cusOpts.name ?? '',
              }))

              return (
                <SelectInitialValues
                  title="New Item"
                  valuesToSelect={[
                    {
                      label: 'Select Customer',
                      list: customerOptions,
                      selector: (cusId) => setCustomerId(cusId.toString()),
                    },
                  ]}
                />
              )
            })
            .otherwise(() => {
              const itemIdAsInt = itemId !== undefined ? parseInt(itemId, 10) : itemId

              return (
                <ItemDetails options={optionsPerCustomer} itemId={itemIdAsInt} customerId={customerId} disabled={editDigitalPrepDisabled} />
              )
            })}
        </Box>
      </ThemeProvider>
    </ScopedCssBaseline>
  )
}

export default ItemEdit
