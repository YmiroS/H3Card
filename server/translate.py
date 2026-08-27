# -*- coding: utf-8 -*-
"""有道翻译 API 接入。

用于提示词的中英互译。比 LLM 快、便宜、稳定。
"""
import hashlib
import time
import uuid
import requests


# 有道翻译配置
YOUDAO_APP_KEY = "53c7a5489d47fded"
YOUDAO_APP_SECRET = "QG1TRB9LxEbTKE3mRzGVvhKjrpb5z9nr"
YOUDAO_API_URL = "https://openapi.youdao.com/api"


class TranslateError(Exception):
    """翻译失败"""
    pass


def youdao_translate(text, from_lang="auto", to_lang="auto"):
    """调用有道翻译 API。

    Args:
        text: 要翻译的文本
        from_lang: 源语言（auto=自动检测）
        to_lang: 目标语言（auto=自动检测，会根据源语言自动选择）

    Returns:
        翻译后的文本

    有道翻译 API 文档：https://ai.youdao.com/DOCSIRMA/html/自然语言翻译/API文档/文本翻译服务/文本翻译服务-API文档.html
    """
    if not text or not text.strip():
        return text

    # 自动判断目标语言：如果源文本主要是中文 → 英文，否则 → 中文
    if to_lang == "auto":
        # 简单判断：中文字符占比超过 30% 就认为是中文
        cn_count = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
        if cn_count / len(text) > 0.3:
            to_lang = "en"
        else:
            to_lang = "zh-CHS"

    # 生成签名
    salt = str(uuid.uuid4())
    curtime = str(int(time.time()))
    sign_str = YOUDAO_APP_KEY + truncate(text) + salt + curtime + YOUDAO_APP_SECRET
    sign = hashlib.md5(sign_str.encode('utf-8')).hexdigest()

    # 请求参数
    params = {
        "q": text,
        "from": from_lang,
        "to": to_lang,
        "appKey": YOUDAO_APP_KEY,
        "salt": salt,
        "sign": sign,
        "signType": "v3",
        "curtime": curtime,
    }

    try:
        resp = requests.post(YOUDAO_API_URL, data=params, timeout=10)
        resp.raise_for_status()
        result = resp.json()

        # 错误码处理（有道返回 errorCode，0 表示成功）
        error_code = result.get("errorCode")
        if error_code != "0":
            error_msg = YOUDAO_ERROR_CODES.get(error_code, f"未知错误码 {error_code}")
            raise TranslateError(f"有道翻译 API 错误：{error_msg}")

        # 提取翻译结果
        translation = result.get("translation")
        if not translation:
            raise TranslateError("有道 API 返回结果为空")

        return "\n".join(translation) if isinstance(translation, list) else str(translation)

    except requests.RequestException as e:
        raise TranslateError(f"网络请求失败：{e}")
    except Exception as e:
        raise TranslateError(f"翻译失败：{e}")


def truncate(text):
    """有道签名算法要求：文本超过 20 字符时截断为前 10 + 长度 + 后 10"""
    if len(text) <= 20:
        return text
    return text[:10] + str(len(text)) + text[-10:]


# 有道 API 错误码对照表
YOUDAO_ERROR_CODES = {
    "101": "缺少必填的参数，出现这个情况还可能是et的值和实际加密方式不对应",
    "102": "不支持的语言类型",
    "103": "翻译文本过长",
    "104": "不支持的API类型",
    "105": "不支持的签名类型",
    "106": "不支持的响应类型",
    "107": "不支持的传输加密类型",
    "108": "应用ID无效",
    "109": "batchLog格式不正确",
    "110": "无相关服务的有效实例",
    "111": "开发者账号无效",
    "113": "q不能为空",
    "201": "解密失败，可能为DES,BASE64,URLDecode的错误",
    "202": "签名检验失败",
    "203": "访问IP地址不在可访问IP列表",
    "205": "请求的接口与应用的平台类型不一致",
    "206": "因为时间戳无效导致签名校验失败",
    "207": "重放请求",
    "301": "辞典查询失败",
    "302": "翻译查询失败",
    "303": "服务端的其它异常",
    "401": "账户已经欠费",
    "411": "访问频率受限,请稍后访问",
    "412": "长请求过于频繁，请稍后访问",
}
