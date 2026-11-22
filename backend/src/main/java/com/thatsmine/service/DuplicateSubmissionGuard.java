package com.thatsmine.service;

import org.springframework.stereotype.Component;

import java.util.concurrent.locks.ReentrantLock;
import java.util.function.Supplier;

/**
 * 같은 사용자의 신고 등록 요청을 한 번에 하나씩만 처리하게 한다(SPEC §23 중복 신고 제출 방지).
 *
 * <p>"같은 내용의 신고가 최근에 있는지" 검사만으로는 두 요청이 동시에 들어오면 둘 다 검사를 통과한다.
 * 그래서 사용자별 잠금 안에서 검사 → 저장 → 커밋까지 끝낸 뒤 다음 요청이 검사하게 한다.
 * 호출하는 쪽(컨트롤러)이 {@code @Transactional} 서비스 호출 전체를 이 안에서 실행해야, 커밋이 끝난 뒤 잠금이 풀린다.
 *
 * <p>잠금은 서버 한 대(JVM) 안에서만 유효하다. 여러 대로 늘리면 DB 쪽 제약이나 분산 잠금이 필요하다.
 */
@Component
public class DuplicateSubmissionGuard {

    private static final int STRIPES = 64;
    private final ReentrantLock[] locks = new ReentrantLock[STRIPES];

    public DuplicateSubmissionGuard() {
        for (int i = 0; i < STRIPES; i++) {
            locks[i] = new ReentrantLock();
        }
    }

    public <T> T runExclusive(Long userId, Supplier<T> action) {
        ReentrantLock lock = locks[Math.floorMod(userId == null ? 0 : userId.hashCode(), STRIPES)];
        lock.lock();
        try {
            return action.get();
        } finally {
            lock.unlock();
        }
    }
}
