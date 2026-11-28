TE.Translate = (function () {
  const { debounce } = TE.Utils;

  async function toHindi(text) {
    if (!text || !text.trim()) return '';
    try {
      const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=hi&dt=t&q=' + encodeURIComponent(text);
      const res = await fetch(url);
      if (!res.ok) return '';
      const data = await res.json();
      let result = '';
      if (data && data[0]) {
        for (const seg of data[0]) {
          if (seg[0]) result += seg[0];
        }
      }
      return result;
    } catch (e) {
      console.warn('Translation failed:', e);
      return '';
    }
  }

  function wireAutoTranslate(sourceId, targetId) {
    const source = document.getElementById(sourceId);
    const target = document.getElementById(targetId);
    if (!source || !target) return;

    let manuallyEdited = !!target.value.trim();

    target.addEventListener('input', function () {
      manuallyEdited = !!target.value.trim();
    });

    source.addEventListener('input', debounce(async function () {
      if (manuallyEdited) return;
      const val = source.value.trim();
      if (!val) { target.value = ''; return; }
      const hindi = await toHindi(val);
      if (hindi && !manuallyEdited) {
        target.value = hindi;
      }
    }, 500));
  }

  return { toHindi, wireAutoTranslate };
})();
