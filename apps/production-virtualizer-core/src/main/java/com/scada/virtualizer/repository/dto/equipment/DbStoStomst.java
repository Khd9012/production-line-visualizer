package com.scada.virtualizer.repository.dto.equipment;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DbStoStomst {
   String whid;
   String loct;
   String rackSts;
   String stockSts;
}
