package com.scada.virtualizer.config.dataSource;

import com.scada.virtualizer.repository.mapper.HealthCheckMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@RequiredArgsConstructor
@Component
public class MyBatisDbHealthCheck {

    private final HealthCheckMapper healthCheckMapper;

    public boolean isDatabaseAlive() {
        try {
            Integer result = healthCheckMapper.selectOne();
            log.info("✅ MyBatis를 통한 MSSQL 쿼리 성공! 결과: " + result);
            return true;
        } catch (Exception e) {
            log.error("❌ MyBatis로 MSSQL 연결 실패: " + e.getMessage());
            return false;
        }
    }
}