package com.scada.virtualizer.repository.mapper.equipment;

import com.scada.virtualizer.repository.dto.equipment.DbStoStomst;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface DbStoStomstMapper {
    List<DbStoStomst> selectStoStomstAllList();
}
