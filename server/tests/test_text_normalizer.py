from app.services.text_normalizer import normalize_academic_text


def test_normalize_academic_text_repairs_hyphenated_line_breaks() -> None:
    text = "The pro-\nposed method improves results."

    assert normalize_academic_text(text) == "The proposed method improves results."


def test_normalize_academic_text_removes_numeric_citations() -> None:
    text = "The proposed method [17] improves generalization [3, 4]."

    assert normalize_academic_text(text) == (
        "The proposed method improves generalization."
    )


def test_normalize_academic_text_expands_known_abbreviations() -> None:
    text = "The FDE decreases on GPU inference."

    assert normalize_academic_text(text) == (
        "The F D E decreases on G P U inference."
    )


def test_normalize_academic_text_expands_percent_signs() -> None:
    text = "The model achieves 92.6% accuracy."

    assert normalize_academic_text(text) == (
        "The model achieves 92.6 percent accuracy."
    )


def test_normalize_academic_text_collapses_whitespace() -> None:
    text = "The   method\n\nimproves\tgeneralization."

    assert normalize_academic_text(text) == (
        "The method improves generalization."
    )


def test_normalize_academic_text_handles_empty_text() -> None:
    assert normalize_academic_text(" \n\t ") == ""
