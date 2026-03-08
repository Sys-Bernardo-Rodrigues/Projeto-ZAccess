import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'theme/app_theme.dart';
import 'services/auth_service.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'screens/automations_screen.dart';
import 'screens/invites_screen.dart';
import 'screens/logs_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
    DeviceOrientation.landscapeLeft,
    DeviceOrientation.landscapeRight,
  ]);
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: AppColors.bgPrimary,
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );
  runApp(const ZaccessApp());
}

class ZaccessApp extends StatelessWidget {
  const ZaccessApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Zaccess - Controle de Acesso',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.dark,
      home: const _SplashOrHome(),
      routes: {
        '/home': (_) => const HomeScreen(),
        '/login': (_) => const LoginScreen(),
        '/automations': (_) => const AutomationsScreen(),
        '/invites': (_) => const InvitesScreen(),
        '/logs': (_) => const LogsScreen(),
      },
    );
  }
}

class _SplashOrHome extends StatefulWidget {
  const _SplashOrHome();

  @override
  State<_SplashOrHome> createState() => _SplashOrHomeState();
}

class _SplashOrHomeState extends State<_SplashOrHome> {
  bool _checked = false;
  bool _loggedIn = false;

  @override
  void initState() {
    super.initState();
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    final ok = await AuthService.isLoggedIn();
    if (mounted) {
      setState(() {
        _loggedIn = ok;
        _checked = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_checked) {
      return Scaffold(
        backgroundColor: AppColors.bgPrimary,
        body: Stack(
          fit: StackFit.expand,
          children: [
            // Fundo com orbs em gradiente
            CustomPaint(
              painter: _SplashBackgroundPainter(),
              size: Size.infinite,
            ),
            Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Logo com anel em gradiente
                  Container(
                    width: 96,
                    height: 96,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: AppColors.gradientPrimary,
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.accentPrimary.withValues(alpha: 0.5),
                          blurRadius: 32,
                          spreadRadius: 0,
                        ),
                        BoxShadow(
                          color: AppColors.accentPrimaryDark.withValues(alpha: 0.3),
                          blurRadius: 48,
                          offset: const Offset(0, 16),
                        ),
                      ],
                    ),
                    child: const Icon(Icons.key_rounded, color: Colors.white, size: 44),
                  ),
                  const SizedBox(height: 28),
                  ShaderMask(
                    shaderCallback: (bounds) => AppColors.gradientPrimary.createShader(bounds),
                    child: Text(
                      'Zaccess',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 32,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                        letterSpacing: -0.5,
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Controle de acesso',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 14,
                      color: AppColors.textMuted,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 48),
                  SizedBox(
                    width: 32,
                    height: 32,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      valueColor: AlwaysStoppedAnimation<Color>(AppColors.accentPrimary),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }
    return _loggedIn ? const HomeScreen() : const LoginScreen();
  }
}

class _SplashBackgroundPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width * 0.5, size.height * 0.35);
    final rect = Rect.fromCircle(center: center, radius: size.width * 0.6);
    final paint = Paint()
      ..shader = RadialGradient(
        colors: [
          AppColors.accentPrimary.withValues(alpha: 0.12),
          AppColors.accentPrimaryDark.withValues(alpha: 0.06),
          Colors.transparent,
        ],
        stops: const [0.0, 0.5, 1.0],
      ).createShader(rect);
    canvas.drawRect(Offset.zero & size, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
