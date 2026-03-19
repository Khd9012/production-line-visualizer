package com.scada.virtualizer.repository.dto.equipment;

import lombok.Data;

@Data
public class MdDeviceCtrl {
    
    String cfgCode;
    String cfgName;
    String cfgModel;
    String ctrlIp;
    int ctrlPort;
    String ctrlRsCom;
    String infType;
    String infModel;
    String dataType;
    String useYN;
    String statusCode;
    String statusDesc;

    boolean pingStatus = true;
}
