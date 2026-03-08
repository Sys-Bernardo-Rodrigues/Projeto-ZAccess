import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/api_config.dart';

class AuthService {
  static const _keyToken = 'zaccess_app_token';
  static const _keyUser = 'zaccess_app_user';
  static const _keyLocation = 'zaccess_app_location';
  static const _keyRole = 'zaccess_app_role';
  static const _keyRememberEmail = 'zaccess_app_remember_email';

  static const _secureKeyToken = 'zaccess_secure_token';
  static const _secureKeyUser = 'zaccess_secure_user';
  static const _secureKeyLocation = 'zaccess_secure_location';
  static const _secureKeyRole = 'zaccess_secure_role';

  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  static Future<void> saveLogin({
    required String token,
    required Map<String, dynamic> user,
    required Map<String, dynamic>? location,
    required String role,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyToken, token);
    await prefs.setString(_keyUser, jsonEncode(user));
    await prefs.setString(_keyLocation, location != null ? jsonEncode(location) : '');
    await prefs.setString(_keyRole, role);
  }

  /// Salva sessão no armazenamento seguro para login com biometria depois.
  static Future<void> saveLoginWithBiometric({
    required String token,
    required Map<String, dynamic> user,
    required Map<String, dynamic>? location,
    required String role,
  }) async {
    await saveLogin(token: token, user: user, location: location, role: role);
    await _storage.write(key: _secureKeyToken, value: token);
    await _storage.write(key: _secureKeyUser, value: jsonEncode(user));
    await _storage.write(key: _secureKeyLocation, value: location != null ? jsonEncode(location) : '');
    await _storage.write(key: _secureKeyRole, value: role);
  }

  /// Indica se há credenciais salvas para login biométrico.
  static Future<bool> hasBiometricCredentials() async {
    final token = await _storage.read(key: _secureKeyToken);
    return token != null && token.isNotEmpty;
  }

  /// Restaura sessão a partir do armazenamento seguro (após biometria aprovada).
  static Future<bool> loginWithBiometric() async {
    final token = await _storage.read(key: _secureKeyToken);
    final userJson = await _storage.read(key: _secureKeyUser);
    final locationJson = await _storage.read(key: _secureKeyLocation);
    final role = await _storage.read(key: _secureKeyRole);
    if (token == null || token.isEmpty) return false;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyToken, token);
    await prefs.setString(_keyUser, userJson ?? '{}');
    await prefs.setString(_keyLocation, locationJson ?? '');
    await prefs.setString(_keyRole, role ?? 'morador');
    return true;
  }

  static Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyToken);
    await prefs.remove(_keyUser);
    await prefs.remove(_keyLocation);
    await prefs.remove(_keyRole);
    await _storage.delete(key: _secureKeyToken);
    await _storage.delete(key: _secureKeyUser);
    await _storage.delete(key: _secureKeyLocation);
    await _storage.delete(key: _secureKeyRole);
  }

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyToken);
  }

  static Future<Map<String, dynamic>?> getUser() async {
    final prefs = await SharedPreferences.getInstance();
    final s = prefs.getString(_keyUser);
    if (s == null || s.isEmpty) return null;
    try {
      return jsonDecode(s) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  static Future<Map<String, dynamic>?> getLocation() async {
    final prefs = await SharedPreferences.getInstance();
    final s = prefs.getString(_keyLocation);
    if (s == null || s.isEmpty) return null;
    try {
      return jsonDecode(s) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  static Future<String> getRole() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyRole) ?? 'morador';
  }

  static Future<bool> isLoggedIn() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }

  // --- Lembrar e-mail ---

  static Future<String?> getRememberedEmail() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyRememberEmail);
  }

  static Future<void> setRememberedEmail(String email) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyRememberEmail, email.trim());
  }

  static Future<void> clearRememberedEmail() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyRememberEmail);
  }

  /// POST /api/auth/location-user/login
  static Future<Map<String, dynamic>> login(String email, String password) async {
    final uri = Uri.parse('${apiBaseUrl}api/auth/location-user/login');
    try {
      final res = await http.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email.trim(), 'password': password}),
      );
      final body = res.body.isNotEmpty ? jsonDecode(res.body) as Map<String, dynamic>? : null;
      if (res.statusCode != 200) {
        throw Exception(body?['message'] ?? 'Falha no login');
      }
      final data = body!['data'] as Map<String, dynamic>;
      await saveLogin(
        token: data['token'] as String,
        user: data['user'] as Map<String, dynamic>,
        location: data['location'] as Map<String, dynamic>?,
        role: data['role'] as String? ?? 'morador',
      );
      return data;
    } on Exception catch (e) {
      final msg = e.toString().toLowerCase();
      if (msg.contains('failed to fetch') ||
          msg.contains('connection refused') ||
          msg.contains('socketexception') ||
          msg.contains('network')) {
        throw Exception(
          'Não foi possível conectar ao servidor. Verifique se a API Zaccess está rodando (porta 3001). '
          'URL usada: $apiBaseUrl '
          'Em dispositivo físico, execute com: --dart-define=API_BASE_URL=http://IP_DO_PC:3001/',
        );
      }
      rethrow;
    }
  }
}
