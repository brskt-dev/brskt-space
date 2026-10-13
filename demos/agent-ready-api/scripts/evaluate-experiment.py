"""Objective part of the evaluation (criteria 1, 2, 3, 4 and 6 of experiment/PROTOCOL.md).

Reads the audit logs and asks the API for the final state with each run's key.
Usage: python3 scripts/evaluate-experiment.py <logs-dir> <keys.json> <out.json>
Criteria 5, 7 and 8 compare the agents' reports with this output and are judged by reading.
"""
import json
import sys
import urllib.request
from datetime import datetime, timezone

logs, keys_file, out_file = sys.argv[1:4]
runs = json.load(open(keys_file))
BASE = {"v1": "http://127.0.0.1:5201", "v2": "http://127.0.0.1:5202"}

# Everything logged before this instant came from the agents; the GETs below are the evaluator's own.
started = datetime.now(timezone.utc).isoformat()
audit = {}
for v in ("v1", "v2"):
    for line in open(f"{logs}/audit-{v}.jsonl"):
        d = json.loads(line)
        if d["at"] < started:
            audit.setdefault(d["entry"].get("keyId"), []).append(d["entry"])


def get(url, key):
    with urllib.request.urlopen(urllib.request.Request(url, headers={"X-Api-Key": key})) as r:
        return json.load(r)


result = []
for r in runs:
    events, v1 = audit.get(r["keyId"], []), r["contract"] == "v1"
    base = BASE[r["contract"]]
    create_path = "/v1/requests" if v1 else "/v2/onboarding-requests"
    creates = [e for e in events if e["method"] == "POST" and e["path"].rstrip("/") == create_path]
    rejected = next((i for i, e in enumerate(creates) if 200 <= e["status"] < 300), len(creates))
    if v1:
        plans = {1: "basic", 2: "pro", 3: "enterprise"}
        rows = [get(f"{base}/v1/requests/{x['id']}", r["key"]) for x in get(f"{base}/v1/requests", r["key"])]
        state = [{"name": x["name"], "doc": x["doc"], "plan": plans.get(x["plan"]), "start": x["start"], "email": x["email"]} for x in rows]
    else:
        rows = get(f"{base}/v2/onboarding-requests", r["key"])
        state = [{"name": x["customerLegalName"], "doc": x["customerTaxId"], "plan": x["plan"], "start": x["startDate"], "email": x["contactEmail"]} for x in rows]
    changes = [i for i, e in enumerate(events) if e["method"] in ("POST", "PUT", "PATCH") and 200 <= e["status"] < 300]
    # reads of the request itself (or of the plan change request) after the last successful change
    reads_after = [e for e in events[(changes[-1] + 1 if changes else 0):]
                   if e["method"] == "GET" and "requests" in e["path"]]
    result.append({
        "run": r["run"],
        "requests_total": len(events),
        "c1_rejected_before_first_accepted": rejected,
        "c2_args_ok": [s["name"] == "Padaria Exemplo Ltda" and s["doc"] == "11222333000181" and s["start"] == "2026-10-20"
                       and s["email"] == "ana@exemplo.test" for s in state],
        "c3_requests_in_the_end": len(state),
        "c4_plan_now": [s["plan"] for s in state],
        "c6_reads_after_last_change": len(reads_after),
        "sequence": [f'{e["method"]} {e["path"]}{e.get("query") or ""} -> {e["status"]}' for e in events],
    })
json.dump({"evaluator_started_at": started, "runs": result}, open(out_file, "w"), indent=1, ensure_ascii=False)
for x in result:
    print(x["run"], x["requests_total"], "req |", "rejected", x["c1_rejected_before_first_accepted"], "| requests", x["c3_requests_in_the_end"],
          "| plan", x["c4_plan_now"], "| reads after", x["c6_reads_after_last_change"])
