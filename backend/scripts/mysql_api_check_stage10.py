"""10단계(반환 신청 + 관리자) API 점검. MySQL에 dev 프로필로 띄운 서버(localhost:8080)에 실제 HTTP 요청을 보낸다.

사용: python -I backend/scripts/mysql_api_check_stage10.py
시연 계정(admin@demo.local, user1@demo.local, user2@demo.local / demo1234!)이 있는 dev 서버가 필요하다.
실행할 때마다 시연 데이터를 바꾸므로(승인·반환 완료 등) 끝나면 /dev/reset-demo 로 초기화한다.
"""
import io
import json
import sys
import threading
import urllib.error
import urllib.request
import uuid

B = "http://localhost:8080/api/v1"
res = []

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def call(method, path, token=None, body=None):
    headers = {}
    data = None
    if token:
        headers["Authorization"] = "Bearer " + token
    if body is not None:
        headers["Content-Type"] = "application/json; charset=utf-8"
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(B + path, data=data, headers=headers, method=method)
    try:
        r = urllib.request.urlopen(req)
        code, txt = r.status, r.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        code, txt = e.code, e.read().decode("utf-8")
    try:
        js = json.loads(txt)
    except Exception:
        js = {}
    return code, js


def chk(name, got, exp, extra=""):
    ok = got == exp
    res.append(ok)
    print(("PASS " if ok else "FAIL ") + name + ("" if ok else f" (expected {exp!r}, got {got!r}) {extra}"))


def login(email, pw="demo1234!"):
    c, j = call("POST", "/auth/login", body={"email": email, "password": pw})
    return j["data"]["accessToken"]


def rows(j):
    d = j.get("data", [])
    return d.get("content", []) if isinstance(d, dict) else d


def find_item(token, title, status=None):
    c, j = call("GET", "/admin/found-items?size=50&keyword=" + urllib.request.quote(title), token)
    for x in rows(j):
        if x["title"] == title and (status is None or x["status"] == status):
            return x
    return None


ta, t1, t2 = login("admin@demo.local"), login("user1@demo.local"), login("user2@demo.local")
# 새 일반 사용자(신청자 3)
em = f"ret{uuid.uuid4().hex[:6]}@demo.local"
c, j = call("POST", "/auth/signup", body={"email": em, "password": "abcd1234", "passwordConfirm": "abcd1234", "nickname": "신청자3"})
t3 = j["data"]["accessToken"]

print("== 권한")
for m, p in [("GET", "/admin/found-items"), ("GET", "/admin/lost-reports"), ("GET", "/admin/return-requests"),
             ("GET", "/admin/storage-locations")]:
    chk(f"비로그인 {p} 401", call(m, p)[0], 401)
    chk(f"일반 사용자 {p} 403", call(m, p, t2)[0], 403)
    chk(f"관리자 {p} 200", call(m, p, ta)[0], 200)
chk("일반 사용자 반환 처리 403", call("PATCH", "/admin/return-requests/1/status", t2, {"status": "APPROVED"})[0], 403)
chk("일반 사용자 건물 등록 403", call("POST", "/admin/campus-buildings", t2, {"buildingName": "x", "latitude": 37, "longitude": 127})[0], 403)
chk("비로그인 반환 신청 401", call("POST", "/found-items/1/return-requests", None, {"ownershipDescription": "abcde"})[0], 401)

print("== 반환 신청 (신청자)")
pouch = find_item(ta, "파란색 파우치", "STORED")
iid = pouch["itemId"]
c, j = call("GET", f"/found-items/{iid}/return-requests/me", t2)
chk("신청 가능 조회", (c, j["data"]["canRequest"]), (200, True), j)
c, j = call("GET", f"/found-items/{iid}/return-requests/me", t1)
chk("신고자 본인은 신청 불가 안내", (c, j["data"]["canRequest"], bool(j["data"].get("blockReason"))), (200, False, True), j)
c, j = call("POST", f"/found-items/{iid}/return-requests", t1, {"ownershipDescription": "내 물건입니다 확실해요"})
chk("신고자 본인 신청 409", c, 409, j)
c, j = call("POST", f"/found-items/{iid}/return-requests", t2, {"ownershipDescription": ""})
chk("특징 비움 400 + fieldErrors", (c, "ownershipDescription" in j.get("fieldErrors", {})), (400, True), j)
c, j = call("POST", f"/found-items/{iid}/return-requests", t2, {"ownershipDescription": "abc"})
chk("특징 너무 짧음 400", c, 400)
c, j = call("POST", f"/found-items/{iid}/return-requests", t2, {"ownershipDescription": "안쪽 주머니에 노란 스티커", "additionalNote": "목요일 도서관에서 잃어버림"})
chk("정상 신청 201", c, 201, j)
r2 = j["data"]["requestId"]
chk("신청 상태 PENDING", j["data"]["status"], "PENDING")
c, j = call("POST", f"/found-items/{iid}/return-requests", t2, {"ownershipDescription": "안쪽 주머니에 노란 스티커"})
chk("같은 사람 중복 신청 409", c, 409, j)
c, j = call("GET", f"/found-items/{iid}/return-requests/me", t2)
chk("내 신청 조회", (j["data"]["canRequest"], j["data"]["myRequest"]["requestId"]), (False, r2))
c, j = call("POST", f"/found-items/{iid}/return-requests", t3, {"ownershipDescription": "지퍼 손잡이가 빨강색"})
chk("다른 사람 신청(대기 중 복수 허용) 201", c, 201, j)
r3 = j["data"]["requestId"]
c, j = call("GET", f"/found-items/{iid}")
txt = json.dumps(j, ensure_ascii=False)
chk("공개 상세에 신청자 설명·비공개 특징 없음", ("노란 스티커" in txt) or ("지퍼 손잡이" in txt), False)
chk("공개 상세에 비공개 특징 필드 없음", "privateFeatures" in txt, False)
c, j = call("PATCH", f"/return-requests/{r3}/cancel", t2)
chk("타인 신청 취소 403", c, 403)
c, j = call("DELETE", f"/found-items/{iid}", t1)
chk("반환 신청 접수 후 신고자 삭제 409", c, 409, j)

print("== 관리자 처리")
c, j = call("GET", "/admin/return-requests?status=PENDING", ta)
mine = [x for x in rows(j) if x["requestId"] in (r2, r3)]
chk("관리자 목록에 대기 신청 2건", len(mine), 2)
x2 = next(x for x in mine if x["requestId"] == r2)
chk("관리자 DTO: 신청자 설명·비공개 특징·다음 처리", (x2["ownershipDescription"].startswith("안쪽 주머니"), bool(x2.get("itemPrivateFeatures")), x2["allowedNext"]),
    (True, True, ["APPROVED", "REJECTED"]), x2)
c, j = call("PATCH", f"/admin/return-requests/{r2}/status", ta, {"status": "REJECTED"})
chk("반려 사유 없으면 400", (c, "comment" in j.get("fieldErrors", {})), (400, True), j)
c, j = call("PATCH", f"/admin/return-requests/{r2}/status", ta, {"status": "CANCELLED"})
chk("관리자가 취소 상태로 못 바꿈 400", c, 400)
c, j = call("PATCH", f"/admin/return-requests/{r2}/status", ta, {"status": "COMPLETED"})
chk("대기→반환 완료 409", c, 409, j)
c, j = call("PATCH", f"/admin/return-requests/{r2}/status", ta, {"status": "APPROVED", "comment": "소유 확인됨"})
chk("승인 200", (c, j["data"]["status"], j["data"]["itemStatus"]), (200, "APPROVED", "RETURN_PENDING"), j)
c, j = call("PATCH", f"/admin/return-requests/{r3}/status", ta, {"status": "APPROVED"})
chk("같은 물품 두 번째 승인 409(중복 반환 방지)", c, 409, j)
c, j = call("POST", f"/found-items/{iid}/return-requests", t3, {"ownershipDescription": "다시 신청해 봅니다"})
chk("반환 진행 중 물품 신규 신청 409", c, 409, j)
c, j = call("PATCH", f"/return-requests/{r2}/cancel", t2)
chk("승인된 신청 사용자 취소 409", c, 409, j)
c, j = call("PATCH", f"/admin/found-items/{iid}/status", ta, {"status": "HIDDEN"})
chk("반환 진행 중 물품 숨김 409", c, 409, j)
c, j = call("PATCH", f"/admin/return-requests/{r2}/status", ta, {"status": "REJECTED", "comment": "확인 결과 다른 분 물건"})
chk("승인 철회(반려) → 물품 보관 중 복귀", (c, j["data"]["itemStatus"]), (200, "STORED"), j)
c, j = call("PATCH", f"/admin/return-requests/{r3}/status", ta, {"status": "APPROVED"})
chk("복귀 후 다른 신청 승인 200", (c, j["data"]["itemStatus"]), (200, "RETURN_PENDING"), j)
c, j = call("PATCH", f"/admin/return-requests/{r3}/status", ta, {"status": "COMPLETED", "comment": "학생지원팀에서 수령"})
chk("반환 완료 → 물품 RETURNED", (c, j["data"]["itemStatus"], j["data"]["status"]), (200, "RETURNED", "COMPLETED"), j)
c, j = call("PATCH", f"/admin/return-requests/{r3}/status", ta, {"status": "REJECTED", "comment": "x"})
chk("완료된 신청 재처리 409", c, 409)
c, j = call("GET", "/users/me/return-requests", t3)
chk("신청자 마이페이지에 완료 + 메모", (rows(j)[0]["status"], rows(j)[0]["reviewComment"]), ("COMPLETED", "학생지원팀에서 수령"))
c, j = call("POST", f"/found-items/{iid}/return-requests", t2, {"ownershipDescription": "이미 반환된 물품"})
chk("반환 완료 물품 신청 409", c, 409)

print("== 반환 완료 시 남은 대기 신청 자동 반려")
bag = find_item(ta, "회색 가방", "STORED")
bid = bag["itemId"]
c, j = call("POST", f"/found-items/{bid}/return-requests", t2, {"ownershipDescription": "앞주머니 우산 고리"})
ra = j["data"]["requestId"]
c, j = call("POST", f"/found-items/{bid}/return-requests", t3, {"ownershipDescription": "노트북 칸 교재 있음"})
rb = j["data"]["requestId"]
call("PATCH", f"/admin/return-requests/{ra}/status", ta, {"status": "APPROVED"})
call("PATCH", f"/admin/return-requests/{ra}/status", ta, {"status": "COMPLETED"})
c, j = call("GET", "/users/me/return-requests", t3)
other = next(x for x in rows(j) if x["requestId"] == rb)
chk("남은 신청 자동 반려 + 사유", (other["status"], bool(other.get("reviewComment"))), ("REJECTED", True), other)

print("== 신청 취소")
tumbler = find_item(ta, "파란색 텀블러", "STORED")
c, j = call("POST", f"/found-items/{tumbler['itemId']}/return-requests", t2, {"ownershipDescription": "뚜껑에 스티커"})
rc = j["data"]["requestId"]
c, j = call("PATCH", f"/return-requests/{rc}/cancel", t2)
chk("대기 중 신청 취소 200", (c, j["data"]["status"]), (200, "CANCELLED"), j)
c, j = call("PATCH", f"/return-requests/{rc}/cancel", t2)
chk("이미 취소된 신청 재취소 409", c, 409)
c, j = call("POST", f"/found-items/{tumbler['itemId']}/return-requests", t2, {"ownershipDescription": "뚜껑에 스티커 다시"})
chk("취소 후 다시 신청 201", c, 201, j)

print("== 신청 대상 아님")
c, j = call("GET", "/admin/found-items?status=REPORTED&size=50", ta)
nonrep = next(x for x in rows(j) if x["custodyType"] == "PENDING_HANDOVER")
c, j = call("POST", f"/found-items/{nonrep['itemId']}/return-requests", t2, {"ownershipDescription": "보관 전 물품 신청"})
chk("보관 장소 미확정 물품 신청 409", c, 409, j)
temp = next((x for x in rows(call("GET", "/admin/found-items?status=REPORTED&size=50", ta)[1]) if x["custodyType"] == "TEMPORARY"), None)
c, j = call("POST", f"/found-items/{temp['itemId']}/return-requests", t2, {"ownershipDescription": "카드 칸에 학생증"})
chk("임시 보관(TEMPORARY) 물품 신청 201", c, 201, j)

print("== 동시 신청·승인 (중복 반환 방지)")
umb = find_item(ta, "남색 접이식 우산", "STORED")
uid = umb["itemId"]
tokens = [t2, t3]
results = {}


def go(k, tk):
    results[k] = call("POST", f"/found-items/{uid}/return-requests", tk, {"ownershipDescription": f"우산 손잡이 특징 {k}"})[0]


# 같은 사용자가 동시에 두 번 제출
ths = [threading.Thread(target=go, args=(f"a{i}", t2)) for i in range(4)]
[t.start() for t in ths]
[t.join() for t in ths]
chk("같은 사용자 동시 4회 제출 → 신청 1건만 생성", sorted(results.values()), [201, 409, 409, 409], results)
c, j = call("POST", f"/found-items/{uid}/return-requests", t3, {"ownershipDescription": "우산 끈 색이 다름"})
ru3 = j["data"]["requestId"]
c, j = call("GET", "/admin/return-requests?status=PENDING&size=50", ta)
ru2 = next(x["requestId"] for x in rows(j) if x["itemId"] == uid and x["requesterNickname"] != "신청자3")
res_ap = {}


def approve(k, rid):
    res_ap[k] = call("PATCH", f"/admin/return-requests/{rid}/status", ta, {"status": "APPROVED"})[0]


ths = [threading.Thread(target=approve, args=("x", ru2)), threading.Thread(target=approve, args=("y", ru3))]
[t.start() for t in ths]
[t.join() for t in ths]
chk("서로 다른 두 신청 동시 승인 → 하나만 성공", sorted(res_ap.values()), [200, 409], res_ap)
c, j = call("GET", "/admin/found-items?keyword=" + urllib.request.quote("남색 접이식 우산"), ta)
chk("물품은 RETURN_PENDING", rows(j)[0]["status"], "RETURN_PENDING")
c, j = call("GET", "/admin/return-requests?status=APPROVED&size=50", ta)
chk("해당 물품 승인 신청은 정확히 1건", len([x for x in rows(j) if x["itemId"] == uid]), 1)

print("== 습득물 관리(관리자)")
c, j = call("GET", "/admin/found-items?status=HIDDEN", ta)
chk("관리자 목록 상태 필터", c, 200)
phone = find_item(ta, "스마트폰", "STORED")
pid = phone["itemId"]
chk("DTO에 허용 상태 목록", sorted(phone["allowedStatuses"]), ["HIDDEN", "REPORTED"], phone)
c, j = call("PATCH", f"/admin/found-items/{pid}/status", ta, {"status": "HIDDEN"})
chk("부적절 신고 숨김 200", (c, j["data"]["status"]), (200, "HIDDEN"), j)
c, j = call("GET", f"/found-items/{pid}")
chk("숨김 물품 공개 상세 404", c, 404)
c, j = call("GET", "/found-items?size=50&keyword=" + urllib.request.quote("스마트폰"))
chk("숨김 물품 공개 목록 제외", len(rows(j)), 0)
c, j = call("PATCH", f"/admin/found-items/{pid}/status", ta, {"status": "HIDDEN"})
chk("같은 상태로 변경 409", c, 409)
c, j = call("PATCH", f"/admin/found-items/{pid}/status", ta, {"status": "RETURNED"})
chk("관리자가 직접 반환 완료로 못 바꿈 409", c, 409)
c, j = call("PATCH", f"/admin/found-items/{pid}/status", ta, {"status": "NOPE"})
chk("잘못된 상태값 400", c, 400)
c, j = call("PATCH", f"/admin/found-items/{pid}/status", ta, {"status": "STORED"})
chk("숨김 해제(보관 중 복귀) 200", (c, j["data"]["status"]), (200, "STORED"), j)

pb = find_item(ta, "흰색 보조배터리", "REPORTED")
c, j = call("PATCH", f"/admin/found-items/{pb['itemId']}/status", ta, {"status": "STORED"})
chk("보관 장소 없이 '보관 중' 변경 409", c, 409, j)
c, j = call("GET", "/storage-locations")
sid = j["data"][0]["storageId"]
c, j = call("PATCH", f"/admin/found-items/{pb['itemId']}/storage", ta, {"custodyType": "HANDED_OVER", "storageId": sid, "storageLocationDetail": "2번 창구"})
chk("보관 위치 지정 → 상태 STORED 자동", (c, j["data"]["status"], j["data"]["custodyType"], j["data"]["storageInfo"]["storageId"]), (200, "STORED", "HANDED_OVER", sid), j)
c, j = call("PATCH", f"/admin/found-items/{pb['itemId']}/storage", ta, {"custodyType": "HANDED_OVER"})
chk("전달 완료인데 장소 없음 400", c, 400)
c, j = call("PATCH", f"/admin/found-items/{pb['itemId']}/storage", ta, {"custodyType": "PENDING_HANDOVER"})
chk("전달 예정으로 되돌리면 접수 상태 + 장소 비움", (c, j["data"]["status"], j["data"].get("storageInfo")), (200, "REPORTED", None), j)
c, j = call("PATCH", f"/admin/found-items/{iid}/storage", ta, {"custodyType": "PENDING_HANDOVER"})
chk("반환 완료 물품 보관 위치 변경 409", c, 409)
c, j = call("PATCH", f"/admin/found-items/{pb['itemId']}/found-location", ta, {"foundBuildingId": None, "foundLocation": ""})
chk("발견 위치 비움 400", c, 400)
c, j = call("PATCH", f"/admin/found-items/{pb['itemId']}/found-location", ta, {"foundLocation": "도서관 후문", "foundLocationDetail": "자전거 보관대 옆", "foundLatitude": 95, "foundLongitude": 126.9})
chk("발견 좌표 범위 밖 400", c, 400)
c, j = call("PATCH", f"/admin/found-items/{pb['itemId']}/found-location", ta, {"foundLocation": "도서관 후문", "foundLocationDetail": "자전거 보관대 옆"})
chk("발견 위치 수정 200", (c, j["data"]["foundLocation"]), (200, "도서관 후문"), j)

print("== 분실 신고 관리")
c, j = call("GET", "/admin/lost-reports?size=50", ta)
chk("분실 신고 전체(모든 상태) 4건 이상", (c, len(rows(j)) >= 4, any(x["status"] == "CLOSED" for x in rows(j))), (200, True, True))
c, j = call("GET", "/admin/lost-reports?status=CLOSED", ta)
chk("분실 신고 상태 필터", all(x["status"] == "CLOSED" for x in rows(j)), True)
txt = json.dumps(rows(call("GET", "/admin/lost-reports", ta)[1]), ensure_ascii=False)
chk("분실 신고 목록에 신고자 이메일 없음", "@demo.local" in txt, False)

print("== 건물·보관 장소 관리")
name = "시연건물" + uuid.uuid4().hex[:4]
c, j = call("POST", "/admin/campus-buildings", ta, {"buildingName": name, "latitude": 37.5, "longitude": 126.95, "description": "시연용"})
chk("건물 등록 201", c, 201, j)
bld = j["data"]["buildingId"]
c, j = call("POST", "/admin/campus-buildings", ta, {"buildingName": name, "latitude": 37.5, "longitude": 126.95})
chk("건물 이름 중복 400", (c, "buildingName" in j.get("fieldErrors", {})), (400, True), j)
c, j = call("POST", "/admin/campus-buildings", ta, {"buildingName": "범위밖", "latitude": 137.5, "longitude": 126.95})
chk("건물 좌표 범위 밖 400", c, 400)
c, j = call("POST", "/admin/campus-buildings", ta, {"buildingName": "", "latitude": 37.5, "longitude": 126.95})
chk("건물 이름 비움 400", c, 400)
c, j = call("PATCH", f"/admin/campus-buildings/{bld}", ta, {"buildingName": name, "latitude": 37.51, "longitude": 126.96, "description": "수정됨"})
chk("건물 수정 200(자기 이름 유지 허용)", (c, j["data"]["description"]), (200, "수정됨"), j)
c, j = call("PATCH", "/admin/campus-buildings/999999", ta, {"buildingName": "없음", "latitude": 37.5, "longitude": 126.95})
chk("없는 건물 수정 404", c, 404)
c, j = call("GET", "/campus-buildings")
chk("공개 건물 목록에 새 건물", any(x["buildingId"] == bld for x in j["data"]), True)

sreq = {"buildingId": bld, "storageName": "시연보관소" + uuid.uuid4().hex[:4], "contactPhone": "02-000-0000",
        "operatingHours": "평일 09:00~17:00", "pickupGuide": "학생증 지참", "detailLocation": "1층"}
c, j = call("POST", "/admin/storage-locations", ta, sreq)
chk("보관 장소 등록 201(좌표 생략 시 건물 좌표)", (c, j["data"]["latitude"], j["data"]["active"]), (201, 37.51, True), j)
stid = j["data"]["storageId"]
c, j = call("POST", "/admin/storage-locations", ta, {**sreq, "buildingId": None})
chk("건물 없이 등록 400", (c, "buildingId" in j.get("fieldErrors", {})), (400, True), j)
c, j = call("POST", "/admin/storage-locations", ta, {**sreq, "contactPhone": "0" * 30})
chk("전화번호 너무 김 400", c, 400)
c, j = call("GET", "/storage-locations")
chk("공개 보관 장소 목록에 새 장소", any(x["storageId"] == stid for x in j["data"]), True)
c, j = call("PATCH", f"/admin/storage-locations/{stid}", ta, {**sreq, "active": False})
chk("보관 장소 사용 중지 200", (c, j["data"]["active"]), (200, False), j)
c, j = call("GET", "/storage-locations")
chk("중지된 장소는 공개 목록에서 빠짐", any(x["storageId"] == stid for x in j["data"]), False)
c, j = call("GET", "/admin/storage-locations", ta)
chk("관리자 목록에는 중지된 장소도 보임", any(x["storageId"] == stid and not x["active"] for x in j["data"]), True)
pb2 = find_item(ta, "흰색 보조배터리")
c, j = call("PATCH", f"/admin/found-items/{pb2['itemId']}/storage", ta, {"custodyType": "HANDED_OVER", "storageId": stid})
chk("사용 중지된 장소로 지정 400", c, 400)

print("== 정리")
c, j = call("POST", "/dev/reset-demo", ta)
chk("시연 데이터 초기화", c, 200)

print(f"\n합계: {sum(res)} 통과 / {len(res) - sum(res)} 실패")
sys.exit(0 if all(res) else 1)
