package com.thatsmine.dto.lost;

import com.thatsmine.dto.FoundItemListItemDTO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 유사 습득물 추천 한 건. 물품 정보는 공개 목록 카드와 같고(비공개 특징·습득자 정보 없음),
 * 점수는 "비슷한 정도"일 뿐 내 물건이라는 뜻이 아니다. 이유 문장으로 왜 추천했는지 보여준다.
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MatchedItemDTO {
    private FoundItemListItemDTO item;
    private int score;
    /** HIGH | MEDIUM | LOW */
    private String level;
    private String levelLabel;
    private List<String> reasons;
}
