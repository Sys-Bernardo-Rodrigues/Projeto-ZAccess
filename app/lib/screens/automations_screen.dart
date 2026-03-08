import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';

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
        backgroundColor: AppColors.bgSecondary,
        title: Text(
          'Automações',
          style: GoogleFonts.inter(fontWeight: FontWeight.w700, color: AppColors.textPrimary),
        ),
        iconTheme: const IconThemeData(color: AppColors.textSecondary),
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(AppColors.accentPrimary),
              ),
            )
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          _error!,
                          textAlign: TextAlign.center,
                          style: GoogleFonts.inter(color: AppColors.textSecondary),
                        ),
                        const SizedBox(height: 20),
                        FilledButton(
                          onPressed: _load,
                          style: FilledButton.styleFrom(
                            backgroundColor: AppColors.accentPrimary,
                            foregroundColor: Colors.white,
                          ),
                          child: const Text('Tentar novamente'),
                        ),
                      ],
                    ),
                  ),
                )
              : _automations.isEmpty
                  ? Center(
                      child: Text(
                        'Nenhuma automação configurada para este local.',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.inter(color: AppColors.textMuted, fontSize: 15),
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _load,
                      color: AppColors.accentPrimary,
                      backgroundColor: AppColors.bgCard,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(20),
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
                            padding: const EdgeInsets.only(bottom: 10),
                            child: Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: AppColors.bgCard,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: AppColors.borderColor),
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    width: 48,
                                    height: 48,
                                    decoration: BoxDecoration(
                                      color: enabled
                                          ? AppColors.accentPrimary.withValues(alpha: 0.2)
                                          : AppColors.textMuted.withValues(alpha: 0.2),
                                      borderRadius: BorderRadius.circular(14),
                                    ),
                                    child: Icon(
                                      Icons.auto_awesome_rounded,
                                      color: enabled ? AppColors.accentPrimaryLight : AppColors.textMuted,
                                      size: 24,
                                    ),
                                  ),
                                  const SizedBox(width: 16),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          a['name'] as String? ?? 'Automação',
                                          style: GoogleFonts.inter(
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
                                          style: GoogleFonts.inter(
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
