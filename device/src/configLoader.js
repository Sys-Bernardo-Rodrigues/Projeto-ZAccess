const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'config.json');
const DEFAULT_PATH = path.join(__dirname, '..', 'config.default.json');

function load() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    if (e.code === 'ENOENT') {
      try {
        const raw = fs.readFileSync(DEFAULT_PATH, 'utf8');
        return JSON.parse(raw);
      } catch (_) {}
    }
  }
  return {
    gpio: { relays: { 1: 5, 2: 6, 3: 13, 4: 19 } },
  };
}

function save(data) {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf8');
  return load();
}

module.exports = { load, save, CONFIG_PATH };
