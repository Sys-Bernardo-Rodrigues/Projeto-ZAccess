import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';

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
        title: Text('Remover convite', style: GoogleFonts.inter(color: AppColors.textPrimary)),
        content: Text(
          'Deseja realmente remover este convite?',
          style: GoogleFonts.inter(color: AppColors.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('Não', style: GoogleFonts.inter(color: AppColors.textMuted)),
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
            backgroundColor: AppColors.bgCard,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  void _openCreateDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        decoration: const BoxDecoration(
          color: AppColors.bgSecondary,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
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
        backgroundColor: AppColors.bgSecondary,
        title: Text(
          'Convites',
          style: GoogleFonts.inter(fontWeight: FontWeight.w700, color: AppColors.textPrimary),
        ),
        iconTheme: const IconThemeData(color: AppColors.textSecondary),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_rounded),
            onPressed: _relays.isEmpty ? null : _openCreateDialog,
            tooltip: 'Novo convite',
            color: _relays.isEmpty ? AppColors.textMuted : AppColors.accentPrimaryLight,
          ),
        ],
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
              : _invitations.isEmpty && _relays.isEmpty
                  ? Center(
                      child: Text(
                        'Nenhum relé disponível no seu local para convites.',
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
                        itemCount: _invitations.length,
                        itemBuilder: (context, i) {
                          final inv = _invitations[i] as Map<String, dynamic>;
                          final id = inv['_id'] as String?;
                          final name = inv['name'] as String? ?? '—';
                          final validFrom = inv['validFrom'] != null
                              ? DateFormat('dd/MM/yyyy').format(DateTime.parse(inv['validFrom'].toString()))
                              : '—';
                          final validUntil = inv['validUntil'] != null
                              ? DateFormat('dd/MM/yyyy').format(DateTime.parse(inv['validUntil'].toString()))
                              : '—';
                          final relayIds = inv['relayIds'] as List<dynamic>? ?? [];
                          final relayNames = relayIds
                              .map((r) => r is Map ? (r['name'] as String?) : null)
                              .whereType<String>()
                              .toList();
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
                                      color: AppColors.accentPrimary.withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(14),
                                    ),
                                    child: const Icon(
                                      Icons.mail_outline_rounded,
                                      color: AppColors.accentPrimaryLight,
                                      size: 24,
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
                                            fontWeight: FontWeight.w600,
                                            color: AppColors.textPrimary,
                                            fontSize: 15,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          'De $validFrom até $validUntil',
                                          style: GoogleFonts.inter(fontSize: 13, color: AppColors.textMuted),
                                        ),
                                        if (relayNames.isNotEmpty)
                                          Text(
                                            'Portas: ${relayNames.join(", ")}',
                                            style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                      ],
                                    ),
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
  DateTime _validFrom = DateTime.now();
  DateTime _validUntil = DateTime.now().add(const Duration(days: 7));
  final List<String> _selectedRelayIds = [];
  bool _saving = false;

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
            backgroundColor: AppColors.bgCard,
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
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Novo convite',
              style: GoogleFonts.inter(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 20),
            TextField(
              controller: _nameController,
              style: GoogleFonts.inter(color: AppColors.textPrimary),
              decoration: const InputDecoration(
                labelText: 'Nome do convidado',
                hintText: 'Ex: João Silva',
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Período de validade',
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 10),
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
                      if (d != null) setState(() => _validFrom = d);
                    },
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.textPrimary,
                      side: const BorderSide(color: AppColors.borderColor),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    child: Text(DateFormat('dd/MM/yyyy').format(_validFrom)),
                  ),
                ),
                const SizedBox(width: 10),
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
                      if (d != null) setState(() => _validUntil = d);
                    },
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.textPrimary,
                      side: const BorderSide(color: AppColors.borderColor),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    child: Text(DateFormat('dd/MM/yyyy').format(_validUntil)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            Text(
              'Portas (relés)',
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 8),
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
                title: Text(name, style: GoogleFonts.inter(color: AppColors.textPrimary)),
                activeColor: AppColors.accentPrimary,
                fillColor: MaterialStateProperty.resolveWith((states) {
                  if (states.contains(MaterialState.selected)) return AppColors.accentPrimary;
                  return AppColors.bgCard;
                }),
              );
            }),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: _saving ? null : _submit,
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.accentPrimary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
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
                  : Text('Criar convite', style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
            ),
          ],
        ),
      ),
    );
  }
}
