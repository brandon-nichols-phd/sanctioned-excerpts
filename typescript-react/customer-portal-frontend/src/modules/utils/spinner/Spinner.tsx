import React from 'react';
import { CRow, CSpinner } from '@coreui/react';

const Spinner = (props: any) => {
    return (
        <CRow className="justify-content-center">
            <div style={{ padding: '100px 50px' }}>
                <CSpinner />
            </div>
        </CRow>
    )
}

export default Spinner