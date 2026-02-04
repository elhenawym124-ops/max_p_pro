// Simple in-memory cache for page tokens
const cache = new Map();

module.exports = {
  set: (key, value) => {
    cache.set(key, value);
  },
  
  get: (key) => {
    return cache.get(key);
  },
  
  has: (key) => {
    return cache.has(key);
  },
  
  delete: (key) => {
    return cache.delete(key);
  },
  
  clear: () => {
    cache.clear();
  },
  
  size: () => {
    return cache.size;
  }
};