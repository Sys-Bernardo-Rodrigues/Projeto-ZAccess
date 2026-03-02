db = db.getSiblingDB('zacess');

db.createCollection('users');
db.createCollection('devices');
db.createCollection('locations');
db.createCollection('relays');
db.createCollection('activitylogs');

// Index para busca rápida de dispositivos por status
db.devices.createIndex({ status: 1 });
db.devices.createIndex({ locationId: 1 });
db.devices.createIndex({ serialNumber: 1 }, { unique: true });

// Index para logs por data
db.activitylogs.createIndex({ createdAt: -1 });
db.activitylogs.createIndex({ deviceId: 1, createdAt: -1 });

print('✅ Zacess database initialized successfully');
