package com.scada.virtualizer.repository.dto.biz;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MdDeviceErrorCodeInfoDto {
    private String cfgCodeType;      // CFG_CODE_TYPE (nvarchar(10))
    private String errorCode;        // ERROR_CODE (nvarchar(10))
    private String deviceType;       // DEVICE_TYPE (nvarchar(10))
    private String errorDesc;        // ERROR_DESC (nvarchar(100))
    private int errorLevel;        // ERROR_LEVEL (smallint)
    private String note;             // NOTE (varchar(MAX))
    private Date createDate; // CREATE_DATE (datetime)
    private String createId;         // CREATE_ID (nvarchar(20))
    private Date updateDate; // UPDATE_DATE (datetime)
    private String updateId;         // UPDATE_ID (nvarchar(20))
}