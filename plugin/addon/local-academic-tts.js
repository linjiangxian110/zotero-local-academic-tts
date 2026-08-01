LocalAcademicTTS = {
	id: null,
	version: null,
	rootURI: null,
	prefPrefix: "extensions.localacademictts.",
	client: null,
	backendStartPromise: null,
	audio: null,
	audioStopResolve: null,
	isReading: false,
	isPaused: false,
	pauseResumeResolve: null,
	objectURL: null,
	objectURLAPI: null,
	readerSelectionHandler: null,
	readerToolbarHandler: null,
	readerFloatingControls: new Set(),
	playbackRunID: 0,
	maxSelectionLength: 8000,
	maxChunkLength: 1200,
	defaultSettings: {
		serverURL: "http://127.0.0.1:8765",
		backendProjectRoot: "",
		autoStartBackend: true,
		voiceID: "af_heart",
		speed: 1.0,
		showDebugMenu: false,
	},
	voiceLanguages: {
		af_heart: "en-US",
		bf_emma: "en-GB",
	},
	menuElementIDs: [
		"local-academic-tts-separator",
		"local-academic-tts-menu",
	],

	init({ id, version, rootURI }) {
		this.id = id;
		this.version = version;
		this.rootURI = rootURI;
		this.client = LocalAcademicTTSTTSClient;
		this.registerReaderSelectionPopup();
		this.registerReaderToolbar();
		this.scheduleBackendAutoStart();
		this.log("Initialized");
	},

	log(message) {
		Zotero.debug("[Local Academic TTS] " + message);
	},

	getPref(key) {
		const value = Zotero.Prefs.get(this.prefPrefix + key, true);

		if (value === undefined || value === null || value === "") {
			return this.defaultSettings[key];
		}

		return value;
	},

	setPref(key, value) {
		Zotero.Prefs.set(this.prefPrefix + key, String(value), true);
	},

	getSettings() {
		const serverURL = String(this.getPref("serverURL"))
			.trim()
			.replace(/\/+$/, "");
		const backendProjectRoot = String(this.getPref("backendProjectRoot") || "")
			.trim()
			.replace(/[\\\/]+$/, "");
		const autoStartBackend = this.getPref("autoStartBackend") === true ||
			String(this.getPref("autoStartBackend")) === "true";
		const voiceID = String(this.getPref("voiceID")).trim() || "af_heart";
		const rawSpeed = Number(this.getPref("speed"));
		const showDebugMenu = this.getPref("showDebugMenu") === true ||
			String(this.getPref("showDebugMenu")) === "true";
		const speed = Number.isFinite(rawSpeed)
			? Math.min(2.0, Math.max(0.5, rawSpeed))
			: 1.0;

		return {
			serverURL: serverURL || this.defaultSettings.serverURL,
			backendProjectRoot:
				backendProjectRoot || this.defaultSettings.backendProjectRoot,
			autoStartBackend,
			voiceID,
			language: this.voiceLanguages[voiceID] || "en-US",
			speed,
			showDebugMenu,
		};
	},

	getClient(serverURL = null) {
		this.client.baseURL = serverURL || this.getSettings().serverURL;
		return this.client;
	},

	scheduleBackendAutoStart() {
		Zotero.Promise.delay(1500).then(() => {
			this.ensureBackendReady(null, { silent: true }).catch((error) => {
				this.log("Backend auto-start skipped or failed: " + error);
			});
		});
	},

	async ensureBackendReady(win = null, options = {}) {
		const settings = this.getSettings();
		const client = this.getClient(settings.serverURL);

		if (await this.isBackendHealthy(client, 2500)) {
			return true;
		}

		if (!settings.autoStartBackend) {
			throw new Error(
				"Local TTS backend is not running and auto start is disabled. Enable auto start in Zotero Settings or start Kokoro manually.",
			);
		}

		if (!settings.backendProjectRoot) {
			throw new Error(
				"Backend project root is not configured. Open Zotero Settings -> Local Academic TTS and set Project root.",
			);
		}

		if (!this.backendStartPromise) {
			this.backendStartPromise = this.startBackendProcess(settings)
				.then(() => this.waitForBackendReady(client))
				.finally(() => {
					this.backendStartPromise = null;
				});
		}

		try {
			await this.backendStartPromise;
			return true;
		}
		catch (error) {
			if (!options.silent && win) {
				this.showError(win, error);
			}

			throw error;
		}
	},

	async isBackendHealthy(client, timeoutMs) {
		try {
			const health = await client.health(timeoutMs);
			return health?.status === "ok";
		}
		catch (_) {
			return false;
		}
	},

	async waitForBackendReady(client) {
		for (let attempt = 0; attempt < 45; attempt++) {
			if (await this.isBackendHealthy(client, 2000)) {
				this.log("Backend is ready after auto-start");
				return true;
			}

			await Zotero.Promise.delay(1000);
		}

		throw new Error(
			"Kokoro backend did not become ready after auto start. Check Project root in Zotero Settings.",
		);
	},

	async startBackendProcess(settings) {
		if (Services.appinfo.OS !== "WINNT") {
			throw new Error("Automatic backend start is currently supported on Windows only.");
		}

		const projectRoot = settings.backendProjectRoot;
		const scriptPath = projectRoot + "\\server\\scripts\\start_kokoro.ps1";
		const powershellPath =
			"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";

		this.assertLocalFileExists(powershellPath, "PowerShell");
		this.assertLocalFileExists(scriptPath, "Kokoro startup script");

		const process = Components.classes["@mozilla.org/process/util;1"].createInstance(
			Components.interfaces.nsIProcess,
		);
		const powershell = Components.classes["@mozilla.org/file/local;1"].createInstance(
			Components.interfaces.nsIFile,
		);
		powershell.initWithPath(powershellPath);
		process.init(powershell);

		const args = [
			"-NoProfile",
			"-ExecutionPolicy",
			"Bypass",
			"-WindowStyle",
			"Hidden",
			"-File",
			scriptPath,
			"-ProjectRoot",
			projectRoot,
		];

		if (process.runw) {
			process.runw(false, args, args.length);
		}
		else {
			process.run(false, args, args.length);
		}

		this.log("Started backend process from " + scriptPath);
		return true;
	},

	assertLocalFileExists(path, label) {
		const file = Components.classes["@mozilla.org/file/local;1"].createInstance(
			Components.interfaces.nsIFile,
		);
		file.initWithPath(path);

		if (!file.exists()) {
			throw new Error(label + " was not found: " + path);
		}
	},

	addToAllWindows() {
		for (let win of Zotero.getMainWindows()) {
			if (!win.ZoteroPane) {
				continue;
			}

			this.addToWindow(win);
		}
	},

	addToWindow(win) {
		const doc = win.document;
		const toolsPopup = doc.getElementById("menu_ToolsPopup");

		if (!toolsPopup) {
			this.log("Tools menu popup was not found");
			return;
		}

		if (doc.getElementById("local-academic-tts-menu")) {
			return;
		}

		const createMenuItem = (id, label, command) => {
			const item = doc.createXULElement("menuitem");
			item.id = id;
			item.setAttribute("label", label);
			item.addEventListener("command", () => {
				try {
					Promise.resolve(command()).catch((error) => {
						this.showError(win, error);
					});
				}
				catch (error) {
					this.showError(win, error);
				}
			});
			return item;
		};

		const separator = doc.createXULElement("menuseparator");
		separator.id = "local-academic-tts-separator";
		toolsPopup.appendChild(separator);

		const menu = doc.createXULElement("menu");
		menu.id = "local-academic-tts-menu";
		menu.setAttribute("label", "Local TTS");

		const popup = doc.createXULElement("menupopup");
		popup.id = "local-academic-tts-menu-popup";
		menu.appendChild(popup);

		popup.appendChild(
			createMenuItem("local-academic-tts-test-connection", "Test Connection", () =>
				this.testConnection(win),
			),
		);
		popup.appendChild(
			createMenuItem(
				"local-academic-tts-open-preferences",
				"Open Settings in Zotero Preferences...",
				() => this.openZoteroPreferences(win),
			),
		);

		popup.appendChild(
			createMenuItem(
				"local-academic-tts-play-service-audio",
				"Play Sample From Local Service",
				() => this.playFromLocalService(win),
			),
		);

		const stopItem = doc.createXULElement("menuitem");
		stopItem.id = "local-academic-tts-stop-audio";
		stopItem.setAttribute("label", "Stop");
		stopItem.addEventListener("command", () => {
			this.stopAudio();
		});

		const pauseItem = doc.createXULElement("menuitem");
		pauseItem.id = "local-academic-tts-pause-audio";
		pauseItem.setAttribute("label", "Pause");
		pauseItem.addEventListener("command", () => {
			this.pauseAudio();
		});
		popup.appendChild(pauseItem);

		const resumeItem = doc.createXULElement("menuitem");
		resumeItem.id = "local-academic-tts-resume-audio";
		resumeItem.setAttribute("label", "Resume");
		resumeItem.addEventListener("command", () => {
			this.resumeAudio().catch((error) => {
				this.showError(win, error);
			});
		});
		popup.appendChild(resumeItem);
		popup.appendChild(stopItem);

		if (this.getSettings().showDebugMenu) {
			const debugSeparator = doc.createXULElement("menuseparator");
			popup.appendChild(debugSeparator);

			const debugMenu = doc.createXULElement("menu");
			debugMenu.id = "local-academic-tts-debug-menu";
			debugMenu.setAttribute("label", "Debug");

			const debugPopup = doc.createXULElement("menupopup");
			debugPopup.id = "local-academic-tts-debug-popup";
			debugMenu.appendChild(debugPopup);
			debugPopup.appendChild(
				createMenuItem("local-academic-tts-play-browser-beep", "Play Browser Beep", () =>
					this.playBrowserBeep(win),
				),
			);
			debugPopup.appendChild(
				createMenuItem("local-academic-tts-play-test-audio", "Play Bundled Test WAV", () =>
					this.playTestAudio(win),
				),
			);
			popup.appendChild(debugMenu);
		}

		toolsPopup.appendChild(menu);

		this.log("Registered Tools menu items");
	},

	removeFromWindow(win) {
		const doc = win.document;

		for (let id of this.menuElementIDs) {
			doc.getElementById(id)?.remove();
		}
	},

	removeFromAllWindows() {
		for (let win of Zotero.getMainWindows()) {
			if (!win.ZoteroPane) {
				continue;
			}

			this.removeFromWindow(win);
		}
	},

	registerReaderSelectionPopup() {
		if (!Zotero.Reader?.registerEventListener) {
			this.log("Zotero Reader event API is not available");
			return;
		}

		this.readerSelectionHandler = (event) => {
			this.renderTextSelectionPopup(event);
		};
		Zotero.Reader.registerEventListener(
			"renderTextSelectionPopup",
			this.readerSelectionHandler,
			this.id,
		);
		this.log("Registered Reader text selection popup action");
	},

	unregisterReaderSelectionPopup() {
		if (!this.readerSelectionHandler) {
			return;
		}

		Zotero.Reader?.unregisterEventListener?.(
			"renderTextSelectionPopup",
			this.readerSelectionHandler,
		);
		this.readerSelectionHandler = null;
		this.log("Unregistered Reader text selection popup action");
	},

	registerReaderToolbar() {
		if (!Zotero.Reader?.registerEventListener) {
			this.log("Zotero Reader event API is not available");
			return;
		}

		this.readerToolbarHandler = (event) => {
			this.renderReaderToolbar(event);
		};
		Zotero.Reader.registerEventListener(
			"renderToolbar",
			this.readerToolbarHandler,
			this.id,
		);
		this.log("Registered Reader floating controls");
	},

	unregisterReaderToolbar() {
		if (!this.readerToolbarHandler) {
			return;
		}

		Zotero.Reader?.unregisterEventListener?.(
			"renderToolbar",
			this.readerToolbarHandler,
		);
		this.readerToolbarHandler = null;
		this.readerFloatingControls.clear();
		this.log("Unregistered Reader floating controls");
	},

	renderReaderToolbar(event) {
		const { doc, reader } = event;

		if (!doc) {
			return;
		}

		if (doc.getElementById("local-academic-tts-reader-floating-control")) {
			return;
		}

		const container = doc.createElement("div");
		container.id = "local-academic-tts-reader-floating-control";
		container.style.position = "fixed";
		container.style.top = "58px";
		container.style.right = "18px";
		container.style.zIndex = "2147483647";
		container.style.display = "flex";
		container.style.alignItems = "center";
		container.style.justifyContent = "center";
		container.style.pointerEvents = "auto";

		const pauseResumeButton = this.createReaderToolbarButton(
			doc,
			"local-academic-tts-reader-pause-resume",
			this.isPaused ? "Resume" : "Pause",
			this.isPaused ? "resume" : "pause",
		);
		this.attachReaderToolbarAction(pauseResumeButton, () => {
			try {
				if (this.isPaused) {
					return this.resumeAudio();
				}

				this.pauseAudio();
				return undefined;
			}
			catch (error) {
				this.showError(this.getPlaybackWindow(reader, doc), error);
				return undefined;
			}
		}, this.getPlaybackWindow(reader, doc));

		const controls = {
			container,
			pauseResumeButton,
		};
		this.readerFloatingControls.add(controls);
		container.addEventListener(
			"DOMNodeRemovedFromDocument",
			() => {
				this.readerFloatingControls.delete(controls);
			},
			{ once: true },
		);

		container.append(pauseResumeButton);
		(doc.body || doc.documentElement).append(container);
		this.updateReaderToolbarControls();
		this.log("Rendered Reader floating controls");
	},

	createReaderToolbarButton(doc, id, label, iconName) {
		const button = doc.createElement("button");
		button.id = id;
		button.type = "button";
		button.title = "Local TTS: " + label;
		button.style.cursor = "pointer";
		button.style.display = "inline-flex";
		button.style.alignItems = "center";
		button.style.justifyContent = "center";
		button.style.width = "34px";
		button.style.height = "34px";
		button.style.padding = "0";
		button.style.border = "1px solid rgba(0, 0, 0, 0.18)";
		button.style.borderRadius = "999px";
		button.style.background = "rgba(255, 255, 255, 0.95)";
		button.style.color = "inherit";
		button.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.18)";
		this.setReaderToolbarButtonIcon(button, iconName);
		return button;
	},

	attachReaderToolbarAction(button, action, win) {
		let suppressClickUntil = 0;
		let suppressPressUntil = 0;
		const run = (ev) => {
			ev.preventDefault();
			ev.stopPropagation();

			try {
				Promise.resolve(action()).catch((error) => {
					this.showError(win, error);
				});
			}
			catch (error) {
				this.showError(win, error);
			}
		};

		const runPress = (ev) => {
			if (ev.button !== undefined && ev.button !== 0) {
				return;
			}

			if (Date.now() < suppressPressUntil) {
				ev.preventDefault();
				ev.stopPropagation();
				return;
			}

			suppressPressUntil = Date.now() + 350;
			suppressClickUntil = Date.now() + 500;
			button.setPointerCapture?.(ev.pointerId);
			run(ev);
		};

		button.addEventListener("pointerdown", runPress);
		button.addEventListener("mousedown", (ev) => {
			if (ev.pointerId !== undefined) {
				return;
			}

			runPress(ev);
		});
		button.addEventListener("click", (ev) => {
			if (Date.now() < suppressClickUntil) {
				ev.preventDefault();
				ev.stopPropagation();
				return;
			}

			run(ev);
		});
	},

	setReaderToolbarButtonIcon(button, iconName) {
		const doc = button.ownerDocument;
		button.textContent = "";

		if (iconName === "resume") {
			const triangle = doc.createElement("span");
			triangle.style.display = "block";
			triangle.style.width = "0";
			triangle.style.height = "0";
			triangle.style.marginInlineStart = "2px";
			triangle.style.borderTop = "6px solid transparent";
			triangle.style.borderBottom = "6px solid transparent";
			triangle.style.borderLeft = "10px solid currentColor";
			button.append(triangle);
			return;
		}

		if (iconName === "stop") {
			const square = doc.createElement("span");
			square.style.display = "block";
			square.style.width = "11px";
			square.style.height = "11px";
			square.style.borderRadius = "2px";
			square.style.background = "currentColor";
			button.append(square);
			return;
		}

		const pause = doc.createElement("span");
		pause.style.display = "inline-flex";
		pause.style.gap = "3px";

		for (let i = 0; i < 2; i++) {
			const bar = doc.createElement("span");
			bar.style.display = "block";
			bar.style.width = "4px";
			bar.style.height = "12px";
			bar.style.borderRadius = "1px";
			bar.style.background = "currentColor";
			pause.append(bar);
		}

		button.append(pause);
	},

	updateReaderToolbarControls() {
		for (let controls of this.readerFloatingControls) {
			if (!controls.container?.isConnected) {
				this.readerFloatingControls.delete(controls);
				continue;
			}

			const hasPlayback = this.isReading || this.audio || this.isPaused;
			controls.pauseResumeButton.title =
				"Local TTS: " + (this.isPaused ? "Resume" : "Pause");
			controls.pauseResumeButton.setAttribute(
				"aria-label",
				"Local TTS: " + (this.isPaused ? "Resume" : "Pause"),
			);
			this.setReaderToolbarButtonIcon(
				controls.pauseResumeButton,
				this.isPaused ? "resume" : "pause",
			);
			controls.pauseResumeButton.disabled = !hasPlayback;
			controls.pauseResumeButton.style.opacity = hasPlayback ? "1" : "0.45";
		}
	},

	renderTextSelectionPopup(event) {
		const { doc, params, reader, append } = event;
		const text = this.getTextFromReaderParams(params);

		if (!text) {
			return;
		}

		const container = doc.createElement("div");
		container.style.display = "flex";
		container.style.paddingTop = "6px";

		const button = doc.createElement("button");
		button.type = "button";
		button.textContent = "Local TTS Read";
		button.style.cursor = "pointer";
		button.style.padding = "4px 8px";
		button.style.fontSize = "12px";

		button.addEventListener("click", async (ev) => {
			ev.preventDefault();
			ev.stopPropagation();
			button.disabled = true;
			button.textContent = "Reading...";

			try {
				const playbackWindow = this.getPlaybackWindow(reader, doc);
				this.log(
					"Reader selection requested, characters=" +
						text.length +
						", window=" +
						(playbackWindow?.document?.location?.href || "unknown"),
				);
				const completed = await this.readSelectedText(playbackWindow, text, {
					onStatus: (status) => {
						button.textContent = status;
					},
				});
				button.textContent = completed ? "Finished" : "Stopped";
				Zotero.Promise.delay(1200).then(() => {
					if (!button.isConnected) {
						return;
					}

					button.disabled = false;
					button.textContent = "Local TTS Read";
				});
			}
			catch (error) {
				button.disabled = false;
				button.textContent = "Local TTS Read";
				this.showError(this.getPlaybackWindow(reader, doc), error);
			}
		});

		container.append(button);
		append(container);
	},

	getTextFromReaderParams(params) {
		const text = String(params?.annotation?.text || "").trim();

		if (!text) {
			return "";
		}

		return text;
	},

	getPlaybackWindow(reader, doc) {
		return Zotero.getMainWindow() || reader?._window || doc?.defaultView?.top;
	},

	async playTestAudio(win) {
		const audioURL = this.rootURI + "samples/test.wav";
		this.stopAudio();

		const audio = new win.Audio(audioURL);
		this.audio = audio;
		this.installAudioHandlers(audio);

		await audio.play();
		this.log("Playing bundled test audio");
	},

	async playBrowserBeep(win) {
		this.stopAudio();

		const AudioContext = win.AudioContext || win.webkitAudioContext;
		if (!AudioContext) {
			throw new Error("AudioContext is not available in this Zotero window.");
		}

		const context = new AudioContext();
		const oscillator = context.createOscillator();
		const gain = context.createGain();

		oscillator.type = "sine";
		oscillator.frequency.setValueAtTime(660, context.currentTime);
		oscillator.frequency.setValueAtTime(880, context.currentTime + 0.35);
		gain.gain.setValueAtTime(0.0001, context.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.25, context.currentTime + 0.03);
		gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.9);

		oscillator.connect(gain);
		gain.connect(context.destination);
		oscillator.start();
		oscillator.stop(context.currentTime + 0.95);

		await new Promise((resolve) => {
			oscillator.addEventListener("ended", resolve, { once: true });
		});
		await context.close();
		this.log("Played browser beep");
	},

	async testConnection(win) {
		const settings = this.getSettings();
		await this.ensureBackendReady(win);
		const health = await this.getClient(settings.serverURL).health();
		win.alert(
			"Local TTS service is available.\n\nProvider: " +
				health.provider +
				"\nModel loaded: " +
				String(health.model_loaded) +
				"\nBackend URL: " +
				settings.serverURL +
				"\nVoice: " +
				settings.voiceID +
				"\nSpeed: " +
				String(settings.speed),
		);
		this.log("Health check succeeded");
	},

	openZoteroPreferences(win) {
		let opened = false;

		try {
			if (win.ZoteroPane?.openPreferences) {
				try {
					win.ZoteroPane.openPreferences(this.id);
				}
				catch (_) {
					win.ZoteroPane.openPreferences();
				}
				opened = true;
			}
		}
		catch (error) {
			this.log("Failed to open Zotero preferences: " + error);
		}

		if (!opened) {
			win.alert(
				"Open Zotero settings from Edit -> Settings, then choose Local Academic TTS.",
			);
			return;
		}

		win.alert("Choose Local Academic TTS in Zotero Settings to edit plugin options.");
	},

	async playFromLocalService(win) {
		await this.readSelectedText(
			win,
			"The proposed method improves cross-domain generalization.",
		);
	},

	async readSelectedText(win, text, options = {}) {
		const cleanedText = String(text || "").trim();

		if (!cleanedText) {
			throw new Error("No selected text to read.");
		}

		if (cleanedText.length > this.maxSelectionLength) {
			throw new Error("Selected text is longer than 8000 characters.");
		}

		const chunks = this.splitTextIntoChunks(cleanedText);
		const playbackRunID = this.beginPlaybackRun();
		const settings = this.getSettings();
		this.isReading = true;
		this.updateReaderToolbarControls();

		try {
			options.onStatus?.("Starting backend...");
			await this.ensureBackendReady(win);

			this.log(
				"Reading selected text, characters=" +
					cleanedText.length +
					", chunks=" +
					chunks.length +
					", voice=" +
					settings.voiceID +
					", speed=" +
					String(settings.speed),
			);

			for (let index = 0; index < chunks.length; index++) {
				if (!this.isPlaybackRunActive(playbackRunID)) {
					return false;
				}

				options.onStatus?.("Synthesizing " + (index + 1) + "/" + chunks.length);
				const audio = await this.getClient(settings.serverURL).synthesize({
					text: chunks[index],
					voice_id: settings.voiceID,
					language: settings.language,
					speed: settings.speed,
				});
				this.log(
					"Received synthesized audio chunk=" +
						(index + 1) +
						"/" +
						chunks.length +
						", bytes=" +
						audio.byteLength,
				);

				if (!this.isPlaybackRunActive(playbackRunID)) {
					return false;
				}

				options.onStatus?.("Playing " + (index + 1) + "/" + chunks.length);
				await this.playAudioBuffer(win, audio, playbackRunID);
			}

			return this.isPlaybackRunActive(playbackRunID);
		}
		finally {
			if (this.isPlaybackRunActive(playbackRunID)) {
				this.isReading = false;
				this.isPaused = false;
				this.updateReaderToolbarControls();
			}
		}
	},

	splitTextIntoChunks(text) {
		const normalizedText = String(text || "").replace(/\s+/g, " ").trim();

		if (!normalizedText) {
			return [];
		}

		const sentenceLikeParts =
			normalizedText.match(/[^.!?;:]+[.!?;:]?["')\]]*/g) || [normalizedText];
		const chunks = [];
		let currentChunk = "";

		for (let part of sentenceLikeParts) {
			const sentence = part.trim();

			if (!sentence) {
				continue;
			}

			if (sentence.length > this.maxChunkLength) {
				if (currentChunk) {
					chunks.push(currentChunk);
					currentChunk = "";
				}

				chunks.push(...this.splitLongChunk(sentence));
				continue;
			}

			if (
				currentChunk &&
				currentChunk.length + 1 + sentence.length > this.maxChunkLength
			) {
				chunks.push(currentChunk);
				currentChunk = sentence;
			}
			else {
				currentChunk = currentChunk ? currentChunk + " " + sentence : sentence;
			}
		}

		if (currentChunk) {
			chunks.push(currentChunk);
		}

		return chunks;
	},

	splitLongChunk(text) {
		const chunks = [];
		let remainingText = String(text || "").trim();

		while (remainingText.length > this.maxChunkLength) {
			let splitAt = remainingText.lastIndexOf(" ", this.maxChunkLength);

			if (splitAt < this.maxChunkLength * 0.5) {
				splitAt = this.maxChunkLength;
			}

			chunks.push(remainingText.slice(0, splitAt).trim());
			remainingText = remainingText.slice(splitAt).trim();
		}

		if (remainingText) {
			chunks.push(remainingText);
		}

		return chunks;
	},

	beginPlaybackRun() {
		this.stopCurrentAudio();
		this.isPaused = false;
		this.resolvePauseWaiter();
		this.playbackRunID += 1;
		return this.playbackRunID;
	},

	isPlaybackRunActive(playbackRunID) {
		return this.playbackRunID === playbackRunID;
	},

	async playAudioBuffer(win, audio, playbackRunID) {
		if (!this.isPlaybackRunActive(playbackRunID)) {
			return;
		}

		this.stopCurrentAudio();
		await this.waitUntilResumed(playbackRunID);

		if (!this.isPlaybackRunActive(playbackRunID)) {
			return;
		}

		const blob = new win.Blob([audio], { type: "audio/wav" });
		this.objectURLAPI = win.URL;
		this.objectURL = this.objectURLAPI.createObjectURL(blob);

		const player = new win.Audio(this.objectURL);
		this.audio = player;

		await new Promise((resolve, reject) => {
			let settled = false;

			const cleanup = () => {
				if (settled) {
					return false;
				}

				settled = true;

				if (this.audio === player) {
					this.audio = null;
				}

				if (this.audioStopResolve === resolvePlayback) {
					this.audioStopResolve = null;
				}

				this.cleanupObjectURL();
				return true;
			};

			const resolvePlayback = () => {
				if (cleanup()) {
					resolve();
				}
			};

			const rejectPlayback = (error) => {
				if (cleanup()) {
					reject(error);
				}
			};

			this.audioStopResolve = resolvePlayback;
			player.addEventListener("ended", resolvePlayback, { once: true });
			player.addEventListener("error", () => {
				const code = player.error?.code || "unknown";
				this.log("Audio error: " + code);
				rejectPlayback(new Error("Audio playback failed: " + code));
			}, { once: true });

			player.play().then(
				() => {
					this.log("Playing audio returned by local service");
				},
				(error) => {
					rejectPlayback(error);
				},
			);
		});
	},

	pauseAudio() {
		if (!this.isReading && !this.audio) {
			this.log("Pause ignored because no audio is playing");
			return;
		}

		this.isPaused = true;

		if (this.audio && !this.audio.paused) {
			this.audio.pause();
		}

		this.updateReaderToolbarControls();
		this.log("Paused audio");
	},

	async resumeAudio() {
		if (!this.isReading && !this.audio && !this.isPaused) {
			this.log("Resume ignored because no audio is paused");
			return;
		}

		this.isPaused = false;
		this.resolvePauseWaiter();
		this.updateReaderToolbarControls();

		if (this.audio && this.audio.paused) {
			await this.audio.play();
		}

		this.log("Resumed audio");
	},

	stopAudio() {
		this.playbackRunID += 1;
		this.isReading = false;
		this.isPaused = false;
		this.resolvePauseWaiter();
		this.stopCurrentAudio();
		this.updateReaderToolbarControls();
		this.log("Stopped audio");
	},

	stopCurrentAudio() {
		const stopResolve = this.audioStopResolve;
		this.audioStopResolve = null;

		if (this.audio) {
			this.audio.pause();
			this.audio.currentTime = 0;
			this.audio = null;
		}

		if (stopResolve) {
			stopResolve();
		}

		this.cleanupObjectURL();
	},

	async waitUntilResumed(playbackRunID) {
		if (!this.isPaused || !this.isPlaybackRunActive(playbackRunID)) {
			return;
		}

		await new Promise((resolve) => {
			this.pauseResumeResolve = resolve;
		});
	},

	resolvePauseWaiter() {
		const resolve = this.pauseResumeResolve;
		this.pauseResumeResolve = null;

		if (resolve) {
			resolve();
		}
	},

	cleanupObjectURL() {
		if (this.objectURL) {
			this.objectURLAPI?.revokeObjectURL(this.objectURL);
			this.objectURL = null;
			this.objectURLAPI = null;
		}
	},

	installAudioHandlers(audio) {
		audio.addEventListener(
			"ended",
			() => {
				if (this.audio === audio) {
					this.audio = null;
				}

				if (this.objectURL) {
					this.objectURLAPI?.revokeObjectURL(this.objectURL);
					this.objectURL = null;
					this.objectURLAPI = null;
				}
			},
			{ once: true },
		);
		audio.addEventListener("error", () => {
			const code = audio.error?.code || "unknown";
			this.log("Audio error: " + code);
		});
	},

	showError(win, error) {
		this.log("Error: " + error);
		win.alert("Local TTS error:\n\n" + String(error?.message || error));
	},

	shutdown() {
		this.stopAudio();
		this.unregisterReaderSelectionPopup();
		this.unregisterReaderToolbar();
		this.removeFromAllWindows();
		this.log("Shutdown complete");
	},
};
