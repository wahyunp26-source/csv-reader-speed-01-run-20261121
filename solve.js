// Fast drop-in for csv-reader 1.0.0: reads broken CSV exactly per the spec
// and returns {columns, rows, errors} for one case's {text, header}.
// Single pass, indexOf-based scanning, stdlib only, no network,
// deterministic: no randomness, no clock, nothing cached between cases.

const CR = 13;
const QUOTE = 34;

export function run(input) {
  let text = input.text;
  const header = input.header === true;
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const n = text.length;
  const rows = [];
  const errors = [];
  let columns = null;
  let width = -1;
  let pos = 0;
  let line = 1;
  let qpos = text.indexOf('"', 0);
  let rpos = text.indexOf('\r', 0);
  let curStartLine = 1;
  let curRow = null;

  // Field-parse outputs, shared to avoid one allocation per field.
  let fValue = '';
  let fKind = 0; // 0 = comma, 1 = end of line, 2 = end of input
  let fNext = 0;

  // Reads one unquoted field starting at p (quotes are literal here).
  // prefix is prepended to the value (used for the unterminated-quote
  // re-read, where the opening quote itself is a literal character).
  // Sets fValue / fKind / fNext.
  function parseUnquoted(p, prefix) {
    const c = text.indexOf(',', p);
    const nl = text.indexOf('\n', p);
    let end;
    let kind;
    if (c !== -1 && (nl === -1 || c < nl)) {
      end = c;
      kind = 0;
    } else if (nl !== -1) {
      end = nl;
      kind = 1;
    } else {
      end = n;
      kind = 2;
    }
    let raw = text.slice(p, end);
    // A CR right before the LF is the CRLF line ending, not a stray CR.
    if (kind === 1 && raw.charCodeAt(raw.length - 1) === CR) raw = raw.slice(0, -1);
    if (raw.indexOf('\r') !== -1) {
      const parts = raw.split('\r');
      for (let k = 0; k < parts.length - 1; k++) {
        errors.push({ code: 'stray_cr', line: curStartLine, row: curRow });
      }
      raw = parts.join('');
    }
    fValue = prefix ? prefix + raw : raw;
    fKind = kind;
    fNext = kind === 2 ? end : end + 1;
  }

  // Applies the first record's width to a finished record: the first
  // record sets the width (and becomes columns when header is true),
  // later records are padded (short_row) or cut (long_row).
  function finalize(fields) {
    if (width === -1) {
      width = fields.length;
      if (header) {
        columns = fields;
        return;
      }
      rows.push(fields);
      return;
    }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: curStartLine, row: curRow, fields: fields.length });
      while (fields.length < width) fields.push('');
      rows.push(fields);
    } else if (fields.length > width) {
      const extra = fields.slice(width);
      errors.push({ code: 'long_row', line: curStartLine, row: curRow, extra });
      fields.length = width;
      rows.push(fields);
    } else {
      rows.push(fields);
    }
  }

  // Parses one record starting at pos, which may span lines through
  // quoted fields. Updates pos and line; returns the record's fields.
  function parseGeneral() {
    const fields = [];
    for (;;) {
      if (text.charCodeAt(pos) === QUOTE) {
        // Quoted field: find the closing quote that is not doubled.
        let scan = pos + 1;
        let q = -1;
        let doubled = false;
        for (;;) {
          const qq = text.indexOf('"', scan);
          if (qq === -1) break;
          if (text.charCodeAt(qq + 1) === QUOTE) {
            doubled = true;
            scan = qq + 2;
            continue;
          }
          q = qq;
          break;
        }
        if (q === -1) {
          // Never closes: the quote is literal, the rest is read again
          // as unquoted.
          errors.push({ code: 'unterminated_quote', line: curStartLine, row: curRow });
          parseUnquoted(pos + 1, '"');
          fields.push(fValue);
          pos = fNext;
          if (fKind === 0) continue;
          if (fKind === 1) line++;
          return fields;
        }
        let content = text.slice(pos + 1, q);
        if (doubled) content = content.split('""').join('"');
        if (content.indexOf('\n') !== -1 || content.indexOf('\r') !== -1) {
          const breaks = content.match(/\r\n|\r|\n/g);
          if (breaks !== null) line += breaks.length;
          content = content.replace(/\r\n|\r/g, '\n');
        }
        // Fast path: usually nothing follows the closing quote but a
        // comma or a line break, so there is no junk to scan for.
        const after = text.charCodeAt(q + 1);
        if (after === 44) {
          fields.push(content);
          pos = q + 2;
          continue;
        }
        if (after === 10) {
          fields.push(content);
          pos = q + 2;
          line++;
          return fields;
        }
        if (after === 13 && text.charCodeAt(q + 2) === 10) {
          fields.push(content);
          pos = q + 3;
          line++;
          return fields;
        }
        // What follows the closing quote, up to the next comma or line
        // break, is appended as it stands.
        parseUnquoted(q + 1, '');
        if (fValue.length > 0) {
          errors.push({ code: 'quote_junk', line: curStartLine, row: curRow });
        }
        fields.push(content + fValue);
        pos = fNext;
        if (fKind === 0) continue;
        if (fKind === 1) line++;
        return fields;
      }
      parseUnquoted(pos, '');
      fields.push(fValue);
      pos = fNext;
      if (fKind === 0) continue;
      if (fKind === 1) line++;
      return fields;
    }
  }

  while (pos < n) {
    if (qpos !== -1 && qpos < pos) qpos = text.indexOf('"', pos);
    if (rpos !== -1 && rpos < pos) rpos = text.indexOf('\r', pos);
    const nl = text.indexOf('\n', pos);
    const lineEnd = nl === -1 ? n : nl;
    if (qpos === -1 || qpos >= lineEnd) {
      // No quote on this line, so no quoted field can span lines here:
      // the record ends at this line break. Fast path.
      const crInLine = rpos !== -1 && rpos < lineEnd;
      const crlfOnly = crInLine && nl !== -1 && rpos === lineEnd - 1;
      curStartLine = line;
      curRow = header && width === -1 ? null : rows.length;
      if (crInLine && !crlfOnly) {
        // Stray CRs on this line: drop each (one error each), keep the
        // rest. A trailing CR before LF is the CRLF ending, not stray.
        let effEnd = lineEnd;
        if (nl !== -1 && lineEnd > pos && text.charCodeAt(lineEnd - 1) === CR) {
          effEnd = lineEnd - 1;
        }
        const parts = text.slice(pos, effEnd).split('\r');
        for (let k = 0; k < parts.length - 1; k++) {
          errors.push({ code: 'stray_cr', line: curStartLine, row: curRow });
        }
        const clean = parts.join('');
        if (clean.length > 0) finalize(clean.split(','));
        if (nl !== -1) line++;
        pos = nl === -1 ? n : nl + 1;
        continue;
      }
      const segEnd = crlfOnly ? lineEnd - 1 : lineEnd;
      if (segEnd === pos) {
        // A line left with no characters is no record.
        if (nl !== -1) line++;
        pos = nl === -1 ? n : nl + 1;
        continue;
      }
      const fields = [];
      let p = pos;
      for (;;) {
        const c = text.indexOf(',', p);
        if (c === -1 || c >= segEnd) {
          fields.push(text.slice(p, segEnd));
          break;
        }
        fields.push(text.slice(p, c));
        p = c + 1;
      }
      finalize(fields);
      if (nl !== -1) line++;
      pos = nl === -1 ? n : nl + 1;
    } else {
      curStartLine = line;
      curRow = header && width === -1 ? null : rows.length;
      const fields = parseGeneral();
      finalize(fields);
    }
  }

  return { columns, rows, errors };
}
