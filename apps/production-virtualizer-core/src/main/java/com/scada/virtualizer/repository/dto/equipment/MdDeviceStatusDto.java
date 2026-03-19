package com.scada.virtualizer.repository.dto.equipment;

import lombok.Data;

@Data
public class MdDeviceStatusDto {
    private String eqCode;
    private String deviceCode;
    private String deviceType;
    private String deviceName;
    private String deviceStatusAddrCode;
    private String cfgCode;
    private String workId;
}