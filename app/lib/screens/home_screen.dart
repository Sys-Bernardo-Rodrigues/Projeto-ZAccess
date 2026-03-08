import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';
import '../services/auth_service.dart';
import '../services/api_service.dart';
import '../widgets/app_card.dart';
import '../widgets/section_header.dart';
import '../widgets/loading_view.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String _userName = '';
  String _locationName = '';
  String _role = 'morador';
  List<dynamic> _relays = [];
  bool _loadingRelays = true;
  String? _togglingRelayId;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final user = await AuthService.getUser();
    final location = await AuthService.getLocation();
    final role = await AuthService.getRole();
    if (mounted) {
      setState(() {
        _userName = user?['name'] as String? ?? '';
        _locationName = location?['name'] as String? ?? '';
        _role = role;
      });
    }
    await _loadRelays();
  }

  Future<void> _loadRelays() async {
    if (!mounted) return;
    setState(() => _loadingRelays = true);
    try {
      final res = await ApiService.getRelays();
      final data = res['data'] as Map<String, dynamic>?;
      final list = data?['relays'] as List<dynamic>? ?? [];
      if (mounted) {
        setState(() {
          _relays = list;
          _loadingRelays = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _relays = [];
          _loadingRelays = false;
        });
      }
    }
  }

  Future<void> _toggleRelay(String relayId) async {
    if (_togglingRelayId != null) return;
    setState(() => _togglingRelayId = relayId);
    try {
      final res = await ApiService.toggleRelay(relayId);
      final newState = res['newState'] as String?;
      final msg = res['message'] as String? ?? (newState == 'open' ? 'Porta aberta.' : 'Porta fechada.');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(msg),
            backgroundColor: AppColors.success,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.sm)),
          ),
        );
        await _loadRelays();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceFirst('Exception: ', '')),
            backgroundColor: AppColors.danger,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.sm)),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _togglingRelayId = null);
    }
  }

  Future<void> _onRefresh() async {
    await _load();
  }

  Future<void> _logout() async {
    await AuthService.logout();
    if (!mounted) return;
    Navigator.of(context).pushNamedAndRemoveUntil('/login', (_) => false);
  }

  static IconData _iconForType(String? type) {
    switch (type) {
      case 'door':
        return Icons.door_front_door_rounded;
      case 'gate':
        return Icons.fence_rounded;
      case 'light':
        return Icons.lightbulb_outline_rounded;
      case 'lock':
        return Icons.lock_rounded;
      default:
        return Icons.sensor_door_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isSindico = _role == 'sindico';
    return Scaffold(
      backgroundColor: AppColors.bgPrimary,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _onRefresh,
          color: AppColors.accentPrimary,
          backgroundColor: AppColors.bgCard,
          child: CustomScrollView(
            slivers: [
              _buildHeader(isSindico),
              const SliverToBoxAdapter(child: SectionHeader(title: 'Controle de acesso', icon: Icons.sensor_door_rounded)),
              if (_loadingRelays)
                const SliverFillRemaining(child: LoadingView())
              else if (_relays.isEmpty)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
                    child: AppCard(
                      glass: true,
                      child: Row(
                        children: [
                          AppIconCircle(
                            icon: Icons.info_outline_rounded,
                            backgroundColor: AppColors.textMuted.withValues(alpha: 0.2),
                            foregroundColor: AppColors.textMuted,
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Text(
                              'Nenhuma porta cadastrada no seu local.',
                              style: GoogleFonts.plusJakartaSans(fontSize: 14, color: AppColors.textMuted),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(AppSpacing.md, 0, AppSpacing.md, AppSpacing.lg),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, i) {
                        final r = _relays[i] as Map<String, dynamic>;
                        final id = r['_id'] as String?;
                        final name = r['name'] as String? ?? 'Porta';
                        final state = r['state'] as String? ?? 'closed';
                        final type = r['type'] as String?;
                        final isOpen = state == 'open';
                        final isToggling = id != null && _togglingRelayId == id;
                        return Padding(
                          padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                          child: _RelayCard(
                            name: name,
                            isOpen: isOpen,
                            type: type,
                            icon: _iconForType(type),
                            isToggling: isToggling,
                            onOpen: id != null ? () => _toggleRelay(id) : null,
                          ),
                        );
                      },
                      childCount: _relays.length,
                    ),
                  ),
                ),
              const SliverToBoxAdapter(child: SectionHeader(title: 'Atalhos', icon: Icons.apps_rounded)),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(AppSpacing.md, 0, AppSpacing.md, AppSpacing.xxl),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    _MenuTile(
                      icon: Icons.auto_awesome_rounded,
                      title: 'Automações',
                      subtitle: 'Ver automações do local',
                      onTap: () => Navigator.pushNamed(context, '/automations'),
                    ),
                    _MenuTile(
                      icon: Icons.mail_outline_rounded,
                      title: 'Convites',
                      subtitle: 'Criar e gerenciar convites',
                      onTap: () => Navigator.pushNamed(context, '/invites'),
                    ),
                    if (isSindico)
                      _MenuTile(
                        icon: Icons.verified_user_rounded,
                        title: 'Verificações de acesso',
                        subtitle: 'Histórico de acessos e automações',
                        onTap: () => Navigator.pushNamed(context, '/logs'),
                      ),
                  ]),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(bool isSindico) {
    return SliverToBoxAdapter(
      child: Container(
        margin: const EdgeInsets.all(AppSpacing.md),
        padding: const EdgeInsets.all(AppSpacing.lg),
        decoration: BoxDecoration(
          gradient: AppColors.gradientSoft,
          borderRadius: BorderRadius.circular(AppRadius.xl),
          border: Border.all(color: AppColors.borderAccent),
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                gradient: AppColors.gradientPrimary,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: AppColors.accentPrimary.withValues(alpha: 0.3),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: const Icon(Icons.person_rounded, color: Colors.white, size: 24),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Olá, $_userName',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                      letterSpacing: -0.3,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(Icons.location_on_rounded, size: 16, color: AppColors.accentPrimary),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          _locationName.isNotEmpty ? _locationName : 'Seu condomínio',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 13,
                            color: AppColors.textMuted,
                            fontWeight: FontWeight.w500,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  if (isSindico) ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: AppColors.accentPrimaryLight.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(AppRadius.sm),
                        border: Border.all(color: AppColors.accentPrimaryLight.withValues(alpha: 0.4)),
                      ),
                      child: Text(
                        'Síndico',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppColors.accentPrimaryLight,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            IconButton(
              onPressed: _logout,
              icon: const Icon(Icons.logout_rounded),
              color: AppColors.textMuted,
              style: IconButton.styleFrom(
                minimumSize: const Size(48, 48),
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RelayCard extends StatelessWidget {
  const _RelayCard({
    required this.name,
    required this.isOpen,
    required this.type,
    required this.icon,
    required this.isToggling,
    this.onOpen,
  });

  final String name;
  final bool isOpen;
  final String? type;
  final IconData icon;
  final bool isToggling;
  final VoidCallback? onOpen;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      glass: true,
      padding: const EdgeInsets.all(AppSpacing.md),
      onTap: null,
      child: Row(
        children: [
          AppIconCircle(
            icon: icon,
            size: 54,
            iconSize: 28,
            gradient: isOpen ? null : AppColors.gradientPrimary,
            backgroundColor: isOpen ? AppColors.success.withValues(alpha: 0.2) : null,
            foregroundColor: isOpen ? AppColors.success : null,
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  isOpen ? 'Aberto' : 'Fechado',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 13,
                    color: isOpen ? AppColors.success : AppColors.textMuted,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: isOpen
                  ? AppColors.success.withValues(alpha: 0.2)
                  : AppColors.textMuted.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(AppRadius.full),
              border: Border.all(
                color: isOpen ? AppColors.success.withValues(alpha: 0.5) : AppColors.borderColor,
              ),
            ),
            child: Text(
              isOpen ? 'Aberto' : 'Fechado',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: isOpen ? AppColors.success : AppColors.textMuted,
              ),
            ),
          ),
          const SizedBox(width: 12),
          _GradientActionButton(
            label: isOpen ? 'Fechar' : 'Abrir',
            loading: isToggling,
            onPressed: onOpen,
          ),
        ],
      ),
    );
  }
}

class _GradientActionButton extends StatelessWidget {
  const _GradientActionButton({
    required this.label,
    required this.loading,
    this.onPressed,
  });

  final String label;
  final bool loading;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final enabled = onPressed != null && !loading;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: enabled ? onPressed : null,
        borderRadius: BorderRadius.circular(AppRadius.sm),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadius.sm),
            gradient: enabled ? AppColors.gradientPrimary : null,
            color: enabled ? null : AppColors.textMuted.withValues(alpha: 0.2),
          ),
          child: Center(
            child: loading
                ? const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : Text(
                    label,
                    style: GoogleFonts.plusJakartaSans(
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                      color: enabled ? Colors.white : AppColors.textMuted,
                    ),
                  ),
          ),
        ),
      ),
    );
  }
}

class _MenuTile extends StatelessWidget {
  const _MenuTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: AppCard(
        glass: true,
        onTap: onTap,
        child: Row(
          children: [
            AppIconCircle(
              icon: icon,
              gradient: AppColors.gradientPrimary,
              foregroundColor: Colors.white,
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: GoogleFonts.plusJakartaSans(fontSize: 13, color: AppColors.textMuted),
                  ),
                ],
              ),
            ),
            Icon(Icons.arrow_forward_ios_rounded, color: AppColors.textMuted, size: 14),
          ],
        ),
      ),
    );
  }
}
