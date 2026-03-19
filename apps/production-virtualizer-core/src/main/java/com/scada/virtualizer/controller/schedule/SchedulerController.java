package com.scada.virtualizer.controller.schedule;

import com.scada.virtualizer.manager.ScadaSchedulerManager;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/scheduler")
public class SchedulerController {

    private final ScadaSchedulerManager schedulerManager;

    @PostMapping("/run-all")
    public ResponseEntity<String> runAllTasks() {
        schedulerManager.startAllTasks();
        return ResponseEntity.ok("모든 스케줄러 작업 실행 완료");
    }

    @PostMapping("/run/{key}")
    public ResponseEntity<String> runTask(@PathVariable String key) {
        schedulerManager.startTask(key);
        return ResponseEntity.ok("작업 실행 요청 완료: " + key);
    }

    @GetMapping("/list")
    public ResponseEntity<String> listTasks() {
        return ResponseEntity.ok("등록된 키워드 목록: " + schedulerManager.getRegisteredTaskKeys());
    }

    @GetMapping("/running")
    public ResponseEntity<String> listRunningTasks() {
        return ResponseEntity.ok("실행 중인 작업 목록: " + schedulerManager.getRunningTaskKeys());
    }

    @PostMapping("/stop/{key}")
    public ResponseEntity<String> stopTask(@PathVariable String key) {
        schedulerManager.stopTask(key);
        return ResponseEntity.ok("작업 중지 요청 완료: " + key);
    }
}