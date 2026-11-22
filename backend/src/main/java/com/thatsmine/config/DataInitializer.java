package com.thatsmine.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * dev·demo 프로필로 처음 실행할 때(DB에 시연 데이터가 아직 없을 때만) 시연 데이터를 만든다. 운영(기본) 프로필에서는 동작하지 않는다.
 * 실제 데이터 내용은 {@link DemoDataSeeder}에 있다.
 */
@Slf4j
@Component
@Profile({"dev", "demo"})
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final DemoDataSeeder demoDataSeeder;

    @Override
    @Transactional
    public void run(String... args) {
        if (demoDataSeeder.isSeeded()) {
            log.info("시연 데이터가 이미 있어 초기화를 건너뜁니다.");
            return;
        }
        demoDataSeeder.seedAll();
        log.info("시연 데이터를 만들었습니다. 계정: {}, {} (비밀번호는 demo.account-password)",
                DemoDataSeeder.ADMIN_EMAIL, DemoDataSeeder.USER1_EMAIL);
    }
}
