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
public class ScadaL02VirtualScheduler {

    private final ScadaSchedulerManager schedulerManager;
    private final ScadaBizService scadaBizService;


    @PostConstruct // 애플리케이션 시작 시 자동 등록
    public void registerTask() {
        schedulerManager.registerTask("L02",this::taskService,1000);
        log.info("L02 작업 매니저에 등록됨");
    }

    public void taskService() {
        try {
            scadaBizService.lPlc02Process();
            scadaBizService.apmBufferLineScheduler();
            log.info("L02 가상 작업 실행됨!");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt(); // 인터럽트 상태 복원
            log.warn("L02 작업 중 인터럽트 발생", e);
        }
    }

}
