TE.HindiFont = (function () {
  let regB64 = null;
  let boldB64 = null;
  let loading = null;

  async function load() {
    if (regB64) return;
    if (loading) return loading;

    loading = (async () => {
      const [regBuf, boldBuf] = await Promise.all([
        fetch('fonts/NotoSansDevanagari-Regular.ttf').then(r => r.arrayBuffer()),
        fetch('fonts/NotoSansDevanagari-Bold.ttf').then(r => r.arrayBuffer()),
      ]);
      regB64 = toBase64(regBuf);
      boldB64 = toBase64(boldBuf);
    })();
    return loading;
  }

  function toBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunk = 8192;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  function register(doc) {
    if (!regB64) return;
    doc.addFileToVFS('NotoSansDevanagari-Regular.ttf', regB64);
    doc.addFont('NotoSansDevanagari-Regular.ttf', 'NotoSansDevanagari', 'normal');
    doc.addFileToVFS('NotoSansDevanagari-Bold.ttf', boldB64);
    doc.addFont('NotoSansDevanagari-Bold.ttf', 'NotoSansDevanagari', 'bold');
  }

  return { load, register };
})();
