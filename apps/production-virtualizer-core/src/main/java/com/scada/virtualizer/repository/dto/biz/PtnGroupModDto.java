package com.scada.virtualizer.repository.dto.biz;

import lombok.Data;

import java.util.Date;

@Data
public class PtnGroupModDto {
    private String workId;
    private String ptnGroup;
    private String masterKey;
    private String masterSeq;  // 문자형으로 수정
    private String orderNo;
    private String pltNo;
    private Date modDtm;
}