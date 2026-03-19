package com.scada.virtualizer.repository.mapper.equipment;


import com.scada.virtualizer.repository.dto.equipment.EqRouteOrder;
import com.scada.virtualizer.repository.dto.equipment.EqRouteOrderAddLboxInfo;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface RouteMapper {

    List<EqRouteOrderAddLboxInfo> getEqRouteListByCmdStatusList(String eqCode, List<String> cmdStatusList);

    EqRouteOrder getEqRouteOrderByCmdId(String cmdId);  /** 제어 상태 등록 */

    int setEqRouteOrderStatusByCmdId(String eqCode, String cmdId, String cmdStatus, String cmdStatusDesc, String cEqCode, String cDeviceCode, String statusCode, String statusDesc, String closeYn);

}
