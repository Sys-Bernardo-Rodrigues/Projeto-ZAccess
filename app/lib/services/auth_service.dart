import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';

class AuthService {
  static const _keyToken = 'zaccess_app_token';
  static const _keyUser = 'zaccess_app_user';
  static const _keyLocation = 'zaccess_app_location';
  static const _keyRole = 'zaccess_app_role';

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

  static Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyToken);
    await prefs.remove(_keyUser);
    await prefs.remove(_keyLocation);
    await prefs.remove(_keyRole);
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
          'Não foi possível conectar ao servidor. Verifique se a API Zaccess está rodando (porta 3001) e se a URL está correta.',
        );
      }
      rethrow;
    }
  }
}
