package com.scada.virtualizer.repository.dto.equipment;

import lombok.Data;

@Data
public class EqRouteOrder {

    String eqCode;
    String eqType;
    String cmdId;

    String cmdStatus;
    String cmdStatusDesc;

    String workIdx;
    String workId;

    String barcode;

    String fEqCode;
    String fDeviceCode;

    String tEqCode;
    String tDeviceCode;

    String fLinkEqCode;
    String fLinkDeviceCode;

    String parentEqCode;
    String parentDeviceCode;
    
    String cEqCode;
    String cDeviceCode;

    String loadingYn;
    String unLoadingYn;

    String statusCode;
    String statusDesc;

    String closeYn;

    String orderDate;
    int orderSeq;
    String opCode;
}
