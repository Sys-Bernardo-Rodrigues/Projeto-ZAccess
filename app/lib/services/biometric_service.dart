import 'package:local_auth/local_auth.dart';

/// Serviço para autenticação biométrica (Face ID, impressão digital).
class BiometricService {
  static final LocalAuthentication _auth = LocalAuthentication();

  /// Verifica se o dispositivo oferece biometria (Face ID, digital, etc.).
  static Future<bool> canCheckBiometrics() async {
    try {
      return await _auth.canCheckBiometrics;
    } catch (_) {
      return false;
    }
  }

  /// Verifica se há biometria disponível e configurada.
  static Future<bool> isDeviceSupported() async {
    try {
      return await _auth.isDeviceSupported();
    } catch (_) {
      return false;
    }
  }

  /// Lista os tipos disponíveis (fingerprint, face, etc.).
  static Future<List<BiometricType>> getAvailableBiometrics() async {
    try {
      return await _auth.getAvailableBiometrics();
    } catch (_) {
      return [];
    }
  }

  /// Retorna true se o usuário pode usar biometria para login.
  static Future<bool> get canUseBiometric async {
    final canCheck = await canCheckBiometrics();
    final supported = await isDeviceSupported();
    if (!canCheck || !supported) return false;
    final list = await getAvailableBiometrics();
    return list.isNotEmpty;
  }

  /// Texto amigável do tipo (Face ID, Digital, etc.).
  static String getBiometricTypeLabel(List<BiometricType> types) {
    if (types.any((t) => t == BiometricType.face)) return 'Face ID';
    if (types.any((t) => t == BiometricType.fingerprint)) return 'Impressão digital';
    if (types.any((t) => t == BiometricType.iris)) return 'Íris';
    return 'Biometria';
  }

  /// Solicita autenticação biométrica. Retorna true se sucesso.
  static Future<bool> authenticate({String? reason}) async {
    try {
      return await _auth.authenticate(
        localizedReason: reason ?? 'Use a biometria para entrar no Zaccess',
        options: const AuthenticationOptions(
          stickyAuth: true,
          biometricOnly: true,
        ),
      );
    } catch (_) {
      return false;
    }
  }
}
