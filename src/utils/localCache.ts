import AsyncStorage from "@react-native-async-storage/async-storage";

export type CacheCollection = "menus" | "recipes" | "categories" | "nurseryMenus";

const CACHE_VERSION = "v1";
const CACHE_PREFIX = `mealplanner:cache:${CACHE_VERSION}`;
const CACHE_WRITE_DELAY_MS = 750;
const CACHE_COLLECTIONS: CacheCollection[] = [
  "menus",
  "recipes",
  "categories",
  "nurseryMenus",
];

const pendingWrites = new Map<string, ReturnType<typeof setTimeout>>();
const inFlightWrites = new Map<string, Promise<void>>();
const suspendedHouseholds = new Set<string>();

function cacheKey(householdId: string, collectionName: CacheCollection): string {
  return `${CACHE_PREFIX}:${householdId}:${collectionName}`;
}

export async function readLocalCache<T>(
  householdId: string,
  collectionName: CacheCollection
): Promise<T | null> {
  suspendedHouseholds.delete(householdId);

  try {
    const value = await AsyncStorage.getItem(cacheKey(householdId, collectionName));
    return value === null ? null : JSON.parse(value) as T;
  } catch {
    return null;
  }
}

async function persistLocalCache(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    // キャッシュの保存失敗はFirestore同期や画面操作へ伝播させない。
  }
}

export function writeLocalCacheDebounced<T>(
  householdId: string,
  collectionName: CacheCollection,
  value: T
): void {
  if (suspendedHouseholds.has(householdId)) return;

  const key = cacheKey(householdId, collectionName);

  try {
    const serialized = JSON.stringify(value);
    const pending = pendingWrites.get(key);
    if (pending !== undefined) clearTimeout(pending);

    const timer = setTimeout(() => {
      pendingWrites.delete(key);
      if (suspendedHouseholds.has(householdId)) return;

      const write = persistLocalCache(key, serialized);
      inFlightWrites.set(key, write);
      void write.finally(() => {
        if (inFlightWrites.get(key) === write) inFlightWrites.delete(key);
      });
    }, CACHE_WRITE_DELAY_MS);
    pendingWrites.set(key, timer);
  } catch {
    // シリアライズ不能な値もキャッシュ無しとして扱う。
  }
}

export async function clearHouseholdCache(householdId: string): Promise<void> {
  suspendedHouseholds.add(householdId);

  try {
    const keys = CACHE_COLLECTIONS.map((collectionName) =>
      cacheKey(householdId, collectionName)
    );

    keys.forEach((key) => {
      const pending = pendingWrites.get(key);
      if (pending !== undefined) clearTimeout(pending);
      pendingWrites.delete(key);
    });

    await Promise.all(keys.map((key) => inFlightWrites.get(key)).filter(
      (write): write is Promise<void> => write !== undefined
    ));
    await AsyncStorage.multiRemove(keys);
  } catch {
    // キャッシュ削除失敗でもログアウトを継続できるようにする。
  }
}
