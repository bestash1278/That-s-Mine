"""7~9단계(지도·인증·분실 신고·마이페이지) API 점검. MySQL에 dev 프로필로 띄운 서버(localhost:8080)에 실제 HTTP 요청을 보낸다.

사용: python -I backend/scripts/mysql_api_check_stage7_9.py
시연 데이터가 처음 상태인 dev 서버가 필요하다(다른 점검 스크립트가 끝에 초기화한다). 점검 중 분실 신고 2건과 가입 계정 1개를 만든다.
"""
import datetime
import json
import sys
import urllib.error
import urllib.request
import uuid

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

B = "http://localhost:8080/api/v1"
res = []

def call(method, path, token=None, body=None, multipart=None):
    headers = {}
    data = None
    if token:
        headers["Authorization"] = "Bearer " + token
    if multipart is not None:
        bd = uuid.uuid4().hex
        headers["Content-Type"] = "multipart/form-data; boundary=" + bd
        data = (f"--{bd}\r\nContent-Disposition: form-data; name=\"request\"\r\n"
                f"Content-Type: application/json\r\n\r\n").encode() + json.dumps(multipart, ensure_ascii=False).encode("utf-8") + f"\r\n--{bd}--\r\n".encode()
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
    print(("PASS " if ok else "FAIL ") + name + ("" if ok else f" (expected {exp}, got {got}) {extra}"))

def rows(j):
    d = j.get("data", [])
    return d.get("content", []) if isinstance(d, dict) else d

def login(email, pw="demo1234!"):
    c, j = call("POST", "/auth/login", body={"email": email, "password": pw})
    return j.get("data", {}).get("accessToken") or j.get("data", {}).get("token")

t1, t2, ta = login("user1@demo.local"), login("user2@demo.local"), login("admin@demo.local")
today = datetime.date.today()

print("== 8단계 가입")
c, j = call("POST", "/auth/signup", body={"email": "user1@demo.local", "password": "demo1234!", "passwordConfirm": "demo1234!", "nickname": "중복확인"})
chk("중복 이메일 가입 400 + fieldErrors.email", (c, "email" in j.get("fieldErrors", {})), (400, True), j)
c, j = call("POST", "/auth/signup", body={"email": "u1@demo.local", "password": "abcd1234", "passwordConfirm": "abcd9999", "nickname": "불일치"})
chk("비밀번호 확인 불일치 400", c, 400, j)
c, j = call("POST", "/auth/signup", body={"email": "u2@demo.local", "password": "abcdefgh", "passwordConfirm": "abcdefgh", "nickname": "숫자없음"})
chk("숫자 없는 비밀번호 400", c, 400, j)
em = f"mysql{uuid.uuid4().hex[:6]}@demo.local"
c, j = call("POST", "/auth/signup", body={"email": em, "password": "abcd1234", "passwordConfirm": "abcd1234", "nickname": "테스터", "role": "ADMIN"})
chk("정상 가입", c in (200, 201), True, j)
tn = j.get("data", {}).get("accessToken") or j.get("data", {}).get("token")
c, j = call("GET", "/users/me", tn)
chk("가입 직후 role=USER(ADMIN 요청 무시)", j.get("data", {}).get("role"), "USER")
c, j = call("GET", "/admin/found-items", tn)
chk("신규 가입자 관리자 API 403", c, 403)
c, j = call("GET", "/admin/found-items", ta)
chk("관리자 관리자 API 200/404 아님(403 아님)", c != 403 and c != 401, True, c)
c, j = call("GET", "/auth/check-email?email=user1@demo.local")
chk("이메일 중복 확인 호출", c, 200, j)

print("== 9단계 분실 신고")
c, j = call("GET", "/categories")
cats = {x["categoryName"]: x["categoryId"] for x in j["data"]}
c, j = call("GET", "/campus-buildings")
blds = {x["buildingName"]: x["buildingId"] for x in j.get("data", [])}
print("categories:", list(cats), "buildings:", list(blds)[:8])
cid = cats.get("의류·잡화")
bid = next(iter(blds.values()), None)
rep = {"title": "검은색 계산기", "description": "공학용, 뒷면 스티커", "categoryId": cid,
       "lostDate": str(today - datetime.timedelta(days=2)), "lostBuildingId": bid, "lostLocationDetail": "3층"}
c, j = call("POST", "/lost-reports", None, multipart=rep)
chk("비로그인 분실 신고 401", c, 401)
c, j = call("POST", "/lost-reports", t1, multipart=rep)
chk("분실 신고 작성 201", c, 201, j)
rid = j.get("data", {}).get("reportId") or j.get("data", {}).get("lostReportId") or j.get("data", {}).get("id")
print("created id:", rid, "receipt:", j.get("data", {}).get("receiptNumber"))
c, j = call("POST", "/lost-reports", t1, multipart={**rep, "lostDate": str(today + datetime.timedelta(days=3))})
chk("미래 날짜 400", c, 400)
c, j = call("POST", "/lost-reports", t1, multipart={**rep, "lostEndDate": str(today - datetime.timedelta(days=9))})
chk("끝 날짜<시작 날짜 400", c, 400)
c, j = call("POST", "/lost-reports", t1, multipart={**rep, "lostBuildingId": None, "lostLocationDetail": None, "lostLocation": None})
chk("위치 없음 400", c, 400, j)
c, j = call("GET", f"/lost-reports/{rid}")
chk("공개 상세 200", c, 200)
txt = json.dumps(j, ensure_ascii=False)
chk("공개 응답에 이메일·닉네임 없음", ("user1@demo.local" in txt) or ("시연사용자1" in txt), False)
c, j = call("PATCH", f"/lost-reports/{rid}", t2, multipart={**rep, "title": "남의 수정"})
chk("타인 수정 403", c, 403)
c, j = call("DELETE", f"/lost-reports/{rid}", t2)
chk("타인 삭제 403", c, 403)
c, j = call("PATCH", f"/lost-reports/{rid}", t1, multipart={**rep, "title": "수정한 제목"})
chk("본인 multipart PATCH 200(Tomcat 실제 처리)", c, 200, j)
c, j = call("PATCH", f"/lost-reports/{rid}/status", t1, body={"status": "FOUND"})
chk("상태 FOUND 변경 200", c, 200, j)
c, j = call("PATCH", f"/lost-reports/{rid}", t1, multipart={**rep, "title": "또 수정"})
chk("찾기 완료 후 내용 수정 409", c, 409, j)
c, j = call("PATCH", f"/lost-reports/{rid}/status", t1, body={"status": "SEARCHING"})
chk("다시 찾는 중 되돌리기 200", c, 200, j)
c, j = call("GET", "/users/me/lost-reports", t1)
ids = [x.get("reportId") or x.get("lostReportId") or x.get("id") for x in rows(j)]
chk("내 분실 신고 목록에 포함", rid in ids, True, ids)
c, j = call("DELETE", f"/lost-reports/{rid}", t1)
chk("본인 삭제 200/204", c in (200, 204), True, c)
c, j = call("GET", f"/lost-reports/{rid}")
chk("삭제 후 공개 상세 404(soft delete)", c, 404)
c, j = call("GET", "/users/me/lost-reports", t1)
ids = [x.get("reportId") or x.get("lostReportId") or x.get("id") for x in rows(j)]
chk("삭제 후 내 목록에서 제외", rid in ids, False)

print("== 9단계 마이페이지 수정 제한(시드: 은색 열쇠 꾸러미)")
c, j = call("GET", "/users/me/found-items", t1)
items = rows(j)
key = next((x for x in items if "열쇠" in json.dumps(x, ensure_ascii=False)), None)
print("내 습득물:", len(items), "건; 열쇠:", bool(key))
if key:
    kid = key.get("itemId") or key.get("id")
    c, j = call("DELETE", f"/found-items/{kid}", t1)
    chk("반환 진행 중 물품 삭제 409", c, 409, j)
    c, j = call("DELETE", f"/found-items/{kid}", t2)
    chk("타인이 습득물 삭제 403", c, 403)
c, j = call("GET", "/users/me/lost-reports", t2)
chk("user2 분실 신고 3건(시연)", len(rows(j)), 3)
c, j = call("GET", "/users/me/return-requests", t2)
chk("user2 반환 신청 1건", len(rows(j)), 1)
c, j = call("PATCH", "/users/me", t1, body={"nickname": "새닉네임", "currentPassword": "wrong", "newPassword": "newpass123"})
chk("현재 비밀번호 틀리면 비번 변경 거부(4xx)", 400 <= c < 500, True, c)

print("== 7단계 지도(분실 신고 포함)")
c, j = call("GET", "/found-items/map?minLat=-90&maxLat=90&minLng=-180&maxLng=180")
pts = j.get("data", [])
chk("습득물 지도 마커 존재", len(pts) > 0, True)
chk("건물 좌표 대체 표시(markerApproximate) 필드", all("markerApproximate" in p for p in pts), True)
c, j = call("GET", "/lost-reports/map?minLat=-90&maxLat=90&minLng=-180&maxLng=180")
chk("분실 신고 지도 200, 찾는 중만", c == 200 and all(p.get("status", "SEARCHING") == "SEARCHING" for p in j.get("data", [])), True)

print(f"\n합계: {sum(res)} 통과 / {len(res)-sum(res)} 실패")
