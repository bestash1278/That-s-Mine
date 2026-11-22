"""11단계(유사 물품 추천) API 점검. MySQL에 dev 프로필로 띄운 서버(localhost:8080)에 실제 HTTP 요청을 보낸다.

사용: python -I backend/scripts/mysql_api_check_stage11.py
시연 데이터가 처음 상태인 dev 서버가 필요하다. 끝나면 /dev/reset-demo 로 초기화한다.
"""
import datetime
import json
import sys
import urllib.error
import urllib.request
import uuid

B = "http://localhost:8080/api/v1"
res = []

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def call(method, path, token=None, body=None, multipart=None):
    headers = {}
    data = None
    if token:
        headers["Authorization"] = "Bearer " + token
    if multipart is not None:
        bd = uuid.uuid4().hex
        headers["Content-Type"] = "multipart/form-data; boundary=" + bd
        data = (f"--{bd}\r\nContent-Disposition: form-data; name=\"request\"\r\nContent-Type: application/json\r\n\r\n").encode() \
            + json.dumps(multipart, ensure_ascii=False).encode("utf-8") + f"\r\n--{bd}--\r\n".encode()
    elif body is not None:
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


def login(email):
    return call("POST", "/auth/login", body={"email": email, "password": "demo1234!"})[1]["data"]["accessToken"]


def rows(j):
    d = j.get("data", [])
    return d.get("content", []) if isinstance(d, dict) else d


# 항상 처음 상태에서 시작한다(초기화하면 계정이 다시 만들어지므로 토큰도 새로 받는다)
call("POST", "/dev/reset-demo", login("admin@demo.local"))
ta, t1, t2 = login("admin@demo.local"), login("user1@demo.local"), login("user2@demo.local")
today = datetime.date.today()


def my_reports(token):
    return {r["title"]: r for r in rows(call("GET", "/users/me/lost-reports?size=50", token)[1])}


def titles(matches):
    return [m["item"]["title"] for m in matches]


print("== 권한")
r2 = my_reports(t2)
earphone_id = r2["흰색 무선 이어폰 케이스"]["reportId"]
closed_id = r2["회색 목도리"]["reportId"]
r1 = my_reports(t1)
wallet_id = r1["남색 카드지갑"]["reportId"]
chk("비로그인 401", call("GET", f"/lost-reports/{earphone_id}/matches")[0], 401)
chk("다른 사용자 403", call("GET", f"/lost-reports/{earphone_id}/matches", t1)[0], 403)
chk("본인 200", call("GET", f"/lost-reports/{earphone_id}/matches", t2)[0], 200)
chk("관리자 200", call("GET", f"/lost-reports/{earphone_id}/matches", ta)[0], 200)
chk("없는 신고 404", call("GET", "/lost-reports/999999/matches", t2)[0], 404)

print("== 추천 결과")
c, j = call("GET", f"/lost-reports/{earphone_id}/matches", t2)
m = j["data"]
chk("흰색 무선 이어폰 케이스 → 검은색 무선 이어폰이 1순위", titles(m)[:1], ["검은색 무선 이어폰"], titles(m))
chk("점수 내림차순", [x["score"] for x in m] == sorted((x["score"] for x in m), reverse=True), True)
chk("점수 범위 40~100 + 등급 표시", all(40 <= x["score"] <= 100 and x["levelLabel"] and x["level"] in ("HIGH", "MEDIUM", "LOW") for x in m), True)
chk("모든 추천에 이유 문장", all(x["reasons"] for x in m), True)
chk("최대 10건", len(m) <= 10, True)
chk("반환 완료 물품 제외", any(x["item"]["status"] == "RETURNED" for x in m), False)
txt = json.dumps(j, ensure_ascii=False)
chk("응답에 비공개 특징·신고자 정보 없음", any(k in txt for k in ("privateFeatures", "reporter", "user1@demo", "시연사용자")), False)
c, j = call("GET", f"/lost-reports/{wallet_id}/matches", t1)
w = j["data"]
chk("남색 카드지갑 → 갈색 카드지갑 추천", "갈색 카드지갑" in titles(w), True, titles(w))
chk("이미 반환된 검은색 학생증 케이스는 추천 안 함", "검은색 학생증 케이스" in titles(w), False)
c, j = call("GET", f"/lost-reports/{closed_id}/matches", t2)
chk("신고 종료된 신고는 빈 목록", (c, j["data"]), (200, []))

print("== 날짜 규칙")
fresh = {"title": "파란색 파우치", "description": "지퍼가 달린 작은 파우치", "categoryId": None,
         "lostDate": str(today), "lostLocationDetail": "도서관"}
c, j = call("GET", "/categories")
cats = {x["categoryName"]: x["categoryId"] for x in j["data"]}
c, j = call("GET", "/campus-buildings")
blds = {x["buildingName"]: x["buildingId"] for x in j["data"]}
fresh["categoryId"] = cats["의류·잡화"]
fresh["lostBuildingId"] = blds["도서관"]
c, j = call("POST", "/lost-reports", t2, multipart=fresh)
chk("분실 신고 작성", c, 201, j)
fid = j["data"]["reportId"]
c, j = call("GET", f"/lost-reports/{fid}/matches", t2)
chk("분실일(오늘)보다 먼저 발견된 물품은 모두 제외", all(x["item"]["foundDate"] >= str(today) for x in j["data"]), True,
    [(x["item"]["title"], x["item"]["foundDate"]) for x in j["data"]])

old = {**fresh, "lostDate": str(today - datetime.timedelta(days=6)), "lostEndDate": str(today - datetime.timedelta(days=1))}
c, j = call("POST", "/lost-reports", t2, multipart=old)
oid = j["data"]["reportId"]
c, j = call("GET", f"/lost-reports/{oid}/matches", t2)
mt = j["data"]
chk("파란색 파우치 → 정답 파우치가 오답(남색 파우치·파란색 필통)보다 위",
    titles(mt).index("파란색 파우치") < titles(mt).index("남색 파우치") if "남색 파우치" in titles(mt) else titles(mt)[0] == "파란색 파우치",
    True, [(x["item"]["title"], x["score"]) for x in mt])
chk("오답이 있어도 반환 완료된 같은 이름 파우치는 없음", sum(1 for x in mt if x["item"]["title"] == "파란색 파우치" and x["item"]["status"] == "RETURNED"), 0)
top = mt[0]
chk("정답은 발견 장소(도서관) 근접 이유 포함", any("가까운 곳" in r for r in top["reasons"]), True, top)
chk("정답은 보관 장소 정보가 목록 카드에 포함(발견/보관 분리)", ("storageName" in top["item"], top["item"]["foundLocation"]), (True, "도서관"), top["item"])

print("== 동의어")
syn = {"title": "에어팟", "categoryId": cats["전자기기"], "lostDate": str(today - datetime.timedelta(days=1)), "lostBuildingId": blds["공학관"]}
c, j = call("POST", "/lost-reports", t2, multipart=syn)
sid = j["data"]["reportId"]
c, j = call("GET", f"/lost-reports/{sid}/matches", t2)
chk("'에어팟' 분실 신고에 '무선 이어폰' 습득물 추천", "검은색 무선 이어폰" in titles(j["data"]), True, titles(j["data"]))

print("== 마이페이지 유사 습득물 수")
r2 = my_reports(t2)
chk("찾는 중인 신고에 similarItemCount", isinstance(r2["흰색 무선 이어폰 케이스"].get("similarItemCount"), int), True)
chk("신고 종료 신고에는 표시 안 함", "similarItemCount" in r2["회색 목도리"], False)
count_before = r2["흰색 무선 이어폰 케이스"]["similarItemCount"]
chk("수가 추천 목록 길이와 같음", count_before, len(call("GET", f"/lost-reports/{earphone_id}/matches", t2)[1]["data"]) if count_before <= 10 else 10)

print("== 숨김·반환 완료 반영")
c, j = call("GET", "/admin/found-items?keyword=" + urllib.request.quote("검은색 무선 이어폰"), ta)
phone = next(x for x in rows(j) if x["title"] == "검은색 무선 이어폰")
call("PATCH", f"/admin/found-items/{phone['itemId']}/status", ta, {"status": "HIDDEN"})
c, j = call("GET", f"/lost-reports/{earphone_id}/matches", t2)
chk("숨긴 물품은 추천에서 빠짐", "검은색 무선 이어폰" in titles(j["data"]), False)
call("PATCH", f"/admin/found-items/{phone['itemId']}/status", ta, {"status": "STORED"})
c, j = call("POST", f"/found-items/{phone['itemId']}/return-requests", t2, {"ownershipDescription": "케이스 뒷면에 흠집"})
rid = j["data"]["requestId"]
call("PATCH", f"/admin/return-requests/{rid}/status", ta, {"status": "APPROVED"})
call("PATCH", f"/admin/return-requests/{rid}/status", ta, {"status": "COMPLETED"})
c, j = call("GET", f"/lost-reports/{earphone_id}/matches", t2)
chk("반환 완료된 물품은 추천에서 빠짐", "검은색 무선 이어폰" in titles(j["data"]), False)
c, j = call("PATCH", f"/lost-reports/{earphone_id}/status", t2, {"status": "FOUND"})
c, j = call("GET", f"/lost-reports/{earphone_id}/matches", t2)
chk("찾기 완료로 바꾸면 추천 종료", j["data"], [])

print("== 정리")
chk("시연 데이터 초기화", call("POST", "/dev/reset-demo", ta)[0], 200)

print(f"\n합계: {sum(res)} 통과 / {len(res) - sum(res)} 실패")
sys.exit(0 if all(res) else 1)
