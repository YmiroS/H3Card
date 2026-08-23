# ComfyUI 核心补丁（MiniMax H3）

> **背景**：`D:\ComfyUI_Mie_V33` 这个整合包标称 ComfyUI **0.33.0**，但 MiniMax H3 相关的
> 三个文件被换成了**早期开发版**，和官方 v0.33.0 不一致：
> - `comfy/ldm/minimax/model.py`
> - `comfy/model_base.py`
> - `comfy_extras/nodes_minimax_h3.py`
>
> 其余核心文件（samplers / utils / model_sampling / sd / supported_models / nodes_audio /
> nested_tensor）跟官方 v0.33.0 逐字一致，只有 H3 这一块是旧的。
>
> 下面两个补丁**都只改 `comfy/ldm/minimax/model.py` 一个文件**。
>
> ⚠️ **整合包「升级」或「一键修复」之后要回来检查这两个补丁还在不在。**
> ⚠️ **改完必须重启 ComfyUI**（Python 会缓存模块，不重启改了等于没改）。

## 快速检查：补丁还在吗

```bash
cd /d/ComfyUI_Mie_V33/ComfyUI
grep -c "frame_count is None" comfy/ldm/minimax/model.py    # 补丁二在 → 1
grep -c "audio_scale" comfy/ldm/minimax/model.py            # 补丁一在 → 1 或以上
grep -c "slope_a" comfy/ldm/minimax/model.py                # 补丁一在 → 0
```

现成的备份（都是**打补丁前**的状态，用来 diff，不要拿去覆盖）：

| 文件 | 是什么 |
|---|---|
| `comfy/ldm/minimax/model.py.bak_before_audiofix` | 整合包原版，两个补丁都没打 |
| `comfy/ldm/minimax/model.py.bak_before_framecount` | 只打了补丁一 |

一条命令看全部改动：

```bash
diff --strip-trailing-cr comfy/ldm/minimax/model.py.bak_before_audiofix comfy/ldm/minimax/model.py
```

> `--strip-trailing-cr` 必须加：本地是 CRLF，不加会把整个文件都显示成不同。

---

## 补丁一：音频白噪音 / 398Hz 嗡鸣（2026-08-22）

### 症状

H3 说话唱歌之类带音频的工作流，出来的视频**音轨是空转嗡鸣 / 白噪音**，不是人声。
换采样器、换步数、换提示词、换分辨率、换模型文件**全都无效** —— 因为根因在核心代码，
不在工作流参数。

### 根因

旧版 `MiniMaxH3Model.forward()` **删掉了音频缩放的还原逻辑**。

- `ModelSamplingAV.audio_scale = shift / audio_shift = 12 / 3 = 4.0`
- `MiniMaxH3.process_latent_in/out` 会把音频 latent 乘 / 除 4
- 但旧版 `forward()` 不做 `carry = sigma_a / sigma_v` 的还原，也不做速度换算，
  只在 `_forward` 末尾乘了一个 `slope_a`

结果音频分支幅度**错了 4 倍** → 输出 latent 的 std 只有 0.26（真实语音约 0.58）→
音频 VAE 解出来就是 398Hz 的嗡鸣。

### 改法

把官方 v0.33.0 的 `forward()` 缩放还原段补回 `comfy/ldm/minimax/model.py`
（当前在 **第 525 行** `def forward` 里，约 526–549 行），并删掉 `_forward` 末尾的
`slope_a` 乘法（约第 683 行）。

关键点：**要保留整合包自己加的 `_run_blocks` / `("block_loop", 0)` 钩子**
（第 503 行、663 行），`TESpeedMiniMaxH3` 等加速节点依赖它，删了加速节点就废了。

补回去的内容（在 `WrapperExecutor` 调用**之前**做还原、**之后**做逆变换）：

```python
# the sampler carries the audio as (sigma_v / sigma_a) * x_audio; undo it outside
# the wrappers so they and the network see the stream's own latent and velocity
scale = float((minimax_payload or {}).get("audio_scale", 1.0))
audio_src = x[1]
if scale != 1.0:
    shift_v = float(transformer_options.get("minimax_h3_sigma_shift_video", self.sigma_shift_video))
    shift_a = float(transformer_options.get("minimax_h3_sigma_shift_audio", self.sigma_shift_audio))
    sigma_v = (timestep.flatten()[0] / 1000.0).float().clamp(min=1e-6)
    sigma_a = time_shift_sigma(sigma_v, shift_v, shift_a)
    carry = (sigma_a / sigma_v).to(audio_src.dtype)
    x = [x[0], audio_src * carry]

out = comfy.patcher_extension.WrapperExecutor.new_class_executor(
    ...                                    # 原来是 return，改成 out =
)
if scale != 1.0:
    # d/d(sigma_v) of the carried variable
    out[1] = ((1.0 - scale) * (audio_src * carry)
              + (1.0 + (scale - 1.0) * sigma_a).to(out[1].dtype) * out[1])
return out
```

同时把 `_forward` 的返回改回不带 `slope_a`：

```python
# 改前
slope_a = time_shift_slope(sigma_v, shift_v, shift_a).to(audio_out.dtype)
return [-video_out.to(video_x.dtype), (-slope_a) * audio_out.to(audio_x.dtype)]
# 改后
return [-video_out.to(video_x.dtype), -audio_out.to(audio_x.dtype)]
```

### 怎么验证修好了

**别靠听、别靠调参数猜。抽一个产物测频谱：**

```bash
cd /d/ComfyUI_Mie_V33
./ComfyUI/ffmpeg.exe -i ComfyUI/output/video/<产物>.mp4 -vn -ac 1 -ar 16000 -f wav /tmp/a.wav
```

判据：音频 latent 的 std 应该在 **0.5~0.6** 量级（坏的时候只有 0.26）；
频谱上应该是有结构的语音共振峰，不是一根 398Hz 的线。

---

## 补丁二：首尾帧生视频直接报错（2026-08-23）

### 症状

任何**首尾帧**（两张图）的 H3 生视频，一提交就失败：

```
#127 SamplerCustomAdvanced: only first/last keyframe anchors are supported
```

单图（图生视频）正常，只有传两张图走首尾帧路径时必挂。

### 根因

`frame_count` **全链路都没人填**。

- `comfy/model_base.py:2185` 那处 `PackedLayout(...)` 调用**没传** `frame_count=`
- `payload["frame_count"]` 也从来没被赋值过

所以 `PackedLayout.__init__` 里判断尾帧锚点的分支永远进不去，直接掉到 `raise`：

```python
elif frame_count is not None and pixel_index == frame_count - 1:   # frame_count 恒为 None → 永假
    ...
else:
    raise ValueError("only first/last keyframe anchors are supported")
```

### 改法

**只改 `comfy/ldm/minimax/model.py`，两处，3 行有效代码。**

在 `PackedLayout.__init__`（**第 300 行**）开头加自动反推：

```python
def __init__(self, text_len, latent_t, latent_h, latent_w, audio_t, keyframes=None, refs=None, frame_count=None):
    if frame_count is None:
        # 没人传就自己反推：帧数和时间 token 是 17k+5 <-> 5k+2 的死对应
        # （见 nodes_minimax_h3.video_latent_t）。缺这个值的话尾帧锚点认不出来，
        # 首尾帧生视频会直接报 "only first/last keyframe anchors are supported"。
        frame_count = (latent_t - 2) // 5 * 17 + 5
```

然后把尾帧分支（**第 325 行**）多余的前置条件去掉：

```python
# 改前
elif frame_count is not None and pixel_index == frame_count - 1:
# 改后
elif pixel_index == frame_count - 1:
```

### 为什么改这里，而不是改 `model_base.py`

- `PackedLayout` 有**两个**构造点：`model.py:566` 和 `model_base.py:2185`。
  改 `PackedLayout` 本身，两个都覆盖到；改 `model_base.py` 只盖住一个。
- `model_base.py` 那处的 `latent_shapes` **可能是 None**，那里根本算不出帧数。
- 改 1 个文件比改 2 个文件好维护，整合包升级后也少一个地方要检查。

### 反推公式的依据

`ComfyUI/comfy_extras/nodes_minimax_h3.py:40`：

```python
def video_latent_t(frame_count):
    return 2 if frame_count <= 5 else ((frame_count - 5) // 17) * 5 + 2
```

所以合法帧数满足 `length ≡ 5 (mod 17)`，逆运算就是 `(latent_t - 2) // 5 * 17 + 5`。
`patch_size = (1, 2, 2)`，时间维不做 padding，所以 `latent_t` 不会被 padding 改掉。

实测对照（正向 / 反向都对得上）：

| latent_t | 2 | 7 | 37 | 107 |
|---|---|---|---|---|
| frame_count | 5 | 22 | **124** | 362 |

其中 `latent_t = 37 → 124` 就是当初报错那一次的实际形状。

### 怎么验证修好了

重启 ComfyUI，跑一次两张图的首尾帧。已实测通过：
`minimax_h3_flf2v`，1024 长边、5 秒、8 步，出 `output/video/MiniMax_H3_00016_.mp4`，无报错。

---

## 重启 ComfyUI 的正确姿势

它是用 `1_1点击启动comfyui.bat` 起的，内容就一行：

```
.\python_embeded\python.exe -s ComfyUI\main.py --windows-standalone-build --reserve-vram 2
```

重启前先确认队列是空的，别打断正在跑的任务：

```bash
curl -s http://127.0.0.1:8188/queue      # queue_running / queue_pending 都应该是 []
```

冷启动大约 **80 秒**（要重新加载模型）。从 git-bash 里拉起来用：

```bash
powershell -NoProfile -Command "Start-Process -FilePath 'D:\ComfyUI_Mie_V33\1_1点击启动comfyui.bat' -WorkingDirectory 'D:\ComfyUI_Mie_V33'"
```

> `cmd //c start ...` 在 git-bash 里**起不来**，别用。抽卡系统那个
> `启动抽卡系统.bat` 同理，也用 `Start-Process`。

---

## 排查方法（下次遇到别的「整合包行为和官方文档不符」）

直接拉官方同版本的文件来 diff：

```bash
curl -sL https://raw.githubusercontent.com/comfyanonymous/ComfyUI/v0.33.0/comfy/ldm/minimax/model.py -o /tmp/official.py
diff --strip-trailing-cr /tmp/official.py comfy/ldm/minimax/model.py
```

先确认「是不是整合包动过这个文件」，再去看参数 —— 别一上来就调采样器和步数。

---

## 顺带记一笔：ComfyUI 的「资产」是空的，不是补丁的锅

整个资产系统由 `--enable-assets` 开关控制，而 `1_1点击启动comfyui.bat` **没带这个 flag**。

- 日志里能看到 `Asset seeder disabled`（`server.py:257-262`）
- `ComfyUI/user/comfyui.db` 里 `assets` / `asset_references` 全是 0 行
- `/api/assets` 一律返回 503 `SERVICE_DISABLED`

所以 ComfyUI 界面「资产」侧边栏本来就一条都没有，重启前看到的东西来自浏览器缓存或进程内
history（`execution.py` 的 `self.history` 不落盘）。**跟提交格式、跟这两个补丁都无关。**

另外，抽卡系统走 `POST /prompt` 提交的是纯 API 格式，没带
`extra_data.extra_pnginfo.workflow`，所以产物的元数据里**只有 `prompt` 没有 `workflow`**
—— 这就是「拿到产物定位不到工作流」的原因。mp4 是存得下 workflow 的
（`comfy_api/latest/_input_impl/video_types.py` 的 `use_metadata_tags`），只是没给它。
两件事都还没动。
