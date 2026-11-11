"""Single-shot trusted callback transport; no provider credentials live here.

Operator must explicitly set CHOUKA_LOCAL_EDIT_TRUSTED_ORIGINS to comma-separated
exact controller origins (scheme://host:port). Empty configuration fails closed.
Only /agent/v1/local-edit/cloud is allowed. The controller injects a unique,
short-lived, single-use ticket into callback_token and binds provider/prompt to
that ticket. Only image/reference PNG parts are sent; graph provider/prompt are
NOT trusted routing or billing instructions. Never automatically retry a task
whose callback result was lost: the upstream operation may already be charged.
"""
import hashlib
import io
import os
import re
import urllib.error
import urllib.parse
import urllib.request
import uuid
import warnings

import numpy as np
from PIL import Image

from .geometry import validate_image

CALLBACK_PATH = "/agent/v1/local-edit/cloud"
MAX_RESPONSE_BYTES = 64 * 1024 * 1024
MAX_RESPONSE_PIXELS = 32_000_000


def _origin(url, allow_path):
    if not isinstance(url, str) or any(ord(c) <= 32 for c in url) or "\\" in url:
        raise ValueError("invalid callback URL")
    try:
        parts = urllib.parse.urlsplit(url)
        if (parts.scheme not in ("http", "https") or not parts.hostname
                or parts.username is not None or parts.password is not None
                or parts.query or parts.fragment or "%" in parts.netloc
                or "?" in url or "#" in url):
            raise ValueError
        allowed_paths = (CALLBACK_PATH,) if allow_path else ("", "/")
        if parts.path not in allowed_paths:
            raise ValueError
        port = parts.port if parts.port is not None else (443 if parts.scheme == "https" else 80)
        if not 1 <= port <= 65535:
            raise ValueError
        return parts.scheme, parts.hostname.lower(), port
    except (ValueError, TypeError):
        raise ValueError("invalid callback URL or fixed callback path") from None


def validate_callback_url(callback_url):
    origin = _origin(callback_url, True)
    configured = os.environ.get("CHOUKA_LOCAL_EDIT_TRUSTED_ORIGINS", "")
    try:
        trusted = {_origin(value.strip(), False) for value in configured.split(",") if value.strip()}
    except ValueError:
        raise ValueError("invalid trusted callback origin configuration") from None
    if origin not in trusted:
        raise ValueError("callback origin is not explicitly trusted")


def _png_bytes(image):
    array = validate_image(image)
    if array.shape[1] * array.shape[2] > MAX_RESPONSE_PIXELS:
        raise ValueError("callback input exceeds 32MP")
    pixels = np.rint(array[0] * 255).clip(0, 255).astype(np.uint8)
    buffer = io.BytesIO()
    Image.fromarray(pixels).save(buffer, format="PNG")
    return buffer.getvalue()


def _multipart(image, reference):
    boundary = "chouka-" + uuid.uuid4().hex
    body = bytearray()
    parts = [("image", image)]
    if reference is not None:
        parts.append(("reference", reference))
    for name, value in parts:
        body.extend((f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"; "
                     f"filename=\"{name}.png\"\r\nContent-Type: image/png\r\n\r\n").encode("ascii"))
        body.extend(_png_bytes(value))
        body.extend(b"\r\n")
    body.extend(f"--{boundary}--\r\n".encode("ascii"))
    return bytes(body), boundary


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def _decode_png(payload):
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(payload)) as decoded:
                if (decoded.format != "PNG" or getattr(decoded, "n_frames", 1) != 1
                        or decoded.width * decoded.height > MAX_RESPONSE_PIXELS):
                    raise ValueError
                decoded.verify()
            with Image.open(io.BytesIO(payload)) as decoded:
                decoded.load()
                return np.asarray(decoded.convert("RGB"), dtype=np.float32)[None] / 255.0
    except Exception:
        raise RuntimeError("cloud callback returned an invalid PNG or exceeded 32MP") from None


def cloud_edit_numpy(image, prompt, provider, callback_url, callback_token, reference=None):
    if provider not in ("gpt_image", "banana"):
        raise ValueError("unsupported cloud image provider")
    if not isinstance(prompt, str):
        raise ValueError("prompt must be a string")
    validate_callback_url(callback_url)
    # Restrict to RFC6750 b64token characters; never put supplied values in errors.
    if (not isinstance(callback_token, str) or len(callback_token) > 8192
            or not re.fullmatch(r"[A-Za-z0-9._~+/-]+=*", callback_token)):
        raise ValueError("a valid single-use callback ticket is required")
    body, boundary = _multipart(image, reference)
    request = urllib.request.Request(callback_url, data=body, method="POST", headers={
        "Authorization": "Bearer " + callback_token,
        "Content-Type": "multipart/form-data; boundary=" + boundary,
        "Accept": "image/png",
    })
    # Explicitly disable environment proxies, redirects, HTTP auth and retries.
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), _NoRedirect())
    try:
        with opener.open(request, timeout=180) as response:
            if response.status != 200:
                raise RuntimeError("unexpected callback status")
            length = response.headers.get("Content-Length")
            if length is not None and (int(length) < 0 or int(length) > MAX_RESPONSE_BYTES):
                raise RuntimeError("callback response too large")
            payload = response.read(MAX_RESPONSE_BYTES + 1)
            if len(payload) > MAX_RESPONSE_BYTES:
                raise RuntimeError("callback response too large")
    except urllib.error.HTTPError as exc:
        exc.close()  # redirect/error responses own a socket too; never read their body
        raise RuntimeError("cloud callback failed; not retried (ticket may already be consumed)") from None
    except Exception:
        # No URL, ticket, response text/base64, or chained urllib error escapes.
        raise RuntimeError("cloud callback failed; not retried (ticket may already be consumed)") from None
    return _decode_png(payload)


def ticket_cache_key(callback_token):
    return hashlib.sha256(callback_token.encode("utf-8")).hexdigest()
