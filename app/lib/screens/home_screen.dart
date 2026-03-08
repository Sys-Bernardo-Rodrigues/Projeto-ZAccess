import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';
import '../services/auth_service.dart';
import '../services/api_service.dart';
import 'login_screen.dart';
import 'automations_screen.dart';
import 'invites_screen.dart';
import 'logs_screen.dart';

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
      if (mounted) setState(() {
        _relays = list;
        _loadingRelays = false;
      });
    } catch (_) {
      if (mounted) setState(() {
        _relays = [];
        _loadingRelays = false;
      });
    }
  }

  Future<void> _onRefresh() async {
    await _load();
  }

  Future<void> _logout() async {
    await AuthService.logout();
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (_) => false,
    );
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
              // AppBar compacta
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 8, 8),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              'Olá, $_userName',
                              style: GoogleFonts.inter(
                                fontSize: 20,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textPrimary,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 2),
                            Row(
                              children: [
                                Icon(Icons.location_on_rounded, size: 14, color: AppColors.accentPrimaryLight),
                                const SizedBox(width: 4),
                                Expanded(
                                  child: Text(
                                    _locationName.isNotEmpty ? _locationName : 'Local',
                                    style: GoogleFonts.inter(
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
                              const SizedBox(height: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: AppColors.accentPrimary.withValues(alpha: 0.2),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  'Síndico',
                                  style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.accentPrimaryLight),
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
              ),

              // Portas e portão
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
                  child: Row(
                    children: [
                      Icon(Icons.sensor_door_rounded, size: 20, color: AppColors.accentPrimaryLight),
                      const SizedBox(width: 8),
                      Text(
                        'Sistema',
                        style: GoogleFonts.inter(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              if (_loadingRelays)
                const SliverToBoxAdapter(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Center(
                      child: SizedBox(
                        width: 28,
                        height: 28,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(AppColors.accentPrimary),
                        ),
                      ),
                    ),
                  ),
                )
              else if (_relays.isEmpty)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    child: Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: AppColors.bgCard,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.borderColor),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.info_outline_rounded, color: AppColors.textMuted, size: 24),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'Nenhum item cadastrado no seu local.',
                              style: GoogleFonts.inter(fontSize: 14, color: AppColors.textMuted),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, i) {
                        final r = _relays[i] as Map<String, dynamic>;
                        final name = r['name'] as String? ?? 'Porta';
                        final state = r['state'] as String? ?? 'closed';
                        final type = r['type'] as String?;
                        final isOpen = state == 'open';
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: Material(
                            color: AppColors.bgCard,
                            borderRadius: BorderRadius.circular(16),
                            child: InkWell(
                              onTap: () {},
                              borderRadius: BorderRadius.circular(16),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(color: AppColors.borderColor),
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 52,
                                      height: 52,
                                      decoration: BoxDecoration(
                                        color: isOpen
                                            ? AppColors.success.withValues(alpha: 0.15)
                                            : AppColors.accentPrimary.withValues(alpha: 0.15),
                                        borderRadius: BorderRadius.circular(14),
                                      ),
                                      child: Icon(
                                        _iconForType(type),
                                        size: 28,
                                        color: isOpen ? AppColors.success : AppColors.accentPrimaryLight,
                                      ),
                                    ),
                                    const SizedBox(width: 16),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            name,
                                            style: GoogleFonts.inter(
                                              fontSize: 16,
                                              fontWeight: FontWeight.w600,
                                              color: AppColors.textPrimary,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            isOpen ? 'Aberto' : 'Fechado',
                                            style: GoogleFonts.inter(
                                              fontSize: 13,
                                              color: isOpen ? AppColors.success : AppColors.textMuted,
                                              fontWeight: FontWeight.w500,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                      decoration: BoxDecoration(
                                        color: isOpen
                                            ? AppColors.success.withValues(alpha: 0.2)
                                            : AppColors.textMuted.withValues(alpha: 0.2),
                                        borderRadius: BorderRadius.circular(20),
                                      ),
                                      child: Text(
                                        isOpen ? 'Aberto' : 'Fechado',
                                        style: GoogleFonts.inter(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w600,
                                          color: isOpen ? AppColors.success : AppColors.textMuted,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        );
                      },
                      childCount: _relays.length,
                    ),
                  ),
                ),

              // Menu
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                  child: Text(
                    'Mais opções',
                    style: GoogleFonts.inter(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    _MenuTile(
                      icon: Icons.auto_awesome_rounded,
                      title: 'Automações',
                      subtitle: 'Ver automações do local',
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AutomationsScreen())),
                    ),
                    _MenuTile(
                      icon: Icons.mail_outline_rounded,
                      title: 'Convites',
                      subtitle: 'Criar e gerenciar convites',
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const InvitesScreen())),
                    ),
                    if (isSindico)
                      _MenuTile(
                        icon: Icons.verified_user_rounded,
                        title: 'Verificações de acesso',
                        subtitle: 'Acessos e automações',
                        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const LogsScreen())),
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
}

class _MenuTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _MenuTile({required this.icon, required this.title, required this.subtitle, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: AppColors.bgCard,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.borderColor),
            ),
            child: Row(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: AppColors.accentPrimary.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(icon, color: AppColors.accentPrimaryLight, size: 26),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: GoogleFonts.inter(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        subtitle,
                        style: GoogleFonts.inter(fontSize: 13, color: AppColors.textMuted),
                      ),
                    ],
                  ),
                ),
                Icon(Icons.chevron_right_rounded, color: AppColors.textMuted, size: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
