const ITEMS = [
  "Roteador Frente",
  "Roteador Verso",
  "ONU Frente",
  "ONU Verso",
  "Print comodato",
  "Bucha/Parafuso",
  "Print ONU",
  "Print Roteador TR069",
  "Print Roteador PPPoE",
  "Print Roteador Wi-Fi",
  "Sinal PowerMeeter",
  "Print Roteador 8.8.8.8",
  "Print Velocidade",
  "Equipamento + Etiqueta",
  "Avaliação Frente",
  "Avaliação Verso",
  "Print Estoque batido",
];

const PRINT_PREFIX = "Print";

// Token do bot usado pelo APK. O HTML do PhotoList é embutido no APK, então
// o site precisa iniciar já com um token válido e não depende de query string,
// localStorage nem de redirecionamento para WhatsApp.
const STATIC_TELEGRAM_BOT_TOKEN = "8004975031:AAGtmwvTRJ_ISezPrEraToNSwBHmBuRndVs";

const URL_TOKENS = {
  bot: STATIC_TELEGRAM_BOT_TOKEN,
};

// Chat de destino padrão no Telegram, usado quando o envio acontece
// diretamente do navegador (modo estático, sem relay). Mantido igual ao
// valor padrão de TELEGRAM_CHAT_ID em server.js.
const STATIC_TELEGRAM_CHAT_ID = "-1003514090940";

function getDeviceIdentity() {
  const identity = window.__photoListDeviceIdentity;
  if (!identity) return null;
  const fruit = String(identity.fruit || '').trim();
  const shortId = String(identity.shortId || '').trim();
  const label = String(identity.label || '').trim();
  if (!fruit && !shortId && !label) return null;
  return { fruit, shortId, label };
}

function getTelegramDeviceHeader() {
  const identity = getDeviceIdentity();
  if (!identity) return 'Dispositivo: ID não identificado';
  if (identity.label) return `Dispositivo: ${identity.label}`;
  if (identity.fruit) return `Dispositivo: ${identity.fruit}`;
  return `Dispositivo: ID ${identity.shortId || 'não identificado'}`;
}

function withTelegramDeviceIdentity(text) {
  return `${getTelegramDeviceHeader()}\n${String(text || '')}`;
}

const state = {
  stream: null,
  facingMode: "environment",
  location: null,
  selectedIndex: 0,
  photos: new Map(),
  lastLocationAt: 0,
  manualChecks: new Set(),
  pendingCapture: null,
  cameraExpanded: false,
};

const camera = document.getElementById("camera");
const canvas = document.getElementById("overlayCanvas");
const ctx = canvas.getContext("2d");
const checklistEl = document.getElementById("checklist");
const progressPill = document.getElementById("progressPill");
const downloadBtn = document.getElementById("downloadBtn");
const downloadCount = document.getElementById("downloadCount");
const copyTextBtn = document.getElementById("copyTextBtn");
const finalizeBtn = document.getElementById("finalizeBtn");
const finalizeStatus = document.getElementById("finalizeStatus");
const captureBtn = document.getElementById("captureBtn");
const startCameraBtn = document.getElementById("startCameraBtn");
const switchCameraBtn = document.getElementById("switchCameraBtn");
const resetBtn = document.getElementById("resetBtn");
const refreshLocationBtn = document.getElementById("refreshLocationBtn");
const cameraPlaceholder = document.getElementById("cameraPlaceholder");
const cameraHint = document.getElementById("cameraHint");
const locationStatus = document.getElementById("locationStatus");
const locationDetails = document.getElementById("locationDetails");
const locationDot = document.getElementById("locationDot");
const hudItem = document.getElementById("hudItem");
const hudTime = document.getElementById("hudTime");
const cameraLiveLocation = document.getElementById("cameraLiveLocation");
const cameraExpandBtn = document.getElementById("cameraExpandBtn");
const cameraPanel = document.querySelector(".camera-panel");
const cameraPreview = document.getElementById("cameraPreview");
const cameraPreviewImage = document.getElementById("cameraPreviewImage");
const cancelCaptureBtn = document.getElementById("cancelCaptureBtn");
const saveCaptureBtn = document.getElementById("saveCaptureBtn");
const galleryInput = document.getElementById("galleryInput");
const dialog = document.getElementById("messageDialog");
const dialogTitle = document.getElementById("dialogTitle");
const dialogMessage = document.getElementById("dialogMessage");
const dialogTrace = document.getElementById("dialogTrace");
const dialogCopyBtn = document.getElementById("dialogCopyBtn");
const dialogCloseBtn = document.getElementById("dialogCloseBtn");
let currentDiagnostic = "";
const PHOTO_DB_STORE = "photos";
const PHOTO_DB_KEY_PREFIX = "photo-";
const DRAFT_DB_STORE = "drafts";
const DRAFT_DB_KEY = "draft-001";
const MESSAGE_INPUT_IDS = [
  "serviceCode",
  "signalCto",
  "signalOnu",
  "speedDownload",
  "speedUpload",
  "equipmentLocation",
  "technician1",
  "technician2",
];


function photoDbAvailable() {
  return Boolean(window.PhotoListDB);
}

function getMessageInputs() {
  return Object.fromEntries(
    MESSAGE_INPUT_IDS.map((id) => [id, document.getElementById(id)?.value ?? ""])
  );
}

function getCurrentServiceMessage() {
  const render = window.PHOTO_LIST_RENDER_SERVICE_PREVIEW;
  if (typeof render === "function") return render();
  return document.getElementById("messagePreview")?.textContent || "";
}

function saveMessageDraft() {
  if (!photoDbAvailable()) return Promise.resolve();
  const message = getCurrentServiceMessage();
  return PhotoListDB.set(DRAFT_DB_STORE, DRAFT_DB_KEY, {
    fields: getMessageInputs(),
    message,
    updatedAt: Date.now(),
  }).catch((error) => {
    console.warn("Falha ao salvar rascunho no IndexedDB.", error);
  });
}

function restoreMessageDraft() {
  if (!photoDbAvailable()) return Promise.resolve();
  return PhotoListDB.get(DRAFT_DB_STORE, DRAFT_DB_KEY).then((draft) => {
    if (!draft?.fields) return;
    MESSAGE_INPUT_IDS.forEach((id) => {
      const input = document.getElementById(id);
      const value = draft.fields[id];
      if (input && typeof value === "string") input.value = value;
    });
    getCurrentServiceMessage();
  }).catch((error) => {
    console.warn("Falha ao restaurar o rascunho do IndexedDB.", error);
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("Falha ao recuperar a foto do cache."));
    reader.readAsDataURL(blob);
  });
}

async function persistPhoto(index, photo) {
  if (!photoDbAvailable()) return;
  const blob = dataUrlToBlob(photo.dataUrl);
  await PhotoListDB.set(PHOTO_DB_STORE, `${PHOTO_DB_KEY_PREFIX}${index}`, {
    index,
    label: photo.label,
    date: photo.date instanceof Date ? photo.date : new Date(photo.date),
    blob,
    location: photo.location ? { ...photo.location } : null,
    source: photo.source,
    originalName: photo.originalName || "",
    updatedAt: Date.now(),
  });
}

async function restorePhotos() {
  if (!photoDbAvailable()) return;
  const entries = await PhotoListDB.getAllEntries(PHOTO_DB_STORE);
  entries
    .sort((a, b) => Number(a.value?.index ?? 0) - Number(b.value?.index ?? 0))
    .forEach((entry) => {
      const value = entry.value;
      if (!value || !Number.isInteger(value.index) || !value.blob) return;
      state.photos.set(value.index, {
        label: value.label || ITEMS[value.index] || "",
        date: value.date instanceof Date ? value.date : new Date(value.date || Date.now()),
        dataUrl: null,
        location: value.location || null,
        source: value.source || "cache",
        originalName: value.originalName || "",
        blob: value.blob,
      });
    });

  await Promise.all(
    Array.from(state.photos.values()).map(async (photo) => {
      if (photo.dataUrl || !photo.blob) return;
      photo.dataUrl = await blobToDataUrl(photo.blob);
      delete photo.blob;
    })
  );

  const next = ITEMS.findIndex((_, index) => !isItemCompleted(index));
  state.selectedIndex = next >= 0 ? next : 0;
}

function getManualChecksStorageKey() {
  return "photo-list-manual-checks";
}

function restoreManualChecks() {
  try {
    const raw = window.localStorage.getItem(getManualChecksStorageKey());
    const values = raw ? JSON.parse(raw) : [];
    if (Array.isArray(values)) state.manualChecks = new Set(values.filter((value) => Number.isInteger(value)));
  } catch {
    state.manualChecks = new Set();
  }
}

function persistManualChecks() {
  try {
    window.localStorage.setItem(getManualChecksStorageKey(), JSON.stringify([...state.manualChecks].sort((a, b) => a - b)));
  } catch (error) {
    console.warn("Falha ao salvar marcações manuais no cache local.", error);
  }
}

function isItemCompleted(index) {
  return state.photos.has(index) || state.manualChecks.has(index);
}

function toggleManualCheck(index) {
  if (state.photos.has(index)) return;
  const wasChecked = state.manualChecks.has(index);
  if (wasChecked) {
    state.manualChecks.delete(index);
  } else {
    state.manualChecks.add(index);
    void notifyLocationAction(getManualCheckNotificationText(ITEMS[index]), "manual-check-location");
  }
  persistManualChecks();
  renderChecklist();
}

async function clearPhotoCache() {
  if (!photoDbAvailable()) return;
  try {
    await PhotoListDB.clear(PHOTO_DB_STORE);
  } catch (error) {
    console.warn("Falha ao limpar fotos persistidas.", error);
  }
}

async function persistPhotoAndContinue(index, photo) {
  state.photos.set(index, photo);
  if (state.manualChecks.delete(index)) persistManualChecks();
  try {
    await persistPhoto(index, photo);
  } catch (error) {
    console.warn("Falha ao persistir foto no IndexedDB.", error);
    showToast(`Foto de "${photo.label}" ficou apenas na memória nesta sessão.`, "error");
  }
}

function wireMessagePersistence() {
  MESSAGE_INPUT_IDS.forEach((id) => {
    const input = document.getElementById(id);
    input?.addEventListener("input", () => { void saveMessageDraft(); });
    input?.addEventListener("change", () => { void saveMessageDraft(); });
  });
}

let copyTextLocked = false;

function lockCopyTextButton() {
  copyTextLocked = true;
  copyTextBtn.disabled = true;
  copyTextBtn.classList.add("copied");
  copyTextBtn.textContent = "Copiado!";
  window.clearTimeout(lockCopyTextButton.timer);
  lockCopyTextButton.timer = window.setTimeout(() => {
    copyTextLocked = false;
    copyTextBtn.disabled = false;
    copyTextBtn.classList.remove("copied");
    copyTextBtn.textContent = "Copiar Texto";
  }, 5000);
}

function getGoogleMapsLocationUrl(location = state.location) {
  if (!location) return "";
  const query = String(location.address || `${location.latitude},${location.longitude}`).trim();
  if (!query) return "";
  return `${query} \n\n https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.latitude)},${encodeURIComponent(location.longitude)} \n\n @${encodeURIComponent(location.latitude)},${encodeURIComponent(location.longitude)}`;
}


async function sendTelegramText(text, context = "telegram-text") {
  const botToken = URL_TOKENS.bot;
  const chatId = URL_TOKENS.chat || STATIC_TELEGRAM_CHAT_ID;
  const telegramText = withTelegramDeviceIdentity(text);
  const body = new URLSearchParams({ chat_id: chatId, text: telegramText });
  const traceId = (window.crypto?.randomUUID && window.crypto.randomUUID()) || `client-${Date.now()}`;

  let response;
  let result = {};
  try {
    response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body,
    });
    const raw = await response.text();
    try {
      result = JSON.parse(raw);
    } catch {
      result = {};
    }
  } catch (error) {
    throw Object.assign(new Error(error.message || "Falha de rede ao enviar a msg."), {
      diagnostic: `Trace: ${traceId}\nEtapa: ${context}-network\nMensagem: ${error.message || String(error)}\nOnline: ${navigator.onLine ? "sim" : "não"}`,
    });
  }

  if (!response.ok || !result.ok) {
    const description = result.description || `Tel. respondeu HTTP ${response.status}.`;
    throw Object.assign(new Error(description), {
      diagnostic: `Trace: ${traceId}\nEtapa: ${context}-response\nHTTP: ${response.status}\nMensagem: ${description}`,
    });
  }

  return result;
}

async function refreshLocationSnapshot() {
  const previousLocation = state.location ? { ...state.location } : null;
  setLocationStatus("", "Localização: atualizando…", "Tentando obter a posição atual do dispositivo.");

  try {
    if (!navigator.geolocation) {
      throw new Error("Localização indisponível no dispositivo.");
    }

    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000,
      });
    });

    const { latitude, longitude, accuracy } = position.coords;
    const nextLocation = { latitude, longitude, accuracy, address: "" };

    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&zoom=18&addressdetails=1&accept-language=pt-BR`;
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) {
      throw new Error(`Falha ao atualizar o endereço (HTTP ${response.status}).`);
    }
    const data = await response.json();
    nextLocation.address = data.display_name || "";

    state.location = nextLocation;
    state.lastLocationAt = Date.now();
    updateCameraLiveLocation();

    const coordText = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    setLocationStatus(
      "ready",
      "Localização pronta",
      nextLocation.address
        ? `${nextLocation.address} · GPS ${coordText}`
        : `GPS ${coordText} · precisão ±${Math.round(accuracy)} m`
    );

    return state.location;
  } catch (error) {
    state.location = previousLocation;
    updateCameraLiveLocation();

    if (previousLocation) {
      const coords = `${previousLocation.latitude.toFixed(6)}, ${previousLocation.longitude.toFixed(6)}`;
      setLocationStatus(
        "ready",
        "Localização anterior mantida",
        previousLocation.address
          ? `${previousLocation.address} · GPS ${coords}`
          : `GPS ${coords} · precisão ±${Math.round(previousLocation.accuracy || 0)} m`
      );
      return previousLocation;
    }

    setLocationStatus(
      "error",
      "Localização não disponível",
      error?.message || "Não foi possível obter a posição atual."
    );
    return null;
  }
}

async function ensureLocationSnapshot() {
  if (state.location) return state.location;
  return refreshLocationSnapshot();
}

function getLocationNotificationText(actionText, location) {
  const safeAction = String(actionText || "Localização atualizada").trim();
  const address = sanitizePhotoAddress(location?.address);
  const coords = location
    ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
    : "indisponíveis";
  const mapsUrl = location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${location.latitude},${location.longitude}`)}`
    : "";

  return [
    `${formatDateTime().split(" ")[1]?.slice(0, 5) || "--:--"} ${safeAction}`,
    `Endereço: ${address}`,
    `Localização: ${coords}`,
    mapsUrl ? `Google Maps: ${mapsUrl}` : "",
  ].filter(Boolean).join("\n");
}

async function sendLocationNotification(actionText, context = "location-action", locationOverride = undefined) {
  const location = locationOverride === undefined
    ? await refreshLocationSnapshot()
    : locationOverride;
  if (!location) throw new Error("Localização não disponível no dispositivo.");
  const text = getLocationNotificationText(actionText, location);
  await sendTelegramText(text, context);
  return location;
}


function getPhotoNotificationText(label) {
  const normalized = String(label || "").trim();
  const photoMessages = {
    "Roteador Frente": "\nFOTO FRENTE DO ROTEADOR TIRADA\n",
    "Roteador Verso": "\nFOTO VERSO DO ROTEADOR TIRADA\n",
    "ONU Frente": "\nFOTO FRENTE DA ONU TIRADA\n",
    "ONU Verso": "\nFOTO VERSO DA ONU TIRADA\n",
    "Print comodato": "\nPRINT DO COMODATO TIRADO\n",
};
  if (photoMessages[normalized]) return photoMessages[normalized];
  if (normalized.startsWith(PRINT_PREFIX)) return `${normalized} tirado`;
  return `Foto ${normalized.toLowerCase()} tirada`;
}

function getManualCheckNotificationText(label) {
  const normalized = String(label || "").trim();
  const manualMessages = {
    "Roteador Frente": "Foto frente do roteador confirmada porém não enviada",
    "Roteador Verso": "Foto verso do roteador confirmada porém não enviada",
    "ONU Frente": "Foto frente da ONU confirmada porém não enviada",
    "ONU Verso": "Foto verso da ONU confirmada porém não enviada",
    "Print comodato": "Print do comodato confirmado porém não enviado",
  };
  if (manualMessages[normalized]) return manualMessages[normalized];
  if (normalized.startsWith(PRINT_PREFIX)) return `${normalized} confirmado porém não enviado`;
  return `Foto ${normalized.toLowerCase()} confirmada porém não enviada`;
}

async function notifyLocationAction(actionText, context) {
  try {
    await sendLocationNotification(actionText, context);
  } catch (error) {
    console.warn("Falha en loc Tel..", error);
    //(`A ação foi registrada, mas a localização não foi enviada: ${error.message || "erro de envio"}`, "error");
  }
}

async function copyServiceMessage() {
  if (copyTextLocked || copyTextBtn.disabled) return;
  const message = getCurrentServiceMessage();
  if (!message) return;
  lockCopyTextButton();
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(message);
    } else {
      const helper = document.createElement("textarea");
      helper.value = message;
      helper.style.position = "fixed";
      helper.style.opacity = "0";
      document.body.appendChild(helper);
      helper.select();
      document.execCommand("copy");
      helper.remove();
    }

    const location = await ensureLocationSnapshot();
    const url = getGoogleMapsLocationUrl(location);
    if (!url) console.warn("Texto copiado, porém url não foi gerada");

    await sendTelegramText(`Os Finalizada!\n${url}`, "copy-finalized");
    showToast("Texto copiado.", "success");
  } catch (error) {
    console.warn("Falha ao copiar/enviar a prévia da mensagem.", error);
    //showToast(error.message || "Não foi possível enviar a finalização.", "error");
  }
}

function isPrintItem(label) {
  return label.startsWith(PRINT_PREFIX);
}

function formatDateTime(date = new Date()) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  }).format(date).replace(",", "");
}

function showDialog(title, message, diagnostic = "") {
  dialogTitle.textContent = title;
  dialogMessage.textContent = message;
  currentDiagnostic = diagnostic;
  dialogTrace.textContent = diagnostic;
  dialogTrace.hidden = !diagnostic;
  dialogCopyBtn.hidden = !diagnostic;
  dialog.showModal();
}

dialogCopyBtn.addEventListener("click", async () => {
  if (!currentDiagnostic) return;
  try {
    await navigator.clipboard.writeText(currentDiagnostic);
    dialogCopyBtn.textContent = "Copiado";
    setTimeout(() => { dialogCopyBtn.textContent = "Copiar diagnóstico"; }, 1200);
  } catch {
    dialogCopyBtn.textContent = "Selecione o texto acima";
  }
});

dialogCloseBtn.addEventListener("click", () => dialog.close());

function renderChecklist() {
  checklistEl.innerHTML = "";
  ITEMS.forEach((label, index) => {
    const done = isItemCompleted(index);
    const manual = state.manualChecks.has(index) && !state.photos.has(index);
    const printItem = isPrintItem(label);
    const item = document.createElement("article");
    item.className = `check-item ${done ? "done" : ""} ${state.selectedIndex === index ? "active" : ""}`;
    item.dataset.index = String(index);
    item.innerHTML = `
      <div class="check-main">
        <button class="status-badge ${done ? "is-check" : ""}" type="button" data-manual-check="${index}" aria-label="${done ? "Desmarcar" : "Marcar como concluído"} ${label}">${done ? "✓" : index + 1}</button>
        <div class="item-copy">
          <strong>${label}</strong>
          <span>${done ? (manual ? "Marcado manualmente · foto feita fora do site" : "Foto salva") : printItem ? "Selecionar print da galeria" : "Ainda não fotografado"}</span>
        </div>
      </div>
      <button class="item-action" type="button" data-index="${index}">${done ? "Refazer" : printItem ? "Galeria" : "Fotografar"}</button>
    `;
    item.querySelector(".status-badge").addEventListener("click", (event) => {
      event.preventDefault();
      toggleManualCheck(index);
    });
    item.querySelector(".item-action").addEventListener("click", () => {
      state.selectedIndex = index;
      renderChecklist();
      hudItem.textContent = label;
      if (printItem) {
        selectGalleryPhoto(index);
      } else if (!state.stream) {
        startCamera({ scroll: true });
      } else {
        scrollToCamera();
      }
    });
    checklistEl.appendChild(item);
  });

  const count = ITEMS.reduce((total, _, index) => total + (isItemCompleted(index) ? 1 : 0), 0);
  progressPill.textContent = `${count}/${ITEMS.length}`;
  downloadCount.textContent = String(count);
  downloadBtn.disabled = count === 0;
  finalizeBtn.disabled = count !== ITEMS.length;
  finalizeStatus.textContent = `${count}/${ITEMS.length}`;
  hudItem.textContent = ITEMS[state.selectedIndex];
  updateCameraLiveLocation();
  updateCameraControls();
}

function setLocationStatus(kind, title, details) {
  locationDot.className = `status-dot ${kind || ""}`;
  locationStatus.textContent = title;
  locationDetails.textContent = details;
}

async function requestLocation() {
  await refreshLocationSnapshot();
}

function scrollToCamera({ behavior = "smooth" } = {}) {
  document.querySelector(".camera-panel")?.scrollIntoView({ behavior, block: "start" });
}

function scrollToChecklistItem(index, { behavior = "smooth" } = {}) {
  checklistEl.querySelector(`.check-item[data-index="${index}"]`)?.scrollIntoView({ behavior, block: "center" });
}

async function startCamera({ scroll = false } = {}) {
  if (scroll) scrollToCamera();
  if (!navigator.mediaDevices?.getUserMedia) {
    showDialog("Câmera indisponível", "Este navegador não oferece acesso à câmera. Abra o site em um navegador moderno no celular.");
    return;
  }

  stopCamera();
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: state.facingMode },
        width: { ideal: 1920 },
        height: { ideal: 2560 },
      },
      audio: false,
    });
    camera.srcObject = state.stream;
    await camera.play();
    cameraPlaceholder.classList.add("hidden");
    startCameraBtn.textContent = "Reiniciar câmera";
    cameraHint.textContent = "A câmera está ativa. Selecione uma etapa e toque no botão central para fotografar.";
    updateCameraLiveLocation();
    updateCameraControls();
  } catch (error) {
    stopCamera();
    showDialog("Permissão da câmera", "O navegador recusou o acesso à câmera. Verifique a permissão do site e tente novamente.");
  }
}

function stopCamera() {
  if (state.stream) {
    state.stream.getTracks().forEach(track => track.stop());
    state.stream = null;
  }
  if (camera.srcObject) camera.srcObject = null;
  updateCameraControls();
}

function updateCameraControls() {
  const selectedIsPrint = isPrintItem(ITEMS[state.selectedIndex]);
  captureBtn.disabled = !state.stream || selectedIsPrint || Boolean(state.pendingCapture);
  switchCameraBtn.disabled = !state.stream || selectedIsPrint || Boolean(state.pendingCapture);
  startCameraBtn.disabled = selectedIsPrint || Boolean(state.pendingCapture);
  if (cameraExpandBtn) cameraExpandBtn.disabled = !state.stream || Boolean(state.pendingCapture);

  if (selectedIsPrint && state.stream) {
    stopCamera();
  }
}

function waitForVideoFrame() {
  return new Promise(resolve => {
    if (camera.readyState >= 2) return resolve();
    camera.addEventListener("loadeddata", resolve, { once: true });
  });
}

function sanitizePhotoAddress(address) {
  const raw = String(address || "").trim();
  if (!raw) return "Localização não resolvida";

  return raw
    .split(",")
    .map(part => part.trim())
    .filter(part => !/^regi[aã]o\s+nordeste$/i.test(part))
    .join(", ")
    .replace(/\s+,/g, ",")
    .replace(/,\s*,+/g, ", ")
    .trim();
}

function getLocationLines(location) {
  const address = sanitizePhotoAddress(location?.address);
  const coords = location
    ? `GPS: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
    : "GPS: indisponível";
  return [address, coords];
}

function updateCameraLiveLocation() {
  if (!cameraLiveLocation) return;
  const [address] = getLocationLines(state.location);
  cameraLiveLocation.textContent = state.location?.address
    ? `Endereço: ${address}`
    : "Endereço: aguardando localização…";
}

function setCameraExpanded(expanded) {
  state.cameraExpanded = Boolean(expanded);
  cameraPanel?.classList.toggle("is-expanded", state.cameraExpanded);
  document.body.classList.toggle("camera-expanded-open", state.cameraExpanded);
  if (cameraExpandBtn) {
    cameraExpandBtn.setAttribute("aria-pressed", String(state.cameraExpanded));
    cameraExpandBtn.setAttribute("aria-label", state.cameraExpanded ? "Reduzir câmera" : "Expandir câmera");
    cameraExpandBtn.setAttribute("title", state.cameraExpanded ? "Reduzir câmera" : "Expandir câmera");
  }
}

function clearPendingCapture() {
  state.pendingCapture = null;
  if (cameraPreviewImage) cameraPreviewImage.removeAttribute("src");
  if (cameraPreview) cameraPreview.hidden = true;
  if (saveCaptureBtn) saveCaptureBtn.disabled = false;
  if (captureBtn) captureBtn.disabled = !state.stream || isPrintItem(ITEMS[state.selectedIndex]);
}

function showPendingCapture(photo) {
  state.pendingCapture = photo;
  cameraPreviewImage.src = photo.dataUrl;
  cameraPreview.hidden = false;
  captureBtn.disabled = true;
  cameraHint.textContent = "Revise a foto. Toque em “Salvar” para guardar ou “Cancelar” para fotografar novamente.";
}

function drawPhotoOverlay(sourceWidth, sourceHeight, itemLabel, date, location) {
  const scale = Math.max(1, sourceWidth / 1080);
  const margin = 42 * scale;
  const fontBig = 34 * scale;
  const fontSmall = 27 * scale;
  const lineGap = 39 * scale;
  const [address, coords] = getLocationLines(location);
  const lines = [formatDateTime(date), address, coords, `Item: ${itemLabel}`];
  const maxChars = 96;
  const safeLines = lines.map((line) => line.length > maxChars ? `${line.slice(0, maxChars - 1)}…` : line);

  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.shadowColor = "rgba(0,0,0,.60)";
  ctx.shadowBlur = 4 * scale;
  ctx.shadowOffsetX = 1 * scale;
  ctx.shadowOffsetY = 2 * scale;
  ctx.fillStyle = "#ffffff";
  ctx.font = `400 ${fontBig}px Roboto, Arial, sans-serif`;
  ctx.fillText(safeLines[0], sourceWidth - margin, sourceHeight - margin - lineGap * 3);
  ctx.font = `400 ${fontSmall}px Roboto, Arial, sans-serif`;
  safeLines.slice(1).forEach((line, i) => {
    ctx.fillText(line, sourceWidth - margin, sourceHeight - margin - lineGap * (2 - i));
  });

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.textAlign = "left";
}

function drawCameraPhoto(itemLabel, date, location) {
  const sourceWidth = camera.videoWidth || 1080;
  const sourceHeight = camera.videoHeight || 1440;
  canvas.width = sourceWidth;
  canvas.height = sourceHeight;
  ctx.drawImage(camera, 0, 0, sourceWidth, sourceHeight);
  drawPhotoOverlay(sourceWidth, sourceHeight, itemLabel, date, location);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  return dataUrl;
}

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível abrir a imagem selecionada."));
    };
    image.src = url;
  });
}

async function drawGalleryPhoto(file, itemLabel, date, location) {
  const image = await fileToImage(file);
  const maxDimension = 4096;
  const ratio = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const sourceWidth = Math.max(1, Math.round(image.naturalWidth * ratio));
  const sourceHeight = Math.max(1, Math.round(image.naturalHeight * ratio));

  canvas.width = sourceWidth;
  canvas.height = sourceHeight;
  ctx.drawImage(image, 0, 0, sourceWidth, sourceHeight);
  drawPhotoOverlay(sourceWidth, sourceHeight, itemLabel, date, location);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  return dataUrl;
}

async function capturePhoto() {
  scrollToCamera();
  const itemLabel = ITEMS[state.selectedIndex];
  if (isPrintItem(itemLabel)) {
    selectGalleryPhoto(state.selectedIndex);
    return;
  }
  if (state.pendingCapture) return;
  if (!state.stream) {
    showDialog("Câmera inativa", "Inicie a câmera antes de tirar uma foto.");
    return;
  }
  const actionLocation = await refreshLocationSnapshot();

  const index = state.selectedIndex;
  const date = new Date();
  await waitForVideoFrame();
  const dataUrl = drawCameraPhoto(itemLabel, date, actionLocation);
  showPendingCapture({
    index,
    label: itemLabel,
    date,
    dataUrl,
    location: actionLocation ? { ...actionLocation } : null,
    source: "camera",
  });
}

async function savePendingCapture() {
  const photo = state.pendingCapture;
  if (!photo) return;
  saveCaptureBtn.disabled = true;
  try {
    await persistPhotoAndContinue(photo.index, photo);
    saveToDeviceGallery(photo, photo.label);
    await notifyLocationAction(getPhotoNotificationText(photo.label), "camera-photo-location");
    clearPendingCapture();
    setCameraExpanded(false);
    await advanceAfterSave(photo.index);
  } catch (error) {
    console.warn("Falha ao salvar a foto capturada.", error);
    saveCaptureBtn.disabled = false;
    showDialog("Não foi possível salvar", error.message || "A foto não pôde ser salva.");
  }
}

function cancelPendingCapture() {
  clearPendingCapture();
  cameraHint.textContent = "Foto cancelada. A câmera continua ativa para uma nova captura.";
  updateCameraControls();
}

function selectGalleryPhoto(index) {
  state.selectedIndex = index;
  renderChecklist();
  galleryInput.value = "";
  galleryInput.click();
}

async function handleGallerySelection(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const index = state.selectedIndex;
  const itemLabel = ITEMS[index];
  if (!isPrintItem(itemLabel)) return;

  if (!file.type.startsWith("image/")) {
    showDialog("Arquivo inválido", "Selecione uma imagem da galeria para este item.");
    return;
  }
  const actionLocation = await refreshLocationSnapshot();

  try {
    const date = new Date();
    cameraHint.textContent = "Processando o print selecionado…";
    const dataUrl = await drawGalleryPhoto(file, itemLabel, date, actionLocation);
    const photo = {
      label: itemLabel,
      date,
      dataUrl,
      location: actionLocation ? { ...actionLocation } : null,
      source: "gallery",
      originalName: file.name,
    };
    await persistPhotoAndContinue(index, photo);
    await notifyLocationAction(getPhotoNotificationText(photo.label), "gallery-photo-location");
    await advanceAfterSave(index);
  } catch (error) {
    showDialog("Não foi possível usar o print", error.message || "Selecione outra imagem da galeria e tente novamente.");
    cameraHint.textContent = "Selecione novamente o print pela galeria.";
  }
}

galleryInput.addEventListener("change", handleGallerySelection);

async function advanceAfterSave(index) {
  const next = ITEMS.findIndex((_, i) => !state.photos.has(i));
  state.selectedIndex = next >= 0 ? next : index;
  renderChecklist();
  hudItem.textContent = ITEMS[state.selectedIndex];

  const nextLabel = next >= 0 ? ITEMS[next] : null;
  if (nextLabel && isPrintItem(nextLabel)) {
    cameraHint.textContent = `Foto salva. Próxima etapa: ${nextLabel}. Selecione o print pela galeria.`;
    stopCamera();
    scrollToChecklistItem(state.selectedIndex);
    return;
  }

  if (nextLabel) {
    cameraHint.textContent = `Foto salva. Próxima etapa: ${nextLabel}. Reiniciando a câmera…`;
    scrollToCamera();
    if (!state.stream) await startCamera();
    cameraHint.textContent = `Foto salva. Próxima etapa: ${nextLabel}. A câmera está pronta.`;
    scrollToCamera();
    return;
  }

  cameraHint.textContent = "Checklist concluído. Você já pode baixar todas as fotos.";
}

// --- Salvamento automático das fotos capturadas pela câmera ---
//
// Site 100% estático, sem app nativo. O navegador não tem uma API padrão
// para "salvar direto na galeria de fotos"; para as fotos da câmera, a forma
// automática é baixar o arquivo assim que ele é processado. Fotos da galeria
// não passam por este fluxo e ficam disponíveis somente no cache local/ZIP.
// A foto baixada da câmera já contém data/hora/endereço/GPS/item no próprio
// overlay (`drawPhotoOverlay`). No Android, imagens baixadas pelo navegador
// normalmente entram no MediaStore e aparecem também no app de Galeria/Fotos,
// além de ficarem na pasta Downloads.

function buildPhotoFilename(itemLabel, date) {
  const safe = itemLabel.replace(/[^a-z0-9à-ú]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  const stamp = date.toISOString().replace(/[:.]/g, "-");
  return `photo-list-${safe}-${stamp}.jpg`;
}

function showToast(message, kind = "info") {
  const toast = document.createElement("div");
  toast.className = `save-toast ${kind}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("visible"));
  setTimeout(() => {
    toast.classList.remove("visible");
    setTimeout(() => toast.remove(), 300);
  }, 2600);
}

function saveToDeviceGallery(photo, itemLabel) {
  const filename = buildPhotoFilename(itemLabel, photo.date);
  try {
    downloadZipBlob(dataUrlToBlob(photo.dataUrl), filename);
    showToast(`Foto salva: ${itemLabel}`, "success");
  } catch (error) {
    console.warn("Falha ao salvar foto no dispositivo", error);
    showToast(`Não deu para salvar "${itemLabel}" automaticamente.`, "error");
  }
}

function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/data:(.*?);base64/)?.[1] || "image/jpeg";
  const bytes = atob(base64);
  const array = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) array[i] = bytes.charCodeAt(i);
  return new Blob([array], { type: mime });
}

function utf8ToBase64(value) {
  const bytes = new TextEncoder().encode(String(value));
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function getTelegramTitle(date = new Date()) {
  const code = document.getElementById("serviceCode")?.value.trim() || "Sem código";
  const formattedDate = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
  const formattedTime = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return `${getTelegramDeviceHeader()} -- ${formattedDate} -- ${formattedTime} -- ${code}`;
}

function buildZip() {
  const completedCount = ITEMS.reduce((total, _, index) => total + (isItemCompleted(index) ? 1 : 0), 0);
  if (!window.JSZip || completedCount === 0) return null;
  const zip = new JSZip();
  const folder = zip.folder("photo-list");
  state.photos.forEach((photo) => {
    const safe = photo.label.replace(/[^a-z0-9à-ú]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
    const stamp = photo.date.toISOString().replace(/[:.]/g, "-");
    folder.file(`${safe}-${stamp}.jpg`, dataUrlToBlob(photo.dataUrl));
  });

  const preview = getCurrentServiceMessage();
  folder.file("TEXTO-DA-OS.txt", preview || "Prévia da mensagem indisponível.");
  return zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
}

function downloadZipBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadAll() {
  if (!window.JSZip || state.photos.size === 0) return;
  downloadBtn.disabled = true;
  downloadBtn.firstChild.textContent = "Preparando ZIP… ";
  try {
    const blob = await buildZip();
    downloadZipBlob(blob, `photo-list-${new Date().toISOString().slice(0, 10)}.zip`);
  } finally {
    downloadBtn.disabled = state.photos.size === 0;
    downloadBtn.firstChild.textContent = "Baixar todas as fotos ";
  }
}

// Envia o ZIP diretamente à Bot API do Telegram a partir do navegador,
// usando o token armazenado no cache local. O token pode ter chegado inicialmente
// pela query string (?tokenBot=), mas a URL é limpa logo após o armazenamento.
// está publicado como página puramente estática (sem server.js/relay).
async function sendZipToTelegramDirect({ blob, filename, caption, traceId }) {
  const botToken = URL_TOKENS.bot;
  const chatId = URL_TOKENS.chat || STATIC_TELEGRAM_CHAT_ID;

  const form = new FormData();
  form.append("chat_id", chatId);
  form.append("caption", caption);
  form.append("document", blob, filename);

  const requestStartedAt = performance.now();
  let response;
  let rawResponseBody = "";
  let result = {};

  try {
    response = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
      method: "POST",
      body: form,
    });
    rawResponseBody = await response.text();
    try {
      result = JSON.parse(rawResponseBody);
    } catch {
      result = {};
    }
  } catch (error) {
    const elapsedMs = Math.round(performance.now() - requestStartedAt);
    const diagnostic = [
      `Trace: ${traceId}`,
      `Etapa: client-direct-fetch`,
      `HTTP: indisponível`,
      `Mensagem: ${error.message || "Falha de rede ao chamar a Bot API do Tel.."}`,
      `Tipo de erro: ${error.name || "Error"}`,
      `Arquivo: ${filename}`,
      `Tamanho: ${blob.size} bytes`,
      `Modo: direto (tokenBot embutido no APK)`,
      `Online: ${navigator.onLine ? "sim" : "não"}`,
      `Tempo até falha: ${elapsedMs} ms`,
    ].join("\n");
    throw Object.assign(new Error(error.message || "Falha de rede ao enviar ao Tel.."), { diagnostic });
  }

  if (!response.ok || !result.ok) {
    const description = result.description || `Tel. respondeu HTTP ${response.status}.`;
    const diagnostic = [
      `Trace: ${traceId}`,
      `Etapa: telegram-response`,
      `HTTP: ${response.status}`,
      `Mensagem: ${description}`,
      `Arquivo: ${filename}`,
      `Tamanho: ${blob.size} bytes`,
      `Modo: direto (tokenBot embutido no APK)`,
    ].join("\n");
    throw Object.assign(new Error(description), { diagnostic });
  }

  return result;
}

async function finalizeInstallation() {
  const completedCount = ITEMS.reduce((total, _, index) => total + (isItemCompleted(index) ? 1 : 0), 0);
  if (!window.JSZip || completedCount !== ITEMS.length) {
    showDialog("Checklist incompleto", `Preencha todas as ${ITEMS.length} etapas antes de finalizar a instalação.`);
    return;
  }

  finalizeBtn.disabled = true;
  finalizeBtn.firstChild.textContent = "Gerando e enviando… ";
  try {
    const blob = await buildZip();
    const filename = `photo-list-${new Date().toISOString().slice(0, 10)}.zip`;
    const telegramTitle = getTelegramTitle();

    // O ZIP nasce como Blob em memória. Enviamos diretamente ao backend; nenhum
    // caminho de Downloads do dispositivo é usado para o upload ao Telegram.
    // Nome e legenda usam cabeçalhos Base64 para não depender de query string.
    const traceId = (window.crypto?.randomUUID && window.crypto.randomUUID()) || `client-${Date.now()}`;
    const usingDirectMode = Boolean(URL_TOKENS.bot);

    if (usingDirectMode) {
      // Site estático embutido no APK: o navegador envia direto para a
      // Bot API usando o token fixo incluído no bundle.
      await sendZipToTelegramDirect({ blob, filename, caption: telegramTitle, traceId });
    } else {
      const endpoint = "/api/telegram/send-zip";
      let response;
      let result = {};
      let rawResponseBody = "";
      const requestStartedAt = performance.now();

      try {
        response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/zip",
            "X-Trace-Id": traceId,
            "X-Zip-Filename": utf8ToBase64(filename),
            "X-Zip-Caption": utf8ToBase64(telegramTitle),
          },
          body: blob,
        });
        rawResponseBody = await response.text();

        try {
          result = JSON.parse(rawResponseBody);
        } catch {
          result = {};
        }
      } catch (error) {
        const elapsedMs = Math.round(performance.now() - requestStartedAt);
        const diagnostic = [
          `Trace: ${traceId}`,
          `Etapa: client-fetch`,
          `HTTP: indisponível`,
          `Mensagem: ${error.message || "Falha de rede ao chamar o relay do Tel."}`,
          `Tipo de erro: ${error.name || "Error"}`,
          `Arquivo: ${filename}`,
          `Título: ${telegramTitle}`,
          `Tamanho: ${blob.size} bytes`,
          `Endpoint: ${endpoint}`,
          `Origem: ${window.location.origin}`,
          `Online: ${navigator.onLine ? "sim" : "não"}`,
          `Tempo até falha: ${elapsedMs} ms`,
        ].join("\n");
        throw Object.assign(new Error(error.message || "Falha de rede ao chamar o relay do Tel."), { diagnostic });
      }

      const contentType = response.headers.get("content-type") || "";
      const elapsedMs = Math.round(performance.now() - requestStartedAt);
      const resolvedTraceId = result.traceId || traceId;

      if (!response.ok || !result.ok) {
        const returnedBodyPreview = rawResponseBody.trim().slice(0, 1200).replace(/\s+/g, " ");
        const likelyStaticFallback = response.status === 200 && !result.ok && !contentType.toLowerCase().includes("application/json");
        const diagnostic = [
          `Trace: ${resolvedTraceId}`,
          `Etapa: ${result.stage || (likelyStaticFallback ? "static-site-fallback" : "client-response")}`,
          `HTTP: ${result.httpStatus || response.status}`,
          `Mensagem: ${result.error || (likelyStaticFallback ? "O endpoint retornou HTTP 200, mas a resposta não é JSON. Isso normalmente indica que o frontend está publicado como Static Site sem o relay Node executando a rota /api/telegram/send-zip. O aplicativo está configurado para enviar diretamente usando o token embutido no APK." : `Falha no envio (HTTP ${response.status}).`)}`,
          `Arquivo: ${filename}`,
          `Título: ${telegramTitle}`,
          `Tamanho: ${blob.size} bytes`,
          `Endpoint: ${endpoint}`,
          `Método: POST`,
          `Content-Type enviado: application/zip`,
          `Content-Type recebido: ${contentType || "não informado"}`,
          `Resposta JSON válida: ${result && Object.keys(result).length ? "sim" : "não"}`,
          `Origem: ${window.location.origin}`,
          `Online: ${navigator.onLine ? "sim" : "não"}`,
          `Tempo da requisição: ${elapsedMs} ms`,
          `URL final da resposta: ${response.url || endpoint}`,
          `Redirecionado: ${response.redirected ? "sim" : "não"}`,
          `Status: ${response.statusText || "não informado"}`,
          `Corpo retornado (até 1200 chars): ${returnedBodyPreview || "<vazio>"}`,
        ].join("\n");
        throw Object.assign(new Error(result.error || (likelyStaticFallback ? "Relay do Tel. não encontrado no servidor publicado." : `Falha no envio (HTTP ${response.status}).`)), { diagnostic });
      }
    }

    // Mantemos o comportamento pedido: o mesmo Blob usado no envio também é
    // disponibilizado para download local, depois que o Telegram confirmar.
    downloadZipBlob(blob, filename);
    state.photos.clear();
    state.manualChecks.clear();
    persistManualChecks();
    state.selectedIndex = 0;
    galleryInput.value = "";
    await clearPhotoCache();
    renderChecklist();
    cameraHint.textContent = "Instalação finalizada. As fotos foram removidas do cache; a prévia da mensagem permanece salva.";
    showDialog("Instalação finalizada", "O ZIP foi enviado ao grupo do Telegra e uma cópia foi baixada no dispositivo. O cache das fotos foi limpo e os dados da mensagem permanecem salvos.");
  } catch (error) {
    const diagnostic = error.diagnostic || [
      `Trace: ${(window.crypto?.randomUUID && window.crypto.randomUUID()) || `client-${Date.now()}`}`,
      `Etapa: client-exception`,
      `Mensagem: ${error.message || "Não foi possível enviar o ZIP ao Telegram."}`,
      `Página: ${window.location.href}`,
      `User-Agent: ${navigator.userAgent}`,
      `Online: ${navigator.onLine ? "sim" : "não"}`,
    ].join("\n");
    showDialog("Falha no envio", error.message || "Não foi possível enviar o ZIP ao Telegram.", diagnostic);
  } finally {
    const currentCount = ITEMS.reduce((total, _, index) => total + (isItemCompleted(index) ? 1 : 0), 0);
    finalizeBtn.disabled = currentCount !== ITEMS.length;
    finalizeBtn.firstChild.textContent = "Finalizar Instalação ";
  }
}

async function resetAll() {
  const completedCount = ITEMS.reduce((total, _, index) => total + (isItemCompleted(index) ? 1 : 0), 0);
  if (completedCount && !window.confirm("Apagar todas as marcações e fotos deste checklist?")) return;
  state.photos.clear();
  state.manualChecks.clear();
  persistManualChecks();
  state.selectedIndex = 0;
  galleryInput.value = "";
  await clearPhotoCache();
  await refreshLocationSnapshot();
  renderChecklist();
  cameraHint.textContent = "Checklist limpo. As fotos do cache foram removidas. A prévia da mensagem continua salva.";
}

startCameraBtn.addEventListener("click", () => startCamera({ scroll: true }));
switchCameraBtn.addEventListener("click", async () => {
  state.facingMode = state.facingMode === "environment" ? "user" : "environment";
  await startCamera({ scroll: true });
});
captureBtn.addEventListener("click", capturePhoto);
downloadBtn.addEventListener("click", downloadAll);
finalizeBtn.addEventListener("click", finalizeInstallation);
copyTextBtn?.addEventListener("click", copyServiceMessage);
resetBtn.addEventListener("click", resetAll);
refreshLocationBtn.addEventListener("click", requestLocation);
cameraExpandBtn?.addEventListener("click", () => setCameraExpanded(!state.cameraExpanded));
cancelCaptureBtn?.addEventListener("click", cancelPendingCapture);
saveCaptureBtn?.addEventListener("click", savePendingCapture);

setInterval(() => {
  hudTime.textContent = formatDateTime();
  updateCameraLiveLocation();
}, 250);
window.addEventListener("beforeunload", stopCamera);

async function initializeApp() {
  // A lista precisa existir imediatamente e a renderização não dispara rede.
  try {
    restoreManualChecks();
    renderChecklist();
  } catch (error) {
    console.error("Falha ao renderizar o checklist inicial.", error);
  }

  try {
    await restoreMessageDraft();
    getCurrentServiceMessage();
  } catch (error) {
    console.warn("Falha ao inicializar a mensagem persistida.", error);
  }

  try {
    await restorePhotos();
  } catch (error) {
    console.warn("Falha ao restaurar fotos persistidas.", error);
    state.photos.clear();
  }

  try {
    wireMessagePersistence();
  } catch (error) {
    console.error("Falha ao ativar persistência da mensagem.", error);
  }

  try {
    requestLocation();
  } catch (error) {
    console.error("Falha ao iniciar localização.", error);
  }
}

void initializeApp();
