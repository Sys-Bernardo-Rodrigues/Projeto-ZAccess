import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import 'auth_service.dart';

class ApiService {
  static Future<Map<String, String>> _headers() async {
    final token = await AuthService.getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
  }

  static Future<Map<String, dynamic>> _request(
    String method,
    String path, {
    Map<String, dynamic>? body,
  }) async {
    final uri = Uri.parse('$apiBaseUrl$path');
    final headers = await _headers();
    http.Response res;
    switch (method.toUpperCase()) {
      case 'GET':
        res = await http.get(uri, headers: headers);
        break;
      case 'POST':
        res = await http.post(uri, headers: headers, body: body != null ? jsonEncode(body) : null);
        break;
      case 'PUT':
        res = await http.put(uri, headers: headers, body: body != null ? jsonEncode(body) : null);
        break;
      case 'DELETE':
        res = await http.delete(uri, headers: headers);
        break;
      default:
        throw UnsupportedError(method);
    }
    final decoded = res.body.isNotEmpty ? jsonDecode(res.body) : <String, dynamic>{};
    if (res.statusCode >= 400) {
      throw Exception(decoded['message'] ?? 'Erro ${res.statusCode}');
    }
    return decoded as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> getMe() async => _request('GET', 'api/app/me');
  static Future<Map<String, dynamic>> getAutomations() async => _request('GET', 'api/app/automations');
  static Future<Map<String, dynamic>> getRelays() async => _request('GET', 'api/app/relays');
  static Future<Map<String, dynamic>> getInvitations() async => _request('GET', 'api/app/invitations');
  static Future<Map<String, dynamic>> createInvitation(Map<String, dynamic> payload) async =>
      _request('POST', 'api/app/invitations', body: payload);
  static Future<void> deleteInvitation(String id) async => _request('DELETE', 'api/app/invitations/$id');
  static Future<Map<String, dynamic>> getLogs() async => _request('GET', 'api/app/logs');
}
