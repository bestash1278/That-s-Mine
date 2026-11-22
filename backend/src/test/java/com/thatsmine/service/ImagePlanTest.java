package com.thatsmine.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("수정 시 사진 구성 정리")
class ImagePlanTest {

    private static final List<String> CURRENT = List.of("/uploads/a.jpg", "/uploads/b.jpg");

    @Test
    @DisplayName("keepImageUrls가 없으면 기존 사진을 모두 남김")
    void keepAllWhenNull() {
        Map<String, String> errors = new HashMap<>();
        var plan = ImageStorageService.planUpdate(CURRENT, null, 0, null, null, errors);
        assertThat(errors).isEmpty();
        assertThat(plan.keep()).containsExactlyElementsOf(CURRENT);
        assertThat(plan.remove()).isEmpty();
        assertThat(plan.thumbnailIndex()).isZero();
    }

    @Test
    @DisplayName("하나를 지우고 새 사진을 대표로 지정")
    void removeOneAndNewRepresentative() {
        Map<String, String> errors = new HashMap<>();
        var plan = ImageStorageService.planUpdate(CURRENT, List.of("/uploads/b.jpg"), 2, null, 1, errors);
        assertThat(errors).isEmpty();
        assertThat(plan.keep()).containsExactly("/uploads/b.jpg");
        assertThat(plan.remove()).containsExactly("/uploads/a.jpg");
        assertThat(plan.thumbnailIndex()).isEqualTo(2); // 남긴 1장 뒤 새 사진 중 두 번째
    }

    @Test
    @DisplayName("남긴 기존 사진을 대표로 지정")
    void existingRepresentative() {
        Map<String, String> errors = new HashMap<>();
        var plan = ImageStorageService.planUpdate(CURRENT, CURRENT, 0, "/uploads/b.jpg", null, errors);
        assertThat(plan.thumbnailIndex()).isEqualTo(1);
    }

    @Test
    @DisplayName("합쳐서 3장을 넘으면 오류")
    void tooMany() {
        Map<String, String> errors = new HashMap<>();
        ImageStorageService.planUpdate(CURRENT, CURRENT, 2, null, null, errors);
        assertThat(errors).containsKey("images");
    }

    @Test
    @DisplayName("이 신고의 사진이 아닌 URL은 거부")
    void foreignUrl() {
        Map<String, String> errors = new HashMap<>();
        ImageStorageService.planUpdate(CURRENT, List.of("/uploads/other.jpg"), 0, null, null, errors);
        assertThat(errors).containsKey("images");
    }
}
