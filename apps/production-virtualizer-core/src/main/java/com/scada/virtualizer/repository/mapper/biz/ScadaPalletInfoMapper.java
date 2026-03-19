package com.scada.virtualizer.repository.mapper.biz;

import com.scada.virtualizer.repository.dto.biz.PtnGroupModDto;
import com.scada.virtualizer.repository.dto.biz.RobotOrderDto;
import com.scada.virtualizer.repository.dto.biz.ScadaPalletPartInfoDto;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ScadaPalletInfoMapper {
    // 플라스틱 박스 팔레트 정보
    ScadaPalletPartInfoDto selectPalletPartInfoWithBox(
            @Param("masterKey") String masterKey,
            @Param("masterSeq") String masterSeq,
            @Param("orderNo") String orderNo,
            @Param("pltNo") int pltNo);
    
    // 대박스 팔레트 정보
    ScadaPalletPartInfoDto selectPalletPartInfoWithRecipe(
            @Param("masterKey") String masterKey,
            @Param("masterSeq") String masterSeq,
            @Param("orderNo") String orderNo,
            @Param("pltNo") int pltNo);

    List<ScadaPalletPartInfoDto> selectRobotProcessWorkList();

    RobotOrderDto selectAssignedRobotInfo(@Param("roboNo") String roboNo, @Param("roboLine") String roboLine);

    /**
     * EQ_PLACE_ORDER에 WCS 완료 데이터를 삽입합니다.
     */
    int insertEqPlaceOrderPalletComplete(
            @Param("masterKey") String masterKey,
            @Param("masterSeq") String masterSeq,
            @Param("orderNo") String orderNo,
            @Param("pltNo") int pltNo,
            @Param("deviceCode") String deviceCode
    );

    /**
     * DB_ORDER_PALLET_PART_INFO의 박스 완료 수량을 갱신합니다.
     */
    int updatePalletPartComplete(
            @Param("masterKey") String masterKey,
            @Param("masterSeq") String masterSeq,
            @Param("orderNo") String orderNo,
            @Param("pltNo") int pltNo
    );

    // 팔레트 타입 구분
    PtnGroupModDto selectPalletTypeInfoByStep(@Param("workId") String workId);
}
