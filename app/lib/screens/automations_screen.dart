import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';
import '../widgets/app_card.dart';
import '../widgets/loading_view.dart';
import '../widgets/error_view.dart';
import '../widgets/empty_state.dart';

class AutomationsScreen extends StatefulWidget {
  const AutomationsScreen({super.key});

  @override
  State<AutomationsScreen> createState() => _AutomationsScreenState();
}

class _AutomationsScreenState extends State<AutomationsScreen> {
  List<dynamic> _automations = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await ApiService.getAutomations();
      final data = res['data'] as Map<String, dynamic>?;
      final list = data?['automations'] as List<dynamic>? ?? [];
      if (mounted) {
        setState(() {
          _automations = list;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString().replaceFirst('Exception: ', '');
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgPrimary,
      appBar: AppBar(
        title: Text(
          'Automações',
          style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w700, color: AppColors.textPrimary),
        ),
      ),
      body: _loading
          ? const LoadingView()
          : _error != null
              ? ErrorView(message: _error!, onRetry: _load)
              : _automations.isEmpty
                  ? const EmptyState(
                      message: 'Nenhuma automação configurada para este local.',
                      icon: Icons.auto_awesome_rounded,
                    )
                  : RefreshIndicator(
                      onRefresh: _load,
                      color: AppColors.accentPrimary,
                      backgroundColor: AppColors.bgCard,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        itemCount: _automations.length,
                        itemBuilder: (context, i) {
                          final a = _automations[i] as Map<String, dynamic>;
                          final trigger = a['trigger'] as Map<String, dynamic>?;
                          final action = a['action'] as Map<String, dynamic>?;
                          final triggerInput = trigger?['inputId'];
                          final actionRelay = action?['relayId'];
                          final triggerName = triggerInput is Map ? triggerInput['name'] as String? : null;
                          final actionName = actionRelay is Map ? (actionRelay['name'] as String?) : null;
                          final enabled = a['enabled'] as bool? ?? true;
                          return Padding(
                            padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                            child: AppCard(
                              glass: true,
                              child: Row(
                                children: [
                                  AppIconCircle(
                                    icon: Icons.auto_awesome_rounded,
                                    backgroundColor: enabled
                                        ? AppColors.accentPrimary.withValues(alpha: 0.2)
                                        : AppColors.textMuted.withValues(alpha: 0.2),
                                    foregroundColor: enabled ? AppColors.accentPrimary : AppColors.textMuted,
                                    size: 48,
                                    iconSize: 24,
                                  ),
                                  const SizedBox(width: AppSpacing.md),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          a['name'] as String? ?? 'Automação',
                                          style: GoogleFonts.plusJakartaSans(
                                            fontWeight: FontWeight.w600,
                                            color: AppColors.textPrimary,
                                            fontSize: 15,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          'Quando "${triggerName ?? '—'}" → "${actionName ?? '—'}"',
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: GoogleFonts.plusJakartaSans(
                                            fontSize: 13,
                                            color: AppColors.textMuted,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Icon(
                                    enabled ? Icons.check_circle_rounded : Icons.remove_circle_outline_rounded,
                                    color: enabled ? AppColors.success : AppColors.textMuted,
                                    size: 22,
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
    );
  }
}
