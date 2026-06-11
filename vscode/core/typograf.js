/**
 * Local Typograf Core Engine
 * A zero-dependency JavaScript typography formatter for Russian and English.
 */

const QUOTE_MAP = {
  laquo_raquo: { open: '«', close: '»' },
  bdquo_ldquo: { open: '„', close: '“' },
  ldquo_rdquo: { open: '“', close: '”' },
  dquote: { open: '"', close: '"' },
  lsquo_rsquo: { open: '‘', close: '’' },
  squote: { open: "'", close: "'" }
};

const ENTITY_MAP = {
  '«': { name: '&laquo;', code: '&#171;' },
  '»': { name: '&raquo;', code: '&#187;' },
  '„': { name: '&bdquo;', code: '&#8222;' },
  '“': { name: '&ldquo;', code: '&#8220;' },
  '”': { name: '&rdquo;', code: '&#8221;' },
  '‘': { name: '&lsquo;', code: '&#8216;' },
  '’': { name: '&rsquo;', code: '&#8217;' },
  '—': { name: '&mdash;', code: '&#8212;' },
  '–': { name: '&ndash;', code: '&#8211;' },
  '\u00A0': { name: '&nbsp;', code: '&#160;' },
  '…': { name: '&hellip;', code: '&#8230;' },
  '©': { name: '&copy;', code: '&#169;' },
  '®': { name: '&reg;', code: '&#174;' },
  '™': { name: '&trade;', code: '&#8482;' },
  '±': { name: '&plusmn;', code: '&#177;' }
};

class Typograf {
  /**
   * @param {Object} options
   * @param {string} [options.primaryQuotes] - laquo_raquo, bdquo_ldquo, ldquo_rdquo, dquote, lsquo_rsquo, squote
   * @param {string} [options.secondaryQuotes] - same as above
   * @param {string} [options.outputFormat] - raw, entityName, entityCode
   * @param {boolean} [options.insertLineBreaks] - replace single newlines with <br />
   * @param {boolean} [options.wrapParagraphs] - wrap double-newline separated blocks in <p>...</p>
   * @param {boolean} [options.removeTabs] - remove tab characters
   * @param {boolean} [options.punctuationSpaces] - adjust spaces around punctuation marks
   * @param {boolean} [options.cleanAfterScan] - clean up OCR and scan artifacts
   */
  constructor(options = {}) {
    this.options = {
      primaryQuotes: 'laquo_raquo',
      secondaryQuotes: 'bdquo_ldquo',
      outputFormat: 'raw',
      insertLineBreaks: false,
      wrapParagraphs: false,
      removeTabs: false,
      punctuationSpaces: true,
      cleanAfterScan: false,
      ...options
    };
  }

  /**
   * Decodes supported HTML entities back to raw Unicode characters.
   * @param {string} text
   * @returns {string}
   */
  decodeEntities(text) {
    return text
      .replace(/&laquo;/g, '«').replace(/&#171;/g, '«')
      .replace(/&raquo;/g, '»').replace(/&#187;/g, '»')
      .replace(/&bdquo;/g, '„').replace(/&#8222;/g, '„')
      .replace(/&ldquo;/g, '“').replace(/&#8220;/g, '“')
      .replace(/&rdquo;/g, '”').replace(/&#8221;/g, '”')
      .replace(/&lsquo;/g, '‘').replace(/&#8216;/g, '‘')
      .replace(/&rsquo;/g, '’').replace(/&#8217;/g, '’')
      .replace(/&mdash;/g, '—').replace(/&#8212;/g, '—')
      .replace(/&ndash;/g, '–').replace(/&#8211;/g, '–')
      .replace(/&nbsp;/g, '\u00A0').replace(/&#160;/g, '\u00A0')
      .replace(/&hellip;/g, '…').replace(/&#8230;/g, '…')
      .replace(/&copy;/g, '©').replace(/&#169;/g, '©')
      .replace(/&reg;/g, '®').replace(/&#174;/g, '®')
      .replace(/&trade;/g, '™').replace(/&#8482;/g, '™')
      .replace(/&plusmn;/g, '±').replace(/&#177;/g, '±');
  }

  /**
   * Encodes processed Unicode characters back to the target entity format.
   * @param {string} text
   * @returns {string}
   */
  encodeEntities(text) {
    const format = this.options.outputFormat;
    if (format === 'raw') return text;

    let result = '';
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (ENTITY_MAP[char]) {
        result += format === 'entityName' ? ENTITY_MAP[char].name : ENTITY_MAP[char].code;
      } else {
        result += char;
      }
    }
    return result;
  }

  /**
   * Main processing method
   * @param {string} text
   * @returns {string}
   */
  process(text) {
    if (!text) return '';

    // Split text into HTML tags/comments and plain text blocks
    // This prevents formatting contents of HTML tags, scripts, etc.
    const tokens = text.split(/(<!--[\s\S]*?-->|<[^>]+>)/g);

    for (let i = 0; i < tokens.length; i++) {
      // Even indexes are plain text (or start/end empty strings)
      if (i % 2 === 0) {
        tokens[i] = this.processTextBlock(tokens[i]);
      }
    }

    let result = tokens.join('');

    // Wrap paragraphs if enabled
    if (this.options.wrapParagraphs) {
      result = this.applyParagraphWrapping(result);
    }

    return result;
  }

  /**
   * Process a single plain text token
   * @param {string} text
   * @returns {string}
   */
  processTextBlock(text) {
    if (!text) return '';

    // 1. Decode existing entities so we process them uniformly
    text = this.decodeEntities(text);

    // 2. Remove tabs if enabled
    if (this.options.removeTabs) {
      text = text.replace(/\t/g, ' ');
    }

    // 3. Scan-cleanup (OCR fixes) if enabled
    if (this.options.cleanAfterScan) {
      // Remove word breaks at newlines: об-\nлако -> облако
      text = text.replace(/([a-zA-Zа-яА-ЯёЁ]+)-\s*[\r\n]+\s*([a-zA-Zа-яА-ЯёЁ]+)/g, '$1$2');
      // Normalize double hyphens -- to em-dash
      text = text.replace(/--/g, '—');
    }

    // 4. Clean up spaces around punctuation if enabled
    if (this.options.punctuationSpaces) {
      // Remove spaces before punctuation (except opening brackets)
      text = text.replace(/[ \t]+([.,!?;:)\]}])/g, '$1');
      // Add spaces after punctuation if followed by a letter
      text = text.replace(/([,!?;:])(?=[a-zA-Zа-яА-ЯёЁ])/g, '$1 ');
    }

    // 5. Replace ellipsis
    text = text.replace(/\.{3,}/g, '…');

    // 6. Replace symbols (c), (r), (tm), +-
    text = text.replace(/\([cCсС]\)/g, '©'); // handles both English 'c' and Russian 'с'
    text = text.replace(/\([rRкК]\)/g, '®');
    text = text.replace(/\([tT][mM]\)/g, '™');
    text = text.replace(/\+-/g, '±');

    // Add NBSP after mathematical symbols followed by numbers: ± 5 -> ±\u00A05
    text = text.replace(/([±+=−<>\u2212])[ \t]+(?=\d)/g, '$1\u00A0');

    // 7. Process Quotes (stack-based for nested quotes)
    text = this.processQuotes(text);

    // 8. Process Dashes
    // Em-dash for dialogs at the start of a line
    text = text.replace(/(^|[\r\n])[-–—]([ \t]+)/g, '$1—$2');
    // Em-dash between words (adds non-breaking space before, regular space after)
    text = text.replace(/([ \t]+)[-–—]([ \t]+)/g, '\u00A0— ');
    // En-dash for number ranges: 10-20 -> 10–20 (without spaces)
    text = text.replace(/(\d+)\s*[-–—]\s*(\d+)/g, '$1–$2');

    // 9. Non-breaking spaces (NBSP) after short words (prepositions/conjunctions)
    // Russian prepositions & conjunctions, English short words
    const shortWordsPattern = /\b(в|во|и|на|с|со|по|а|но|у|к|ко|о|об|обо|за|из|изо|до|от|ото|под|подо|над|надо|без|безо|для|при|про|через|сквозь|да|a|an|the|in|on|at|by|to|of|for|as|or|and|but|so|if|up|it|is|he|we|my)\b/gi;
    text = text.replace(shortWordsPattern, (match) => {
      return match;
    });
    // Replace trailing spaces after short words with \u00A0
    // We match any short word at a word boundary, followed by spaces, followed by a word character
    const shortWordSpaceRegex = /(^|[\s()\[\]{}"'«»„“])(в|во|и|на|с|со|по|а|но|у|к|ко|о|об|обо|за|из|изо|до|от|ото|под|подо|над|надо|без|безо|для|при|про|через|сквозь|да|a|an|the|in|on|at|by|to|of|for|as|or|and|but|so|if|up|it|is|he|we|my)[ \t]+(?=[a-zA-Z0-9а-яА-ЯёЁ])/gi;
    text = text.replace(shortWordSpaceRegex, '$1$2\u00A0');

    // NBSP before clitics/particles (же, ли, бы)
    text = text.replace(/[ \t]+(же|ли|бы)\b/gi, '\u00A0$1');

    // NBSP between numbers and units (e.g. 100 руб, 2026 г., 10 кг, 5 $)
    text = text.replace(/(\d+)[ \t]+(руб\.|г\.|кг|м|см|мм|км|шт\.|коп\.|%|px|em|\$|€|£|¥|₽)/gi, '$1\u00A0$2');

    // NBSP for initials (e.g. А. С. Пушкин)
    text = text.replace(/(^|[\s()\[\]{}"'«»„“])([А-ЯЁA-Z])\.[ \t]*([А-ЯЁA-Z])\.[ \t]+(?=[А-ЯЁA-Z][а-яёa-z]+)/g, '$1$2.$3.\u00A0');
    // NBSP for initials after surname (e.g. Пушкин А. С.)
    text = text.replace(/(^|[\s()\[\]{}"'«»„“])([А-ЯЁA-Z][а-яёa-z]+)[ \t]+([А-ЯЁA-Z])\.[ \t]*([А-ЯЁA-Z])\.(?![ \t\u00A0]+[А-ЯЁA-Z][а-яёa-z]+)/g, '$1$2\u00A0$3.$4.');

    // 10. Clean up multiple spaces (except indentation at start of lines)
    text = text.replace(/(?<=\S)[ \t]{2,}/g, ' ');

    // 11. Encode back to HTML entities if requested
    text = this.encodeEntities(text);

    return text;
  }

  /**
   * Replaces quotes using a state machine and nesting stack
   * @param {string} text
   * @returns {string}
   */
  processQuotes(text) {
    const primaryQuotes = QUOTE_MAP[this.options.primaryQuotes] || QUOTE_MAP.laquo_raquo;
    const secondaryQuotes = QUOTE_MAP[this.options.secondaryQuotes] || QUOTE_MAP.bdquo_ldquo;

    // First, normalize all double-quote-like chars to a standard double quote
    // and single-quote-like chars to standard single quote
    let normalized = text
      .replace(/[«»„“”]/g, '"')
      .replace(/[‘’]/g, "'");

    let result = '';
    const doubleStack = []; // stores levels: 'primary' or 'secondary'
    const singleStack = [];

    for (let i = 0; i < normalized.length; i++) {
      const char = normalized[i];
      const prev = i > 0 ? normalized[i - 1] : '';
      const next = i < normalized.length - 1 ? normalized[i + 1] : '';

      if (char === '"') {
        // Double quote processing
        // Decide if it is a closing quote
        const isClose = (
          (/[a-zA-Z0-9а-яА-ЯёЁ.,!?;:)\]}]/.test(prev) && !/[a-zA-Z0-9а-яА-ЯёЁ]/.test(next)) ||
          (doubleStack.length > 0 && (next === '' || /[\s.,!?;:()\[\]{}]/.test(next)))
        );

        if (isClose && doubleStack.length > 0) {
          const level = doubleStack.pop();
          const q = level === 'primary' ? primaryQuotes : secondaryQuotes;
          result += q.close;
        } else {
          const level = doubleStack.length === 0 ? 'primary' : 'secondary';
          doubleStack.push(level);
          const q = level === 'primary' ? primaryQuotes : secondaryQuotes;
          result += q.open;
        }
      } else if (char === "'") {
        // Single quote processing
        // Check if it's an English apostrophe: don't, users'
        const isApostrophe = (
          (/[a-zA-Zа-яА-ЯёЁ]/.test(prev) && /[a-zA-Zа-яА-ЯёЁ]/.test(next)) ||
          (singleStack.length === 0 && /[sSсС]/.test(prev) && (next === '' || /[\s.,!?;:)]/.test(next)))
        );

        if (isApostrophe) {
          // Apostrophe is always replaced with curly right single quote
          result += '’';
        } else {
          // Normal single quote
          const isClose = (
            (/[a-zA-Z0-9а-яА-ЯёЁ.,!?;:)\]}]/.test(prev) && !/[a-zA-Z0-9а-яА-ЯёЁ]/.test(next)) ||
            (singleStack.length > 0 && (next === '' || /[\s.,!?;:()\[\]{}]/.test(next)))
          );

          if (isClose && singleStack.length > 0) {
            const level = singleStack.pop();
            const q = level === 'primary' ? primaryQuotes : secondaryQuotes;
            result += q.close;
          } else {
            const level = singleStack.length === 0 ? 'primary' : 'secondary';
            singleStack.push(level);
            const q = level === 'primary' ? primaryQuotes : secondaryQuotes;
            result += q.open;
          }
        }
      } else {
        result += char;
      }
    }

    return result;
  }

  /**
   * Formats text into paragraphs (<p>...</p>) and optionally line breaks (<br />)
   * @param {string} text
   * @returns {string}
   */
  applyParagraphWrapping(text) {
    // Split by two or more newlines to identify paragraphs
    const paragraphs = text.split(/[\r\n]{2,}/);
    const wrapped = paragraphs
      .map(p => {
        let trimmed = p.trim();
        if (!trimmed) return '';

        // If insertLineBreaks is true, convert single newlines to <br />
        if (this.options.insertLineBreaks) {
          trimmed = trimmed.replace(/\r?\n/g, '<br />\n');
        }

        // Wrap only if it doesn't already start/end with block level tags (simple check)
        if (/^<(p|div|ul|ol|li|h[1-6]|blockquote|pre|table)\b/i.test(trimmed)) {
          return trimmed;
        }

        return `<p>${trimmed}</p>`;
      })
      .filter(p => p !== '');

    return wrapped.join('\n\n');
  }
}

// Support CommonJS export for VS Code and ES modules if imported in modern contexts
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = Typograf;
} else {
  window.Typograf = Typograf;
}
