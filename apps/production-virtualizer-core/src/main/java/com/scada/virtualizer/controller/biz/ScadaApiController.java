package com.scada.virtualizer.controller.biz;

import com.scada.virtualizer.common.ControlCmdStatus;
import com.scada.virtualizer.config.dataSource.MyBatisDbHealthCheck;
import com.scada.virtualizer.repository.dto.biz.ManualOrderDto;
import com.scada.virtualizer.repository.dto.biz.PtnGroupModDto;
import com.scada.virtualizer.repository.dto.biz.RobotOrderDto;
import com.scada.virtualizer.repository.dto.biz.ScadaPalletPartInfoDto;
import com.scada.virtualizer.repository.dto.equipment.EqRouteOrder;
import com.scada.virtualizer.repository.mapper.biz.MdDeviceErrorNotiMapper;
import com.scada.virtualizer.repository.mapper.biz.ScadaManualOrderMapper;
import com.scada.virtualizer.repository.mapper.biz.ScadaPalletInfoMapper;
import com.scada.virtualizer.repository.mapper.equipment.BcrReadingHistoryMapper;
import com.scada.virtualizer.repository.mapper.equipment.MdDeviceCtrlMapper;
import com.scada.virtualizer.repository.mapper.equipment.RouteMapper;
import com.scada.virtualizer.service.ScadaBizService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import oshi.SystemInfo;
import oshi.hardware.CentralProcessor;
import oshi.hardware.GlobalMemory;
import oshi.software.os.OSFileStore;
import oshi.software.os.OperatingSystem;

import java.net.Socket;
import java.text.DecimalFormat;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "http://localhost:8081")
@RequiredArgsConstructor
@RestController
@Slf4j
@RequestMapping("/scada")
public class ScadaApiController {
    private final BcrReadingHistoryMapper bcrReadingHistoryMapper;
    private final ScadaPalletInfoMapper scadaPalletInfoMapper;
    private final MdDeviceErrorNotiMapper mdDeviceErrorNotiMapper;
    private final MyBatisDbHealthCheck myBatisDbHealthCheck;
    private final MdDeviceCtrlMapper mdDeviceCtrlMapper;
    private final RouteMapper routeMapper;
    private final ScadaManualOrderMapper scadaManualOrderMapper;
    private static final DecimalFormat df2 = new DecimalFormat("#.##");
    private final ScadaBizService scadaBizService;

    public Map<String, String> pickPosition = new HashMap<>() {{
        put("11", "26214");
        put("12", "26314");
        put("13", "26414");
        put("21", "26514");
        put("22", "26614");
        put("23", "26714");
    }};

    @PostMapping("/bcr/history/{limit}/{deviceCode}")
    public ResponseEntity<?> getBcrReadingHistoryList(
            @PathVariable int limit,
            @PathVariable String deviceCode) throws Exception {

        log.info("요청 받은 limit: {}, deviceCd: {}", limit, deviceCode);

        return ResponseEntity.ok(bcrReadingHistoryMapper.selectRecentBcrHistory(deviceCode, limit));
    }

    @PostMapping("/pallet/boxInfo/{workId}")
    public ResponseEntity<?> getPalletBoxInfoList(@PathVariable String workId) throws Exception {

        log.info("요청 받은 팔레트 workId: {}", workId);
        PtnGroupModDto ptnGroupModDto = scadaPalletInfoMapper.selectPalletTypeInfoByStep(workId);
        if (ptnGroupModDto == null)
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();

        if (ptnGroupModDto.getPtnGroup().equals("PLT_P_DATA")) { // 대포장 팔레트
            ScadaPalletPartInfoDto list = scadaPalletInfoMapper.selectPalletPartInfoWithRecipe(ptnGroupModDto.getMasterKey(),ptnGroupModDto.getMasterSeq(), ptnGroupModDto.getOrderNo(), Integer.parseInt(ptnGroupModDto.getPltNo()));

            list.getBoxInfoList().removeIf(c -> c.getLnIputNo() == null && c.getBarcode() == null);
            return ResponseEntity.ok(list);
        } else { // 팔레타이저 적재 팔레트
            ScadaPalletPartInfoDto list = scadaPalletInfoMapper.selectPalletPartInfoWithBox(ptnGroupModDto.getMasterKey(),ptnGroupModDto.getMasterSeq(), ptnGroupModDto.getOrderNo(), Integer.parseInt(ptnGroupModDto.getPltNo()));

            list.getBoxInfoList().removeIf(c -> c.getLnIputNo() == null && c.getBarcode() == null);
            return ResponseEntity.ok(list);
        }

    }

    @PostMapping("/device/error/{clearYn}")
        public ResponseEntity<?> getDeviceErrorNotiList(@PathVariable String clearYn) throws Exception {

        log.info("장비 에러 리스트 요청 받은 clearYn Id: {}", clearYn);
        return ResponseEntity.ok(mdDeviceErrorNotiMapper.selectAllUnclearedErrors(clearYn));
    }

    @PostMapping("/robot/work/list")
    public ResponseEntity<?> getRobotWorkInfoList() throws Exception {

        List<ScadaPalletPartInfoDto> list = scadaPalletInfoMapper.selectRobotProcessWorkList();
        log.info("현재 로봇 작업중인 list : {}",list);
        return ResponseEntity.ok(list);
    }

    @PostMapping("/ping/{ipAddress}/{port}")
    public ResponseEntity<?> pingTestReturn(@PathVariable String ipAddress,@PathVariable int port) throws Exception {
        log.info("ipAddress : {}",ipAddress);
        int timeoutMs = 3000; // 타임아웃 3초
        boolean reachable = false;
        try (Socket socket = new Socket()) {
            socket.connect(new java.net.InetSocketAddress(ipAddress, port), timeoutMs);
            log.info(ipAddress + ":" + port + " 에 TCP 연결 성공!");
            reachable = true;
        } catch (Exception e) {
            log.error(ipAddress + ":" + port + " 에 TCP 연결 실패...");
            reachable = false;
        }
        return ResponseEntity.ok(reachable);
    }

    @PostMapping("/database/status")
    public ResponseEntity<?> getDatabaseStatus() throws Exception {
        return ResponseEntity.ok(myBatisDbHealthCheck.isDatabaseAlive());
    }

    @PostMapping("/plc/status/list")
    public ResponseEntity<?> getPlcStatusList() throws Exception {
        return ResponseEntity.ok(this.mdDeviceCtrlMapper.getMdDeviceCtrlOfCfgModel("2"));
    }

    @PostMapping("/rgv/work/list")
    public ResponseEntity<?> getRgvWorkInfoList() throws Exception {
        List<String> cmdStatusList = new ArrayList<>();
        cmdStatusList.add(ControlCmdStatus.CONFIRM.getCode());
        cmdStatusList.add(ControlCmdStatus.STARTED.getCode());
        return ResponseEntity.ok(this.routeMapper.getEqRouteListByCmdStatusList("PLT", cmdStatusList));
    }

    @PostMapping("/rgv/cancel/{cmdId}")
    public ResponseEntity<?> cancelRgvWorkInfo(@PathVariable String cmdId) throws Exception {
        EqRouteOrder rgvStatus = routeMapper.getEqRouteOrderByCmdId(cmdId);
        if(rgvStatus == null)
            return ResponseEntity.notFound().build();
        if(rgvStatus.getCmdStatus().equals(ControlCmdStatus.STARTED.getCode())) {
            return ResponseEntity
                            .status(HttpStatus.UNPROCESSABLE_ENTITY)
                            .body("해당 RGV 작업 진행중 취소 불가");
        }
        String cmdStatus = ControlCmdStatus.CANCELED.getCode();
        String cmdStatusDesc = ControlCmdStatus.CANCELED.toString();

        return ResponseEntity.ok(this.routeMapper.setEqRouteOrderStatusByCmdId("PLT", cmdId, cmdStatus, cmdStatusDesc, null, null, null, null, null));
    }


    @PostMapping("/server/status")
    public ResponseEntity<Map<String, Object>> getServerStatus() throws InterruptedException {
        SystemInfo si = new SystemInfo();

        // CPU 사용률
        CentralProcessor cpu = si.getHardware().getProcessor();
        long[] prevTicks = cpu.getSystemCpuLoadTicks();
        Thread.sleep(1000);
        double cpuLoad = cpu.getSystemCpuLoadBetweenTicks(prevTicks) * 100;

        // 메모리 사용률
        GlobalMemory memory = si.getHardware().getMemory();
        long totalMem = memory.getTotal();
        long usedMem = totalMem - memory.getAvailable();
        double memUsagePercent = usedMem * 100.0 / totalMem;

        // 디스크 사용률
        OperatingSystem os = si.getOperatingSystem();
        List<OSFileStore> fsArray = os.getFileSystem().getFileStores();

        List<Map<String, Object>> diskList = new ArrayList<>();
        for (OSFileStore fs : fsArray) {
            long totalSpace = fs.getTotalSpace();
            long usedSpace = totalSpace - fs.getUsableSpace();
            double diskUsagePercent = totalSpace == 0 ? 0 : (usedSpace * 100.0 / totalSpace);

            Map<String, Object> diskMap = new HashMap<>();
            diskMap.put("mountPoint", fs.getMount());
            diskMap.put("usagePercent", Double.parseDouble(df2.format(diskUsagePercent)));
            diskList.add(diskMap);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("cpuUsagePercent", Double.parseDouble(df2.format(cpuLoad)));
        result.put("memoryUsagePercent", Double.parseDouble(df2.format(memUsagePercent)));
        result.put("diskUsages", diskList);

        return ResponseEntity.ok(result);
    }

    @PostMapping("/pallet/complete/{roboNo}/{roboLine}")
    public ResponseEntity<?> palletComplete(@PathVariable String roboNo,
                                            @PathVariable String roboLine) {

        RobotOrderDto robotAssignData = scadaPalletInfoMapper.selectAssignedRobotInfo(roboNo, roboLine);
        if (robotAssignData == null) {
            return ResponseEntity.notFound().build();
        } else if (robotAssignData.getMasterKey().isEmpty()
                || robotAssignData.getMasterSeq().isEmpty()
                || robotAssignData.getOrderNo().isEmpty()
                || robotAssignData.getPltNo() == 0
        ) {
            return ResponseEntity
                    .status(HttpStatus.UNPROCESSABLE_ENTITY)
                    .body("할당 데이터 없음 - 완료 처리 불가");
        }
        String deviceCode = this.pickPosition.get(roboNo + roboLine);
        if (deviceCode == null) {
            return ResponseEntity
                    .status(HttpStatus.UNPROCESSABLE_ENTITY)
                    .body("로봇 라인 식별 불가 - 완료 처리 불가");
        }

        scadaPalletInfoMapper.insertEqPlaceOrderPalletComplete(
                robotAssignData.getMasterKey(), robotAssignData.getMasterSeq(),
                robotAssignData.getOrderNo(), robotAssignData.getPltNo(), deviceCode);


        return ResponseEntity.ok(scadaPalletInfoMapper.updatePalletPartComplete(robotAssignData.getMasterKey(), robotAssignData.getMasterSeq(),
                robotAssignData.getOrderNo(), robotAssignData.getPltNo()));
    }

    @PostMapping("/robot/manual/reject/{roboNo}/{roboLine}/{mBoxCd}")
    public ResponseEntity<?> robotManualReject(@PathVariable String mBoxCd,
                                               @PathVariable String roboLine,
                                               @PathVariable String roboNo) {
        String deviceCode = roboNo.equals("1") ? "39007" : "39008";
        String rejectLine = "4"; // 고정값
        String jobType = "101"; // 로봇 리젝
        String targetCode = "RBT"; // RBT

        List<ManualOrderDto> list = scadaManualOrderMapper.selectManualOrderList(targetCode, jobType, ControlCmdStatus.CONFIRM.getCode(), deviceCode, roboLine);

        if (list != null && !list.isEmpty()) {
            return ResponseEntity
                    .status(HttpStatus.UNPROCESSABLE_ENTITY)
                    .body("수행하지 않음 리젝 명령 - 리젝 명령 추가 불가");
        }

        return ResponseEntity.ok(scadaManualOrderMapper.insertManualOrder(
                        ManualOrderDto.builder()
                                .targetCode(targetCode)
                                .deviceCode(deviceCode)
                                .jobType(jobType)
                                .data1(roboNo)
                                .data2(roboLine)
                                .data3(rejectLine)
                                .data4(mBoxCd)
                                .cmdStatus(ControlCmdStatus.CONFIRM.getCode())
                                .cmdStatusDesc(ControlCmdStatus.CONFIRM.toString())
                                .build()));
    }

}
