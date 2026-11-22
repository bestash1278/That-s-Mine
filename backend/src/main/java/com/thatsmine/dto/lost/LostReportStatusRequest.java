package com.thatsmine.dto.lost;

import com.thatsmine.enums.LostReportStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class LostReportStatusRequest {
    @NotNull(message = "바꿀 상태를 선택해 주세요.")
    private LostReportStatus status;
}
