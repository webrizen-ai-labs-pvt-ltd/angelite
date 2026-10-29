// Clips made on the user's device are kept on that device, never uploaded:
//  - "folder": a real folder the user picks (File System Access API: Chrome, Edge, Opera on desktop). Files are plain
//    .wav files they can open in any app. The browser asks for permission once per visit (or "allow on every visit").
//  - "browser": the browser's private file storage (OPFS), which works everywhere but isn't visible as a folder.
// Clip details (text, voice, length) live in IndexedDB so History can list them.

export type LocalClip = {
    id: string;
    createdAt: string;
    text: string;
    voiceName: string;
    durationSeconds: number;
    fileName: string;
    size: number;
    location: "folder" | "browser";
};

export type StorageInfo =
    { mode: "browser"; supportsFolders: boolean } | { mode: "folder"; supportsFolders: true; folderName: string; permission: PermissionState };

// Not yet in TypeScript's DOM types.
type PermissionedHandle = FileSystemDirectoryHandle & {
    queryPermission(options: { mode: "readwrite" }): Promise<PermissionState>;
    requestPermission(options: { mode: "readwrite" }): Promise<PermissionState>;
};
type DirectoryPicker = (options?: { id?: string; mode?: "readwrite"; startIn?: string }) => Promise<FileSystemDirectoryHandle>;

const DB_NAME = "angelite-local";
const BROWSER_FOLDER = "angelite-clips";

// ---------------------------------------------------------------------------
// Tiny IndexedDB helpers
// ---------------------------------------------------------------------------

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
            request.result.createObjectStore("settings");
            request.result.createObjectStore("clips", { keyPath: "id" });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function tx<T>(store: "settings" | "clips", mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const request = run(db.transaction(store, mode).objectStore(store));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    }).finally(() => db.close()) as Promise<T>;
}

const getFolderHandle = () => tx<PermissionedHandle | undefined>("settings", "readonly", (store) => store.get("folder"));

// ---------------------------------------------------------------------------
// Where clips go
// ---------------------------------------------------------------------------

export const supportsFolders = () => typeof window !== "undefined" && "showDirectoryPicker" in window;

export async function getStorageInfo(): Promise<StorageInfo> {
    const handle = supportsFolders() ? await getFolderHandle() : undefined;
    if (!handle) return { mode: "browser", supportsFolders: supportsFolders() };
    return { mode: "folder", supportsFolders: true, folderName: handle.name, permission: await handle.queryPermission({ mode: "readwrite" }) };
}

/** Opens the system folder picker. Must be called from a click. Returns false if the user cancelled. */
export async function chooseFolder() {
    try {
        const picker = (window as unknown as { showDirectoryPicker: DirectoryPicker }).showDirectoryPicker;
        const handle = await picker({ id: "angelite-clips", mode: "readwrite", startIn: "music" });
        await tx("settings", "readwrite", (store) => store.put(handle, "folder"));
        return true;
    } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return false;
        throw error;
    }
}

/** Switches back to the browser's private storage. Files already in the folder stay there. */
export const switchToBrowserStorage = () => tx("settings", "readwrite", (store) => store.delete("folder"));

/**
 * Makes sure we can write to the chosen folder, asking again if the browser forgot (it does between visits).
 * Call it from a click, before any long work, because the permission prompt needs a recent user gesture.
 */
export async function ensureFolderAccess() {
    const handle = supportsFolders() ? await getFolderHandle() : undefined;
    if (!handle) return true;
    if ((await handle.queryPermission({ mode: "readwrite" })) === "granted") return true;
    return (await handle.requestPermission({ mode: "readwrite" })) === "granted";
}

async function browserFolder() {
    // Ask the browser not to clear these files under storage pressure. Best effort; it may say no.
    void navigator.storage.persist?.();
    const root = await navigator.storage.getDirectory();
    return root.getDirectoryHandle(BROWSER_FOLDER, { create: true });
}

/** Returns the folder for a clip's location, or null if the user's folder isn't accessible right now. */
async function folderFor(location: LocalClip["location"]) {
    if (location === "browser") return browserFolder();
    const handle = await getFolderHandle();
    if (!handle || (await handle.queryPermission({ mode: "readwrite" })) !== "granted") return null;
    return handle;
}

// ---------------------------------------------------------------------------
// Clips
// ---------------------------------------------------------------------------

const slug = (value: string) =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 30) || "voice";

const stamp = (date: Date) => date.toISOString().slice(0, 19).replace("T", "_").replaceAll(":", "-");

export async function saveClip(audio: Blob, details: { text: string; voiceName: string; durationSeconds: number }): Promise<LocalClip> {
    const userFolder = supportsFolders() ? await getFolderHandle() : undefined;
    const usable = userFolder && (await userFolder.queryPermission({ mode: "readwrite" })) === "granted" ? userFolder : null;
    const folder = usable ?? (await browserFolder());
    const createdAt = new Date();
    const fileName = `angelite-${slug(details.voiceName)}-${stamp(createdAt)}.wav`;

    const file = await folder.getFileHandle(fileName, { create: true });
    const writable = await file.createWritable();
    await writable.write(audio);
    await writable.close();

    const clip: LocalClip = {
        id: crypto.randomUUID(),
        createdAt: createdAt.toISOString(),
        text: details.text,
        voiceName: details.voiceName,
        durationSeconds: details.durationSeconds,
        fileName,
        size: audio.size,
        location: usable ? "folder" : "browser",
    };
    await tx("clips", "readwrite", (store) => store.put(clip));
    return clip;
}

export async function listClips(): Promise<LocalClip[]> {
    const clips = await tx<LocalClip[]>("clips", "readonly", (store) => store.getAll());
    return clips.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** The clip's audio, or null when its folder needs permission again or the file was moved/deleted outside the app. */
export async function readClip(clip: LocalClip): Promise<File | null> {
    const folder = await folderFor(clip.location);
    if (!folder) return null;
    try {
        return await (await folder.getFileHandle(clip.fileName)).getFile();
    } catch {
        return null;
    }
}

export async function deleteClip(clip: LocalClip) {
    const folder = await folderFor(clip.location);
    await folder?.removeEntry(clip.fileName).catch(() => {}); // already gone is fine
    await tx("clips", "readwrite", (store) => store.delete(clip.id));
}
