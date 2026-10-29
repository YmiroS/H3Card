"""Domain route registration. Only named handlers cross this composition boundary.

Authentication and project serialization remain application-wide middleware.
add_get intentionally retains aiohttp's automatic HEAD registration.
"""
from functools import partial


STATIC_ASSETS = (
    "app.js", "style.css", "director.js", "director.css", "director_edit.js",
    "if-studio.js", "admin-shell.css", "admin-shell.js", "controller-page.js", "costs-page.js",
    "image-composer.js", "image-composer.css", "vendor/fabric.min.js",
    "features/node-parameters.js", "features/project-persistence.js", "features/task-panel.js",
    "capacity-page.js", "monitor.css", "monitor-page.js", "monitor-alerts.js",
)


def register_page_routes(app, *, index, director_index, if_studio_index,
                         controller_index, controller_costs, controller_capacity,
                         permissions_page, teams_page, static_asset):
    for path, handler in (("/", index), ("/director", director_index),
                          ("/if-studio", if_studio_index), ("/controller", controller_index),
                          ("/controller/costs", controller_costs),
                          ("/controller/capacity", controller_capacity),
                          ("/admin/permissions", permissions_page), ("/teams", teams_page)):
        app.router.add_get(path, handler)
    # Integrated apps register only the immutable build catalog (including protected
    # vendor resources). Legacy web assets are fixtures for standalone apps only.
    if app.get('frontend') is None:
        for name in STATIC_ASSETS:
            app.router.add_get("/" + name, partial(static_asset, name=name))


def register_project_routes(app, *, api_projects, api_project_create, api_project_get,
                            api_director_save, api_director_import, api_director_reference,
                            api_project_view, api_project_card_create, api_project_presence,
                            api_project_shares, api_project_save, api_project_rename,
                            api_project_copy, api_project_delete):
    app.router.add_get("/api/projects", api_projects)
    app.router.add_post("/api/projects", api_project_create)
    app.router.add_get("/api/projects/{pid}", api_project_get)
    app.router.add_put("/api/projects/{pid}/director", api_director_save)
    app.router.add_post("/api/projects/{pid}/director/import", api_director_import)
    app.router.add_post("/api/projects/{pid}/director/reference", api_director_reference)
    app.router.add_put("/api/projects/{pid}/view", api_project_view)
    app.router.add_post("/api/projects/{pid}/cards", api_project_card_create)
    app.router.add_get("/api/projects/{pid}/presence", api_project_presence)
    app.router.add_get("/api/projects/{pid}/shares", api_project_shares)
    app.router.add_put("/api/projects/{pid}/shares", api_project_shares)
    app.router.add_put("/api/projects/{pid}", api_project_save)
    app.router.add_post("/api/projects/{pid}/rename", api_project_rename)
    app.router.add_post("/api/projects/{pid}/copy", api_project_copy)
    app.router.add_delete("/api/projects/{pid}", api_project_delete)


def register_media_routes(app, *, api_upload, api_preview_file, api_preview_status,
                          api_thumbnail, api_if_reference, api_media, api_file,
                          api_artifact, api_upload_file):
    app.router.add_post("/api/upload", api_upload)
    app.router.add_get("/api/preview/{name}/file", api_preview_file)
    app.router.add_get("/api/preview/{name}", api_preview_status)
    app.router.add_get("/api/thumbnail", api_thumbnail)
    app.router.add_get("/api/if-reference", api_if_reference)
    app.router.add_get("/api/media", api_media)
    app.router.add_get("/api/file", api_file)
    app.router.add_get("/api/artifact/{pid}/{name}", api_artifact)
    app.router.add_get("/api/upload/{name}", api_upload_file)


def register_generation_routes(app, *, api_health, api_status, api_cards, api_reload,
                               api_generate, api_generation_workers, api_rewrite, api_text, api_jobs,
                               api_jobs_clear, api_jobs_history, api_job, api_cancel, api_job_delete):
    app.router.add_get("/api/health", api_health)
    app.router.add_get("/api/status", api_status)
    app.router.add_get("/api/cards", api_cards)
    app.router.add_post("/api/reload", api_reload)
    app.router.add_post("/api/generate", api_generate)
    app.router.add_get("/api/generation/workers", api_generation_workers)
    app.router.add_post("/api/rewrite", api_rewrite)
    app.router.add_post("/api/text", api_text)
    app.router.add_get("/api/jobs", api_jobs)
    app.router.add_get("/api/jobs/history", api_jobs_history)
    app.router.add_post("/api/jobs/clear", api_jobs_clear)
    app.router.add_get("/api/job/{pid}", api_job)
    app.router.add_post("/api/job/{pid}/cancel", api_cancel)
    app.router.add_delete("/api/job/{pid}", api_job_delete)


def register_controller_routes(app, *, api_workers, api_worker_temperature,
                               api_costs, api_capacity, api_capacity_export,
                               api_capacity_estimate, api_capacity_review,
                               api_capacity_probe_outputs, api_capacity_worker,
                               api_worker_enabled, api_worker_delete, api_worker_restart,
                               api_workers_sync_all):
    app.router.add_get("/api/workers", api_workers)
    app.router.add_get("/api/workers/{worker_id}/temperature", api_worker_temperature)
    app.router.add_get("/api/costs", api_costs)
    app.router.add_get("/api/capacity", api_capacity)
    app.router.add_get("/api/capacity/export", api_capacity_export)
    app.router.add_post("/api/capacity/estimate", api_capacity_estimate)
    app.router.add_post("/api/capacity/jobs/{pid}/review", api_capacity_review)
    app.router.add_post("/api/capacity/jobs/{pid}/probe-outputs", api_capacity_probe_outputs)
    app.router.add_post("/api/capacity/workers/{worker_id}", api_capacity_worker)
    app.router.add_post("/api/workers/{worker_id}/enabled", api_worker_enabled)
    app.router.add_delete("/api/workers/{worker_id}", api_worker_delete)
    app.router.add_post("/api/admin/workers/sync-all", api_workers_sync_all)
    app.router.add_post("/api/admin/workers/{worker_id}/restart", api_worker_restart)


def register_worker_routes(app, *, api_agent_register, api_agent_heartbeat,
                           api_agent_acquire, api_agent_start, api_agent_input,
                           api_agent_event, api_agent_artifact, api_agent_complete,
                           api_agent_failed):
    app.router.add_post("/agent/v1/register", api_agent_register)
    app.router.add_post("/agent/v1/heartbeat", api_agent_heartbeat)
    app.router.add_post("/agent/v1/jobs/acquire", api_agent_acquire)
    app.router.add_post("/agent/v1/jobs/{pid}/start", api_agent_start)
    app.router.add_get("/agent/v1/jobs/{pid}/inputs/{name}", api_agent_input)
    app.router.add_post("/agent/v1/jobs/{pid}/event", api_agent_event)
    app.router.add_post("/agent/v1/jobs/{pid}/artifact", api_agent_artifact)
    app.router.add_post("/agent/v1/jobs/{pid}/complete", api_agent_complete)
    app.router.add_post("/agent/v1/jobs/{pid}/failed", api_agent_failed)
