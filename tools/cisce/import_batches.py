#!/usr/bin/env python3
"""Sends import batches to the admin JSON import of the backend running on this server (127.0.0.1:8080), never
updating an existing school (updateExisting=false: a row that matches one is refused). Never prints the password.

Usage: python3 import_batches.py <password file> <VALIDATE_ONLY|VALID_ROWS_ONLY> <out.json> batch-001.json [batch-002.json ...]
Writes every batch's result (counts and row errors) to <out.json> and prints a summary per batch.
"""
import json
import sys
import urllib.error
import urllib.request
import uuid

API = "http://127.0.0.1:8080/api/v1"


def credentials(path):
    values = {}
    with open(path, encoding="utf-8") as f:
        for line in f:
            if ":" in line:
                k, v = line.split(":", 1)
                values[k.strip().lower()] = v.strip()
    return values["username"], values["password"]


def login(path):
    username, password = credentials(path)
    req = urllib.request.Request(API + "/auth/login", data=json.dumps({"username": username, "password": password}).encode(),
                                 method="POST", headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)["accessToken"]


def send(token, mode, filename, content):
    boundary = uuid.uuid4().hex
    body = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{filename}\"\r\n"
            f"Content-Type: application/json\r\n\r\n").encode() + content + f"\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(f"{API}/admin/import/json?mode={mode}&updateExisting=false", data=body, method="POST",
                                 headers={"Content-Type": f"multipart/form-data; boundary={boundary}",
                                          "Authorization": "Bearer " + token})
    try:
        with urllib.request.urlopen(req, timeout=900) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        return {"httpError": e.code, "body": e.read()[:2000].decode("utf-8", "replace")}


def main():
    password_file, mode, out = sys.argv[1], sys.argv[2], sys.argv[3]
    assert mode in ("VALIDATE_ONLY", "VALID_ROWS_ONLY"), "mode must be VALIDATE_ONLY or VALID_ROWS_ONLY"
    results = []
    totals = {"rows": 0, "valid": 0, "created": 0, "updated": 0, "errors": 0}
    for path in sys.argv[4:]:
        token = login(password_file)  # a fresh token per batch: tokens last 15 minutes
        with open(path, "rb") as f:
            result = send(token, mode, path.rsplit("/", 1)[-1], f.read())
        results.append({"batch": path, "result": result})
        if "httpError" in result:
            print(f"{path}: HTTP {result['httpError']} {result['body'][:300]}")
            continue
        errs = result.get("errors") or []
        totals["rows"] += result["totalRows"]
        totals["valid"] += result["validRows"]
        totals["created"] += result["created"]
        totals["updated"] += result["updated"]
        totals["errors"] += len(errs)
        print(f"{path}: rows {result['totalRows']}, valid {result['validRows']}, created {result['created']}, "
              f"updated {result['updated']}, committed {result['committed']}, errors {len(errs)}")
        for e in errs[:5]:
            print(f"    row {e['row']} {e['field']}: {e['message'][:160]}")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=1)
    print("total:", totals)


if __name__ == "__main__":
    main()
