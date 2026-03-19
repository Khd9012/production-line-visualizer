package com.scada.virtualizer.repository.dto.equipment;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class BmStatus {
    private String workId;
    private String deviceCode;
    private String status; // 동작상태
    private String statusCode; // 동작상태 코드
    private String processCode; // 작업상태 코드
    private int orderQty;
    private int compQty;
    private int labelCompQty;
    private int mBoxCd;

}
