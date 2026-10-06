// i4u дизайн жүйесі — Flutter үшін.
// Дереккөз: docs/design-tokens.json, макет: https://zerdewnik.github.io/mobile-mock/
// Қолдану: MaterialApp(theme: I4UTheme.student()) немесе I4UTheme.staff()
import 'package:flutter/material.dart';

class I4UColors {
  // Студент
  static const studentPrimary = Color(0xFF5B6EC2);
  static const studentDeep = Color(0xFF3B4089);
  static const studentAppBar = Color(0xFF2B3553);
  static const studentLight = Color(0xFF8A8FD6);
  // Staff (куратор)
  static const staffPrimary = Color(0xFF8B5CF6); // күлгін
  static const staffDeep = Color(0xFF6D3FD8);
  static const staffAppBar = Color(0xFF36245E);
  // Беттер
  static const background = Color(0xFF121212);
  static const card = Color(0xFF1E1E1E);
  static const cardRaised = Color(0xFF262628);
  static const cardTop = Color(0xFF26262C);
  static const cardBottom = Color(0xFF1E1E22);
  static const input = Color(0xFF181818);
  static const border = Color(0xFF2C2C33);
  static const borderStrong = Color(0xFF34343C);
  static const edge3d = Color(0xFF0C0C10);
  // Мәтін
  static const text = Color(0xFFFFFFFF);
  static const textSecondary = Color(0xFFC8CAD4);
  static const hint = Color(0xFF8A8D9C);
  static const muted = Color(0xFF6C6F84);
  static const onLight = Color(0xFF1C1C22);
  // Статус
  static const success = Color(0xFF5CB36D);
  static const successBg = Color(0xFF1F2E24);
  static const warning = Color(0xFFE0A84A);
  static const orange = Color(0xFFE0873A);
  static const danger = Color(0xFFE06B5B);
  static const dangerBg = Color(0xFF3A2020);
  static const info = Color(0xFF6C7FD8);
  // I4U монета (көк)
  static const coinLight = Color(0xFFDDE3FF);
  static const coin = Color(0xFF8A97F2);
  static const coinDark = Color(0xFF3B4089);
  static const coinText = Color(0xFFA9B4FF);

  // Алтын (кубок, жеңіс, 3D gold батырма)
  static const goldLight = Color(0xFFFFF1B8);
  static const gold = Color(0xFFFFD24D);
  static const goldDark = Color(0xFFE0A21B);
  static const goldEdge = Color(0xFF9A6608);
  // ҰБТ экраны (ашық)
  static const entBg = Color(0xFFE9EAEE);
  static const entBar = Color(0xFF3B4089);
  static const entNum = Color(0xFFB6B9D0);
  static const entNumAnswered = Color(0xFF7D82B8);
  // Сабақ түрлері
  static const kindVideo = Color(0xFF4FB1BA);
  static const kindTest = Color(0xFF5CB36D);
  static const kindWeekly = Color(0xFFA05AD8);
  static const kindFinal = Color(0xFFE0604A);
  // Жекпе-жек раундтары
  static const roundEasy = Color(0xFF5CB36D);
  static const roundMedium = Color(0xFFE0A84A);
  static const roundHard = Color(0xFFE0604A);
}

class I4URadius {
  static const xs = 6.0, sm = 8.0, md = 12.0, lg = 15.0, xl = 16.0, card3d = 18.0, sheet = 20.0;
}

class I4USpace {
  static const xxs = 4.0, xs = 6.0, sm = 8.0, md = 12.0, lg = 16.0, xl = 20.0, page = 15.0;
}

class I4UText {
  static const appBarTitle = TextStyle(fontFamily: 'Roboto', fontSize: 18, fontWeight: FontWeight.w700, color: I4UColors.text);
  static const screenTitle = TextStyle(fontFamily: 'Roboto', fontSize: 21, fontWeight: FontWeight.w800, color: I4UColors.text);
  static const cardTitle = TextStyle(fontFamily: 'Roboto', fontSize: 15.5, fontWeight: FontWeight.w800, color: I4UColors.text);
  static const body = TextStyle(fontFamily: 'Roboto', fontSize: 14, color: I4UColors.text);
  static const bodyStrong = TextStyle(fontFamily: 'Roboto', fontSize: 14, fontWeight: FontWeight.w600, color: I4UColors.text);
  static const caption = TextStyle(fontFamily: 'Roboto', fontSize: 11.5, color: I4UColors.hint);
  static const label = TextStyle(fontFamily: 'Roboto', fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 0.6, color: I4UColors.hint);
  static const stat = TextStyle(fontFamily: 'Roboto', fontSize: 22, fontWeight: FontWeight.w700, color: I4UColors.text);
}

/// 3D стиль: жоғарғы жарық жиек + төменгі «қалыңдық» + жұмсақ көлеңке.
class I4U3D {
  static BoxDecoration card({Color? glow}) => BoxDecoration(
        gradient: glow == null
            ? const LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [I4UColors.cardTop, I4UColors.cardBottom])
            : RadialGradient(center: Alignment.topCenter, radius: 1.2, colors: [Color.lerp(I4UColors.cardBottom, glow, .35)!, I4UColors.cardBottom]),
        borderRadius: BorderRadius.circular(I4URadius.card3d),
        border: Border.all(color: glow == null ? I4UColors.border : Color.lerp(I4UColors.border, glow, .4)!),
        boxShadow: const [
          BoxShadow(color: I4UColors.edge3d, offset: Offset(0, 4)),
          BoxShadow(color: Color(0x59000000), offset: Offset(0, 10), blurRadius: 24),
        ],
      );

  static BoxDecoration button(Color primary, {bool pressed = false}) => BoxDecoration(
        gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [
          Color.lerp(primary, Colors.white, .3)!,
          primary,
          Color.lerp(primary, Colors.black, .25)!,
        ], stops: const [0, .45, 1]),
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(color: Color.lerp(primary, Colors.black, .55)!, offset: Offset(0, pressed ? 1 : 4)),
          BoxShadow(color: const Color(0x59000000), offset: Offset(0, pressed ? 4 : 10), blurRadius: pressed ? 10 : 20),
        ],
      );

  static BoxDecoration goldButton({bool pressed = false}) => BoxDecoration(
        gradient: const LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [I4UColors.goldLight, I4UColors.gold, I4UColors.goldDark], stops: [0, .45, 1]),
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(color: I4UColors.goldEdge, offset: Offset(0, pressed ? 1 : 4)),
          BoxShadow(color: const Color(0x40E0A21B), offset: Offset(0, pressed ? 4 : 10), blurRadius: pressed ? 10 : 20),
        ],
      );
}

/// 3D батырма: басқанда 3px төмен түседі.
class I4UButton3D extends StatefulWidget {
  const I4UButton3D({super.key, required this.label, this.icon, required this.onTap, this.color, this.gold = false, this.height = 50});
  final String label;
  final IconData? icon;
  final VoidCallback onTap;
  final Color? color;
  final bool gold;
  final double height;
  @override
  State<I4UButton3D> createState() => _I4UButton3DState();
}

class _I4UButton3DState extends State<I4UButton3D> {
  bool _down = false;
  @override
  Widget build(BuildContext context) {
    final primary = widget.color ?? Theme.of(context).colorScheme.primary;
    final fg = widget.gold ? const Color(0xFF2A2006) : Colors.white;
    return GestureDetector(
      onTapDown: (_) => setState(() => _down = true),
      onTapCancel: () => setState(() => _down = false),
      onTapUp: (_) {
        setState(() => _down = false);
        widget.onTap();
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 80),
        height: widget.height,
        transform: Matrix4.translationValues(0, _down ? 3 : 0, 0),
        decoration: widget.gold ? I4U3D.goldButton(pressed: _down) : I4U3D.button(primary, pressed: _down),
        alignment: Alignment.center,
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          if (widget.icon != null) ...[Icon(widget.icon, color: fg, size: 22), const SizedBox(width: 8)],
          Text(widget.label, style: TextStyle(fontFamily: 'Roboto', fontSize: 15, fontWeight: FontWeight.w800, color: fg)),
        ]),
      ),
    );
  }
}

class I4UTheme {
  static ThemeData _base(Color primary, Color appBar) => ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        fontFamily: 'Roboto',
        scaffoldBackgroundColor: I4UColors.background,
        colorScheme: ColorScheme.dark(primary: primary, surface: I4UColors.card, error: I4UColors.danger),
        appBarTheme: AppBarTheme(backgroundColor: appBar, elevation: 0, titleTextStyle: I4UText.appBarTitle, toolbarHeight: 48),
        cardTheme: CardThemeData(color: I4UColors.card, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(I4URadius.lg))),
        bottomNavigationBarTheme: BottomNavigationBarThemeData(
          backgroundColor: I4UColors.card,
          selectedItemColor: primary,
          unselectedItemColor: const Color(0xFF9E9E9E),
          selectedLabelStyle: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700),
          unselectedLabelStyle: const TextStyle(fontSize: 10, fontWeight: FontWeight.w500),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: I4UColors.input,
          hintStyle: const TextStyle(color: I4UColors.muted),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(I4URadius.md), borderSide: BorderSide.none),
        ),
      );
  static ThemeData student() => _base(I4UColors.studentPrimary, I4UColors.studentAppBar);
  static ThemeData staff() => _base(I4UColors.staffPrimary, I4UColors.staffAppBar);
}
