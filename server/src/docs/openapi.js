const swaggerJsdoc = require('swagger-jsdoc');
const config = require('../config/env');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Zaccess API',
            version: '1.0.0',
            description:
                'Documentação OpenAPI da API Zaccess (dispositivos, locais, usuários, automações, agendamentos e convites).',
        },
        servers: [
            {
                url: `http://localhost:${config.server.port}`,
                description: 'Desenvolvimento local',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Token JWT obtido em /api/auth/login',
                },
            },
            schemas: {
                LoginRequest: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: { type: 'string', format: 'email', example: 'admin@zaccess.com.br' },
                        password: { type: 'string', example: 'admin123_password' },
                    },
                },
                AuthResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        data: {
                            type: 'object',
                            properties: {
                                token: { type: 'string', description: 'JWT para acessar rotas protegidas' },
                                user: {
                                    type: 'object',
                                    properties: {
                                        id: { type: 'string' },
                                        name: { type: 'string' },
                                        email: { type: 'string', format: 'email' },
                                        role: { type: 'string', example: 'admin' },
                                    },
                                },
                            },
                        },
                        message: { type: 'string', example: 'Login realizado com sucesso.' },
                    },
                },
                ApiResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: { nullable: true },
                        message: { type: 'string', nullable: true },
                    },
                },
                Device: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        name: { type: 'string', example: 'RPI-GATEWAY-01' },
                        serial: { type: 'string', example: 'RPi4-TEST-001' },
                        locationId: { type: 'string' },
                        online: { type: 'boolean' },
                    },
                },
                Relay: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        deviceId: { type: 'string' },
                        channel: { type: 'integer', example: 1 },
                        name: { type: 'string', example: 'Portão principal' },
                        type: {
                            type: 'string',
                            enum: ['door', 'gate', 'light', 'lock', 'automation', 'other'],
                        },
                        gpioPin: { type: 'integer', example: 17 },
                        state: {
                            type: 'string',
                            enum: ['open', 'closed'],
                            example: 'closed',
                        },
                        mode: {
                            type: 'string',
                            enum: ['toggle', 'pulse', 'hold'],
                            example: 'pulse',
                        },
                        pulseDuration: { type: 'integer', example: 1000, description: 'Duração do pulso em ms' },
                        active: { type: 'boolean', example: true },
                    },
                },
                Input: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        name: { type: 'string', example: 'Sensor porta garagem' },
                        type: {
                            type: 'string',
                            enum: ['door_sensor', 'motion', 'button', 'emergency', 'other'],
                            example: 'door_sensor',
                        },
                        gpioPin: { type: 'integer', example: 23 },
                        activeLow: {
                            type: 'boolean',
                            example: true,
                            description: 'Se verdadeiro, nível baixo (GND) significa ativo.',
                        },
                        state: {
                            type: 'string',
                            enum: ['active', 'inactive'],
                            example: 'inactive',
                        },
                        deviceId: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                Automation: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        name: { type: 'string', example: 'Abrir portão quando campainha' },
                        enabled: { type: 'boolean', example: true },
                        trigger: {
                            type: 'object',
                            properties: {
                                type: {
                                    type: 'string',
                                    enum: ['input_state_change'],
                                    example: 'input_state_change',
                                },
                                inputId: { type: 'string' },
                                condition: {
                                    type: 'string',
                                    enum: ['active', 'inactive'],
                                    example: 'active',
                                },
                            },
                        },
                        action: {
                            type: 'object',
                            properties: {
                                type: {
                                    type: 'string',
                                    enum: ['relay_control'],
                                    example: 'relay_control',
                                },
                                relayId: { type: 'string' },
                                command: {
                                    type: 'string',
                                    enum: ['on', 'off', 'pulse'],
                                    example: 'pulse',
                                },
                                duration: {
                                    type: 'integer',
                                    example: 1000,
                                    description: 'Duração do pulso em ms (quando command=pulse).',
                                },
                            },
                        },
                        createdBy: { type: 'string' },
                        lastRun: { type: 'string', format: 'date-time', nullable: true },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                Invitation: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        name: { type: 'string', example: 'Convidado João' },
                        token: {
                            type: 'string',
                            description: 'Token público usado na URL do convite.',
                            example: 'a1b2c3d4e5f6g7h8i9j0',
                        },
                        relayIds: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Lista de relés liberados para esse convite.',
                        },
                        validFrom: { type: 'string', format: 'date-time' },
                        validUntil: { type: 'string', format: 'date-time' },
                        active: { type: 'boolean', example: true },
                        locationId: { type: 'string', nullable: true },
                        createdBy: { type: 'string', nullable: true },
                        createdByLocationUser: { type: 'string', nullable: true },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                Schedule: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        name: { type: 'string', example: 'Abrir portão às 8h (seg-sex)' },
                        relayId: { type: 'string' },
                        action: {
                            type: 'string',
                            enum: ['open', 'close', 'pulse'],
                            example: 'open',
                        },
                        daysOfWeek: {
                            type: 'array',
                            items: { type: 'integer', minimum: 0, maximum: 6 },
                            example: [1, 2, 3, 4, 5],
                            description: '0=Dom, 1=Seg, ..., 6=Sáb',
                        },
                        time: {
                            type: 'string',
                            example: '08:00',
                            description: 'Horário no formato HH:mm',
                        },
                        enabled: { type: 'boolean', example: true },
                        lastRun: { type: 'string', format: 'date-time', nullable: true },
                        createdBy: { type: 'string', nullable: true },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                ActivityLog: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        action: {
                            type: 'string',
                            enum: [
                                'device_connected',
                                'device_disconnected',
                                'relay_activated',
                                'relay_deactivated',
                                'device_registered',
                                'device_updated',
                                'device_removed',
                                'relay_created',
                                'relay_updated',
                                'location_created',
                                'user_login',
                                'user_logout',
                                'command_sent',
                                'command_response',
                                'heartbeat_timeout',
                                'emergency_alert',
                                'input_created',
                                'schedule_created',
                                'schedule_executed',
                                'automation_executed',
                                'invitation_created',
                                'public_access_invitation',
                            ],
                            example: 'relay_activated',
                        },
                        severity: {
                            type: 'string',
                            enum: ['info', 'warning', 'danger', 'critical'],
                            example: 'info',
                        },
                        description: { type: 'string', example: 'Relé Portão principal acionado via painel.' },
                        deviceId: { type: 'string', nullable: true },
                        relayId: { type: 'string', nullable: true },
                        userId: { type: 'string', nullable: true },
                        metadata: {
                            type: 'object',
                            additionalProperties: true,
                            example: { source: 'panel', ip: '192.168.1.10' },
                        },
                        ipAddress: { type: 'string', nullable: true },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                Location: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        name: { type: 'string', example: 'Escritório Central' },
                        address: {
                            type: 'string',
                            example: 'Av. Paulista, 1000 - São Paulo',
                        },
                        description: {
                            type: 'string',
                            example: 'Sede administrativa e datacenter local',
                        },
                        coordinates: {
                            type: 'object',
                            properties: {
                                lat: { type: 'number', example: -23.561414 },
                                lng: { type: 'number', example: -46.655881 },
                            },
                        },
                        active: { type: 'boolean', example: true },
                        createdBy: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                User: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        name: { type: 'string', example: 'Administrador Zaccess' },
                        email: { type: 'string', format: 'email', example: 'admin@zaccess.com.br' },
                        role: {
                            type: 'string',
                            enum: ['admin', 'operator', 'viewer'],
                        },
                        active: { type: 'boolean', example: true },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                LocationUser: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        locationId: { type: 'string' },
                        name: { type: 'string', example: 'João da Silva' },
                        email: {
                            type: 'string',
                            format: 'email',
                            example: 'joao.silva@example.com',
                        },
                        role: {
                            type: 'string',
                            enum: ['morador', 'sindico'],
                            example: 'morador',
                        },
                        active: { type: 'boolean', example: true },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
        tags: [
            { name: 'Auth', description: 'Autenticação e usuário admin' },
            { name: 'AppAuth', description: 'Autenticação de moradores/síndicos (LocationUser)' },
            { name: 'Devices', description: 'Dispositivos físicos (Raspberry Pi, gateways, etc.)' },
            { name: 'Relays', description: 'Relés associados a dispositivos' },
            { name: 'Inputs', description: 'Sensores / entradas digitais' },
            { name: 'Locations', description: 'Locais (condomínios, escritórios, etc.)' },
            { name: 'Users', description: 'Usuários administradores do sistema' },
            { name: 'LocationUsers', description: 'Moradores e síndicos vinculados a um local' },
            { name: 'Invitations', description: 'Convites de acesso' },
            { name: 'Schedules', description: 'Agendamentos de automações' },
            { name: 'Automations', description: 'Automações baseadas em regras' },
            { name: 'Logs', description: 'Logs de atividades e eventos' },
            { name: 'Reports', description: 'Relatórios agregados' },
            { name: 'App', description: 'Endpoints usados pelo app Flutter' },
            { name: 'System', description: 'Health check e informações do servidor' },
        ],
        paths: {
            // ============================
            // Auth
            // ============================
            '/api/auth/login': {
                post: {
                    tags: ['Auth'],
                    summary: 'Login de usuário admin',
                    description:
                        'Autentica um usuário administrador (role admin) e retorna um token JWT para uso nas demais rotas.',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/LoginRequest' },
                            },
                        },
                    },
                    responses: {
                        200: {
                            description: 'Login realizado com sucesso.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/AuthResponse' },
                                },
                            },
                        },
                        401: {
                            description: 'Credenciais inválidas.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                    },
                },
            },
            '/api/auth/location-user/login': {
                post: {
                    tags: ['AppAuth'],
                    summary: 'Login de morador/síndico (LocationUser)',
                    description:
                        'Autentica um usuário vinculado a um local (morador ou síndico) para uso no app Flutter / app web.',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    allOf: [{ $ref: '#/components/schemas/LoginRequest' }],
                                },
                            },
                        },
                    },
                    responses: {
                        200: {
                            description: 'Login realizado com sucesso.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/AuthResponse' },
                                },
                            },
                        },
                        401: {
                            description: 'Credenciais inválidas ou usuário do local desativado.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                    },
                },
            },
            '/api/auth/me': {
                get: {
                    tags: ['Auth'],
                    summary: 'Dados do usuário autenticado',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: {
                            description: 'Dados do usuário atual.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                        401: {
                            description: 'Token ausente, inválido ou expirado.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                    },
                },
            },

            // ============================
            // Devices
            // ============================
            '/api/devices': {
                get: {
                    tags: ['Devices'],
                    summary: 'Lista dispositivos',
                    description:
                        'Retorna a lista de dispositivos cadastrados. Requer autenticação com usuário admin.',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: {
                            description: 'Lista de dispositivos.',
                            content: {
                                'application/json': {
                                    schema: {
                                        allOf: [
                                            { $ref: '#/components/schemas/ApiResponse' },
                                            {
                                                type: 'object',
                                                properties: {
                                                    data: {
                                                        type: 'array',
                                                        items: { $ref: '#/components/schemas/Device' },
                                                    },
                                                },
                                            },
                                        ],
                                    },
                                },
                            },
                        },
                    },
                },
                post: {
                    tags: ['Devices'],
                    summary: 'Cria dispositivo',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['name', 'serial', 'locationId'],
                                    properties: {
                                        name: { type: 'string' },
                                        serial: { type: 'string' },
                                        locationId: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        201: {
                            description: 'Dispositivo criado.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                    },
                },
            },
            '/api/devices/{id}': {
                get: {
                    tags: ['Devices'],
                    summary: 'Detalhes de um dispositivo',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: { type: 'string' },
                        },
                    ],
                    responses: {
                        200: {
                            description: 'Dispositivo encontrado.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                        404: {
                            description: 'Dispositivo não encontrado.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                    },
                },
                put: {
                    tags: ['Devices'],
                    summary: 'Atualiza dispositivo',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: { type: 'string' },
                        },
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        name: { type: 'string' },
                                        serial: { type: 'string' },
                                        locationId: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: {
                            description: 'Dispositivo atualizado.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                    },
                },
                delete: {
                    tags: ['Devices'],
                    summary: 'Remove dispositivo',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: { type: 'string' },
                        },
                    ],
                    responses: {
                        200: {
                            description: 'Dispositivo removido.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                    },
                },
            },

            // ============================
            // Locations
            // ============================
            '/api/locations': {
                get: {
                    tags: ['Locations'],
                    summary: 'Lista locais',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: {
                            description: 'Lista de locais.',
                            content: {
                                'application/json': {
                                    schema: {
                                        allOf: [
                                            { $ref: '#/components/schemas/ApiResponse' },
                                            {
                                                type: 'object',
                                                properties: {
                                                    data: {
                                                        type: 'array',
                                                        items: { $ref: '#/components/schemas/Location' },
                                                    },
                                                },
                                            },
                                        ],
                                    },
                                },
                            },
                        },
                    },
                },
                post: {
                    tags: ['Locations'],
                    summary: 'Cria local',
                    description: 'Disponível para usuários com papel admin ou operator.',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['name'],
                                    properties: {
                                        name: { type: 'string' },
                                        address: { type: 'string' },
                                        description: { type: 'string' },
                                        coordinates: {
                                            type: 'object',
                                            properties: {
                                                lat: { type: 'number' },
                                                lng: { type: 'number' },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        201: {
                            description: 'Local criado.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                    },
                },
            },
            '/api/locations/{id}': {
                get: {
                    tags: ['Locations'],
                    summary: 'Detalhes de um local',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: { type: 'string' },
                        },
                    ],
                    responses: {
                        200: {
                            description: 'Local encontrado.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                        404: {
                            description: 'Local não encontrado.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                    },
                },
                put: {
                    tags: ['Locations'],
                    summary: 'Atualiza local',
                    description: 'Disponível para usuários com papel admin ou operator.',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: { type: 'string' },
                        },
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        name: { type: 'string' },
                                        address: { type: 'string' },
                                        description: { type: 'string' },
                                        coordinates: {
                                            type: 'object',
                                            properties: {
                                                lat: { type: 'number' },
                                                lng: { type: 'number' },
                                            },
                                        },
                                        active: { type: 'boolean' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: {
                            description: 'Local atualizado.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                    },
                },
                delete: {
                    tags: ['Locations'],
                    summary: 'Remove local',
                    description: 'Disponível apenas para usuários com papel admin.',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: { type: 'string' },
                        },
                    ],
                    responses: {
                        200: {
                            description: 'Local removido.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                    },
                },
            },

            // ============================
            // Relays
            // ============================
            '/api/relays': {
                get: {
                    tags: ['Relays'],
                    summary: 'Lista relés',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: {
                            description: 'Lista de relés.',
                            content: {
                                'application/json': {
                                    schema: {
                                        allOf: [
                                            { $ref: '#/components/schemas/ApiResponse' },
                                            {
                                                type: 'object',
                                                properties: {
                                                    data: {
                                                        type: 'array',
                                                        items: { $ref: '#/components/schemas/Relay' },
                                                    },
                                                },
                                            },
                                        ],
                                    },
                                },
                            },
                        },
                    },
                },
                post: {
                    tags: ['Relays'],
                    summary: 'Cria relé',
                    description: 'Disponível para usuários com papel admin ou operator.',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['name', 'type', 'gpioPin', 'channel', 'deviceId'],
                                    properties: {
                                        name: { type: 'string' },
                                        type: {
                                            type: 'string',
                                            enum: ['door', 'gate', 'light', 'lock', 'automation', 'other'],
                                        },
                                        gpioPin: { type: 'integer' },
                                        channel: { type: 'integer' },
                                        mode: {
                                            type: 'string',
                                            enum: ['toggle', 'pulse', 'hold'],
                                        },
                                        pulseDuration: { type: 'integer' },
                                        deviceId: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        201: {
                            description: 'Relé criado.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                    },
                },
            },
            '/api/relays/{id}': {
                get: {
                    tags: ['Relays'],
                    summary: 'Detalhes de um relé',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: { type: 'string' },
                        },
                    ],
                    responses: {
                        200: {
                            description: 'Relé encontrado.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                        404: {
                            description: 'Relé não encontrado.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                    },
                },
                put: {
                    tags: ['Relays'],
                    summary: 'Atualiza relé',
                    description: 'Disponível para usuários com papel admin ou operator.',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: { type: 'string' },
                        },
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        name: { type: 'string' },
                                        type: {
                                            type: 'string',
                                            enum: ['door', 'gate', 'light', 'lock', 'automation', 'other'],
                                        },
                                        gpioPin: { type: 'integer' },
                                        channel: { type: 'integer' },
                                        mode: {
                                            type: 'string',
                                            enum: ['toggle', 'pulse', 'hold'],
                                        },
                                        pulseDuration: { type: 'integer' },
                                        active: { type: 'boolean' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: {
                            description: 'Relé atualizado.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                    },
                },
                delete: {
                    tags: ['Relays'],
                    summary: 'Remove relé',
                    description: 'Disponível apenas para usuários com papel admin.',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: { type: 'string' },
                        },
                    ],
                    responses: {
                        200: {
                            description: 'Relé removido.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                    },
                },
            },
            '/api/relays/{id}/toggle': {
                post: {
                    tags: ['Relays'],
                    summary: 'Aciona/troca estado de um relé',
                    description:
                        'Executa a ação de toggle/pulse/hold conforme a configuração do relé. Disponível para admin/operator.',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: { type: 'string' },
                        },
                    ],
                    responses: {
                        200: {
                            description: 'Comando enviado com sucesso.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                    },
                },
            },

            // ============================
            // Users (admin)
            // ============================
            '/api/users': {
                get: {
                    tags: ['Users'],
                    summary: 'Lista usuários administradores',
                    description: 'Lista usuários do sistema (admin, operator, viewer). Acesso apenas para admin.',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: {
                            description: 'Lista de usuários.',
                            content: {
                                'application/json': {
                                    schema: {
                                        allOf: [
                                            { $ref: '#/components/schemas/ApiResponse' },
                                            {
                                                type: 'object',
                                                properties: {
                                                    data: {
                                                        type: 'array',
                                                        items: { $ref: '#/components/schemas/User' },
                                                    },
                                                },
                                            },
                                        ],
                                    },
                                },
                            },
                        },
                    },
                },
                post: {
                    tags: ['Users'],
                    summary: 'Cria usuário administrador',
                    description: 'Cria um novo usuário (admin/operator/viewer). Acesso apenas para admin.',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['name', 'email', 'password'],
                                    properties: {
                                        name: { type: 'string' },
                                        email: { type: 'string', format: 'email' },
                                        password: { type: 'string', format: 'password' },
                                        role: {
                                            type: 'string',
                                            enum: ['admin', 'operator', 'viewer'],
                                        },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        201: {
                            description: 'Usuário criado.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                    },
                },
            },
            '/api/users/{id}': {
                get: {
                    tags: ['Users'],
                    summary: 'Detalhes de usuário admin',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: { type: 'string' },
                        },
                    ],
                    responses: {
                        200: {
                            description: 'Usuário encontrado.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                        404: {
                            description: 'Usuário não encontrado.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                    },
                },
                put: {
                    tags: ['Users'],
                    summary: 'Atualiza usuário admin',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: { type: 'string' },
                        },
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        name: { type: 'string' },
                                        email: { type: 'string', format: 'email' },
                                        password: { type: 'string', format: 'password' },
                                        role: {
                                            type: 'string',
                                            enum: ['admin', 'operator', 'viewer'],
                                        },
                                        active: { type: 'boolean' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: {
                            description: 'Usuário atualizado.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                    },
                },
                delete: {
                    tags: ['Users'],
                    summary: 'Remove usuário admin',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: { type: 'string' },
                        },
                    ],
                    responses: {
                        200: {
                            description: 'Usuário removido.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                    },
                },
            },

            // ============================
            // Location Users (moradores/síndicos)
            // ============================
            '/api/locations/{locationId}/users': {
                get: {
                    tags: ['LocationUsers'],
                    summary: 'Lista usuários de um local',
                    description:
                        'Lista moradores e síndicos de um local específico. Disponível para admin/operator do sistema.',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'locationId',
                            in: 'path',
                            required: true,
                            schema: { type: 'string' },
                        },
                    ],
                    responses: {
                        200: {
                            description: 'Lista de usuários do local.',
                            content: {
                                'application/json': {
                                    schema: {
                                        allOf: [
                                            { $ref: '#/components/schemas/ApiResponse' },
                                            {
                                                type: 'object',
                                                properties: {
                                                    data: {
                                                        type: 'array',
                                                        items: { $ref: '#/components/schemas/LocationUser' },
                                                    },
                                                },
                                            },
                                        ],
                                    },
                                },
                            },
                        },
                    },
                },
                post: {
                    tags: ['LocationUsers'],
                    summary: 'Cria usuário de local (morador/síndico)',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'locationId',
                            in: 'path',
                            required: true,
                            schema: { type: 'string' },
                        },
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['name', 'email', 'role'],
                                    properties: {
                                        name: { type: 'string' },
                                        email: { type: 'string', format: 'email' },
                                        role: {
                                            type: 'string',
                                            enum: ['morador', 'sindico'],
                                        },
                                        active: { type: 'boolean' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        201: {
                            description: 'Usuário do local criado.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                    },
                },
            },
            '/api/locations/{locationId}/users/{userId}': {
                put: {
                    tags: ['LocationUsers'],
                    summary: 'Atualiza usuário de local',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'locationId',
                            in: 'path',
                            required: true,
                            schema: { type: 'string' },
                        },
                        {
                            name: 'userId',
                            in: 'path',
                            required: true,
                            schema: { type: 'string' },
                        },
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        name: { type: 'string' },
                                        email: { type: 'string', format: 'email' },
                                        role: {
                                            type: 'string',
                                            enum: ['morador', 'sindico'],
                                        },
                                        active: { type: 'boolean' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: {
                            description: 'Usuário do local atualizado.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                    },
                },
                delete: {
                    tags: ['LocationUsers'],
                    summary: 'Remove usuário de local',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'locationId',
                            in: 'path',
                            required: true,
                            schema: { type: 'string' },
                        },
                        {
                            name: 'userId',
                            in: 'path',
                            required: true,
                            schema: { type: 'string' },
                        },
                    ],
                    responses: {
                        200: {
                            description: 'Usuário do local removido.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                    },
                },
            },

            // ============================
            // Inputs
            // ============================
            '/api/inputs': {
                get: {
                    tags: ['Inputs'],
                    summary: 'Lista sensores / inputs',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: {
                            description: 'Lista de inputs.',
                            content: {
                                'application/json': {
                                    schema: {
                                        allOf: [
                                            { $ref: '#/components/schemas/ApiResponse' },
                                            {
                                                type: 'object',
                                                properties: {
                                                    data: {
                                                        type: 'array',
                                                        items: { $ref: '#/components/schemas/Input' },
                                                    },
                                                },
                                            },
                                        ],
                                    },
                                },
                            },
                        },
                    },
                },
                post: {
                    tags: ['Inputs'],
                    summary: 'Cria input',
                    description: 'Disponível apenas para usuários com papel admin.',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['name', 'type', 'gpioPin', 'deviceId'],
                                    properties: {
                                        name: { type: 'string' },
                                        type: {
                                            type: 'string',
                                            enum: ['door_sensor', 'motion', 'button', 'emergency', 'other'],
                                        },
                                        gpioPin: { type: 'integer' },
                                        activeLow: { type: 'boolean' },
                                        deviceId: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        201: {
                            description: 'Input criado.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                    },
                },
            },
            '/api/inputs/{id}': {
                put: {
                    tags: ['Inputs'],
                    summary: 'Atualiza input',
                    description: 'Disponível apenas para usuários com papel admin.',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: { type: 'string' },
                        },
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        name: { type: 'string' },
                                        type: {
                                            type: 'string',
                                            enum: ['door_sensor', 'motion', 'button', 'emergency', 'other'],
                                        },
                                        gpioPin: { type: 'integer' },
                                        activeLow: { type: 'boolean' },
                                        state: {
                                            type: 'string',
                                            enum: ['active', 'inactive'],
                                        },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: {
                            description: 'Input atualizado.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                    },
                },
                delete: {
                    tags: ['Inputs'],
                    summary: 'Remove input',
                    description: 'Disponível apenas para usuários com papel admin.',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: { type: 'string' },
                        },
                    ],
                    responses: {
                        200: {
                            description: 'Input removido.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                    },
                },
            },

            // ============================
            // Automations
            // ============================
            '/api/automations': {
                get: {
                    tags: ['Automations'],
                    summary: 'Lista automações',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: {
                            description: 'Lista de automações.',
                            content: {
                                'application/json': {
                                    schema: {
                                        allOf: [
                                            { $ref: '#/components/schemas/ApiResponse' },
                                            {
                                                type: 'object',
                                                properties: {
                                                    data: {
                                                        type: 'array',
                                                        items: { $ref: '#/components/schemas/Automation' },
                                                    },
                                                },
                                            },
                                        ],
                                    },
                                },
                            },
                        },
                    },
                },
                post: {
                    tags: ['Automations'],
                    summary: 'Cria automação',
                    description: 'Disponível apenas para usuários com papel admin.',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['name', 'trigger', 'action'],
                                    properties: {
                                        name: { type: 'string' },
                                        enabled: { type: 'boolean' },
                                        trigger: {
                                            type: 'object',
                                            required: ['type', 'inputId', 'condition'],
                                            properties: {
                                                type: {
                                                    type: 'string',
                                                    enum: ['input_state_change'],
                                                },
                                                inputId: { type: 'string' },
                                                condition: {
                                                    type: 'string',
                                                    enum: ['active', 'inactive'],
                                                },
                                            },
                                        },
                                        action: {
                                            type: 'object',
                                            required: ['type', 'relayId', 'command'],
                                            properties: {
                                                type: {
                                                    type: 'string',
                                                    enum: ['relay_control'],
                                                },
                                                relayId: { type: 'string' },
                                                command: {
                                                    type: 'string',
                                                    enum: ['on', 'off', 'pulse'],
                                                },
                                                duration: { type: 'integer' },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        201: {
                            description: 'Automação criada.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                    },
                },
            },
            '/api/automations/{id}': {
                put: {
                    tags: ['Automations'],
                    summary: 'Atualiza automação',
                    description: 'Disponível apenas para usuários com papel admin.',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: { type: 'string' },
                        },
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        name: { type: 'string' },
                                        enabled: { type: 'boolean' },
                                        trigger: {
                                            type: 'object',
                                            properties: {
                                                type: {
                                                    type: 'string',
                                                    enum: ['input_state_change'],
                                                },
                                                inputId: { type: 'string' },
                                                condition: {
                                                    type: 'string',
                                                    enum: ['active', 'inactive'],
                                                },
                                            },
                                        },
                                        action: {
                                            type: 'object',
                                            properties: {
                                                type: {
                                                    type: 'string',
                                                    enum: ['relay_control'],
                                                },
                                                relayId: { type: 'string' },
                                                command: {
                                                    type: 'string',
                                                    enum: ['on', 'off', 'pulse'],
                                                },
                                                duration: { type: 'integer' },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: {
                            description: 'Automação atualizada.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                    },
                },
                delete: {
                    tags: ['Automations'],
                    summary: 'Remove automação',
                    description: 'Disponível apenas para usuários com papel admin.',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: { type: 'string' },
                        },
                    ],
                    responses: {
                        200: {
                            description: 'Automação removida.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                    },
                },
            },

            // ============================
            // Schedules
            // ============================
            '/api/schedules': {
                get: {
                    tags: ['Schedules'],
                    summary: 'Lista agendamentos',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: {
                            description: 'Lista de agendamentos.',
                            content: {
                                'application/json': {
                                    schema: {
                                        allOf: [
                                            { $ref: '#/components/schemas/ApiResponse' },
                                            {
                                                type: 'object',
                                                properties: {
                                                    data: {
                                                        type: 'array',
                                                        items: { $ref: '#/components/schemas/Schedule' },
                                                    },
                                                },
                                            },
                                        ],
                                    },
                                },
                            },
                        },
                    },
                },
                post: {
                    tags: ['Schedules'],
                    summary: 'Cria agendamento',
                    description: 'Disponível apenas para usuários com papel admin.',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['name', 'relayId', 'action', 'time'],
                                    properties: {
                                        name: { type: 'string' },
                                        relayId: { type: 'string' },
                                        action: {
                                            type: 'string',
                                            enum: ['open', 'close', 'pulse'],
                                        },
                                        daysOfWeek: {
                                            type: 'array',
                                            items: { type: 'integer', minimum: 0, maximum: 6 },
                                        },
                                        time: {
                                            type: 'string',
                                            example: '08:00',
                                        },
                                        enabled: { type: 'boolean' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        201: {
                            description: 'Agendamento criado.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                    },
                },
            },
            '/api/schedules/{id}': {
                put: {
                    tags: ['Schedules'],
                    summary: 'Atualiza agendamento',
                    description: 'Disponível apenas para usuários com papel admin.',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: { type: 'string' },
                        },
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        name: { type: 'string' },
                                        relayId: { type: 'string' },
                                        action: {
                                            type: 'string',
                                            enum: ['open', 'close', 'pulse'],
                                        },
                                        daysOfWeek: {
                                            type: 'array',
                                            items: { type: 'integer', minimum: 0, maximum: 6 },
                                        },
                                        time: { type: 'string' },
                                        enabled: { type: 'boolean' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: {
                            description: 'Agendamento atualizado.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                    },
                },
                delete: {
                    tags: ['Schedules'],
                    summary: 'Remove agendamento',
                    description: 'Disponível apenas para usuários com papel admin.',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: { type: 'string' },
                        },
                    ],
                    responses: {
                        200: {
                            description: 'Agendamento removido.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                    },
                },
            },

            // ============================
            // Invitations
            // ============================
            '/api/invitations': {
                get: {
                    tags: ['Invitations'],
                    summary: 'Lista convites',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: {
                            description: 'Lista de convites.',
                            content: {
                                'application/json': {
                                    schema: {
                                        allOf: [
                                            { $ref: '#/components/schemas/ApiResponse' },
                                            {
                                                type: 'object',
                                                properties: {
                                                    data: {
                                                        type: 'array',
                                                        items: { $ref: '#/components/schemas/Invitation' },
                                                    },
                                                },
                                            },
                                        ],
                                    },
                                },
                            },
                        },
                    },
                },
                post: {
                    tags: ['Invitations'],
                    summary: 'Cria convite de acesso',
                    description:
                        'Cria um convite de acesso vinculando um convidado a um conjunto de portas/relés com período de validade.',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['name', 'relayIds', 'validFrom', 'validUntil'],
                                    properties: {
                                        name: { type: 'string' },
                                        relayIds: {
                                            type: 'array',
                                            items: { type: 'string' },
                                        },
                                        validFrom: { type: 'string', format: 'date-time' },
                                        validUntil: { type: 'string', format: 'date-time' },
                                        locationId: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        201: {
                            description: 'Convite criado.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                    },
                },
            },
            '/api/invitations/{id}': {
                delete: {
                    tags: ['Invitations'],
                    summary: 'Remove convite',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: { type: 'string' },
                        },
                    ],
                    responses: {
                        200: {
                            description: 'Convite removido.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                    },
                },
            },
            '/api/invitations/access/{token}': {
                get: {
                    tags: ['Invitations'],
                    summary: 'Consulta pública de convite',
                    description: 'Endpoint público usado pelo convidado para ver os detalhes do convite.',
                    parameters: [
                        {
                            name: 'token',
                            in: 'path',
                            required: true,
                            schema: { type: 'string' },
                        },
                    ],
                    responses: {
                        200: {
                            description: 'Convite encontrado (se ainda estiver válido).',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                        404: {
                            description: 'Convite não encontrado ou expirado.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                    },
                },
            },
            '/api/invitations/access/{token}/unlock': {
                post: {
                    tags: ['Invitations'],
                    summary: 'Aciona relé(s) via convite',
                    description:
                        'Endpoint público usado pelo convidado para acionar as portas/relés associados ao convite válido.',
                    parameters: [
                        {
                            name: 'token',
                            in: 'path',
                            required: true,
                            schema: { type: 'string' },
                        },
                    ],
                    responses: {
                        200: {
                            description: 'Ação executada com sucesso (se o convite ainda for válido).',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                        400: {
                            description: 'Convite inválido ou fora do período de validade.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                    },
                },
            },

            // ============================
            // Health check
            // ============================
            '/api/health': {
                get: {
                    tags: ['System'],
                    summary: 'Health check da API',
                    description: 'Retorna informações básicas de status do servidor.',
                    responses: {
                        200: {
                            description: 'Servidor respondendo normalmente.',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean', example: true },
                                            message: {
                                                type: 'string',
                                                example: 'Zaccess Server is running',
                                            },
                                            timestamp: { type: 'string', format: 'date-time' },
                                            uptime: { type: 'number' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },

            // ============================
            // Logs
            // ============================
            '/api/logs': {
                get: {
                    tags: ['Logs'],
                    summary: 'Lista logs de atividade',
                    description:
                        'Retorna os logs de atividades do sistema (dispositivos, relés, convites, agendamentos, etc.).',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'action',
                            in: 'query',
                            required: false,
                            schema: { type: 'string' },
                            description: 'Filtra por tipo de ação (ex.: relay_activated, device_connected).',
                        },
                        {
                            name: 'severity',
                            in: 'query',
                            required: false,
                            schema: {
                                type: 'string',
                                enum: ['info', 'warning', 'danger', 'critical'],
                            },
                        },
                        {
                            name: 'deviceId',
                            in: 'query',
                            required: false,
                            schema: { type: 'string' },
                        },
                        {
                            name: 'relayId',
                            in: 'query',
                            required: false,
                            schema: { type: 'string' },
                        },
                        {
                            name: 'userId',
                            in: 'query',
                            required: false,
                            schema: { type: 'string' },
                        },
                        {
                            name: 'from',
                            in: 'query',
                            required: false,
                            schema: { type: 'string', format: 'date-time' },
                            description: 'Data/hora inicial para filtragem.',
                        },
                        {
                            name: 'to',
                            in: 'query',
                            required: false,
                            schema: { type: 'string', format: 'date-time' },
                            description: 'Data/hora final para filtragem.',
                        },
                    ],
                    responses: {
                        200: {
                            description: 'Lista de logs.',
                            content: {
                                'application/json': {
                                    schema: {
                                        allOf: [
                                            { $ref: '#/components/schemas/ApiResponse' },
                                            {
                                                type: 'object',
                                                properties: {
                                                    data: {
                                                        type: 'array',
                                                        items: { $ref: '#/components/schemas/ActivityLog' },
                                                    },
                                                },
                                            },
                                        ],
                                    },
                                },
                            },
                        },
                    },
                },
            },
            '/api/logs/stats': {
                get: {
                    tags: ['Logs'],
                    summary: 'Estatísticas de logs',
                    description: 'Retorna estatísticas agregadas de logs (por ação, severidade, período, etc.).',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: {
                            description: 'Estatísticas de logs.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                    },
                },
            },

            // ============================
            // Reports
            // ============================
            '/api/reports/access': {
                get: {
                    tags: ['Reports'],
                    summary: 'Relatório de acessos',
                    description:
                        'Retorna um relatório agregado de acessos (por dispositivo, relé, convite, período, etc.).',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'from',
                            in: 'query',
                            required: false,
                            schema: { type: 'string', format: 'date-time' },
                        },
                        {
                            name: 'to',
                            in: 'query',
                            required: false,
                            schema: { type: 'string', format: 'date-time' },
                        },
                        {
                            name: 'locationId',
                            in: 'query',
                            required: false,
                            schema: { type: 'string' },
                        },
                    ],
                    responses: {
                        200: {
                            description: 'Relatório de acessos.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                    },
                },
            },

            // ============================
            // App (Flutter)
            // ============================
            '/api/app/me': {
                get: {
                    tags: ['App'],
                    summary: 'Perfil do usuário (app)',
                    description:
                        'Retorna os dados do usuário do local autenticado via token do app (LocationUser).',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: {
                            description: 'Dados do usuário do local.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                        401: {
                            description: 'Token inválido ou usuário do local desativado.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                    },
                },
            },
            '/api/app/automations': {
                get: {
                    tags: ['App'],
                    summary: 'Automações do local (app)',
                    description: 'Lista as automações disponíveis para o local do usuário autenticado.',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: {
                            description: 'Lista de automações do local.',
                            content: {
                                'application/json': {
                                    schema: {
                                        allOf: [
                                            { $ref: '#/components/schemas/ApiResponse' },
                                            {
                                                type: 'object',
                                                properties: {
                                                    data: {
                                                        type: 'array',
                                                        items: { $ref: '#/components/schemas/Automation' },
                                                    },
                                                },
                                            },
                                        ],
                                    },
                                },
                            },
                        },
                    },
                },
            },
            '/api/app/relays': {
                get: {
                    tags: ['App'],
                    summary: 'Relés do local (app)',
                    description: 'Lista os relés disponíveis para o local do usuário autenticado.',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: {
                            description: 'Lista de relés do local.',
                            content: {
                                'application/json': {
                                    schema: {
                                        allOf: [
                                            { $ref: '#/components/schemas/ApiResponse' },
                                            {
                                                type: 'object',
                                                properties: {
                                                    data: {
                                                        type: 'array',
                                                        items: { $ref: '#/components/schemas/Relay' },
                                                    },
                                                },
                                            },
                                        ],
                                    },
                                },
                            },
                        },
                    },
                },
            },
            '/api/app/relays/{id}/toggle': {
                post: {
                    tags: ['App'],
                    summary: 'Aciona relé (app)',
                    description:
                        'Aciona um relé do local do usuário autenticado a partir do app (por exemplo, abrir um portão).',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: { type: 'string' },
                        },
                    ],
                    responses: {
                        200: {
                            description: 'Comando enviado com sucesso.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                    },
                },
            },
            '/api/app/invitations': {
                get: {
                    tags: ['App'],
                    summary: 'Lista convites do usuário (app)',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: {
                            description: 'Lista de convites do usuário/local.',
                            content: {
                                'application/json': {
                                    schema: {
                                        allOf: [
                                            { $ref: '#/components/schemas/ApiResponse' },
                                            {
                                                type: 'object',
                                                properties: {
                                                    data: {
                                                        type: 'array',
                                                        items: { $ref: '#/components/schemas/Invitation' },
                                                    },
                                                },
                                            },
                                        ],
                                    },
                                },
                            },
                        },
                    },
                },
                post: {
                    tags: ['App'],
                    summary: 'Cria convite (app)',
                    description: 'Cria um novo convite vinculado ao local do usuário autenticado.',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['name', 'relayIds', 'validFrom', 'validUntil'],
                                    properties: {
                                        name: { type: 'string' },
                                        relayIds: {
                                            type: 'array',
                                            items: { type: 'string' },
                                        },
                                        validFrom: { type: 'string', format: 'date-time' },
                                        validUntil: { type: 'string', format: 'date-time' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        201: {
                            description: 'Convite criado.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                    },
                },
            },
            '/api/app/invitations/{id}': {
                delete: {
                    tags: ['App'],
                    summary: 'Remove convite (app)',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: { type: 'string' },
                        },
                    ],
                    responses: {
                        200: {
                            description: 'Convite removido.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                    },
                },
            },
            '/api/app/logs': {
                get: {
                    tags: ['App'],
                    summary: 'Logs do local (app – síndico)',
                    description:
                        'Lista logs de acesso/uso relacionados ao local do usuário autenticado. Disponível apenas para síndicos.',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: {
                            description: 'Lista de logs do local.',
                            content: {
                                'application/json': {
                                    schema: {
                                        allOf: [
                                            { $ref: '#/components/schemas/ApiResponse' },
                                            {
                                                type: 'object',
                                                properties: {
                                                    data: {
                                                        type: 'array',
                                                        items: { $ref: '#/components/schemas/ActivityLog' },
                                                    },
                                                },
                                            },
                                        ],
                                    },
                                },
                            },
                        },
                        403: {
                            description: 'Acesso restrito a síndicos.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    // Podemos futuramente complementar com comentários JSDoc nas rotas:
    apis: [],
};

const openapiSpec = swaggerJsdoc(options);

module.exports = openapiSpec;

