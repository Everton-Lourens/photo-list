import { StatusBar } from 'expo-status-bar';
import * as Clipboard from 'expo-clipboard';
import * as MediaLibrary from 'expo-media-library';
import { Camera, CameraView } from 'expo-camera';
import * as Location from 'expo-location';
import * as Application from 'expo-application';
import { Directory, File, Paths } from 'expo-file-system';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import { STATIC_SITE_HTML } from './site-bundle';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const URL_CACHE_KEY = '@photolist/site-url';
const HEALTH_CHECK_URL = 'https://photo-list-fmd4.onrender.com/';
const HEALTH_CHECK_CACHE_KEY = '@photolist/health-check';
const HEALTH_CHECK_TIMEOUT_MS = 12000;

const DEVICE_ID_STORAGE_KEY = '@photolist/device-id-fallback';
const DEVICE_FRUITS = [
  'Abacaxi',
  'Acerola',
  'Banana',
  'Caju',
  'Caqui',
  'Carambola',
  'Cereja',
  'Coco',
  'Cupuaçu',
  'Figo',
  'Goiaba',
  'Graviola',
  'Jabuticaba',
  'Kiwi',
  'Laranja',
  'Limão',
  'Mamão',
  'Manga',
  'Maracujá',
  'Melancia',
  'Melão',
  'Morango',
  'Pera',
  'Pêssego',
  'Pitaya',
  'Romã',
  'Tangerina',
  'Uva',
  'Açaí',
  'Ameixa',
];

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

function createDeviceIdentity(deviceId, source) {
  const normalizedId = String(deviceId || '').trim();
  if (!normalizedId) return null;

  const hash = hashString(`${source}:${normalizedId}`);
  const fruit = DEVICE_FRUITS[hash % DEVICE_FRUITS.length];
  const shortId = normalizedId.replace(/[^a-z0-9]/gi, '').slice(-6).toUpperCase() || 'SEM-ID';

  return {
    id: normalizedId,
    source,
    fruit,
    shortId,
    label: `${fruit} • ${shortId}`,
  };
}

async function getDeviceIdentity() {
  try {
    if (Platform.OS === 'android') {
      const androidId = Application.getAndroidId();
      return createDeviceIdentity(androidId, 'androidId');
    }

    if (Platform.OS === 'ios') {
      const iosId = await Application.getIosIdForVendorAsync();
      if (iosId) return createDeviceIdentity(iosId, 'iosIdForVendor');
    }
  } catch (error) {
    console.warn('Falha ao obter identificador nativo do dispositivo.', error);
  }

  try {
    let fallbackId = await AsyncStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (!fallbackId) {
      fallbackId = `fallback-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
      await AsyncStorage.setItem(DEVICE_ID_STORAGE_KEY, fallbackId);
    }
    return createDeviceIdentity(fallbackId, 'appStorageFallback');
  } catch (error) {
    console.warn('Falha ao criar identificador persistente de fallback.', error);
    return createDeviceIdentity(`fallback-${Date.now()}-${Math.random()}`, 'runtimeFallback');
  }
}

const injectedLocationBridge = `
(function () {
  if (window.__photoListNativeGeoInstalled) return true;
  window.__photoListNativeGeoInstalled = true;

  var callbacks = {};
  var nextId = 1;
  var nextWatchId = 1;

  function post(type, payload) {
    if (!window.ReactNativeWebView || !window.ReactNativeWebView.postMessage) return;
    window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({ type: type }, payload || {})));
  }

  function sanitizeOptions(options) {
    options = options || {};
    return {
      enableHighAccuracy: !!options.enableHighAccuracy,
      maximumAge: Number.isFinite(options.maximumAge) ? options.maximumAge : 0,
      timeout: Number.isFinite(options.timeout) ? options.timeout : 10000,
      timeInterval: Number.isFinite(options.timeInterval) ? options.timeInterval : 5000,
      distanceInterval: Number.isFinite(options.distanceInterval) ? options.distanceInterval : 0
    };
  }

  function buildPosition(payload) {
    return {
      coords: {
        latitude: payload.latitude,
        longitude: payload.longitude,
        accuracy: payload.accuracy,
        altitude: payload.altitude,
        altitudeAccuracy: payload.altitudeAccuracy,
        heading: payload.heading,
        speed: payload.speed
      },
      timestamp: payload.timestamp
    };
  }

  function deliver(data) {
    var entry = callbacks[data.requestId];
    if (!entry) return;

    if (data.kind === 'success') {
      var position = buildPosition(data.position);
      if (entry.watch) {
        entry.success(position);
      } else {
        delete callbacks[data.requestId];
        entry.success(position);
      }
      return;
    }

    var error = {
      code: data.code || 2,
      message: data.message || 'Não foi possível obter a localização.'
    };

    if (!entry.watch) delete callbacks[data.requestId];
    if (entry.error) entry.error(error);
  }

  window.__photoListNativeGeoDispatch = deliver;

  var bridge = {
    getCurrentPosition: function (success, error, options) {
      var id = String(nextId++);
      callbacks[id] = {
        success: typeof success === 'function' ? success : function () {},
        error: typeof error === 'function' ? error : function () {},
        watch: false
      };
      post('native-geolocation-get', {
        requestId: id,
        options: sanitizeOptions(options)
      });
      return id;
    },
    watchPosition: function (success, error, options) {
      var id = String(nextWatchId++);
      callbacks[id] = {
        success: typeof success === 'function' ? success : function () {},
        error: typeof error === 'function' ? error : function () {},
        watch: true
      };
      post('native-geolocation-watch', {
        requestId: id,
        options: sanitizeOptions(options)
      });
      return id;
    },
    clearWatch: function (watchId) {
      var id = String(watchId);
      delete callbacks[id];
      post('native-geolocation-clear-watch', { requestId: id });
    }
  };

  try {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      enumerable: true,
      value: bridge
    });
  } catch (e) {
    navigator.geolocation = bridge;
  }

  true;
})();
`;

function buildDeviceIdentityInjection(identity) {
  return `(function () {
    window.__photoListDeviceIdentity = ${JSON.stringify(identity || null)};
    true;
  })();`;
}

const injectedJavaScript = `
(function () {
  if (window.__photoListDownloadHookInstalled) return true;
  window.__photoListDownloadHookInstalled = true;

  var CHUNK_SIZE = 96000;

  function post(payload) {
    if (!window.ReactNativeWebView || !window.ReactNativeWebView.postMessage) return;
    window.ReactNativeWebView.postMessage(JSON.stringify(payload));
  }

  function sanitizeFilename(value, fallback) {
    var name = String(value || fallback || ('foto-' + Date.now() + '.jpg'));
    return name.replace(/[\\/:*?"<>|]/g, '_').replace(/\\s+/g, '_');
  }

  function filenameFromUrl(value) {
    try {
      var parsed = new URL(value, window.location.href);
      var pathname = parsed.pathname || '';
      var candidate = pathname.split('/').pop() || '';
      return decodeURIComponent(candidate) || '';
    } catch (e) {
      return '';
    }
  }

  function blobToBase64(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onloadend = function () {
        try {
          var result = String(reader.result || '');
          var comma = result.indexOf(',');
          resolve(comma >= 0 ? result.slice(comma + 1) : result);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = function () { reject(reader.error || new Error('Não foi possível ler o arquivo.')); };
      reader.readAsDataURL(blob);
    });
  }

  function sendBase64Download(base64, filename, mimeType) {
    var transferId = 'download-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    var total = Math.ceil(base64.length / CHUNK_SIZE);

    post({
      type: 'download-start',
      transferId: transferId,
      filename: sanitizeFilename(filename, filenameFromUrl(window.location.href) || 'arquivo.bin'),
      mimeType: mimeType || 'application/octet-stream',
      totalChunks: total
    });

    for (var index = 0; index < total; index += 1) {
      post({
        type: 'download-chunk',
        transferId: transferId,
        index: index,
        data: base64.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE)
      });
    }

    post({
      type: 'download-end',
      transferId: transferId
    });
  }

  async function downloadFromWeb(url, filename) {
    try {
      var response = await fetch(url, {
        credentials: 'include',
        cache: 'default'
      });

      if (!response.ok) throw new Error('HTTP ' + response.status);

      var blob = await response.blob();
      var inferredName = filename || filenameFromUrl(url) || 'arquivo.bin';
      await sendBase64Download(await blobToBase64(blob), inferredName, blob.type || 'application/octet-stream');
      return true;
    } catch (error) {
      return false;
    }
  }

  async function handleDownload(anchor) {
    var href = anchor.href || anchor.getAttribute('href') || '';
    var filename = anchor.getAttribute('download') || filenameFromUrl(href);
    if (!href) return;

    if (await downloadFromWeb(href, filename || 'arquivo.bin')) return;

    post({
      type: 'download',
      url: href,
      filename: filename || ''
    });
  }

  document.addEventListener('click', function (event) {
    var anchor = event.target && event.target.closest
      ? event.target.closest('a')
      : null;

    if (!anchor) return;

    var href = anchor.href || anchor.getAttribute('href') || '';
    var download = anchor.getAttribute('download');
    var looksLikeFile = download || /^blob:|^data:/i.test(href) || /\\.(?:jpe?g|png|gif|webp|bmp|heic|heif|pdf|zip|csv|txt)(?:[?#].*)?$/i.test(href);

    if (!looksLikeFile) return;

    event.preventDefault();
    event.stopPropagation();
    handleDownload(anchor);
  }, true);

  true;
})();
`;


function normalizeUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) throw new Error('Informe uma URL.');

  const candidate = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  const parsed = new URL(candidate);

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('A URL precisa usar HTTP ou HTTPS.');
  }

  // Camera and geolocation are secure-context Web APIs. Keep localhost
  // available for development, but upgrade remote HTTP addresses to HTTPS.
  if (parsed.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)) {
    parsed.protocol = 'https:';
  }

  return parsed.toString();
}

function formatError(title, details = {}) {
  const lines = [
    title,
    `Data: ${new Date().toISOString()}`,
    `URL: ${details.url || 'não informada'}`,
  ];

  if (details.statusCode) lines.push(`Status HTTP: ${details.statusCode}`);
  if (details.description) lines.push(`Descrição: ${details.description}`);
  if (details.domain) lines.push(`Domínio: ${details.domain}`);
  if (details.nativeEvent) lines.push(`Evento: ${JSON.stringify(details.nativeEvent)}`);

  return lines.join('\\n');
}


function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isPositiveStatus(statusCode) {
  return Number.isInteger(statusCode) && statusCode >= 200 && statusCode < 300;
}

async function readHealthCheckCache() {
  const raw = await AsyncStorage.getItem(HEALTH_CHECK_CACHE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return {
      date: parsed?.date || '',
      statusCode: Number.isInteger(parsed?.statusCode) ? parsed.statusCode : null,
    };
  } catch {
    return null;
  }
}

async function writeHealthCheckCache(statusCode) {
  await AsyncStorage.setItem(
    HEALTH_CHECK_CACHE_KEY,
    JSON.stringify({
      date: getLocalDateKey(),
      statusCode: Number.isInteger(statusCode) ? statusCode : null,
    })
  );
}

async function performDailyHealthCheck() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);

  try {
    const response = await fetch(HEALTH_CHECK_URL, {
      method: 'GET',
      cache: 'no-store',
      redirect: 'follow',
      signal: controller.signal,
    });

    const statusCode = response.status;
    await writeHealthCheckCache(statusCode);

    return {
      ok: isPositiveStatus(statusCode),
      statusCode,
      errorMessage: '',
    };
  } catch (error) {
    await writeHealthCheckCache(null);

    return {
      ok: false,
      statusCode: null,
      errorMessage:
        error?.name === 'AbortError'
          ? 'A verificação diária excedeu o tempo limite.'
          : error?.message || String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export default function App() {
  const webViewRef = useRef(null);
  const nativeLocationWatches = useRef(new Map());
  const pendingDownloads = useRef(new Map());
  const [savedUrl, setSavedUrl] = useState(null);
  const [loadingUrl, setLoadingUrl] = useState(true);
  const [loadingSite, setLoadingSite] = useState(false);
  const [healthCheckReady, setHealthCheckReady] = useState(false);
  const [healthCheckStatus, setHealthCheckStatus] = useState(null);
  const [error, setError] = useState(null);
  const [permissionMessage, setPermissionMessage] = useState('');
  const [downloadMessage, setDownloadMessage] = useState('');
  const [webPermissionsReady, setWebPermissionsReady] = useState(false);
  const [qrScanLocked, setQrScanLocked] = useState(false);
  const [scannerMessage, setScannerMessage] = useState('');
  const [deviceIdentity, setDeviceIdentity] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const identity = await getDeviceIdentity();
        setDeviceIdentity(identity);

        if (Platform.OS === 'android') {
          await requestAllAndroidPermissions();
        }

        const today = getLocalDateKey();
        const cachedHealth = await readHealthCheckCache();

        if (cachedHealth?.date === today && isPositiveStatus(cachedHealth.statusCode)) {
          setHealthCheckStatus(cachedHealth.statusCode);
          setHealthCheckReady(true);
          setSavedUrl(HEALTH_CHECK_URL);
          return;
        }

        const result = await performDailyHealthCheck();
        setHealthCheckStatus(result.statusCode);

        if (result.ok) {
          setHealthCheckReady(true);
          setSavedUrl(HEALTH_CHECK_URL);
          return;
        }

        setError(
          formatError('Aplicativo bloqueado pela verificação diária.', {
            url: HEALTH_CHECK_URL,
            statusCode: result.statusCode,
            description:
              result.statusCode
                ? `O servidor respondeu HTTP ${result.statusCode}. É necessário um status 2xx para liberar o aplicativo.`
                : result.errorMessage || 'Não foi possível verificar o servidor.',
          })
        );
      } catch (e) {
        setError(
          formatError('Não foi possível verificar o servidor de ativação.', {
            url: HEALTH_CHECK_URL,
            description: e?.message || String(e),
          })
        );
      } finally {
        setLoadingUrl(false);
      }
    })();
  }, []);


  useEffect(() => () => {
    for (const subscription of nativeLocationWatches.current.values()) {
      subscription.remove();
    }
    nativeLocationWatches.current.clear();
    pendingDownloads.current.clear();
  }, []);

  const requestAllAndroidPermissions = async () => {
    if (Platform.OS !== 'android' || webPermissionsReady) return;

    const denied = [];

    try {
      const cameraPermission = await Camera.getCameraPermissionsAsync();
      const cameraResult = cameraPermission.granted
        ? cameraPermission
        : await Camera.requestCameraPermissionsAsync();
      if (!cameraResult.granted) denied.push('câmera');

      const locationPermission = await Location.getForegroundPermissionsAsync();
      const locationResult = locationPermission.granted
        ? locationPermission
        : await Location.requestForegroundPermissionsAsync();
      if (!locationResult.granted) denied.push('localização');

      const mediaPermission = await MediaLibrary.getPermissionsAsync(true);
      const mediaResult = mediaPermission.status === 'granted'
        ? mediaPermission
        : await MediaLibrary.requestPermissionsAsync(true);
      if (mediaResult.status !== 'granted') denied.push('fotos/armazenamento');

      if (denied.length) {
        setPermissionMessage(
          `Permissão de ${denied.join(', ')} não concedida. Algumas funções do aplicativo podem não funcionar.`
        );
      } else {
        setPermissionMessage('');
      }
    } catch (e) {
      setPermissionMessage(`Não foi possível preparar as permissões do Android: ${e?.message || String(e)}`);
    } finally {
      setWebPermissionsReady(true);
    }
  };

  const requestMediaPermission = async () => {
    const permission = await MediaLibrary.getPermissionsAsync(true);
    if (permission.status === 'granted') return;

    const requested = await MediaLibrary.requestPermissionsAsync(true);
    if (requested.status !== 'granted') {
      throw new Error(`Permissão de armazenamento/fotos não concedida: ${requested.status}.`);
    }
  };

  const handleQrCodeScanned = async ({ data, type }) => {
    if (qrScanLocked || type !== 'qr') return;

    setQrScanLocked(true);
    setScannerMessage('');

    try {
      const normalized = normalizeUrl(data);
      setLoadingSite(true);
      setError(null);
      await AsyncStorage.setItem(URL_CACHE_KEY, normalized);
      setSavedUrl(normalized);
    } catch (e) {
      setLoadingSite(false);
      setQrScanLocked(false);
      setScannerMessage(e?.message || 'O QR Code precisa conter um site HTTP ou HTTPS.');
    }
  };

  const resetToScanner = async () => {
    setSavedUrl(null);
    setHealthCheckReady(false);
    setError(null);
    setPermissionMessage('');
    setDownloadMessage('');
    setQrScanLocked(false);
    setScannerMessage('');
    setLoadingSite(false);
  };


  const handleWebViewError = (event) => {
    const nativeEvent = event?.nativeEvent || {};
    const diagnostic = formatError('Falha de rede ou renderização. A URL foi mantida.', {
      url: savedUrl,
      description: nativeEvent.description || nativeEvent.message || 'O WebView não conseguiu carregar o conteúdo.',
      nativeEvent,
    });

    // Nunca apague a URL por erro de rede/renderização. Somente HTTP 401 pode encerrar a sessão.
    setLoadingSite(false);
    setError(diagnostic);
  };

  const handleHttpError = (event) => {
    const nativeEvent = event?.nativeEvent || {};
    const statusCode = nativeEvent.statusCode;

    if (statusCode === 401 && nativeEvent.isMainFrame !== false) {
      resetToScanner();
    }
  };

  const getSafeDownloadName = (filename, fallback = `arquivo-${Date.now()}.bin`) => {
    const value = (filename || fallback).trim();
    return value
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/\s+/g, '_')
      .slice(0, 180) || fallback;
  };

  const isImageFile = (filename, mimeType = '') => {
    if (/^image\//i.test(mimeType)) return true;
    return /\.(?:jpe?g|png|gif|webp|bmp|heic|heif)$/i.test(filename || '');
  };

  const persistDownloadedFile = async ({ filename, mimeType, writeFile }) => {
    const safeName = getSafeDownloadName(filename);
    const downloadsDirectory = new Directory(Paths.document, 'Downloads');
    if (!downloadsDirectory.exists) downloadsDirectory.create({ idempotent: true, intermediates: true });

    const destination = new File(downloadsDirectory, safeName);
    await writeFile(destination);

    if (isImageFile(safeName, mimeType)) {
      await requestMediaPermission();
      await MediaLibrary.saveToLibraryAsync(destination.uri);
    }

    return destination;
  };

  const downloadPhoto = async ({ url, filename, mimeType = '' }) => {
    try {
      setDownloadMessage('Baixando arquivo...');

      const safeName = getSafeDownloadName(filename || url.split('/').pop()?.split('?')[0]);
      const file = await persistDownloadedFile({
        filename: safeName,
        mimeType,
        writeFile: async (destination) => {
          const downloaded = await File.downloadFileAsync(url, destination, { idempotent: true });
          if (downloaded.uri !== destination.uri) downloaded.copy(destination);
        },
      });

      setDownloadMessage(isImageFile(safeName, mimeType) ? 'Foto salva no aparelho.' : 'Arquivo salvo no aparelho.');
      setTimeout(() => setDownloadMessage(''), 2500);
      return file;
    } catch (e) {
      const message = formatError('Falha ao baixar o arquivo.', {
        url,
        description: e?.message || String(e),
      });
      setDownloadMessage('');
      setError(message);
      return null;
    }
  };

  const finishBase64Download = async (transferId) => {
    const transfer = pendingDownloads.current.get(transferId);
    if (!transfer) return;

    pendingDownloads.current.delete(transferId);

    if (transfer.totalChunks > transfer.chunks.size) {
      setError(formatError('Falha ao baixar o arquivo.', {
        description: 'A transferência da WebView foi interrompida antes de receber todos os blocos.',
      }));
      return;
    }

    try {
      setDownloadMessage('Salvando arquivo...');
      const base64 = Array.from({ length: transfer.totalChunks }, (_, index) => transfer.chunks.get(index) || '').join('');
      const binary = global.atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }

      await persistDownloadedFile({
        filename: transfer.filename,
        mimeType: transfer.mimeType,
        writeFile: async (destination) => {
          destination.write(bytes);
        },
      });

      setDownloadMessage(isImageFile(transfer.filename, transfer.mimeType)
        ? 'Foto salva no aparelho.'
        : 'Arquivo salvo no aparelho.');
      setTimeout(() => setDownloadMessage(''), 2500);
    } catch (e) {
      setDownloadMessage('');
      setError(formatError('Falha ao salvar o arquivo recebido do site.', {
        description: e?.message || String(e),
      }));
    }
  };


  const sendNativeLocationResult = (data) => {
    const script = `window.__photoListNativeGeoDispatch && window.__photoListNativeGeoDispatch(${JSON.stringify(data)}); true;`;
    webViewRef.current?.injectJavaScript(script);
  };

  const mapLocationToWebPosition = (location) => ({
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy,
    altitude: location.coords.altitude,
    altitudeAccuracy: location.coords.altitudeAccuracy,
    heading: location.coords.heading,
    speed: location.coords.speed,
    timestamp: location.timestamp,
  });

  const sendNativeLocationError = (requestId, error) => {
    let code = 2;
    if (error?.code === 'E_LOCATION_UNAVAILABLE') code = 2;
    else if (error?.code === 'E_LOCATION_PERMISSION') code = 1;
    else if (error?.code === 'E_LOCATION_TIMEOUT') code = 3;

    sendNativeLocationResult({
      requestId,
      kind: 'error',
      code,
      message: error?.message || 'Não foi possível obter a localização.',
    });
  };

  const ensureNativeLocationPermission = async () => {
    const current = await Location.getForegroundPermissionsAsync();
    if (current.granted) return true;

    const requested = await Location.requestForegroundPermissionsAsync();
    return requested.granted;
  };

  const getNativeCurrentLocation = async (options = {}) => {
    if (!(await ensureNativeLocationPermission())) {
      const error = new Error('Permissão de localização não concedida.');
      error.code = 'E_LOCATION_PERMISSION';
      throw error;
    }

    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled && Platform.OS === 'android') {
      try {
        await Location.enableNetworkProviderAsync();
      } catch {
        const error = new Error('O serviço de localização do aparelho está desativado.');
        error.code = 'E_LOCATION_UNAVAILABLE';
        throw error;
      }
    }

    const accuracy = options.enableHighAccuracy
      ? Location.Accuracy.High
      : Location.Accuracy.Balanced;

    if (options.maximumAge > 0) {
      const lastKnown = await Location.getLastKnownPositionAsync({
        maxAge: options.maximumAge,
        requiredAccuracy: options.enableHighAccuracy ? 100 : 1000,
      });

      if (lastKnown && Date.now() - lastKnown.timestamp <= options.maximumAge) {
        return lastKnown;
      }
    }

    const timeout = Math.min(
      Math.max(3000, Number.isFinite(options.timeout) ? options.timeout : 10000),
      30000,
    );

    let timer;
    try {
      return await Promise.race([
        Location.getCurrentPositionAsync({ accuracy, mayShowUserSettingsDialog: true }),
        new Promise((_, reject) => {
          timer = setTimeout(() => {
            const error = new Error('A localização demorou para ficar disponível.');
            error.code = 'E_LOCATION_TIMEOUT';
            reject(error);
          }, timeout);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  const handleNativeLocationMessage = async (data) => {
    if (!data?.type || !data.requestId) return false;

    if (data.type === 'native-geolocation-get') {
      try {
        const location = await getNativeCurrentLocation(data.options);
        sendNativeLocationResult({
          requestId: data.requestId,
          kind: 'success',
          position: mapLocationToWebPosition(location),
        });
      } catch (e) {
        sendNativeLocationError(data.requestId, e);
      }
      return true;
    }

    if (data.type === 'native-geolocation-watch') {
      try {
        if (!(await ensureNativeLocationPermission())) {
          const error = new Error('Permissão de localização não concedida.');
          error.code = 'E_LOCATION_PERMISSION';
          throw error;
        }

        if (Platform.OS === 'android' && !(await Location.hasServicesEnabledAsync())) {
          try {
            await Location.enableNetworkProviderAsync();
          } catch {
            const error = new Error('O serviço de localização do aparelho está desativado.');
            error.code = 'E_LOCATION_UNAVAILABLE';
            throw error;
          }
        }

        const options = data.options || {};
        const subscription = await Location.watchPositionAsync(
          {
            accuracy: options.enableHighAccuracy ? Location.Accuracy.High : Location.Accuracy.Balanced,
            timeInterval: Math.max(1000, Number.isFinite(options.timeInterval) ? options.timeInterval : 5000),
            distanceInterval: Math.max(0, Number.isFinite(options.distanceInterval) ? options.distanceInterval : 0),
          },
          (location) => {
            sendNativeLocationResult({
              requestId: data.requestId,
              kind: 'success',
              position: mapLocationToWebPosition(location),
            });
          },
          (reason) => {
            const error = new Error(reason || 'Não foi possível obter a localização.');
            error.code = 'E_LOCATION_UNAVAILABLE';
            sendNativeLocationError(data.requestId, error);
          },
        );

        nativeLocationWatches.current.set(data.requestId, subscription);
      } catch (e) {
        sendNativeLocationError(data.requestId, e);
      }
      return true;
    }

    if (data.type === 'native-geolocation-clear-watch') {
      const subscription = nativeLocationWatches.current.get(data.requestId);
      if (subscription) {
        subscription.remove();
        nativeLocationWatches.current.delete(data.requestId);
      }
      return true;
    }

    return false;
  };

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data?.type?.startsWith('native-geolocation-')) {
        handleNativeLocationMessage(data);
        return;
      }
      if (data?.type === 'download-start' && data.transferId) {
        pendingDownloads.current.set(data.transferId, {
          filename: data.filename || `arquivo-${Date.now()}.bin`,
          mimeType: data.mimeType || 'application/octet-stream',
          totalChunks: Number(data.totalChunks) || 0,
          chunks: new Map(),
        });
        return;
      }

      if (data?.type === 'download-chunk' && data.transferId) {
        const transfer = pendingDownloads.current.get(data.transferId);
        if (transfer && Number.isInteger(data.index) && typeof data.data === 'string') {
          transfer.chunks.set(data.index, data.data);
        }
        return;
      }

      if (data?.type === 'download-end' && data.transferId) {
        finishBase64Download(data.transferId);
        return;
      }

      if (data?.type === 'download' && data.url) {
        downloadPhoto(data);
      }
    } catch {
      // Mensagens não-JSON do site são ignoradas.
    }
  };

  if (loadingUrl) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.muted}>Carregando configuração...</Text>
      </SafeAreaView>
    );
  }

  if (!healthCheckReady || !savedUrl) {
    return (
      <SafeAreaView style={styles.centered}>
        <StatusBar style="dark" />
        <View style={styles.card}>
          <Text style={styles.title}>JrBaseCentral</Text>
          <Text style={styles.subtitle}>
            Este aplicativo precisa validar o acesso ao servidor antes de abrir o conteúdo local.
          </Text>

          {healthCheckStatus ? (
            <Text style={styles.hint}>
              Último status verificado hoje: HTTP {healthCheckStatus}.
            </Text>
          ) : null}

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>Acesso indisponível</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <View style={styles.scanningLoading}>
              <ActivityIndicator size="large" />
              <Text style={styles.muted}>Verificando servidor...</Text>
            </View>
          )}

          <Text style={styles.hint}>
            Uma nova verificação será feita quando o cache diário não tiver um status HTTP 2xx válido.
          </Text>
        </View>
      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView style={styles.webContainer}>
      <StatusBar style="dark" />
      {permissionMessage ? (
        <View style={styles.permissionBanner}>
          <Text style={styles.permissionText}>{permissionMessage}</Text>
        </View>
      ) : null}

      {downloadMessage ? (
        <View style={styles.downloadBanner}>
          <Text style={styles.downloadText}>{downloadMessage}</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.webErrorBanner}>
          <Text style={styles.webErrorText}>
            O conteúdo local falhou ao renderizar no WebView. A verificação diária permanece registrada.
          </Text>
        </View>
      ) : null}

      <WebView
        ref={webViewRef}
        source={{ html: STATIC_SITE_HTML, baseUrl: HEALTH_CHECK_URL }}
        style={styles.web}
        originWhitelist={['http://*', 'https://*']}
        javaScriptEnabled
        domStorageEnabled
        cacheEnabled
        cacheMode={Platform.OS === 'android' ? 'LOAD_CACHE_ELSE_NETWORK' : undefined}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        geolocationEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
        javaScriptCanOpenWindowsAutomatically={false}
        setSupportMultipleWindows={false}
        allowsBackForwardNavigationGestures
        startInLoadingState
        injectedJavaScriptBeforeContentLoaded={deviceIdentity ? `${injectedLocationBridge}\n${buildDeviceIdentityInjection(deviceIdentity)}` : undefined}
        injectedJavaScript={injectedJavaScript}
        onMessage={handleMessage}
        onLoadStart={() => setLoadingSite(true)}
        onLoadEnd={() => {
          setLoadingSite(false);
          setError(null);
        }}
        onError={(event) => handleWebViewError(event)}
        onHttpError={handleHttpError}
        renderLoading={() => (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" />
            <Text style={styles.muted}>Carregando site...</Text>
          </View>
        )}
      />

      {loadingSite ? (
        <View pointerEvents="none" style={styles.topLoading}>
          <ActivityIndicator size="small" />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 34,
    paddingBottom: 34,
  },
  scannerHeader: {
    alignItems: 'center',
    maxWidth: 360,
  },
  scannerTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOpacity: 0.5,
    textShadowRadius: 8,
  },
  scannerSubtitle: {
    marginTop: 8,
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOpacity: 0.5,
    textShadowRadius: 8,
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderRadius: 24,
    backgroundColor: 'transparent',
  },
  scanCornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 44,
    height: 44,
    borderTopWidth: 5,
    borderLeftWidth: 5,
    borderColor: '#fff',
    borderTopLeftRadius: 18,
  },
  scanCornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 44,
    height: 44,
    borderTopWidth: 5,
    borderRightWidth: 5,
    borderColor: '#fff',
    borderTopRightRadius: 18,
  },
  scanCornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 44,
    height: 44,
    borderBottomWidth: 5,
    borderLeftWidth: 5,
    borderColor: '#fff',
    borderBottomLeftRadius: 18,
  },
  scanCornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 44,
    height: 44,
    borderBottomWidth: 5,
    borderRightWidth: 5,
    borderColor: '#fff',
    borderBottomRightRadius: 18,
  },
  scannerFooter: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    gap: 10,
  },
  scannerHint: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOpacity: 0.5,
    textShadowRadius: 8,
  },
  scannerError: {
    color: '#fecaca',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOpacity: 0.6,
    textShadowRadius: 8,
  },
  scanningLoading: {
    alignItems: 'center',
    gap: 6,
  },
  scannerPermission: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(17, 24, 39, 0.88)',
    borderRadius: 12,
  },
  webErrorBanner: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#7f1d1d',
  },
  webErrorText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
  },
  container: {
    flex: 1,
    backgroundColor: '#f6f7fb',
    justifyContent: 'center',
    padding: 24,
  },
  webContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
    color: '#111827',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4b5563',
    marginBottom: 20,
  },
  primaryButton: {
    marginTop: 14,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: 10,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  secondaryButtonText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
  hint: {
    marginTop: 14,
    fontSize: 12,
    lineHeight: 18,
    color: '#6b7280',
    textAlign: 'center',
  },
  warning: {
    marginTop: 12,
    color: '#92400e',
    lineHeight: 20,
  },
  errorBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#991b1b',
    marginBottom: 14,
  },
  errorText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    lineHeight: 18,
    color: '#374151',
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  linkText: {
    color: '#2563eb',
    fontWeight: '600',
  },
  web: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  topLoading: {
    position: 'absolute',
    top: 8,
    right: 12,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 8,
    elevation: 2,
  },
  muted: {
    color: '#6b7280',
  },
  permissionBanner: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#fff7ed',
    borderBottomWidth: 1,
    borderBottomColor: '#fed7aa',
  },
  permissionText: {
    color: '#9a3412',
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
  },
  downloadBanner: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#111827',
  },
  downloadText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 13,
  },
});
