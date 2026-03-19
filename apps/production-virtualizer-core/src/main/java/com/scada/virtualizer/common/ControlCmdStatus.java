package com.scada.virtualizer.common;

public enum ControlCmdStatus {
    READY("0"),           // 대기
    CONFIRM("1"),         // 예약
    STARTED("2"),         // 지시전송
    PROCEEDING("3"),      // 작업시작
    COMPLETED("4"),       // 완료
    CANCELED("5");        // 취소


    private String code;
    ControlCmdStatus(String code){
        this.code = code;
    }

    public String getCode(){
        return this.code;
    }

    public static ControlCmdStatus getControlStatusEnum(String code){
        for(ControlCmdStatus oValue : values()){
            if(oValue.getCode().equals(code)){
                return oValue;
            }
        }

        return null;
    }
}
