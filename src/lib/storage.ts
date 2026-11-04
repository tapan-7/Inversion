/**
 * SSR-safe local storage abstraction with JSON serialization and memory fallback.
 */
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

function getStorage(): Storage {
  if (typeof window === 'undefined') {
    return new MemoryStorage();
  }
  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch {
    return new MemoryStorage();
  }
}

export const safeStorage = {
  get<T>(key: string, fallback: T): T {
    try {
      const item = getStorage().getItem(key);
      if (!item) return fallback;
      return JSON.parse(item) as T;
    } catch {
      return fallback;
    }
  },

  getString(key: string, fallback = ''): string {
    try {
      return getStorage().getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  },

  set<T>(key: string, value: T): boolean {
    try {
      getStorage().setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  setString(key: string, value: string): boolean {
    try {
      getStorage().setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },

  remove(key: string): boolean {
    try {
      getStorage().removeItem(key);
      return true;
    } catch {
      return false;
    }
  },
};

