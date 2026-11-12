"""供应商响应的费用白名单；不计价、不推算、不保存原始请求或响应。"""
from decimal import Decimal, InvalidOperation
import json
import re

USAGE_PATHS = {
    "input_tokens": ("input_tokens", "prompt_tokens"),
    "output_tokens": ("output_tokens", "completion_tokens"),
    "cached_tokens": ("cached_tokens", "prompt_tokens_details.cached_tokens",
                      "input_tokens_details.cached_tokens", "cached_details.cached_tokens"),
    "reasoning_tokens": ("reasoning_tokens", "completion_tokens_details.reasoning_tokens",
                         "output_tokens_details.reasoning_tokens"),
}
TOKEN_KEYS = tuple(USAGE_PATHS)


def loads(raw):
    # JSON 小数直接进入 Decimal；重复键不擅自选择最后一个金额。
    def unique(pairs):
        result = {}
        for key, value in pairs:
            # 重复费用字段标未知，不影响其他合法图片或回答字段的解析。
            result[key] = None if key in result else value
        return result
    def decimal_number(value):
        try:
            return Decimal(value)
        except InvalidOperation:
            return None
    return json.loads(raw, parse_float=decimal_number, object_pairs_hook=unique)


def amount_string(value):
    if isinstance(value, bool) or not isinstance(value, (str, int, float, Decimal)):
        return None
    try:
        text = str(value)
    except ValueError:
        return None
    if len(text) > 256 or not re.fullmatch(r"[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?", text):
        return None
    try:
        amount = Decimal(text)
        if not amount.is_finite() or amount < 0 or abs(amount.adjusted()) > 512:
            return None
        return format(amount, "f") if amount else format(abs(amount), "f")
    except (InvalidOperation, ValueError):
        return None


def _currency(value):
    return (value.upper() if isinstance(value, str) and re.fullmatch(r"[A-Za-z]{3}", value)
            and value.upper() not in ("PTS", "TOK", "XXX", "XTS") else None)


def _integer(value):
    return value if type(value) is int and 0 <= value <= 2**63 - 1 else None


def _consistent(values, convert):
    if not values:
        return None
    converted = [convert(value) for value in values]
    if any(value is None for value in converted) or len(set(converted)) != 1:
        return None
    return converted[0]


def _path_values(usage, paths):
    values = []
    for path in paths:
        item = usage
        for key in path.split(".")[:-1]:
            item = item.get(key) if isinstance(item, dict) else None
        if isinstance(item, dict) and path.split(".")[-1] in item:
            values.append(item[path.split(".")[-1]])
    return values


def normalize_usage(payload):
    usage = payload.get("usage") if isinstance(payload, dict) else None
    usage = usage if isinstance(usage, dict) else {}
    # 缓存是输入的子集，思考通常是输出的子集，原样保存而不相加。
    return {key: _consistent(_path_values(usage, paths), _integer) for key, paths in USAGE_PATHS.items()}


def normalize_billing(payload, config=None):
    if not isinstance(payload, dict):
        return None
    usage = payload.get("usage")
    usage = usage if isinstance(usage, dict) else {}
    candidates = [(field, node["cost"]) for field, node in (("cost", payload), ("usage.cost", usage))
                  if "cost" in node]
    if not candidates:
        return None
    amounts = [amount_string(value) for _, value in candidates]
    if any(value is None for value in amounts) or len({Decimal(value) for value in amounts}) != 1:
        return None
    # cost 仅接受明确的本次总扣费；单价、积分或冲突单位不能冒充实际货币。
    units = [node[key] for node in (payload, usage) for key in ("unit", "cost_unit", "billing_unit") if key in node]
    if any(not isinstance(unit, str) or (unit.lower() not in ("currency", "money") and not _currency(unit))
           for unit in units):
        return None
    meanings = [node[key] for node in (payload, usage) for key in ("cost_type", "billing_type") if key in node]
    if any(meaning not in ("total", "request_total") for meaning in meanings):
        return None
    currencies = [node[key] for node in (payload, usage) for key in ("currency", "billing_currency")
                  if key in node] + [unit for unit in units if _currency(unit)]
    currency = _consistent(currencies, _currency)
    if currencies and currency is None:
        return None
    if not currencies:
        currency = _currency((config or {}).get("billing_currency"))
    return {"amount": amounts[0], "currency": currency,
            "field": "|".join(field for field, _ in candidates)}


def _model(value, secret=None):
    if (not isinstance(value, str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.:/+-]{0,199}", value)
            or "://" in value or (secret and secret in value) or value.lower().startswith(("sk-", "bearer"))):
        return None
    return value


def normalize(payload, configured_model=None, config=None):
    payload = payload if isinstance(payload, dict) else {}
    config = config or {}
    model = _model(payload.get("model"), config.get("api_key"))
    source = "response" if model is not None else "config"
    model = model or _model(configured_model, config.get("api_key"))
    return {"provider_billing": normalize_billing(payload, config), "usage": normalize_usage(payload),
            "model": model, "model_source": source if model is not None else "unknown"}


def capture(state, payload, configured_model=None, config=None):
    """流式只保留最新快照，不逐块累加；后续空块不清除已拿到的费用。"""
    meta = normalize(payload, configured_model, config)
    if not isinstance(payload, dict):
        payload = {}
    usage = payload.get("usage")
    if "usage" not in state:
        state["usage"] = meta["usage"].copy()
    elif "usage" in payload and not isinstance(usage, dict):
        state["usage"] = meta["usage"].copy()
    elif isinstance(usage, dict):
        for key, paths in USAGE_PATHS.items():
            if _path_values(usage, paths):
                # 覆盖同一字段的最终快照；单独扣费块不会清掉之前的 Token。
                state["usage"][key] = meta["usage"][key]
    if ("cost" in payload or isinstance(usage, dict) and "cost" in usage
            or "provider_billing" not in state):
        state["provider_billing"] = meta["provider_billing"]
    if meta["model_source"] == "response" or "model" not in state:
        state.update(model=meta["model"], model_source=meta["model_source"])
    return meta
