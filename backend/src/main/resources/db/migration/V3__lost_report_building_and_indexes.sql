-- 9단계: 분실 신고
-- 1) 대표 추정 위치로 고른 교내 건물(선택). 지도에서 정확한 지점을 찍지 않았으면 이 건물 좌표로 표시한다.
--    (습득물의 found_building_id와 같은 방식)
-- 2) 분실 신고 지도 조회·유사 물품 추천에서 쓰는 날짜·좌표 인덱스

ALTER TABLE lost_reports ADD COLUMN lost_building_id BIGINT NULL AFTER category_id;
ALTER TABLE lost_reports
    ADD CONSTRAINT fk_lost_reports_building FOREIGN KEY (lost_building_id) REFERENCES campus_buildings(building_id);

CREATE INDEX idx_lost_reports_lost_date ON lost_reports(lost_date);
CREATE INDEX idx_lost_reports_coords ON lost_reports(lost_latitude, lost_longitude);
CREATE INDEX idx_lost_reports_building ON lost_reports(lost_building_id);
