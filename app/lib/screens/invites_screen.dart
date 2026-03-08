import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../theme/app_theme.dart';
import '../config/api_config.dart';
import '../services/api_service.dart';
import '../widgets/app_card.dart';
import '../widgets/loading_view.dart';
import '../widgets/error_view.dart';
import '../widgets/empty_state.dart';

class InvitesScreen extends StatefulWidget {
  const InvitesScreen({super.key});

  @override
  State<InvitesScreen> createState() => _InvitesScreenState();
}

class _InvitesScreenState extends State<InvitesScreen> {
  List<dynamic> _invitations = [];
  List<dynamic> _relays = [];
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
      final [invRes, relayRes] = await Future.wait([
        ApiService.getInvitations(),
        ApiService.getRelays(),
      ]);
      final invData = invRes['data'] as Map<String, dynamic>?;
      final relayData = relayRes['data'] as Map<String, dynamic>?;
      if (mounted) {
        setState(() {
          _invitations = invData?['invitations'] as List<dynamic>? ?? [];
          _relays = relayData?['relays'] as List<dynamic>? ?? [];
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

  Future<void> _deleteInvite(String id) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.bgCard,
        title: Text('Remover convite', style: GoogleFonts.plusJakartaSans(color: AppColors.textPrimary)),
        content: Text(
          'Deseja realmente remover este convite?',
          style: GoogleFonts.plusJakartaSans(color: AppColors.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('Não', style: GoogleFonts.plusJakartaSans(color: AppColors.textMuted)),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: AppColors.accentPrimary),
            child: const Text('Sim'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    try {
      await ApiService.deleteInvitation(id);
      if (mounted) _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceFirst('Exception: ', '')),
            backgroundColor: AppColors.danger,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  void _copyInviteLink(String token) {
    final base = inviteLinkBaseUrl.endsWith('/') ? inviteLinkBaseUrl : inviteLinkBaseUrl;
    final link = '$base/invite/$token';
    Clipboard.setData(ClipboardData(text: link));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Link do convite copiado! Envie para o convidado.'),
        backgroundColor: AppColors.success,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.sm)),
      ),
    );
  }

  void _openCreateDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        decoration: const BoxDecoration(
          color: AppColors.bgSecondary,
          borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
        ),
        child: _InviteFormSheet(
          relays: _relays,
          onSaved: () {
            Navigator.pop(ctx);
            _load();
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgPrimary,
      appBar: AppBar(
        title: Text(
          'Convites',
          style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w700, color: AppColors.textPrimary),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_rounded),
            onPressed: _relays.isEmpty ? null : _openCreateDialog,
            tooltip: 'Novo convite',
            color: _relays.isEmpty ? AppColors.textMuted : AppColors.accentPrimary,
          ),
        ],
      ),
      body: _loading
          ? const LoadingView()
          : _error != null
              ? ErrorView(message: _error!, onRetry: _load)
              : _relays.isEmpty
                  ? const EmptyState(
                      message: 'Nenhum relé disponível no seu local para convites.',
                      icon: Icons.mail_outline_rounded,
                    )
                  : _invitations.isEmpty
                      ? EmptyState(
                          message: 'Nenhum convite ainda.\nToque em + para criar um.',
                          icon: Icons.mail_outline_rounded,
                          actionLabel: 'Recarregar',
                          onAction: _load,
                        )
                      : RefreshIndicator(
                          onRefresh: _load,
                          color: AppColors.accentPrimary,
                          backgroundColor: AppColors.bgCard,
                          child: ListView.builder(
                            padding: const EdgeInsets.all(AppSpacing.md),
                            itemCount: _invitations.length,
                            itemBuilder: (context, i) {
                          final inv = _invitations[i] as Map<String, dynamic>;
                          final id = inv['_id'] as String?;
                          final token = inv['token'] as String?;
                          final name = inv['name'] as String? ?? '—';
                          final validFrom = inv['validFrom'] != null
                              ? DateFormat('dd/MM/yyyy HH:mm').format(DateTime.parse(inv['validFrom'].toString()))
                              : '—';
                          final validUntil = inv['validUntil'] != null
                              ? DateFormat('dd/MM/yyyy HH:mm').format(DateTime.parse(inv['validUntil'].toString()))
                              : '—';
                          final relayIds = inv['relayIds'] as List<dynamic>? ?? [];
                          final relayNames = relayIds
                              .map((r) => r is Map ? (r['name'] as String?) : null)
                              .whereType<String>()
                              .toList();
                          return Padding(
                            padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                            child: AppCard(
                              glass: true,
                              child: Row(
                                children: [
                                  AppIconCircle(
                                    icon: Icons.mail_outline_rounded,
                                    size: 48,
                                    iconSize: 24,
                                  ),
                                  const SizedBox(width: AppSpacing.md),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          name,
                                          style: GoogleFonts.plusJakartaSans(
                                            fontWeight: FontWeight.w600,
                                            color: AppColors.textPrimary,
                                            fontSize: 15,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          'Início: $validFrom',
                                          style: GoogleFonts.plusJakartaSans(fontSize: 13, color: AppColors.textMuted),
                                        ),
                                        Text(
                                          'Fim: $validUntil',
                                          style: GoogleFonts.plusJakartaSans(fontSize: 13, color: AppColors.textMuted),
                                        ),
                                        if (relayNames.isNotEmpty)
                                          Text(
                                            'Portas: ${relayNames.join(", ")}',
                                            style: GoogleFonts.plusJakartaSans(fontSize: 12, color: AppColors.textSecondary),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                      ],
                                    ),
                                  ),
                                  if (token != null)
                                    IconButton(
                                      icon: const Icon(Icons.link_rounded),
                                      onPressed: () => _copyInviteLink(token),
                                      tooltip: 'Copiar link do convite',
                                      color: AppColors.accentPrimary,
                                    ),
                                  if (id != null)
                                    IconButton(
                                      icon: const Icon(Icons.delete_outline_rounded),
                                      onPressed: () => _deleteInvite(id),
                                      color: AppColors.textMuted,
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

class _InviteFormSheet extends StatefulWidget {
  final List<dynamic> relays;
  final VoidCallback onSaved;

  const _InviteFormSheet({required this.relays, required this.onSaved});

  @override
  State<_InviteFormSheet> createState() => _InviteFormSheetState();
}

class _InviteFormSheetState extends State<_InviteFormSheet> {
  final _nameController = TextEditingController();
  late DateTime _validFrom;
  late DateTime _validUntil;
  final List<String> _selectedRelayIds = [];
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _validFrom = DateTime(now.year, now.month, now.day, 8, 0);
    _validUntil = now.add(const Duration(days: 7));
    _validUntil = DateTime(_validUntil.year, _validUntil.month, _validUntil.day, 18, 0);
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Informe o nome do convidado.'),
          backgroundColor: AppColors.bgCard,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }
    if (_selectedRelayIds.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Selecione pelo menos uma porta.'),
          backgroundColor: AppColors.bgCard,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }
    if (!_validUntil.isAfter(_validFrom)) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('O horário de fim deve ser após o horário de início.'),
          backgroundColor: AppColors.danger,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }
    setState(() => _saving = true);
    try {
      await ApiService.createInvitation({
        'name': name,
        'relayIds': _selectedRelayIds,
        'validFrom': _validFrom.toIso8601String(),
        'validUntil': _validUntil.toIso8601String(),
      });
      widget.onSaved();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceFirst('Exception: ', '')),
            backgroundColor: AppColors.danger,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: AppSpacing.lg,
        right: AppSpacing.lg,
        top: AppSpacing.lg,
        bottom: MediaQuery.of(context).viewInsets.bottom + AppSpacing.xl,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Novo convite',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            TextField(
              controller: _nameController,
              style: GoogleFonts.plusJakartaSans(color: AppColors.textPrimary),
              decoration: const InputDecoration(
                labelText: 'Nome do convidado',
                hintText: 'Ex: João Silva',
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              'Horário de início',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () async {
                      final d = await showDatePicker(
                        context: context,
                        initialDate: _validFrom,
                        firstDate: DateTime.now(),
                        lastDate: DateTime.now().add(const Duration(days: 365)),
                        builder: (ctx, child) => Theme(
                          data: Theme.of(ctx).copyWith(
                            colorScheme: const ColorScheme.dark(
                              primary: AppColors.accentPrimary,
                              onPrimary: Colors.white,
                              surface: AppColors.bgCard,
                              onSurface: AppColors.textPrimary,
                            ),
                          ),
                          child: child!,
                        ),
                      );
                      if (d != null) {
                        setState(() => _validFrom = DateTime(d.year, d.month, d.day, _validFrom.hour, _validFrom.minute));
                      }
                    },
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.textPrimary,
                      side: const BorderSide(color: AppColors.borderColor),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    child: Text(DateFormat('dd/MM/yyyy').format(_validFrom)),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    onPressed: () async {
                      final t = await showTimePicker(
                        context: context,
                        initialTime: TimeOfDay(hour: _validFrom.hour, minute: _validFrom.minute),
                        builder: (ctx, child) => Theme(
                          data: Theme.of(ctx).copyWith(
                            colorScheme: const ColorScheme.dark(
                              primary: AppColors.accentPrimary,
                              onPrimary: Colors.white,
                              surface: AppColors.bgCard,
                              onSurface: AppColors.textPrimary,
                            ),
                          ),
                          child: child!,
                        ),
                      );
                      if (t != null) {
                        setState(() => _validFrom = DateTime(
                          _validFrom.year,
                          _validFrom.month,
                          _validFrom.day,
                          t.hour,
                          t.minute,
                        ));
                      }
                    },
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.textPrimary,
                      side: const BorderSide(color: AppColors.borderColor),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    child: Text(DateFormat('HH:mm').format(_validFrom)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              'Horário de fim',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () async {
                      final d = await showDatePicker(
                        context: context,
                        initialDate: _validUntil,
                        firstDate: _validFrom,
                        lastDate: DateTime.now().add(const Duration(days: 365)),
                        builder: (ctx, child) => Theme(
                          data: Theme.of(ctx).copyWith(
                            colorScheme: const ColorScheme.dark(
                              primary: AppColors.accentPrimary,
                              onPrimary: Colors.white,
                              surface: AppColors.bgCard,
                              onSurface: AppColors.textPrimary,
                            ),
                          ),
                          child: child!,
                        ),
                      );
                      if (d != null) {
                        setState(() => _validUntil = DateTime(d.year, d.month, d.day, _validUntil.hour, _validUntil.minute));
                      }
                    },
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.textPrimary,
                      side: const BorderSide(color: AppColors.borderColor),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    child: Text(DateFormat('dd/MM/yyyy').format(_validUntil)),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    onPressed: () async {
                      final t = await showTimePicker(
                        context: context,
                        initialTime: TimeOfDay(hour: _validUntil.hour, minute: _validUntil.minute),
                        builder: (ctx, child) => Theme(
                          data: Theme.of(ctx).copyWith(
                            colorScheme: const ColorScheme.dark(
                              primary: AppColors.accentPrimary,
                              onPrimary: Colors.white,
                              surface: AppColors.bgCard,
                              onSurface: AppColors.textPrimary,
                            ),
                          ),
                          child: child!,
                        ),
                      );
                      if (t != null) {
                        setState(() => _validUntil = DateTime(
                          _validUntil.year,
                          _validUntil.month,
                          _validUntil.day,
                          t.hour,
                          t.minute,
                        ));
                      }
                    },
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.textPrimary,
                      side: const BorderSide(color: AppColors.borderColor),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    child: Text(DateFormat('HH:mm').format(_validUntil)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.lg),
            Text(
              'Portas (relés)',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            ...widget.relays.map((r) {
              final id = r['_id'] as String?;
              final name = r['name'] as String? ?? '—';
              if (id == null) return const SizedBox.shrink();
              final selected = _selectedRelayIds.contains(id);
              return CheckboxListTile(
                value: selected,
                onChanged: (v) {
                  setState(() {
                    if (v == true) {
                      _selectedRelayIds.add(id);
                    } else {
                      _selectedRelayIds.remove(id);
                    }
                  });
                },
                title: Text(name, style: GoogleFonts.plusJakartaSans(color: AppColors.textPrimary)),
                activeColor: AppColors.accentPrimary,
                fillColor: WidgetStateProperty.resolveWith((states) {
                  if (states.contains(WidgetState.selected)) return AppColors.accentPrimary;
                  return AppColors.bgCard;
                }),
              );
            }),
            const SizedBox(height: AppSpacing.lg),
            FilledButton(
              onPressed: _saving ? null : _submit,
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.accentPrimary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
              ),
              child: _saving
                  ? const SizedBox(
                      height: 24,
                      width: 24,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : Text('Criar convite', style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w600)),
            ),
          ],
        ),
      ),
    );
  }
}
