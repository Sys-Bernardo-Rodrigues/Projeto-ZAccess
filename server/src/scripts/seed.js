const mongoose = require('mongoose');
const User = require('../models/User');
const Location = require('../models/Location');
const Device = require('../models/Device');
const Relay = require('../models/Relay');
const Input = require('../models/Input');
const config = require('../config/env');

const seed = async () => {
    try {
        await mongoose.connect(config.mongo.uri);
        console.log('🌱 Iniciando seed...');

        // 1. Limpar dados existentes (opcional)
        await User.deleteMany({});
        await Location.deleteMany({});
        await Device.deleteMany({});
        await Relay.deleteMany({});
        await Input.deleteMany({});

        // 2. Criar Usuário Admin
        const admin = await User.create({
            name: 'Administrador Zaccess',
            email: 'admin@zaccess.com.br',
            password: 'admin123_password',
            role: 'admin'
        });
        console.log('✅ Usuário admin criado: admin@zaccess.com.br / admin123_password');

        // 3. Criar Local
        const local = await Location.create({
            name: 'Escritório Central',
            address: 'Av. Paulista, 1000 - São Paulo',
            description: 'Sede administrativa e datacenter local',
            createdBy: admin._id
        });
        console.log('✅ Local criado: Escritório Central');

        // 4. Criar Dispositivo
        const device = await Device.create({
            name: 'GATEWAY-01',
            serialNumber: 'GW-TEST-001',
            locationId: local._id,
            status: 'offline',
            metadata: {
                model: 'Gateway IoT',
                firmware: '1.0.0',
                totalRelays: 4
            }
        });
        console.log('✅ Dispositivo criado: GATEWAY-01 (Serial: GW-TEST-001)');

        // 5. Criar Relés para o dispositivo (gpioPin = número BCM: 5, 6, 13, 19)
        const relayData = [
            { name: 'Porta Principal', type: 'door', channel: 1, gpioPin: 5, mode: 'pulse', deviceId: device._id },
            { name: 'Portão Garagem', type: 'gate', channel: 2, gpioPin: 6, mode: 'pulse', deviceId: device._id },
            { name: 'Iluminação Corredor', type: 'light', channel: 3, gpioPin: 13, mode: 'toggle', deviceId: device._id },
            { name: 'Ar Condicionado', type: 'automation', channel: 4, gpioPin: 19, mode: 'toggle', deviceId: device._id }
        ];

        await Relay.insertMany(relayData);
        console.log('✅ 4 Relés configurados para o dispositivo');

        // 6. Criar Sensores (Inputs)
        const inputData = [
            { name: 'Sensor Porta Principal', type: 'door_sensor', gpioPin: 25, deviceId: device._id, activeLow: true },
            { name: 'Botão Pânico', type: 'emergency', gpioPin: 23, deviceId: device._id, activeLow: true }
        ];

        await Input.insertMany(inputData);
        console.log('✅ 2 Sensores configurados para o dispositivo');

        console.log('🚀 Seed finalizado com sucesso!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro no seed:', error);
        process.exit(1);
    }
};

seed();
