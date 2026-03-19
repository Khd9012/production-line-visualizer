package com.scada.virtualizer.repository.mapper.equipment;

import com.scada.virtualizer.repository.dto.equipment.MdDeviceCtrl;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;


@Mapper
public interface MdDeviceCtrlMapper {

    /** Config-Code 기준 장비 Inf 정보 조회 */
    public List<MdDeviceCtrl> getMdDeviceCtrlOfCfgCode(String cfgCode);

    public List<MdDeviceCtrl> getMdDeviceCtrlOfCfgModel(String cfgModel);

    public List<MdDeviceCtrl> getMdDeviceCtrlOfEqCode(String eqCode, String deviceType);

    /** Operation 기준 장비 Inf 정보 조회 */
    public List<MdDeviceCtrl> getMdDeviceCtrlOp(String eqCode);

    /** Control 기준 장비 Inf 정보 조회 */
    //public List<MdDeviceCtrl> getMdDeviceCtrlEq(String cfgModel);

    /** 인터페이스 상태 등록 */
    public int setMdDeviceCtrlStatus(String cfgCode, String statusCode, String statusDesc);

}
