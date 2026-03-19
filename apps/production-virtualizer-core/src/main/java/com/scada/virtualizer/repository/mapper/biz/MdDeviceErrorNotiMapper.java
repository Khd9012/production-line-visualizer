package com.scada.virtualizer.repository.mapper.biz;

import com.scada.virtualizer.repository.dto.biz.MdDeviceErrorCodeInfoDto;
import com.scada.virtualizer.repository.dto.biz.MdDeviceErrorNotiDto;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface MdDeviceErrorNotiMapper {
    int insertDeviceErrorNotification(MdDeviceErrorNotiDto dto);

    int updateDeviceErrorClear(@Param("eqCode") String eqCode, @Param("deviceCode") String deviceCode);

    List<MdDeviceErrorNotiDto> selectAllUnclearedErrors(String clearYn);

    List<MdDeviceErrorCodeInfoDto> selectMdDeviceErrorCodeInfoList();
}
