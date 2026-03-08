import 'package:flutter/foundation.dart';

/// URL base da API Zaccess.
/// Se definir API_BASE_URL com --dart-define, usa esse valor.
/// Senão: no Chrome/Web usa localhost:3001; no Android emulador usa 10.0.2.2:3001.
String get apiBaseUrl {
  const envUrl = String.fromEnvironment('API_BASE_URL', defaultValue: '');
  if (envUrl.isNotEmpty) {
    return envUrl.endsWith('/') ? envUrl : '$envUrl/';
  }
  if (kIsWeb) {
    return 'http://localhost:3001/';
  }
  return 'http://10.0.2.2:3001/';
}
