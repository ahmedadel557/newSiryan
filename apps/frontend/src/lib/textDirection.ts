// Arabic Unicode blocks: ؀-ۿ, ݐ-ݿ, ࢠ-ࣿ, ﭐ-﷿, ﹰ-﻿
const ARABIC_RE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
const LATIN_RE  = /[A-Za-z]/;

export function detectTextDirection(text: string): 'rtl' | 'ltr' {
  for (const char of text) {
    if (ARABIC_RE.test(char)) return 'rtl';
    if (LATIN_RE.test(char)) return 'ltr';
  }
  return 'ltr';
}
