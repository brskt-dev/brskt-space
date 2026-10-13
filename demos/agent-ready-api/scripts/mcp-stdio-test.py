"""Talks to the MCP adapter over stdio (newline-delimited JSON-RPC) and prints each step.

Default: MCP revision 2026-07-28 (stateless: no initialize; protocol version and client info go in
each request's _meta). With --legacy: revision 2025-11-25 (initialize handshake first).
Needs the v2 API running, for example:
  Contract=v2 dotnet run --project src/OnboardingApi --urls http://127.0.0.1:5302
Usage: python3 scripts/mcp-stdio-test.py [--legacy] [api-base-url]
"""
import json
import os
import subprocess
import sys

legacy = "--legacy" in sys.argv
api = next((a for a in sys.argv[1:] if a.startswith("http")), "http://127.0.0.1:5302")
env = dict(os.environ, OnboardingApi__BaseUrl=api, OnboardingApi__ApiKey="demo-key-acme-0001")
server = subprocess.Popen(["dotnet", "run", "--project", "src/OnboardingMcp"], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                          stderr=subprocess.DEVNULL, text=True, env=env, cwd=os.path.join(os.path.dirname(__file__), ".."))
META = {
    "io.modelcontextprotocol/protocolVersion": "2026-07-28",
    "io.modelcontextprotocol/clientInfo": {"name": "stdio-test", "version": "0.1"},
    "io.modelcontextprotocol/clientCapabilities": {},
}


def send(message):
    server.stdin.write(json.dumps(message) + "\n")
    server.stdin.flush()


def call(msg_id, method, params=None):
    params = dict(params or {})
    if not legacy:
        params["_meta"] = META
    send({"jsonrpc": "2.0", "id": msg_id, "method": method, "params": params})
    while True:
        reply = json.loads(server.stdout.readline())
        if reply.get("id") == msg_id:
            return reply


def text(reply):
    return json.loads(reply["result"]["content"][0]["text"])


if legacy:
    init = call(1, "initialize", {"protocolVersion": "2025-11-25", "capabilities": {}, "clientInfo": {"name": "stdio-test", "version": "0.1"}})
    print("initialize, protocol:", init["result"]["protocolVersion"])
    send({"jsonrpc": "2.0", "method": "notifications/initialized"})
else:
    print("server/discover:", call(1, "server/discover")["result"]["supportedVersions"])

for tool in call(2, "tools/list")["result"]["tools"]:
    print("tool:", tool["name"], tool.get("annotations"))

args = {"customerLegalName": "Padaria Exemplo Ltda", "customerTaxId": "11222333000181", "plan": "pro",
        "startDate": "2026-12-01", "contactEmail": "ana@exemplo.test"}
first = text(call(3, "tools/call", {"name": "create_onboarding_request", "arguments": args}))
again = text(call(4, "tools/call", {"name": "create_onboarding_request", "arguments": args}))
print("create twice, same id:", first["id"] == again["id"], first["id"])
bad = call(5, "tools/call", {"name": "create_onboarding_request", "arguments": dict(args, customerTaxId="11.222.333/0001-81")})["result"]
print("invalid tax id -> isError:", bad.get("isError"))
change = text(call(6, "tools/call", {"name": "request_plan_change", "arguments": {"id": first["id"], "plan": "enterprise", "reason": "Pedido do cliente."}}))
print("plan change:", change["status"])
now = text(call(7, "tools/call", {"name": "get_onboarding_request", "arguments": {"id": first["id"]}}))
print("plan now:", now["plan"], "| status:", now["status"])
server.terminate()
