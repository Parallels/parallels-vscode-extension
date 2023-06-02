export class CacheService {
  private cache: Map<string, any>;

  constructor() {
    this.cache = new Map<string, any>();
  }

  set(key: string, value: any) {
    this.cache.set(key, value);
  }

  get(key: string): any {
    return this.cache.get(key);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string) {
    this.cache.delete(key);
  }
}
