# i4u mobile mock

Браузерный макет **1:1** staff + студент. Иконки и размеры как в Flutter.

## Режимы

- **Staff** — фиолетовый `#8B5CF6` / app bar `#36245E`: зачисления, студенты, пуши, группы, эфир
- **Студент** — синий `#5B6EC2` / app bar `#2B3553`: главная, новости, уведомления, курсы, AI
- **Профиль** — кнопка человека в app bar (как в приложении). Переключение staff ↔ студент через «Админ-панель» / «Вернуться в приложение»

## Иконки

| Flutter | Макет |
|---|---|
| `Icons.assignment_*` | `assignment` |
| `Icons.home_*` | `home` |
| `Icons.newspaper_*` | `newspaper` |
| `Icons.menu_book_*` | `menu_book` |
| `Icons.notifications_*` | `notifications_none` / `notifications` |
| `Icons.groups_*` | `groups` |
| `Icons.live_tv_rounded` | `live_tv` (центр Эфир) |
| AI center asset | `smart_toy` (центр студент) |
| `Icons.person` | app bar → профиль |
| `Icons.info_outline` / `description` / `security` / `headset_mic` / `restore` / `dark_mode` / `language` / `school` / `admin_panel_settings` | меню профиля |

## Открыть

http://localhost:5179 или двойной клик по `index.html`

## Правки

- данные → `js/data.js`
- экраны → `js/app.js`
- цвета/отступы → `css/app.css`
