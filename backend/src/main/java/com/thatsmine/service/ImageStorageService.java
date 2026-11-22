package com.thatsmine.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

/**
 * 습득물·분실 신고 사진의 검사와 저장을 함께 쓴다.
 * - 장수(최대 3장)·용량(장당 5MB)·실제 파일 형식(매직 바이트)을 검사한다. 확장자나 Content-Type만 믿지 않는다.
 * - 파일명은 사용자가 보낸 이름을 쓰지 않고 UUID + 감지한 확장자로 만든다.
 * - 트랜잭션이 롤백되면 이번에 쓴 파일도 지운다(DB에 없는 고아 파일 방지).
 */
@Slf4j
@Service
public class ImageStorageService {

    public static final int MAX_IMAGES = 3;
    public static final long MAX_IMAGE_BYTES = 5L * 1024 * 1024;

    @Value("${file.upload-dir:uploads}")
    private String uploadDir;

    /** 비어 있는 파트를 뺀 실제 파일 목록 */
    public static List<MultipartFile> nonEmpty(List<MultipartFile> images) {
        return images == null ? List.of()
                : images.stream().filter(file -> file != null && !file.isEmpty()).toList();
    }

    /**
     * @param existingCount 수정 시 그대로 두는 기존 사진 수 (새로 등록이면 0)
     * @return 파일별로 감지한 형식("jpg" | "png" | "webp"). 오류는 errors["images"]에 넣는다.
     */
    public List<String> validate(List<MultipartFile> files, int existingCount, Map<String, String> errors) {
        List<String> detected = new ArrayList<>();
        if (files.size() + existingCount > MAX_IMAGES) {
            errors.put("images", "사진은 최대 " + MAX_IMAGES + "장까지 등록할 수 있습니다.");
            return detected;
        }
        for (MultipartFile file : files) {
            String name = file.getOriginalFilename() == null ? "사진" : file.getOriginalFilename();
            if (file.getSize() > MAX_IMAGE_BYTES) {
                errors.put("images", name + ": 사진은 한 장에 5MB 이하만 올릴 수 있습니다.");
                return detected;
            }
            String type = detectImageType(file);
            if (type == null) {
                errors.put("images", name + ": JPG, PNG, WebP 이미지 파일만 올릴 수 있습니다.");
                return detected;
            }
            detected.add(type);
        }
        return detected;
    }

    /** 파일을 저장하고 공개 URL(/uploads/...) 목록을 돌려준다. */
    public List<String> store(List<MultipartFile> files, List<String> types) {
        if (files.isEmpty()) {
            return List.of();
        }
        Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        List<Path> written = new ArrayList<>();
        List<String> urls = new ArrayList<>();
        try {
            Files.createDirectories(uploadPath);
            for (int i = 0; i < files.size(); i++) {
                String fileName = UUID.randomUUID() + "." + types.get(i);
                Path target = uploadPath.resolve(fileName).normalize();
                if (!target.startsWith(uploadPath)) {
                    throw new IllegalStateException("잘못된 저장 경로입니다.");
                }
                try (InputStream in = files.get(i).getInputStream()) {
                    Files.copy(in, target);
                }
                written.add(target);
                urls.add("/uploads/" + fileName);
            }
        } catch (IOException e) {
            deleteQuietly(written);
            log.error("이미지 저장 실패", e);
            throw new IllegalStateException("사진을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.", e);
        }
        deleteOnRollback(written);
        return urls;
    }

    private static void deleteOnRollback(List<Path> written) {
        if (written.isEmpty() || !TransactionSynchronizationManager.isSynchronizationActive()) {
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status == STATUS_ROLLED_BACK) {
                    deleteQuietly(written);
                }
            }
        });
    }

    private static void deleteQuietly(List<Path> paths) {
        for (Path path : paths) {
            try {
                Files.deleteIfExists(path);
            } catch (IOException ignored) {
                log.warn("업로드 파일 정리 실패: {}", path);
            }
        }
    }

    // ------------------------------------------------------------------ 형식 감지

    public static String detectImageType(MultipartFile file) {
        byte[] h;
        try (InputStream in = file.getInputStream()) {
            h = in.readNBytes(12);
        } catch (IOException e) {
            return null;
        }
        return detectImageType(h);
    }

    public static String detectImageType(byte[] h) {
        if (h.length >= 3 && (h[0] & 0xFF) == 0xFF && (h[1] & 0xFF) == 0xD8 && (h[2] & 0xFF) == 0xFF) {
            return "jpg";
        }
        if (h.length >= 8 && (h[0] & 0xFF) == 0x89 && h[1] == 'P' && h[2] == 'N' && h[3] == 'G'
                && h[4] == 0x0D && h[5] == 0x0A && h[6] == 0x1A && h[7] == 0x0A) {
            return "png";
        }
        if (h.length >= 12 && h[0] == 'R' && h[1] == 'I' && h[2] == 'F' && h[3] == 'F'
                && h[8] == 'W' && h[9] == 'E' && h[10] == 'B' && h[11] == 'P') {
            return "webp";
        }
        return null;
    }

    // ------------------------------------------------------------------ 수정 시 사진 정리

    /**
     * 수정 화면에서 보낸 사진 구성을 정리한다. (DB·파일과 무관한 계산이라 단위 테스트 가능)
     *
     * @param currentUrls       지금 저장된 사진 URL (순서대로)
     * @param keepUrls          남길 기존 사진. null이면 모두 남긴다(사진을 건드리지 않은 요청)
     * @param newCount          새로 올린 사진 수
     * @param representativeUrl 대표로 지정한 기존 사진 URL (없으면 null)
     * @param representativeNewIndex 대표로 지정한 새 사진의 순번 (없으면 null)
     * @return 남길 기존 사진, 지울 사진, 대표 사진 위치(남길 사진 뒤에 새 사진이 이어진다고 볼 때)
     */
    public static ImagePlan planUpdate(List<String> currentUrls, List<String> keepUrls, int newCount,
                                       String representativeUrl, Integer representativeNewIndex,
                                       Map<String, String> errors) {
        List<String> keep = new ArrayList<>();
        if (keepUrls == null) {
            keep.addAll(currentUrls);
        } else {
            for (String url : keepUrls) {
                if (!currentUrls.contains(url)) {
                    errors.put("images", "이미 삭제되었거나 이 신고의 사진이 아닌 사진이 포함되어 있습니다. 새로고침 후 다시 시도해 주세요.");
                    return new ImagePlan(List.of(), List.of(), 0);
                }
                if (!keep.contains(url)) {
                    keep.add(url);
                }
            }
        }
        List<String> remove = currentUrls.stream().filter(url -> !keep.contains(url)).toList();
        if (keep.size() + newCount > MAX_IMAGES) {
            errors.put("images", "사진은 최대 " + MAX_IMAGES + "장까지 등록할 수 있습니다.");
        }
        int thumbnail = 0;
        if (representativeUrl != null && keep.contains(representativeUrl)) {
            thumbnail = keep.indexOf(representativeUrl);
        } else if (representativeNewIndex != null && representativeNewIndex >= 0 && representativeNewIndex < newCount) {
            thumbnail = keep.size() + representativeNewIndex;
        }
        return new ImagePlan(keep, remove, thumbnail);
    }

    public record ImagePlan(List<String> keep, List<String> remove, int thumbnailIndex) {
    }
}
