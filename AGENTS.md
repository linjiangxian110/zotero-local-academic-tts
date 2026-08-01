# Project Overview

This repository contains two applications:

- `plugin/`: a Zotero plugin written in JavaScript.
- `server/`: a local TTS service written in Python and FastAPI.

The first milestone is to select English text in Zotero, send it to the local
TTS service, and play the returned WAV audio. Voice cloning is out of scope for
the first milestone.

# Architecture Rules

- Keep the Zotero plugin and Python service loosely coupled.
- The plugin must communicate with the service only through HTTP APIs.
- Do not import model libraries directly from FastAPI route handlers.
- All TTS implementations must implement the provider interface.
- Bind the service only to `127.0.0.1` by default.
- Do not modify Zotero's built-in Read Aloud implementation.
- Document every use of an undocumented Zotero API.

# Python Rules

- Support Python 3.11+.
- Add type hints to public functions.
- Use Pydantic models for API requests.
- Validate text length, voice ID, language, and speed.
- Keep model loading in the provider layer.
- Return structured JSON errors.

# Testing Rules

- Unit tests must not download or load Kokoro.
- Actual model tests must use a separate `model` marker.
- Add regression tests for every bug fixed.
- Report exactly which commands were run and whether they passed.

# Development Workflow

Before editing:

1. Inspect the relevant files.
2. Explain the smallest coherent change.
3. Identify tests that should pass.

After editing:

1. Run formatting if configured.
2. Run type checking if configured.
3. Run focused tests.
4. Review the diff.
5. Summarize changed files and remaining risks.

Do not implement multiple milestones in one change.
