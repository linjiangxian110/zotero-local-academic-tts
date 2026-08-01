# Release 测试清单

安装 `localtts0120.xpi` 后，按顺序测试：

- `Edit -> Settings` 中能看到 `Local Academic TTS`
- `Test Connection` 成功，显示 `provider: kokoro`
- 默认不显示 `Tools -> Local TTS -> Debug`
- 勾选 `Show Debug menu in Tools` 后，重启 Zotero 或重新加载插件，能看到 Debug
- 选中一段英文文本，点击 `Local TTS Read` 后能朗读
- 长文本超过 1500 字符时能自动分段连续朗读
- PDF 页面右上角悬浮按钮单击一次能暂停
- 再单击一次悬浮按钮能继续
- `Tools -> Local TTS -> Stop` 能完全停止朗读
- 修改 `Voice` 后声音变化
- 修改 `Speed` 后语速变化
