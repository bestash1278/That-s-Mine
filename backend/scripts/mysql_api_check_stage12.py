"""12단계 이후 추가 기능 점검: 로그아웃 토큰 무효화, 서버 중복 제출 방지(동시 요청 포함), 관리자 분실 신고 상태 변경.
MySQL에 dev 프로필로 띄운 서버(localhost:8080)에 실제 HTTP 요청을 보낸다.

사용: python -I backend/scripts/mysql_api_check_stage12.py
시작할 때와 끝날 때 시연 데이터를 초기화한다.
"""
import datetime
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


call("POST", "/dev/reset-demo", login("admin@demo.local"))
ta, t1 = login("admin@demo.local"), login("user1@demo.local")
t2a, t2b = login("user2@demo.local"), login("user2@demo.local")
today = datetime.date.today()

print("== 로그아웃 토큰 무효화")
chk("로그아웃 전 토큰 사용 가능", call("GET", "/users/me", t2a)[0], 200)
chk("로그아웃 200", call("POST", "/auth/logout", t2a)[0], 200)
chk("로그아웃한 토큰은 만료 전에도 401", call("GET", "/users/me", t2a)[0], 401)
chk("같은 계정의 다른 로그인(토큰)은 그대로 사용 가능", call("GET", "/users/me", t2b)[0], 200)
chk("같은 토큰으로 다시 로그아웃해도 200", call("POST", "/auth/logout", t2a)[0], 200)
chk("토큰 없이·잘못된 토큰으로 로그아웃해도 200", (call("POST", "/auth/logout")[0], call("POST", "/auth/logout", "broken")[0]), (200, 200))
chk("로그아웃한 토큰으로는 보호 API(신고)도 401", call("POST", "/found-items", t2a, multipart={})[0], 401)
t2c = login("user2@demo.local")
chk("다시 로그인하면 새 토큰으로 사용 가능", call("GET", "/users/me", t2c)[0], 200)

print("== 서버 중복 제출 방지")
c, j = call("GET", "/categories")
cats = {x["categoryName"]: x["categoryId"] for x in j["data"]}
c, j = call("GET", "/campus-buildings")
blds = {x["buildingName"]: x["buildingId"] for x in j["data"]}
tag = uuid.uuid4().hex[:4]
found = {"title": f"중복점검우산{tag}", "categoryId": cats["의류·잡화"], "foundDate": str(today),
         "foundBuildingId": blds["학생회관"], "custodyType": "PENDING_HANDOVER"}
c, j = call("POST", "/found-items", t2b, multipart=found)
chk("습득물 첫 등록 200", c, 200, j)
c, j = call("POST", "/found-items", t2b, multipart=found)
chk("같은 내용을 곧바로 다시 보내면 409", (c, "방금 접수" in j.get("message", "")), (409, True), j)
c, j = call("POST", "/found-items", t2b, multipart={**found, "title": found["title"] + "다름"})
chk("내용이 다르면 접수됨", c, 200, j)
c, j = call("POST", "/found-items", t1, multipart=found)
chk("다른 사용자는 같은 내용도 접수 가능", c, 200, j)

# 동시 요청 6개 → 정확히 1건만 생성
results = []
lock = threading.Lock()
concurrent = {**found, "title": f"동시점검우산{tag}"}


def go():
    code = call("POST", "/found-items", t2b, multipart=concurrent)[0]
    with lock:
        results.append(code)


ths = [threading.Thread(target=go) for _ in range(6)]
[t.start() for t in ths]
[t.join() for t in ths]
chk("같은 내용 동시 6회 제출 → 1건만 생성(200 1, 409 5)", sorted(results), [200, 409, 409, 409, 409, 409])
c, j = call("GET", "/users/me/found-items?size=50", t2b)
chk("DB에 동시 점검 물품이 정확히 1건", len([x for x in rows(j) if x["title"] == concurrent["title"]]), 1)

lost = {"title": f"중복점검필통{tag}", "categoryId": cats["도서·문구"], "lostDate": str(today - datetime.timedelta(days=1)),
        "lostBuildingId": blds["도서관"]}
c, j = call("POST", "/lost-reports", t2b, multipart=lost)
chk("분실 신고 첫 등록 201", c, 201, j)
lid = j["data"]["reportId"]
c, j = call("POST", "/lost-reports", t2b, multipart=lost)
chk("분실 신고 같은 내용 다시 → 409", (c, "방금 접수" in j.get("message", "")), (409, True), j)
results.clear()
lost2 = {**lost, "title": f"동시점검필통{tag}"}


def go_lost():
    code = call("POST", "/lost-reports", t2b, multipart=lost2)[0]
    with lock:
        results.append(code)


ths = [threading.Thread(target=go_lost) for _ in range(6)]
[t.start() for t in ths]
[t.join() for t in ths]
chk("분실 신고 동시 6회 → 1건만 생성(201 1, 409 5)", sorted(results), [201, 409, 409, 409, 409, 409])

print("== 관리자 분실 신고 상태 변경")
body = {"status": "CLOSED"}
chk("비로그인 401", call("PATCH", f"/admin/lost-reports/{lid}/status", None, body)[0], 401)
chk("일반 사용자(본인 포함) 403", call("PATCH", f"/admin/lost-reports/{lid}/status", t2b, body)[0], 403)
c, j = call("PATCH", f"/admin/lost-reports/{lid}/status", ta, body)
chk("관리자: 신고 종료로 변경 + 내용 그대로", (c, j["data"]["status"], j["data"]["title"]), (200, "CLOSED", lost["title"]), j)
chk("같은 상태로 다시 → 409", call("PATCH", f"/admin/lost-reports/{lid}/status", ta, body)[0], 409)
chk("잘못된 상태값 400", call("PATCH", f"/admin/lost-reports/{lid}/status", ta, {"status": "NOPE"})[0], 400)
chk("없는 신고 404", call("PATCH", "/admin/lost-reports/999999/status", ta, body)[0], 404)
c, j = call("GET", "/users/me/lost-reports?size=50", t2b)
mine = next(x for x in rows(j) if x["reportId"] == lid)
chk("신고자의 마이페이지에 바뀐 상태가 보임(내용 수정은 잠김)", (mine["status"], mine["contentEditable"]), ("CLOSED", False), mine)
c, j = call("GET", f"/lost-reports/{lid}/matches", t2b)
chk("신고 종료로 바뀌면 추천도 종료", j["data"], [])
chk("다시 찾는 중으로 되돌리기 200", call("PATCH", f"/admin/lost-reports/{lid}/status", ta, {"status": "SEARCHING"})[0], 200)
c, j = call("GET", "/admin/lost-reports?size=50", ta)
txt = json.dumps(rows(j), ensure_ascii=False)
chk("관리자 목록·응답에 신고자 이메일 없음", "@demo.local" in txt, False)

print("== 정리")
chk("시연 데이터 초기화", call("POST", "/dev/reset-demo", ta)[0], 200)
print(f"\n합계: {sum(res)} 통과 / {len(res) - sum(res)} 실패")
sys.exit(0 if all(res) else 1)
