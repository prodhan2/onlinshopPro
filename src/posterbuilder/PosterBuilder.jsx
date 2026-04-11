import { useEffect, useRef, useState } from 'react';
import './posterBuilder.css';

const BEEIMG_API_KEY = '58c9ff18b1cf549b8fa5b946d5860f27';
const HISTORY_KEY = 'beeimg_poster_history_v1';
const DRAFT_KEY = 'poster_builder_draft_v2';
const FRAME_IMAGE_URL = 'https://i.postimg.cc/Y9sPdRjS/post.png';

function readHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistoryEntry(entry) {
  const prev = readHistory();
  const next = [entry, ...prev].slice(0, 50);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
}

export default function PosterBuilder({ onBack, initialHistoryOpen = false }) {
  const rootRef = useRef(null);
  const [cloudHistory, setCloudHistory] = useState(() => readHistory());
  const [historyOpen, setHistoryOpen] = useState(initialHistoryOpen);
  const [cloudStatus, setCloudStatus] = useState('');
  const [draftStatus, setDraftStatus] = useState('');

  useEffect(() => {
    setHistoryOpen(initialHistoryOpen);
  }, [initialHistoryOpen]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const q = (id) => root.querySelector(`#${id}`);
    const elements = {
      canvas: q('poster'),
      ctx: null,
      cropCanvas: q('cropCanvas'),
      cropCtx: null,
      uploader: q('uploader'),
      textInput: q('textInput'),
      sourceInput: q('sourceInput'),
      addTextBtn: q('addText'),
      sourceColor: q('sourceColor'),
      sourceFont: q('sourceFont'),
      sourceShadow: q('sourceShadow'),
      sourceZoomIn: q('sourceZoomIn'),
      sourceZoomOut: q('sourceZoomOut'),
      zoomInBtn: q('zoomIn'),
      zoomOutBtn: q('zoomOut'),
      zoomLabel: q('zoomPercent'),
      downloadBtn: q('download'),
      saveCloudBtn: q('saveCloud'),
      saveDraftBtn: q('saveDraftBtn'),
      clearDraftBtn: q('clearDraftBtn'),
      undoBtn: q('undoBtn'),
      redoBtn: q('redoBtn'),
      layerUpBtn: q('layerUp'),
      layerDownBtn: q('layerDown'),
      layerList: q('layerList'),
      itemSelect: q('itemSelect'),
      textIcons: q('textIcons'),
      imageIcons: q('imageIcons'),
      cropOverlay: q('cropOverlay'),
      editBtn: q('editBtn'),
      delBtn: q('delBtn'),
      closeText: q('closeText'),
      closeImage: q('closeImage'),
      selectedBadge: q('selectedBadge'),
      selectedColor: q('selectedColor'),
      selectedFont: q('selectedFont'),
      textShadow: q('textShadow'),
      textZoomIn: q('textZoomIn'),
      textZoomOut: q('textZoomOut'),
      imgZoomIn: q('imgZoomIn'),
      imgZoomOut: q('imgZoomOut'),
      freeCropBtn: q('freeCropBtn'),
      moveTextBtn: q('moveTextBtn'),
      moveImgBtn: q('moveImgBtn'),
      duplicateBtn: q('duplicateBtn')
    };

    if (!elements.canvas) return;

    const state = {
      images: [],
      texts: [],
      previewText: null,
      selected: null,
      selectedType: null,
      selectedImgIndex: -1,
      currentDate: '',
      sourceObj: { text: '', color: '#ffffff', font: 'sans-serif', shadow: true, scale: 1 },
      defaultFont: 'sans-serif',
      defaultHeadlineColor: '#ffffff',
      showHandles: false,
      transformMode: null,
      currentObj: null,
      isCurrentText: false,
      dragStartX: 0,
      dragStartY: 0,
      startObjX: 0,
      startObjY: 0,
      startScale: 1,
      startRadial: 0,
      prevAngle: 0,
      lastClickTime: 0,
      lastClickPos: { x: 0, y: 0 },
      DOUBLE_CLICK_THRESHOLD: 300,
      DOUBLE_CLICK_DISTANCE: 10,
      pinchTarget: '',
      pinchStartDist: 0,
      pinchStartScale: 1,
      pinchCenter: { x: 0, y: 0 },
      imgOffsetFromCenter: { x: 0, y: 0 },
      textPinchStartDist: 0,
      textPinchStartScale: 1,
      selectedImgPinchStartDist: 0,
      selectedImgPinchStartScale: 1,
      cropping: false,
      cropPoints: [],
      currentCropImg: null,
      needsRedraw: false,
      redrawTimeout: null,
      draftTimer: null,
      textBounds: [],
      lastDrawTime: 0,
      framePadding: 40,
      usableWidth: 0,
      baseFontPx: 48,
      baseLineH: 60,
      MIN_REDRAW_INTERVAL: 16,
      handleRadius: 8,
      rotOffset: 40,
      activePointerId: null,
      transformDirty: false,
      undoStack: [],
      redoStack: [],
      MAX_HISTORY: 60,
      textIdSeq: 1,
      imageIdSeq: 1,
      isMobile:
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent,
        ),
    };

    state.MIN_REDRAW_INTERVAL = state.isMobile ? 33 : 16;

    const frame = new Image();
    frame.src = FRAME_IMAGE_URL;
    frame.crossOrigin = 'anonymous';
    let frameBitmap = null;

    elements.ctx = elements.canvas.getContext('2d', { willReadFrequently: true, alpha: false });
    elements.cropCtx = elements.cropCanvas.getContext('2d');

    const controller = new AbortController();
    const on = (target, event, handler, options = {}) => {
      target?.addEventListener(event, handler, {
        ...options,
        signal: controller.signal,
      });
    };

    const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
    const deviceToCanvas = (px, py) => {
      const r = elements.canvas.getBoundingClientRect();
      return {
        x: (px - r.left) * (elements.canvas.width / r.width),
        y: (py - r.top) * (elements.canvas.height / r.height),
      };
    };

    const getTouchCanvasPos = (t) => deviceToCanvas(t.clientX, t.clientY);

    const getUnscaledDims = (obj, isText) => {
      if (isText) {
        const dims = getWrappedTextDimensions(obj);
        const s = obj.scale;
        return { width: dims.width / s, height: dims.height / s };
      }
      return { width: obj.img.width, height: obj.img.height };
    };

    const isPointInObject = (p, obj, isText) => {
      if (obj?.hidden) return false;
      if (isText) {
        const index = state.texts.indexOf(obj);
        if (index === -1) return false;
        const bound = state.textBounds[index];
        if (!bound) return false;
        return p.x > bound.x && p.x < bound.x + bound.width && p.y > bound.y && p.y < bound.y + bound.height;
      }

      const s = obj.scale;
      const th = obj.rotation;
      const cos = Math.cos(th);
      const sin = Math.sin(th);
      const dx = p.x - obj.x;
      const dy = p.y - obj.y;
      const itx = cos * dx + sin * dy;
      const ity = -sin * dx + cos * dy;
      const localX = itx / s;
      const localY = ity / s;
      const unscaled = getUnscaledDims(obj, false);
      const halfUnW = unscaled.width / 2;
      const halfUnH = unscaled.height / 2;
      return Math.abs(localX) <= halfUnW && Math.abs(localY) <= halfUnH;
    };

    const resizeImage = (img, maxWidth, maxHeight, quality = 0.8) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      return canvas.toDataURL('image/jpeg', quality);
    };

    const scheduleRedraw = () => {
      const now = performance.now();
      if (now - state.lastDrawTime < state.MIN_REDRAW_INTERVAL) return;
      state.needsRedraw = true;
      if (state.redrawTimeout) return;

      state.redrawTimeout = requestAnimationFrame(() => {
        if (state.needsRedraw) {
          draw();
          state.needsRedraw = false;
          state.lastDrawTime = performance.now();
        }
        state.redrawTimeout = null;
      });

      clearTimeout(state.draftTimer);
      state.draftTimer = window.setTimeout(() => {
        try {
          saveDraftNow();
        } catch {
          setDraftStatus('Draft save failed.');
        }
      }, 700);
    };

    const updateSelectedControls = () => {
      if (state.selected && state.selectedType === 'text') {
        elements.selectedColor.value = state.selected.color;
        elements.selectedFont.value = state.selected.font;
        elements.textShadow.checked = state.selected.shadow !== false;
      }
    };

    const updateItemSelectOptions = () => {
      elements.itemSelect.innerHTML = '<option value="">কোন আইটেম সিলেক্ট করুন</option>';
      state.texts.forEach((t, i) => {
        const opt = document.createElement('option');
        opt.value = `text-${i}`;
        opt.textContent = `টেক্সট: ${t.text.substring(0, 20)}${t.text.length > 20 ? '...' : ''}`;
        elements.itemSelect.appendChild(opt);
      });
      state.images.forEach((img, i) => {
        const opt = document.createElement('option');
        opt.value = `image-${i}`;
        opt.textContent = `ইমেজ ${i + 1}`;
        elements.itemSelect.appendChild(opt);
      });

      let selectedValue = '';
      if (state.selectedType === 'text' && state.selected) {
        const idx = state.texts.indexOf(state.selected);
        if (idx >= 0) selectedValue = `text-${idx}`;
      }
      if (state.selectedType === 'image' && state.selectedImgIndex >= 0) {
        selectedValue = `image-${state.selectedImgIndex}`;
      }
      elements.itemSelect.value = selectedValue;
    };

    const updateSelectionDisplay = () => {
      let badgeText = 'Selected';
      if (state.showHandles) badgeText = 'Free Transform';
      else if (state.selectedType === 'text' && state.selected) badgeText = 'Text Selected';
      else if (state.selectedType === 'image') badgeText = 'Image Selected';

      elements.selectedBadge.textContent = badgeText;
      elements.selectedBadge.style.display = state.selectedType ? 'block' : 'none';

      if (state.selectedType === 'text' && state.selected) {
        elements.textIcons.style.display = 'flex';
        elements.imageIcons.style.display = 'none';
        const rect = elements.canvas.getBoundingClientRect();
        const left = (state.selected.x * rect.width) / elements.canvas.width;
        const top = (state.selected.y * rect.height) / elements.canvas.height;
        elements.textIcons.style.left = `${left}px`;
        elements.textIcons.style.top = `${top}px`;
        updateSelectedControls();
      } else if (state.selectedType === 'image') {
        elements.imageIcons.style.display = 'flex';
        elements.textIcons.style.display = 'none';
        if (state.selectedImgIndex !== -1) {
          const imgObj = state.images[state.selectedImgIndex];
          const rect = elements.canvas.getBoundingClientRect();
          const left = (imgObj.x * rect.width) / elements.canvas.width;
          const top = (imgObj.y * rect.height) / elements.canvas.height - 20;
          elements.imageIcons.style.left = `${left}px`;
          elements.imageIcons.style.top = `${top}px`;
        } else {
          elements.imageIcons.style.left = '50%';
          elements.imageIcons.style.top = '20px';
        }
      } else {
        elements.textIcons.style.display = 'none';
        elements.imageIcons.style.display = 'none';
      }
    };

    const getSelectedIds = () => {
      if (state.selectedType === 'text' && state.selected) {
        return { selectedTextId: state.selected.id ?? null, selectedImageId: null };
      }
      if (state.selectedType === 'image' && state.selectedImgIndex >= 0) {
        return {
          selectedTextId: null,
          selectedImageId: state.images[state.selectedImgIndex]?.id ?? null,
        };
      }
      return { selectedTextId: null, selectedImageId: null };
    };

    const serializeDraft = () => {
      const { selectedTextId, selectedImageId } = getSelectedIds();
      return {
        version: 2,
        images: state.images
          .filter((img) => img?.source)
          .map((img) => ({
            id: img.id,
            source: img.source,
            x: img.x,
            y: img.y,
            scale: img.scale,
            rotation: img.rotation,
            hidden: Boolean(img.hidden),
            locked: Boolean(img.locked),
          })),
        texts: state.texts.map((t) => ({ ...t })),
        sourceObj: { ...state.sourceObj },
        selectedType: state.selectedType,
        selectedTextId,
        selectedImageId,
        showHandles: state.showHandles,
        currentDate: state.currentDate,
        textIdSeq: state.textIdSeq,
        imageIdSeq: state.imageIdSeq,
        savedAt: Date.now(),
      };
    };

    const saveDraftNow = () => {
      const payload = serializeDraft();
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
      setDraftStatus('Draft saved locally.');
    };

    const loadImageFromSource = (source) =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('image load failed'));
        img.src = source;
      });

    const restoreDraft = async (payload) => {
      if (!payload || !Array.isArray(payload.texts) || !Array.isArray(payload.images)) return false;

      const restoredImages = [];
      for (const item of payload.images) {
        if (!item?.source) continue;
        try {
          const img = await loadImageFromSource(item.source);
          restoredImages.push({
            id: item.id,
            source: item.source,
            img,
            x: item.x,
            y: item.y,
            scale: item.scale,
            rotation: item.rotation,
            hidden: Boolean(item.hidden),
            locked: Boolean(item.locked),
          });
        } catch {
          // Ignore a broken image and continue restoring remaining layers.
        }
      }

      state.images = restoredImages;
      state.texts = payload.texts.map((t) => ({
        hidden: false,
        locked: false,
        ...t,
      }));
      state.sourceObj = {
        text: '',
        color: '#ffffff',
        font: state.defaultFont,
        shadow: true,
        scale: 1,
        ...payload.sourceObj,
      };
      state.showHandles = Boolean(payload.showHandles);
      state.currentDate = payload.currentDate || state.currentDate;
      state.textIdSeq = Number(payload.textIdSeq) > 0 ? Number(payload.textIdSeq) : state.textIdSeq;
      state.imageIdSeq = Number(payload.imageIdSeq) > 0 ? Number(payload.imageIdSeq) : state.imageIdSeq;

      syncSelectedReferences(payload.selectedType, payload.selectedTextId, payload.selectedImageId);

      elements.sourceInput.value = state.sourceObj.text || '';
      elements.sourceColor.value = state.sourceObj.color || '#ffffff';
      if (state.sourceObj.font) elements.sourceFont.value = state.sourceObj.font;
      elements.sourceShadow.checked = state.sourceObj.shadow !== false;
      refreshSelectionAndList();
      setDraftStatus('Draft restored successfully.');
      return true;
    };

    const ensureLayerIds = () => {
      state.texts.forEach((t) => {
        if (t.id == null) {
          t.id = state.textIdSeq;
          state.textIdSeq += 1;
        }
      });
      state.images.forEach((img) => {
        if (img.id == null) {
          img.id = state.imageIdSeq;
          state.imageIdSeq += 1;
        }
      });
    };

    const snapshotState = () => {
      ensureLayerIds();
      const { selectedTextId, selectedImageId } = getSelectedIds();
      return {
        images: state.images.map((img) => ({ ...img })),
        texts: state.texts.map((text) => ({ ...text })),
        sourceObj: { ...state.sourceObj },
        selectedType: state.selectedType,
        selectedTextId,
        selectedImageId,
        showHandles: state.showHandles,
      };
    };

    const syncSelectedReferences = (selectedType, selectedTextId, selectedImageId) => {
      state.selectedType = selectedType;
      state.selected = null;
      state.selectedImgIndex = -1;
      if (selectedType === 'text' && selectedTextId != null) {
        state.selected = state.texts.find((t) => t.id === selectedTextId) || null;
        if (!state.selected) state.selectedType = null;
      }
      if (selectedType === 'image' && selectedImageId != null) {
        const idx = state.images.findIndex((img) => img.id === selectedImageId);
        if (idx >= 0) {
          state.selectedImgIndex = idx;
        } else {
          state.selectedType = null;
        }
      }
    };

    const renderLayerList = () => {
      if (!elements.layerList) return;
      const html = [];

      for (let i = state.texts.length - 1; i >= 0; i -= 1) {
        const t = state.texts[i];
        const selected = state.selectedType === 'text' && state.selected?.id === t.id;
        const title = (t.text || 'Text').substring(0, 28);
        html.push(
          `<li class="layer-item ${selected ? 'layer-item--active' : ''}" data-type="text" data-index="${i}">` +
            `<button class="layer-main" data-action="select" data-type="text" data-index="${i}">T: ${title}</button>` +
            `<button class="layer-mini" data-action="toggle-visibility" data-type="text" data-index="${i}" title="Show/Hide">${t.hidden ? 'Show' : 'Hide'}</button>` +
            `<button class="layer-mini" data-action="toggle-lock" data-type="text" data-index="${i}" title="Lock/Unlock">${t.locked ? 'Unlock' : 'Lock'}</button>` +
          `</li>`,
        );
      }

      for (let i = state.images.length - 1; i >= 0; i -= 1) {
        const img = state.images[i];
        const selected = state.selectedType === 'image' && state.images[state.selectedImgIndex]?.id === img.id;
        html.push(
          `<li class="layer-item ${selected ? 'layer-item--active' : ''}" data-type="image" data-index="${i}">` +
            `<button class="layer-main" data-action="select" data-type="image" data-index="${i}">IMG ${i + 1}</button>` +
            `<button class="layer-mini" data-action="toggle-visibility" data-type="image" data-index="${i}" title="Show/Hide">${img.hidden ? 'Show' : 'Hide'}</button>` +
            `<button class="layer-mini" data-action="toggle-lock" data-type="image" data-index="${i}" title="Lock/Unlock">${img.locked ? 'Unlock' : 'Lock'}</button>` +
          `</li>`,
        );
      }

      elements.layerList.innerHTML = html.join('');
    };

    const restoreSnapshot = (snap) => {
      if (!snap) return;
      state.images = snap.images.map((img) => ({ ...img }));
      state.texts = snap.texts.map((text) => ({ ...text }));
      state.sourceObj = { ...snap.sourceObj };
      state.showHandles = snap.showHandles;

      syncSelectedReferences(snap.selectedType, snap.selectedTextId, snap.selectedImageId);

      elements.sourceInput.value = state.sourceObj.text || '';
      elements.sourceColor.value = state.sourceObj.color || '#ffffff';
      if (state.sourceObj.font) elements.sourceFont.value = state.sourceObj.font;
      elements.sourceShadow.checked = state.sourceObj.shadow !== false;

      refreshSelectionAndList();
    };

    const pushHistory = () => {
      state.undoStack.push(snapshotState());
      if (state.undoStack.length > state.MAX_HISTORY) state.undoStack.shift();
      state.redoStack = [];
    };

    const undo = () => {
      if (!state.undoStack.length) return;
      const prev = state.undoStack.pop();
      state.redoStack.push(snapshotState());
      restoreSnapshot(prev);
    };

    const redo = () => {
      if (!state.redoStack.length) return;
      const next = state.redoStack.pop();
      state.undoStack.push(snapshotState());
      restoreSnapshot(next);
    };

    const refreshSelectionAndList = () => {
      ensureLayerIds();
      updateTextBounds();
      updateItemSelectOptions();
      updateSelectionDisplay();
      renderLayerList();
      scheduleRedraw();
    };

    const moveSelectedLayer = (direction) => {
      if (state.selectedType === 'text' && state.selected) {
        const from = state.texts.indexOf(state.selected);
        if (from < 0) return;
        const to = direction === 'up' ? from + 1 : from - 1;
        if (to < 0 || to >= state.texts.length) return;
        [state.texts[from], state.texts[to]] = [state.texts[to], state.texts[from]];
        refreshSelectionAndList();
        return;
      }

      if (state.selectedType === 'image' && state.selectedImgIndex >= 0) {
        const from = state.selectedImgIndex;
        const to = direction === 'up' ? from + 1 : from - 1;
        if (to < 0 || to >= state.images.length) return;
        [state.images[from], state.images[to]] = [state.images[to], state.images[from]];
        state.selectedImgIndex = to;
        refreshSelectionAndList();
      }
    };

    const toggleLayerFlag = (type, index, flag) => {
      const list = type === 'text' ? state.texts : state.images;
      const obj = list[index];
      if (!obj) return;
      pushHistory();
      obj[flag] = !obj[flag];
      if (obj.hidden) {
        if (type === 'text' && state.selected?.id === obj.id) {
          state.selected = null;
          state.selectedType = null;
          state.showHandles = false;
        }
        if (type === 'image' && state.images[state.selectedImgIndex]?.id === obj.id) {
          state.selectedImgIndex = -1;
          state.selectedType = null;
          state.showHandles = false;
        }
      }
      refreshSelectionAndList();
    };

    async function loadFonts() {
      const cacheKey = 'fontList';
      const cached = localStorage.getItem(cacheKey);
      const now = Date.now();
      const cacheExpiry = 24 * 60 * 60 * 1000;
      let data;

      if (cached) {
        const { timestamp, files } = JSON.parse(cached);
        if (now - timestamp < cacheExpiry) {
          data = { files };
        }
      }

      if (!data) {
        try {
          const response = await fetch(
            'https://raw.githubusercontent.com/prodhan2/beautifulDinajpurFrames/main/font/file_list.json',
          );
          data = await response.json();
          localStorage.setItem(cacheKey, JSON.stringify({ timestamp: now, files: data.files }));
        } catch {
          data = { files: [] };
        }
      }

      const files = data.files || [];
      if (files.length === 0) return;

      const oldDynamicStyle = document.getElementById('dynamic-fonts');
      if (oldDynamicStyle) oldDynamicStyle.remove();

      const style = document.createElement('style');
      style.id = 'dynamic-fonts';
      let css = '';
      files.forEach((filename) => {
        const fontFamily =
          filename.replace(/\.TTF$/i, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'unknown';
        const url = `https://raw.githubusercontent.com/prodhan2/beautifulDinajpurFrames/main/font/${filename}`;
        css += `@font-face { font-family: '${fontFamily}'; src: url('${url}') format('truetype'); font-weight: normal; font-style: normal; font-display: swap; }`;
      });
      style.textContent = css;
      document.head.appendChild(style);

      const options = ['<option value="sans-serif">Sans-serif</option>'];
      files.forEach((filename) => {
        const fontFamily =
          filename.replace(/\.TTF$/i, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'unknown';
        const displayName = filename.replace(/\.TTF$/i, '');
        options.push(`<option value="${fontFamily}">${displayName}</option>`);
      });

      const optHtml = options.join('');
      elements.selectedFont.innerHTML = optHtml;
      elements.sourceFont.innerHTML = optHtml;

      if (files.length > 0) {
        state.defaultFont =
          files[0].replace(/\.TTF$/i, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'sans-serif';
        elements.selectedFont.value = state.defaultFont;
        elements.sourceFont.value = state.defaultFont;
        state.sourceObj.font = state.defaultFont;
      }
    }

    const getBengaliDate = () => {
      const now = new Date();
      const day = now.getDate();
      const month = now.getMonth();
      const year = now.getFullYear();
      const bengaliMonths = [
        'জানুয়ারি',
        'ফেব্রুয়ারি',
        'মার্চ',
        'এপ্রিল',
        'মে',
        'জুন',
        'জুলাই',
        'আগস্ট',
        'সেপ্টেম্বর',
        'অক্টোবর',
        'নভেম্বর',
        'ডিসেম্বর',
      ];

      const toBengaliDigits = (number) => {
        const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
        return number.toString().replace(/\d/g, (digit) => bengaliDigits[parseInt(digit, 10)]);
      };

      return `${toBengaliDigits(day)} ${bengaliMonths[month]} ${toBengaliDigits(year)}`;
    };

    let cropStart = { x: 0, y: 0 };

    const startCrop = (e) => {
      const p = deviceToCanvas(e.clientX, e.clientY);
      cropStart = p;
      state.cropPoints.push(p);
      drawCrop(e);
    };

    const drawCrop = (e) => {
      if (!state.cropping) return;
      const last = state.cropPoints[state.cropPoints.length - 1] || cropStart;
      const p = e ? deviceToCanvas(e.clientX, e.clientY) : last;
      elements.cropCtx.clearRect(0, 0, elements.cropCanvas.width, elements.cropCanvas.height);
      elements.cropCtx.drawImage(elements.canvas, 0, 0);

      if (state.cropPoints.length > 0) {
        elements.cropCtx.beginPath();
        elements.cropCtx.moveTo(state.cropPoints[0].x, state.cropPoints[0].y);
        state.cropPoints.forEach((pt) => elements.cropCtx.lineTo(pt.x, pt.y));
        elements.cropCtx.lineTo(p.x, p.y);
        elements.cropCtx.strokeStyle = 'red';
        elements.cropCtx.lineWidth = 2;
        elements.cropCtx.stroke();
      }
    };

    const endCrop = (e) => {
      const finalP = deviceToCanvas(e.clientX, e.clientY);
      state.cropPoints.push(finalP);
      if (state.cropPoints.length < 3) {
        state.cropPoints.pop();
        return;
      }

      const obj = state.currentCropImg;
      const s = obj.scale;
      const th = obj.rotation;
      const cos = Math.cos(th);
      const sin = Math.sin(th);
      const w = obj.img.width;
      const h = obj.img.height;

      const polyPoints = state.cropPoints.map((p) => {
        const dx = p.x - obj.x;
        const dy = p.y - obj.y;
        const itx = cos * dx + sin * dy;
        const ity = -sin * dx + cos * dy;
        const localX = itx / s;
        const localY = ity / s;
        return { x: localX + w / 2, y: localY + h / 2 };
      });

      const minX = Math.min(...polyPoints.map((pt) => pt.x));
      const maxX = Math.max(...polyPoints.map((pt) => pt.x));
      const minY = Math.min(...polyPoints.map((pt) => pt.y));
      const maxY = Math.max(...polyPoints.map((pt) => pt.y));
      const bboxW = maxX - minX;
      const bboxH = maxY - minY;

      if (bboxW <= 0 || bboxH <= 0) {
        state.cropPoints = [];
        state.cropping = false;
        elements.cropOverlay.style.display = 'none';
        return;
      }

      const newCanvas = document.createElement('canvas');
      newCanvas.width = bboxW;
      newCanvas.height = bboxH;
      const newCtx = newCanvas.getContext('2d');
      newCtx.translate(-minX, -minY);
      newCtx.save();
      newCtx.beginPath();
      newCtx.moveTo(polyPoints[0].x, polyPoints[0].y);
      for (let i = 1; i < polyPoints.length; i += 1) {
        newCtx.lineTo(polyPoints[i].x, polyPoints[i].y);
      }
      newCtx.closePath();
      newCtx.clip();
      newCtx.drawImage(obj.img, 0, 0);
      newCtx.restore();

      const croppedDataURL = newCanvas.toDataURL('image/png');
      const newImg = new Image();
      newImg.onload = () => {
        obj.img = newImg;
        obj.source = croppedDataURL;
        obj.x += bboxW * s * 0.5 - w * s * 0.5;
        obj.y += bboxH * s * 0.5 - h * s * 0.5;
        obj.scale = s * Math.min(bboxW / w, bboxH / h);
        scheduleRedraw();
      };
      newImg.src = croppedDataURL;

      state.cropping = false;
      elements.cropOverlay.style.display = 'none';
      state.cropPoints = [];
    };

    const getWrappedTextDimensions = (tb) => {
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.font = `700 ${state.baseFontPx}px "${tb.font}"`;
      const maxLocal = state.usableWidth / tb.scale;
      const words = tb.text.split(' ');
      let line = '';
      const lines = [];
      let maxLocalWidth = 0;

      for (let i = 0; i < words.length; i += 1) {
        const test = `${line}${words[i]} `;
        if (tempCtx.measureText(test).width > maxLocal && i > 0) {
          if (line.trim().length) {
            const w = tempCtx.measureText(line).width;
            maxLocalWidth = Math.max(maxLocalWidth, w);
            lines.push(line);
            line = `${words[i]} `;
          } else {
            let piece = '';
            for (const ch of `${words[i]} `) {
              if (tempCtx.measureText(piece + ch).width > maxLocal) {
                const w = tempCtx.measureText(piece).width;
                maxLocalWidth = Math.max(maxLocalWidth, w);
                lines.push(piece);
                piece = ch;
              } else {
                piece += ch;
              }
            }
            const w = tempCtx.measureText(piece).width;
            maxLocalWidth = Math.max(maxLocalWidth, w);
            lines.push(piece);
            line = '';
          }
        } else {
          line = test;
        }
      }

      if (line.trim().length) {
        const w = tempCtx.measureText(line).width;
        maxLocalWidth = Math.max(maxLocalWidth, w);
        lines.push(line);
      }

      return {
        width: maxLocalWidth * tb.scale,
        height: lines.length * state.baseLineH * tb.scale,
      };
    };

    const updateTextBounds = () => {
      state.textBounds = [];
      state.texts.forEach((tb, index) => {
        const dims = getWrappedTextDimensions(tb);
        state.textBounds.push({
          index,
          x: tb.x - dims.width / 2,
          y: tb.y - dims.height / 2,
          width: dims.width,
          height: dims.height,
        });
      });
    };

    const wrapTextScaled = (ctx, text, x, y, maxWidthWorld, lineHeightWorld, scale) => {
      const maxLocal = maxWidthWorld / scale;
      const lhLocal = lineHeightWorld / scale;
      const oldBaseline = ctx.textBaseline;
      ctx.textBaseline = 'top';

      const words = text.split(' ');
      let line = '';
      let cursorY = y;
      const drawLine = (str) => {
        ctx.fillText(str, x, cursorY);
        cursorY += lhLocal;
      };

      for (let i = 0; i < words.length; i += 1) {
        const test = `${line}${words[i]} `;
        if (ctx.measureText(test).width > maxLocal && i > 0) {
          if (line.trim().length) {
            drawLine(line);
            line = `${words[i]} `;
          } else {
            let piece = '';
            for (const ch of `${words[i]} `) {
              if (ctx.measureText(piece + ch).width > maxLocal) {
                drawLine(piece);
                piece = ch;
              } else {
                piece += ch;
              }
            }
            line = '';
          }
        } else {
          line = test;
        }
      }

      if (line.trim().length) drawLine(line);
      ctx.textBaseline = oldBaseline;
    };

    const draw = () => {
      elements.ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);

      state.images.forEach((imgObj) => {
        if (imgObj.hidden) return;
        elements.ctx.save();
        elements.ctx.translate(imgObj.x, imgObj.y);
        elements.ctx.rotate(imgObj.rotation);
        elements.ctx.scale(imgObj.scale, imgObj.scale);
        elements.ctx.drawImage(imgObj.img, -imgObj.img.width / 2, -imgObj.img.height / 2);
        elements.ctx.restore();
      });

      elements.ctx.drawImage(frameBitmap || frame, 0, 0, elements.canvas.width, elements.canvas.height);
      const textShadowBlur = state.isMobile ? 2 : 4;
      const sourceShadowBlur = state.isMobile ? 3 : 6;

      if (state.currentDate) {
        elements.ctx.save();
        elements.ctx.textAlign = 'left';
        elements.ctx.textBaseline = 'top';
        elements.ctx.fillStyle = '#ffffff';
        const dateFontSize = state.isMobile ? 20 : 24;
        elements.ctx.font = `bold ${dateFontSize}px "${state.defaultFont}"`;
        elements.ctx.shadowColor = 'rgba(0,0,0,.65)';
        elements.ctx.shadowBlur = textShadowBlur;
        elements.ctx.fillText(state.currentDate, 14, 14);
        elements.ctx.restore();
      }

      if (state.sourceObj.text) {
        elements.ctx.save();
        elements.ctx.textAlign = 'right';
        elements.ctx.textBaseline = 'bottom';
        elements.ctx.fillStyle = state.sourceObj.color;
        elements.ctx.font = `bold ${35 * state.sourceObj.scale}px "${state.sourceObj.font}"`;
        if (state.sourceObj.shadow !== false) {
          elements.ctx.shadowColor = 'rgba(0,0,0,.65)';
          elements.ctx.shadowBlur = sourceShadowBlur;
        } else {
          elements.ctx.shadowColor = 'transparent';
          elements.ctx.shadowBlur = 0;
        }
        elements.ctx.fillText(
          `সোর্স: ${state.sourceObj.text}`,
          elements.canvas.width - 30,
          elements.canvas.height - 110,
        );
        elements.ctx.restore();
      }

      state.texts.forEach((tb) => {
        if (tb.hidden) return;
        elements.ctx.save();
        elements.ctx.translate(tb.x, tb.y);
        elements.ctx.rotate(tb.rotation);
        elements.ctx.scale(tb.scale, tb.scale);
        elements.ctx.textAlign = 'center';
        elements.ctx.fillStyle = tb.color;
        if (tb.shadow !== false) {
          elements.ctx.shadowColor = 'rgba(0,0,0,.65)';
          elements.ctx.shadowBlur = textShadowBlur;
        } else {
          elements.ctx.shadowColor = 'transparent';
          elements.ctx.shadowBlur = 0;
        }
        elements.ctx.font = `700 ${state.baseFontPx}px "${tb.font}"`;
        wrapTextScaled(elements.ctx, tb.text, 0, 0, state.usableWidth, state.baseLineH, tb.scale);
        elements.ctx.restore();
      });

      if (state.previewText) {
        elements.ctx.save();
        elements.ctx.globalAlpha = 0.7;
        elements.ctx.translate(state.previewText.x, state.previewText.y);
        elements.ctx.rotate(state.previewText.rotation);
        elements.ctx.scale(state.previewText.scale, state.previewText.scale);
        elements.ctx.textAlign = 'center';
        elements.ctx.fillStyle = state.previewText.color;
        if (state.previewText.shadow !== false) {
          elements.ctx.shadowColor = 'rgba(0,0,0,.65)';
          elements.ctx.shadowBlur = textShadowBlur;
        } else {
          elements.ctx.shadowColor = 'transparent';
          elements.ctx.shadowBlur = 0;
        }
        elements.ctx.font = `700 ${state.baseFontPx}px "${state.previewText.font}"`;
        wrapTextScaled(
          elements.ctx,
          state.previewText.text,
          0,
          0,
          state.usableWidth,
          state.baseLineH,
          state.previewText.scale,
        );
        elements.ctx.restore();
      }

      if (state.selectedType) {
        let obj;
        let halfWW;
        let halfWH;

        if (state.selectedType === 'text') {
          obj = state.selected;
          const dims = getWrappedTextDimensions(obj);
          halfWW = dims.width / 2;
          halfWH = dims.height / 2;
        } else {
          obj = state.images[state.selectedImgIndex];
          const iw = obj.img.width;
          const ih = obj.img.height;
          halfWW = (iw * obj.scale) / 2;
          halfWH = (ih * obj.scale) / 2;
        }

        elements.ctx.save();
        elements.ctx.translate(obj.x, obj.y);
        elements.ctx.rotate(obj.rotation);
        elements.ctx.strokeStyle = 'rgba(110,168,254,0.6)';
        elements.ctx.lineWidth = 2;
        elements.ctx.strokeRect(-halfWW, -halfWH, 2 * halfWW, 2 * halfWH);

        if (state.showHandles) {
          elements.ctx.fillStyle = 'rgba(110,168,254,0.9)';
          const hR = 6;
          const corners = [
            [-halfWW, -halfWH],
            [halfWW, -halfWH],
            [halfWW, halfWH],
            [-halfWW, halfWH],
          ];
          corners.forEach(([cx, cy]) => {
            elements.ctx.beginPath();
            elements.ctx.arc(cx, cy, hR, 0, 2 * Math.PI);
            elements.ctx.fill();
          });

          const rotX = 0;
          const rotY = -halfWH - state.rotOffset;
          elements.ctx.strokeStyle = 'rgba(110,168,254,0.6)';
          elements.ctx.lineWidth = 1;
          elements.ctx.beginPath();
          elements.ctx.moveTo(0, -halfWH);
          elements.ctx.lineTo(rotX, rotY);
          elements.ctx.stroke();
          elements.ctx.fillStyle = 'rgba(110,168,254,0.9)';
          elements.ctx.beginPath();
          elements.ctx.arc(rotX, rotY, hR, 0, 2 * Math.PI);
          elements.ctx.fill();
        }
        elements.ctx.restore();
      }

    };

    const handleDoubleClick = (p) => {
      let hitText = false;
      let hitImage = false;

      for (let i = state.texts.length - 1; i >= 0; i -= 1) {
        if (state.texts[i].hidden) continue;
        const bound = state.textBounds[i];
        if (
          bound &&
          p.x > bound.x &&
          p.x < bound.x + bound.width &&
          p.y > bound.y &&
          p.y < bound.y + bound.height
        ) {
          state.selected = state.texts[i];
          state.selectedType = 'text';
          state.selectedImgIndex = -1;
          state.showHandles = true;
          state.transformMode = null;
          hitText = true;
          updateSelectionDisplay();

          const t = window.prompt('Edit text:', state.selected.text);
          if (t !== null) {
            state.selected.text = t;
            updateTextBounds();
          }
          updateSelectionDisplay();
          scheduleRedraw();
          break;
        }
      }

      if (!hitText) {
        for (let i = state.images.length - 1; i >= 0; i -= 1) {
          if (state.images[i].hidden) continue;
          if (isPointInObject(p, state.images[i], false)) {
            state.selectedImgIndex = i;
            state.selectedType = 'image';
            state.selected = null;
            state.showHandles = true;
            state.transformMode = null;
            hitImage = true;
            updateSelectionDisplay();
            scheduleRedraw();
            break;
          }
        }
      }

      if (!hitText && !hitImage) {
        state.selected = null;
        state.selectedType = null;
        state.selectedImgIndex = -1;
        state.showHandles = false;
        state.transformMode = null;
        updateSelectionDisplay();
        scheduleRedraw();
      }
    };

    const handleSingleClick = (p) => {
      let hitSomething = false;

      if (state.showHandles && state.selectedType) {
        const isText = state.selectedType === 'text';
        const obj = isText ? state.selected : state.images[state.selectedImgIndex];
        if (obj?.locked) {
          state.transformMode = null;
          state.currentObj = null;
          state.isCurrentText = false;
          updateSelectionDisplay();
          scheduleRedraw();
          return;
        }
        const s = obj.scale;
        const th = obj.rotation;
        const cos = Math.cos(th);
        const sin = Math.sin(th);
        const dx = p.x - obj.x;
        const dy = p.y - obj.y;
        const itx = cos * dx + sin * dy;
        const ity = -sin * dx + cos * dy;
        const localX = itx / s;
        const localY = ity / s;
        const unscaled = getUnscaledDims(obj, isText);
        const halfUnW = unscaled.width / 2;
        const halfUnH = unscaled.height / 2;
        const localHR = state.handleRadius / s;
        const localOffset = state.rotOffset / s;
        const lrx = 0;
        const lry = -halfUnH - localOffset;
        const distRot = Math.hypot(localX - lrx, localY - lry);

        if (distRot < localHR) {
          state.transformMode = 'rotate';
          state.prevAngle = Math.atan2(localY, localX);
          state.currentObj = obj;
          state.isCurrentText = isText;
          hitSomething = true;
        } else {
          const corners = [
            { lx: -halfUnW, ly: -halfUnH },
            { lx: halfUnW, ly: -halfUnH },
            { lx: halfUnW, ly: halfUnH },
            { lx: -halfUnW, ly: halfUnH },
          ];

          for (const corner of corners) {
            const d = Math.hypot(localX - corner.lx, localY - corner.ly);
            if (d < localHR) {
              state.transformMode = 'scale';
              state.startScale = obj.scale;
              state.startRadial = Math.hypot(localX, localY);
              state.currentObj = obj;
              state.isCurrentText = isText;
              hitSomething = true;
              break;
            }
          }
        }

        if (!hitSomething) {
          if (Math.abs(localX) < halfUnW && Math.abs(localY) < halfUnH) {
            state.transformMode = 'move';
            state.dragStartX = p.x;
            state.dragStartY = p.y;
            state.startObjX = obj.x;
            state.startObjY = obj.y;
            state.currentObj = obj;
            state.isCurrentText = isText;
            hitSomething = true;
          }
        }
      }

      if (!hitSomething) {
        state.selected = null;
        state.selectedType = null;
        state.selectedImgIndex = -1;
        state.showHandles = false;
        state.transformMode = null;
        state.currentObj = null;

        for (let i = state.texts.length - 1; i >= 0; i -= 1) {
          if (state.texts[i].hidden) continue;
          const bound = state.textBounds[i];
          if (
            bound &&
            p.x > bound.x &&
            p.x < bound.x + bound.width &&
            p.y > bound.y &&
            p.y < bound.y + bound.height
          ) {
            state.selected = state.texts[i];
            state.selectedType = 'text';
            state.selectedImgIndex = -1;
            state.transformMode = 'move';
            state.dragStartX = p.x;
            state.dragStartY = p.y;
            state.startObjX = state.selected.x;
            state.startObjY = state.selected.y;
            state.currentObj = state.selected;
            state.isCurrentText = true;
            state.showHandles = true;
            hitSomething = true;
            break;
          }
        }

        if (!hitSomething) {
          for (let i = state.images.length - 1; i >= 0; i -= 1) {
            if (state.images[i].hidden) continue;
            if (isPointInObject(p, state.images[i], false)) {
              state.selectedImgIndex = i;
              state.selectedType = 'image';
              state.selected = null;
              state.transformMode = 'move';
              state.dragStartX = p.x;
              state.dragStartY = p.y;
              state.startObjX = state.images[i].x;
              state.startObjY = state.images[i].y;
              state.currentObj = state.images[i];
              state.isCurrentText = false;
              state.showHandles = false;
              hitSomething = true;
              break;
            }
          }
        }
      }

      if (hitSomething) updateSelectionDisplay();
      updateItemSelectOptions();
      scheduleRedraw();
    };

    const handleSaveCloud = async () => {
      if (!elements.canvas) return;
      setCloudStatus('Uploading to BeeImg...');

      try {
        const blob = await new Promise((resolve) => {
          elements.canvas.toBlob(resolve, 'image/png', 0.92);
        });

        if (!blob) throw new Error('Could not generate image blob from canvas');

        const formData = new FormData();
        formData.append('file', blob, `poster-${Date.now()}.png`);
        formData.append('apikey', BEEIMG_API_KEY);

        const response = await fetch('https://beeimg.com/api/upload/file/json/', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        const files = data?.files;
        if (!files?.url) {
          const statusMessage = files?.status || 'Upload failed';
          throw new Error(statusMessage);
        }

        const entry = {
          id: files.name || `upload-${Date.now()}`,
          url: files.url,
          thumbnail_url: files.thumbnail_url || files.url,
          view_url: files.view_url || files.url,
          delete_url: files.delete_url || '',
          delete_key: files.delete_key || '',
          status: files.status || 'Success',
          createdAt: new Date().toISOString(),
        };

        const nextHistory = saveHistoryEntry(entry);
        setCloudHistory(nextHistory);
        setCloudStatus('Uploaded successfully. Added to history.');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown upload error';
        setCloudStatus(`Upload failed: ${message}`);
      }
    };

    on(elements.canvas, 'pointerdown', (e) => {
      if (state.activePointerId !== null) return;
      const p = deviceToCanvas(e.clientX, e.clientY);
      const now = Date.now();
      const timeDiff = now - state.lastClickTime;
      const distDiff = Math.hypot(p.x - state.lastClickPos.x, p.y - state.lastClickPos.y);
      const isDoubleTap =
        timeDiff < state.DOUBLE_CLICK_THRESHOLD && distDiff < state.DOUBLE_CLICK_DISTANCE;

      state.activePointerId = e.pointerId;
      elements.canvas.setPointerCapture(e.pointerId);

      if (isDoubleTap) {
        handleDoubleClick(p);
        state.lastClickTime = 0;
      } else {
        handleSingleClick(p);
        state.lastClickTime = now;
        state.lastClickPos = p;
      }
      state.transformDirty = false;
      e.preventDefault();
    });

    on(elements.canvas, 'pointermove', (e) => {
      if (state.activePointerId !== e.pointerId) return;
      if (!state.transformMode || !state.currentObj) return;
      if (state.currentObj.locked) return;
      if (!state.transformDirty) {
        pushHistory();
        state.transformDirty = true;
      }
      const isText = state.isCurrentText;
      const currentP = deviceToCanvas(e.clientX, e.clientY);
      const s = state.currentObj.scale;
      const th = state.currentObj.rotation;
      const cos = Math.cos(th);
      const sin = Math.sin(th);
      const dx = currentP.x - state.currentObj.x;
      const dy = currentP.y - state.currentObj.y;
      const itx = cos * dx + sin * dy;
      const ity = -sin * dx + cos * dy;
      const localX = itx / s;
      const localY = ity / s;

      if (state.transformMode === 'move') {
        const delX = currentP.x - state.dragStartX;
        const delY = currentP.y - state.dragStartY;
        state.currentObj.x = state.startObjX + delX;
        state.currentObj.y = state.startObjY + delY;
      } else if (state.transformMode === 'scale') {
        const currentRadial = Math.hypot(localX, localY);
        let newScale = state.startScale * (currentRadial / state.startRadial);
        newScale = clamp(newScale, 0.1, 8);
        state.currentObj.scale = newScale;
        if (isText) updateTextBounds();
      } else if (state.transformMode === 'rotate') {
        const currentAngle = Math.atan2(localY, localX);
        const delta = currentAngle - state.prevAngle;
        state.currentObj.rotation += delta;
        state.prevAngle = currentAngle;
      }
      updateSelectionDisplay();
      scheduleRedraw();
    });

    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => {
      on(elements.canvas, ev, (e) => {
        if (state.activePointerId !== e.pointerId) return;
        if (elements.canvas.hasPointerCapture(e.pointerId)) {
          elements.canvas.releasePointerCapture(e.pointerId);
        }
        state.activePointerId = null;
        state.transformMode = null;
        state.transformDirty = false;
        state.currentObj = null;
        state.isCurrentText = false;
        updateSelectionDisplay();
        scheduleRedraw();
      });
    });

    on(
      elements.canvas,
      'touchstart',
      (e) => {
        if (e.touches.length === 1) return;
        if (e.touches.length === 2) {
          e.preventDefault();
          const p1 = getTouchCanvasPos(e.touches[0]);
          const p2 = getTouchCanvasPos(e.touches[1]);
          const cx = (p1.x + p2.x) / 2;
          const cy = (p1.y + p2.y) / 2;

          state.pinchTarget = 'background';
          for (let i = state.texts.length - 1; i >= 0; i -= 1) {
            if (state.texts[i].hidden) continue;
            const bound = state.textBounds[i];
            if (
              bound &&
              cx > bound.x &&
              cx < bound.x + bound.width &&
              cy > bound.y &&
              cy < bound.y + bound.height
            ) {
              state.pinchTarget = 'text';
              state.selected = state.texts[i];
              state.selectedType = 'text';
              break;
            }
          }

          if (state.pinchTarget === 'background') {
            for (let i = state.images.length - 1; i >= 0; i -= 1) {
              if (state.images[i].hidden) continue;
              if (isPointInObject({ x: cx, y: cy }, state.images[i], false)) {
                state.pinchTarget = 'selectedImg';
                state.selectedImgIndex = i;
                state.selectedType = 'image';
                break;
              }
            }
          }

          state.pinchStartDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          if (state.pinchTarget === 'text') {
            state.textPinchStartScale = state.selected.scale;
            state.textPinchStartDist = state.pinchStartDist;
          } else if (state.pinchTarget === 'selectedImg') {
            state.selectedImgPinchStartScale = state.images[state.selectedImgIndex].scale;
            state.selectedImgPinchStartDist = state.pinchStartDist;
          } else {
            state.pinchStartScale = 1;
            state.pinchCenter = { x: cx, y: cy };
            state.imgOffsetFromCenter = { x: 0, y: 0 };
          }

          updateSelectionDisplay();
          updateItemSelectOptions();
          scheduleRedraw();
        }
      },
      { passive: false },
    );

    on(
      elements.canvas,
      'touchmove',
      (e) => {
        if (e.touches.length !== 2) return;
        e.preventDefault();
        const p1 = getTouchCanvasPos(e.touches[0]);
        const p2 = getTouchCanvasPos(e.touches[1]);
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);

        if (state.pinchTarget === 'text' && state.selectedType === 'text' && state.selected) {
          const factor = dist / state.textPinchStartDist;
          state.selected.scale = clamp(state.textPinchStartScale * factor, 0.1, 8);
          updateTextBounds();
          scheduleRedraw();
        } else if (
          state.pinchTarget === 'selectedImg' &&
          state.selectedType === 'image' &&
          state.selectedImgIndex >= 0
        ) {
          const factor = dist / state.selectedImgPinchStartDist;
          state.images[state.selectedImgIndex].scale = clamp(
            state.selectedImgPinchStartScale * factor,
            0.1,
            8,
          );
          scheduleRedraw();
        }
      },
      { passive: false },
    );

    on(elements.closeText, 'click', () => {
      state.selected = null;
      state.selectedType = null;
      state.showHandles = false;
      state.transformMode = null;
      updateSelectionDisplay();
      scheduleRedraw();
    });

    on(elements.closeImage, 'click', () => {
      state.selectedImgIndex = -1;
      state.selectedType = null;
      state.showHandles = false;
      state.transformMode = null;
      updateSelectionDisplay();
      scheduleRedraw();
    });

    on(elements.moveTextBtn, 'click', () => {
      if (state.selectedType === 'text' && state.selected) {
        state.showHandles = !state.showHandles;
        updateSelectionDisplay();
        scheduleRedraw();
      }
    });

    on(elements.moveImgBtn, 'click', () => {
      if (state.selectedType === 'image' && state.selectedImgIndex >= 0) {
        state.showHandles = !state.showHandles;
        updateSelectionDisplay();
        scheduleRedraw();
      }
    });

    on(elements.duplicateBtn, 'click', () => {
      if (!state.selected || state.selectedType !== 'text') return;
      pushHistory();
      const duplicate = { ...state.selected, x: state.selected.x + 50, y: state.selected.y + 20 };
      duplicate.id = state.textIdSeq;
      state.textIdSeq += 1;
      state.texts.push(duplicate);
      updateTextBounds();
      updateItemSelectOptions();
      updateSelectionDisplay();
      scheduleRedraw();
    });

    on(elements.itemSelect, 'change', (e) => {
      const value = e.target.value;
      state.showHandles = false;
      state.transformMode = null;
      if (!value) {
        state.selected = null;
        state.selectedImgIndex = -1;
        state.selectedType = null;
        updateSelectionDisplay();
        scheduleRedraw();
        return;
      }

      const [type, indexRaw] = value.split('-');
      const index = parseInt(indexRaw, 10);
      if (type === 'text') {
        state.selected = state.texts[index];
        state.selectedType = 'text';
        state.selectedImgIndex = -1;
        state.showHandles = true;
      } else if (type === 'image') {
        state.selectedImgIndex = index;
        state.selectedType = 'image';
        state.selected = null;
      }
      updateSelectionDisplay();
      updateItemSelectOptions();
      scheduleRedraw();
    });

    on(elements.selectedColor, 'input', () => {
      if (state.selected && state.selectedType === 'text') {
        state.selected.color = elements.selectedColor.value;
        scheduleRedraw();
      }
    });

    on(elements.selectedFont, 'change', () => {
      if (state.selected && state.selectedType === 'text') {
        state.selected.font = elements.selectedFont.value;
        scheduleRedraw();
      }
    });

    on(elements.textShadow, 'change', () => {
      if (state.selected && state.selectedType === 'text') {
        state.selected.shadow = elements.textShadow.checked;
        scheduleRedraw();
      }
    });

    on(elements.textZoomIn, 'click', () => {
      if (state.selected && state.selectedType === 'text') {
        pushHistory();
        state.selected.scale = clamp(state.selected.scale * 1.1, 0.1, 8);
        if (state.showHandles) updateTextBounds();
        scheduleRedraw();
      }
    });

    on(elements.textZoomOut, 'click', () => {
      if (state.selected && state.selectedType === 'text') {
        pushHistory();
        state.selected.scale = clamp(state.selected.scale / 1.1, 0.1, 8);
        if (state.showHandles) updateTextBounds();
        scheduleRedraw();
      }
    });

    on(elements.imgZoomIn, 'click', () => {
      if (state.selectedType === 'image' && state.selectedImgIndex >= 0) {
        pushHistory();
        state.images[state.selectedImgIndex].scale = clamp(
          state.images[state.selectedImgIndex].scale * 1.1,
          0.1,
          8,
        );
        scheduleRedraw();
      }
    });

    on(elements.imgZoomOut, 'click', () => {
      if (state.selectedType === 'image' && state.selectedImgIndex >= 0) {
        pushHistory();
        state.images[state.selectedImgIndex].scale = clamp(
          state.images[state.selectedImgIndex].scale / 1.1,
          0.1,
          8,
        );
        scheduleRedraw();
      }
    });

    on(elements.freeCropBtn, 'click', () => {
      if (state.selectedType === 'image' && state.selectedImgIndex >= 0) {
        pushHistory();
        state.currentCropImg = state.images[state.selectedImgIndex];
        state.cropping = true;
        elements.cropOverlay.style.display = 'block';
        elements.cropCanvas.width = elements.canvas.width;
        elements.cropCanvas.height = elements.canvas.height;
        elements.cropCtx.drawImage(elements.canvas, 0, 0);
        state.cropPoints = [];
        drawCrop();
      }
    });

    on(elements.cropOverlay, 'pointerdown', startCrop);
    on(elements.cropOverlay, 'pointermove', drawCrop);
    on(elements.cropOverlay, 'pointerup', endCrop);

    on(elements.cropOverlay, 'click', () => {
      if (!state.cropping) {
        state.cropping = false;
        elements.cropOverlay.style.display = 'none';
      }
    });

    let inputTimeout;
    on(elements.textInput, 'input', () => {
      clearTimeout(inputTimeout);
      inputTimeout = window.setTimeout(() => {
        const val = elements.textInput.value;
        if (val.trim()) {
          if (!state.previewText) {
            state.previewText = {
              text: '',
              x: elements.canvas.width / 2,
              y: elements.canvas.height / 2,
              scale: 1.5,
              rotation: 0,
              color: state.defaultHeadlineColor,
              font: state.defaultFont,
              shadow: true,
            };
          }
          state.previewText.text = val;
        } else {
          state.previewText = null;
        }
        scheduleRedraw();
      }, 150);
    });

    let sourceTextInputTimeout;
    on(elements.sourceInput, 'input', () => {
      clearTimeout(sourceTextInputTimeout);
      sourceTextInputTimeout = window.setTimeout(() => {
        state.sourceObj.text = elements.sourceInput.value.trim();
        scheduleRedraw();
      }, 150);
    });

    on(elements.sourceColor, 'input', () => {
      state.sourceObj.color = elements.sourceColor.value;
      scheduleRedraw();
    });

    on(elements.sourceFont, 'change', () => {
      state.sourceObj.font = elements.sourceFont.value;
      scheduleRedraw();
    });

    on(elements.sourceShadow, 'change', () => {
      state.sourceObj.shadow = elements.sourceShadow.checked;
      scheduleRedraw();
    });

    on(elements.sourceZoomIn, 'click', () => {
      pushHistory();
      state.sourceObj.scale = clamp(state.sourceObj.scale * 1.1, 0.1, 3);
      scheduleRedraw();
    });

    on(elements.sourceZoomOut, 'click', () => {
      pushHistory();
      state.sourceObj.scale = clamp(state.sourceObj.scale / 1.1, 0.1, 3);
      scheduleRedraw();
    });

    on(elements.zoomInBtn, 'click', () => {
      if (state.selectedType === 'text' && state.selected) {
        pushHistory();
        state.selected.scale = clamp(state.selected.scale * 1.1, 0.1, 8);
        updateTextBounds();
      } else if (state.selectedType === 'image' && state.selectedImgIndex >= 0) {
        pushHistory();
        state.images[state.selectedImgIndex].scale = clamp(
          state.images[state.selectedImgIndex].scale * 1.1,
          0.1,
          8,
        );
      }
      scheduleRedraw();
    });

    on(elements.zoomOutBtn, 'click', () => {
      if (state.selectedType === 'text' && state.selected) {
        pushHistory();
        state.selected.scale = clamp(state.selected.scale / 1.1, 0.1, 8);
        updateTextBounds();
      } else if (state.selectedType === 'image' && state.selectedImgIndex >= 0) {
        pushHistory();
        state.images[state.selectedImgIndex].scale = clamp(
          state.images[state.selectedImgIndex].scale / 1.1,
          0.1,
          8,
        );
      }
      scheduleRedraw();
    });

    on(elements.editBtn, 'click', () => {
      if (!state.selected || state.selectedType !== 'text') return;
      const t = window.prompt('Edit text:', state.selected.text);
      if (t !== null) {
        pushHistory();
        state.selected.text = t;
        updateTextBounds();
        scheduleRedraw();
      }
    });

    on(elements.delBtn, 'click', () => {
      if (!state.selected || state.selectedType !== 'text') return;
      if (window.confirm('Are you sure you want to delete this text?')) {
        pushHistory();
        state.texts = state.texts.filter((tb) => tb !== state.selected);
        state.selected = null;
        state.selectedType = null;
        state.showHandles = false;
        updateTextBounds();
        updateItemSelectOptions();
        updateSelectionDisplay();
        scheduleRedraw();
      }
    });

    on(elements.layerUpBtn, 'click', () => {
      pushHistory();
      moveSelectedLayer('up');
    });

    on(elements.layerDownBtn, 'click', () => {
      pushHistory();
      moveSelectedLayer('down');
    });

    on(elements.undoBtn, 'click', () => undo());
    on(elements.redoBtn, 'click', () => redo());

    on(elements.layerList, 'click', (e) => {
      const trigger = e.target.closest('[data-action]');
      if (!trigger) return;
      const action = trigger.dataset.action;
      const type = trigger.dataset.type;
      const index = Number(trigger.dataset.index);
      if (Number.isNaN(index) || (type !== 'text' && type !== 'image')) return;

      if (action === 'select') {
        if (type === 'text') {
          state.selected = state.texts[index] || null;
          state.selectedType = state.selected ? 'text' : null;
          state.selectedImgIndex = -1;
          state.showHandles = Boolean(state.selected);
        } else {
          state.selectedImgIndex = index;
          state.selectedType = state.images[index] ? 'image' : null;
          state.selected = null;
          state.showHandles = false;
        }
        refreshSelectionAndList();
        return;
      }

      if (action === 'toggle-visibility') {
        toggleLayerFlag(type, index, 'hidden');
        return;
      }

      if (action === 'toggle-lock') {
        toggleLayerFlag(type, index, 'locked');
      }
    });

    on(window, 'keydown', (e) => {
      const key = e.key.toLowerCase();
      const meta = e.ctrlKey || e.metaKey;
      if (!meta) return;
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    });

    on(elements.downloadBtn, 'click', () => {
      const a = document.createElement('a');
      a.download = 'poster.png';
      a.href = elements.canvas.toDataURL('image/png', 0.9);
      a.click();
    });

    on(elements.saveCloudBtn, 'click', handleSaveCloud);
    on(elements.saveDraftBtn, 'click', () => {
      saveDraftNow();
    });
    on(elements.clearDraftBtn, 'click', () => {
      localStorage.removeItem(DRAFT_KEY);
      setDraftStatus('Saved draft cleared.');
    });

    on(elements.uploader, 'change', (e) => {
      const files = Array.from(e.target.files || []);
      files.forEach((file) => {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = new Image();
          img.onload = () => {
            const quality = state.isMobile ? 0.6 : 0.8;
            const resizedSrc = resizeImage(img, elements.canvas.width, elements.canvas.height, quality);
            const resizedImg = new Image();
            resizedImg.onload = () => {
              const scale = Math.min(
                (elements.canvas.width / resizedImg.width) * 0.8,
                (elements.canvas.height / resizedImg.height) * 0.8,
              );

              const pushImage = (finalImg) => {
                pushHistory();
                state.images.push({
                  id: state.imageIdSeq,
                  source: resizedSrc,
                  img: finalImg,
                  x: Math.random() * elements.canvas.width,
                  y: Math.random() * elements.canvas.height,
                  scale,
                  rotation: 0,
                  hidden: false,
                  locked: false,
                  croppedData: null,
                });
                state.imageIdSeq += 1;
                state.selectedImgIndex = state.images.length - 1;
                state.selectedType = 'image';
                state.showHandles = false;
                updateItemSelectOptions();
                updateSelectionDisplay();
                renderLayerList();
                scheduleRedraw();
              };

              if ('createImageBitmap' in window) {
                createImageBitmap(resizedImg)
                  .then((bitmap) => {
                    pushImage(bitmap);
                  })
                  .catch(() => {
                    pushImage(resizedImg);
                  });
              } else {
                pushImage(resizedImg);
              }
            };
            resizedImg.src = resizedSrc;
          };
          img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      });
      elements.uploader.value = '';
    });

    on(elements.addTextBtn, 'click', () => {
      const val = elements.textInput.value.trim();
      if (!val) return;

      const newText = {
        id: state.textIdSeq,
        text: val,
        x: elements.canvas.width / 2,
        y: elements.canvas.height / 2,
        scale: 1.5,
        rotation: 0,
        color: state.defaultHeadlineColor,
        font: state.defaultFont,
        hidden: false,
        locked: false,
        shadow: true,
      };
      state.textIdSeq += 1;

      pushHistory();
      state.texts.push(newText);
      state.previewText = null;
      elements.textInput.value = '';
      state.selected = newText;
      state.selectedType = 'text';
      state.showHandles = true;
      updateItemSelectOptions();
      updateSelectionDisplay();
      updateTextBounds();
      renderLayerList();
      scheduleRedraw();
    });

    loadFonts();

    frame.onload = () => {
      elements.canvas.width = frame.width;
      elements.canvas.height = frame.height;
      state.usableWidth = elements.canvas.width - state.framePadding * 2;
      state.currentDate = getBengaliDate();

      if ('createImageBitmap' in window) {
        createImageBitmap(frame)
          .then((bm) => {
            frameBitmap = bm;
            scheduleRedraw();

            const rawDraft = localStorage.getItem(DRAFT_KEY);
            if (rawDraft) {
              try {
                const payload = JSON.parse(rawDraft);
                restoreDraft(payload).catch(() => {
                  setDraftStatus('Draft found but restore failed.');
                });
              } catch {
                setDraftStatus('Draft data is invalid.');
              }
            }
          })
          .catch(() => {
            scheduleRedraw();
          });
      } else {
        scheduleRedraw();

        const rawDraft = localStorage.getItem(DRAFT_KEY);
        if (rawDraft) {
          try {
            const payload = JSON.parse(rawDraft);
            restoreDraft(payload).catch(() => {
              setDraftStatus('Draft found but restore failed.');
            });
          } catch {
            setDraftStatus('Draft data is invalid.');
          }
        }
      }
    };

    frame.onerror = () => {
      elements.canvas.width = 1080;
      elements.canvas.height = 1350;
      state.usableWidth = elements.canvas.width - state.framePadding * 2;
      state.currentDate = getBengaliDate();
      scheduleRedraw();
      setCloudStatus('Frame image failed to load. Using blank canvas fallback.');
    };

    return () => {
      controller.abort();
      clearTimeout(state.draftTimer);
      if (state.redrawTimeout) cancelAnimationFrame(state.redrawTimeout);
    };
  }, []);

  return (
    <div className="poster-page" ref={rootRef}>
      {typeof onBack === 'function' ? (
        <button type="button" className="poster-back-btn editor-btn" onClick={() => window.history.back()}>
          Back To App
        </button>
      ) : null}
      <div id="app">
        <div id="canvas-wrap">
          <canvas id="poster" />
          <div id="selectedBadge">Selected</div>
          <div id="textIcons">
            <button id="moveTextBtn" title="Free Transform">↔️</button>
            <button id="duplicateBtn" title="Duplicate Text">📋</button>
            <button id="editBtn" title="Edit text">✏️</button>
            <input type="color" id="selectedColor" title="Change color" />
            <select id="selectedFont" title="Change font" />
            <input type="checkbox" id="textShadow" title="Toggle shadow" defaultChecked />
            <button id="textZoomOut" title="Text Zoom Out">-</button>
            <button id="textZoomIn" title="Text Zoom In">+</button>
            <button id="closeText" title="Close Selection">✕</button>
            <button id="delBtn" title="Delete text">🗑️</button>
          </div>
          <div id="imageIcons">
            <button id="moveImgBtn" title="Free Transform">↔️</button>
            <button id="imgZoomOut" title="Image Zoom Out">-</button>
            <button id="imgZoomIn" title="Image Zoom In">+</button>
            <button id="freeCropBtn" title="Freehand Crop">✂️</button>
            <button id="closeImage" title="Close Selection">✕</button>
          </div>
          <div id="cropOverlay">
            <canvas id="cropCanvas" />
          </div>
        </div>

        <div id="controls">
          <div className="row">
            <input type="file" id="uploader" accept="image/*" multiple />
            <select id="itemSelect" defaultValue="">
              <option value="">কোন আইটেম সিলেক্ট করুন</option>
            </select>
          </div>

          <div className="headline-row">
            <input type="text" id="textInput" placeholder="টেক্সট লিখুন (headline / caption)" />
            <button id="addText" className="primary editor-btn editor-btn--primary">+ Add Text</button>
          </div>

          <input type="text" id="sourceInput" placeholder="তথ্যসূত্র লিখুন (উৎস)" />

          <div id="sourceGroup">
            <input type="color" id="sourceColor" defaultValue="#ffffff" />
            <select id="sourceFont">
              <option value="sans-serif">Loading fonts...</option>
            </select>
            <label>
              <input type="checkbox" id="sourceShadow" defaultChecked /> শ্যাডো
            </label>
            <button id="sourceZoomOut" className="small-btn editor-btn" title="Source Zoom Out">-
            </button>
            <button id="sourceZoomIn" className="small-btn editor-btn" title="Source Zoom In">+
            </button>
          </div>
        </div>

        <div id="bottom-controls">
          <div className="group">
            <button id="undoBtn" className="btn editor-btn" title="Undo">Undo</button>
            <button id="redoBtn" className="btn editor-btn" title="Redo">Redo</button>
            <button id="zoomOut" className="btn editor-btn" title="Zoom Out">-</button>
            <button id="zoomIn" className="btn editor-btn" title="Zoom In">+</button>
            <button id="layerDown" className="btn editor-btn" title="Send Backward">Layer -</button>
            <button id="layerUp" className="btn editor-btn" title="Bring Forward">Layer +</button>
          </div>
          <div id="zoomPercent">Image Zoom: 100%</div>
          <button id="saveDraftBtn" className="btn editor-btn" title="Save Draft">Save Draft</button>
          <button id="clearDraftBtn" className="btn editor-btn" title="Clear Draft">Clear Draft</button>
          <button id="download" className="btn primary editor-btn editor-btn--primary">Download</button>
          <button id="saveCloud" className="btn cloud editor-btn editor-btn--success">Save Cloud</button>
          <button
            type="button"
            className="btn editor-btn"
            onClick={() => {
              setCloudHistory(readHistory());
              setHistoryOpen((v) => !v);
            }}
          >
            View History
          </button>
        </div>

        {cloudStatus ? <div className="cloud-status">{cloudStatus}</div> : null}
  {draftStatus ? <div className="draft-status">{draftStatus}</div> : null}

        <div className="layer-panel">
          <div className="layer-panel__title">Layers</div>
          <ul id="layerList" className="layer-list" />
        </div>

        {historyOpen ? (
          <div className="history-panel">
            <h3>Cloud History</h3>
            {cloudHistory.length === 0 ? <p>No cloud uploads yet.</p> : null}
            <ul>
              {cloudHistory.map((item) => (
                <li key={`${item.id}-${item.createdAt}`}>
                  <img src={item.thumbnail_url} alt={item.id} loading="lazy" />
                  <div className="history-meta">
                    <a href={item.view_url || item.url} target="_blank" rel="noreferrer">
                      Open
                    </a>
                    <a href={item.url} target="_blank" rel="noreferrer">
                      Image
                    </a>
                    <span>{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
