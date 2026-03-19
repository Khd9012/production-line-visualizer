package com.scada.virtualizer.repository.dto.equipment;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class EqApmStatus {
    private String workId;
    private String layer;
    private String orderQty;
    private String completeQty;
    private String process;
    private String placeProcess;
    private String status;
    private String inputStatus;
}
