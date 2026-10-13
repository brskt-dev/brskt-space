#!/usr/bin/env bash
# Starts the two contracts the way the experiment did: v1 on :5201, v2 on :5202, with the
# "drop the first create response" fault on, and one fresh key per run (3 per contract).
# Writes the keys to experiment/local-keys.json (gitignored) and audit logs to experiment/local-logs/.
# Stop with: kill $(cat experiment/local-logs/*.pid)
set -euo pipefail
cd "$(dirname "$0")/.."
# a fresh start: stop servers from a previous run and drop its logs, so counts don't mix
if ls experiment/local-logs/*.pid >/dev/null 2>&1; then kill $(cat experiment/local-logs/*.pid) 2>/dev/null || true; fi
rm -f experiment/local-logs/audit-*.jsonl experiment/local-logs/*.pid
dotnet build src/OnboardingApi -c Release -o .run/api >/dev/null
mkdir -p experiment/local-logs
python3 - <<'PY'
import json, secrets
runs = []
for v in ("v1", "v2"):
    for i in (1, 2, 3):
        runs.append({"run": f"{v}-{i}", "contract": v, "key": "exp-" + secrets.token_hex(12),
                     "keyId": f"run-{v}-{i}", "tenant": f"tenant-run-{v}-{i}"})
json.dump(runs, open("experiment/local-keys.json", "w"), indent=1)
lines = []
for n, r in enumerate(runs, start=3):  # indexes 0-2 are the demo keys in appsettings.json
    lines += [f"export DemoKeys__Keys__{n}__Key={r['key']}", f"export DemoKeys__Keys__{n}__KeyId={r['keyId']}",
              f"export DemoKeys__Keys__{n}__TenantId={r['tenant']}"]
    lines += [f"export DemoKeys__Keys__{n}__Scopes__{j}={s}" for j, s in enumerate(["onboarding:read", "onboarding:write", "plan-change:request"])]
open("experiment/local-logs/keys.env", "w").write("\n".join(lines) + "\n")
PY
source experiment/local-logs/keys.env
export ASPNETCORE_ENVIRONMENT=Production Faults__DropFirstCreateResponse=true
for pair in "v1 5201" "v2 5202"; do
  set -- $pair
  ASPNETCORE_URLS=http://127.0.0.1:$2 Contract=$1 AuditLogPath=$PWD/experiment/local-logs/audit-$1.jsonl \
    nohup dotnet .run/api/OnboardingApi.dll --contentRoot "$PWD/.run/api" > experiment/local-logs/stdout-$1.log 2>&1 &
  echo $! > experiment/local-logs/$1.pid
done
echo "v1: http://127.0.0.1:5201/openapi/v1.json  v2: http://127.0.0.1:5202/openapi/v2.json  keys: experiment/local-keys.json"
