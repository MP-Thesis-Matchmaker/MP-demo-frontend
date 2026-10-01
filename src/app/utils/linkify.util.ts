export type TextSegment = {kind: 'text'; text: string} | {kind: 'link'; text: string; href: string};

// http(s) only; stops at whitespace and at a closing bracket/quote, so "(https://x.y/z)" yields "https://x.y/z".
const URL_PATTERN = /https?:\/\/[^\s)"'<>\]]+/g;
// Sentence punctuation that ends a URL in prose rather than belonging to it.
const TRAILING_PUNCTUATION = /[.,;:!?]+$/;

/**
 * Splits free text into plain and link segments, so a template can render links with `<a>` elements and
 * everything else as text — no `innerHTML`, hence nothing in the text can inject markup.
 */
export function linkify(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_PATTERN)) {
    const href = match[0].replace(TRAILING_PUNCTUATION, '');
    const start = match.index;
    if (start > last) {
      segments.push({kind: 'text', text: text.slice(last, start)});
    }
    segments.push({kind: 'link', text: href, href});
    last = start + href.length;
  }
  if (last < text.length) {
    segments.push({kind: 'text', text: text.slice(last)});
  }
  return segments;
}
