package com.scada.virtualizer.controller.schedule;

import com.scada.virtualizer.manager.ScadaSchedulerManager;
import com.scada.virtualizer.repository.dto.equipment.MdDeviceStatus;
import com.scada.virtualizer.service.ScadaBizService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class ScadaL01VirtualScheduler {

    private final ScadaSchedulerManager schedulerManager;
    private final ScadaBizService scadaBizService;


    @PostConstruct // 애플리케이션 시작 시 자동 등록
    public void registerTask() {
        schedulerManager.registerTask("L01",this::taskService,1000);
        log.info("L01 작업 매니저에 등록됨");
    }

    public void taskService() {
        scadaBizService.lPlc01Process();
        log.info("L01 가상 작업 실행됨!");
    }
}
