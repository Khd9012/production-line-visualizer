package com.scada.virtualizer.manager;

import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.*;

@Slf4j
@Component
public class ScadaSchedulerManager {

    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(5);

    // 등록된 작업 정보 (실제 실행 전)
    private final Map<String, TaskInfo> taskInfos = new ConcurrentHashMap<>();
    // 실행 중인 작업 Future 관리
    private final Map<String, ScheduledFuture<?>> runningTasks = new ConcurrentHashMap<>();

    /**
     * 반복 실행할 작업을 등록만 함 (시작 X)
     */
    public void registerTask(String key, Runnable task, long periodMillis) {
        if (taskInfos.containsKey(key)) {
            log.warn("이미 등록된 작업이 있음: key={}", key);
            return;
        }
        taskInfos.put(key, new TaskInfo(task, periodMillis));
        log.info("작업 등록 완료(아직 실행 안됨): key={}, period={}ms", key, periodMillis);
    }

    /**
     * 등록된 작업을 실행
     */
    public void startTask(String key) {
        if (!taskInfos.containsKey(key)) {
            log.warn("등록되지 않은 작업 실행 시도: key={}", key);
            return;
        }
        if (runningTasks.containsKey(key)) {
            log.warn("이미 실행 중인 작업: key={}", key);
            return;
        }
        TaskInfo info = taskInfos.get(key);
        ScheduledFuture<?> future = scheduler.scheduleAtFixedRate(info.task, 0, info.periodMillis, TimeUnit.MILLISECONDS);
        runningTasks.put(key, future);
        log.info("작업 실행 시작: key={}", key);
    }

    /**
     * 등록된 모든 작업 실행 (아직 실행 안 된 것만)
     */
    public void startAllTasks() {
        for (String key : taskInfos.keySet()) {
            if (!runningTasks.containsKey(key)) {
                startTask(key);
            }
        }
        log.info("모든 등록된 작업 실행 완료");
    }

    /**
     * 특정 작업 중지
     */
    public void stopTask(String key) {
        ScheduledFuture<?> future = runningTasks.remove(key);
        if (future != null) {
            future.cancel(false);
            log.info("작업 중지 완료: key={}", key);
        } else {
            log.warn("중지할 실행 중인 작업을 찾을 수 없음: key={}", key);
        }
    }

    /**
     * 등록된 작업 목록 조회
     */
    public String getRegisteredTaskKeys() {
        return String.join(", ", taskInfos.keySet());
    }

    /**
     * 실행 중인 작업 목록 조회
     */
    public String getRunningTaskKeys() {
        return String.join(", ", runningTasks.keySet());
    }

    @PreDestroy
    public void shutdown() {
        scheduler.shutdown();
        log.info("스케줄러 매니저 종료됨");
    }

    /**
     * 작업 정보 보관용 내부 클래스
     */
    private static class TaskInfo {
        final Runnable task;
        final long periodMillis;

        TaskInfo(Runnable task, long periodMillis) {
            this.task = task;
            this.periodMillis = periodMillis;
        }
    }
}
