"""시연 데이터 초기화(POST /api/v1/dev/reset-demo)가 같은 초기 상태를 재현하는지 점검한다.

사용: python -I backend/scripts/check_demo_reset.py [중간에 데이터를 바꾸는 명령 ...]
  1) 초기화 → 상태 스냅샷 1
  2) (선택) 인자로 준 명령을 실행해 데이터를 바꾼다. 예: node scripts/browser/flows.mjs
  3) 다시 초기화 → 상태 스냅샷 2 → 두 스냅샷을 비교한다
비교하는 값: 물품(이름·종류·상태·보관 상태·발견 건물·보관 장소), 분실 신고(이름·상태), 반환 신청(물품·상태), 건물·보관 장소.
번호(ID)와 날짜는 시연 데이터를 만들 때마다 달라지므로 비교하지 않는다.
"""
import json
import subprocess
import sys
import urllib.request

B = "http://localhost:8080/api/v1"

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def call(method, path, token=None, body=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    req = urllib.request.Request(B + path, data=json.dumps(body).encode() if body else None, headers=headers, method=method)
    return json.loads(urllib.request.urlopen(req).read().decode("utf-8"))


def login(email):
    return call("POST", "/auth/login", body={"email": email, "password": "demo1234!"})["data"]["accessToken"]


def reset():
    call("POST", "/dev/reset-demo", login("admin@demo.local"))


def snapshot():
    admin = login("admin@demo.local")
    items = call("GET", "/admin/found-items?size=50", admin)["data"]["content"]
    lost = call("GET", "/admin/lost-reports?size=50", admin)["data"]["content"]
    returns = call("GET", "/admin/return-requests?size=50", admin)["data"]["content"]
    buildings = call("GET", "/campus-buildings")["data"]
    storages = call("GET", "/admin/storage-locations", admin)["data"]
    return {
        "물품": sorted((i["title"], i["categoryName"], i["status"], i["custodyType"], i["foundBuildingName"], i.get("storageName")) for i in items),
        "분실 신고": sorted((r["title"], r["status"]) for r in lost),
        "반환 신청": sorted((r["itemTitle"], r["status"]) for r in returns),
        "건물": sorted(b["buildingName"] for b in buildings),
        "보관 장소": sorted((s["storageName"], s["buildingName"], s["active"]) for s in storages),
    }


reset()
first = snapshot()
print("초기화 후 상태 1:", {k: len(v) for k, v in first.items()})
if len(sys.argv) > 1:
    print("데이터를 바꾸는 명령 실행:", " ".join(sys.argv[1:]))
    subprocess.run(sys.argv[1:], check=False, stdout=subprocess.DEVNULL)
    dirty = snapshot()
    print("명령 실행 뒤(초기화 전):", {k: len(v) for k, v in dirty.items()}, "→ 초기 상태와 다름" if dirty != first else "→ 달라진 것이 없음(변경 명령이 효과가 없었음)")
reset()
second = snapshot()
print("초기화 후 상태 2:", {k: len(v) for k, v in second.items()})
same = first == second
print("결과:", "같은 초기 상태가 재현됨" if same else "초기 상태가 다름")
if not same:
    for key in first:
        if first[key] != second[key]:
            print(" 다른 항목:", key, set(map(str, first[key])) ^ set(map(str, second[key])))
sys.exit(0 if same else 1)
