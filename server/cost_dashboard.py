"""管理员费用看板：全量汇总、可信归属与独立明细筛选。"""
import asyncio
import base64
import csv
import hashlib
import hmac
import io
import json
import math
import sqlite3
import time
from datetime import datetime, timedelta, timezone

from aiohttp import web

from .auth import require_admin


BEIJING = timezone(timedelta(hours=8))
METRIC_FIELDS = (
    'tasks', 'done', 'error', 'canceled', 'running', 'queued', 'generation_tasks', 'api_tasks',
    'unknown_cost_tasks', 'actual_cost', 'estimated_cost', 'total_cost', 'failed_waste',
    'gpu_hours', 'electricity_cost', 'retail_min', 'retail_max', 'retail_known_tasks',
    'retail_unknown_tasks', 'identified_account_tasks', 'runtime_unknown_tasks',
)
QUERY_FIELDS = {
    'from', 'to', 'account', 'department', 'project', 'trend_source', 'trend_category',
    'detail_source', 'detail_status', 'detail_q', 'detail_model', 'detail_day',
    'detail_dimension', 'detail_key', 'limit', 'cursor',
}
# 只允许无敏感信息的规格字段进入响应，不透传任意 dimensions。
SAFE_DIMENSIONS = {
    'model', 'model_source', 'provider', 'billing_mode', 'requested_size', 'quality', 'request_id',
    'generation_unknown', 'input_image_count', 'image_count', 'audio_count', 'video_count',
    'duration', 'source_duration', 'width', 'height', 'megapixels', 'segment_count',
    'output_width', 'output_height', 'output_duration', 'output_count', 'output_fps',
    'elapsed_ms', 'exchange_rate', 'exchange_version', 'local_review_import', 'electricity_basis',
}


def _day(timestamp):
    return datetime.fromtimestamp(timestamp, BEIJING).date().isoformat()


def _metric(items):
    result = dict.fromkeys(METRIC_FIELDS, 0)
    for item in items:
        result['tasks'] += 1
        if item['status'] in ('done', 'error', 'canceled', 'running', 'queued'):
            result[item['status']] += 1
        result[item['source'] + '_tasks'] += 1
        result['unknown_cost_tasks'] += item['cost_source'] == 'unknown'
        result['identified_account_tasks'] += bool(item['account_id'])
        result['runtime_unknown_tasks'] += item['source'] == 'generation' and item['runtime_seconds'] is None
        for field in ('actual_cost', 'estimated_cost', 'electricity_cost', 'retail_min', 'retail_max'):
            result[field] += item.get(field) or 0
        result['total_cost'] += item['recognized_cost'] or 0
        if item['status'] in ('error', 'canceled', 'timeout'):
            result['failed_waste'] += item['recognized_cost'] or 0
        if item['source'] == 'generation':
            result['gpu_hours'] += (item['runtime_seconds'] or 0) / 3600
        if item['status'] == 'done':
            result['retail_known_tasks' if item['retail_source'] == 'priced' else 'retail_unknown_tasks'] += 1
    return {key: round(value, 6) if isinstance(value, float) else value for key, value in result.items()}


def _group(items, key_field, label_field=None):
    groups = {}
    for item in items:
        key = item[key_field]
        group = groups.setdefault(key, {'items': [], 'label': item.get(label_field or key_field) or key})
        group['items'].append(item)
    result = []
    for key, value in groups.items():
        group = dict(_metric(value['items']), key=key, label=value['label'])
        if key_field == 'project_id' and value['items'][0]['project_basis'] == 'legacy_name':
            group['project_basis'] = 'legacy_name'
            group['note'] = '历史记录无稳定项目 ID，仅按记录项目名分组'
        result.append(group)
    return sorted(result, key=lambda item: (-item['total_cost'], item['key']))


def _enrich(ledger, rows, users, submitters, departments, assignments):
    accounts = {user['id']: user for user in users}
    department_names = {department['id']: department['name'] for department in departments}
    categories = ledger.pricing.get('categories') or {}
    items = []
    for row in rows:
        dims = json.loads(row['dimensions_json'] or '{}')
        is_api = row['event_kind'] in ('api', 'image_api')
        user_id = row['snapshot_user_id'] or (submitters.get(row['job_id']) or {}).get('submitter_id')
        user = accounts.get(user_id) or {}
        submitter = submitters.get(row['job_id']) or {}
        account_name = (user.get('display_name') or user.get('username')
                        or submitter.get('submitter_display_name') or submitter.get('submitter_username')
                        or user_id or '未知账号')
        if row['snapshot_user_id']:
            department_id = row['snapshot_department_id']
            department_name = row['snapshot_department_name']
            basis = 'snapshot'
        elif user_id:
            department_id = assignments.get(user_id)
            department_name = department_names.get(department_id)
            basis = 'current_assignment'
        else:
            department_id = department_name = None
            basis = 'unknown'
        actual = row['total_cost_micros']
        low, high = row['estimated_min_micros'], row['estimated_max_micros']
        # 生成预估须完成才确认，已捕获的 API 用量可在未完成时已有估算。
        estimated = ((low + high) / 2 / 1_000_000
                     if actual is None and low is not None and high is not None
                     and (row['status'] == 'done' or (is_api and row['cost_source'] == 'estimated')) else None)
        actual = None if actual is None else actual / 1_000_000
        source = 'actual' if actual is not None else 'estimated' if estimated is not None else 'unknown'
        recognized = actual if actual is not None else estimated
        quote_capability = 'text' if row['event_kind'] == 'api' else row['capability']
        retail_low, retail_high, retail_basis = ledger.retail_quote(quote_capability, dims)
        priced = row['status'] == 'done' and retail_low is not None and retail_high is not None
        project_id = row['project_id'] or ('legacy:' + (row['project_name'] or 'unknown'))
        provider = dims.get('provider_billing') or {}
        usage = dims.get('usage') or {}
        snapshot_worker_name = dims.get('worker_name') if dims.get('local_review_import') is True else None
        if not isinstance(snapshot_worker_name, str) or not snapshot_worker_name.strip():
            snapshot_worker_name = None
        item = {
            'job_id': row['job_id'], 'event_kind': row['event_kind'],
            'capability': row['capability'], 'category': row['category'] or 'other',
            'category_name': categories.get(row['category'], row['category'] or '其他'),
            'status': row['status'], 'project_name': row['project_name'] or '未知项目',
            'card_name': row['card_name'] or '', 'worker_id': 'paid_api' if is_api else row['worker_id'] or 'unassigned',
            'worker_name': '付费 API' if is_api else row['worker_name'] or snapshot_worker_name or row['worker_id'] or '未分配执行端',
            'created_at': row['created_at'], 'started_at': row['started_at'], 'ended_at': row['ended_at'],
            'runtime_seconds': row['runtime_seconds'], 'actual_cost': actual or 0,
            'estimated_cost': estimated or 0, 'recognized_cost': recognized, 'cost_source': source,
            'retail_min': retail_low / 1_000_000 if priced else 0,
            'retail_max': retail_high / 1_000_000 if priced else 0, 'retail_basis': retail_basis,
            'retail_source': 'priced' if priced else 'unpriced' if row['status'] == 'done' else 'not_billable',
            'dimensions': {key: value for key, value in dims.items() if key in SAFE_DIMENSIONS
                           and isinstance(value, (str, int, float, bool, type(None)))},
            'source': 'api' if is_api else 'generation', 'account_id': user_id,
            'account_name': account_name, 'department_id': department_id,
            'department_name': department_name, 'attribution_basis': basis, 'project_id': project_id,
            'project_basis': 'stable_id' if row['project_id'] else 'legacy_name',
            'project_note': '' if row['project_id'] else '历史记录无稳定项目 ID，仅按记录项目名分组',
            'model': dims.get('model') or None,
            'electricity_cost': None if row['electricity_cost_micros'] is None else row['electricity_cost_micros'] / 1_000_000,
            'prompt_tokens': usage.get('input_tokens', row['prompt_tokens']),
            'completion_tokens': usage.get('output_tokens', row['completion_tokens']),
            'cached_tokens': usage.get('cached_tokens'), 'provider_amount': provider.get('amount'),
            'provider_currency': provider.get('currency'),
            'billing_source': dims.get('billing_source') or row['cost_source'] or 'unknown',
            'request_id': dims.get('request_id'),
        }
        # 内部分组字段在最终响应前剔除。
        item['_account'] = user_id or 'unknown'
        item['_department'] = department_id or ('unassigned' if user_id else 'unknown')
        item['_department_label'] = department_name or ('未分配部门' if user_id else '未知部门')
        item['_model'] = item['model'] or 'unknown'
        items.append(item)
    return items


def _decode_cursor(ledger, token):
    try:
        if len(token) > 4096:
            raise ValueError()
        raw, signature = token.split('.')
        expected = hmac.new(ledger.dashboard_cursor_key, raw.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected):
            raise ValueError()
        payload = json.loads(base64.urlsafe_b64decode(raw + '=' * (-len(raw) % 4)))
        if (not isinstance(payload, dict) or set(payload) != {'as_of', 'query', 'last', 'max_rowid'}
                or type(payload['max_rowid']) is not int or not 0 <= payload['max_rowid'] <= 2 ** 63 - 1
                or not isinstance(payload['query'], str)
                or not isinstance(payload['as_of'], (float, int))
                or not math.isfinite(payload['as_of']) or payload['as_of'] < 0
                or not isinstance(payload['last'], list) or len(payload['last']) != 2
                or not isinstance(payload['last'][0], (int, float))
                or not math.isfinite(payload['last'][0]) or not isinstance(payload['last'][1], str)):
            raise ValueError()
        return payload
    except (ValueError, TypeError, KeyError, UnicodeError):
        raise web.HTTPBadRequest(text='无效的分页游标') from None


def _encode_cursor(ledger, as_of, fingerprint, last, max_rowid):
    payload = {'as_of': as_of, 'query': fingerprint, 'last': [last['created_at'], last['job_id']],
               'max_rowid': max_rowid}
    raw = base64.urlsafe_b64encode(json.dumps(payload, separators=(',', ':')).encode()).decode().rstrip('=')
    signature = hmac.new(ledger.dashboard_cursor_key, raw.encode(), hashlib.sha256).hexdigest()
    return raw + '.' + signature


def _query(ledger, query):
    if set(query) - QUERY_FIELDS or any(len(query.getall(key)) != 1 for key in query):
        raise web.HTTPBadRequest(text='包含未知或重复的查询参数')
    cursor = _decode_cursor(ledger, query['cursor']) if 'cursor' in query else None
    as_of = cursor['as_of'] if cursor else time.time()
    result = {}
    try:
        for key, default in (('from', 0), ('to', as_of)):
            value = float(query.get(key, default))
            if not math.isfinite(value) or value < 0:
                raise ValueError()
            _day(value)
            result[key] = value
        if result['from'] > result['to']:
            raise ValueError()
        limit = query.get('limit', '10')
        if not limit.isascii() or not limit.isdigit() or not 1 <= int(limit) <= 100:
            raise ValueError()
        result['limit'] = int(limit)
        enums = {
            'trend_source': ('all', 'generation', 'api'), 'detail_source': ('all', 'generation', 'api'),
            'detail_status': ('all', 'actual', 'estimated', 'unknown', 'done', 'error', 'canceled', 'running', 'queued'),
            'detail_dimension': ('category', 'capability', 'worker'),
        }
        for key, allowed in enums.items():
            value = query.get(key, 'category' if key == 'detail_dimension' else 'all')
            if value not in allowed:
                raise ValueError()
            result[key] = value
        for key in ('account', 'department', 'project', 'trend_category'):
            result[key] = query.get(key, 'all')
            if not result[key] or len(result[key]) > 512:
                raise ValueError()
        for key in ('detail_q', 'detail_model', 'detail_day', 'detail_key'):
            result[key] = query.get(key, '')
            if len(result[key]) > 512:
                raise ValueError()
        if result['detail_day']:
            parsed_day = datetime.strptime(result['detail_day'], '%Y-%m-%d').date()
            if parsed_day.isoformat() != result['detail_day']:
                raise ValueError()
    except (ValueError, OverflowError, OSError):
        raise web.HTTPBadRequest(text='无效的费用查询参数') from None
    fingerprint = hashlib.sha256(json.dumps(result, sort_keys=True).encode()).hexdigest()
    if cursor and cursor['query'] != fingerprint:
        raise web.HTTPBadRequest(text='分页游标不属于当前查询')
    return result, as_of, fingerprint, cursor


def _detail_matches(item, query):
    if query['detail_source'] != 'all' and item['source'] != query['detail_source']:
        return False
    status = query['detail_status']
    if status != 'all' and status != item['status'] and status != item['cost_source']:
        return False
    if query['detail_model'] not in ('', 'all') and item['_model'] != query['detail_model']:
        return False
    if query['detail_day'] and _day(item['created_at']) != query['detail_day']:
        return False
    dimension = 'worker_id' if query['detail_dimension'] == 'worker' else query['detail_dimension']
    if query['detail_key'] and item[dimension] != query['detail_key']:
        return False
    text = query['detail_q'].casefold()
    return not text or any(text in str(item.get(field) or '').casefold() for field in (
        'job_id', 'card_name', 'project_name', 'account_name', 'department_name',
        'model', 'capability', 'request_id',
    ))


def _public_item(item):
    return {key: value for key, value in item.items() if not key.startswith('_')}


def _build(ledger, store, query, as_of, fingerprint, cursor, export=False):
    rows, max_rowid = ledger.dashboard_snapshot(
        query['from'], min(query['to'], as_of), cursor['max_rowid'] if cursor else None)
    users = store.list_users()
    submitters = {}
    for offset in range(0, len(rows), 500):
        submitters.update(store.job_submitters([row['job_id'] for row in rows[offset:offset + 500]
                                              if not row['snapshot_user_id']]))
    departments, assignments = ledger.department_catalog()
    items = _enrich(ledger, rows, users, submitters, departments, assignments)
    # 全局筛选不接收趋势或明细条件。
    items = [item for item in items
             if (query['account'] == 'all' or item['_account'] == query['account'])
             and (query['department'] == 'all' or item['_department'] == query['department'])
             and (query['project'] == 'all' or item['project_id'] == query['project'])]
    details = [item for item in items if _detail_matches(item, query)]
    if export:
        return [_public_item(item) for item in details]
    detail_metric = _metric(details)
    page_items = details
    if cursor:
        boundary = tuple(cursor['last'])
        page_items = [item for item in details if (item['created_at'], item['job_id']) < boundary]
    page = page_items[:query['limit']]
    export_cursor = _encode_cursor(
        ledger, as_of, fingerprint, page[-1] if page else {'created_at': 0, 'job_id': ''}, max_rowid)
    next_cursor = export_cursor if len(page_items) > len(page) else None
    trend_items = [item for item in items
                   if (query['trend_source'] == 'all' or item['source'] == query['trend_source'])
                   and (query['trend_category'] == 'all' or item['category'] == query['trend_category'])]
    days = {}
    for item in trend_items:
        days.setdefault(_day(item['created_at']), []).append(item)
    # 全时间从最早记录日开始；没有记录时不虚构起始日期。
    start = query['from'] or min((item['created_at'] for item in items), default=None)
    trend = []
    if start is not None:
        first = datetime.fromisoformat(_day(start)).date()
        last = datetime.fromisoformat(_day(query['to'])).date()
        if (last - first).days > 36600:
            raise web.HTTPBadRequest(text='趋势时间跨度过大')
        while first <= last:
            day = first.isoformat()
            daily_items = days.get(day, [])
            trend.append(dict(_metric(daily_items), day=day,
                              generation_cost=round(sum(item['recognized_cost'] or 0 for item in daily_items
                                                        if item['source'] == 'generation'), 6),
                              api_cost=round(sum(item['recognized_cost'] or 0 for item in daily_items
                                                 if item['source'] == 'api'), 6)))
            first += timedelta(days=1)
    generation = [item for item in items if item['source'] == 'generation']
    api = [item for item in items if item['source'] == 'api']
    project_items = {}
    for item in items:
        project_items.setdefault(item['project_id'], []).append(item)
    return {
        'period': {'from': query['from'], 'to': query['to']}, 'as_of': as_of,
        'currency': ledger.pricing.get('currency', 'CNY'), 'pricing_version': ledger.pricing.get('version'),
        'overview': _metric(items), 'local': _metric(generation), 'cloud': _metric(api),
        'composition': {'category': _group(items, 'category', 'category_name'),
                        'capability': _group(items, 'capability'),
                        'worker': _group(items, 'worker_id', 'worker_name')},
        'trend': trend, 'projects': _group(items, 'project_id', 'project_name'),
        'models': _group(api, '_model'),
        'project_departments': {key: _group(rows, '_department', '_department_label')
                                for key, rows in project_items.items()},
        'departments': {'generation': _group(generation, '_department', '_department_label'),
                        'api': _group(api, '_department', '_department_label')},
        'jobs': [_public_item(item) for item in page], 'next_cursor': next_cursor,
        'export_cursor': export_cursor,
        'details': {'count': detail_metric['tasks'], 'total_cost': detail_metric['total_cost'],
                    'unknown': detail_metric['unknown_cost_tasks']},
    }


def _catalog(ledger, store):
    departments, assignments = ledger.department_catalog()
    users = store.list_users()
    rows = ledger.dashboard_rows(0, time.time())
    projects = {}
    for row in rows:
        key = row['project_id'] or 'legacy:' + (row['project_name'] or 'unknown')
        projects.setdefault(key, row['project_name'] or '未知项目')
    return {
        'accounts': [{'id': user['id'], 'username': user['username'],
                      'display_name': user.get('display_name') or user['username'],
                      'enabled': bool(user['enabled']), 'department_id': assignments.get(user['id'])}
                     for user in users],
        'departments': departments,
        'projects': [{'id': key, 'name': name} for key, name in sorted(projects.items())],
        'categories': [{'id': key, 'name': name} for key, name in (ledger.pricing.get('categories') or {}).items()],
    }


async def dashboard(request):
    require_admin(request)
    ledger = request.app['costs']
    query, as_of, fingerprint, cursor = _query(ledger, request.query)
    result = await asyncio.to_thread(_build, ledger, request.app['auth_store'], query, as_of, fingerprint, cursor)
    return web.json_response(result)


def _csv_safe(value):
    if value is None:
        return ''
    if isinstance(value, str) and (value.startswith(('\t', '\r', '\n'))
                                   or value.lstrip().startswith(('=', '+', '-', '@'))):
        return "'" + value
    return value


def _csv(items):
    fields = ('job_id', 'created_at', 'source', 'status', 'cost_source', 'recognized_cost',
              'account_id', 'account_name', 'department_id', 'department_name', 'attribution_basis',
              'project_id', 'project_name', 'capability', 'model', 'worker_name', 'electricity_cost',
              'prompt_tokens', 'completion_tokens', 'cached_tokens', 'provider_amount',
              'provider_currency', 'billing_source', 'request_id')
    output = io.StringIO(newline='')
    writer = csv.writer(output)
    writer.writerow(fields)
    writer.writerows([_csv_safe(item.get(field)) for field in fields] for item in items)
    return ('\ufeff' + output.getvalue()).encode('utf-8')


async def dashboard_export(request):
    require_admin(request)
    ledger = request.app['costs']
    query, as_of, fingerprint, cursor = _query(ledger, request.query)
    items = await asyncio.to_thread(_build, ledger, request.app['auth_store'], query, as_of, fingerprint, cursor, True)
    body = await asyncio.to_thread(_csv, items)
    filename = 'costs-' + _day(as_of) + '.csv'
    return web.Response(body=body, content_type='text/csv', charset='utf-8', headers={
        'Content-Disposition': 'attachment; filename="' + filename + '"',
        'X-Content-Type-Options': 'nosniff',
    })


async def catalog(request):
    require_admin(request)
    return web.json_response(await asyncio.to_thread(_catalog, request.app['costs'], request.app['auth_store']))


async def _body(request, field):
    if request.content_length is not None and request.content_length > 16384:
        raise web.HTTPRequestEntityTooLarge(max_size=16384, actual_size=request.content_length)
    try:
        body = await request.json()
    except (ValueError, UnicodeError):
        raise web.HTTPBadRequest(text='请求体必须是 JSON 对象') from None
    if not isinstance(body, dict) or set(body) != {field}:
        raise web.HTTPBadRequest(text='请求字段不正确')
    return body[field]


async def save_department(request):
    require_admin(request)
    name = await _body(request, 'name')
    try:
        result = await asyncio.to_thread(request.app['costs'].save_department, name, request.match_info.get('id'))
    except sqlite3.IntegrityError:
        raise web.HTTPConflict(text='部门名称已存在') from None
    except ValueError as exc:
        raise web.HTTPBadRequest(text=str(exc)) from None
    return web.json_response(result, status=201 if request.method == 'POST' else 200)


async def assign_department(request):
    require_admin(request)
    department_id = await _body(request, 'department_id')
    if department_id is not None and (not isinstance(department_id, str) or not department_id or len(department_id) > 128):
        raise web.HTTPBadRequest(text='部门 ID 不正确')
    user_id = request.match_info['id']
    user = await asyncio.to_thread(request.app['auth_store'].get_user, user_id)
    if user is None:
        raise web.HTTPBadRequest(text='账号不存在')
    try:
        result = await asyncio.to_thread(request.app['costs'].assign_department, user_id, department_id)
    except ValueError as exc:
        raise web.HTTPBadRequest(text=str(exc)) from None
    return web.json_response(result)


def register_cost_dashboard_routes(app):
    app.router.add_get('/api/costs/dashboard', dashboard)
    app.router.add_get('/api/costs/dashboard/export', dashboard_export)
    app.router.add_get('/api/costs/catalog', catalog)
    app.router.add_post('/api/costs/departments', save_department)
    app.router.add_patch('/api/costs/departments/{id}', save_department)
    app.router.add_put('/api/costs/accounts/{id}/department', assign_department)
