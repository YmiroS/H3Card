"""HTTP boundary for privileged fleet commands; no shell execution on the controller."""
import asyncio

from aiohttp import web

from server.auth import COOKIE, require_admin
from server.auth_store import AuthError
from worker_commands import CommandConflict, command_presets


async def _body(request):
    try:
        body = await request.json()
    except (ValueError, UnicodeError) as exc:
        raise web.HTTPBadRequest(text="请求必须为 JSON 对象") from exc
    if not isinstance(body, dict):
        raise web.HTTPBadRequest(text="请求必须为 JSON 对象")
    return body


async def _call(method, *args):
    try:
        value = await asyncio.to_thread(method, *args)
    except AuthError:
        raise
    except CommandConflict as exc:
        raise web.HTTPConflict(text=str(exc)) from exc
    except ValueError as exc:
        raise web.HTTPBadRequest(text=str(exc)) from exc
    except KeyError as exc:
        raise web.HTTPNotFound(text=str(exc.args[0])) from exc
    return web.json_response(value, headers={"Cache-Control": "no-store"})


async def _admin_call(request, method, *args):
    user = require_admin(request)
    auth = request.app.get("auth_store")
    if auth is None:
        raise web.HTTPServiceUnavailable(text="认证服务尚未配置")
    token = request.cookies.get(COOKIE, "")

    def authorized():
        # Lock order is auth -> dispatch; hold authorization through command COMMIT.
        with auth._tx():
            auth._check_actor(user["id"], token)
            return method(*args)

    return await _call(authorized)


def register_worker_command_routes(app, *, get_store, require_agent, agent_enabled=True):
    def commands(request):
        return get_store(request.app).commands

    async def create(request):
        user = require_admin(request)
        body = await _body(request)
        return await _admin_call(request, commands(request).create, user["id"], body)

    async def history(request):
        require_admin(request)
        try:
            offset = int(request.query.get("offset", "0"))
            limit = int(request.query.get("limit", "20"))
        except ValueError as exc:
            raise web.HTTPBadRequest(text="分页参数无效") from exc
        return await _admin_call(request, commands(request).history, offset, limit)

    async def detail(request):
        require_admin(request)
        return await _admin_call(request, commands(request).detail, request.match_info["batch_id"])

    async def presets(request):
        require_admin(request)
        return web.json_response(command_presets(), headers={"Cache-Control": "no-store"})

    async def cancel(request):
        require_admin(request)
        body = await _body(request)
        execution_id = body.get("execution_id")
        if (set(body) - {"execution_id"} or "execution_id" in body and (
                not isinstance(execution_id, str) or not execution_id or len(execution_id) > 128)):
            raise web.HTTPBadRequest(text="取消参数无效")
        return await _admin_call(request, commands(request).cancel, request.match_info["batch_id"], execution_id)

    async def resolve(request):
        user = require_admin(request)
        body = await _body(request)
        if (set(body) != {"execution_id", "confirmed_stopped"}
                or body["confirmed_stopped"] is not True
                or not isinstance(body["execution_id"], str)
                or not body["execution_id"] or len(body["execution_id"]) > 128):
            raise web.HTTPBadRequest(text="必须现场核实进程已停止，确认后才能解除占用")
        return await _admin_call(request, commands(request).resolve, request.match_info["batch_id"],
                           body["execution_id"], user["id"])

    async def claim(request):
        worker_id = require_agent(request)
        body = await _body(request)
        if set(body) != {"claim_key"}:
            raise web.HTTPBadRequest(text="领取参数无效")
        return await _call(commands(request).claim, request.match_info["execution_id"],
                           worker_id, body["claim_key"])

    async def report(request):
        worker_id = require_agent(request)
        body = await _body(request)
        return await _call(commands(request).report, request.match_info["execution_id"], worker_id, body)

    base = "/api/admin/worker-commands"
    app.router.add_get(base + "/presets", presets)
    app.router.add_get(base, history)
    app.router.add_post(base, create)
    app.router.add_get(base + "/{batch_id}", detail)
    app.router.add_post(base + "/{batch_id}/cancel", cancel)
    app.router.add_post(base + "/{batch_id}/resolve", resolve)
    if agent_enabled:
        app.router.add_post("/agent/v1/commands/{execution_id}/claim", claim)
        app.router.add_post("/agent/v1/commands/{execution_id}/result", report)
