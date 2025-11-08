import React from 'react';
import CIcon from '@coreui/icons-react';
import { CHeaderBrand } from '@coreui/react';

const LogoPrint = (props: any) => {
    return (
        <div className="print-only-display text-center">
      
                <CIcon
                    name="logo"
                    alt="Logo"
                    className="c-sidebar-brand-full"
                    height={40}
                    src="dark-horizontal.png"
                />

        </div>
    )
}

export default LogoPrint