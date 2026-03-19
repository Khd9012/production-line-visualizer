package com.scada.virtualizer.repository.mapper;

import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface HealthCheckMapper {
    Integer selectOne();
}
