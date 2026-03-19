package com.scada.virtualizer.repository.mapper.equipment;

import com.scada.virtualizer.repository.dto.equipment.DeviceBarcodeHistoryDto;
import com.scada.virtualizer.repository.dto.equipment.MdBcrReadingHistory;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface BcrReadingHistoryMapper {

    void insertBcrReadingHistory(MdBcrReadingHistory dto);

    List<DeviceBarcodeHistoryDto> selectRecentBcrHistory(@Param("deviceCode") String deviceCode, @Param("limit") int limit);
}
