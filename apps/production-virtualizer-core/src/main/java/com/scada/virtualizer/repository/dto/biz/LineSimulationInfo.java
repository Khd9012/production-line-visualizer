package com.scada.virtualizer.repository.dto.biz;

import com.scada.virtualizer.common.LineSimulationState;
import lombok.Data;

@Data
public class LineSimulationInfo {
    private LineSimulationState state;

    public LineSimulationInfo(LineSimulationState state) {
        this.state = state;
    }
}
