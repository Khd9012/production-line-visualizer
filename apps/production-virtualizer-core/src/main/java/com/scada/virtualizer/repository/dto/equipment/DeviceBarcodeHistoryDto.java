package com.scada.virtualizer.repository.dto.equipment;

import lombok.Builder;
import lombok.Data;

import java.util.Date;

@Data
@Builder
public class DeviceBarcodeHistoryDto {

    private String deviceCode;
    private String deviceName;
    private String deviceType;
    private String barcode;
    private String workId;
    private Date createDate;
}