# Zotero Local Academic TTS 使用说明

这是一个 Zotero 本地学术英文朗读插件。第一版 MVP 支持在 Zotero PDF Reader 中选中英文文本，通过本机 Kokoro 后端生成语音，并在 Zotero 中播放。

## 功能范围

- 支持 PDF Reader 选区朗读
- 支持长文本自动分段连续朗读
- 支持单击悬浮按钮暂停/继续
- 支持通过 `Tools -> Local TTS -> Stop` 完全停止
- 支持在 Zotero 统一设置中配置后端地址、声音和语速
- 不包含声音克隆
- 不替换 Zotero 自带 Read Aloud

## 安装插件

1. 打开 Zotero。
2. 进入 `Tools -> Add-ons`。
3. 点击齿轮图标，选择 `Install Add-on From File...`。
4. 选择 release 文件夹中的 `localtts0120.xpi`。
5. 按提示重启 Zotero。

## 启动本地 Kokoro 后端

每次重启电脑或关闭后端窗口后，都需要先启动后端。

在 PowerShell 中运行：

```powershell
cd D:\research\zotero朗读插件
.\server\scripts\start_kokoro.ps1
```

如果从 release 文件夹中运行复制出来的 `start_kokoro.ps1`，请指定项目根目录：

```powershell
.\start_kokoro.ps1 -ProjectRoot "D:\research\zotero朗读插件"
```

看到类似下面提示即可：

```text
[Local TTS] Backend is ready. Provider: kokoro, model loaded: true
```

如果提示端口 `8765` 已经有可用服务，说明后端已经启动，可以直接使用 Zotero 插件。

## Zotero 设置

进入 `Edit -> Settings`，选择 `Local Academic TTS`。

可配置项：

- `Backend URL`：默认 `http://127.0.0.1:8765`
- `Voice`
  - `af_heart`：美式女声
  - `bf_emma`：英式女声
- `Speed`：建议 `0.8` 到 `1.3`，默认 `1.0`
- `Show Debug menu in Tools`：默认关闭，排查声音问题时再打开

设置页中可以点击 `Test Connection` 检查后端是否可用。

## 使用方法

1. 先启动 Kokoro 后端。
2. 在 Zotero 打开一篇 PDF。
3. 选中一段英文文本。
4. 在选区弹窗中点击 `Local TTS Read`。
5. 朗读开始后，PDF 页面右上角会出现悬浮暂停/继续按钮。
6. 单击悬浮按钮可暂停，再单击可继续。
7. 需要完全停止时，使用 `Tools -> Local TTS -> Stop`。

## 常见问题

### Test Connection 提示后端不可用

先确认 PowerShell 中已经运行：

```powershell
cd D:\research\zotero朗读插件
.\server\scripts\start_kokoro.ps1
```

然后在 Zotero 设置页中再次点击 `Test Connection`。

### 第一次朗读比较慢

第一次请求会加载 Kokoro 模型，等待时间会更长。后续朗读会明显更快。

### 没有声音

按顺序检查：

1. Windows 系统音量和 Zotero 音量是否开启。
2. `Edit -> Settings -> Local Academic TTS -> Test Connection` 是否成功。
3. `Tools -> Local TTS -> Play Sample From Local Service` 是否有声音。
4. 如果仍无声音，勾选 `Show Debug menu in Tools`，再测试 Debug 里的音频项。

### 想更换声音或速度

进入 `Edit -> Settings -> Local Academic TTS` 修改 `Voice` 或 `Speed`。

### 想完全停止长文本朗读

使用 `Tools -> Local TTS -> Stop`。悬浮按钮只负责暂停/继续。
