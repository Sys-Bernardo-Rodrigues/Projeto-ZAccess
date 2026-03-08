import 'package:flutter/foundation.dart';

/// URL base da API Zaccess (com barra no final).
///
/// 1) Se definir [API_BASE_URL] com --dart-define na execução, usa esse valor.
///    Exemplo: flutter run -d chrome --dart-define=API_BASE_URL=http://192.168.1.10:3001/
///
/// 2) Se estiver na Web (Chrome): [http://localhost:3001/]
///
/// 3) Se estiver no Android (emulador): [http://10.0.2.2:3001/]
///    (10.0.2.2 é o host da máquina no emulador Android)
///
/// 4) iOS/Android em dispositivo físico: defina a URL da máquina onde o servidor roda.
///    Exemplo: flutter run --dart-define=API_BASE_URL=http://SEU_IP:3001/
String get apiBaseUrl {
  const envUrl = String.fromEnvironment('API_BASE_URL', defaultValue: '');
  if (envUrl.isNotEmpty) {
    return envUrl.endsWith('/') ? envUrl : '$envUrl/';
  }
  if (kIsWeb) {
    return 'http://localhost:3001/';
  }
  if (defaultTargetPlatform == TargetPlatform.android) {
    return 'http://10.0.2.2:3001/';
  }
  if (defaultTargetPlatform == TargetPlatform.iOS) {
    return 'http://localhost:3001/';
  }
  return 'http://localhost:3001/';
}

/// URL base do frontend (painel web) para links de convite que o convidado abre no navegador.
/// O link copiado será: [inviteLinkBaseUrl]/invite/[token]
///
/// Padrão: [http://localhost:5173] (Vite/painel web).
/// Para alterar: --dart-define=INVITE_BASE_URL=http://seu-dominio:5173
String get inviteLinkBaseUrl {
  const envUrl = String.fromEnvironment('INVITE_BASE_URL', defaultValue: '');
  if (envUrl.isNotEmpty) {
    return envUrl.endsWith('/') ? envUrl.substring(0, envUrl.length - 1) : envUrl;
  }
  return 'http://localhost:5173';
}
