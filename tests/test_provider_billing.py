"""供应商费用白名单与精度测试，不访问网络。"""
from decimal import Decimal
import unittest

from server import provider_billing as billing


class ProviderBillingTests(unittest.TestCase):
    def test_root_usage_cost_zero_and_exact_precision(self):
        text = "0.123456789012345678901234567890123456789"
        for path in ("root", "usage"):
            for amount in ("0", text, "1.230000"):
                payload = {"cost": amount, "currency": "cny"}
                if path == "usage":
                    payload = {"usage": payload}
                self.assertEqual(billing.normalize_billing(payload), {
                    "amount": amount, "currency": "CNY", "field": "cost" if path == "root" else "usage.cost"})
        payload = billing.loads('{"cost":' + text + ',"currency":"USD"}')
        self.assertIsInstance(payload["cost"], Decimal)
        self.assertEqual(billing.normalize_billing(payload)["amount"], text)

    def test_unknown_currency_and_configured_currency_no_defaults(self):
        self.assertEqual(billing.normalize_billing({"usage": {"cost": "0.1"}}), {
            "amount": "0.1", "currency": None, "field": "usage.cost"})
        self.assertEqual(billing.normalize_billing({"cost": "0"}, {"billing_currency": "CNY"})["currency"], "CNY")
        self.assertEqual(billing.normalize_billing({"cost": "1", "currency": "EUR"},
                                                 {"billing_currency": "USD"})["currency"], "EUR")
        self.assertIsNone(billing.normalize_billing({"unit_price": "0.2", "currency": "USD"}))
        self.assertIsNone(billing.normalize_billing({"points": 200, "currency": "CNY"}))
        self.assertIsNone(billing.normalize_billing({"cost": 20, "cost_unit": "credits"},
                                                  {"billing_currency": "USD"}))

    def test_explicit_unit_and_price_type_conflicts_and_duplicate_keys(self):
        self.assertEqual(billing.normalize_billing({"cost": "1.00", "unit": "CNY"})["currency"], "CNY")
        for unit in ("points", "PTS", "tokens", "per_image", "USD/image"):
            with self.subTest(unit=unit):
                self.assertIsNone(billing.normalize_billing({"cost": "1", "unit": unit, "currency": "CNY"}))
        self.assertIsNone(billing.normalize_billing({"cost": "1", "unit": "USD", "currency": "CNY"}))
        self.assertIsNone(billing.normalize_billing({"cost": "1", "cost_type": "unit_price", "currency": "CNY"}))
        payload = billing.loads('{"cost":"1","cost":"2","currency":"USD","answer":"ok"}')
        self.assertIsNone(billing.normalize_billing(payload))
        self.assertEqual(payload["answer"], "ok")

    def test_conflicting_or_invalid_amount_currency_never_guessed(self):
        invalid = [None, True, False, -1, "-0.01", "NaN", "Infinity", float("inf"),
                   float("nan"), {}, [], "USD 1", "", " 1 ", "1e99999"]
        for value in invalid:
            with self.subTest(value=value):
                self.assertIsNone(billing.normalize_billing({"cost": value, "currency": "USD"}))
                self.assertIsNone(billing.normalize_billing({"cost": "1", "usage": {"cost": value}}))
        self.assertIsNone(billing.normalize_billing({"cost": "1", "usage": {"cost": "2"}}))
        self.assertIsNone(billing.normalize_billing({"cost": "1", "currency": "USD",
                                                  "usage": {"currency": "CNY"}}))
        self.assertIsNone(billing.normalize_billing({"cost": "1", "currency": "points"},
                                                  {"billing_currency": "USD"}))
        both = billing.normalize_billing({"cost": "1.00", "usage": {"cost": "1.0"}})
        self.assertEqual(both["amount"], "1.00")
        self.assertEqual(both["field"], "cost|usage.cost")

    def test_tokens_keep_missing_null_and_do_not_double_count_subsets(self):
        expected = {"input_tokens": 100, "output_tokens": 50, "cached_tokens": 80, "reasoning_tokens": 30}
        self.assertEqual(billing.normalize_usage({"usage": {
            "prompt_tokens": 100, "completion_tokens": 50,
            "prompt_tokens_details": {"cached_tokens": 80},
            "completion_tokens_details": {"reasoning_tokens": 30}}}), expected)
        self.assertEqual(billing.normalize_usage({"usage": {
            "input_tokens": 100, "output_tokens": 50, "cached_details": {"cached_tokens": 80},
            "output_tokens_details": {"reasoning_tokens": 30}}}), expected)
        self.assertEqual(billing.normalize_usage({}), dict.fromkeys(billing.TOKEN_KEYS))
        usage = billing.normalize_usage({"usage": {"input_tokens": 0, "output_tokens": "4",
                                                   "cached_tokens": True, "reasoning_tokens": -1}})
        self.assertEqual(usage, {"input_tokens": 0, "output_tokens": None,
                                 "cached_tokens": None, "reasoning_tokens": None})
        self.assertIsNone(billing.normalize_usage({"usage": {"input_tokens": 4, "prompt_tokens": 5}})["input_tokens"])

    def test_response_model_validation_and_whitelist(self):
        secret = "private-test-key"
        payload = {"model": "actual/deployment-2026", "messages": [secret], "prompt": secret,
                   "images": [secret], "api_key": secret, "cost": "0.001", "currency": "USD",
                   "usage": {"input_tokens": 2, "credential": secret}}
        meta = billing.normalize(payload, "configured-model", {"api_key": secret})
        self.assertEqual(meta["model"], "actual/deployment-2026")
        self.assertEqual(meta["model_source"], "response")
        self.assertNotIn(secret, str(meta))
        self.assertEqual(set(meta), {"model", "model_source", "provider_billing", "usage"})
        for model in (None, {}, 2, "", "x" * 201, "bad\nmodel", "sk-secret",
                      "https://user:password@host", secret):
            with self.subTest(model=model):
                meta = billing.normalize({"model": model}, "configured-model", {"api_key": secret})
                self.assertEqual((meta["model"], meta["model_source"]), ("configured-model", "config"))
        self.assertEqual(billing.normalize({})["model_source"], "unknown")

    def test_stream_snapshots_replace_not_sum_and_empty_chunk_preserves(self):
        state = {}
        billing.capture(state, {"usage": {"prompt_tokens": 5, "cost": "0.1"}}, "configured")
        billing.capture(state, {"usage": {"prompt_tokens": 12, "completion_tokens": 7, "cost": "0.2"}}, "configured")
        billing.capture(state, {"choices": [], "model": "actual"}, "configured")
        self.assertEqual(state["usage"]["input_tokens"], 12)
        self.assertEqual(state["usage"]["output_tokens"], 7)
        self.assertEqual(state["provider_billing"]["amount"], "0.2")
        self.assertEqual(state["model_source"], "response")
        billing.capture(state, {"usage": {"cost": "0.3", "currency": "USD"}}, "configured")
        self.assertEqual(state["usage"]["input_tokens"], 12)
        self.assertEqual(state["usage"]["output_tokens"], 7)
        self.assertEqual(state["provider_billing"]["amount"], "0.3")
        billing.capture(state, {"cost": "illegal"}, "configured")
        self.assertIsNone(state["provider_billing"])
