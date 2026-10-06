# i4u мобильді қосымшасы — бағдарламашыға арналған құжат

Бұл папка — **Flutter-де жасау үшін толық сипаттама**. Тірі макет: https://zerdewnik.github.io/mobile-mock/ (студент), https://zerdewnik.github.io/mobile-mock/#staff (куратор).

| Файл | Ішінде |
|---|---|
| [design-tokens.json](design-tokens.json) | Барлық түс, қаріп, өлшем, radius, шегініс, 3D көлеңке мен градиент |
| [flutter/i4u_theme.dart](flutter/i4u_theme.dart) | Дайын Flutter коды: `I4UColors`, `I4UText`, `I4URadius`, `I4U3D` (3D карточка/батырма), `I4UButton3D`, `I4UTheme.student()/staff()` |
| [ICONS.md](ICONS.md) | Әр иконка: Material атауы → Flutter `Icons.*`, өз файлдарымыз (өлшемі, қайда қолданылады, тікелей сілтеме), `pubspec.yaml` |
| [COMPONENTS.md](COMPONENTS.md) | Әр компонент: не үшін, өлшемі, түсі, күйлері, CSS класы, Flutter виджеті |
| [SCREENS.md](SCREENS.md) | Студент пен куратордың әр экраны және функциясы |
| [features/NEWS.md](features/NEWS.md) | Жаңалық жазу, тексеру (бас куратор / академ. бөлім), баннер, API |
| [features/WEEKLY_TEST.md](features/WEEKLY_TEST.md) | Апталық сынақты куратор өткізеді: ашық/жабық сұрақ, балл, рейтинг |
| [features/GROUP_WAR.md](features/GROUP_WAR.md) | Топ соғысы: куратор бастайды, ортақ пән бойынша қарсылас, дайындық/шайқас, ★ |
| [features/BATTLE.md](features/BATTLE.md) | Батл: кездейсоқ/дос, шақырулар, асинхронды, рейтинг |
| [features/TOURNAMENT.md](features/TOURNAMENT.md) | Турнир/жекпе-жек: рөлдер, тіркелу, кесте, ереже, деректер моделі, API |

## Макетпен жұмыс
- Компьютерде телефон макетін жылжытып, кішірейтуге болады (− / + / ⟲).
- Элементтің нақты өлшемі мен түсі: оң жақ батырма → **Inspect** (DevTools).
- Код: `js/app.js` (экрандар), `js/data.js` (үлгі деректер — API құрылымына сай), `css/app.css` (стильдер), `js/i18n.js` (қазақша аударма).

## Жаңарту ережесі
Макетке әр жаңа функция қосылғанда осы құжаттар бірге жаңартылады: түс/өлшем → `design-tokens.json` + `i4u_theme.dart`, жаңа иконка → `ICONS.md` (+ файл `assets/`), жаңа компонент → `COMPONENTS.md`, жаңа экран → `SCREENS.md`, үлкен функция → `features/*.md`.
Өзгерістер тарихы: GitHub коммиттері (https://github.com/zerdewnik/mobile-mock/commits/main).
