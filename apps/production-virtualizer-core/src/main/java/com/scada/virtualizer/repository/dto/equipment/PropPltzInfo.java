package com.scada.virtualizer.repository.dto.equipment;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

@Builder
@Data
public class PropPltzInfo {

    String workId;
    int robotNo;
    int loadingLine;
    int unLoadingLine;
    int mBoxCd;

    int unLoadingPosition;

    String loadingLine1WorkId;
    String loadingLine2WorkId;
    String loadingLine3WorkId;

    int heightCode;
    int totalOrderCount;

    int statusCode;
    int motionCode;
    int errorCode;

    int totalRt1Count;
    int totalRt2Count;
    int totalRt3Count;
    int totalRt4Count;

    boolean ready;

    Map<Integer,  Integer> decDataList;
}
