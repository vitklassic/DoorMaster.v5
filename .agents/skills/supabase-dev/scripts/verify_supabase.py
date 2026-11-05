#!/usr/bin/env python3
"""Read-only Supabase Auth/PostgREST smoke checks; never reads .env files."""

import argparse
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

DEFAULT_TABLES = ("profiles", "companies", "measurements", "openings")


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default=os.getenv("EXPO_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL"))
    parser.add_argument(
        "--anon-key",
        default=os.getenv("EXPO_PUBLIC_SUPABASE_ANON_KEY") or os.getenv("SUPABASE_ANON_KEY"),
    )
    parser.add_argument("--user-jwt", default=os.getenv("SUPABASE_USER_JWT"))
    parser.add_argument("--table", action="append", dest="tables", help="Repeat to override default tables")
    parser.add_argument("--timeout", type=float, default=15.0)
    return parser.parse_args()


def get_json(base_url, path, api_key, bearer, timeout):
    request = urllib.request.Request(
        base_url + path,
        headers={"apikey": api_key, "Authorization": f"Bearer {bearer}", "Accept": "application/json"},
        method="GET",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = response.read(2048).decode("utf-8", errors="replace")
            return response.status, body
    except urllib.error.HTTPError as error:
        body = error.read(1024).decode("utf-8", errors="replace")
        return error.code, body
    except (urllib.error.URLError, TimeoutError) as error:
        return None, str(error)


def main():
    args = parse_args()
    if not args.url or not args.anon_key:
        print("FAIL: provide --url/--anon-key or EXPO_PUBLIC_SUPABASE_URL/EXPO_PUBLIC_SUPABASE_ANON_KEY")
        return 2
    base_url = args.url.rstrip("/")
    parsed = urllib.parse.urlparse(base_url)
    if parsed.scheme not in ("https", "http") or not parsed.netloc:
        print("FAIL: Supabase URL must be an absolute HTTP(S) URL")
        return 2
    if parsed.scheme != "https" and parsed.hostname not in ("localhost", "127.0.0.1"):
        print("FAIL: plain HTTP is allowed only for localhost")
        return 2

    bearer = args.user_jwt or args.anon_key
    failures = 0
    status, body = get_json(base_url, "/auth/v1/settings", args.anon_key, bearer, args.timeout)
    if status == 200:
        print("PASS: Auth settings reachable")
    else:
        failures += 1
        print(f"FAIL: Auth settings returned {status or 'network error'}: {body[:300]}")

    for table in args.tables or DEFAULT_TABLES:
        quoted_table = urllib.parse.quote(table, safe="")
        path = f"/rest/v1/{quoted_table}?select=*&limit=0"
        status, body = get_json(base_url, path, args.anon_key, bearer, args.timeout)
        if status == 200:
            print(f"PASS: REST table {table} reachable (limit=0; RLS correctness not tested)")
        else:
            failures += 1
            print(f"FAIL: REST table {table} returned {status or 'network error'}: {body[:300]}")

    if args.user_jwt:
        print("INFO: authenticated JWT used; no tokens were printed")
    else:
        print("INFO: anon access checked; pass --user-jwt for authenticated checks")
    print(f"RESULT: {failures} failure(s)")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
