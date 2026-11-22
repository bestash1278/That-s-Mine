package com.thatsmine.controller;

import com.thatsmine.enums.UserRole;
import com.thatsmine.service.DemoResetService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/dev")
@Profile({"dev", "demo"})
@RequiredArgsConstructor
public class DevController {

    private final DemoResetService demoResetService;

    @PostMapping("/reset-demo")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> resetDemoData() {
        demoResetService.resetDemoData();
        Map<String, String> response = new HashMap<>();
        response.put("message", "시연 데이터가 초기화되었습니다.");
        return ResponseEntity.ok(response);
    }
}
