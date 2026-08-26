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
FF=python_embeded/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe
$FF -i ComfyUI/output/video/<产物>.mp4 -vn -ac 1 -ar 16000 -f wav /tmp/a.wav
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

---

## 环境补丁：给 cupy 补上 nvrtc，补帧才跑得起来（2026-08-24）

**这一条不改核心代码，改的是 `python_embeded` 里装了什么 + 启动脚本的环境变量。**

### 症状

`GIMMVFI_interpolate` 节点一跑就报：

```
'CUDA_HOME' not set, unable to find cuda-toolkit installation.
```

换采样器、换模型、改参数全都无效 —— 根因在环境，不在工作流。

### 根因

`ComfyUI-GIMM-VFI/gimmvfi/generalizable_INR/modules/softsplat.py` 用 **cupy 现场编译
CUDA 核**（`cuda_launch()` 里 `cupy.RawModule`）。包里装的是 `cupy_cuda12x` 13.6.0，
但**没装任何 CUDA Toolkit**，`nvrtc` 这个编译器 DLL 整个包里都找不到
（只有 `torch/lib/nvrtc64_130_0.dll`，那是 CUDA **13** 的，torch 自己用，cupy 要的是
`nvrtc64_120_0.dll`）。所以这个包自带的补帧工作流**从来就跑不起来**。

`softsplat.py` 那段的逻辑是：

```python
try:
    os.environ.setdefault("CUDA_HOME", cupy.cuda.get_cuda_path())
except Exception:
    if "CUDA_HOME" not in os.environ:
        raise RuntimeError("'CUDA_HOME' not set, unable to find cuda-toolkit installation.")
```

`get_cuda_path()` 返回 `None` → `setdefault(key, None)` 抛 TypeError → 落到 except →
`CUDA_HOME` 也没有 → 抛出那句话。所以它其实**并不真的用** `CUDA_HOME`，只是拿它当
"有没有 CUDA 环境"的哨兵。

### 修法（两个 pip 包 + 两个环境变量，缺一不可）

```bash
cd /d/ComfyUI_Mie_V33
./python_embeded/python.exe -m pip install nvidia-cuda-nvrtc-cu12          # 76 MB，提供 nvrtc64_120_0.dll
./python_embeded/python.exe -m pip install "nvidia-cuda-runtime-cu12==12.9.*"  # 3.6 MB，只要它的头文件
```

第二个包是 cupy 自己点名要的：`cupy/_environment.py` 的
`_get_include_dir_from_conda_or_wheel()` 里写着「nvrtc ≥ 12.2 的 fp16 头文件依赖
CUDA Runtime 的头文件」，找不到就编译报 `cannot open source file "cuda_fp16.h"`。
版本号要跟 nvrtc 对上（都是 12.9）。

然后在 `1_1点击启动comfyui.bat` 顶上加两行：

```bat
set "CUDA_PATH=%~dp0python_embeded\Lib\site-packages\nvidia\cuda_nvrtc"
set "PATH=%CUDA_PATH%\bin;%PATH%"
```

**bat 文件里一个中文都不能写，注释也不行。** cmd.exe 是按字节偏移一行行找过去的，
UTF-8 的中文一个字三字节，读到下一行时位置就错在字符中间 —— `@rem` 前缀被吃掉，
剩下半行被当命令执行，一启动就是一串「'xxx' 不是内部或外部命令」。
（踩过：这两行上面本来加了 5 行中文 `@rem` 说明它们为什么不能省，结果每次启动报三条错。
现在注释是英文的，中文说明只留在这份 md 里。`chouka\启动抽卡系统.bat` 头上也写着同一条。）

**两行的作用不一样，都不能省**（实测过四种组合）：

| 只设 | 结果 |
|---|---|
| 什么都不设 | `CuPy failed to load nvrtc64_120_0.dll` |
| 只设 `PATH` | 同上 —— Python 3.8+ 的 `ctypes.CDLL` **不查 PATH** |
| 只设 `CUDA_PATH` | `nvrtc: error: failed to open nvrtc-builtins64_129.dll` —— nvrtc 自己加载隔壁那个 builtins 时**只查 PATH** |
| 两个都设 | ✅ |

`CUDA_PATH` 走的是 cupy `_environment.py:_setup_win32_dll_directory()`：它会把
`%CUDA_PATH%\bin` 喂给 `os.add_dll_directory()`。`nvidia/cuda_nvrtc/` 恰好就是
`bin/` + `include/` 的 toolkit 目录结构，直接指过去即可。

顺带 `CUDA_PATH` 一设上，`get_cuda_path()` 就有返回值了，上面那个 `CUDA_HOME` 哨兵也
一起过掉，不用再单独设 `CUDA_HOME`。

### 验证判据

```bash
# 1) cupy 能编译最简核
./python_embeded/python.exe -c "import cupy; print((cupy.arange(10)*2).sum())"   # -> 90
# 2) 真跑一遍补帧，出片帧率翻倍、时长不变
```

实测：768×1024 的片子、`只处理前几帧 = 60`、`补帧倍数 = 2` → 33 秒出片，
源 24 fps / 前 60 帧 = 2.5 秒，出片 **48 fps / 2.48 秒**。帧率翻倍、时长不变，符合预期。

### 影响面

包里真正 `import cupy` 的只有两个插件：`ComfyUI-GIMM-VFI` 和 `comfyui-frame-interpolation`
（后者 `config.yaml` 里 `ops_backend: "cupy"`，之前同样是坏的，现在也跟着能用了）。
**SeedVR2 不用 cupy** —— 早先 grep 命中 `causal_inflation_lib.py` 是假阳性，那是变量名
`memory_occupy` 里含 "cupy" 这几个字母。torch 自带一整套 CUDA 库，从不查 cupy。
所以这一改**动不到任何原来能用的能力**。

⚠️ 整合包「升级」或「一键修复」之后，`1_1点击启动comfyui.bat` 那两行可能被覆盖，
补帧又会报 `CUDA_HOME not set` —— 回来照抄一遍即可（pip 包一般还在）。

---

## 环境补丁：装 Hunyuan3D（3D 模型生成）踩的三个坑（2026-08-25）

节点包 `ComfyUI/custom_nodes/ComfyUI-Hunyuan3DWrapper`，工作流由
**`tools/gen_3d_workflows.py` 生成**（自带对着 `/object_info` 的校验，别手改生成出来的 json）：

```bash
./python_embeded/python.exe tools/gen_3d_workflows.py
```

出片在 `ComfyUI/output/3D/*.glb`。用的是 **2.1**
（`models/diffusion_models/hy3dgen/hunyuan3d-dit-v2-1-fp16.ckpt`，7.4 GB，来自
`tencent/Hunyuan3D-2.1`），一个 `Hy3D_2_1SimpleMeshGen` 节点包干抠图+生形状+解网格。
2.0 那份 safetensors 也还在，但它要 `Hy3DModelLoader/GenerateMesh/VAEDecode` 三节点串。

### 坑一：`msvc-runtime` 把 DLL 倒进 `python_embeded/`，整个包全崩

装 `pymeshlab` 时被一起拖进来的 `msvc-runtime` 会往 **`python_embeded/` 根目录**写
10 个 DLL（`msvcp140*.dll` / `vcruntime140_threads.dll` / `concrt140.dll` / `vcomp140.dll` …）。
那个目录是 `python.exe` 所在目录，**DLL 搜索优先级最高**，于是它顶掉系统的运行库，
毒的不是 3D 这一条，是**包里每一个节点**。症状是一提交任务 ComfyUI 进程直接死，
`/queue` 连不上，控制台只留一句
`forrtl: error (200): program aborting due to window-CLOSE event` —— 看不出跟 DLL 有关。

清理：删掉 `msvc_runtime-*.dist-info/RECORD` 里记着的那 10 个文件
（`python_embeded/` 和 `python_embeded/Scripts/` 各一份）+ `msvc_runtime.cp312-win_amd64.pyd`。
**`vcruntime140.dll` / `vcruntime140_1.dll` 不在 RECORD 里，是包原装的，别删。**
`pip uninstall` 会 `PermissionError [WinError 5]`（pip 自己那个 python 正加载着这些 DLL），
得先停掉 ComfyUI 再用 `Remove-Item` 手删。

**手删完记得把 `Lib/site-packages/~svc_runtime-*.dist-info` 也删掉。** 那是 pip 失败卸载
留下的备份目录，`importlib.metadata` 照样能枚举到它、但按名字解析不出版本 ——
`comfyui-liveportraitkj` 会因此起不来（`pykalman` -> `skbase` 会对枚举到的每个包调
`version()`）：`PackageNotFoundError: No package metadata was found for msvc_runtime`。

判据（都要过）：

```bash
./python_embeded/python.exe -c "
import importlib.metadata as m
print('msvc 残留:', [d.metadata['Name'] for d in m.distributions() if 'msvc' in (d.metadata['Name'] or '').lower()])
print('查不到版本的包:', [d.metadata['Name'] for d in m.distributions() if not d.version])"
# 两行都应该是空的
./python_embeded/python.exe -c "import pymeshlab;pymeshlab.MeshSet();import torch;print(torch.cuda.is_available())"
```

### 坑二：`TransparentBGSession+` 在 torch 2.10 上直接打死进程

comfyui_essentials 的抠图节点（`image.py:814` -> `transparent_background/Remover.py:107`）
内部走 `torch.jit.trace`，在这个包的 torch 2.10 上不是报错，是 **abort**。
所以 3D 链**不要**用它。2.1 的生成节点自带 rembg（首跑会下 176 MB 的
`u2net.onnx` 到 `C:\Users\<你>\.u2net\`），本来就不需要外挂抠图。

顺带：rembg 会打一句
`LoadLibrary failed ... onnxruntime_providers_cuda.dll` —— 那是它退回 CPU 跑，
无害，几百毫秒的事，别去追。

### 图给多清楚才有用：天花板是 512，写死的

`Hy3D_2_1SimpleMeshGen` 内部固定
`rembg -> ImageProcessorV2.recenter(border_ratio=0.15) -> cv2.resize 到 512 -> DINO 518`
（`hy3dshape/hy3dshape/preprocessors.py:90-107`，`configs/dit_config_2_1.yaml` 里
DinoImageEncoder 的 `image_size: 518`）。所以：

- **主体本身超过 512 像素就到顶了**，再大的原图不会更好。
- 决定清晰度的是**主体占画面的比例**，不是总像素。`recenter` 按 alpha 框裁出主体、
  再缩放到画幅的 85%；主体只占一小块时那一步是**放大**，糊。
- 所以工作流里**不要提前缩到 518**。原来那个
  `ImageResize+ [518,518,'pad','always']` 等于先把主体压小、再让 recenter 放大回来，
  白糊一次。现在改成 `[2048,2048,'keep proportion','downscale if bigger']` ——
  只在超大时降一下省内存，不裁不补边，居中和裁主体交给模型内部做（那是 INTER_AREA 下采样）。

**上色那条链例外：必须先补成方图。** `Hy3DDelightImage` 里是
`common_upscale(image, width, height, "lanczos", "disabled")`（`nodes.py:337`），
非方图会被直接拉伸变形。所以贴图链里单独加了一个
`ImageResize+ [518,518,'pad','always',2]`，接在 RMBG **前面** ——
补边补什么颜色不重要，RMBG 紧接着把背景（含补出来的边）整片换成中灰。

上色链的天花板更低：去光照固定 512×512，六视角每个视角也只画 512（之后才拉到 2048 去烘）。

### 上色链的面数上限 5 万（xatlas 不支持更多）

`Hy3DMeshUVWrap` -> `hy3dgen/texgen/utils/uv_warp_utils.py:33` -> `xatlas.parametrize`：

```python
if len(mesh.faces) > 50000:
    #raise ValueError("The mesh has more than 50,000 faces, which is not supported.")
    print("UV wrap: The mesh has more than 50,000 faces, which is not recommended.")
```

上游是**直接 raise**，kijai 注释掉换成了一句 print，所以喂多了不会被拦，只有一行警告。
10 万面实测能跑过（跑通两次，出 5.6 MB 的 glb），但这是原生代码里的「不支持」路径，
崩起来是 abort、整个进程带着队列一起没。所以按官方示例的 5 万走。

> 顺带记一笔没定位到根因的一次进程死亡：在一个已经跑过 30 万面灰模 + 一整轮贴图、
> 还下过 14 GB 模型的**长命进程**里再提交一次带贴图，75~90 秒之间（几何阶段）进程没了。
> 重启之后同一张图、同样参数连跑两次（10 万面 / 5 万面）都过。
> 所以别急着怪 xatlas —— 那次死在几何阶段，更像是长时间运行后的资源耗尽。
> **连着跑了很多轮又开始莫名崩的时候，先重启 ComfyUI 再判。**

### 精度：嫌粗糙先看 `max_facenum`，不是先拉 octree

实测（5090 32G，`3D示例_小狐狸.png`，固定 seed 1234）：

| steps / octree | 生成耗时 | 原始面数 | 显存峰值 |
|---|---|---|---|
| 30 / 384 | 47 秒 | 31 万 | 7.6 GB |
| **50 / 512（现在的默认）** | 100 秒 | 56 万 | 8.7 GB |
| 50 / 768 | 283 秒 | 127 万 | 12.8 GB |

`Hy3DPostprocessMesh.max_facenum` 的**节点默认是 40000**，等于把 56 万面砍掉 93%，
脸和耳朵上肉眼可见一块块棱面 —— 粗糙九成是这一刀砍的，不是模型不行。
生成的 json 里已经改成 **300000**（成品 glb 约 5.4 MB）。

octree 768 时间涨 3 倍、耳朵边缘反而起锯齿，不划算，512 是甜点。

**参数拉到顶还嫌糙就不是参数的事了：这条链只出几何、没有贴图。**
灰模「粗糙」很大一部分是没颜色没材质，要 Hunyuan3D 2.1 的 PBR 贴图得再装
Delight + Paint，约 10 GB，还没装。

### 坑三：出来是一块「平板」

半身像 / 正面证件照那种「看着像一张照片」的素材，模型有时会理解成**浮雕**，
出来是一块 2×2、Z 只有 0.01 的板。**实测半身人像三四次中一次**，
`fp16` 换 `bfloat16` 一样会中 —— 不是精度问题，是素材歧义。

判据别靠眼看，量 extents：

```bash
./python_embeded/python.exe -c "
import trimesh;m=trimesh.load('ComfyUI/output/3D/xxx.glb',force='mesh')
print(len(m.faces),[round(float(x),4) for x in m.extents])"
# 正常三个数都在 0.5~2.0 量级；有一维是 0.0x 就是废的
```

排查时**先跳过 `Hy3DPostprocessMesh` 再判**：它经手前后面数差 30 倍，
很容易冤枉它（实测它和 pymeshlab 那三步都不改厚度）。

`Hy3D_2_1SimpleMeshGen` **没有种子输入**，所以参数不变再点一次运行拿到的是
ComfyUI 的缓存、跟上次一模一样。要重摇得把 `steps` 改一个数（30 -> 31）。
治本是换素材：完整一个物体、看得出前后厚度。仓库里放了张示例图
`ComfyUI/input/3D示例_小狐狸.png`（就是「文生3D」自己画出来的），是稳的那一类。

### 带贴图（2026-08-25 补）

第三个工作流 `图生3D模型_带贴图.json`，出 `3D/Hy3D_图生_带贴图_*.glb`
（50000 面 + 2048×2048 baseColorTexture，约 4.2 MB）。
同一条链顺手也存一份 `3D/Hy3D_图生_灰模_*.glb`（同样 5 万面，别跟 30 万面那条的产物拿错）。

耗时：几何 ~100 秒 + 上色 ~100 秒，端到端约 **200 秒**；几何被缓存时只要 **38 秒**。

贴图链是 **2.0 的** delight + paint，但它只吃 TRIMESH，不在乎网格谁生的 ——
直接接在 2.1 的 `Hy3DPostprocessMesh` 后面。模型自动下到 `ComfyUI/models/diffusers/`：

| 目录 | 大小 | 说明 |
|---|---|---|
| `hunyuan3d-delight-v2-0` | 4.1 GB | 去光照 |
| `hunyuan3d-paint-v2-0` | 5.2 GB | 六视角上色，工作流用的是这个 |
| `hunyuan3d-paint-v2-0-turbo` | 5.1 GB | **多下的**，见下 |

> 节点里 `allow_patterns=["*hunyuan3d-paint-v2-0*"]` 把 `-turbo` 也匹配上了，
> 所以一次下了 14.4 GB 而不是 9.2 GB。turbo 是合法的备选（步数更少），留着没坏处，
> 不想留就删 `hunyuan3d-paint-v2-0-turbo/` 整个目录。

链的形状（照节点包 `example_workflows/hy3d_example_01.json`，只换抠图那步）：

```
ImageResize+(≤2048, 不裁不补边) ─┬─> Hy3D_2_1SimpleMeshGen -> Hy3DPostprocessMesh(5万) ─> Hy3DExportMesh(灰模)
                                │                                  └─> Hy3DMeshUVWrap -> Hy3DRenderMultiView(1024, 2048, world)
                                └─> ImageResize+(518 pad) -> RMBG(Color/#CCCCCC)          │ normal/position/renderer
                                    -> Hy3DDelightImage(50步) ─┐                          │
                                                               ├─> Hy3DSampleMultiView(512, 25步, seed)
                        Hy3DCameraConfig(6 机位) ──────────────┘
   -> ImageResize+(2048, stretch) -> Hy3DBakeFromMultiview -> Hy3DMeshVerticeInpaintTexture
   -> CV2InpaintTexture -> Hy3DApplyTexture -> Hy3DExportMesh(带贴图)
```

三个容易踩的点：

1. **抠图不能用示例里那对节点。** 示例用 `TransparentBGSession+` + `ImageRemoveBackground+`，
   就是上面「坑二」那个会 abort 进程的。换成本地 `RMBG`（`RMBG-2.0` 权重已在
   `models/RMBG/`），而且它的 `background='Color'` + `background_color` 一个节点就顶掉了
   示例里 `SolidMask` + `MaskToImage` + `ImageCompositeMasked` 三个。
2. **背景必须中灰 `#CCCCCC`**（= 示例 `SolidMask` 的 0.8）。示例自己在注释里写了：
   纯黑 delight 直接失败、太暗整体发红、纯白过曝。
3. **上色链的面数是 5 万，不是灰模那条的 30 万**（原因见上一节）。

`Hy3DSampleMultiView` **有 seed**，所以带贴图这条能靠改种子重摇，
不像灰模那条只能去动 `steps` 骗缓存。

判贴图有没有真上：

```bash
./python_embeded/python.exe -c "
import trimesh;s=trimesh.load('ComfyUI/output/3D/Hy3D_图生_带贴图_00001_.glb');m=s.to_geometry()
print(len(m.faces), m.visual.material.baseColorTexture.size, m.visual.uv.shape)"
# -> 50000 (2048, 2048) (..., 2)；没贴图的话 visual 是 ColorVisuals、没有 uv
```

### 生成器里那个 `is_widget` 改过

原来按类型名白名单判（`INT/FLOAT/STRING/BOOLEAN`），`RMBG.background_color` 的
`COLORCODE` 判成了「只能连线」，`widgets_values` 从它往后全体错位。
现在改成**看有没有 `default`** —— 只能连线的输入（IMAGE / MODEL / TRIMESH / MESHRENDER…）
不会带 `default`，`COLORCODE` / `COMBO` / `COLOR` 这些都带。

### 抽卡系统那边不用管

`scan_workflows.py` 的 `main()` 默认只遍历 **`ALIASES` 白名单**，
不会自动收编 `workflows/` 下的新文件。这两条 3D 工作流的输出节点是
`PreviewImage`/`SaveImage`，真要登记进去会被判成「出图片」、卡片拿回你自己的输入图 ——
所以**先别往 `ALIASES` 里加**，等扫描器支持 `.glb` 产物再说。
