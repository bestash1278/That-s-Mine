package com.thatsmine.dto.returns;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 반환 신청 입력. 물건 주인만 알 만한 특징을 적게 하고, 필수 여부·길이는 서비스에서 검증한다
 * (오류를 항목별 fieldErrors로 돌려주기 위해).
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateReturnRequestRequest {
    /** 소유 확인 특징(필수). 담당자만 본다 */
    private String ownershipDescription;
    /** 추가 설명(선택). 소유 확인 특징 뒤에 이어 저장한다 */
    private String additionalNote;
}
