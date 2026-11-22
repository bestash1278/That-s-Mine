package com.thatsmine.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("이미지 실제 형식(매직 바이트) 판별")
class ImageTypeDetectionTest {

    @Test
    void jpeg() {
        byte[] h = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0, 0, 0, 0, 0, 0, 0};
        assertThat(ImageStorageService.detectImageType(h)).isEqualTo("jpg");
    }

    @Test
    void png() {
        byte[] h = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0};
        assertThat(ImageStorageService.detectImageType(h)).isEqualTo("png");
    }

    @Test
    void webp() {
        byte[] h = "RIFF\0\0\0\0WEBP".getBytes(StandardCharsets.ISO_8859_1);
        assertThat(ImageStorageService.detectImageType(h)).isEqualTo("webp");
    }

    @Test
    @DisplayName("확장자만 이미지인 텍스트 파일은 거부")
    void textFileRejected() {
        byte[] h = "hello world!".getBytes(StandardCharsets.UTF_8);
        assertThat(ImageStorageService.detectImageType(h)).isNull();
    }

    @Test
    @DisplayName("RIFF지만 WebP가 아닌 파일(WAV 등)은 거부")
    void riffButNotWebp() {
        byte[] h = "RIFF\0\0\0\0WAVE".getBytes(StandardCharsets.ISO_8859_1);
        assertThat(ImageStorageService.detectImageType(h)).isNull();
    }

    @Test
    void tooShort() {
        assertThat(ImageStorageService.detectImageType(new byte[]{(byte) 0xFF})).isNull();
    }
}
