package com.scada.virtualizer.service;

import com.scada.virtualizer.repository.dto.equipment.MdDeviceStatus;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.LinkedList;

@Service
@Slf4j
public class ScadaMessagePushService {

    private final Queue<List<MdDeviceStatus>> deviceStatusQueue;
    private final SimpMessagingTemplate webSocket;

    public ScadaMessagePushService(SimpMessagingTemplate webSocket) {
        this.webSocket = webSocket;
        this.deviceStatusQueue = new ConcurrentLinkedQueue<>();
    }

    public void reportCtrlLoading(List<MdDeviceStatus> reportData) {

        this.deviceStatusQueue.offer(reportData);
    }

    @Scheduled(fixedRate = 1000) // 1초마다 실행
    public void taskService() {

        try {

            if (this.deviceStatusQueue.isEmpty())
                return;

            List<MdDeviceStatus> deviceStatusList = new LinkedList<>();

            while (!this.deviceStatusQueue.isEmpty()) {
                List<MdDeviceStatus> queueElements = this.deviceStatusQueue.poll();
                if (!(queueElements == null)) {
                    deviceStatusList.addAll(queueElements);
                }
            }
            // #endregion

            if (deviceStatusList.isEmpty())
                return;

            log.info("/topic/eqStatus : {}", deviceStatusList);

            this.webSocket.convertAndSend("/topic/eqStatus", deviceStatusList);

        } catch (Exception e) {

            log.error("" + e, e);
        }
    }
}
