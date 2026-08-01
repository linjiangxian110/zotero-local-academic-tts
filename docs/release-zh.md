# GitHub 发布流程

这份文档说明如何把本项目发布到 GitHub Release。代码推送、Git tag 和 GitHub Release 是三个相关但不同的动作。

## 1. 三个概念

- `git push origin main`：把代码和文档推送到 GitHub 仓库的 `main` 分支。
- `tag`：给某一个提交打一个固定版本标记，例如 `v0.1.22`。以后看到这个 tag，就知道它对应当时那一版源码。
- `GitHub Release`：GitHub 网页上的正式发布页，可以绑定某个 tag，并上传 XPI、说明文档等文件。

tag 本身不包含 XPI 文件。XPI 需要作为 GitHub Release 的 asset 单独上传。

## 2. 本地准备 release 文件

从项目根目录重新打包：

```powershell
cd plugin
..\.venv-tts\Scripts\python scripts\build_xpi.py
```

当前版本的正式 XPI 是：

```text
plugin\build\local-academic-tts-0.1.22.xpi
```

本项目也会在本机 release 文件夹中准备一个更短的文件名：

```text
D:\research\zotero-local-tts-release\localtts0122.xpi
```

## 3. 创建并推送 tag

如果 tag 还没有创建：

```powershell
git tag -a v0.1.22 -m "Release v0.1.22"
git push origin v0.1.22
```

如果 GitHub 上已经存在同名 tag，不要重复创建。先用下面命令检查：

```powershell
git ls-remote --tags origin "v0.1.22"
```

## 4. 在 GitHub 网页创建 Release

1. 打开仓库页面：
   `https://github.com/linjiangxian110/zotero-local-academic-tts`
2. 点击右侧或顶部的 `Releases`。
3. 点击 `Draft a new release`。
4. 在 `Choose a tag` 中选择 `v0.1.22`。
5. Release title 填写 `v0.1.22`。
6. 上传下面这些文件：
   - `D:\research\zotero-local-tts-release\localtts0122.xpi`
   - `D:\research\zotero-local-tts-release\README-中文使用说明.md`
   - `D:\research\zotero-local-tts-release\setup-zh.md`
   - `D:\research\zotero-local-tts-release\测试清单.md`
7. 点击 `Publish release`。

发布后，用户就可以在 Release 页面下载 `localtts0122.xpi`。

## 5. 更新清单

仓库根目录的 `updates.json` 已经指向：

```text
https://github.com/linjiangxian110/zotero-local-academic-tts/releases/download/v0.1.22/localtts0122.xpi
```

这意味着 GitHub Release 发布并上传 `localtts0122.xpi` 后，插件的更新地址才会真正可用。如果 release asset 还没有上传，这个链接会暂时不可访问。
