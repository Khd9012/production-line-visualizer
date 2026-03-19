package com.scada.virtualizer.repository.dto.equipment;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MdBcrReadingHistory {
    private String deviceAreaCode;
    private String barcode;
    private String workId;
}
