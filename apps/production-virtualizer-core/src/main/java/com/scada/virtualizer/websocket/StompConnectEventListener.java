package com.scada.virtualizer.websocket;

import com.scada.virtualizer.repository.dto.equipment.MdDeviceStatus;
import com.scada.virtualizer.service.ScadaBizService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class StompConnectEventListener {
    private final SimpMessagingTemplate messagingTemplate;
    private final ScadaBizService scadaBizService;

    @EventListener
    public void handleWebSocketSubscribeListener(SessionSubscribeEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = accessor.getSessionId();
        log.info("[WebSocket] Subscribed: sessionId={}", sessionId);
        List<MdDeviceStatus> list = scadaBizService.getDeviceStatusAllList();
        log.info("[WebSocket] Subscribed: list={}", list);
        messagingTemplate.convertAndSend("/topic/eqStatusAll", list);
    }
}
