import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';
import '../services/auth_service.dart';
import '../services/biometric_service.dart';
import '../widgets/app_card.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  bool _loading = false;
  bool _biometricLoading = false;
  String? _error;
  bool _rememberEmail = true;
  bool _useBiometric = false;
  bool _canUseBiometric = false;
  bool _hasBiometricCredentials = false;
  String _biometricLabel = 'Biometria';

  @override
  void initState() {
    super.initState();
    _loadSavedOptions();
  }

  Future<void> _loadSavedOptions() async {
    final email = await AuthService.getRememberedEmail();
    if (email != null && email.isNotEmpty && mounted) {
      _emailController.text = email;
    }
    final canUse = await BiometricService.canUseBiometric;
    final hasCred = await AuthService.hasBiometricCredentials();
    final types = await BiometricService.getAvailableBiometrics();
    final label = BiometricService.getBiometricTypeLabel(types);
    if (mounted) {
      setState(() {
        _canUseBiometric = canUse;
        _hasBiometricCredentials = hasCred;
        _biometricLabel = label;
      });
    }
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _error = null;
      _loading = true;
    });
    try {
      final data = await AuthService.login(
        _emailController.text.trim(),
        _passwordController.text,
      );
      if (!mounted) return;
      if (_rememberEmail) {
        await AuthService.setRememberedEmail(_emailController.text.trim());
      } else {
        await AuthService.clearRememberedEmail();
      }
      if (_useBiometric) {
        await AuthService.saveLoginWithBiometric(
          token: data['token'] as String,
          user: data['user'] as Map<String, dynamic>,
          location: data['location'] as Map<String, dynamic>?,
          role: data['role'] as String? ?? 'morador',
        );
      }
      if (!mounted) return;
      Navigator.of(context).pushReplacementNamed('/home');
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString().replaceFirst('Exception: ', '');
          _loading = false;
        });
      }
    }
  }

  Future<void> _loginWithBiometric() async {
    setState(() {
      _error = null;
      _biometricLoading = true;
    });
    try {
      final ok = await BiometricService.authenticate(
        reason: 'Use $_biometricLabel para entrar no Zaccess',
      );
      if (!mounted) return;
      if (!ok) {
        setState(() => _biometricLoading = false);
        return;
      }
      final success = await AuthService.loginWithBiometric();
      if (!mounted) return;
      if (success) {
        Navigator.of(context).pushReplacementNamed('/home');
      } else {
        setState(() {
          _error = 'Não foi possível restaurar a sessão. Faça login novamente.';
          _biometricLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString().replaceFirst('Exception: ', '');
          _biometricLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgPrimary,
      body: Stack(
        fit: StackFit.expand,
        children: [
          _buildBackground(),
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
                child: Form(
                  key: _formKey,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const SizedBox(height: 24),
                      _buildLogo(),
                      const SizedBox(height: 32),
                      if (_hasBiometricCredentials && _canUseBiometric) _buildBiometricButton(),
                      if (_hasBiometricCredentials && _canUseBiometric) const SizedBox(height: 24),
                      _buildFormCard(),
                      const SizedBox(height: 32),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBiometricButton() {
    return OutlinedButton.icon(
      onPressed: _biometricLoading ? null : _loginWithBiometric,
      icon: _biometricLoading
          ? const SizedBox(
              width: 22,
              height: 22,
              child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.accentPrimary),
            )
          : Icon(
              _biometricLabel.contains('Face') ? Icons.face_rounded : Icons.fingerprint_rounded,
              color: AppColors.accentPrimary,
              size: 24,
            ),
      label: Text(
        _biometricLoading ? 'Aguarde...' : 'Entrar com $_biometricLabel',
        style: GoogleFonts.plusJakartaSans(
          fontWeight: FontWeight.w600,
          color: AppColors.accentPrimary,
          fontSize: 16,
        ),
      ),
      style: OutlinedButton.styleFrom(
        padding: const EdgeInsets.symmetric(vertical: 16),
        side: const BorderSide(color: AppColors.accentPrimary),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.sm)),
      ),
    );
  }

  Widget _buildBackground() {
    return CustomPaint(
      painter: _LoginBackgroundPainter(),
      size: Size.infinite,
    );
  }

  Widget _buildLogo() {
    return Column(
      children: [
        Container(
          width: 72,
          height: 72,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: AppColors.gradientPrimary,
            boxShadow: [
              BoxShadow(
                color: AppColors.accentPrimary.withValues(alpha: 0.4),
                blurRadius: 24,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: const Icon(Icons.key_rounded, color: Colors.white, size: 36),
        ),
        const SizedBox(height: 20),
        ShaderMask(
          shaderCallback: (bounds) => AppColors.gradientPrimary.createShader(bounds),
          child: Text(
            'Zaccess',
            textAlign: TextAlign.center,
            style: GoogleFonts.plusJakartaSans(
              fontSize: 28,
              fontWeight: FontWeight.w800,
              color: Colors.white,
              letterSpacing: -0.5,
            ),
          ),
        ),
        const SizedBox(height: 6),
        Text(
          'Entre na sua conta',
          textAlign: TextAlign.center,
          style: GoogleFonts.plusJakartaSans(
            fontSize: 14,
            color: AppColors.textMuted,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  Widget _buildFormCard() {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.xl),
      decoration: BoxDecoration(
        color: AppColors.bgCard.withValues(alpha: 0.8),
        borderRadius: BorderRadius.circular(AppRadius.xl),
        border: Border.all(color: AppColors.borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextFormField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            autocorrect: false,
            style: GoogleFonts.plusJakartaSans(color: AppColors.textPrimary),
            decoration: const InputDecoration(
              labelText: 'E-mail',
              hintText: 'seu@email.com',
              prefixIcon: Icon(Icons.email_outlined, color: AppColors.textMuted),
            ),
            validator: (v) {
              if (v == null || v.trim().isEmpty) return 'Informe o e-mail';
              if (!v.contains('@')) return 'E-mail inválido';
              return null;
            },
          ),
          const SizedBox(height: 20),
          TextFormField(
            controller: _passwordController,
            obscureText: _obscurePassword,
            style: GoogleFonts.plusJakartaSans(color: AppColors.textPrimary),
            decoration: InputDecoration(
              labelText: 'Senha',
              prefixIcon: const Icon(Icons.lock_outline, color: AppColors.textMuted),
              suffixIcon: IconButton(
                icon: Icon(
                  _obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                  color: AppColors.textMuted,
                ),
                onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
              ),
            ),
            validator: (v) {
              if (v == null || v.isEmpty) return 'Informe a senha';
              return null;
            },
          ),
          const SizedBox(height: 16),
          CheckboxListTile(
            value: _rememberEmail,
            onChanged: (v) => setState(() => _rememberEmail = v ?? true),
            title: Text(
              'Lembrar e-mail',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 14,
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w500,
              ),
            ),
            activeColor: AppColors.accentPrimary,
            contentPadding: EdgeInsets.zero,
            controlAffinity: ListTileControlAffinity.leading,
            dense: true,
          ),
          if (_canUseBiometric)
            CheckboxListTile(
              value: _useBiometric,
              onChanged: (v) => setState(() => _useBiometric = v ?? false),
              title: Text(
                'Usar $_biometricLabel na próxima vez',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 14,
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.w500,
                ),
              ),
              subtitle: Text(
                'Entrada rápida e segura',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 12,
                  color: AppColors.textMuted,
                ),
              ),
              activeColor: AppColors.accentPrimary,
              contentPadding: EdgeInsets.zero,
              controlAffinity: ListTileControlAffinity.leading,
              dense: true,
            ),
          if (_error != null) ...[
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.danger.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(AppRadius.sm),
                border: Border.all(color: AppColors.danger.withValues(alpha: 0.4)),
              ),
              child: Row(
                children: [
                  Icon(Icons.error_outline_rounded, color: AppColors.danger, size: 22),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      _error!,
                      style: GoogleFonts.plusJakartaSans(color: AppColors.danger, fontSize: 14),
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 28),
          GradientButton(
            label: 'Entrar',
            loading: _loading,
            onPressed: () {
              if (_formKey.currentState?.validate() ?? false) _submit();
            },
            icon: Icons.arrow_forward_rounded,
          ),
        ],
      ),
    );
  }
}

class _LoginBackgroundPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final topCenter = Offset(size.width * 0.5, -size.height * 0.1);
    final rect = Rect.fromCircle(center: topCenter, radius: size.width * 0.9);
    final paint = Paint()
      ..shader = RadialGradient(
        colors: [
          AppColors.accentPrimary.withValues(alpha: 0.15),
          AppColors.accentPrimaryDark.withValues(alpha: 0.08),
          Colors.transparent,
        ],
        stops: const [0.0, 0.4, 1.0],
      ).createShader(rect);
    canvas.drawRect(Offset.zero & size, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
