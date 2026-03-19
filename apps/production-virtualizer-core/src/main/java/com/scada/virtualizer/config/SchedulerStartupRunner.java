package com.scada.virtualizer.config;

import com.scada.virtualizer.manager.ScadaSchedulerManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
@Slf4j
@RequiredArgsConstructor
public class SchedulerStartupRunner implements ApplicationRunner {

    private final ScadaSchedulerManager schedulerManager;

    @Value("${app.scheduler.auto-start:true}")
    private boolean autoStart;

    @Override
    public void run(ApplicationArguments args) {
        if (!autoStart) {
            log.info("자동 스케줄러 시작이 비활성화되어 있습니다.");
            return;
        }

        schedulerManager.startAllTasks();
        log.info("자동 스케줄러 시작 완료");
    }
}
