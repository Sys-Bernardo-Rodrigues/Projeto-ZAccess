// Smoke test do app Zaccess.
import 'package:flutter_test/flutter_test.dart';
import 'package:zaccess_app/main.dart';

void main() {
  testWidgets('App inicia sem erro', (WidgetTester tester) async {
    await tester.pumpWidget(const ZaccessApp());
    await tester.pumpAndSettle(const Duration(seconds: 3));
    expect(find.byType(ZaccessApp), findsOneWidget);
  });
}
