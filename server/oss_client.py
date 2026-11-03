"""Minimal async Alibaba Cloud OSS client (V4 signatures) for put / presign / delete.

Only the calls the SR service needs; no SDK dependency so the embedded ComfyUI Python and
the controller image both run it unchanged.
"""
import asyncio
import hashlib
import hmac
import re
import time
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import quote, urlsplit, unquote

import aiohttp
from yarl import URL

ALGORITHM = "OSS4-HMAC-SHA256"
UNSIGNED = "UNSIGNED-PAYLOAD"
MAX_PRESIGN_SECONDS = 7 * 24 * 3600


class OSSError(Exception):
    def __init__(self, message, *, status=None, code=None):
        super().__init__(message)
        self.status = status
        self.code = code


@dataclass(frozen=True)
class OSSConfig:
    endpoint: str
    region: str
    bucket: str
    prefix: str
    access_key_id: str
    access_key_secret: str
    security_token: str = ""

    @classmethod
    def from_root(cls, root, *, endpoint, region, access_key_id, access_key_secret,
                  security_token=""):
        bucket, prefix = parse_oss_root(root)
        endpoint = (endpoint or "").strip()
        if not re.fullmatch(r"[A-Za-z0-9.-]+(:\d+)?", endpoint):
            raise ValueError("OSS endpoint 只填写域名，不包含协议或路径")
        region = (region or "").strip()
        if region.startswith("oss-"):
            region = region[4:]
        if not re.fullmatch(r"[a-z0-9-]+", region):
            raise ValueError("OSS region 格式无效（例如 cn-zhangjiakou）")
        for label, value in (("AccessKey ID", access_key_id), ("AccessKey Secret", access_key_secret),
                             ("STS Token", security_token)):
            if value and any(ord(c) < 33 for c in value):
                raise ValueError(f"OSS {label} 含非法字符")
        if not access_key_id or not access_key_secret:
            raise ValueError("缺少 OSS AccessKey")
        return cls(endpoint, region, bucket, prefix, access_key_id, access_key_secret,
                   security_token or "")


def parse_oss_root(root):
    parts = urlsplit((root or "").strip())
    if parts.scheme != "oss" or not parts.netloc or parts.query or parts.fragment or "@" in parts.netloc:
        raise ValueError("OSS 根目录必须形如 oss://bucket/前缀")
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{1,61}[a-z0-9]", parts.netloc):
        raise ValueError("OSS bucket 名称无效")
    segments = [s for s in unquote(parts.path).replace("\\", "/").split("/") if s]
    if any(s in (".", "..") or any(ord(c) < 32 for c in s) for s in segments):
        raise ValueError("OSS 根目录含不安全路径片段")
    return parts.netloc, "/".join(segments)


def _hmac(key, message):
    return hmac.new(key, message.encode("utf-8"), hashlib.sha256).digest()


def _encode(value, safe=""):
    return quote(value, safe=safe)


class OSSClient:
    def __init__(self, session, config, *, scheme="https"):
        self.session = session
        self.config = config
        self.scheme = scheme

    def key(self, *relative):
        segments = [self.config.prefix] if self.config.prefix else []
        for part in relative:
            for segment in str(part).replace("\\", "/").split("/"):
                if not segment:
                    continue
                if segment in (".", "..") or any(ord(c) < 32 for c in segment):
                    raise ValueError("OSS 对象名含不安全片段")
                segments.append(segment)
        if len(segments) <= (1 if self.config.prefix else 0):
            raise ValueError("OSS 对象名不能为空")
        return "/".join(segments)

    def _url(self, key, query=None):
        host = f"{self.config.bucket}.{self.config.endpoint}"
        path = "/" + _encode(key, safe="/")
        text = f"{self.scheme}://{host}{path}"
        if query:
            text += "?" + "&".join(
                f"{_encode(k)}={_encode(v)}" if v != "" else _encode(k)
                for k, v in sorted(query.items()))
        return URL(text, encoded=True)

    def _scope(self, date):
        return f"{date}/{self.config.region}/oss/aliyun_v4_request"

    def _signature(self, method, key, query, headers, timestamp):
        date = timestamp[:8]
        canonical_query = "&".join(
            f"{_encode(k)}={_encode(v)}" if v != "" else _encode(k)
            for k, v in sorted(query.items()))
        signed = {k.lower(): str(v).strip() for k, v in headers.items()
                  if k.lower().startswith("x-oss-") or k.lower() in ("content-type", "content-md5")}
        canonical_headers = "".join(f"{k}:{signed[k]}\n" for k in sorted(signed))
        canonical_uri = "/" + _encode(f"{self.config.bucket}/{key}", safe="/")
        canonical = "\n".join([method, canonical_uri, canonical_query, canonical_headers, "", UNSIGNED])
        string_to_sign = "\n".join([ALGORITHM, timestamp, self._scope(date),
                                    hashlib.sha256(canonical.encode("utf-8")).hexdigest()])
        signing_key = _hmac(("aliyun_v4" + self.config.access_key_secret).encode("utf-8"), date)
        for part in (self.config.region, "oss", "aliyun_v4_request"):
            signing_key = _hmac(signing_key, part)
        return hmac.new(signing_key, string_to_sign.encode("utf-8"), hashlib.sha256).hexdigest()

    def _signed_headers(self, method, key, headers=None, now=None):
        timestamp = time.strftime("%Y%m%dT%H%M%SZ", time.gmtime(now))
        headers = {**(headers or {}), "x-oss-date": timestamp, "x-oss-content-sha256": UNSIGNED}
        if self.config.security_token:
            headers["x-oss-security-token"] = self.config.security_token
        signature = self._signature(method, key, {}, headers, timestamp)
        headers["Authorization"] = (f"{ALGORITHM} Credential={self.config.access_key_id}/"
                                    f"{self._scope(timestamp[:8])}, Signature={signature}")
        return headers

    def presign(self, key, expires_seconds, method="GET", now=None):
        expires_seconds = int(expires_seconds)
        if not 1 <= expires_seconds <= MAX_PRESIGN_SECONDS:
            raise ValueError("签名有效期必须在 1 秒到 7 天之间")
        timestamp = time.strftime("%Y%m%dT%H%M%SZ", time.gmtime(now))
        query = {
            "x-oss-signature-version": ALGORITHM,
            "x-oss-credential": f"{self.config.access_key_id}/{self._scope(timestamp[:8])}",
            "x-oss-date": timestamp,
            "x-oss-expires": str(expires_seconds),
        }
        if self.config.security_token:
            query["x-oss-security-token"] = self.config.security_token
        query["x-oss-signature"] = self._signature(method, key, query, {}, timestamp)
        return str(self._url(key, query))

    async def _send(self, method, key, *, headers=None, data=None, timeout=None):
        signed = self._signed_headers(method, key, headers)
        try:
            async with self.session.request(
                    method, self._url(key), headers=signed, data=data, allow_redirects=False,
                    timeout=timeout or aiohttp.ClientTimeout(total=None, sock_connect=10, sock_read=120),
            ) as response:
                body = await response.read()
                if response.status >= 300:
                    code = re.search(rb"<Code>([^<]{1,100})</Code>", body)
                    code = code.group(1).decode("utf-8", "replace") if code else None
                    raise OSSError(f"OSS {method} 失败：HTTP {response.status}" + (f" {code}" if code else ""),
                                   status=response.status, code=code)
                return response.status
        except (aiohttp.ClientError, asyncio.TimeoutError) as exc:
            raise OSSError(f"OSS {method} 请求失败：{type(exc).__name__}") from exc

    async def put_file(self, key, path, content_type="application/octet-stream"):
        path = Path(path)
        size = path.stat().st_size
        with path.open("rb") as handle:
            await self._send("PUT", key, data=handle, headers={
                "Content-Type": content_type, "Content-Length": str(size)})
        return size

    async def delete(self, key):
        await self._send("DELETE", key)
