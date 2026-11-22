package com.thatsmine.service;

import com.thatsmine.config.DemoDataSeeder;
import com.thatsmine.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 사용성 테스트 참여자마다 같은 초기 상태로 되돌린다 (dev 프로필 전용).
 * 카테고리와 검색 동의어(Flyway 관리)는 그대로 두고 나머지 데이터를 지운 뒤 다시 만든다.
 */
@Service
@Profile("dev")
@RequiredArgsConstructor
public class DemoResetService {

    private final UserRepository userRepository;
    private final CampusBuildingRepository campusBuildingRepository;
    private final StorageLocationRepository storageLocationRepository;
    private final FoundItemRepository foundItemRepository;
    private final FoundItemImageRepository foundItemImageRepository;
    private final LostReportRepository lostReportRepository;
    private final LostReportImageRepository lostReportImageRepository;
    private final ReturnRequestRepository returnRequestRepository;
    private final DemoDataSeeder demoDataSeeder;

    @Transactional
    public void resetDemoData() {
        // 외래키 순서대로 지운다.
        returnRequestRepository.deleteAllInBatch();
        foundItemImageRepository.deleteAllInBatch();
        foundItemRepository.deleteAllInBatch();
        lostReportImageRepository.deleteAllInBatch();
        lostReportRepository.deleteAllInBatch();
        storageLocationRepository.deleteAllInBatch();
        campusBuildingRepository.deleteAllInBatch();
        userRepository.deleteAllInBatch();

        demoDataSeeder.seedAll();
    }
}
