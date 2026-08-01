var LocalAcademicTTS;

function log(message) {
	Zotero.debug("[Local Academic TTS] " + message);
}

function install() {
	log("Installed");
}

async function startup({ id, version, rootURI }) {
	log("Starting");

	await Promise.all([
		Zotero.initializationPromise,
		Zotero.unlockPromise,
		Zotero.uiReadyPromise,
	]);

	Services.scriptloader.loadSubScript(rootURI + "tts-client.js");
	Services.scriptloader.loadSubScript(rootURI + "local-academic-tts.js");
	registerPreferencePane(id, rootURI);
	LocalAcademicTTS.init({ id, version, rootURI });
	LocalAcademicTTS.addToAllWindows();
}

function registerPreferencePane(id, rootURI) {
	if (!Zotero.PreferencePanes?.register) {
		log("Preference pane API is not available");
		return;
	}

	Zotero.PreferencePanes.register({
		pluginID: id,
		src: "prefs.xhtml",
		scripts: ["prefs-pane.js"],
	});
	log("Registered preference pane");
}

function onMainWindowLoad({ window }) {
	LocalAcademicTTS?.addToWindow(window);
}

function onMainWindowUnload({ window }) {
	LocalAcademicTTS?.removeFromWindow(window);
}

function shutdown(data, reason) {
	if (typeof APP_SHUTDOWN !== "undefined" && reason === APP_SHUTDOWN) {
		return;
	}

	log("Shutting down");
	LocalAcademicTTS?.shutdown();
	LocalAcademicTTS = undefined;
}

function uninstall() {
	log("Uninstalled");
}
