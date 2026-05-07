import re

COMMAND_MAP = {
    # line breaks
    "slash new line": "\n",
    "slash next line": "\n",
    "slash line break": "\n",

    "slash double new line": "\n\n",
    "slash new paragraph": "\n\n",

    # spacing
    "slash indent": "    ",
    "slash tab": "\t",
    "slash space": " ",

    # lists
    "slash bullet": "- ",
    "slash bullet point": "- ",
    "slash numbered point": "1. ",

    # punctuation
    "slash question mark": "?",
    "slash exclamation mark": "!",
    "slash comma": ",",
    "slash colon": ":",
    "slash semicolon": ";",
    "slash dot": ".",
    "slash period": ".",

    # quotes
    "slash quote": '"',
    "slash double quote": '"',
    "slash single quote": "'",
    "slash apostrophe": "'",

    # brackets
    "slash open paren": "(",
    "slash close paren": ")",

    "slash open parenthesis": "(",
    "slash close parenthesis": ")",

    "slash open bracket": "[",
    "slash close bracket": "]",

    "slash open square bracket": "[",
    "slash close square bracket": "]",

    "slash open brace": "{",
    "slash close brace": "}",

    "slash open curly brace": "{",
    "slash close curly brace": "}",

    # operators
    "slash equals": "=",
    "slash plus": "+",
    "slash minus": "-",
    "slash dash": "-",
    "slash underscore": "_",
    "slash star": "*",
    "slash asterisk": "*",
    "slash slash": "/",
    "slash backslash": "\\",

    # comparisons
    "slash greater than": ">",
    "slash less than": "<",

    # programming symbols
    "slash ampersand": "&",
    "slash pipe": "|",
    "slash percent": "%",
    "slash dollar sign": "$",
    "slash hash": "#",
    "slash at sign": "@",

    # angle brackets
    "slash open angle bracket": "<",
    "slash close angle bracket": ">",

    # arrows
    "slash arrow": "->",
    "slash fat arrow": "=>",

    # markdown helpers
    "slash code block": "```",
    "slash markdown heading": "# ",

    # misc
    "slash new tab": "\t",
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
