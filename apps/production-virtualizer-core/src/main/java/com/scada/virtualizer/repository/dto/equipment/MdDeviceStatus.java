package com.scada.virtualizer.repository.dto.equipment;

import lombok.Builder;
import lombok.Data;

import java.util.Date;
import java.util.Map;


@Builder
@Data
public class MdDeviceStatus {
    String areaType;
    String deviceCode;
    String deviceType;
    String deviceName;
    String ctrlStatus;
    String status;
    String statusCode;
    Integer errorLevel;
    String statusDesc;
    String workId;
    Date triggeredAt;

    Map<String,String> detail;
}
