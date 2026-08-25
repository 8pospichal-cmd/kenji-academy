// ============================================
// KENJI ACADEMY — klientská optimalizace obrázků
// ============================================
// Zmenší a znovu zakóduje fotku před nahráním, aby neletělo 6 MB na server.
// Zachovává rozumnou kvalitu (fotografové nahrávají hezké fotky).
// Použití: const small = await window.KenjiImage.compress(file, { maxDim: 1600, quality: 0.82 });
(function () {
  function readAsDataURL(file) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(fr.result); };
      fr.onerror = function () { reject(fr.error || new Error('read failed')); };
      fr.readAsDataURL(file);
    });
  }
  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('decode failed')); };
      img.src = src;
    });
  }
  function toBlob(canvas, type, quality) {
    return new Promise(function (resolve) {
      if (canvas.toBlob) canvas.toBlob(function (b) { resolve(b); }, type, quality);
      else resolve(null);
    });
  }

  async function compress(file, opts) {
    opts = opts || {};
    var maxDim = opts.maxDim || 1600;
    var quality = opts.quality || 0.82;
    var type = opts.type || 'image/webp';
    try {
      if (!file || !/^image\//.test(file.type) || file.type === 'image/gif') return file;
      var dataUrl = await readAsDataURL(file);
      var img = await loadImage(dataUrl);
      var w = img.naturalWidth || img.width;
      var h = img.naturalHeight || img.height;
      if (!w || !h) return file;
      if (Math.max(w, h) > maxDim) {
        var scale = maxDim / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      var canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      var ctx = canvas.getContext('2d');
      if (!ctx) return file;
      ctx.drawImage(img, 0, 0, w, h);
      var blob = await toBlob(canvas, type, quality);
      // Fallback na JPEG, kdyby prohlížeč WebP z canvasu neuměl.
      if (!blob && type !== 'image/jpeg') { type = 'image/jpeg'; blob = await toBlob(canvas, type, quality); }
      if (!blob) return file;
      // Když by výsledek nebyl menší (u už optimalizovaných fotek), ponech originál.
      if (blob.size >= file.size && /^image\/(jpeg|webp)$/.test(file.type)) return file;
      var ext = type === 'image/webp' ? 'webp' : 'jpg';
      var base = (file.name || 'foto').replace(/\.[^.]+$/, '') || 'foto';
      return new File([blob], base + '.' + ext, { type: type, lastModified: Date.now() });
    } catch (e) {
      // Když se cokoli nepovede, radši nahraj originál, ať uživatele nezablokujeme.
      try { console.warn('image compress', e); } catch (_) {}
      return file;
    }
  }

  window.KenjiImage = { compress: compress };
})();
