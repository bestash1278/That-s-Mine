package com.thatsmine.config;

import org.springframework.context.annotation.Configuration;

/**
 * ObjectMapper는 Spring Boot 자동 설정을 그대로 사용한다.
 *
 * 이전에는 여기서 {@code new ObjectMapper()}를 빈으로 등록했는데, 이 경우 JavaTimeModule이 빠져
 * LocalDate/LocalTime 직렬화·역직렬화가 실패한다(모든 습득물 응답이 500).
 * 설정이 더 필요하면 Jackson2ObjectMapperBuilderCustomizer 빈으로 추가한다.
 */
@Configuration
public class JacksonConfig {
}
