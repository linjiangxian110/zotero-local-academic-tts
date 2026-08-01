# Zotero Local Academic TTS 环境配置与安装

这份文档说明如何从零配置 Zotero Local Academic TTS。插件本身是 Zotero 的 XPI 文件，真实语音合成由本机 Python 后端完成，因此第一次使用前必须先准备 Python 环境和 Kokoro 依赖。

语音合成基于 [Kokoro](https://github.com/hexgrad/kokoro) / [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M)。本项目负责 Zotero 集成、本地 FastAPI 服务、文本处理、播放控制、打包和 Windows 使用流程；不训练 Kokoro 模型，也不包含声音克隆。

## 1. 需要准备的软件

- Windows 10/11
- Zotero，建议使用带插件支持的最新版
- Python 3.12，安装时建议勾选 `Add python.exe to PATH`
- PowerShell
- Git，可选；不使用 Git 时也可以下载 GitHub ZIP
- 首次安装依赖和首次加载 Kokoro 模型时需要联网

确认 Python 是否可用：

```powershell
py -3.12 --version
```

如果提示找不到 Python，请先安装 Python 3.12，然后重新打开 PowerShell。

## 2. 获取项目代码

建议把项目放在路径较短、没有特殊符号的目录中，例如：

```powershell
cd D:\research
git clone https://github.com/linjiangxian110/zotero-local-academic-tts.git
cd zotero-local-academic-tts
```

如果你已经有本地项目目录，例如：

```text
D:\research\zotero朗读插件
```

也可以继续使用这个目录。后续 Zotero 设置中的 `Project root` 必须填写这个项目根目录。

## 3. 创建 Python 虚拟环境

在项目根目录运行：

```powershell
py -3.12 -m venv .venv-tts
.\.venv-tts\Scripts\python -m pip install --upgrade pip setuptools wheel
```

安装 FastAPI 服务依赖：

```powershell
.\.venv-tts\Scripts\python -m pip install -r server\requirements.txt
```

安装 CPU 版 PyTorch：

```powershell
.\.venv-tts\Scripts\python -m pip install torch --index-url https://download.pytorch.org/whl/cpu
```

安装 Kokoro 相关依赖：

```powershell
.\.venv-tts\Scripts\python -m pip install -r server\requirements-model.txt -i https://pypi.org/simple
```

第一次安装可能比较慢，这是正常的。第一次朗读时 Kokoro 也可能下载或加载模型，等待时间会比后续更长。

## 4. 测试本地后端

在项目根目录运行：

```powershell
.\server\scripts\start_kokoro.ps1 -ProjectRoot "D:\research\zotero-local-academic-tts"
```

如果你的项目目录是 `D:\research\zotero朗读插件`，命令改成：

```powershell
.\server\scripts\start_kokoro.ps1 -ProjectRoot "D:\research\zotero朗读插件"
```

看到类似下面的输出表示后端可用：

```text
[Local TTS] Backend is ready. Provider: kokoro, model loaded: true
```

也可以另开一个 PowerShell 窗口检查：

```powershell
Invoke-RestMethod http://127.0.0.1:8765/health
```

正常结果应包含：

```json
{
  "status": "ok",
  "provider": "kokoro",
  "model_loaded": true
}
```

手动启动时，请保持这个 PowerShell 窗口打开。完成 Zotero 自动启动配置后，日常使用不需要再手动双击或手动运行后端。

## 5. 安装 Zotero 插件

普通使用者优先使用 release 中的 XPI，例如：

```text
localtts0122.xpi
```

如果你需要从源码自己打包，在项目根目录运行：

```powershell
cd plugin
..\.venv-tts\Scripts\python scripts\build_xpi.py
```

打包结果位于：

```text
plugin\build\local-academic-tts-0.1.22.xpi
```

在 Zotero 中安装：

1. 打开 Zotero。
2. 进入 `Tools -> Add-ons`。
3. 点击齿轮图标。
4. 选择 `Install Add-on From File...`。
5. 选择 `localtts0122.xpi` 或 `plugin\build\local-academic-tts-0.1.22.xpi`。
6. 按提示重启 Zotero。

如果 Zotero 提示插件不兼容，请确认安装的是最新 XPI，并确认 XPI 根目录内直接包含 `manifest.json`，而不是把外层文件夹压进去了。

## 6. 配置 Zotero 设置

打开：

```text
Edit -> Settings -> Local Academic TTS
```

建议配置：

- `Backend URL`: `http://127.0.0.1:8765`
- `Project root`: 项目根目录，例如 `D:\research\zotero-local-academic-tts`
- `Auto start`: 勾选
- `Voice`: 默认 `af_heart`
- `Speed`: 默认 `1.0`，常用范围 `0.8` 到 `1.3`
- `Show Debug menu in Tools`: 默认不勾选，排查问题时再打开

点击 `Test Connection`。如果显示 `Provider: kokoro` 且 `Model loaded: true`，说明 Zotero 插件已经能连接本地 Kokoro 后端。

## 7. 日常使用

1. 打开 Zotero。
2. 打开一篇 PDF。
3. 选中一段英文文本。
4. 在选区弹窗中点击 `Local TTS Read`。
5. 朗读开始后，PDF 页面右上角会出现悬浮暂停/继续按钮。
6. 单击按钮暂停，再单击继续。
7. 需要完全停止时，使用 `Tools -> Local TTS -> Stop`。

配置完成后，插件会在需要朗读时自动检查 `127.0.0.1:8765`。如果后端没有运行，并且 `Auto start` 已开启，插件会根据 `Project root` 自动启动 `server\scripts\start_kokoro.ps1`。

## 8. 开发者测试命令

运行后端单元测试：

```powershell
cd server
..\.venv-tts\Scripts\python -m pytest tests
```

运行 Kokoro 模型测试：

```powershell
cd server
$env:LOCAL_TTS_RUN_MODEL_TESTS = "1"
..\.venv-tts\Scripts\python -m pytest tests -m model
```

重新打包插件：

```powershell
cd plugin
..\.venv-tts\Scripts\python scripts\build_xpi.py
```

## 9. 常见问题

### Test Connection 失败

先检查 `Project root` 是否填写为项目根目录，并确认 `.venv-tts` 已经创建。然后在项目根目录手动运行：

```powershell
.\server\scripts\start_kokoro.ps1 -ProjectRoot "D:\research\zotero-local-academic-tts"
```

如果手动启动成功，再回到 Zotero 点击 `Test Connection`。

### 端口 8765 被占用

检查端口：

```powershell
Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort 8765
```

如果已有健康服务，脚本会直接复用。若端口被其他程序占用，需要关闭占用程序后重试。

### 第一次朗读很慢

第一次请求需要加载 Kokoro 模型，甚至可能下载模型文件。后续朗读通常会更快。

### 没有声音

按顺序检查：

1. Windows 系统音量和 Zotero 音量。
2. `Edit -> Settings -> Local Academic TTS -> Test Connection` 是否成功。
3. `Tools -> Local TTS -> Play Sample From Local Service` 是否有声音。
4. 勾选 `Show Debug menu in Tools` 后测试 Debug 菜单里的音频项。

### 更新插件版本

安装新版 XPI 后重启 Zotero 即可。Zotero 中保存的 `Backend URL`、`Project root`、`Voice`、`Speed` 等设置通常会保留。
