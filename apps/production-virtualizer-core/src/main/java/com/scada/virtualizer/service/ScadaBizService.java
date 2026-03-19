package com.scada.virtualizer.service;

import com.scada.virtualizer.common.LineSimulationState;
import com.scada.virtualizer.repository.dto.biz.LineSimulationInfo;
import com.scada.virtualizer.repository.dto.biz.MdDeviceErrorCodeInfoDto;
import com.scada.virtualizer.repository.dto.biz.MdDeviceErrorNotiDto;
import com.scada.virtualizer.repository.dto.equipment.*;
import com.scada.virtualizer.repository.mapper.biz.MdDeviceErrorNotiMapper;
import com.scada.virtualizer.repository.mapper.equipment.DbStoStomstMapper;
import com.scada.virtualizer.repository.mapper.equipment.MdDeviceMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
@Slf4j
public class ScadaBizService {

    @Autowired
    @Lazy
    private ScadaBizService self;

    private final MdDeviceMapper mdDeviceMapper;
    private final List<MdDeviceStatus> mdDeviceStatusList;
    private final MdDeviceErrorNotiMapper mdDeviceErrorNotiMapper;
    private final List<MdDeviceErrorCodeInfoDto>  errorCodeInfoList;
    private final DbStoStomstMapper dbStoStomstMapper;

    private final ScadaMessagePushService scadaMessagePushService;

    private final List<MdDeviceErrorNotiDto> mdDeviceErrorNotiDtolist;

    private final List<String> completeList;
    private final List<PropPltzInfo> propPltzInfos;
    private final Map<String, BmStatus> bmStatusMap;
    private final List<String> bmDeviceCodeList;

    private final LinkedHashMap<String,String> plateMotion;
    private EqApmStatus eqApmStatus;
    // 각 라인의 현재 시뮬레이션 상태를 추적 (채우는 중, 비우는 중, 완료 등)
    // Map<라인키, 라인상태정보>
    private final ConcurrentHashMap<String, LineSimulationInfo> lineSimulationStates;

    // 각 라인의 트랙 번호를 담는 Map (고정형)
    private final Map<String, List<String>> apmBufferCvList;

    public ScadaBizService(MdDeviceMapper mdDeviceMapper, MdDeviceErrorNotiMapper mdDeviceErrorNotiMapper, ScadaMessagePushService scadaMessagePushService, List<String> completeList, DbStoStomstMapper dbStoStomstMapper) {
        this.mdDeviceMapper = mdDeviceMapper;
        this.mdDeviceErrorNotiMapper = mdDeviceErrorNotiMapper;
        this.scadaMessagePushService = scadaMessagePushService;
        this.dbStoStomstMapper = dbStoStomstMapper;

        this.completeList = new ArrayList<>(List.of("00e8","3aa5","00ed"));// 완료되어 순환할 정보
        this.mdDeviceStatusList = new ArrayList<>();
        this.errorCodeInfoList = mdDeviceErrorNotiMapper.selectMdDeviceErrorCodeInfoList();

        this.bmStatusMap = new HashMap<>();
        this.bmDeviceCodeList = new ArrayList<>(List.of("1","2","3"));

        this.mdDeviceErrorNotiDtolist = mdDeviceErrorNotiMapper.selectAllUnclearedErrors("N");

        this.apmBufferCvList = new LinkedHashMap<>();
        // 첫 번째 라인: 24301 ~ 24309
        this.apmBufferCvList.put("1", List.of("24301", "24302", "24303", "24304", "24305", "24306", "24307", "24308", "24309"));
        // 두 번째 라인: 24401 ~ 24409
        this.apmBufferCvList.put("2", List.of("24401", "24402", "24403", "24404", "24405", "24406", "24407", "24408", "24409"));
        // 세 번째 라인: 24501 ~ 24509
        this.apmBufferCvList.put("3", List.of("24501", "24502", "24503", "24504", "24505", "24506", "24507", "24508", "24509"));
        // 네 번째 라인: 24601 ~ 24609
        this.apmBufferCvList.put("4", List.of("24601", "24602", "24603", "24604", "24605", "24606", "24607", "24608", "24609"));
        // 다섯 번째 라인: 24701 ~ 24709
        this.apmBufferCvList.put("5", List.of("24701", "24702", "24703", "24704", "24705", "24706", "24707", "24708", "24709"));
        // 여섯 번째 라인: 24801 ~ 24809
        this.apmBufferCvList.put("6", List.of("24801", "24802", "24803", "24804", "24805", "24806", "24807", "24808", "24809"));
        // 일곱 번째 라인: 24901 ~ 24909
        this.apmBufferCvList.put("7", List.of("24901", "24902", "24903", "24904", "24905", "24906", "24907", "24908", "24909"));
        // 마지막 라인 : 검증 컨베이어
        this.apmBufferCvList.put("8", List.of("24926","24927", "24928", "24929", "24930", "24931", "24932", "24933", "24934"));

        this.plateMotion = new LinkedHashMap<>();
        this.plateMotion.put("41003", "0000");
        this.plateMotion.put("41004", "0000");
        this.plateMotion.put("41005", "0000");
        this.plateMotion.put("41006", "0000");
        this.plateMotion.put("41007", "0000");
        this.plateMotion.put("41010", "0000");
        this.plateMotion.put("41011", "0000");
        this.plateMotion.put("41012", "0000");
        this.plateMotion.put("41013", "0000");
        this.plateMotion.put("41014", "0000");
        this.plateMotion.put("41015", "0000");
        this.plateMotion.put("41016", "0000");
        this.plateMotion.put("41017", "0000");
        this.plateMotion.put("41018", "0000");
        this.plateMotion.put("41019", "0000");
        this.plateMotion.put("41020", "0000");
        this.plateMotion.put("41021", "0000");

        this.propPltzInfos = new ArrayList<>();
        this.propPltzInfos.add(PropPltzInfo.builder().robotNo(1).workId("0000").build());
        this.propPltzInfos.add(PropPltzInfo.builder().robotNo(2).workId("0000").build());
        this.lineSimulationStates = new ConcurrentHashMap<>(); // ConcurrentHashMap 유지 권장

        this.initializeAllTracks();

        this.eqApmStatus = EqApmStatus
                .builder().workId("0")
                .inputStatus("0")
                .layer("0")
                .status("0")
                .orderQty("0")
                .placeProcess("0")
                .process("0")
                .completeQty("0")
                .build();
    }

    private void initializeAllTracks() {
        // 기존 mdDeviceStatusList를 스레드 안전하게 초기화
        for (Map.Entry<String, List<String>> entry : apmBufferCvList.entrySet()) {
            String lineKey = entry.getKey();
            List<String> tracks = entry.getValue();
            mdDeviceStatusList.removeIf(status -> tracks.contains(status.getDeviceCode()));
            for (String trackCode : tracks) {
                MdDeviceStatus initialStatus = MdDeviceStatus.builder()
                        .areaType("L")
                        .deviceCode(trackCode)
                        .deviceType("CV")
                        .deviceName("Track " + trackCode)
                        .ctrlStatus("0") // 정상
                        .status("0")     // 비어있음 (0:비어있음, 1:작업중)
                        .statusCode("0000") // 정상 코드
                        .errorLevel(0)
                        .statusDesc("비어있음")
                        .workId("0000") // 빈 작번
                        .build();
                mdDeviceStatusList.add(initialStatus); // 리스트에 추가
            }
            // 각 라인의 초기 상태를 IDLE로 설정하여 @Scheduled가 시작하도록 함
            lineSimulationStates.put(lineKey, new LineSimulationInfo(LineSimulationState.IDLE));
        }
        printCurrentAllLinesStatus();
    }

    private boolean rareChance(int denominator) {
        return ThreadLocalRandom.current().nextInt(denominator) == 0;
    }

    private int randomBetween(int minInclusive, int maxInclusive) {
        return ThreadLocalRandom.current().nextInt(minInclusive, maxInclusive + 1);
    }

    private int pickRobotOrderCount() {
        List<Integer> candidates = List.of(36, 48, 60, 72);
        return candidates.get(ThreadLocalRandom.current().nextInt(candidates.size()));
    }

    private int pickBmOrderCount() {
        return randomBetween(42, 68);
    }

    private int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }


    public void lPlc01Process(){
        List<String> cfgCodeList = new ArrayList<>(List.of("LPLC_01O", "LPLC_01C"));
        List<MdDeviceStatusDto> mdDeviceStatusDtos = mdDeviceMapper.selectDeviceStatusList(cfgCodeList);
        List<MdDeviceStatus> newMdDeviceStatusList = new ArrayList<>();
        Random random = new Random();
        for (MdDeviceStatusDto dto : mdDeviceStatusDtos) {
            /*
             +0	제어 모드
             +1	동작 상태
             +2	동작 상태 코드
             +3	제어코드
             +4	설비타입에 따라 제어 모션 정보
            */
            String workId = "0000";
            if (random.nextInt(20) == 0) { // 0~19 중 0이면 5% 확률
                workId = "0001";
            }

            MdDeviceStatus oldMdDeviceStatus = this.mdDeviceStatusList.stream().filter(s -> s.getDeviceCode()
                                .equals(dto.getDeviceCode())).findFirst().orElse(null);
            MdDeviceStatus newDeviceStatus;

            if(dto.getEqCode().equals("SDR")){
                newDeviceStatus = MdDeviceStatus.builder()
                        .areaType("L")
                        .deviceCode(dto.getDeviceCode())
                        .deviceType(dto.getDeviceType())
                        .deviceName(dto.getDeviceName())
                        .status(random.nextInt(10) == 0 ? "1" : "0") // 닫힘(0), 열림(1)
                        .ctrlStatus(random.nextInt(10) == 0 ? "1" : "0") // 정상(0), 비상정지(1)
                        .build();

                // 도어 상태 유지를 위한 로직
                if (oldMdDeviceStatus != null && oldMdDeviceStatus.getStatus().equals("2") && random.nextInt(10) < 6) {
                    newDeviceStatus = oldMdDeviceStatus;
                }
            }else{
                String ctrlStatus = "1";
                String status = workId.equals("0001") ? "1" : random.nextInt(600) == 0 ? "2" : "0";
                String statusCode = "0001"; // 데이터 없음
                newDeviceStatus = MdDeviceStatus.builder()
                        .areaType("L")
                        .deviceCode(dto.getDeviceCode())
                        .deviceType(dto.getDeviceType())
                        .ctrlStatus(ctrlStatus)      // 제어 모드
                        .deviceName(dto.getDeviceName()) // 장비 명칭
                        .status(status)        // 동작 상태
                        .statusCode(statusCode)    // 동작 상태 코드
                        .workId(workId)        // 작번
                        .build();

                // 오류 유지를 위한 로그 ... 50 정도는 유지하기
                if (oldMdDeviceStatus != null && oldMdDeviceStatus.getStatus().equals("2") && random.nextInt(10) < 9) {
                    newDeviceStatus = oldMdDeviceStatus;
                }

                if (oldMdDeviceStatus != null
                        && isSameStatus(oldMdDeviceStatus, newDeviceStatus))
                    continue;

                // 에러 시작!
                if (status.equals("2")) {
                    MdDeviceErrorCodeInfoDto errorCodeInfoDto = this.errorCodeInfoList.stream()
                            .filter(ec -> ec.getErrorCode().equals(statusCode)
                                    && ec.getDeviceType().equals(dto.getDeviceType())
                                    && ec.getCfgCodeType().equals(
                                    dto.getCfgCode().length() > 4
                                            ? dto.getCfgCode().substring(0, 4) : dto.getCfgCode())).findFirst().orElse(null);

                    String statusDesc = errorCodeInfoDto != null ? errorCodeInfoDto.getErrorDesc() : "식별되지 않은 에러";
                    Integer errorLevel = errorCodeInfoDto != null ? errorCodeInfoDto.getErrorLevel() : 0;

                    mdDeviceErrorNotiMapper.insertDeviceErrorNotification(
                            MdDeviceErrorNotiDto
                                    .builder()
                                    .deviceCode(dto.getDeviceCode())
                                    .deviceName(dto.getDeviceName())
                                    .deviceType(dto.getDeviceType())
                                    .eqCode(dto.getEqCode())
                                    .errorCode(statusCode)
                                    .errorDesc(statusDesc)
                                    .build()
                    );

                    newDeviceStatus.setErrorLevel(errorLevel);
                    newDeviceStatus.setStatusDesc(statusDesc);
                }

                MdDeviceErrorNotiDto unclearTarget = this.mdDeviceErrorNotiDtolist.stream().filter(ec -> ec.getDeviceCode().equals(dto.getDeviceCode())).findFirst().orElse(null);
                // 에러종료
                if ((!status.equals("2")
                        && oldMdDeviceStatus != null
                        && oldMdDeviceStatus.getStatus().equals("2")) || unclearTarget != null) {
                    mdDeviceErrorNotiMapper.updateDeviceErrorClear(dto.getEqCode(), dto.getDeviceCode());
                }
            }

            newDeviceStatus.setTriggeredAt(new Date());

            newMdDeviceStatusList.add(newDeviceStatus);
        }

        if (!newMdDeviceStatusList.isEmpty())
            scadaMessagePushService.reportCtrlLoading(newMdDeviceStatusList);

        // 비교하여 메모리에 업데이트 처리
        Map<String, MdDeviceStatus> oldMap = mdDeviceStatusList.stream()
                .collect(Collectors.toMap(MdDeviceStatus::getDeviceCode, d -> d));

        for (MdDeviceStatus newStatus : newMdDeviceStatusList) {
            MdDeviceStatus oldStatus = oldMap.get(newStatus.getDeviceCode());

            if (oldStatus == null) {
                // 기존에 없는 경우 → 추가
                mdDeviceStatusList.add(newStatus);
            } else if (!isSameStatus(oldStatus, newStatus)) {
                // 값이 다르면 → 업데이트
                mdDeviceStatusList.remove(oldStatus);
                mdDeviceStatusList.add(newStatus);
            }
        }
    }

    public void lPlc02Process() {
        List<String> cfgCodeList = new ArrayList<>(List.of("LPLC_02O", "LPLC_02C"));
        List<MdDeviceStatusDto> mdDeviceStatusDtos = mdDeviceMapper.selectDeviceStatusList(cfgCodeList);
        List<MdDeviceStatus> newMdDeviceStatusList = new ArrayList<>();

        Random random = new Random();
        for (MdDeviceStatusDto dto : mdDeviceStatusDtos) {
                /*
                 +0	제어 모드
                 +1	동작 상태
                 +2	동작 상태 코드
                 +3	제어코드
                 +4	설비타입에 따라 제어 모션 정보
                */
            String workId = "0000";
            if (random.nextInt(20) == 0) { // 0~19 중 0이면 5% 확률
                workId = "0001";
            }

            // 대포장 버퍼 컨베이어 따로 프로그래밍 처리
            if(containsTrackNumber(dto.getDeviceCode()))
                continue;

            MdDeviceStatus oldMdDeviceStatus = this.mdDeviceStatusList.stream().filter(s -> s.getDeviceCode()
                    .equals(dto.getDeviceCode())).findFirst().orElse(null);

            String ctrlStatus = "1";
            String status = workId.equals("0001") ? "1" : random.nextInt(700) == 0 ? "2" : "0";
            String statusCode = "0001"; // 데이터 없음
            MdDeviceStatus newDeviceStatus = MdDeviceStatus.builder()
                    .areaType("L")
                    .deviceCode(dto.getDeviceCode())
                    .deviceType(dto.getDeviceType())
                    .ctrlStatus(ctrlStatus)      // 제어 모드
                    .deviceName(dto.getDeviceName()) // 장비 명칭
                    .status(status)        // 동작 상태
                    .statusCode(statusCode)    // 동작 상태 코드
                    .workId(workId)        // 작번
                    .build();

            // 오류 유지를 위한 로그 ... 50 정도는 유지하기
            if (oldMdDeviceStatus != null && oldMdDeviceStatus.getStatus().equals("2") && random.nextInt(10) < 9) {
                newDeviceStatus = oldMdDeviceStatus;
            }

            if (oldMdDeviceStatus != null
                    && isSameStatus(oldMdDeviceStatus, newDeviceStatus))
                continue;

            // 에러 시작!
            if (status.equals("2")) {
                MdDeviceErrorCodeInfoDto errorCodeInfoDto = this.errorCodeInfoList.stream()
                        .filter(ec -> ec.getErrorCode().equals(statusCode)
                                && ec.getDeviceType().equals(dto.getDeviceType())
                                && ec.getCfgCodeType().equals(
                                dto.getCfgCode().length() > 4
                                        ? dto.getCfgCode().substring(0, 4) : dto.getCfgCode())).findFirst().orElse(null);

                String statusDesc = errorCodeInfoDto != null ? errorCodeInfoDto.getErrorDesc() : "식별되지 않은 에러";
                Integer errorLevel = errorCodeInfoDto != null ? errorCodeInfoDto.getErrorLevel() : 0;

                mdDeviceErrorNotiMapper.insertDeviceErrorNotification(
                        MdDeviceErrorNotiDto
                                .builder()
                                .deviceCode(dto.getDeviceCode())
                                .deviceName(dto.getDeviceName())
                                .deviceType(dto.getDeviceType())
                                .eqCode(dto.getEqCode())
                                .errorCode(statusCode)
                                .errorDesc(statusDesc)
                                .build()
                );

                newDeviceStatus.setErrorLevel(errorLevel);
                newDeviceStatus.setStatusDesc(statusDesc);
            }

            MdDeviceErrorNotiDto unclearTarget = this.mdDeviceErrorNotiDtolist.stream().filter(ec -> ec.getDeviceCode().equals(dto.getDeviceCode())).findFirst().orElse(null);
            // 에러종료
            if ((!status.equals("2")
                    && oldMdDeviceStatus != null
                    && oldMdDeviceStatus.getStatus().equals("2")) || unclearTarget != null) {
                mdDeviceErrorNotiMapper.updateDeviceErrorClear(dto.getEqCode(), dto.getDeviceCode());
            }

            newDeviceStatus.setTriggeredAt(new Date());

            newMdDeviceStatusList.add(newDeviceStatus);
        }

        if (!newMdDeviceStatusList.isEmpty())
            scadaMessagePushService.reportCtrlLoading(newMdDeviceStatusList);

        // 비교하여 메모리에 업데이트 처리
        Map<String, MdDeviceStatus> oldMap = mdDeviceStatusList.stream()
                .collect(Collectors.toMap(MdDeviceStatus::getDeviceCode, d -> d));

        for (MdDeviceStatus newStatus : newMdDeviceStatusList) {
            MdDeviceStatus oldStatus = oldMap.get(newStatus.getDeviceCode());

            if (oldStatus == null) {
                // 기존에 없는 경우 → 추가
                mdDeviceStatusList.add(newStatus);
            } else if (!isSameStatus(oldStatus, newStatus)) {
                // 값이 다르면 → 업데이트
                mdDeviceStatusList.remove(oldStatus);
                mdDeviceStatusList.add(newStatus);
            }
        }
    }

    public void lPlc03Process() {
        List<String> cfgCodeList = new ArrayList<>(List.of("LPLC_03O", "LPLC_03C"));
        List<MdDeviceStatusDto> mdDeviceStatusDtos = mdDeviceMapper.selectDeviceStatusList(cfgCodeList);
        List<MdDeviceStatus> newMdDeviceStatusList = new ArrayList<>();
        Random random = new Random();
        for (MdDeviceStatusDto dto : mdDeviceStatusDtos) {
                    /*
                     +0	제어 모드
                     +1	동작 상태
                     +2	동작 상태 코드
                     +3	제어코드
                     +4	설비타입에 따라 제어 모션 정보
                    */
            String workId = "0000";
            if (random.nextInt(20) == 0) { // 0~19 중 0이면 5% 확률
                workId = "0001";
            }

            if(dto.getDeviceCode().equals("38005"))
                workId = "33ef";
            MdDeviceStatus oldMdDeviceStatus = this.mdDeviceStatusList.stream().filter(s -> s.getDeviceCode()
                    .equals(dto.getDeviceCode())).findFirst().orElse(null);

            String ctrlStatus = "1";
            String status = workId.equals("0001") ? "1" : random.nextInt(500) == 0 ? "2" : "0";
            String statusCode = "0001"; // 데이터 없음
            MdDeviceStatus newDeviceStatus = MdDeviceStatus.builder()
                    .areaType("L")
                    .deviceCode(dto.getDeviceCode())
                    .deviceType(dto.getDeviceType())
                    .ctrlStatus(ctrlStatus)      // 제어 모드
                    .deviceName(dto.getDeviceName()) // 장비 명칭
                    .status(status)        // 동작 상태
                    .statusCode(statusCode)    // 동작 상태 코드
                    .workId(workId)        // 작번
                    .build();

            // 오류 유지를 위한 로그 ... 50 정도는 유지하기
            if (oldMdDeviceStatus != null && oldMdDeviceStatus.getStatus().equals("2") && random.nextInt(10) < 9) {
                newDeviceStatus = oldMdDeviceStatus;
            }

            if (oldMdDeviceStatus != null
                    && isSameStatus(oldMdDeviceStatus, newDeviceStatus))
                continue;

            // 팔레타이저 처리
            if (dto.getDeviceType().equals("RBT")
                    && !dto.getDeviceCode().equals("39010")) {
                workId = HexRandom();
                newDeviceStatus.setWorkId(workId);

                PropPltzInfo info =
                        this.propPltzInfos.get(dto.getDeviceCode().equals("39007") ? 0 : 1);
                Map<String, String> map = new HashMap<>();

                map.put("workId", info.getWorkId());
                map.put("robotNo", String.valueOf(info.getRobotNo()));
                map.put("loadingLine", String.valueOf(info.getLoadingLine()));
                map.put("unLoadingLine", String.valueOf(info.getUnLoadingLine()));
                map.put("mBoxCd", String.valueOf(info.getMBoxCd()));

                map.put("loadingLine1WorkId", info.getLoadingLine1WorkId());
                map.put("loadingLine2WorkId", info.getLoadingLine2WorkId());
                map.put("loadingLine3WorkId", info.getLoadingLine3WorkId());

                map.put("totalOrderCount", String.valueOf(info.getTotalOrderCount()));

                map.put("statusCode", String.valueOf(info.getStatusCode()));
                map.put("errorCode", String.valueOf(info.getErrorCode()));

                map.put("totalRt1Count", String.valueOf(info.getTotalRt1Count()));
                map.put("totalRt2Count", String.valueOf(info.getTotalRt2Count()));
                map.put("totalRt3Count", String.valueOf(info.getTotalRt3Count()));

                newDeviceStatus.setDetail(map);
            }

            // 에러 시작!
            if (status.equals("2")) {
                MdDeviceErrorCodeInfoDto errorCodeInfoDto = this.errorCodeInfoList.stream()
                        .filter(ec -> ec.getErrorCode().equals(statusCode)
                                && ec.getDeviceType().equals(dto.getDeviceType())
                                && ec.getCfgCodeType().equals(
                                dto.getCfgCode().length() > 4
                                        ? dto.getCfgCode().substring(0, 4) : dto.getCfgCode())).findFirst().orElse(null);

                String statusDesc = errorCodeInfoDto != null ? errorCodeInfoDto.getErrorDesc() : "식별되지 않은 에러";
                Integer errorLevel = errorCodeInfoDto != null ? errorCodeInfoDto.getErrorLevel() : 0;

                mdDeviceErrorNotiMapper.insertDeviceErrorNotification(
                        MdDeviceErrorNotiDto
                                .builder()
                                .deviceCode(dto.getDeviceCode())
                                .deviceName(dto.getDeviceName())
                                .deviceType(dto.getDeviceType())
                                .eqCode(dto.getEqCode())
                                .errorCode(statusCode)
                                .errorDesc(statusDesc)
                                .build()
                );

                newDeviceStatus.setErrorLevel(errorLevel);
                newDeviceStatus.setStatusDesc(statusDesc);
            }

            MdDeviceErrorNotiDto unclearTarget = this.mdDeviceErrorNotiDtolist.stream().filter(ec -> ec.getDeviceCode().equals(dto.getDeviceCode())).findFirst().orElse(null);
            // 에러종료
            if ((!status.equals("2")
                    && oldMdDeviceStatus != null
                    && oldMdDeviceStatus.getStatus().equals("2")) || unclearTarget != null) {
                mdDeviceErrorNotiMapper.updateDeviceErrorClear(dto.getEqCode(), dto.getDeviceCode());
            }

            newDeviceStatus.setTriggeredAt(new Date());
            newMdDeviceStatusList.add(newDeviceStatus);
        }

        if (!newMdDeviceStatusList.isEmpty())
            scadaMessagePushService.reportCtrlLoading(newMdDeviceStatusList);

        // 비교하여 메모리에 업데이트 처리
        Map<String, MdDeviceStatus> oldMap = mdDeviceStatusList.stream()
                .collect(Collectors.toMap(MdDeviceStatus::getDeviceCode, d -> d));

        for (MdDeviceStatus newStatus : newMdDeviceStatusList) {
            MdDeviceStatus oldStatus = oldMap.get(newStatus.getDeviceCode());

            if (oldStatus == null) {
                // 기존에 없는 경우 → 추가
                mdDeviceStatusList.add(newStatus);
            } else if (!isSameStatus(oldStatus, newStatus)) {
                // 값이 다르면 → 업데이트
                mdDeviceStatusList.remove(oldStatus);
                mdDeviceStatusList.add(newStatus);
            }
        }
    }

    public void lPlc04Process() {
        List<String> cfgCodeList = new ArrayList<>(List.of("LPLC_04O", "LPLC_04C"));
        List<MdDeviceStatusDto> mdDeviceStatusDtos = mdDeviceMapper.selectDeviceStatusList(cfgCodeList);
        List<MdDeviceStatus> newMdDeviceStatusList = new ArrayList<>();

        // 팔레트 순회 N개 처리 로직
        this.palletCirculate();

        Random random = new Random();
        for (MdDeviceStatusDto dto : mdDeviceStatusDtos) {
            /*
             +0	제어 모드
             +1	동작 상태
             +2	동작 상태 코드
             +3	제어코드
             +4	설비타입에 따라 제어 모션 정보
            */
            String workId = "0000";
            if (random.nextInt(20) == 0) { // 0~19 중 0이면 5% 확률
                workId = "0001";
            }

            if(this.plateMotion.get(dto.getDeviceCode()) != null)
                workId = this.plateMotion.get(dto.getDeviceCode());


            String ctrlStatus = "1";
            String status = !workId.equals("0000") ? "1" : "0";
            String statusCode = "0001"; // 데이터 없음
            MdDeviceStatus newDeviceStatus = MdDeviceStatus.builder()
                    .areaType("L")
                    .deviceCode(dto.getDeviceCode())
                    .deviceType(dto.getDeviceType())
                    .ctrlStatus(ctrlStatus)      // 제어 모드
                    .deviceName(dto.getDeviceName()) // 장비 명칭
                    .status(status)        // 동작 상태
                    .statusCode(statusCode)    // 동작 상태 코드
                    .workId(workId)        // 작번
                    .build();

            // 제함기
            if (dto.getDeviceType().equals("BM")) {
                BmStatus bmStatus = this.bmStatusMap.get(dto.getDeviceCode());
                if (bmStatus != null) {
                    Map<String, String> detail = new HashMap<>();
                    detail.put("processCode", bmStatus.getProcessCode());
                    detail.put("orderQty", String.valueOf(bmStatus.getOrderQty()));
                    detail.put("compQty", String.valueOf(bmStatus.getCompQty()));
                    detail.put("labelCompQty", String.valueOf(bmStatus.getLabelCompQty()));
                    detail.put("mBoxCd", String.valueOf(bmStatus.getMBoxCd()));
                    newDeviceStatus.setDetail(detail);
                }
            }

            MdDeviceStatus oldMdDeviceStatus = this.mdDeviceStatusList.stream().filter(s -> s.getDeviceCode()
                    .equals(dto.getDeviceCode())).findFirst().orElse(null);

            if (oldMdDeviceStatus != null
                    && isSameStatus(oldMdDeviceStatus, newDeviceStatus))
                continue;

            // 에러 시작!
            if (status.equals("2")) {
                MdDeviceErrorCodeInfoDto errorCodeInfoDto = this.errorCodeInfoList.stream()
                        .filter(ec -> ec.getErrorCode().equals(statusCode)
                                && ec.getDeviceType().equals(dto.getDeviceType())
                                && ec.getCfgCodeType().equals(
                                dto.getCfgCode().length() > 4
                                        ? dto.getCfgCode().substring(0, 4) : dto.getCfgCode())).findFirst().orElse(null);

                String statusDesc = errorCodeInfoDto != null ? errorCodeInfoDto.getErrorDesc() : "식별되지 않은 에러";
                Integer errorLevel = errorCodeInfoDto != null ? errorCodeInfoDto.getErrorLevel() : 0;

                mdDeviceErrorNotiMapper.insertDeviceErrorNotification(
                        MdDeviceErrorNotiDto
                                .builder()
                                .deviceCode(dto.getDeviceCode())
                                .deviceName(dto.getDeviceName())
                                .deviceType(dto.getDeviceType())
                                .eqCode(dto.getEqCode())
                                .errorCode(statusCode)
                                .errorDesc(statusDesc)
                                .build()
                );

                newDeviceStatus.setErrorLevel(errorLevel);
                newDeviceStatus.setStatusDesc(statusDesc);
            }

            MdDeviceErrorNotiDto unclearTarget = this.mdDeviceErrorNotiDtolist.stream().filter(ec -> ec.getDeviceCode().equals(dto.getDeviceCode())).findFirst().orElse(null);
            // 에러종료
            if ((!status.equals("2")
                    && oldMdDeviceStatus != null
                    && oldMdDeviceStatus.getStatus().equals("2")) || unclearTarget != null) {
                mdDeviceErrorNotiMapper.updateDeviceErrorClear(dto.getEqCode(), dto.getDeviceCode());
            }

            newDeviceStatus.setTriggeredAt(new Date());
            newMdDeviceStatusList.add(newDeviceStatus);
        }

        if (!newMdDeviceStatusList.isEmpty())
            scadaMessagePushService.reportCtrlLoading(newMdDeviceStatusList);

        // 비교하여 메모리에 업데이트 처리
        Map<String, MdDeviceStatus> oldMap = mdDeviceStatusList.stream()
                .collect(Collectors.toMap(MdDeviceStatus::getDeviceCode, d -> d));

        for (MdDeviceStatus newStatus : newMdDeviceStatusList) {
            MdDeviceStatus oldStatus = oldMap.get(newStatus.getDeviceCode());

            if (oldStatus == null) {
                // 기존에 없는 경우 → 추가
                mdDeviceStatusList.add(newStatus);
            } else if (!isSameStatus(oldStatus, newStatus)) {
                // 값이 다르면 → 업데이트
                mdDeviceStatusList.remove(oldStatus);
                mdDeviceStatusList.add(newStatus);
            }
        }
    }

    public void hPlc05Process() {
        List<String> cfgCodeList = new ArrayList<>(List.of("HPLC_01C", "HPLC_01O"));
        List<MdDeviceStatusDto> mdDeviceStatusDtos = mdDeviceMapper.selectDeviceStatusList(cfgCodeList);
        List<MdDeviceStatus> newMdDeviceStatusList = new ArrayList<>();
        Random random = new Random();
        for (MdDeviceStatusDto dto : mdDeviceStatusDtos) {
            /*
                +0	제어 모드
                +1	동작 상태
                +2	동작 상태 코드
                +3	제어코드
                +4	설비타입에 따라 제어 모션 정보
            */
            String workId = "0000";
            if (random.nextInt(20) == 0) { // 0~19 중 0이면 5% 확률
                workId = "0001";
            }

            MdDeviceStatus oldMdDeviceStatus = this.mdDeviceStatusList.stream().filter(s -> s.getDeviceCode()
                    .equals(dto.getDeviceCode())).findFirst().orElse(null);
            MdDeviceStatus newDeviceStatus;

            if (dto.getEqCode().equals("SDR")) {
                newDeviceStatus = MdDeviceStatus.builder()
                        .areaType("H")
                        .deviceCode(dto.getDeviceCode())
                        .deviceType(dto.getDeviceType())
                        .deviceName(dto.getDeviceName())
                        .status(random.nextInt(10) == 0 ? "1" : "0") // 닫힘(0), 열림(1)
                        .ctrlStatus(random.nextInt(10) == 0 ? "1" : "0") // 정상(0), 비상정지(1)
                        .build();

                // 도어 상태 유지를 위한 로직
                if (oldMdDeviceStatus != null && oldMdDeviceStatus.getStatus().equals("2") && random.nextInt(10) < 6) {
                    newDeviceStatus = oldMdDeviceStatus;
                }
            } else {
                String ctrlStatus = "1";
                String status = workId.equals("0001") ? "1" : random.nextInt(100) == 0 ? "2" : "0";
                String statusCode = "0001"; // 데이터 없음
                newDeviceStatus = MdDeviceStatus.builder()
                        .areaType("H")
                        .deviceCode(dto.getDeviceCode())
                        .deviceType(dto.getDeviceType())
                        .ctrlStatus(ctrlStatus)      // 제어 모드
                        .deviceName(dto.getDeviceName()) // 장비 명칭
                        .status(status)        // 동작 상태
                        .statusCode(statusCode)    // 동작 상태 코드
                        .workId(workId)        // 작번
                        .build();

                // 대포장 팔레타이저
                if (dto.getDeviceCode().equals("1") && dto.getEqCode().equals("APM")) {

                    newDeviceStatus.setStatus(this.eqApmStatus.getPlaceProcess());

                    Map<String, String> map = new HashMap<>();
                    map.put("layer", this.eqApmStatus.getLayer());
                    map.put("orderQty", this.eqApmStatus.getOrderQty());
                    map.put("completeQty", this.eqApmStatus.getCompleteQty());
                    map.put("process", this.eqApmStatus.getProcess());
                    newDeviceStatus.setDetail(map);
                }

                // 오류 유지를 위한 로그 ... 50 정도는 유지하기
                if (oldMdDeviceStatus != null && oldMdDeviceStatus.getStatus().equals("2") && random.nextInt(10) < 9) {
                    newDeviceStatus = oldMdDeviceStatus;
                }

                if (oldMdDeviceStatus != null
                        && isSameStatus(oldMdDeviceStatus, newDeviceStatus))
                    continue;

                // 에러 시작!
                if (status.equals("2")) {
                    MdDeviceErrorCodeInfoDto errorCodeInfoDto = this.errorCodeInfoList.stream()
                            .filter(ec -> ec.getErrorCode().equals(statusCode)
                                    && ec.getDeviceType().equals(dto.getDeviceType())
                                    && ec.getCfgCodeType().equals(
                                    dto.getCfgCode().length() > 4
                                            ? dto.getCfgCode().substring(0, 4) : dto.getCfgCode())).findFirst().orElse(null);

                    String statusDesc = errorCodeInfoDto != null ? errorCodeInfoDto.getErrorDesc() : "식별되지 않은 에러";
                    Integer errorLevel = errorCodeInfoDto != null ? errorCodeInfoDto.getErrorLevel() : 0;

                    mdDeviceErrorNotiMapper.insertDeviceErrorNotification(
                            MdDeviceErrorNotiDto
                                    .builder()
                                    .deviceCode(dto.getDeviceCode())
                                    .deviceName(dto.getDeviceName())
                                    .deviceType(dto.getDeviceType())
                                    .eqCode(dto.getEqCode())
                                    .errorCode(statusCode)
                                    .errorDesc(statusDesc)
                                    .build()
                    );

                    newDeviceStatus.setErrorLevel(errorLevel);
                    newDeviceStatus.setStatusDesc(statusDesc);
                }

                MdDeviceErrorNotiDto unclearTarget = this.mdDeviceErrorNotiDtolist.stream().filter(ec -> ec.getDeviceCode().equals(dto.getDeviceCode())).findFirst().orElse(null);
                // 에러종료
                if ((!status.equals("2")
                        && oldMdDeviceStatus != null
                        && oldMdDeviceStatus.getStatus().equals("2")) || unclearTarget != null) {
                    mdDeviceErrorNotiMapper.updateDeviceErrorClear(dto.getEqCode(), dto.getDeviceCode());
                }

            }

            newDeviceStatus.setTriggeredAt(new Date());
            newMdDeviceStatusList.add(newDeviceStatus);
        }

        if (!newMdDeviceStatusList.isEmpty())
            scadaMessagePushService.reportCtrlLoading(newMdDeviceStatusList);

        // 비교하여 메모리에 업데이트 처리
        Map<String, MdDeviceStatus> oldMap = mdDeviceStatusList.stream()
                .collect(Collectors.toMap(MdDeviceStatus::getDeviceCode, d -> d));

        for (MdDeviceStatus newStatus : newMdDeviceStatusList) {
            MdDeviceStatus oldStatus = oldMap.get(newStatus.getDeviceCode());

            if (oldStatus == null) {
                // 기존에 없는 경우 → 추가
                mdDeviceStatusList.add(newStatus);
            } else if (!isSameStatus(oldStatus, newStatus)) {
                // 값이 다르면 → 업데이트
                mdDeviceStatusList.remove(oldStatus);
                mdDeviceStatusList.add(newStatus);
            }
        }
    }

    public void mfcProcess() {

        // 장비 정보
        List<MdDeviceStatusDto> mdDeviceStatusDtos = mdDeviceMapper.selectDeviceStatusListForMfc();
        List<MdDeviceStatus> newMdDeviceStatusList = new ArrayList<>();

        Random random = new Random();
        for (MdDeviceStatusDto dto : mdDeviceStatusDtos) {
            /*
             +0	제어 모드
             +1	동작 상태
             +2	동작 상태 코드
             +3	제어코드
             +4	설비타입에 따라 제어 모션 정보
            */
            String workId = "0000";
            if (random.nextInt(20) == 0) { // 0~19 중 0이면 5% 확률
                workId = "0001";
            }

            MdDeviceStatus oldMdDeviceStatus = this.mdDeviceStatusList.stream().filter(s -> s.getDeviceCode()
                    .equals(dto.getDeviceCode())).findFirst().orElse(null);

            String ctrlStatus = "1";
            String status = workId.equals("0001") ? "1" : random.nextInt(400) == 0 ? "2" : "0";
            String statusCode = "0001"; // 데이터 없음
            MdDeviceStatus newDeviceStatus = MdDeviceStatus.builder()
                    .areaType("L")
                    .deviceCode(dto.getDeviceCode())
                    .deviceType(dto.getDeviceType())
                    .ctrlStatus(ctrlStatus)      // 제어 모드
                    .deviceName(dto.getDeviceName()) // 장비 명칭
                    .status(status)        // 동작 상태
                    .statusCode(statusCode)    // 동작 상태 코드
                    .workId(workId)        // 작번
                    .build();

            // 오류 유지를 위한 로그 ... 50 정도는 유지하기
            if (oldMdDeviceStatus != null && oldMdDeviceStatus.getStatus().equals("2") && random.nextInt(10) < 9) {
                newDeviceStatus = oldMdDeviceStatus;
            }


            if (oldMdDeviceStatus != null
                    && isSameStatus(oldMdDeviceStatus, newDeviceStatus))
                continue;

            // 에러 시작!
            if (status.equals("2")) {
                MdDeviceErrorCodeInfoDto errorCodeInfoDto = this.errorCodeInfoList.stream()
                        .filter(ec -> ec.getErrorCode().equals(statusCode)
                                && ec.getDeviceType().equals(dto.getDeviceType())
                                && ec.getCfgCodeType().equals(
                                dto.getCfgCode().length() > 4
                                        ? dto.getCfgCode().substring(0, 4) : dto.getCfgCode())).findFirst().orElse(null);

                String statusDesc = errorCodeInfoDto != null ? errorCodeInfoDto.getErrorDesc() : "식별되지 않은 에러";
                Integer errorLevel = errorCodeInfoDto != null ? errorCodeInfoDto.getErrorLevel() : 0;

                mdDeviceErrorNotiMapper.insertDeviceErrorNotification(
                        MdDeviceErrorNotiDto
                                .builder()
                                .deviceCode(dto.getDeviceCode())
                                .deviceName(dto.getDeviceName())
                                .deviceType(dto.getDeviceType())
                                .eqCode(dto.getEqCode())
                                .errorCode(statusCode)
                                .errorDesc(statusDesc)
                                .build()
                );

                newDeviceStatus.setErrorLevel(errorLevel);
                newDeviceStatus.setStatusDesc(statusDesc);
            }

            MdDeviceErrorNotiDto unclearTarget = this.mdDeviceErrorNotiDtolist.stream().filter(ec -> ec.getDeviceCode().equals(dto.getDeviceCode())).findFirst().orElse(null);
            // 에러종료
            if ((!status.equals("2")
                    && oldMdDeviceStatus != null
                    && oldMdDeviceStatus.getStatus().equals("2")) || unclearTarget != null) {
                mdDeviceErrorNotiMapper.updateDeviceErrorClear(dto.getEqCode(), dto.getDeviceCode());
            }
            newDeviceStatus.setTriggeredAt(new Date());
            newMdDeviceStatusList.add(newDeviceStatus);
        }

        // 창고 정보
        List<DbStoStomst> stoStomstsList =dbStoStomstMapper.selectStoStomstAllList();
        Collections.shuffle(stoStomstsList); // 리스트 랜덤 섞기
        List<DbStoStomst> randomList = stoStomstsList.stream()
                .limit(100)
                .toList();
        // 창고 정보가 너무 많아서 일부건만 전송하려고 처리
        for (DbStoStomst sto:randomList){
            String mappedStatus = random.nextInt(500) == 0 ? "99" : "2";
            if (mappedStatus.equals("99")) {

                MdDeviceStatus newDeviceStatus = MdDeviceStatus
                        .builder()
                        .areaType("A")
                        .status("2") // 여기서는 이상만 처리함
                        .ctrlStatus("1")
                        .deviceCode(sto.getLoct())
                        .deviceType("LOC")
                        .deviceName(sto.getLoct())
                        .statusCode("0000")
                        .errorLevel(0)
                        .statusDesc("에러 설명이 들어가야 하는데 가상에서는 만들기 애매해서 스킵")
                        .build();

                MdDeviceStatus oldMdDeviceStatus = this.mdDeviceStatusList.stream().filter(s -> s.getDeviceCode()
                        .equals(sto.getLoct())).findFirst().orElse(null);

                if (oldMdDeviceStatus != null
                        && isSameStatus(oldMdDeviceStatus, newDeviceStatus))
                    continue;

                newDeviceStatus.setTriggeredAt(new Date());
                newMdDeviceStatusList.add(newDeviceStatus);
                // 에러 시작!
                mdDeviceErrorNotiMapper.insertDeviceErrorNotification(
                        MdDeviceErrorNotiDto
                                .builder()
                                .deviceCode(sto.getLoct())
                                .deviceName(sto.getLoct())
                                .deviceType("LOC")
                                .eqCode("MFC")
                                .errorCode("0000")
                                .errorDesc("에러 설명이 들어가야 하는데 가상에서는 만들기 애매해서 스킵")
                                .build());

            } else { // 이상 아니면 제거 처리

                // 수동 상태 아니면 자동으로 판단
                String ctrlStatusValue = "1";

                MdDeviceStatus newDeviceStatus = MdDeviceStatus
                        .builder()
                        .areaType("A")
                        .status("0")
                        .ctrlStatus(ctrlStatusValue)
                        .deviceCode(sto.getLoct())
                        .deviceType("LOC")
                        .statusCode("0000")
                        .statusDesc(sto.getLoct())
                        .deviceName(sto.getLoct())
                        .build();
                newDeviceStatus.setTriggeredAt(new Date());

                newMdDeviceStatusList.add(newDeviceStatus);

                // 에러종료
                mdDeviceErrorNotiMapper.updateDeviceErrorClear("MFC", sto.getLoct());

            }
        }

        if (!newMdDeviceStatusList.isEmpty())
            scadaMessagePushService.reportCtrlLoading(newMdDeviceStatusList);

        // 비교하여 메모리에 업데이트 처리
        Map<String, MdDeviceStatus> oldMap = mdDeviceStatusList.stream()
                .collect(Collectors.toMap(MdDeviceStatus::getDeviceCode, d -> d));

        for (MdDeviceStatus newStatus : newMdDeviceStatusList) {
            MdDeviceStatus oldStatus = oldMap.get(newStatus.getDeviceCode());
            boolean locClearCheck = newStatus.getDeviceType().equals("LOC") && newStatus.getStatus().equals("0");
            if (oldStatus == null) {
                // 기존에 없는 경우 → 추가
                // 창고 정보 의경우 정상 상태는 추가 안함
                if (!locClearCheck)
                    mdDeviceStatusList.add(newStatus);
            } else if (!isSameStatus(oldStatus, newStatus)) {
                // 값이 다르면 → 업데이트
                mdDeviceStatusList.remove(oldStatus);
                mdDeviceStatusList.add(newStatus);
            } else if (isSameStatus(oldStatus, newStatus) && locClearCheck) {
                mdDeviceStatusList.remove(newStatus);
            }
        }
    }

    // status 비교함수
    public boolean isSameStatus(MdDeviceStatus a, MdDeviceStatus b) {
        return Objects.equals(a.getDeviceType(), b.getDeviceType()) &&
                Objects.equals(a.getCtrlStatus(), b.getCtrlStatus()) &&
                Objects.equals(a.getStatus(), b.getStatus()) &&
                Objects.equals(a.getStatusCode(), b.getStatusCode()) &&
                Objects.equals(a.getWorkId(), b.getWorkId()) &&
                Objects.equals(a.getDetail(), b.getDetail());
    }

    public List<MdDeviceStatus> getDeviceStatusAllList(){
        return mdDeviceStatusList;
    }

    public List<PropPltzInfo> getPropPltzInfos() {
        return new ArrayList<>(propPltzInfos);
    }

    public EqApmStatus getEqApmStatus() {
        return eqApmStatus;
    }

    public Map<String, BmStatus> getBmStatusMap() {
        return new HashMap<>(bmStatusMap);
    }

    public Map<String, String> getPlateMotion() {
        return new LinkedHashMap<>(plateMotion);
    }

    public Map<String, LineSimulationInfo> getLineSimulationStates() {
        return new HashMap<>(lineSimulationStates);
    }

    private final Map<String, Integer> activeIndexMap = new HashMap<>();
    private final Map<String, Integer> moveCountMap = new HashMap<>();

    private void palletCirculate() {
        List<String> keys = new ArrayList<>(plateMotion.keySet());

        for (int i = 0; i < completeList.size(); i++) {
            String palletId = completeList.get(i);

            // 아직 시작하지 않은 팔레트
            if (!activeIndexMap.containsKey(palletId)) {
                tryStartPallet(palletId, i, keys);
                continue;
            }

            // 이동 처리
            movePallet(palletId, keys);
        }
    }

    private void tryStartPallet(String palletId, int index, List<String> keys) {
        if (index == 0) {
            // 첫 번째 팔레트는 바로 시작
            plateMotion.put(keys.get(0), palletId);
            activeIndexMap.put(palletId, 0);
            moveCountMap.put(palletId, 0);
            log.info("▶ {} 시작 위치: {}", palletId, keys.get(0));
            return;
        }

        // 이전 팔레트가 충분히 이동했는지 확인
        String prevPallet = completeList.get(index - 1);
        int prevMoves = moveCountMap.getOrDefault(prevPallet, 0);

        int interval = 4;
        if (prevMoves >= interval) {
            plateMotion.put(keys.get(0), palletId);
            activeIndexMap.put(palletId, 0);
            moveCountMap.put(palletId, 0);
            log.info("▶ {} 시작 위치: {}", palletId, keys.get(0));
        }
    }

    private void movePallet(String palletId, List<String> keys) {
        int size = keys.size();
        int currIdx = activeIndexMap.get(palletId);
        int nextIdx = (currIdx + 1) % size;

        // 충돌 방지: 다음 위치에 다른 팔레트가 있으면 skip
        String nextVal = plateMotion.get(keys.get(nextIdx));
        if (!"0000".equals(nextVal)) {
            log.warn("⛔ {} 이동 보류 - 다음 위치 {}에 {}", palletId, keys.get(nextIdx), nextVal);
            return;
        }

        // 실제 이동 처리
        plateMotion.put(keys.get(currIdx), "0000");
        plateMotion.put(keys.get(nextIdx), palletId);
        activeIndexMap.put(palletId, nextIdx);
        moveCountMap.put(palletId, moveCountMap.getOrDefault(palletId, 0) + 1);

        log.info("🔁 {} 이동: {} → {}", palletId, keys.get(currIdx), keys.get(nextIdx));
    }

    @Scheduled(fixedDelay = 3000)
    public void setPalletizerInfo() {
        log.info("팔레타이저 시뮬레이션 갱신");
        try {
            for (int i = 1; i < 3; i++) {
                int finalI = i;
                PropPltzInfo robotInfo = this.propPltzInfos.stream().filter(h -> h.getRobotNo() == finalI).findFirst().orElse(null);
                if (robotInfo == null) {
                    return;
                }

                if ("0000".equals(robotInfo.getWorkId()) || (robotInfo.isReady() && rareChance(3))) {
                    int totalOrderCount = pickRobotOrderCount();
                    robotInfo.setWorkId(HexRandom());
                    robotInfo.setLoadingLine(randomBetween(1, 3));
                    robotInfo.setUnLoadingLine(randomBetween(1, 4));
                    robotInfo.setUnLoadingPosition(randomBetween(1, 9));
                    robotInfo.setHeightCode(randomBetween(1, 3));
                    robotInfo.setTotalOrderCount(totalOrderCount);
                    robotInfo.setMBoxCd(randomBetween(1, 14));
                    robotInfo.setLoadingLine1WorkId(HexRandom());
                    robotInfo.setLoadingLine2WorkId(HexRandom());
                    robotInfo.setLoadingLine3WorkId(HexRandom());
                    robotInfo.setTotalRt1Count(0);
                    robotInfo.setTotalRt2Count(0);
                    robotInfo.setTotalRt3Count(0);
                    robotInfo.setTotalRt4Count(0);
                    robotInfo.setStatusCode(1);
                    robotInfo.setMotionCode(1);
                    robotInfo.setErrorCode(0);
                    robotInfo.setReady(false);
                    robotInfo.setDecDataList(Map.of(1, 0, 2, 0, 3, 0));
                    continue;
                }

                int totalOrderCount = Math.max(robotInfo.getTotalOrderCount(), 36);
                int processedCount = robotInfo.getTotalRt4Count();
                int remaining = Math.max(0, totalOrderCount - processedCount);
                int increment = remaining == 0 ? 0 : (rareChance(5) ? 0 : randomBetween(1, Math.min(3, remaining)));

                if (increment > 0) {
                    int phase = processedCount % 3;
                    if (phase == 0) {
                        robotInfo.setTotalRt1Count(clamp(robotInfo.getTotalRt1Count() + increment, 0, totalOrderCount));
                        robotInfo.setMotionCode(1);
                    } else if (phase == 1) {
                        robotInfo.setTotalRt2Count(clamp(robotInfo.getTotalRt2Count() + increment, 0, totalOrderCount));
                        robotInfo.setMotionCode(2);
                    } else {
                        robotInfo.setTotalRt3Count(clamp(robotInfo.getTotalRt3Count() + increment, 0, totalOrderCount));
                        robotInfo.setMotionCode(3);
                    }
                    robotInfo.setTotalRt4Count(clamp(processedCount + increment, 0, totalOrderCount));
                } else {
                    robotInfo.setMotionCode(4);
                }

                if (rareChance(900)) {
                    robotInfo.setErrorCode(100 + robotInfo.getRobotNo());
                    robotInfo.setStatusCode(3);
                } else {
                    robotInfo.setErrorCode(0);
                    robotInfo.setStatusCode(robotInfo.getTotalRt4Count() >= totalOrderCount ? 2 : 1);
                }

                if (robotInfo.getTotalRt4Count() >= totalOrderCount) {
                    robotInfo.setTotalRt4Count(totalOrderCount);
                    robotInfo.setMotionCode(5);
                    robotInfo.setStatusCode(2);
                    robotInfo.setReady(true);
                } else {
                    robotInfo.setReady(false);
                }
            }

        } catch (Exception e) {
            log.error("{}", e, e);
        }

        log.info("팔레타이저 시뮬레이션 종료");
    }

    @Scheduled(fixedDelay = 2000)
    public void setAmpRobotInfo() {
        log.info("대포장 설비 프로세스 시작 : {}", this.eqApmStatus);
        if (this.eqApmStatus.getWorkId().equals("0")) {
            int totalOrderCount = this.propPltzInfos.stream()
                    .filter(info -> !Objects.equals(info.getWorkId(), "0000"))
                    .map(PropPltzInfo::getTotalOrderCount)
                    .findFirst()
                    .orElse(pickRobotOrderCount());

            this.eqApmStatus = EqApmStatus.builder()
                    .workId(HexRandom())
                    .inputStatus("0")
                    .layer(String.valueOf(Math.max(3, totalOrderCount / 9)))
                    .status("0000")
                    .orderQty(String.valueOf(totalOrderCount))
                    .placeProcess("0")
                    .process("0")
                    .completeQty("0")
                    .build();
        } else {
            int orderQty = Integer.parseInt(this.eqApmStatus.getOrderQty());
            int completeQty = Integer.parseInt(this.eqApmStatus.getCompleteQty());

            if (completeQty >= orderQty) {
                if ("2".equals(this.eqApmStatus.getProcess())) {
                    this.eqApmStatus = EqApmStatus.builder()
                            .workId("0")
                            .inputStatus("1")
                            .layer("0")
                            .status("0")
                            .orderQty("0")
                            .placeProcess("0")
                            .process("0")
                            .completeQty("0")
                            .build();
                } else {
                    this.eqApmStatus.setCompleteQty(String.valueOf(orderQty));
                    this.eqApmStatus.setInputStatus("1");
                    this.eqApmStatus.setProcess("2");
                    this.eqApmStatus.setPlaceProcess("2");
                    this.eqApmStatus.setStatus("0002");
                }
            } else {
                int remaining = orderQty - completeQty;
                int step = rareChance(6) ? 0 : Math.min(remaining, rareChance(4) ? 6 : 3);
                int nextCompleteQty = Math.min(orderQty, completeQty + step);

                this.eqApmStatus.setCompleteQty(String.valueOf(nextCompleteQty));
                this.eqApmStatus.setInputStatus("0");
                this.eqApmStatus.setProcess(nextCompleteQty >= orderQty ? "2" : "1");
                this.eqApmStatus.setPlaceProcess(nextCompleteQty >= orderQty ? "2" : step == 0 ? "0" : "1");
                this.eqApmStatus.setStatus(nextCompleteQty >= orderQty ? "0002" : "0001");
            }
        }
        log.info("대포장 설비 프로세스 완료 : {}", this.eqApmStatus);
    }

    public String HexRandom() {
        Random random = new Random();
        int num = random.nextInt(30001); // 0 ~ 30000 범위에서 생성
        return String.format("%04x", num); // 4자리 소문자 16진수
    }

    /*
     상태값 공유 프로세스 시작 */
    @Scheduled(fixedDelay = 1500)
    public void setBmStatus() {
        log.info("제함기 상태값 공유 프로세스 시작");
        for (String deviceCode : this.bmDeviceCodeList) {
            BmStatus bmStatus = this.bmStatusMap.get(deviceCode);
            if (bmStatus == null) {
                this.bmStatusMap.put(deviceCode, BmStatus
                        .builder()
                        .workId("0")
                        .statusCode("0")
                        .status("0")
                        .compQty(0)
                        .processCode("0")
                        .labelCompQty(0)
                        .mBoxCd(0)
                        .orderQty(0)
                        .deviceCode(deviceCode)
                        .build());
            } else {
                if (bmStatus.getProcessCode().equals("0")) {
                    if (rareChance(4)) {
                        int[] values = {20, 21, 22, 23};
                        bmStatus.setProcessCode("1");
                        bmStatus.setStatus("1");
                        bmStatus.setStatusCode("1001");
                        bmStatus.setMBoxCd(values[ThreadLocalRandom.current().nextInt(values.length)]);
                        bmStatus.setOrderQty(pickBmOrderCount());
                        bmStatus.setCompQty(0);
                        bmStatus.setLabelCompQty(0);
                        bmStatus.setWorkId(HexRandom());
                    }
                } else if (bmStatus.getProcessCode().equals("1")) {
                    int increment = rareChance(5) ? 0 : randomBetween(1, 2);
                    if (increment > 0) {
                        bmStatus.setCompQty(Math.min(bmStatus.getOrderQty(), bmStatus.getCompQty() + increment));
                        bmStatus.setLabelCompQty(Math.min(bmStatus.getOrderQty(), bmStatus.getLabelCompQty() + increment));
                    }

                    if (bmStatus.getCompQty() >= bmStatus.getOrderQty()) {
                        bmStatus.setCompQty(bmStatus.getOrderQty());
                        bmStatus.setLabelCompQty(bmStatus.getOrderQty());
                        bmStatus.setProcessCode("4");
                        bmStatus.setStatus("2");
                        bmStatus.setStatusCode("0002");
                    } else if (rareChance(450)) {
                        bmStatus.setProcessCode("5"); // 취소
                        bmStatus.setStatus("5");
                        bmStatus.setStatusCode("9001");
                    } else {
                        bmStatus.setStatus("1");
                        bmStatus.setStatusCode("1001");
                    }
                } else {
                    if (rareChance(3)) {
                        this.bmStatusMap.put(deviceCode, BmStatus
                                .builder()
                                .workId("0")
                                .statusCode("0")
                                .status("0")
                                .compQty(0)
                                .processCode("0")
                                .labelCompQty(0)
                                .mBoxCd(0)
                                .orderQty(0)
                                .deviceCode(deviceCode)
                                .build());
                    }
                }

                log.info("제함기 상태값 변경 [DEVICE_CODE : {}] [BM_STATUS : {}] ", deviceCode, bmStatus);

            }
        }
        log.info("제함기 상태값 공유 프로세스 종료");

    }

    /**
     * 특정 트랙 번호가 apmBufferCvList 내의 어떤 리스트에라도 존재하는지 확인합니다.
     *
     * @param targetTrackNumber 확인할 트랙 번호 (예: "24305")
     * @return 해당 트랙 번호가 존재하면 true, 그렇지 않으면 false
     */
    public boolean containsTrackNumber(String targetTrackNumber) {
        // Map의 모든 value(List<String>)를 순회합니다.
        for (List<String> trackList : apmBufferCvList.values()) {
            // 각 리스트에서 targetTrackNumber가 포함되어 있는지 확인합니다.
            if (trackList.contains(targetTrackNumber)) {
                return true; // 찾았으면 바로 true 반환
            }
        }
        return false; // 모든 리스트를 확인했지만 찾지 못함
    }

    public void apmBufferLineScheduler() throws InterruptedException {
        log.info("--- apmBufferLine 스케줄러 실행: 라인 상태 확인 및 비동기 작업 시작 ---");

        List<String> allLineKeys = new ArrayList<>(apmBufferCvList.keySet());
        allLineKeys.remove("8"); // 검증 컨베이어 제외
        Collections.shuffle(allLineKeys);

        for (String lineKey : allLineKeys) {
            LineSimulationInfo info = lineSimulationStates.get(lineKey);
            if (info != null && info.getState() == LineSimulationState.IDLE) {
                log.info("라인 {}의 시뮬레이션을 시작합니다 (비동기).", lineKey);
                info.setState(LineSimulationState.FILLING_CYCLE);
                self.simulateLineProcess(lineKey); // 비동기 시뮬레이션 실행
                TimeUnit.SECONDS.sleep(1); // 너무 빠른 호출 방지
            }
        }

        // 전체 라인 상태 확인
        boolean anyStillFilling = lineSimulationStates.values().stream()
            .anyMatch(info -> info.getState() == LineSimulationState.FILLING_CYCLE);

        boolean allCompletedOrEmptying = lineSimulationStates.entrySet().stream()
            .filter(e -> !e.getKey().equals("8")) // 검증라인은 나중에 처리
            .allMatch(e -> {
                LineSimulationState state = e.getValue().getState();
                return state == LineSimulationState.COMPLETED || state == LineSimulationState.EMPTYING_CYCLE;
            });

        LineSimulationInfo inspectionLineInfo = lineSimulationStates.get("8"); // 검증 컨베이어

        // 검증 라인은 COMPLETED 또는 EMPTYING이어야 함
        boolean inspectionReady = inspectionLineInfo != null &&
            (inspectionLineInfo.getState() == LineSimulationState.EMPTYING_CYCLE ||
             inspectionLineInfo.getState() == LineSimulationState.COMPLETED);

        if (allCompletedOrEmptying && inspectionReady && !anyStillFilling) {
            log.info("모든 라인의 시뮬레이션 사이클이 종료되었습니다. 검증 컨베이어도 완료 상태입니다. 전체 초기화 수행.");
            initializeAllTracks(); // 전체 라인 초기화
        } else {
            log.info("아직 시뮬레이션 중인 라인이 존재하거나 검증 컨베이어가 준비되지 않았습니다.");
        }
    }


    /**
     * 각 라인별로 전체 채우기-비우기 사이클을 수행하는 비동기 메서드
     *
     * @param lineKey 시뮬레이션을 수행할 라인 키
     */
    @Async
    public void simulateLineProcess(String lineKey) throws InterruptedException {  // 이 줄을 추가합니다.

        List<String> tracksInLine = apmBufferCvList.get(lineKey);
        if (tracksInLine == null || tracksInLine.isEmpty()) {
            log.error("라인 {}에 트랙 정보가 없습니다. 시뮬레이션 건너뜀.", lineKey);
            return;
        }

        LineSimulationInfo lineInfo = lineSimulationStates.get(lineKey);
        if (lineInfo == null) {
            log.error("라인 {}의 시뮬레이션 정보가 없습니다. 시뮬레이션 건너뜜.", lineKey);
            return;
        }

        log.info("라인 {} 시뮬레이션 시작: 채우기 단계.", lineKey);
        lineInfo.setState(LineSimulationState.FILLING_CYCLE);
        // 채우기
        for (String trackCode : tracksInLine) {
            synchronized (mdDeviceStatusList) {
                TimeUnit.MILLISECONDS.sleep(500);
                MdDeviceStatus currentTrackStatus = findDeviceStatusByCode(trackCode);

                if (currentTrackStatus != null && currentTrackStatus.getStatus().equals("0")) {
                    // HexRandom() 메서드를 이제 이 클래스 내부에서 직접 호출합니다.
                    String workIdToAssign = HexRandom();

                    MdDeviceStatus newDeviceStatus = MdDeviceStatus.builder()
                            .areaType("L")
                            .deviceCode(trackCode)
                            .deviceType("CV")
                            .deviceName("대포장버퍼콘베어-" + trackCode)
                            .ctrlStatus("1")
                            .status("1")
                            .statusCode("0001")
                            .workId(workIdToAssign)
                            .errorLevel(0)
                            .statusDesc("작업 " + workIdToAssign + " 할당됨")
                            .triggeredAt(new Date())
                            .build();

                    updateDeviceStatusInMemory(newDeviceStatus);
                    log.info("라인 {}: 트랙 {}가 작업 {}로 할당되었습니다.", lineKey, trackCode, workIdToAssign);
                    printCurrentAllLinesStatus();

                    // 해당 라인 정보만 전송처리
                    List<MdDeviceStatus> matchedStatuses = mdDeviceStatusList.stream()
                            .filter(status -> tracksInLine.contains(status.getDeviceCode()))
                            .toList();

                    if (!matchedStatuses.isEmpty())
                        scadaMessagePushService.reportCtrlLoading(matchedStatuses);

                } else {
                    log.warn("라인 {}: 트랙 {}가 이미 채워져 있거나 유효하지 않습니다. 스킵.", lineKey, trackCode);
                }
            }
            try {
                TimeUnit.MILLISECONDS.sleep(500);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                log.error("라인 {} 채우기 시뮬레이션이 중단되었습니다.", lineKey, e);
                lineInfo.setState(LineSimulationState.IDLE);
                return;
            }
        }
        log.info("--- 라인 {}의 모든 트랙이 채워졌습니다. ---", lineKey);

        // 비우는 중인 라인이 있으면 기다린다
        while (lineSimulationStates.values().stream()
                .anyMatch(info -> info.getState() == LineSimulationState.EMPTYING_CYCLE)) {
            log.info("라인 {}: 다른 라인이 비우기 중이므로 대기합니다...", lineKey);
            TimeUnit.MILLISECONDS.sleep(1000);
        }

        // 비우기
        log.info("라인 {} 시뮬레이션 시작: 비우기 단계.", lineKey);
        LineSimulationInfo checkLineInfo = lineSimulationStates.get("8");
        lineInfo.setState(LineSimulationState.EMPTYING_CYCLE);
        log.info("검증라인 {} 시뮬레이션 시작: 체우기 단계.", "8");
        checkLineInfo.setState(LineSimulationState.FILLING_CYCLE);
        List<String> checkBufferlist = apmBufferCvList.get("8");
        int bufferLineIndex = 0;
        for (String trackCode : tracksInLine) {

            TimeUnit.MILLISECONDS.sleep(1000);
            synchronized (mdDeviceStatusList) {
                MdDeviceStatus currentTrackStatus = findDeviceStatusByCode(trackCode);

                if (currentTrackStatus != null && currentTrackStatus.getStatus().equals("1")) {
                    String outWorkId = currentTrackStatus.getWorkId();
                    String targetDeviceCode = checkBufferlist.get(bufferLineIndex);
                    MdDeviceStatus emptyDeviceStatus = MdDeviceStatus.builder()
                            .areaType("L")
                            .deviceCode(trackCode)
                            .deviceType("CV")
                            .deviceName("대포장버퍼콘베어-" + trackCode)
                            .ctrlStatus("1")
                            .status("0")
                            .statusCode("0000")
                            .errorLevel(0)
                            .statusDesc("비어있음")
                            .workId("0000")
                            .build();

                    updateDeviceStatusInMemory(emptyDeviceStatus);
                    log.info("라인 {}: 트랙 {}가 비워졌습니다. (WorkId: {})", lineKey, trackCode, currentTrackStatus.getWorkId());

                    MdDeviceStatus newCheckDeviceStatus = MdDeviceStatus.builder()
                            .areaType("L")
                            .deviceCode(targetDeviceCode)
                            .deviceType("CV")
                            .deviceName("대포장검수콘베어-" + trackCode)
                            .ctrlStatus("1")
                            .status("1")
                            .statusCode("0000")
                            .errorLevel(0)
                            .statusDesc("작업 " + outWorkId + " 할당됨")
                            .workId(outWorkId)
                            .build();
                    updateDeviceStatusInMemory(newCheckDeviceStatus);
                    log.info("검증라인 {}: 트랙 {}가 체워졌습니다. (WorkId: {})", lineKey, targetDeviceCode, outWorkId);

                    printCurrentAllLinesStatus();
                    // 해당 라인 정보만 전송처리
                    List<MdDeviceStatus> matchedStatuses = mdDeviceStatusList.stream()
                            .filter(status -> tracksInLine.contains(status.getDeviceCode()) || checkBufferlist.contains(status.getDeviceCode()))
                            .toList();
                    bufferLineIndex++;
                    if (!matchedStatuses.isEmpty())
                        scadaMessagePushService.reportCtrlLoading(matchedStatuses);
                } else {
                    log.warn("라인 {}: 트랙 {}는 이미 비어있거나 유효하지 않습니다. 스킵.", lineKey, trackCode);
                }
            }
            try {
                TimeUnit.MILLISECONDS.sleep(500);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                log.error("라인 {} 비우기 시뮬레이션이 중단되었습니다.", lineKey, e);
                lineInfo.setState(LineSimulationState.IDLE);
                return;
            }
        }
        log.info("--- 라인 {}의 모든 트랙이 비워졌습니다. 시뮬레이션 사이클 완료. ---", lineKey);
        for (String trackCode : checkBufferlist) {
            checkLineInfo.setState(LineSimulationState.EMPTYING_CYCLE);
            TimeUnit.MILLISECONDS.sleep(1000);
            synchronized (mdDeviceStatusList) {
                MdDeviceStatus currentTrackStatus = findDeviceStatusByCode(trackCode);

                if (currentTrackStatus != null && currentTrackStatus.getStatus().equals("1")) {
                    MdDeviceStatus emptyDeviceStatus = MdDeviceStatus.builder()
                            .areaType("L")
                            .deviceCode(trackCode)
                            .deviceType("CV")
                            .deviceName("대포장검수콘베어-" + trackCode)
                            .ctrlStatus("1")
                            .status("0")
                            .statusCode("0000")
                            .errorLevel(0)
                            .statusDesc("비어있음")
                            .workId("0000")
                            .triggeredAt(new Date())
                            .build();

                    updateDeviceStatusInMemory(emptyDeviceStatus);
                    log.info("검증라인 {}: 트랙 {}가 비워졌습니다. (WorkId: {})", lineKey, trackCode, currentTrackStatus.getWorkId());

                    printCurrentAllLinesStatus();
                    // 해당 라인 정보만 전송처리
                    List<MdDeviceStatus> matchedStatuses = mdDeviceStatusList.stream()
                            .filter(status -> checkBufferlist.contains(status.getDeviceCode()))
                            .toList();
                    if (!matchedStatuses.isEmpty())
                        scadaMessagePushService.reportCtrlLoading(matchedStatuses);
                } else {
                    log.warn("검증라인 {}: 트랙 {}는 이미 비어있거나 유효하지 않습니다. 스킵.", lineKey, trackCode);
                }
            }
        }
        lineInfo.setState(LineSimulationState.COMPLETED);
        checkLineInfo.setState(LineSimulationState.COMPLETED);


    }


    // List<MdDeviceStatus>에서 deviceCode로 찾는 로직 (순회 필요)
    private MdDeviceStatus findDeviceStatusByCode(String deviceCode) {
        for (MdDeviceStatus status : mdDeviceStatusList) {
            if (status.getDeviceCode().equals(deviceCode)) {
                return status;
            }
        }
        return null;
    }

    // List<MdDeviceStatus>에서 상태 업데이트 로직 (순회 필요)
    private void updateDeviceStatusInMemory(MdDeviceStatus newStatus) {
        for (int i = 0; i < mdDeviceStatusList.size(); i++) {
            MdDeviceStatus oldStatus = mdDeviceStatusList.get(i);
            if (oldStatus.getDeviceCode().equals(newStatus.getDeviceCode())) {
                oldStatus.setCtrlStatus(newStatus.getCtrlStatus());
                oldStatus.setStatus(newStatus.getStatus());
                oldStatus.setStatusCode(newStatus.getStatusCode());
                oldStatus.setWorkId(newStatus.getWorkId());
                oldStatus.setErrorLevel(newStatus.getErrorLevel());
                oldStatus.setStatusDesc(newStatus.getStatusDesc());
                if (newStatus.getDetail() != null) {
                    if (oldStatus.getDetail() == null) {
                        oldStatus.setDetail(new ConcurrentHashMap<>());
                    }
                    oldStatus.getDetail().putAll(newStatus.getDetail());
                }
                return;
            }
        }
        mdDeviceStatusList.add(newStatus);
    }

    /**
     * 모든 라인의 현재 트랙 상태를 출력합니다.
     */
    private void printCurrentAllLinesStatus() {
        List<String> sortedLineKeys = new ArrayList<>(apmBufferCvList.keySet());
        Collections.sort(sortedLineKeys);

        Map<String, MdDeviceStatus> tempStatusMap;
        synchronized (mdDeviceStatusList) {
            tempStatusMap = mdDeviceStatusList.stream()
                    .collect(Collectors.toMap(MdDeviceStatus::getDeviceCode, s -> s));
        }

        log.info("----- 모든 라인 현재 상태 -----");
        for (String lineKey : sortedLineKeys) {
            StringBuilder sb = new StringBuilder("Line " + lineKey + ": [");
            List<String> tracksInLine = apmBufferCvList.get(lineKey);
            for (String trackCode : tracksInLine) {
                MdDeviceStatus status = tempStatusMap.get(trackCode);
                if (status != null) {
                    if (status.getStatus().equals("1")) {
                        sb.append(status.getWorkId() != null && status.getWorkId().length() >= 4 ? status.getWorkId().substring(0, 4) : "????").append(" ");
                    } else {
                        sb.append("____ ");
                    }
                } else {
                    sb.append("---- ");
                }
            }
            LineSimulationInfo info = lineSimulationStates.get(lineKey);
            sb.append("] (State: ").append(info.getState()).append(")");
            log.info(sb.toString());
        }
        log.info("-----------------------------");
    }
}
