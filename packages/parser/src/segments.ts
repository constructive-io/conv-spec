/**
 * Markers inside one line of dialogue:
 *
 *   DAN: calm about it <break 0.5> and then it hit me.
 *   DAN: I hear you, {excited: but this changes everything!}
 *   DAN: {whisper, reverb:cathedral: come here} <sfx DOOR> {firm: we need to talk}.
 *   DAN: Three things matter. <slide reasons step:1> The first is time.
 */
// A span's prefix is a list of `key` / `key:value` tokens ended by ONE colon
// before the text. It is matched token by token: `reverb:cathedral` is itself
// a key:value, so "everything up to the first colon" would cut it in half.
const TOKEN = String.raw`[a-zA-Z_][\w.-]*(?::[a-zA-Z0-9_.+-]+)?`;
const PREFIX = String.raw`(?:${TOKEN}\s*,\s*)*${TOKEN}`;
const INLINE = String.raw`<break\s+([\d.]+)>|<([\d.]+)>|<sfx\s+([A-Z][A-Z0-9_-]*)(?:\s+([^>]*))?>|\{(${PREFIX}):([^{}]*)\}`;

export interface RawSegment {
  type: 'text' | 'break' | 'sfx' | 'mark';
  text?: string;
  seconds?: number;
  sound?: string;
  /** the directive a mark is made by (`slide`) */
  kind?: string;
  /** span override text (`whisper, reverb:hall`), sfx play text, or what a mark's directive is given */
  raw?: string;
}

/**
 * `marks` are the directives that may be written inside a line (`<slide ID>`).
 * Any other `<word …>` stays what it always was: words.
 */
export function splitSegments(text: string, marks: string[] = []): RawSegment[] {
  const names = marks.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const re = new RegExp(names ? String.raw`${INLINE}|<(${names})(?:\s+([^>]*))?>` : INLINE, 'g');
  const out: RawSegment[] = [];
  let pos = 0;
  let m: RegExpExecArray | null;
  let any = false;
  while ((m = re.exec(text))) {
    any = true;
    const before = text.slice(pos, m.index);
    if (before.trim()) out.push({ type: 'text', text: before.trim() });
    const [, breakA, breakB, sfx, sfxArgs, spanKeys, spanText, mark, markArgs] = m;
    if (breakA !== undefined || breakB !== undefined) {
      out.push({ type: 'break', seconds: Number(breakA ?? breakB) });
    } else if (sfx !== undefined) {
      out.push({ type: 'sfx', sound: sfx, raw: sfxArgs ?? '' });
    } else if (mark !== undefined) {
      out.push({ type: 'mark', kind: mark, raw: (markArgs ?? '').trim() });
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
 * joins the text before it rather than being spoken on its own. A mark takes
 * no room, so the text before a mark is the text before what follows it.
 */
function foldPunctuation(segments: RawSegment[]): RawSegment[] {
  const out: RawSegment[] = [];
  for (const seg of segments) {
    let at = out.length - 1;
    while (at >= 0 && out[at].type === 'mark') at--;
    const prev = out[at];
    if (seg.type === 'text' && !/[\p{L}\p{N}]/u.test(seg.text) && prev?.type === 'text') {
      out[at] = { ...prev, text: prev.text + seg.text };
      continue;
    }
    out.push(seg);
  }
  return out;
}

