package com.thatsmine.config;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * 프론트(React Router)의 화면 주소를 새로 고치거나 직접 입력했을 때 404가 나지 않도록 index.html로 보낸다.
 * 프론트 빌드 결과를 Spring Boot가 함께 제공하는 단일 서비스 배포용이다.
 *
 * <ul>
 *   <li>/api/**, /uploads/** 는 제외한다(없는 API가 HTML로 응답하면 안 된다).</li>
 *   <li>점이 들어간 경로(/assets/app.js, /favicon.svg 등 파일 요청)는 제외한다. 없는 파일은 그대로 404.</li>
 *   <li>실제 API·정적 파일 매핑이 이 패턴보다 구체적이라 먼저 처리된다. 화면 경로는 최대 4단계(예: /mypage/lost-reports/3/edit).</li>
 * </ul>
 */
@Controller
public class SpaForwardController {

    private static final String SEG = "[^\\.]*";
    private static final String FIRST = "(?!api$|uploads$)" + SEG;

    @GetMapping({
            "/",
            "/{a:" + FIRST + "}",
            "/{a:" + FIRST + "}/{b:" + SEG + "}",
            "/{a:" + FIRST + "}/{b:" + SEG + "}/{c:" + SEG + "}",
            "/{a:" + FIRST + "}/{b:" + SEG + "}/{c:" + SEG + "}/{d:" + SEG + "}"
    })
    public String forwardToIndex() {
        return "forward:/index.html";
    }
}
