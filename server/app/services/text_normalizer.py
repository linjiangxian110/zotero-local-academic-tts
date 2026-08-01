import re

ABBREVIATIONS = {
    "LLM": "L L M",
    "TTS": "T T S",
    "ADE": "A D E",
    "FDE": "F D E",
    "GPU": "G P U",
    "CPU": "C P U",
}


def normalize_academic_text(text: str) -> str:
    cleaned = text.replace("\r\n", "\n").replace("\r", "\n").strip()

    if not cleaned:
        return ""

    cleaned = _join_hyphenated_line_breaks(cleaned)
    cleaned = _remove_numeric_citations(cleaned)
    cleaned = _expand_percent_signs(cleaned)
    cleaned = _collapse_whitespace(cleaned)
    cleaned = _expand_abbreviations(cleaned)

    return cleaned.strip()


def _join_hyphenated_line_breaks(text: str) -> str:
    return re.sub(r"(?<=\w)-\s*\n\s*(?=\w)", "", text)


def _remove_numeric_citations(text: str) -> str:
    return re.sub(r"\s*\[(?:\d+\s*(?:[-,;]\s*)?)+\]", "", text)


def _expand_percent_signs(text: str) -> str:
    return re.sub(r"(\d+(?:\.\d+)?)\s*%", r"\1 percent", text)


def _collapse_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", text)


def _expand_abbreviations(text: str) -> str:
    expanded = text

    for abbreviation, spoken in ABBREVIATIONS.items():
        expanded = re.sub(rf"\b{re.escape(abbreviation)}\b", spoken, expanded)

    return expanded
