import React, { FC, useState } from 'react'

import { match } from 'ts-pattern'
import type { NumericString } from './item'

import ScopedCssBaseline from '@mui/material/ScopedCssBaseline'
import Box from '@mui/material/Box'
import { StyledSpinner } from '../../webapp-lib/pathspot-react'
import { SelectInitialValues } from '../../components/select-initial-values'

import { ThemeProvider, createTheme } from '@mui/material/styles'
import { pathspotPrimary } from '../../webapp-lib/pathspot-react/styles/ts/colors'

import { useParams } from 'react-router-dom'
import { useItemOptions } from './use-item-options'
import CategoryDetails from './category-details'
import useAuthContext from '../../api/authentication/useAuthContext'
import { DISPLAY_PAGES } from '../../api/constants'

const theme = createTheme({
  palette: {
    primary: { main: pathspotPrimary },
  },
})

const CategoryEdit: FC = () => {
  const { checkPermissions } = useAuthContext()
  const editLabelsDisabled = !checkPermissions(DISPLAY_PAGES.ITEM_EDIT_LABELS)

  const { categoryId } = useParams<{ categoryId?: string }>()
  const [customerId, setCustomerId] = useState<NumericString | ''>('')
  const { optionsPerCustomer, isLoading } = useItemOptions()

  if (isLoading) {
    return <StyledSpinner message="Retrieving ingredient details..." />
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
          {match(!categoryId && !customerId)
            .with(true, () => {
              const customerOptions = Object.entries(optionsPerCustomer).map(([cusId, cusOpts]) => ({
                itemId: parseInt(cusId, 10),
                itemName: cusOpts.name ?? '',
              }))

              return (
                <SelectInitialValues
                  title="New Category"
                  valuesToSelect={[
                    {
                      label: 'Select Customer',
                      list: customerOptions,
                      selector: (cusId) => setCustomerId(cusId.toString() as NumericString),
                    },
                  ]}
                />
              )
            })
            .otherwise(() => {
              const categoryIdAsInt = categoryId !== undefined ? parseInt(categoryId, 10) : categoryId

              return (
                <CategoryDetails
                  options={optionsPerCustomer}
                  categoryId={categoryIdAsInt}
                  customerId={customerId}
                  disabled={editLabelsDisabled}
                />
              )
            })}
        </Box>
      </ThemeProvider>
    </ScopedCssBaseline>
  )
}

export default CategoryEdit
