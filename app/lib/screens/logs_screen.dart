import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';

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
        backgroundColor: AppColors.bgSecondary,
        title: Text(
          'Verificações de acesso',
          style: GoogleFonts.inter(fontWeight: FontWeight.w700, color: AppColors.textPrimary, fontSize: 16),
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
              : _logs.isEmpty
                  ? Center(
                      child: Text(
                        'Nenhum registro de acesso ou automação no momento.',
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
                            padding: const EdgeInsets.only(bottom: 10),
                            child: Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: AppColors.bgCard,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: AppColors.borderColor),
                              ),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    width: 40,
                                    height: 40,
                                    decoration: BoxDecoration(
                                      color: AppColors.accentPrimary.withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Icon(
                                      Icons.history_rounded,
                                      color: AppColors.accentPrimaryLight,
                                      size: 20,
                                    ),
                                  ),
                                  const SizedBox(width: 14),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          _actionLabel(action),
                                          style: GoogleFonts.inter(
                                            fontWeight: FontWeight.w600,
                                            color: AppColors.textPrimary,
                                            fontSize: 14,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          description,
                                          style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary),
                                          maxLines: 2,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          '$createdAt${deviceName != null ? ' · $deviceName' : ''}${relayName != null ? ' · $relayName' : ''}',
                                          style: GoogleFonts.inter(fontSize: 12, color: AppColors.textMuted),
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
