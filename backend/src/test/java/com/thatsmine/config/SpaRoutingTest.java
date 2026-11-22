package com.thatsmine.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.forwardedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 단일 서비스 배포: 프론트 빌드 결과(static/index.html)를 같이 제공하고, 화면 주소를 새로 고쳐도 404가 나지 않아야 한다.
 * 테스트용 index.html은 src/test/resources/static 에 있다.
 */
@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
@DisplayName("화면 경로(SPA) 라우팅")
class SpaRoutingTest {

    @Autowired
    private MockMvc mockMvc;

    @ParameterizedTest(name = "{0} 을 새로 고쳐도 index.html로 간다(로그인 없이)")
    @ValueSource(strings = {
            "/", "/items", "/items/12", "/map", "/login", "/signup", "/report-found", "/report-found/preview",
            "/report-found/complete/9", "/report-lost/complete/3", "/lost-reports/5", "/mypage", "/mypage/lost-reports/3/edit",
            "/mypage/found-items/7/edit", "/return-request/4", "/admin", "/nothing-here"
    })
    void screenPathsForwardToIndex(String path) throws Exception {
        mockMvc.perform(get(path))
                .andExpect(status().isOk())
                .andExpect(forwardedUrl("/index.html"));
    }

    @Test
    @DisplayName("index.html과 정적 파일은 로그인 없이 제공된다")
    void indexIsServed() throws Exception {
        mockMvc.perform(get("/index.html"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("<div id=\"root\">")));
    }

    @Test
    @DisplayName("없는 API는 HTML이 아니라 JSON 오류로 응답한다(index.html로 보내지 않음)")
    void unknownApiIsNotForwarded() throws Exception {
        mockMvc.perform(get("/api/v1/does/not/exist"))
                .andExpect(status().isUnauthorized())
                .andExpect(forwardedUrl(null))
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    @DisplayName("실제 API는 그대로 동작한다")
    void realApiStillWorks() throws Exception {
        mockMvc.perform(get("/api/v1/categories")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("없는 파일(점이 있는 경로)과 없는 업로드는 404 — index.html을 돌려주지 않는다")
    void missingFilesAre404() throws Exception {
        mockMvc.perform(get("/assets/missing.js")).andExpect(status().isNotFound()).andExpect(forwardedUrl(null));
        mockMvc.perform(get("/uploads/missing.png")).andExpect(status().isNotFound()).andExpect(forwardedUrl(null));
    }

    @Test
    @DisplayName("화면 경로로의 POST는 열리지 않는다(GET만 화면)")
    void postToScreenPathIsNotAllowed() throws Exception {
        mockMvc.perform(post("/items")).andExpect(status().is4xxClientError());
    }
}
