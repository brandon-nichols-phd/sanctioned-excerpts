import React from 'react';

const TooltipItem = (props: any) => {

    return (
        
        <div className="tooltip-item-container">
            <div className="tooltip-item-container-header">Shift Time</div>
            <div className="tooltip-item-container-body">{props.startTime} - {props.endTime}</div>
        </div>

    )
}

export default TooltipItem