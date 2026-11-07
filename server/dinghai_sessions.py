"""App-local, bounded Dinghai credentials; never persisted or keyed by user identity."""
import asyncio
import hashlib
import time
from collections import OrderedDict
from contextlib import suppress
from dataclasses import dataclass, field

from aiohttp import web

PENDING_TTL = 300
SESSION_TTL = 3 * 24 * 60 * 60
MAX_CREDENTIALS = 2048


@dataclass(frozen=True)
class DinghaiContext:
    issuer: str
    subject: str
    token: str = field(repr=False)
    profile: dict | None = field(default=None, repr=False)


@dataclass(frozen=True)
class _Entry:
    context: DinghaiContext
    expires: float
    user_id: str = ''


@dataclass(frozen=True)
class _ProfileEntry:
    issuer: str
    user_id: str
    profile: dict
    expires: float


def _copy_profile(profile):
    # Never retain or serialize upstream roles, tokens, passwords or other fields.
    return {key: profile.get(key, '') for key in ('id', 'username', 'display_name', 'phone')}


def attach_profile(data, profile):
    """Decorate a response, never the canonical local session/user objects."""
    result = dict(data)
    if 'user' in result:
        result['user'] = dict(result['user'])
        result['user'].pop('dinghai_profile', None)
        if profile is not None:
            result['user']['dinghai_profile'] = _copy_profile(profile)
    return result


class DinghaiCredentials:
    """Event-loop confined. Only SHA-256 hashes of local cookies are dictionary keys."""
    def __init__(self, maximum=MAX_CREDENTIALS):
        self.maximum = maximum
        self.pending = OrderedDict()
        self.sessions = OrderedDict()
        self.profiles = OrderedDict()

    @staticmethod
    def _key(token):
        return hashlib.sha256(token.encode('utf-8')).hexdigest()

    def prune(self):
        now = time.monotonic()
        for entries in (self.pending, self.sessions, self.profiles):
            for key, entry in list(entries.items()):
                if entry.expires <= now:
                    entries.pop(key, None)

    def put(self, kind, token, context, expires, user_id=''):
        self.prune()
        if not token or expires <= time.monotonic():
            return False
        entries = getattr(self, kind)
        key = self._key(token)
        entries.pop(key, None)
        # Separate bounded namespaces prevent pending logins evicting active sessions.
        while len(entries) >= self.maximum:
            entries.popitem(last=False)
        entries[key] = _Entry(context, expires, user_id)
        return True

    def get(self, kind, token):
        self.prune()
        return getattr(self, kind).get(self._key(token)) if token else None

    def discard(self, kind, token):
        return getattr(self, kind).pop(self._key(token), None) if token else None

    def put_profile(self, token, issuer, user_id, profile, expires):
        self.prune()
        if not token or profile is None or expires <= time.monotonic():
            return False
        key = self._key(token)
        self.profiles.pop(key, None)
        # Profiles have their own bound; they never evict business credentials.
        while len(self.profiles) >= self.maximum:
            self.profiles.popitem(last=False)
        self.profiles[key] = _ProfileEntry(issuer, user_id, _copy_profile(profile), expires)
        return True

    def get_profile(self, token):
        return self.get('profiles', token)

    def discard_profile(self, token):
        return self.discard('profiles', token)

    def clear(self):
        self.pending.clear()
        self.sessions.clear()
        self.profiles.clear()


def clear_request_credentials(request):
    from .auth import COOKIE
    from .dinghai_auth import PENDING_COOKIE
    vault = request.app.get('dinghai_credentials')
    if vault is not None:
        vault.discard('sessions', request.cookies.get(COOKIE, ''))
        vault.discard_profile(request.cookies.get(COOKIE, ''))
        vault.discard('pending', request.cookies.get(PENDING_COOKIE, ''))


def current_profile(request):
    """Local-session identity decoration, independent of expiring business tokens."""
    from .auth import COOKIE
    app = request.app
    vault = app.get('dinghai_credentials')
    cookie = request.cookies.get(COOKIE, '')
    session = request.get('auth_session')
    user = request.get('user')
    entry = vault.get_profile(cookie) if vault is not None else None
    if (app.get('local_test') or app.get('admin_sandbox') or not session
            or session.get('local_test') or session.get('admin_sandbox')
            or not user or not user.get('enabled')
            or session.get('user', {}).get('id') != user.get('id')
            or not entry or entry.user_id != user.get('id')
            or entry.issuer != app.get('dinghai_auth_origin')):
        if vault is not None:
            vault.discard_profile(cookie)
        return None
    return _copy_profile(entry.profile)


def current_context(request):
    from .auth import COOKIE
    app = request.app
    vault = app.get('dinghai_credentials')
    cookie = request.cookies.get(COOKIE, '')
    user = request.get('user')
    entry = vault.get('sessions', cookie) if vault is not None else None
    if (app.get('local_test') or app.get('admin_sandbox') or not request.get('auth_session')
            or not user or not user.get('enabled') or user.get('role') == 'monitor'
            or not entry or entry.user_id != user['id']
            or entry.context.issuer != app.get('dinghai_auth_origin')):
        if vault is not None:
            vault.discard('sessions', cookie)
        return None
    return entry.context


def auth_required():
    return web.HTTPForbidden(text='{"error":"请重新使用定海登录以启用定海功能","code":"dinghai_auth_required"}',
                             content_type='application/json')


def require_dinghai(request) -> DinghaiContext:
    """Requires auth_middleware's verified local session; context must never be serialized."""
    context = current_context(request)
    if context is None:
        raise auth_required()
    return context


async def _credentials_lifecycle(app):
    async def prune():
        while True:
            await asyncio.sleep(30)
            app['dinghai_credentials'].prune()
    task = asyncio.create_task(prune())
    try:
        yield
    finally:
        task.cancel()
        with suppress(asyncio.CancelledError):
            await task
        app['dinghai_credentials'].clear()


def register_credentials(app):
    app['dinghai_credentials'] = DinghaiCredentials()
    app.cleanup_ctx.append(_credentials_lifecycle)
