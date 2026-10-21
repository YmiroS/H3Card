"""Project application operations; callers retain HTTP parsing, ACLs and locks.

The project-write middleware owns the non-reentrant lock. Services deliberately
never acquire it again. Authorization callbacks are awaited immediately before
writes after resource validation, preserving revocation checks across awaits.
"""
import time
import uuid

from .edit_export import ExportBusyError


class ProjectError(Exception):
    def __init__(self, status, *, reason=None, text=None):
        self.status, self.reason, self.text = status, reason, text
        super().__init__(text or reason)


class ProjectService:
    def __init__(self, repository):
        self.repository = repository

    def load(self, project_id):
        if not self.repository.exists(project_id):
            raise ProjectError(404, reason="项目不存在")
        return self.repository.read(project_id)

    def editable(self, project_id):
        project = self.load(project_id)
        if project.get("locked"):
            raise ProjectError(403, reason="locked project")
        return project

    async def create(self, user, body, *, store):
        team_id = body.get("team_id") or None
        pid = uuid.uuid4().hex[:12]
        document = {"id": pid, "name": (body.get("name") or "新项目").strip()[:40],
                    "cards": [], "edges": [], "view": {"x": 0, "y": 0, "k": 1},
                    "created": time.time(), "updated": time.time(), "rev": 0}
        # A failure leaves pending, never an active ACL referencing a missing file.
        acl = await store("create_project", pid, user["id"], state="pending", team_id=team_id)
        self.repository.create(pid, document)
        await store("set_project_state", pid, "active")
        return document, acl

    async def save(self, pid, old, body, *, validate, authorize, sync_name, publish):
        rev = old.get("rev", 0)
        if body.get("rev") != rev:
            raise ProjectError(409, reason="stale rev")
        if "name" in body:
            body["name"] = str(body.get("name") or "").strip()[:40]
            if not body["name"]:
                raise ProjectError(400, reason="项目名不能为空")
        if "cards" in body:
            if not isinstance(body["cards"], list) or any(not isinstance(card, dict) for card in body["cards"]):
                raise ProjectError(400, text="卡片数据不正确")
            card_ids = [card.get("id") for card in body["cards"]]
            if any(not isinstance(cid, str) or not cid for cid in card_ids) or len(card_ids) != len(set(card_ids)):
                raise ProjectError(400, text="卡片 ID 不正确或重复")
            old_cards = {card.get("id"): card for card in old.get("cards", [])}
            if any(cid not in old_cards for cid in card_ids):
                raise ProjectError(409, reason="cards must be created separately")
            for card in body["cards"]:
                previous = old_cards[card["id"]]
                for key in ("created_by", "created_by_name", "created_at"):
                    if key in previous:
                        card[key] = previous[key]
                    else:
                        card.pop(key, None)
        await validate(body)
        await authorize()
        previous_name = old.get("name")
        for key in ("name", "cards", "edges", "groups"):
            if key in body:
                old[key] = body[key]
        old["rev"] = rev + 1
        old["updated"] = time.time()
        self.repository.write(pid, old)
        if old.get("name") != previous_name:
            sync_name(pid, old.get("name") or "未命名")
        await publish(old)
        return old

    async def rename(self, pid, project, body, *, authorize, sync_name, publish):
        name = str(body.get("name") or "").strip()[:40]
        if not name:
            raise ProjectError(400, reason="项目名不能为空")
        if project.get("name") != name:
            project["name"] = name
            project["rev"] = project.get("rev", 0) + 1
            project["updated"] = time.time()
            await authorize()
            self.repository.write(pid, project)
            sync_name(pid, name)
            await publish(project)
        return project

    async def delete(self, pid, *, publish_deleted, store, close_presence, cancel_exports,
                     cancel_job, should_cancel):
        if self.repository.exists(pid) and self.repository.read(pid).get("locked"):
            raise ProjectError(403, reason="locked project")
        await publish_deleted()
        # Notify first, revoke access, close presence, cancel jobs, then soft-delete.
        # Failures after revocation must never reopen project access.
        await store("set_project_state", pid, "deleted")
        await close_presence()
        try:
            await cancel_exports(pid)
        except ExportBusyError:
            pass
        for jid in await store("list_project_jobs", pid):
            if should_cancel(jid):
                await cancel_job(jid)
        self.repository.soft_delete(pid)
