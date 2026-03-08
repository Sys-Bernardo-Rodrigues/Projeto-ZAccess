import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';
import '../widgets/app_card.dart';
import '../widgets/loading_view.dart';
import '../widgets/error_view.dart';
import '../widgets/empty_state.dart';

class LogsScreen extends StatefulWidget {
  const LogsScreen({super.key});

  @override
  State<LogsScreen> createState() => _LogsScreenState();
}

class _LogsScreenState extends State<LogsScreen> {
  List<dynamic> _logs = [];
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
      final res = await ApiService.getLogs();
      final data = res['data'] as Map<String, dynamic>?;
      final list = data?['logs'] as List<dynamic>? ?? [];
      if (mounted) {
        setState(() {
          _logs = list;
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

  static String _actionLabel(String? action) {
    switch (action) {
      case 'relay_activated':
        return 'Relé ativado';
      case 'relay_deactivated':
        return 'Relé desativado';
      case 'public_access_invitation':
        return 'Acesso via convite';
      case 'automation_executed':
        return 'Automação executada';
      case 'schedule_executed':
        return 'Agendamento executado';
      case 'command_sent':
        return 'Comando enviado';
      default:
        return action ?? '—';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgPrimary,
      appBar: AppBar(
        title: Text(
          'Verificações de acesso',
          style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w700, color: AppColors.textPrimary, fontSize: 16),
        ),
      ),
      body: _loading
          ? const LoadingView()
          : _error != null
              ? ErrorView(message: _error!, onRetry: _load)
              : _logs.isEmpty
                  ? const EmptyState(
                      message: 'Nenhum registro de acesso ou automação no momento.',
                      icon: Icons.history_rounded,
                    )
                  : RefreshIndicator(
                      onRefresh: _load,
                      color: AppColors.accentPrimary,
                      backgroundColor: AppColors.bgCard,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        itemCount: _logs.length,
                        itemBuilder: (context, i) {
                          final log = _logs[i] as Map<String, dynamic>;
                          final action = log['action'] as String?;
                          final description = log['description'] as String? ?? '—';
                          final createdAt = log['createdAt'] != null
                              ? DateFormat('dd/MM/yyyy HH:mm').format(DateTime.parse(log['createdAt'].toString()))
                              : '—';
                          final device = log['deviceId'];
                          final relay = log['relayId'];
                          final deviceName = device is Map ? device['name'] as String? : null;
                          final relayName = relay is Map ? relay['name'] as String? : null;
                          return Padding(
                            padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                            child: AppCard(
                              glass: true,
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  AppIconCircle(
                                    icon: Icons.history_rounded,
                                    size: 40,
                                    iconSize: 20,
                                  ),
                                  const SizedBox(width: 14),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          _actionLabel(action),
                                          style: GoogleFonts.plusJakartaSans(
                                            fontWeight: FontWeight.w600,
                                            color: AppColors.textPrimary,
                                            fontSize: 14,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          description,
                                          style: GoogleFonts.plusJakartaSans(fontSize: 13, color: AppColors.textSecondary),
                                          maxLines: 2,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          '$createdAt${deviceName != null ? ' · $deviceName' : ''}${relayName != null ? ' · $relayName' : ''}',
                                          style: GoogleFonts.plusJakartaSans(fontSize: 12, color: AppColors.textMuted),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ],
                                    ),
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
