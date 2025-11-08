import React, { FC, useState } from 'react'
import { match } from 'ts-pattern'
import ScopedCssBaseline from '@mui/material/ScopedCssBaseline'
import Box from '@mui/material/Box'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { useParams } from 'react-router-dom'
import { StyledSpinner } from '../../webapp-lib/pathspot-react'
import { SelectInitialValues } from '../../components/select-initial-values'
import { pathspotPrimary } from '../../webapp-lib/pathspot-react/styles/ts/colors'
import { useCategoryOptions } from './use-category-options'
import CategoryDetails from './category-details'
import useAuthContext from '../../api/authentication/useAuthContext'
import { DISPLAY_PAGES } from '../../api/constants'
import type { NumericString } from './category'

const theme = createTheme({
  palette: {
    primary: { main: pathspotPrimary },
  },
})

const CategoryEdit: FC = () => {
  const { checkPermissions } = useAuthContext()
  const editDigitalPrepDisabled = !checkPermissions(DISPLAY_PAGES.ITEM_EDIT_DIGITAL_PREP)

  const { categoryId } = useParams<{ categoryId?: string }>()
  const [customerId, setCustomerId] = useState<NumericString | ''>('')
  const { optionsPerCustomer, isLoading } = useCategoryOptions()

  if (isLoading) {
    return <StyledSpinner message="Retrieving category details..." />
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
                  disabled={editDigitalPrepDisabled}
                />
              )
            })}
        </Box>
      </ThemeProvider>
    </ScopedCssBaseline>
  )
}

export default CategoryEdit
