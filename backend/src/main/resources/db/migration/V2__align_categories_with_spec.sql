-- V1에서 넣은 카테고리 6종이 명세(SPEC §7)와 달라서 명세 기준으로 맞춘다.
-- V1이 이미 적용된 DB와 새 DB 모두에서 같은 결과가 되도록 ID 기준으로 UPDATE 한다.
UPDATE categories SET category_name = '전자기기',  sort_order = 1 WHERE category_id = 1;
UPDATE categories SET category_name = '지갑·카드', sort_order = 2 WHERE category_id = 2;
UPDATE categories SET category_name = '열쇠',      sort_order = 3 WHERE category_id = 3;
UPDATE categories SET category_name = '의류·잡화', sort_order = 4 WHERE category_id = 4;
UPDATE categories SET category_name = '도서·문구', sort_order = 5 WHERE category_id = 5;
UPDATE categories SET category_name = '기타',      sort_order = 6 WHERE category_id = 6;

-- 검색 동의어 보강 (검색어가 term과 정확히 같을 때 canonical과 같은 canonical의 term들로 확장된다)
INSERT INTO search_synonyms (term, canonical) VALUES
('무선이어폰', '이어폰'),
('양산', '우산'),
('장우산', '우산'),
('접이식우산', '우산'),
('핸드폰', '스마트폰'),
('휴대폰', '스마트폰'),
('폰', '스마트폰'),
('키', '열쇠'),
('키링', '열쇠'),
('열쇠고리', '열쇠'),
('학생증케이스', '카드케이스'),
('보틀', '텀블러'),
('물병', '텀블러'),
('백팩', '가방'),
('에코백', '가방'),
('보조배터리', '배터리');
