package com.scada.virtualizer.controller.schedule;

import com.scada.virtualizer.manager.ScadaSchedulerManager;
import com.scada.virtualizer.service.ScadaBizService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class ScadaL03VirtualScheduler {

    private final ScadaSchedulerManager schedulerManager;
    private final ScadaBizService scadaBizService;


    @PostConstruct // 애플리케이션 시작 시 자동 등록
    public void registerTask() {
        schedulerManager.registerTask("L03",this::taskService,1000);
        log.info("L03 작업 매니저에 등록됨");
    }

    public void taskService() {
        scadaBizService.lPlc03Process();
        log.info("L03 가상 작업 실행됨!");
    }
}
