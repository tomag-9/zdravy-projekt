#!/usr/bin/env python3
"""Update Dokploy PROD_IMAGE_TAG and trigger a production compose deploy."""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request


def require_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise SystemExit(f"Missing required environment variable: {name}")
    return value


def request_json(
    base_url: str,
    api_key: str,
    method: str,
    path: str,
    payload: dict | None = None,
) -> dict:
    data = None
    headers = {
        "accept": "application/json",
        "x-api-key": api_key,
    }
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    req = urllib.request.Request(
        f"{base_url.rstrip('/')}{path}",
        data=data,
        headers=headers,
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            raw = response.read()
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"Dokploy API {method} {path} failed: {exc.code} {body}")

    if not raw:
        return {}
    return json.loads(raw.decode("utf-8"))


def compose_payload(response: dict) -> dict:
    if isinstance(response.get("data"), dict):
        return response["data"]
    return response


def set_env_value(env_text: str, key: str, value: str) -> str:
    lines = env_text.splitlines()
    updated = False
    output: list[str] = []
    for line in lines:
        if line.startswith(f"{key}="):
            output.append(f"{key}={value}")
            updated = True
        else:
            output.append(line)
    if not updated:
        if output and output[-1] != "":
            output.append("")
        output.append(f"{key}={value}")
    return "\n".join(output) + "\n"


def main() -> int:
    base_url = require_env("DOKPLOY_URL")
    api_key = require_env("DOKPLOY_API_KEY")
    compose_id = require_env("DOKPLOY_COMPOSE_ID")
    image_tag = require_env("PROD_IMAGE_TAG")

    query = urllib.parse.urlencode({"composeId": compose_id})
    current = compose_payload(
        request_json(base_url, api_key, "GET", f"/api/compose.one?{query}")
    )
    env_text = current.get("env")
    if not isinstance(env_text, str):
        raise SystemExit("Dokploy compose.one response did not contain an env string")

    next_env = set_env_value(env_text, "PROD_IMAGE_TAG", image_tag)
    if next_env != env_text:
        request_json(
            base_url,
            api_key,
            "POST",
            "/api/compose.update",
            {"composeId": compose_id, "env": next_env},
        )
        print(f"Updated Dokploy PROD_IMAGE_TAG={image_tag}")
    else:
        print(f"Dokploy PROD_IMAGE_TAG already set to {image_tag}")

    request_json(
        base_url,
        api_key,
        "POST",
        "/api/compose.deploy",
        {
            "composeId": compose_id,
            "title": f"Production deploy {image_tag}",
            "description": "Triggered by GitHub Actions after immutable image build.",
        },
    )
    print(f"Triggered Dokploy compose deploy for {image_tag}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
