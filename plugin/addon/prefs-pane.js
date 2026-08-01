var LocalAcademicTTSPrefs = {
	prefix: "extensions.localacademictts.",
	initialized: false,
	defaults: {
		serverURL: "http://127.0.0.1:8765",
		voiceID: "af_heart",
		speed: "1.0",
		showDebugMenu: "false",
	},

	init() {
		if (this.initialized) {
			return;
		}

		this.initialized = true;
		this.bindTextInput("serverURL");
		this.bindTextInput("speed");
		this.bindSelect("voiceID");
		this.bindCheckbox("showDebugMenu");

		document
			.getElementById("local-academic-tts-test-connection")
			?.addEventListener("click", () => {
				this.testConnection().catch((error) => {
					this.showStatus(String(error?.message || error), true);
				});
			});
	},

	bindTextInput(key) {
		const input = document.getElementById("local-academic-tts-" + key);

		if (!input) {
			return;
		}

		input.value = this.getPref(key);
		input.addEventListener("change", () => {
			this.setPref(key, input.value.trim());
		});
	},

	bindSelect(key) {
		const select = document.getElementById("local-academic-tts-" + key);

		if (!select) {
			return;
		}

		select.value = this.getPref(key);
		select.addEventListener("change", () => {
			this.setPref(key, select.value);
		});
	},

	bindCheckbox(key) {
		const checkbox = document.getElementById("local-academic-tts-" + key);

		if (!checkbox) {
			return;
		}

		checkbox.checked = this.getPref(key) === "true";
		checkbox.addEventListener("change", () => {
			this.setPref(key, checkbox.checked ? "true" : "false");
		});
	},

	getPref(key) {
		const value = Zotero.Prefs.get(this.prefix + key, true);

		if (value === undefined || value === null || value === "") {
			return this.defaults[key];
		}

		return String(value);
	},

	setPref(key, value) {
		Zotero.Prefs.set(this.prefix + key, String(value), true);
		this.showStatus("Saved");
	},

	getSettings() {
		const speed = Number(this.getPref("speed"));

		return {
			serverURL: this.getPref("serverURL").replace(/\/+$/, ""),
			voiceID: this.getPref("voiceID"),
			speed: Number.isFinite(speed) ? Math.min(2, Math.max(0.5, speed)) : 1,
		};
	},

	async testConnection() {
		const settings = this.getSettings();
		const xhr = await Zotero.HTTP.request("GET", settings.serverURL + "/health", {
			responseType: "json",
		});

		if (xhr.status !== 200) {
			throw new Error("Health check failed: HTTP " + xhr.status);
		}

		this.showStatus(
			"Connected. Provider: " +
				xhr.response.provider +
				", model loaded: " +
				String(xhr.response.model_loaded),
		);
	},

	showStatus(message, isError = false) {
		const status = document.getElementById("local-academic-tts-status");

		if (!status) {
			return;
		}

		status.textContent = message;
		status.style.color = isError ? "#b00020" : "#2f6f3e";
	},
};

if (document.readyState === "complete" || document.readyState === "interactive") {
	LocalAcademicTTSPrefs.init();
}
else {
	window.addEventListener(
		"load",
		() => {
			LocalAcademicTTSPrefs.init();
		},
		{ once: true },
	);
}
