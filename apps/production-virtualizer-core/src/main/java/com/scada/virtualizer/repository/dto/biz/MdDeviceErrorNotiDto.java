package com.scada.virtualizer.repository.dto.biz;

import lombok.Builder;
import lombok.Data;

import java.util.Date;

@Data
@Builder
public class MdDeviceErrorNotiDto {
    private Integer seq;
    private String eqCode;
    private String deviceCode;
    private String deviceType;
    private String deviceName;
    private String errorCode;
    private String errorDesc;
    private String clearYn;
    private Date createDt;
    private Date updateDt;
}