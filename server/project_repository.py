"""JSON project persistence. ACLs and write-lock ownership belong to the caller."""
import json
import os
import uuid
from pathlib import Path


class InvalidProjectId(ValueError):
    pass


def write_project(path, document):
    """Replace a complete document atomically, retaining the historical JSON format."""
    temporary = path.with_name(path.name + "." + uuid.uuid4().hex + ".tmp")
    try:
        temporary.write_text(json.dumps(document, ensure_ascii=False), encoding="utf-8")
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


class ProjectRepository:
    def __init__(self, directory):
        self.directory = Path(directory)

    def path(self, project_id):
        # Keep historical Unicode alphanumeric IDs, but never accept path components.
        if not isinstance(project_id, str) or not project_id.replace("-", "").isalnum():
            raise InvalidProjectId("非法项目 id")
        return self.directory / f"{project_id}.json"

    def exists(self, project_id):
        return self.path(project_id).is_file()

    def read(self, project_id):
        return json.loads(self.path(project_id).read_text(encoding="utf-8"))

    def write(self, project_id, document):
        write_project(self.path(project_id), document)

    def create(self, project_id, document):
        self.directory.mkdir(parents=True, exist_ok=True)
        self.write(project_id, document)

    def soft_delete(self, project_id):
        path = self.path(project_id)
        if path.exists():
            path.rename(path.with_suffix(".json.deleted"))
