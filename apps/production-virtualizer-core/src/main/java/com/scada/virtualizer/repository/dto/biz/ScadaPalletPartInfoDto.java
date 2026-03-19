package com.scada.virtualizer.repository.dto.biz;

import lombok.Data;

import java.util.List;

@Data
public class ScadaPalletPartInfoDto {
    private String masterKey;
    private String masterSeq;
    private String orderNo;
    private String ptnGroup;
    private String pltNo;
    private int boxOrderQty;
    private int boxRoboQty;
    private String remarks;
    private String caseNo;
    private String roboNo;
    private String roboLine;

    private List<ScadaPalletBoxInfoDto> boxInfoList;
}
