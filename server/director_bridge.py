"""Project director shots onto real canvas cards; callers own locks and persistence."""

import copy
import time
import uuid
from aiohttp import web


_STAGES = ("image", "video")


def _effective_params(card):
    params = copy.deepcopy(card.get("params") or {})
    for key, enabled in (card.get("optUse") or {}).items():
        value = (card.get("opt") or {}).get(key)
        if enabled and value is not None and str(value).strip():
            params[key] = str(value)
    return params


def _selected_output(card, selection):
    if not isinstance(selection, dict) or type(selection.get("index")) is not int:
        return None
    index = selection["index"]
    if index < 0 or not selection.get("job"):
        return None
    for entry in card.get("history") or []:
        outputs = entry.get("outputs") or []
        if entry.get("job") == selection["job"] and index < len(outputs):
            return outputs[index]
    return None


def _history_entry(job_id, job, card=None, outputs=None):
    card = card or {}
    ms = job.get("ms", card.get("ms"))
    if job.get("started") is not None and job.get("ended") is not None:
        ms = round((job["ended"] - job["started"]) * 1000)
    entry = {
        "ts": round(job["ended"] * 1000) if job.get("ended") is not None else None,
        "job": job_id, "cap": job.get("capability", card.get("cap")),
        "seed": job.get("seed", card.get("seed")), "ms": ms,
        "outputs": copy.deepcopy(outputs if outputs is not None else job.get("outputs") or []),
    }
    if job.get("prompts") is not None:
        entry["prompts"] = copy.deepcopy(job["prompts"])
    return entry


def _trusted_card_job(card, job, caps, project_id):
    """Execution modes may differ from the canvas mode, but never its output stage."""
    cap = (caps or {}).get((job or {}).get("capability")) or {}
    stage = card.get("director_stage")
    return bool(job and project_id and card.get("id")
                and job.get("project") == project_id and job.get("card") == card["id"]
                and stage in _STAGES and cap.get("kind") == "gen"
                and cap.get("outputType") == stage)


def sync_card_job(card, jobs, caps, project_id):
    """Synchronize a linked card with trusted jobs, retaining explicit adoption."""
    if not card.get("director_shot") or not card.get("job"):
        return
    job_id = card["job"]
    job = (jobs or {}).get(job_id)
    if not job:
        return  # Archived jobs must not erase persisted runtime or snapshots.
    if not _trusted_card_job(card, job, caps, project_id):
        return  # Wrong project/card, non-generation or mismatched output stage.
    for key in ("status", "progress", "error", "step"):
        if key in job:
            card[key] = copy.deepcopy(job[key])
    if job.get("seed") is not None:
        card["seed"] = job["seed"]
    if "queue_remaining" in job:
        card["queue_remaining"] = job["queue_remaining"]
    if job.get("started") is not None and job.get("ended") is not None:
        card["ms"] = round((job["ended"] - job["started"]) * 1000)
    outputs = job.get("outputs")
    if outputs is not None:
        card["outputs"] = copy.deepcopy(outputs)
    if job.get("status") == "done":
        history = card.setdefault("history", [])
        entry = next((h for h in history if h.get("job") == job_id), None)
        if outputs and entry is None:
            entry = _history_entry(job_id, job, card)
            if entry["ts"] is None:
                entry["ts"] = round(time.time() * 1000)
            history.insert(0, entry)
        elif outputs and entry is not None and not entry.get("outputs"):
            entry.update(_history_entry(job_id, job, card))
        if not outputs and entry and entry.get("outputs"):
            card["outputs"] = copy.deepcopy(entry["outputs"])
        selected = _selected_output(card, card.get("director_selected"))
        if selected is not None:
            card["outputs"] = [copy.deepcopy(selected)]


def _image_assets(assets):
    result = []
    for asset in (assets or {}).values():
        if isinstance(asset, dict) and asset.get("kind") == "image":
            item = {key: copy.deepcopy(asset[key]) for key in ("ref", "url", "kind") if key in asset}
            origin = asset.get("origin", asset.get("filename"))
            if origin is not None:
                item["origin"] = origin
            result.append(item)
    return result


def _legacy_assets(assets):
    return {"images[%d]" % index: copy.deepcopy(asset)
            for index, asset in enumerate(assets or [])}


def _merge_history(shot, cards, jobs, caps, project_id):
    entries = {}

    def add(item):
        stage, job_id = item.get("stage"), item.get("job")
        if stage not in _STAGES or not job_id:
            return
        key = (stage, job_id)
        entry = entries.setdefault(key, {"job": job_id, "stage": stage})
        if item.get("outputs"):
            entry["outputs"] = copy.deepcopy(item["outputs"])

    for item in shot.get("history") or []:
        add(item)
    for stage, card in cards.items():
        for item in reversed(card.get("history") or []):
            add({**item, "stage": stage})
        job_id = card.get("job")
        if job_id:
            job = (jobs or {}).get(job_id) or {}
            if not _trusted_card_job(card, job, caps, project_id):
                job = {}
            outputs = job.get("outputs")
            if not job and not outputs and not any(
                    h.get("job") == job_id and h.get("outputs") for h in card.get("history") or []):
                marker = card.get("director_selected") or {}
                if not marker or marker.get("job") == job_id:
                    outputs = card.get("outputs")
            add({"job": job_id, "stage": stage, "outputs": outputs})
    shot["history"] = list(entries.values())[-200:]


def project_director(project, caps, jobs):
    """Return a detached director view hydrated from detached, synced cards."""
    if project.get("director") is None:
        return None
    document = copy.deepcopy(project["director"])
    cards = copy.deepcopy(project.get("cards") or [])
    by_id = {card["id"]: card for card in cards}
    for card in cards:
        sync_card_job(card, jobs, caps, project.get("id"))
    for shot in document.get("shots") or []:
        linked = {}
        selected = shot.setdefault("selected", {})
        for stage in _STAGES:
            phase = shot.setdefault(stage, {})
            card_id = phase.get("card")
            card = by_id.get(card_id) if card_id else next((c for c in cards
                if c.get("director_shot") == shot["id"] and c.get("director_stage") == stage), None)
            if (card is None or card.get("director_shot") != shot["id"]
                    or card.get("director_stage") != stage):
                continue  # Keep dangling IDs: saving them must produce a 409.
            linked[stage] = card
            params = _effective_params(card)
            phase.update(card=card["id"], capability=card.get("cap"), params=params,
                         assets=copy.deepcopy(card.get("assets") or {}))
            if stage == "image" or "image" not in linked:
                shot["title"] = card.get("name", shot.get("title", ""))
                shot["description"] = params.get("prompt", "")
                shot["assets"] = _image_assets(card.get("assets"))
            marker = card.get("director_selected")
            if marker:
                selected[stage] = copy.deepcopy(marker)
            else:
                selected.pop(stage, None)
        _merge_history(shot, linked, jobs, caps, project.get("id"))
        for stage, card in linked.items():
            if card.get("director_selected"):
                continue
            outputs = card.get("outputs") or []
            if not outputs:
                continue
            candidates = list(card.get("history") or []) + [
                h for h in reversed(shot["history"]) if h["stage"] == stage]
            for entry in candidates:
                if not entry.get("job"):
                    continue
                match = next((i for i, output in enumerate(entry.get("outputs") or [])
                              if output == outputs[0]), None)
                if match is not None:
                    selected[stage] = {"job": entry["job"], "index": match}
                    break
    return document


def _capability(caps, capability, stage):
    cap = (caps or {}).get(capability)
    if (not cap or cap.get("kind") != "gen" or cap.get("outputType") != stage
            or not cap.get("_graph_ok")):
        raise web.HTTPBadRequest(text="生成能力不存在或与镜头阶段不匹配")
    return cap


def _migrate_history(card, shot, old_shot, stage, jobs, caps, project_id):
    # Only persisted director snapshots and trusted jobs can seed card outputs.
    persisted = {h["job"]: h for h in (old_shot or {}).get("history", [])
                 if h.get("stage") == stage}
    entries = {}
    for source in ((old_shot or {}).get("history") or []) + (shot.get("history") or []):
        if source.get("stage") != stage or not source.get("job"):
            continue
        job_id = source["job"]
        job = (jobs or {}).get(job_id) or {}
        outputs = job.get("outputs") or persisted.get(job_id, {}).get("outputs") or []
        entries[job_id] = _history_entry(job_id, job, card, outputs)
    card["history"] = list(reversed(list(entries.values())))
    if entries:
        card["job"] = next(reversed(entries))
        latest = entries[card["job"]]
        card["outputs"] = copy.deepcopy(latest["outputs"])
        if latest["outputs"]:
            card["status"] = "done"
            card["progress"] = 1
        sync_card_job(card, jobs, caps, project_id)


def _adopt(card, selection, jobs, caps, project_id):
    if not selection:
        card.pop("director_selected", None)
        return
    output = _selected_output(card, selection)
    if output is None and isinstance(selection, dict):
        job_id = selection.get("job")
        # A trusted cache entry is usable only for a job already on this card.
        known = card.get("job") == job_id or any(
            h.get("job") == job_id for h in card.get("history") or [])
        job = (jobs or {}).get(job_id) if job_id else None
        if (known and job and job.get("outputs")
                and _trusted_card_job(card, job, caps, project_id)):
            history = card.setdefault("history", [])
            entry = next((h for h in history if h.get("job") == job_id), None)
            if entry is None:
                history.insert(0, _history_entry(job_id, job, card))
            elif not entry.get("outputs"):
                entry.update(_history_entry(job_id, job, card))
            output = _selected_output(card, selection)
    if output is None:
        raise web.HTTPBadRequest(text="采用版本没有属于此卡片的已知产物")
    card["director_selected"] = copy.deepcopy(selection)
    card["outputs"] = [copy.deepcopy(output)]


def reference_storyboard(project, shot_id, version, slot, asset, caps, jobs):
    """Bind one adopted image to one empty video slot, without touching other media."""
    work = copy.deepcopy(project)
    document = project_director(work, caps, jobs)
    shot = next((s for s in (document or {}).get("shots", []) if s["id"] == shot_id), None)
    if shot is None:
        raise web.HTTPNotFound(text="镜头不存在")
    cards = {c["id"]: c for c in work.get("cards") or []}
    source = cards.get(shot["image"].get("card"))
    target = cards.get(shot["video"].get("card"))
    if any(card is None or card.get("director_shot") != shot_id
           or card.get("director_stage") != stage
           for card, stage in ((source, "image"), (target, "video"))):
        raise web.HTTPConflict(text="分镜或视频节点不存在，请先关联真实节点")
    sync_card_job(source, jobs, caps, work.get("id"))
    output = _selected_output(source, version)
    if shot["selected"].get("image") != version or not output or output.get("kind") != "image":
        raise web.HTTPBadRequest(text="引用版本必须是当前采用的分镜产物")
    cap = _capability(caps, target.get("cap"), "video")
    if not any(s.get("key") == slot and s.get("type") == "image" for s in cap.get("inputs") or []):
        raise web.HTTPBadRequest(text="目标不是当前视频模式的图片槽")
    edges = work.setdefault("edges", [])
    if (target.get("assets") or {}).get(slot) or any(
            e.get("to") == target["id"] and slot in e.get("slots", [e.get("slot")]) for e in edges):
        raise web.HTTPConflict(text="图片槽已被占用，不会覆盖已有素材或连线")
    if any(e.get("from") == source["id"] and e.get("to") == target["id"]
           and e.get("version") == version for e in edges):
        raise web.HTTPConflict(text="此分镜版本已连接到视频参考")
    target.setdefault("assets", {})[slot] = copy.deepcopy(asset)
    edges.append({"from": source["id"], "to": target["id"], "slot": slot,
                  "slots": [slot], "version": copy.deepcopy(version)})
    work["director"] = project_director(work, caps, jobs)
    return work


def import_director(project, card_ids, shot_id, caps, jobs):
    """Explicitly attach existing generation cards, never create or scan for members.

    Work on a detached copy so a rejected batch cannot partially mark cards.
    The caller validates resources and revisions before persisting this result.
    """
    work = copy.deepcopy(project)
    document = project_director(work, caps, jobs) or {
        "rev": 0, "script": "", "style": "", "shots": [],
    }
    work["director"] = document
    shots = document["shots"]
    target = None
    if shot_id is not None:
        matches = [shot for shot in shots if shot["id"] == shot_id]
        if len(matches) != 1:
            raise web.HTTPNotFound(text="镜头不存在")
        if len(card_ids) != 1:
            raise web.HTTPBadRequest(text="指定镜头时只能导入一张卡片")
        target = matches[0]
    elif len(shots) + len(card_ids) > 200:
        raise web.HTTPBadRequest(text="最多 200 个镜头")
    linked_ids = {shot[stage].get("card") for shot in shots for stage in _STAGES
                  if shot[stage].get("card")}
    by_id = {}
    for card in work.get("cards") or []:
        by_id.setdefault(card["id"], []).append(card)
    shot_ids = {shot["id"] for shot in shots}
    for card_id in card_ids:
        matches = by_id.get(card_id, [])
        if not matches:
            raise web.HTTPNotFound(text="卡片不存在于当前项目")
        if len(matches) != 1:
            raise web.HTTPBadRequest(text="画布卡片 ID 重复")
        card = matches[0]
        stage = (caps.get(card.get("cap")) or {}).get("outputType")
        if stage not in _STAGES or card.get("type") != "card_" + stage:
            raise web.HTTPBadRequest(text="只能导入图片或视频生成卡片")
        _capability(caps, card.get("cap"), stage)
        if card.get("locked") or card.get("readonly") or card.get("read_only"):
            raise web.HTTPForbidden(text="卡片只读，不能导入")
        if (card_id in linked_ids or card.get("director_shot")
                or card.get("director_stage")):
            raise web.HTTPBadRequest(text="卡片已经属于导演镜头")
        if target is None:
            sid = uuid.uuid4().hex
            while sid in shot_ids:
                sid = uuid.uuid4().hex
            shot_ids.add(sid)
            shot = {
                "id": sid, "title": card.get("name", ""),
                "description": _effective_params(card).get("prompt", ""),
                "shotSize": "", "movement": "", "notes": "",
                "image": {"capability": "", "params": {}},
                "video": {"capability": "", "params": {}},
                "assets": [], "history": [], "selected": {},
            }
            shots.append(shot)
        else:
            shot = target
            phase = shot[stage]
            if phase.get("card") or any(c.get("director_shot") == shot["id"]
                    and c.get("director_stage") == stage for c in work.get("cards") or []):
                raise web.HTTPBadRequest(text="镜头的此阶段已经有关联卡片")
            if phase.get("capability") not in (None, "", card["cap"]):
                raise web.HTTPBadRequest(text="卡片能力与镜头阶段不兼容")
        card["director_shot"] = shot["id"]
        card["director_stage"] = stage
        sync_card_job(card, jobs, caps, project.get("id"))
        shot[stage] = {"card": card_id, "capability": card["cap"],
                       "params": _effective_params(card),
                       "assets": copy.deepcopy(card.get("assets") or {})}
        linked_ids.add(card_id)
    work["director"] = project_director(work, caps, jobs)
    return work


def link_director(project, document, caps, user, jobs):
    """Link/save under the caller's project lock, without partial failure writes.

    Authentication, resource/job membership, revision checks, disk writes and
    broadcasts deliberately remain the caller's responsibility.
    """
    previous = project_director(project, caps, jobs)
    work = copy.deepcopy(project)
    draft = copy.deepcopy(document)
    cards = work.setdefault("cards", [])
    edges = work.setdefault("edges", [])
    by_id = {card["id"]: card for card in cards}
    old_shots = {s["id"]: s for s in (project.get("director") or {}).get("shots", [])}
    baselines = {s["id"]: s for s in (previous or {}).get("shots", [])}
    for card in cards:
        sync_card_job(card, jobs, caps, project.get("id"))

    # A fixed two-column annex lies beyond every existing card's right edge.
    # Later saves extend beyond it rather than moving or grouping old cards.
    right = max((c.get("x", 0) + max(c.get("w") or c.get("width") or 320, 320)
                 for c in cards), default=-160) + 160
    top = min((c.get("y", 0) for c in cards), default=0)
    row = 0
    seen = set()
    claimed = set()
    for shot in draft.get("shots") or []:
        sid = shot["id"]
        if sid in seen:
            raise web.HTTPBadRequest(text="镜头 ID 重复")
        seen.add(sid)
        old_shot = old_shots.get(sid)
        baseline = baselines.get(sid) or old_shot or {}
        linked, created = {}, set()
        rename = shot.get("title", "") != baseline.get("title", "")
        for column, stage in enumerate(_STAGES):
            phase = shot[stage]
            old_phase = (old_shot or {}).get(stage) or {}
            before = baseline.get(stage) or {}
            old_id = old_phase.get("card")
            requested_id = phase.get("card")
            if requested_id and requested_id != old_id:
                raise web.HTTPBadRequest(text="不能修改或伪造镜头卡片关联")
            if old_id:
                card = by_id.get(old_id)
                if card is None:
                    raise web.HTTPConflict(text="关联卡片已被删除，请重新加载；不能自动复活")
                if ((card.get("director_shot") not in (None, sid))
                        or (card.get("director_stage") not in (None, stage))):
                    raise web.HTTPBadRequest(text="镜头卡片关联标记不匹配")
            else:
                card = None
            cap_id = phase.get("capability")
            if not cap_id and card is None:
                continue  # Empty stages are intentional, not companion-card requests.
            _capability(caps, cap_id, stage)
            params = copy.deepcopy(phase.get("params") or {})
            primary = stage == "image" or "image" not in linked
            if card is None:
                if shot.get("description"):
                    params.setdefault("prompt", shot["description"])
            elif primary and shot.get("description", "") != baseline.get("description", ""):
                params["prompt"] = shot.get("description", "")

            if card is None:
                card_id = uuid.uuid4().hex
                while card_id in by_id:
                    card_id = uuid.uuid4().hex
                card = {
                    "id": card_id, "type": "card_" + stage, "cap": cap_id,
                    "name": shot.get("title", ""), "x": right + column * 480,
                    "y": top + row * 440, "params": params,
                    "assets": copy.deepcopy(phase["assets"]) if "assets" in phase
                              else _legacy_assets(shot.get("assets")),
                    "status": "idle", "progress": 0, "outputs": [], "history": [],
                    "created_by": user["id"],
                    "created_by_name": user.get("display_name") or user.get("username") or "协作者",
                    "created_at": time.time(), "director_shot": sid, "director_stage": stage,
                }
                _migrate_history(card, shot, old_shot, stage, jobs, caps, project.get("id"))
                cards.append(card)
                by_id[card_id] = card
                created.add(stage)
            else:
                if cap_id != before.get("capability"):
                    card["cap"] = cap_id
                before_params = before.get("params") or {}
                changed = {key for key in set(params) | set(before_params)
                           if (key in params) != (key in before_params)
                           or params.get(key) != before_params.get(key)}
                if changed:
                    raw = card.setdefault("params", {})
                    opt_use = card.setdefault("optUse", {})
                    for key in changed:
                        if key in params:
                            raw[key] = copy.deepcopy(params[key])
                        else:
                            raw.pop(key, None)
                        opt_use[key] = False
                if "assets" in phase:
                    if phase["assets"] != (before.get("assets") or {}):
                        card["assets"] = copy.deepcopy(phase["assets"])
                elif shot.get("assets", []) != baseline.get("assets", []):
                    # Legacy clients know only reference images, not other slots.
                    assets = {key: copy.deepcopy(value) for key, value in (card.get("assets") or {}).items()
                              if not (key.startswith("images[") and key.endswith("]"))}
                    assets.update(_legacy_assets(shot.get("assets")))
                    card["assets"] = assets
                if rename:
                    card["name"] = shot.get("title", "")
                card["director_shot"] = sid
                card["director_stage"] = stage
            if card["id"] in claimed:
                raise web.HTTPBadRequest(text="同一卡片不能属于多个镜头或阶段")
            claimed.add(card["id"])
            phase["card"] = card["id"]
            linked[stage] = card
            choice = (shot.get("selected") or {}).get(stage)
            previous_choice = (baseline.get("selected") or {}).get(stage)
            if stage in created or choice != previous_choice:
                _adopt(card, choice, jobs, caps, project.get("id"))

        if created:
            row += 1

    removed = set(old_shots) - seen
    for card in cards:
        if card.get("director_shot") in removed:
            for key in ("director_shot", "director_stage", "director_selected"):
                card.pop(key, None)
    work["director"] = draft
    result = project_director(work, caps, jobs)
    project["cards"] = cards
    project["edges"] = edges
    document.clear()
    document.update(result)
    return document
