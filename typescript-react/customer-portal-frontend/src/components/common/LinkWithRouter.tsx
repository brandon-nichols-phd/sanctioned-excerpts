import { Link as MuiLink, LinkProps as MuiLinkProps } from '@mui/material'
import { Link as RouterLink, LinkProps as RouterLinkProps } from 'react-router-dom'
import React from 'react'

// Extend MUI's LinkProps but override 'component' to be handled internally
type LinkWithRouterProps = MuiLinkProps &
  RouterLinkProps & {
    external?: boolean // Allow optional external flag for non-router links
  }

const LinkWithRouter = React.forwardRef<HTMLAnchorElement, LinkWithRouterProps>(
  ({ to, href, external = false, children, ...props }, ref) => {
    // External links use <a href="..."> directly
    if (external || (typeof to === 'string' && to.startsWith('http'))) {
      return (
        <MuiLink ref={ref} href={href || (to as string)} target="_blank" rel="noopener noreferrer" {...props}>
          {children}
        </MuiLink>
      )
    }

    // Internal links use React Router <Link>
    return (
      <MuiLink ref={ref} component={RouterLink} to={to} {...props}>
        {children}
      </MuiLink>
    )
  }
)

LinkWithRouter.displayName = 'LinkWithRouter'

export default LinkWithRouter
