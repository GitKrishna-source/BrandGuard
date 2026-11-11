"""Shared English concepts for local search and conservative claim checks."""

import re

# Each family groups alternate wording of a specific topic. Similarity between
# two passages is only a retrieval signal. It cannot establish entailment.
CONCEPTS = {
    "ranking": r"#1\b|\b(?:no\.?\s*1|number (?:one|1)|best in the world|"
               r"top[- ]ranked|ranks? first|outperform(?:s|ing)? every competitor|"
               r"unrival(?:ed|led)|ahead of every rival)\b",
    "waterproofing": r"\b(?:100%\s+)?(?:waterproof(?:ing)?|keeps? (?:all )?water out|"
                     r"(?:completely |fully )?impervious to water|"
                     r"feet (?:stay|remain) (?:completely )?dry in (?:any weather|a downpour))\b",
    "medical_benefit": r"\b(?:cur(?:e[sd]?|ing) foot pain|pain[- ]reliev(?:ing|er)|"
                       r"orthopaedic|orthopedic|"
                       r"(?:eliminat(?:e[sd]?|ing)|reliev(?:e[sd]?|ing)|"
                       r"get(?:s|ting)? rid of|banish(?:es|ing)?) "
                       r"(?:foot (?:pain|aches?)|aching feet|sore feet))\b",
    "lifetime": r"\b(?:lifetime durability|lasts? forever|lasts? a lifetime|"
                r"never wears? out|indestructible|built to last a lifetime)\b",
    "recycled": r"\b(?:recycled[- ]materials?|recycled content|"
                r"made (?:entirely )?from reclaimed materials|repurposed fabric)\b",
    "carbon_neutral": r"\b(?:carbon[- ]neutral|net[- ]zero (?:emissions|carbon)|"
                      r"zero carbon footprint)\b",
    "returns": r"\b(?:returns?|refunds?|money[- ]back|send (?:it|them|\w+) back)\b",
    "unworn": r"\b(?:unworn|unused|never worn|unopened)\b",
    "delivery": r"\b(?:deliver(?:y|ed)|arrival|arrives?|receipt|received)\b",
    "footwear": r"\b(?:shoes?|footwear|sneakers?|kicks|trainers?)\b",
    "walking": r"\b(?:walking|strolls?|daily wear|everyday wear)\b",
    "racing": r"\b(?:racing (?:equipment|shoes?|footwear)|"
              r"(?:built|designed|made) (?:for|to win) (?:competitive )?(?:races|racing)|"
              r"competition[- ]grade (?:trainers|footwear|shoes))\b",
    "price": r"\b(?:prices?|costs?|pricing|catalogue price|retails? for|pay)\b|[₹$€]",
    "cheapness": r"\b(?:dirt cheap|bargain[- ]basement|costs? next to nothing)\b",
    "guarantee": r"\b(?:guarantee[ds]?|100%|promise[ds]?|zero[- ]defects?)\b",
    "evidence": r"\b(?:evidence|proof|documentation|substantiat\w+|verification)\b",
    "alt_text": r"\b(?:alt text|alternative text|image descriptions?|"
                r"screen[- ]reader descriptions?|text equivalents?)\b",
    "palette": r"\b(?:palettes?|brand colou?rs?|approved colou?rs?)\b",
    "wordmark": r"\b(?:wordmarks?|logos?|brand marks?)\b",
    "clear_space": r"\b(?:clear space|exclusion zone|margin around (?:the )?(?:logo|wordmark))\b",
    "legibility": r"\b(?:legib\w+|readab\w+|contrast|easy to read)\b",
    "inclusive_language": r"\b(?:inclusive language|gender[- ]neutral|"
                          r"gendered language|non[- ]sexist language)\b",
    "confidentiality": r"\b(?:confidential|private data|sensitive information|"
                       r"non[- ]public information|trade secrets?)\b",
}
PATTERNS = {name: re.compile(pattern, re.IGNORECASE) for name, pattern in CONCEPTS.items()}


def concepts(text: str) -> set[str]:
    return {name for name, pattern in PATTERNS.items() if pattern.search(text)}
