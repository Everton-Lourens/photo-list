// --- Armazenamento local (IndexedDB) ---
//
// Site 100% estático: usamos IndexedDB no navegador para persistir fotos,
// rascunho da mensagem e preferências, sobrevivendo a atualizações de página
// (F5) sem exigir backend. Estrutura de object stores:
//
//   photo-list-db
//   ├── photos    (chave "photo-XXX")  -> { blob, label, date, location, source, originalName }
//   ├── drafts    (chave "draft-001")  -> dados dos campos da mensagem da OS
//   └── settings  (chave livre)        -> preferências pequenas (ex.: câmera)
//
// Todas as operações retornam Promises. Falhas de IndexedDB (modo privado,
// quota, navegador antigo) nunca devem travar o app: quem chama trata o
// catch e segue funcionando apenas em memória.

const PHOTO_LIST_DB_NAME = "photo-list-db";
const PHOTO_LIST_DB_VERSION = 1;
const PHOTO_LIST_STORES = ["photos", "drafts", "settings"];

let dbPromise = null;

function openPhotoListDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB indisponível neste navegador."));
      return;
    }
    const request = indexedDB.open(PHOTO_LIST_DB_NAME, PHOTO_LIST_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      PHOTO_LIST_STORES.forEach((name) => {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name);
        }
      });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Falha ao abrir o IndexedDB."));
  });
  return dbPromise;
}

function withStore(storeName, mode, task) {
  return openPhotoListDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    let result;
    task(store, (value) => { result = value; });
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error || new Error(`Falha na transação de "${storeName}".`));
    tx.onabort = () => reject(tx.error || new Error(`Transação de "${storeName}" abortada.`));
  }));
}

async function dbSet(storeName, key, value) {
  return withStore(storeName, "readwrite", (store) => store.put(value, key));
}

async function dbGet(storeName, key) {
  return withStore(storeName, "readonly", (store, setResult) => {
    const req = store.get(key);
    req.onsuccess = () => setResult(req.result);
  });
}

async function dbDelete(storeName, key) {
  return withStore(storeName, "readwrite", (store) => store.delete(key));
}

async function dbClear(storeName) {
  return withStore(storeName, "readwrite", (store) => store.clear());
}

async function dbGetAllEntries(storeName) {
  return withStore(storeName, "readonly", (store, setResult) => {
    const keys = [];
    const values = [];
    const keyReq = store.openCursor();
    keyReq.onsuccess = () => {
      const cursor = keyReq.result;
      if (cursor) {
        keys.push(cursor.key);
        values.push(cursor.value);
        cursor.continue();
      } else {
        setResult(keys.map((key, i) => ({ key, value: values[i] })));
      }
    };
  });
}

async function dbClearAll() {
  for (const name of PHOTO_LIST_STORES) {
    await dbClear(name);
  }
}

window.PhotoListDB = {
  set: dbSet,
  get: dbGet,
  delete: dbDelete,
  clear: dbClear,
  clearAll: dbClearAll,
  getAllEntries: dbGetAllEntries,
};
