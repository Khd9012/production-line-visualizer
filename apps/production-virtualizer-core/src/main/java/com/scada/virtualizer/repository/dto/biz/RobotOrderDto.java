package com.scada.virtualizer.repository.dto.biz;

import lombok.Builder;
import lombok.Data;

@Builder
@Data
public class RobotOrderDto {
    private int roboNo;         // ROBO_NO
    private String roboLine;    // ROBO_LINE
    private String masterKey;   // MASTER_KEY
    private String masterSeq;   // MASTER_SEQ (예: "0001")
    private String orderNo;     // ORDER_NO
    private Integer pltNo;       // PLT_NO
}
