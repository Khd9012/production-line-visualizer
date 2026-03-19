package com.scada.virtualizer.repository.dto.biz;

import lombok.Data;

@Data
public class ScadaPalletBoxInfoDto {
    private String lnIputNo;
    private String ptnGroup;
    private String partNo;
    private String barcode;
    private String completeYn;
}
