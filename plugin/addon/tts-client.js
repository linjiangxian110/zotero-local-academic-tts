var LocalAcademicTTSTTSClient = {
	baseURL: "http://127.0.0.1:8765",
	timeoutMs: 60000,

	async health(timeoutMs = this.timeoutMs) {
		const xhr = await this.withTimeout(
			Zotero.HTTP.request("GET", this.baseURL + "/health", {
				responseType: "json",
			}),
			"Health check",
			timeoutMs,
		);

		this.assertStatus(xhr, 200, "Health check failed");
		return xhr.response;
	},

	async synthesize(request) {
		const xhr = await this.withTimeout(
			Zotero.HTTP.request("POST", this.baseURL + "/synthesize", {
				headers: {
					"Content-Type": "application/json",
					Accept: "audio/wav",
				},
				body: JSON.stringify(request),
				responseType: "arraybuffer",
			}),
			"Synthesis request",
		);

		this.assertStatus(xhr, 200, "Synthesis request failed");

		if (!xhr.response || xhr.response.byteLength === 0) {
			throw new Error("Synthesis response did not contain audio.");
		}

		return xhr.response;
	},

	async withTimeout(promise, label, timeoutMs = this.timeoutMs) {
		let timedOut = false;
		const guardedPromise = promise.catch((error) => {
			if (timedOut) {
				return undefined;
			}

			throw error;
		});

		const timeout = Zotero.Promise.delay(timeoutMs).then(() => {
			timedOut = true;
			throw new Error(
				label + " timed out after " + Math.round(timeoutMs / 1000) + " seconds.",
			);
		});

		try {
			return await Promise.race([guardedPromise, timeout]);
		}
		catch (error) {
			if (timedOut) {
				throw error;
			}

			throw new Error(this.describeNetworkError(error));
		}
	},

	assertStatus(xhr, expectedStatus, label) {
		if (xhr?.status === expectedStatus) {
			return;
		}

		throw new Error(label + ": HTTP " + (xhr?.status || "unknown"));
	},

	describeNetworkError(error) {
		const message = String(error?.message || error);

		if (
			message.includes("NS_ERROR_CONNECTION_REFUSED") ||
			message.includes("Failed to fetch") ||
			message.includes("NetworkError")
		) {
			return (
				"Local TTS service is not running at " +
				this.baseURL +
				". Start the Kokoro backend first, then try again."
			);
		}

		if (message.includes("timed out after")) {
			return (
				message +
				" The first Kokoro request can be slow while the model loads. If this repeats, restart the backend and run Local TTS: Test Connection."
			);
		}

		return message;
	},
};
