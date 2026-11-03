/**
 * Markers inside one line of dialogue:
 *
 *   DAN: calm about it <break 0.5> and then it hit me.
 *   DAN: I hear you, {excited: but this changes everything!}
 *   DAN: {whisper, reverb:cathedral: come here} <sfx DOOR> {firm: we need to talk}.
 */
// A span's prefix is a list of `key` / `key:value` tokens ended by ONE colon
// before the text. It is matched token by token: `reverb:cathedral` is itself
// a key:value, so "everything up to the first colon" would cut it in half.
const TOKEN = String.raw`[a-zA-Z_][\w.-]*(?::[a-zA-Z0-9_.+-]+)?`;
const PREFIX = String.raw`(?:${TOKEN}\s*,\s*)*${TOKEN}`;
const INLINE = String.raw`<break\s+([\d.]+)>|<([\d.]+)>|<sfx\s+([A-Z][A-Z0-9_-]*)(?:\s+([^>]*))?>|\{(${PREFIX}):([^{}]*)\}`;

export interface RawSegment {
  type: 'text' | 'break' | 'sfx';
  text?: string;
  seconds?: number;
  sound?: string;
  /** span override text (`whisper, reverb:hall`) or sfx play text */
  raw?: string;
}

export function splitSegments(text: string): RawSegment[] {
  const re = new RegExp(INLINE, 'g');
  const out: RawSegment[] = [];
  let pos = 0;
  let m: RegExpExecArray | null;
  let any = false;
  while ((m = re.exec(text))) {
    any = true;
    const before = text.slice(pos, m.index);
    if (before.trim()) out.push({ type: 'text', text: before.trim() });
    const [, breakA, breakB, sfx, sfxArgs, spanKeys, spanText] = m;
    if (breakA !== undefined || breakB !== undefined) {
      out.push({ type: 'break', seconds: Number(breakA ?? breakB) });
    } else if (sfx !== undefined) {
      out.push({ type: 'sfx', sound: sfx, raw: sfxArgs ?? '' });
    } else if (spanText.trim()) {
      out.push({ type: 'text', text: spanText.trim(), raw: spanKeys });
    }
    pos = m.index + m[0].length;
  }
  if (!any) return [{ type: 'text', text }];
  const rest = text.slice(pos);
  if (rest.trim()) out.push({ type: 'text', text: rest.trim() });
  const folded = foldPunctuation(out);
  return folded.length ? folded : [{ type: 'text', text }];
}

/**
 * A fragment of bare punctuation beside a span — the "." in `{firm: talk}.` —
 * joins the text before it rather than being spoken on its own.
 */
function foldPunctuation(segments: RawSegment[]): RawSegment[] {
  const out: RawSegment[] = [];
  for (const seg of segments) {
    const prev = out[out.length - 1];
    if (seg.type === 'text' && !/[\p{L}\p{N}]/u.test(seg.text) && prev?.type === 'text') {
      out[out.length - 1] = { ...prev, text: prev.text + seg.text };
      continue;
    }
    out.push(seg);
  }
  return out;
}

