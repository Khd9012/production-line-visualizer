package com.scada.virtualizer.repository.mapper.biz;

import com.scada.virtualizer.repository.dto.biz.ManualOrderDto;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ScadaManualOrderMapper {

    int insertManualOrder(ManualOrderDto manualOrderDto);

    List<ManualOrderDto> selectManualOrderList(
            @Param("targetCode") String targetCode
            , @Param("jobType") String jobType
            , @Param("cmdStatus") String cmdStatus
            , @Param("deviceCode") String deviceCode
            , @Param("data2") String data2);

}
