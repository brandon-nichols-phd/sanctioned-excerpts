import React from 'react';

const Iframe = (props: any) => {
    return (
        <div>          
            <iframe src={props.src} style={{ display: 'block', height: '70vh', minHeight: '300px', width: '100%' }} />         
        </div>
    )
}

export default Iframe