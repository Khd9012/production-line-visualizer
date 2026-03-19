package com.scada.virtualizer.repository.dto.biz;

import lombok.Builder;
import lombok.Data;

import java.util.Date;

@Data
@Builder
public class ManualOrderDto {
    private String targetCode;      // TARGET_CODE
    private String cmdId;           // CMD_ID
    private String jobType;         // JOB_TYPE
    private String cmdStatus;       // CMD_STATUS
    private String cmdStatusDesc;   // CMD_STATUS_DESC
    private String deviceCode;      // DEVICE_CODE
    private String data1;           // DATA1
    private String data2;           // DATA2
    private String data3;           // DATA3
    private String data4;           // DATA4
    private String data5;           // DATA5
    private String data6;           // DATA6
    private String data7;           // DATA7
    private String data8;           // DATA8
    private String data9;           // DATA9
    private String data10;          // DATA10
    private Date createDate;        // CREATE_DATE
    private Date updateDate;        // UPDATE_DATE
}
