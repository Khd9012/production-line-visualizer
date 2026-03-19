package com.scada.virtualizer.repository.mapper.equipment;

import com.scada.virtualizer.repository.dto.equipment.MdDeviceStatusDto;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface MdDeviceMapper {

    List<MdDeviceStatusDto> selectDeviceStatusList(List<String> cfgCodeList);

    List<MdDeviceStatusDto> selectDeviceStatusListForMfc();
}
