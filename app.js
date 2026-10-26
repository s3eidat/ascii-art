/* ASCII Art — image to text by sampling a downscaled canvas; banner letters from bitmap fonts authored below. Nothing is uploaded. */
(function () {
  "use strict";
  var $ = S3.$, $$ = S3.$$;

  // ---------- image -> ASCII (pure parts tested in S3_SELFTEST) ----------
  var RAMPS = { // light (no ink) -> dark (most ink)
    standard: " .:-=+*#%@",
    detailed: "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. ".split("").reverse().join(""),
    blocks: " ░▒▓█",
    simple: " .oO@",
    binary: " 01"
  };
  var CHAR_ASPECT = 0.5; // a monospace cell is about twice as tall as it is wide
  function adjust(v, contrast, brightness) { // v in 0..1
    var k = contrast >= 0 ? 1 + contrast / 100 * 3 : 1 + contrast / 100;
    v = (v - 0.5) * k + 0.5 + brightness / 100;
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }
  // lum: Float32Array of 0..1 brightness per cell; returns lines of text
  function cellsToAscii(lum, cols, rows, ramp, o) {
    o = o || {};
    var chars = Array.from(ramp), n = chars.length - 1, lines = [];
    for (var y = 0; y < rows; y++) {
      var s = "";
      for (var x = 0; x < cols; x++) {
        var v = adjust(lum[y * cols + x], o.contrast || 0, o.brightness || 0), ink = o.invert ? v : 1 - v;
        s += chars[Math.round(ink * n)];
      }
      lines.push(s);
    }
    return lines;
  }
  function gridSize(w, h, cols) { return { cols: cols, rows: Math.max(1, Math.round(cols * h / w * CHAR_ASPECT)) }; }
  function sampleCells(source, w, h, cols) { // average colour per cell via the browser's high-quality downscale
    var g = gridSize(w, h, cols), c = document.createElement("canvas"); c.width = g.cols; c.height = g.rows;
    var x = c.getContext("2d", { willReadFrequently: true });
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high";
    x.fillStyle = "#fff"; x.fillRect(0, 0, g.cols, g.rows); // transparent areas count as paper
    x.drawImage(source, 0, 0, g.cols, g.rows);
    var d = x.getImageData(0, 0, g.cols, g.rows).data, lum = new Float32Array(g.cols * g.rows);
    for (var i = 0; i < lum.length; i++) lum[i] = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
    return { cols: g.cols, rows: g.rows, lum: lum, rgb: d };
  }

  // ---------- bitmap fonts for banners ----------
  // 5x7: each glyph is 7 rows of 5 pixels ("#" on). Narrow glyphs are trimmed so spacing looks even.
  var F57 = {
    A: ".###.|#...#|#...#|#####|#...#|#...#|#...#", B: "####.|#...#|#...#|####.|#...#|#...#|####.", C: ".###.|#...#|#....|#....|#....|#...#|.###.",
    D: "####.|#...#|#...#|#...#|#...#|#...#|####.", E: "#####|#....|#....|####.|#....|#....|#####", F: "#####|#....|#....|####.|#....|#....|#....",
    G: ".###.|#...#|#....|#.###|#...#|#...#|.####", H: "#...#|#...#|#...#|#####|#...#|#...#|#...#", I: ".###.|..#..|..#..|..#..|..#..|..#..|.###.",
    J: "..###|...#.|...#.|...#.|...#.|#..#.|.##..", K: "#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#", L: "#....|#....|#....|#....|#....|#....|#####",
    M: "#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#", N: "#...#|#...#|##..#|#.#.#|#..##|#...#|#...#", O: ".###.|#...#|#...#|#...#|#...#|#...#|.###.",
    P: "####.|#...#|#...#|####.|#....|#....|#....", Q: ".###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#", R: "####.|#...#|#...#|####.|#.#..|#..#.|#...#",
    S: ".####|#....|#....|.###.|....#|....#|####.", T: "#####|..#..|..#..|..#..|..#..|..#..|..#..", U: "#...#|#...#|#...#|#...#|#...#|#...#|.###.",
    V: "#...#|#...#|#...#|#...#|#...#|.#.#.|..#..", W: "#...#|#...#|#...#|#.#.#|#.#.#|#.#.#|.#.#.", X: "#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#",
    Y: "#...#|#...#|.#.#.|..#..|..#..|..#..|..#..", Z: "#####|....#|...#.|..#..|.#...|#....|#####",
    0: ".###.|#...#|#..##|#.#.#|##..#|#...#|.###.", 1: "..#..|.##..|..#..|..#..|..#..|..#..|.###.", 2: ".###.|#...#|....#|...#.|..#..|.#...|#####",
    3: "#####|...#.|..#..|...#.|....#|#...#|.###.", 4: "...#.|..##.|.#.#.|#..#.|#####|...#.|...#.", 5: "#####|#....|####.|....#|....#|#...#|.###.",
    6: "..##.|.#...|#....|####.|#...#|#...#|.###.", 7: "#####|....#|...#.|..#..|.#...|.#...|.#...", 8: ".###.|#...#|#...#|.###.|#...#|#...#|.###.",
    9: ".###.|#...#|#...#|.####|....#|...#.|.##..",
    "!": "..#..|..#..|..#..|..#..|..#..|.....|..#..", "?": ".###.|#...#|....#|...#.|..#..|.....|..#..", ".": ".....|.....|.....|.....|.....|.##..|.##..",
    ",": ".....|.....|.....|.....|.##..|..#..|.#...", "-": ".....|.....|.....|#####|.....|.....|.....", ":": ".....|.##..|.##..|.....|.##..|.##..|.....",
    "'": "..#..|..#..|.#...|.....|.....|.....|.....", "/": "....#|...#.|...#.|..#..|.#...|.#...|#....", "+": ".....|..#..|..#..|#####|..#..|..#..|.....",
    "=": ".....|.....|#####|.....|#####|.....|.....", "&": ".##..|#..#.|#.#..|.#...|#.#.#|#..#.|.##.#", "@": ".###.|#...#|#.###|#.#.#|#.###|#....|.###.",
    "#": ".#.#.|.#.#.|#####|.#.#.|#####|.#.#.|.#.#.", "(": "...#.|..#..|.#...|.#...|.#...|..#..|...#.", ")": ".#...|..#..|...#.|...#.|...#.|..#..|.#...",
    "_": ".....|.....|.....|.....|.....|.....|#####", "*": ".....|#.#.#|.###.|#####|.###.|#.#.#|.....", "\"": ".#.#.|.#.#.|.....|.....|.....|.....|....."
  };
  // 3x5
  var F35 = {
    A: "###|#.#|###|#.#|#.#", B: "##.|#.#|##.|#.#|##.", C: "###|#..|#..|#..|###", D: "##.|#.#|#.#|#.#|##.", E: "###|#..|##.|#..|###",
    F: "###|#..|##.|#..|#..", G: "###|#..|#.#|#.#|###", H: "#.#|#.#|###|#.#|#.#", I: "###|.#.|.#.|.#.|###", J: "..#|..#|..#|#.#|###",
    K: "#.#|#.#|##.|#.#|#.#", L: "#..|#..|#..|#..|###", M: "#.#|###|###|#.#|#.#", N: "##.|#.#|#.#|#.#|#.#", O: "###|#.#|#.#|#.#|###",
    P: "###|#.#|###|#..|#..", Q: "###|#.#|#.#|###|..#", R: "###|#.#|##.|#.#|#.#", S: "###|#..|###|..#|###", T: "###|.#.|.#.|.#.|.#.",
    U: "#.#|#.#|#.#|#.#|###", V: "#.#|#.#|#.#|#.#|.#.", W: "#.#|#.#|###|###|#.#", X: "#.#|#.#|.#.|#.#|#.#", Y: "#.#|#.#|.#.|.#.|.#.",
    Z: "###|..#|.#.|#..|###", 0: "###|#.#|#.#|#.#|###", 1: ".#.|##.|.#.|.#.|###", 2: "###|..#|###|#..|###", 3: "###|..#|###|..#|###",
    4: "#.#|#.#|###|..#|..#", 5: "###|#..|###|..#|###", 6: "###|#..|###|#.#|###", 7: "###|..#|..#|..#|..#", 8: "###|#.#|###|#.#|###",
    9: "###|#.#|###|..#|###", "!": ".#.|.#.|.#.|...|.#.", "?": "###|..#|.#.|...|.#.", ".": "...|...|...|...|.#.", ",": "...|...|...|.#.|#..",
    "-": "...|...|###|...|...", ":": "...|.#.|...|.#.|...", "'": ".#.|.#.|...|...|...", "/": "..#|..#|.#.|#..|#..", "+": "...|.#.|###|.#.|...",
    "=": "...|###|...|###|...", "_": "...|...|...|...|###", "*": "#.#|.#.|#.#|...|..."
  };
  function glyph(font, ch) {
    var rows = (font[ch] || font["?"]).split("|"), w = rows[0].length, lo = 0, hi = w - 1;
    var empty = function (c) { return rows.every(function (r) { return r[c] !== "#"; }); };
    while (lo < hi && empty(lo)) lo++;
    while (hi > lo && empty(hi)) hi--;
    return rows.map(function (r) { return r.slice(lo, hi + 1); });
  }
  // one line of text -> pixel grid (array of strings of "#"/".")
  function textGrid(text, font) {
    var hgt = font === F57 ? 7 : 5, rows = []; for (var i = 0; i < hgt; i++) rows.push("");
    Array.from(String(text).toUpperCase()).forEach(function (ch, k) {
      var g = ch === " " ? rows.map(function () { return font === F57 ? "..." : ".."; }) : glyph(font, ch);
      for (var r = 0; r < hgt; r++) rows[r] += (k ? "." : "") + g[r];
    });
    return rows;
  }
  var STYLES = {
    block: { font: F57, on: "██", off: "  " }, char: { font: F57 }, shadow: { font: F57, shadow: true },
    compact: { font: F57, half: true }, small: { font: F35, on: "██", off: "  " }, tiny: { font: F35, half: true }
  };
  function rtrim(s) { return s.replace(/\s+$/, ""); }
  function renderGrid(rows, style, fill) {
    var st = STYLES[style];
    if (st.half) { // two pixel rows per text line with half blocks: square-ish pixels, half the height
      var out = [], w = rows[0].length;
      for (var y = 0; y < rows.length; y += 2) {
        var s = "";
        for (var x = 0; x < w; x++) {
          var a = rows[y][x] === "#", b = y + 1 < rows.length && rows[y + 1][x] === "#";
          s += a && b ? "█" : a ? "▀" : b ? "▄" : " ";
        }
        out.push(rtrim(s));
      }
      return out;
    }
    if (st.shadow) { // solid letters with a light shade one pixel down-right
      var H = rows.length + 1, W = rows[0].length + 1, res = [];
      for (var yy = 0; yy < H; yy++) {
        var t = "";
        for (var xx = 0; xx < W; xx++) {
          var on = rows[yy] && rows[yy][xx] === "#", sh = yy > 0 && xx > 0 && rows[yy - 1][xx - 1] === "#";
          t += on ? "██" : sh ? "░░" : "  ";
        }
        res.push(rtrim(t));
      }
      return res;
    }
    var onS = st.on || ((fill || "#") + (fill || "#")).slice(0, 2), offS = st.off || "  ";
    if (!st.on && Array.from(fill || "#").length === 2) onS = fill;
    return rows.map(function (r) { return rtrim(r.replace(/#/g, "\u0001").replace(/\./g, offS).split("\u0001").join(onS)); });
  }
  function banner(text, style, fill) {
    var font = STYLES[style].font;
    return String(text).split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean)
      .map(function (l) { return renderGrid(textGrid(l, font), style, fill).join("\n"); }).join("\n\n");
  }

  // ---------- PNG export of any text (optionally coloured per character) ----------
  function textToCanvas(lines, opt) {
    var size = opt.size || 14, font = size + "px Consolas, 'DejaVu Sans Mono', Menlo, monospace", pad = size;
    var c = document.createElement("canvas"), g = c.getContext("2d"); g.font = font;
    var cw = g.measureText("M").width, lh = opt.lineHeight ? opt.lineHeight * size : cw / CHAR_ASPECT;
    var cols = Math.max(1, Math.max.apply(null, lines.map(function (l) { return Array.from(l).length; })));
    c.width = Math.ceil(cols * cw + pad * 2); c.height = Math.ceil(lines.length * lh + pad * 2);
    g = c.getContext("2d"); g.fillStyle = opt.bg; g.fillRect(0, 0, c.width, c.height);
    g.font = font; g.textBaseline = "middle"; g.fillStyle = opt.fg;
    lines.forEach(function (l, y) {
      Array.from(l).forEach(function (ch, x) {
        if (ch === " ") return;
        if (opt.colorAt) g.fillStyle = opt.colorAt(x, y);
        if (/[█▀▄░▒▓]/.test(ch)) blockChar(g, ch, pad + x * cw, pad + y * lh, cw, lh);
        else g.fillText(ch, pad + x * cw, pad + y * lh + lh / 2);
      });
    });
    return c;
  }
  function blockChar(g, ch, x, y, w, hh) { // draw block elements as rectangles so they tile without gaps in any font
    var a = g.globalAlpha;
    if (ch === "█") g.fillRect(x, y, w + 0.5, hh + 0.5);
    else if (ch === "▀") g.fillRect(x, y, w + 0.5, hh / 2 + 0.5);
    else if (ch === "▄") g.fillRect(x, y + hh / 2, w + 0.5, hh / 2 + 0.5);
    else { g.globalAlpha = a * ({ "░": 0.25, "▒": 0.5, "▓": 0.75 })[ch]; g.fillRect(x, y, w + 0.5, hh + 0.5); }
    g.globalAlpha = a;
  }
  function pngDownload(c, name) { c.toBlob(function (b) { S3.download(b, name); S3.done(); }, "image/png"); }

  // ---------- image UI ----------
  var o = Object.assign({ cols: 100, ramp: "standard", custom: " .oO0@", con: 0, bri: 0, invert: false, color: false, font: "block", fill: "#" }, S3.store("ascii") || {});
  var src = null, res = null; // src: {canvas, w, h, name}; res: {lines, cells}
  function saveOpts() { S3.store("ascii", o); }
  function rampStr() { var r = o.ramp === "custom" ? o.custom : RAMPS[o.ramp]; return Array.from(r || "").length >= 2 ? r : RAMPS.standard; }
  [["cols", "cols"], ["con", "con"], ["bri", "bri"]].forEach(function (p) { $("#" + p[0]).value = o[p[1]]; });
  $("#ramp").value = o.ramp; $("#custom").value = o.custom; $("#invert").checked = o.invert; $("#color").checked = o.color;
  function labels() {
    $("#colsV").textContent = o.cols + " characters"; $("#conV").textContent = (o.con > 0 ? "+" : "") + o.con; $("#briV").textContent = (o.bri > 0 ? "+" : "") + o.bri;
    $("#customWrap").hidden = o.ramp !== "custom";
  }
  var renderSoon = S3.debounce(renderImage, 30);
  $("#cols").addEventListener("input", function () { o.cols = +this.value; labels(); renderSoon(); });
  $("#con").addEventListener("input", function () { o.con = +this.value; labels(); renderSoon(); });
  $("#bri").addEventListener("input", function () { o.bri = +this.value; labels(); renderSoon(); });
  ["cols", "con", "bri"].forEach(function (id) { $("#" + id).addEventListener("change", saveOpts); });
  $("#ramp").addEventListener("change", function () { o.ramp = this.value; saveOpts(); labels(); renderImage(); });
  $("#custom").addEventListener("input", function () { o.custom = this.value; saveOpts(); renderSoon(); });
  $("#invert").addEventListener("change", function () { o.invert = this.checked; saveOpts(); renderImage(); });
  $("#color").addEventListener("change", function () { o.color = this.checked; saveOpts(); renderImage(); });

  S3.drop($("#drop"), function (f) { loadImage(f[0]); }, { accept: "image/*", multiple: false });
  document.addEventListener("paste", function (e) {
    var it = Array.from((e.clipboardData && e.clipboardData.items) || []).find(function (i) { return i.kind === "file" && /^image\//.test(i.type); });
    if (it) { e.preventDefault(); loadImage(it.getAsFile()); }
  });
  async function loadImage(file) {
    var bmp; try { bmp = await createImageBitmap(file); } catch (e) { S3.toast("This browser can't open that image", "error"); return; }
    useImage(bmp, bmp.width, bmp.height, file.name || "image");
    if (bmp.close) bmp.close();
  }
  function useImage(source, w, h, name) {
    var k = Math.min(1, 1600 / Math.max(w, h)), c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
    c.getContext("2d").drawImage(source, 0, 0, c.width, c.height);
    src = { canvas: c, w: w, h: h, name: name, base: name.replace(/\.[^.]+$/, "") || "ascii" };
    $("#dropTitle").textContent = "Another image";
    renderImage();
  }
  function renderImage() {
    labels();
    var out = $("#imgOut");
    out.classList.toggle("aa-dark", o.invert);
    $("#colorNote").hidden = !o.color;
    if (!src) { $("#imgEmpty").hidden = false; return; }
    $("#imgEmpty").hidden = true;
    var cells = sampleCells(src.canvas, src.canvas.width, src.canvas.height, o.cols);
    var lines = cellsToAscii(cells.lum, cells.cols, cells.rows, rampStr(), { contrast: o.con, brightness: o.bri, invert: o.invert });
    res = { lines: lines, cells: cells };
    $("#imgInfo").textContent = cells.cols + " × " + cells.rows + " characters";
    var pre = $("#imgPre"), cv = $("#imgCanvas");
    pre.hidden = o.color; cv.hidden = !o.color;
    fitFont();
    if (o.color) {
      var c = colorCanvas(9);
      cv.width = c.width; cv.height = c.height; cv.getContext("2d").drawImage(c, 0, 0);
    } else pre.textContent = lines.join("\n");
  }
  function colorAt(cells) { return function (x, y) { var i = (y * cells.cols + x) * 4; return "rgb(" + cells.rgb[i] + "," + cells.rgb[i + 1] + "," + cells.rgb[i + 2] + ")"; }; }
  function colorCanvas(size) {
    return textToCanvas(res.lines, { size: size, bg: o.invert ? "#0b0d10" : "#ffffff", fg: o.invert ? "#e8eaed" : "#111", colorAt: o.color ? colorAt(res.cells) : null });
  }
  function fitFont() { // shrink the preview font so the whole width fits
    if (!res) return;
    var w = $("#imgOut").clientWidth - 24, size = Math.max(3, Math.min(14, w / (res.cells.cols * 0.6)));
    $("#imgPre").style.fontSize = size.toFixed(2) + "px";
    $("#imgPre").style.lineHeight = (size * 0.6 / CHAR_ASPECT).toFixed(2) + "px";
  }
  new ResizeObserver(S3.debounce(fitFont, 50)).observe($("#imgOut"));
  function need() { if (!res) { S3.toast("Add an image first", "error"); return false; } return true; }
  $("#copyImg").addEventListener("click", function () { if (need()) { S3.copy(res.lines.map(rtrim).join("\n")); S3.done(); } });
  $("#txtImg").addEventListener("click", function () { if (need()) { S3.download(res.lines.map(rtrim).join("\n") + "\n", src.base + "-ascii.txt", "text/plain;charset=utf-8"); S3.done(); } });
  $("#pngImg").addEventListener("click", function () { if (need()) pngDownload(colorCanvas(14), src.base + "-ascii.png"); });

  // ---------- banner UI ----------
  $("#font").value = STYLES[o.font] ? o.font : "block"; $("#fill").value = o.fill;
  function renderBanner() {
    o.font = $("#font").value; o.fill = $("#fill").value || "#";
    $("#fillWrap").hidden = o.font !== "char";
    var txt = banner($("#btext").value, o.font, o.fill);
    $("#bannerPre").textContent = txt || " ";
    return txt;
  }
  $("#btext").addEventListener("input", renderBanner);
  $("#font").addEventListener("change", function () { renderBanner(); saveOpts(); });
  $("#fill").addEventListener("input", function () { renderBanner(); saveOpts(); });
  function bannerText() { var t = renderBanner(); if (!t) S3.toast("Type some text first", "error"); return t; }
  $("#copyTxt").addEventListener("click", function () { var t = bannerText(); if (t) { S3.copy(t); S3.done(); } });
  $("#txtTxt").addEventListener("click", function () { var t = bannerText(); if (t) { S3.download(t + "\n", "banner.txt", "text/plain;charset=utf-8"); S3.done(); } });
  $("#pngTxt").addEventListener("click", function () {
    var t = bannerText(); if (!t) return;
    var dark = document.documentElement.getAttribute("data-theme") !== "light";
    pngDownload(textToCanvas(t.split("\n"), { size: 16, bg: dark ? "#0b0d10" : "#ffffff", fg: dark ? "#5eead4" : "#0f172a", lineHeight: 1.2 }), "banner.png");
  });
  labels(); renderImage(); renderBanner();

  // ---------- demo + self-test ----------
  function demoImage() { // a lit sphere on a soft floor: shading makes good ASCII
    var W = 640, H = 400, c = document.createElement("canvas"); c.width = W; c.height = H;
    var g = c.getContext("2d");
    var bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#f8fafc"); bg.addColorStop(1, "#cbd5e1"); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    var sh = g.createRadialGradient(330, 345, 10, 330, 345, 170); sh.addColorStop(0, "rgba(15,23,42,.55)"); sh.addColorStop(1, "rgba(15,23,42,0)");
    g.fillStyle = sh; g.beginPath(); g.ellipse(330, 345, 190, 38, 0, 0, 7); g.fill();
    var s = g.createRadialGradient(260, 140, 12, 310, 190, 170); s.addColorStop(0, "#ffffff"); s.addColorStop(0.25, "#5eead4"); s.addColorStop(0.75, "#0f766e"); s.addColorStop(1, "#042f2e");
    g.fillStyle = s; g.beginPath(); g.arc(310, 190, 150, 0, 7); g.fill();
    return c;
  }
  window.S3_DEMO = function () {
    o.cols = 110; o.ramp = "standard"; o.con = 20; o.bri = 0; o.invert = false; o.color = false;
    $("#cols").value = 110; $("#ramp").value = "standard"; $("#con").value = 20; $("#bri").value = 0; $("#invert").checked = false; $("#color").checked = false;
    var c = demoImage(); useImage(c, c.width, c.height, "sphere.png");
    $("#btext").value = "S3EIDAT"; $("#font").value = "shadow"; renderBanner();
  };
  window.S3_SELFTEST = function () {
    // a 10-step grey ramp, black -> white, maps to the ramp dark -> light
    var lum = new Float32Array(10); for (var i = 0; i < 10; i++) lum[i] = Math.round(255 * i / 9) / 255;
    var ok = cellsToAscii(lum, 10, 1, RAMPS.standard)[0] === "@%#*+=-:. " && cellsToAscii(lum, 10, 1, RAMPS.standard, { invert: true })[0] === " .:-=+*#%@";
    ok = ok && cellsToAscii(lum, 5, 2, RAMPS.blocks).join("|") === "██▓▓▒|▒░░  ";
    var near = function (x, y) { return Math.abs(x - y) < 1e-9; };
    ok = ok && near(adjust(0.5, 100, 0), 0.5) && near(adjust(0.6, 100, 0), 0.9) && near(adjust(0.2, 0, 50), 0.7) && adjust(0.9, 0, 50) === 1 && near(adjust(0.25, -50, 0), 0.375);
    ok = ok && gridSize(400, 200, 100).rows === 25 && gridSize(100, 100, 40).rows === 20 && Array.from(RAMPS.detailed).length === 70 && RAMPS.detailed[0] === " ";
    // through a real canvas: a horizontal gradient must give non-decreasing light from left to right
    var c = document.createElement("canvas"); c.width = 200; c.height = 40; var g = c.getContext("2d"), gr = g.createLinearGradient(0, 0, 200, 0);
    gr.addColorStop(0, "#000"); gr.addColorStop(1, "#fff"); g.fillStyle = gr; g.fillRect(0, 0, 200, 40);
    var cells = sampleCells(c, 200, 40, 20), row = cellsToAscii(cells.lum, cells.cols, cells.rows, RAMPS.standard)[0];
    ok = ok && cells.rows === 2 && row.length === 20 && row[0] === "@" && row[19] === " ";
    for (i = 1; i < 20; i++) if (RAMPS.standard.indexOf(row[i]) > RAMPS.standard.indexOf(row[i - 1])) ok = false;
    // banners: exact letters for a known word
    var hi = banner("HI", "char", "#").split("\n");
    ok = ok && hi.length === 7 && hi[0] === "##      ##  ######" && hi[1] === "##      ##    ##" && hi[3] === "##########    ##" && hi[6] === "##      ##  ######";
    ok = ok && banner("hi", "char", "#") === banner("HI", "char", "#") && banner("H", "char", "@")[0] === "@";
    ok = ok && banner("HI", "tiny").split("\n").join("|") === "█ █ ▀█▀|█▀█  █|▀ ▀ ▀▀▀" && banner("I", "small").split("\n")[0] === "██████";
    var sh = banner("I", "shadow").split("\n"); ok = ok && sh.length === 8 && sh[0] === "██████" && sh[1] === "  ██░░░░" && sh[7] === "  ░░░░░░";
    ok = ok && banner("A\nB", "block").split("\n").length === 15 && banner("  \n ", "block") === "" && textGrid("~", F57).join("") === glyph(F57, "?").join("");
    return ok;
  };
})();
