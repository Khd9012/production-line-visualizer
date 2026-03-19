package com.scada.virtualizer.config.dataSource;

import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;

@Configuration
public class DataSourceConfig {

    // inside 데이터소스 프로퍼티 바인딩
    @Bean
    @Primary
    @ConfigurationProperties("spring.datasource")
    public DataSourceProperties insideDataSourceProperties() {
        return new DataSourceProperties();
    }

    // inside 데이터소스
    @Bean(name = "insideDataSource")
    @Primary
    @ConfigurationProperties("spring.datasource.hikari")
    public DataSource insideDataSource() {
        return insideDataSourceProperties().initializeDataSourceBuilder().build();
    }

}
