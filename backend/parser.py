import re

COMMAND_MAP = {
    "slash double newline": "\n\n",
    "slash newline": "\n",
    "slash indent": "    ",
    "slash tab": "\t",
    "slash bullet": "-",
    "slash numbered point": "1.",
    "slash open paren": "(",
    "slash close paren": ")",
    "slash open brace": "{",
    "slash close brace": "}",
    "slash open bracket": "[",
    "slash close bracket": "]",
    "slash colon": ":",
    "slash comma": ",",
    "slash dot": ".",
    "slash equals": "=",
    "slash question mark": "?",
    "slash exclamation mark": "!",
    "slash semicolon": ";",
    "slash quote": '"',
    "slash single quote": "'",
    "slash space": " ",
    "slash slash": "/",
    "slash backslash": "\\",
    "slash dash": "-",
    "slash underscore": "_",
    "slash plus": "+",
    "slash star": "*",
}

SORTED_COMMANDS = sorted(COMMAND_MAP.keys(), key=lambda item: len(item.split()), reverse=True)
NO_SPACE_BEFORE = {",", ".", ":", ";", "!", "?", ")", "]", "}", '"', "'"}
NO_SPACE_AFTER = {"(", "[", "{", '"', "'"}


def parse_transcript(text: str) -> str:
    if not text:
        return ""

    normalized = re.sub(r"\s+", " ", text.strip().lower())
    if not normalized:
        return ""

    words = normalized.split(" ")
    output_tokens = []

    i = 0
    while i < len(words):
        matched = False
        for command in SORTED_COMMANDS:
            command_words = command.split()
            end = i + len(command_words)
            if end <= len(words) and words[i:end] == command_words:
                output_tokens.append(COMMAND_MAP[command])
                i = end
                matched = True
                break

        if matched:
            continue

        output_tokens.append(words[i])
        i += 1

    return _render_tokens(output_tokens)


def _render_tokens(tokens: list[str]) -> str:
    if not tokens:
        return ""

    output = []

    for token in tokens:
        if token in {"\n", "\n\n"}:
            while output and output[-1] == " ":
                output.pop()
            output.append(token)
            continue

        if token == " ":
            if not output or output[-1] in {" ", "\n", "\n\n"}:
                continue
            output.append(" ")
            continue

        if token in {"    ", "\t"}:
            if output and output[-1] not in {"\n", "\n\n"}:
                if output[-1] != " ":
                    output.append(" ")
            output.append(token)
            continue

        if token in NO_SPACE_BEFORE:
            while output and output[-1] == " ":
                output.pop()
            output.append(token)
            continue

        if token in NO_SPACE_AFTER:
            if output and output[-1] not in {" ", "\n", "\n\n"}:
                output.append(" ")
            output.append(token)
            continue

        if output and output[-1] not in {" ", "\n", "\n\n", "(", "[", "{", '"', "'", "\t", "    "}:
            output.append(" ")
        output.append(token)

    return "".join(output)
