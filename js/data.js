/** Mutable fake data — everything works offline */
window.MOCK = {
  curator: { id: 1, name: "Диана Куратор", initials: "ДК" },
  courses: [
    { id: 0, title: "Все", short: "Все" },
    { id: 10, title: "Дизайн и живопись техники", short: "ДЖТ" },
    { id: 11, title: "Математика", short: "мат" },
    { id: 12, title: "Құқық негіздері", short: "құқық" },
    { id: 13, title: "Қазақстан тарихы", short: "тарих" },
    { id: 14, title: "Химия", short: "Химия" },
    { id: 15, title: "Биология", short: "био" },
    { id: 16, title: "Ағылшын тілі", short: "ағылшын" },
  ],
  curators: [
    { id: 1, name: "Диана Куратор", courseId: 10, isChief: false },
    { id: 2, name: "Айгерим", courseId: 11, isChief: false },
    { id: 3, name: "Главный куратор", courseId: null, isChief: true },
    { id: 4, name: "Назгүл", courseId: 13, isChief: false },
    { id: 5, name: "Еркебұлан", courseId: 11, isChief: false },
    { id: 6, name: "Балайым", courseId: 15, isChief: false },
  ],
  pickerStudents: [
    { id: 11, name: "Томирис Досымхан", phone: "+7 778 215 35 57" },
    { id: 12, name: "Ибраһим Орысбаев", phone: "+7 778 603 89 20" },
    { id: 13, name: "Ерман Нұрлыбек", phone: "+7 775 161 20 51" },
    { id: 14, name: "Іңкәр Жақсылық", phone: "+7 777 595 80 03" },
    { id: 15, name: "динара исенбай", phone: "+7 778 294 84 81" },
    { id: 16, name: "Kausar Duisenbai", phone: "+7 701 179 56 58" },
    { id: 17, name: "Сабыржан Жарылқасын", phone: "+7 771 498 87 10" },
    { id: 21, name: "Аружан Бек", phone: "+7 707 111 22 33" },
    { id: 22, name: "Нұрлан Сат", phone: "+7 707 444 55 66" },
    { id: 23, name: "Меруерт Қали", phone: "+7 708 777 88 99" },
    { id: 24, name: "Данияр Ом", phone: "+7 701 000 11 22" },
    { id: 31, name: "Алина Тест", phone: "+7 777 000 00 01" },
    { id: 32, name: "Болат Тест", phone: "+7 777 000 00 02" },
  ],
  /** Мои группы. students жоқ топтарға тізім data.js соңында генерацияланады */
  groups: [
    {
      id: 9,
      name: "Викингтер",
      courseId: 10,
      courseLabel: "ДЖТ · Диана",
      curatorId: 1,
      studentsCount: 15,
      students: [
        { id: 14, name: "Іңкәр Жақсылық", phone: "+7 777 595 80 03", initials: "ІЖ", color: "#D9707A", rank: 1, medal: "gold", score: 82, progress: "48/77", lastSeen: "был 1 час назад", pointsToday: 0, rankChange: 0 },
        { id: 15, name: "динара исенбай", phone: "+7 778 294 84 81", initials: "ДИ", color: "#E8A070", rank: 2, medal: "silver", score: 65, progress: "24/77", lastSeen: "был 1 час назад", pointsToday: 0, rankChange: 0 },
        { id: 13, name: "Ерман Нұрлыбек", phone: "+7 775 161 20 51", initials: "ЕН", color: "#7CC8C8", rank: 3, medal: "bronze", score: 56, progress: "60/77", lastSeen: "был 12 часов назад", pointsToday: 6, rankChange: 0 },
        { id: 11, name: "Томирис Досымхан", phone: "+7 778 215 35 57", initials: "ТД", color: "#A48EE0", rank: 4, medal: null, score: 47, progress: "51/77", lastSeen: "был 4 минуты назад", pointsToday: 41, rankChange: 1 },
        { id: 12, name: "Ибраһим Орысбаев", phone: "+7 778 603 89 20", initials: "ИО", color: "#6A9FD8", rank: 5, medal: null, score: 44, progress: "51/77", lastSeen: "был 5 часов назад", pointsToday: 0, rankChange: -1 },
        { id: 16, name: "Kausar Duisenbai", phone: "+7 701 179 56 58", initials: "KD", color: "#7CC8C8", rank: 6, medal: null, score: 0, progress: "52/77", lastSeen: "был 29.09.26", pointsToday: 0, rankChange: 0 },
        { id: 17, name: "Сабыржан Жарылқасын", phone: "+7 771 498 87 10", initials: "СЖ", color: "#E8A070", rank: 7, medal: null, score: 0, progress: "8/77", lastSeen: "был 24.09.26", pointsToday: 0, rankChange: 0 },
      ],
    },
    /* Басқа кураторлардың топтары — тек бас куратор / академ. бөлім басшысына көрінеді */
    { id: 6, name: "Хронос 2", courseId: 10, courseLabel: "ДЖТ · Айгерім", curatorId: 2, studentsCount: 14 },
    { id: 11, name: "Тарихшылар", courseId: 10, courseLabel: "ДЖТ · Назгүл", curatorId: 4, studentsCount: 9 },
    { id: 1, name: "құқық", courseId: 12, courseLabel: "құқық · Назгүл", curatorId: 4, studentsCount: 8 },
    { id: 2, name: "Math Empire", courseId: 11, courseLabel: "мат · Еркебұлан", curatorId: 5, studentsCount: 9 },
    { id: 3, name: "Хронос 3", courseId: 13, courseLabel: "тарих · Назгүл", curatorId: 4, studentsCount: 29 },
    { id: 4, name: "Нейрондар 2", courseId: 14, courseLabel: "Химия · Балайым", curatorId: 6, studentsCount: 7 },
    { id: 5, name: "Пифагор ұрпақтары", courseId: 11, courseLabel: "мат · Еркебұлан", curatorId: 5, studentsCount: 15 },
    { id: 7, name: "НЕЙРОНДАР", courseId: 15, courseLabel: "био · Балайым", curatorId: 6, studentsCount: 17 },
    { id: 8, name: "СИНАПСТАР", courseId: 15, courseLabel: "био · Балайым", curatorId: 6, studentsCount: 12 },
    { id: 10, name: "Future Leaders", courseId: 16, courseLabel: "ағылшын · Айгерім", curatorId: 2, studentsCount: 11 },
  ],
  students: [
    { id: 11, name: "Томирис Досымхан", phone: "+7 778 215 35 57", initials: "ТД", color: "#5B6EC2", status: "online", course: "ДЖТ", progress: "48/77", blocked: false },
    { id: 12, name: "Ибраһим Орысбаев", phone: "+7 778 603 89 20", initials: "ИО", color: "#25AB7C", status: "recent", course: "ДЖТ", progress: "48/77", blocked: false },
    { id: 21, name: "Аружан Бек", phone: "+7 707 111 22 33", initials: "АБ", color: "#5B6EC2", status: "online", course: "Математика", progress: "30/50", blocked: false },
    { id: 22, name: "Нұрлан Сат", phone: "+7 707 444 55 66", initials: "НС", color: "#25AB7C", status: "recent", course: "Математика", progress: "22/50", blocked: false },
    { id: 31, name: "Алина Тест", phone: "+7 777 000 00 01", initials: "АТ", color: "#9BB8DA", status: "offline", course: "Все", progress: "10/40", blocked: true },
  ],
  enrollments: [
    { id: 101, student: "Томирис Досымхан", phone: "+7 778 215 35 57", course: "ДЖТ", courseId: 10, status: "active", statusLabel: "Активен", date: "01.09.2026", daysLeft: 62 },
    { id: 102, student: "Аружан Бек", phone: "+7 707 111 22 33", course: "Математика", courseId: 11, status: "active", statusLabel: "Активен", date: "10.09.2026", daysLeft: 80 },
    { id: 103, student: "Нұрлан Сат", phone: "+7 707 444 55 66", course: "Математика", courseId: 11, status: "freeze", statusLabel: "Заморозка", date: "05.08.2026", daysLeft: null },
    { id: 104, student: "Данияр Ом", phone: "+7 701 000 11 22", course: "ДЖТ", courseId: 10, status: "pending", statusLabel: "Ожидает", date: "27.09.2026", daysLeft: 90 },
  ],
  /** Хабарлама (пуштар). stats = «получили / прочитали» */
  pushes: [
    { id: 1, title: "10:00 АПТАЛЫҚ СЫНАҚ‼️ (зачет)", type: "Объявление", body: "ұйықтап қалмаймыз,бәріміз қосыламыз🥰 ✅", time: "Сегодня 21:31", audience: "Викингтер", stats: "15 / 2" },
    { id: 2, title: "10:00 АПТАЛЫҚ СЫНАҚ‼️ (зачет)", type: "Объявление", body: "ұйықтай қалмаймыз,бәріміз қосыламыз🥰 ✅", time: "Сегодня 21:30", audience: "Викингтер", stats: "15 / 1" },
    { id: 3, title: "10:00 АПТАЛЫҚ СЫНАҚ‼️ (зачет)", type: "Объявление", body: "ұйықтап қалмаймыз, бәріміз қосыламыз🥰 ✅", time: "Сегодня 21:21", audience: "Викингтер", stats: "15 / 0" },
    { id: 4, title: "БИО эфирге 20 МИНУТ қалдыы🔥 🔥 🔥", type: "Объявление", body: "жасушамызды бірге зерттейік", time: "30.09.26 17:39", audience: "Викингтер", stats: "15 / 0" },
    { id: 5, title: "Ертең 19:00-де тарих эфирі", type: "Напоминание", body: "Викингтер, сілтемені группадан аласыздар", time: "29.09.26 20:05", audience: "Викингтер", stats: "15 / 15" },
  ],
  /** Эфир: date = YYYY-MM-DD */
  efirs: [
    { id: 1, title: "Тарих: Қазақ хандығы", link: "https://meet.google.com/abc-defg-hij", date: "2026-10-03", time: "19:00", groups: [9] },
    { id: 2, title: "ДЖТ разбор апталық сынақ", link: "https://zoom.us/j/123456789", date: "2026-10-03", time: "20:30", groups: [9] },
    { id: 3, title: "Тарих: Алаш қозғалысы", link: "https://meet.google.com/xyz-abcd-efg", date: "2026-10-05", time: "19:00", groups: [9] },
    { id: 4, title: "Разбор ЕНТ", link: "https://meet.google.com/ent-rzbr-001", date: "2026-10-01", time: "18:00", groups: [9] },
  ],
  pushTypes: [
    { value: "announcement", label: "Объявление" },
    { value: "reminder", label: "Напоминание" },
    { value: "urgent", label: "Срочно" },
  ],
  audiences: [
    { value: "all", label: "Все" },
    { value: "group", label: "Группа" },
    { value: "course", label: "Курс" },
    { value: "student", label: "Ученик" },
  ],
  filters: {
    studentBlocked: null,
    enrollmentStatus: null,
  },
  /** Logged-in user (profile screen) */
  me: {
    firstName: "Диана",
    lastName: "I4U",
    initials: "ТД",
    color: "#5B6EC2",
    phone: "+7 778 215 35 57",
    canStaff: true,
  },
  stories: [
    { id: 1, title: "Старт недели", hue: "linear-gradient(135deg,#3d4a8c,#1e2744 55%,#6b4a2a)" },
    { id: 2, title: "Эфир", hue: "linear-gradient(135deg,#2a6b55,#1a3d38)" },
    { id: 3, title: "ДЖТ", hue: "linear-gradient(135deg,#5b3d8c,#2b1d44)" },
  ],
  myCourses: [
    {
      id: 10,
      title: "Ағылшын тілі",
      total: 128,
      done: 0,
      days: 334,
      poster: { lines: ["АҒЫЛШЫН", "ТІЛІ"], bg: "linear-gradient(135deg,#7b2fc0,#5a1f9a)", img: "assets/v2/eng_uk.png" },
    },
    {
      id: 11,
      title: "Дүниежүзі Тарихы",
      total: 172,
      done: 0,
      days: 334,
      poster: { lines: ["ДҮНИЕЖҮЗІ", "ТАРИХЫ"], bg: "linear-gradient(135deg,#3f8a78,#2e6e5f)", img: "assets/v2/history_world.png" },
    },
    { id: 12, title: "Биология", total: 130, done: 2, days: 657, poster: { lines: ["БИОЛОГИЯ"], bg: "linear-gradient(135deg,#46a14f,#2f7d3a)", img: "assets/v2/bio.png" } },
    { id: 13, title: "География", total: 223, done: 1, days: 657, poster: { lines: ["ГЕОГРАФИЯ"], bg: "linear-gradient(135deg,#2bb0c8,#1b8aa6)", img: "assets/v2/geo.png" } },
    { id: 14, title: "Информатика", total: 131, done: 0, days: 657, poster: { lines: ["ИНФОРМАТИКА"], bg: "linear-gradient(135deg,#c23b5f,#962446)", img: "assets/v2/informatics.png" } },
    { id: 15, title: "Математика", total: 132, done: 41, days: 657, poster: { lines: ["МАТЕМАТИКА"], bg: "linear-gradient(135deg,#4f86d0,#3567b0)", img: "assets/v2/math.png" } },
  ],
  /**
   * Курс → бөлімдер → сабақтар.
   * Сабақ: "v:" видео, "t:" тест, "w:" апталық сынақ, "f:" бекіту тест.
   * current — қазір өтетін сабақ (одан кейінгілері құлыпталған).
   */
  courseContent: {
    15: {
      numbered: true,
      accent: "#2a3647",
      current: "t:Гипербола. Кубтық парабола",
      sections: [
        { title: "Кіріспе", items: ["v:Кіріспе", "t:Кіріспе тест"] },
        {
          title: "Теңдеулер",
          items: [
            "v:Теңдеулер. Әртүрлі теңдеулер", "t:Теңдеулер. Әртүрлі теңдеулер",
            "v:Теңдеулер. Көбейтінді түріндегі және бөлшектік теңдеулер", "t:Теңдеулер. Көбейтінді түріндегі және бөлшектік теңдеулер",
            "v:Жоғары дәрежелі және модульді теңдеулер", "t:Жоғары дәрежелі және модульді теңдеулер",
            "v:Теңдеу құруға арналған мәтін есептер", "t:Теңдеу құруға арналған мәтін есептер",
            "f:Бекіту тест (Теңдеулер)",
          ],
        },
        { title: "Теңсіздіктер", items: ["v:Сызықтық теңсіздіктер", "t:Сызықтық теңсіздіктер", "v:Интервалдар әдісі", "t:Интервалдар әдісі"] },
        { title: "Комбинаторика", items: ["v:Орналастыру, алмастыру", "t:Орналастыру, алмастыру", "v:Терулер", "t:Терулер", "w:Апталық сынақ (6 - апта)"] },
        { title: "Тізбектер", items: ["v:Арифметикалық прогрессия", "t:Арифметикалық прогрессия", "v:Геометриялық прогрессия", "t:Геометриялық прогрессия"] },
        { title: "Тригонометрия", items: ["v:Тригонометриялық функциялар", "t:Тригонометриялық функциялар", "v:Тригонометриялық теңдеулер", "t:Тригонометриялық теңдеулер", "w:Апталық сынақ (9 - апта)"] },
        {
          title: "Функция",
          items: [
            "v:Функция. Анықтамасы", "t:Функция. Анықтамасы",
            "v:Функция. Жұптылық тақтылық", "t:Функция. Жұптылық тақтылық",
            "v:Функция. Түзу, парабола", "t:Функция. Түзу, парабола",
            "v:Гипербола. Кубтық парабола", "t:Гипербола. Кубтық парабола",
            "v:Логарифмдік және көрсеткіштік функция", "t:Логарифмдік және көрсеткіштік функция",
            "w:Апталық сынақ (10 - апта)",
            "v:Кері функция", "v:Анықталу облысы", "v:Мәндер облысы",
            "f:Бекіту тест (Функция)",
          ],
        },
        { title: "Логарифм", items: ["v:Логарифм анықтамасы", "t:Логарифм анықтамасы", "v:Логарифмдік теңдеулер", "t:Логарифмдік теңдеулер"] },
        { title: "Туынды", items: ["v:Туынды анықтамасы", "t:Туынды анықтамасы", "v:Туындының қолданылуы", "t:Туындының қолданылуы"] },
        { title: "Алғашқы функция", items: ["v:Алғашқы функция", "t:Алғашқы функция", "v:Анықталған интеграл", "t:Анықталған интеграл", "f:Бекіту тест (Интеграл)"] },
      ],
    },
    10: {
      accent: "#2c3156",
      dimLocked: true,
      current: "v:Noun",
      sections: [
        {
          title: "Nouns, Pronouns & Basic Tenses",
          items: [
            "v:Noun", "t:Noun", "v:Adjective", "t:Adjective", "v:Homework", "v:Numerals", "t:Numerals",
            "w:Апталық сынақ (1 - апта)", "v:Pronoun", "t:Pronoun", "v:Present Simple", "t:Present Simple",
            "v:Past Simple and Continuous", "t:Past Simple and Continuous", "f:Бекіту тест (Nouns & Tenses)",
          ],
        },
        { title: "Tenses System & Parts of Speech", items: ["v:Present Perfect", "t:Present Perfect", "v:Future Tenses", "t:Future Tenses", "v:Adverb", "t:Adverb", "v:Homework 3", "w:Апталық сынақ (4 - апта)"] },
        { title: "Constructions, Modals & Determiners", items: ["v:Prepositions", "t:Prepositions", "v:Article", "t:Article", "v:Modal Verbs", "t:Modal Verbs"] },
        { title: "Reported Speech, Conditionals & Passive Voice", items: ["v:Reported Speech", "t:Reported Speech", "v:Conditionals", "t:Conditionals", "v:Passive Voice", "t:Passive Voice"] },
        { title: "Verbals & Complex Constructions", items: ["v:Gerund and Infinitive", "t:Gerund and Infinitive", "v:Complex Object", "t:Complex Object"] },
        { title: "Sentence Structures & Clauses", items: ["v:Impersonal Sentences", "t:Impersonal Sentences", "v:Relative Clauses", "t:Relative Clauses"] },
        { title: "Advanced Grammar, Vocabulary & Final Revision", items: ["v:Phrasal Verbs", "t:Phrasal Verbs", "v:Word Formation", "t:Word Formation", "f:Бекіту тест (Final)"] },
      ],
    },
    11: {
      current: "t:Осман империясы (1)",
      sections: [
        { title: "Ежелгі дүние", items: ["v:Ежелгі Египет", "t:Ежелгі Египет", "v:Рим империясының құлауы", "t:Рим империясының құлауы"] },
        { title: "Орта ғасырлар", items: ["v:Византия", "t:Византия", "v:Осман империясы (1)", "t:Осман империясы (1)", "w:Апталық сынақ (4 - апта)"] },
        { title: "Жаңа заман", items: ["v:Англия мен Ресейдегі абсолютизм", "t:Англия мен Ресейдегі абсолютизм", "v:Ұлы географиялық ашулар", "t:Ұлы географиялық ашулар"] },
      ],
    },
    12: {
      accent: "#2c4a33",
      current: "v:Биологияға кіріспе. Вирустар",
      sections: [
        { title: "Кіріспе", items: ["v:Кіріспе", "t:Кіріспе"] },
        {
          title: "Микробиология",
          items: [
            "v:Биологияға кіріспе. Вирустар", "t:Биологияға кіріспе. Вирустар",
            "v:Бактериялар. 1 - Бөлімі", "t:Бактериялар. 1 - Бөлімі",
            "v:Бактериялар. 2 - Бөлімі", "t:Бактериялар. 2 - Бөлімі",
            "v:Саңырауқұлақтар", "t:Саңырауқұлақтар",
            "f:Бекіту тест (Микробиология)",
          ],
        },
        { title: "Жасушалық биология. Жасушалық цикл", items: ["v:Жасуша құрылысы", "t:Жасуша құрылысы", "v:Жасушалық цикл. Митоз", "t:Жасушалық цикл. Митоз", "v:Мейоз", "t:Мейоз"] },
        { title: "Ботаника", items: ["v:Өсімдік ұлпалары", "t:Өсімдік ұлпалары", "v:Фотосинтез", "t:Фотосинтез"] },
        { title: "Заттардың тасымалдануы", items: ["v:Қан айналым жүйесі", "t:Қан айналым жүйесі"] },
        { title: "Тыныс алу", items: ["v:Тыныс алу мүшелері", "t:Тыныс алу мүшелері"] },
        { title: "Қоректену", items: ["v:Ас қорыту. Ферменттер", "t:Ас қорыту. Ферменттер"] },
        { title: "Бөліп шығару", items: ["v:Бүйрек құрылысы", "t:Бүйрек құрылысы"] },
        { title: "Қозғалыс. Биофизика", items: ["v:Тірек-қимыл жүйесі", "t:Тірек-қимыл жүйесі"] },
        { title: "Координация және реттелу", items: ["v:Жүйке жүйесі", "t:Жүйке жүйесі", "v:Гормондар", "t:Гормондар"] },
        { title: "Көбею, өсу, даму", items: ["v:Жыныссыз көбею", "t:Жыныссыз көбею", "v:Жынысты көбею", "t:Жынысты көбею", "f:Бекіту тест (Көбею)"] },
      ],
    },
    13: {
      current: "t:Географиялық карта",
      sections: [
        { title: "Кіріспе", items: ["v:Географиялық карта", "t:Географиялық карта"] },
        { title: "Литосфера", items: ["v:Жер қыртысы", "t:Жер қыртысы", "v:Жер бедері", "t:Жер бедері"] },
      ],
    },
    14: {
      current: "v:Ақпарат және оның түрлері",
      sections: [
        { title: "Кіріспе", items: ["v:Ақпарат және оның түрлері", "t:Ақпарат және оның түрлері"] },
        { title: "Санау жүйелері", items: ["v:Екілік санау жүйесі", "t:Екілік санау жүйесі", "w:Апталық сынақ (2 - апта)"] },
      ],
    },
  },
  /** Сабақ тесттері (math: HTML формулалар). answer = дұрыс жауап индексі */
  lessonTests: {
    15: [
      { q: '<span class="m"><span class="sqrt">x + 5</span> = x − 1</span> теңдеуін шешіңіз.', options: ['<span class="m">x = 1</span>', '<span class="m">x = 4</span>', '<span class="m">x = −1</span>', '<span class="m">x = −1</span> немесе <span class="m">x = 4</span>'], answer: 1 },
      { q: '<span class="m">2x + 3 = 11</span> теңдеуін шешіңіз.', options: ['<span class="m">x = 3</span>', '<span class="m">x = 4</span>', '<span class="m">x = 7</span>', '<span class="m">x = 5</span>'], answer: 1 },
      { q: '<span class="m">x² − 5x + 6 = 0</span> теңдеуінің түбірлерінің қосындысы:', options: ['<span class="m">5</span>', '<span class="m">6</span>', '<span class="m">−5</span>', '<span class="m">1</span>'], answer: 0 },
      { q: '<span class="m">y = 1/x</span> функциясының графигі қалай аталады?', options: ["Парабола", "Гипербола", "Түзу", "Кубтық парабола"], answer: 1 },
      { q: '<span class="m">y = x³</span> функциясы:', options: ["Жұп", "Тақ", "Жұп та, тақ та емес", "Периодты"], answer: 1 },
      { q: '<span class="m">|x − 2| = 3</span> теңдеуінің түбірлері:', options: ['<span class="m">5; −1</span>', '<span class="m">5; 1</span>', '<span class="m">−5; 1</span>', '<span class="m">3; −3</span>'], answer: 0 },
      { q: '<span class="m">2<sup>x</sup> = 16</span> болса, <span class="m">x</span> = ?', options: ['<span class="m">3</span>', '<span class="m">4</span>', '<span class="m">8</span>', '<span class="m">2</span>'], answer: 1 },
      { q: '<span class="m">y = 2x − 4</span> түзуі <span class="m">Ox</span> осін қай нүктеде қияды?', options: ['<span class="m">(2; 0)</span>', '<span class="m">(0; −4)</span>', '<span class="m">(−2; 0)</span>', '<span class="m">(4; 0)</span>'], answer: 0 },
    ],
    12: [
      { q: "Крахмалдың ыдырауына қатысатын ферменттер:", options: ["Пепсин мен липаза", "Сілекейдегі амилаза, ашішектің дисахаридаза мен глюкоамилаза ферменттері", "Трипсин", "Химозин"], answer: 1 },
      { q: "Жасушаның энергетикалық станциясы:", options: ["Рибосома", "Митохондрия", "Лизосома", "Ядро"], answer: 1 },
      { q: "Фотосинтез жүретін органоид:", options: ["Хлоропласт", "Гольджи кешені", "Вакуоль", "Центриоль"], answer: 0 },
    ],
    13: [
      { q: "Масштабы 1 : 100 000 картада 1 см неше км?", options: ["0,1 км", "1 км", "10 км", "100 км"], answer: 1 },
      { q: "Ең ұзын өзен:", options: ["Амазонка", "Ніл", "Янцзы", "Ертіс"], answer: 1 },
      { q: "Қазақстанның ең биік нүктесі:", options: ["Хан Тәңірі", "Белуха", "Талғар", "Мұзтау"], answer: 0 },
    ],
    14: [
      { q: "1 байт неше битке тең?", options: ["4", "8", "16", "1024"], answer: 1 },
      { q: "Екілік жүйедегі 101₂ саны ондық жүйеде:", options: ["3", "5", "6", "101"], answer: 1 },
      { q: "Ақпаратты өлшеудің ең кіші бірлігі:", options: ["Байт", "Бит", "Килобайт", "Символ"], answer: 1 },
    ],
  },
  /** «Расписание»: kind → video | test; when → today | overdue | дата */
  schedule: {
    stats: { today: 2, week: 16, overdue: 61 },
    day: "02.10",
    week: "28.09 – 04.10",
    month: "Октябрь",
    items: [
      { id: 1, course: "Ағылшын тілі", lesson: "Prepositions", kind: "video", week: 4, when: "today", period: ["day", "week", "month"] },
      { id: 2, course: "Дүниежүзі Тарихы", lesson: "Осман империясы (1)", kind: "test", week: 4, when: "today", period: ["day", "week", "month"] },
      { id: 3, course: "Ағылшын тілі", lesson: "Articles: a / an / the", kind: "video", week: 4, when: "03.10", period: ["week", "month"] },
      { id: 4, course: "Дүниежүзі Тарихы", lesson: "Ұлы географиялық ашулар", kind: "video", week: 4, when: "04.10", period: ["week", "month"] },
      { id: 5, course: "Ағылшын тілі", lesson: "Present Simple", kind: "test", week: 3, when: "overdue", period: ["week", "month"] },
      { id: 6, course: "Дүниежүзі Тарихы", lesson: "Қайта өрлеу дәуірі", kind: "video", week: 5, when: "09.10", period: ["month"] },
    ],
    /** Плиткалар басылғанда шығатын тізімдер */
    weekList: [
      { course: "Ағылшын тілі", lesson: "Homework 3", kind: "video", week: 4, when: "overdue" },
      { course: "Дүниежүзі Тарихы", lesson: "Англия мен Ресейдегі абсолютизм", kind: "video", week: 4, when: "overdue" },
      { course: "Ағылшын тілі", lesson: "Adverb", kind: "video", week: 4, when: "overdue" },
      { course: "Дүниежүзі Тарихы", lesson: "Англия мен Ресейдегі абсолютизм", kind: "test", week: 4, when: "overdue" },
      { course: "Ағылшын тілі", lesson: "Prepositions", kind: "video", week: 4, when: "today" },
      { course: "Дүниежүзі Тарихы", lesson: "Осман империясы (1)", kind: "test", week: 4, when: "today" },
      { course: "Ағылшын тілі", lesson: "Articles: a / an / the", kind: "video", week: 4, when: "03.10" },
    ],
    overdueList: [
      { course: "Ағылшын тілі", lesson: "Noun", kind: "video", week: 1, when: "overdue" },
      { course: "Дүниежүзі Тарихы", lesson: "Рим империясының құлауы", kind: "video", week: 1, when: "overdue" },
      { course: "Ағылшын тілі", lesson: "Noun", kind: "test", week: 1, when: "overdue" },
      { course: "Дүниежүзі Тарихы", lesson: "Рим империясының құлауы", kind: "test", week: 1, when: "overdue" },
      { course: "Ағылшын тілі", lesson: "Adjective", kind: "video", week: 2, when: "overdue" },
      { course: "Ағылшын тілі", lesson: "Adjective", kind: "test", week: 2, when: "overdue" },
      { course: "Дүниежүзі Тарихы", lesson: "Византия", kind: "video", week: 2, when: "overdue" },
    ],
  },
  scheduleToday: [
    { id: 1, course: "Ағылшын тілі", lesson: "Prepositions", kind: "video" },
    { id: 2, course: "Дүниежүзі Тарихы", lesson: "Осман империясы (1)", kind: "test" },
  ],
  /** status: published | pending | rejected; banner: басты бет баннеріне шығады */
  news: [
    { id: 90, title: "Сенбіде сынақ ҰБТ — бәріміз қатысамыз!", body: "4 қазан, сенбі, 10:00. Сынақ ҰБТ барлық топтарға ашылады. Нәтиже бойынша үздік 3 оқушыға сыйлық бар.", thumb: null, author: "Айгерім · куратор", date: "03.10.2026", status: "pending", banner: true, audience: "all", bg: "linear-gradient(120deg,#36245e,#8b5cf6 60%,#c4a8ff)" },
    { id: 1, title: "Қазақстанның үздік университеттері:", body: "Қазақстанның ең беделді университеттерінің тізімін ұсынамыз. Грант, жатақхана және мамандықтар туралы.", thumb: { kind: "unis" } },
    { id: 2, title: "🎓 ЕҢ КӨП ГРАНТ БӨЛІНГЕН МАМАНДЫҚТАР", body: "Грант саны көп бөлінген мамандықтар – болашақта сұранысқа ие кәсіптер тізімі.", thumb: { kind: "grants" } },
    { id: 3, title: "I4U платформасы саған қалай көмектесе алады?", body: "🚀 Дайын бейне курстар – Қанша ұпай жинағаныңды бақылап, әлсіз тақырыптарды жаба аласың.", thumb: { kind: "app" } },
    { id: 4, title: "Қазақстанның үздік университеттері:", body: "Қазақстанның ең беделді университеттерінің тізімін ұсынамыз. Грант, жатақхана және мамандықтар туралы.", thumb: null },
    { id: 5, title: "ҰБТ-ға пайдалы және керек материалдар", body: "ҰБТ пәндері бойынша барлық маңызды материалдарды тегін жинап, бір жерге қойдық.", thumb: null },
  ],
  studentNotifs: [
    { id: 1, when: "Сегодня 10:24", title: "Вас зачислили в курс", body: "Теперь у вас есть полный доступ к курсу. Удачи в обучении!" },
    { id: 2, when: "Вчера 18:02", title: "Эфир в 19:00", body: "Разбор Prepositions. Ссылка уже в курсе." },
    { id: 3, when: "25 сентября 12:10", title: "Напоминание: конспект", body: "Сдайте конспект по теме Prepositions до пятницы." },
  ],
  subjects: [
    { title: "Математика", color: "#4690C6", img: "assets/v2/math.png" },
    { title: "Физика", color: "#5853C7", img: "assets/v2/physics.png" },
    { title: "Химия", color: "#8F2EA8", img: "assets/v2/chemistry.png" },
    { title: "Биология", color: "#2D8B48", img: "assets/v2/bio.png" },
    { title: "Ағылшын тілі", color: "#1E3A8A", img: "assets/v2/eng_uk.png" },
    { title: "Дүниежүзі тарихы", color: "#4F6D7A", img: "assets/v2/history_world.png" },
    { title: "Қазақстан тарихы", color: "#2B8073", img: "assets/v2/history_kz_berkut.png" },
    { title: "География", color: "#13A4C8", img: "assets/v2/geo.png" },
    { title: "Информатика", color: "#B13B5D", img: "assets/v2/informatics.png" },
    { title: "Қазақ тілі", color: "#3B7BBF", img: "assets/v2/kaz_lang.png" },
  ],
  /** Профессии → Специальности (код, атауы, бейіндік пәндер) */
  specialities: [
    { code: "B001", name: "Педагогика және психология", subjects: "Биология – География" },
    { code: "B002", name: "Мектепке дейінгі оқыту және тәрбиелеу", subjects: "Биология – География" },
    { code: "B003", name: "Бастауышта оқыту педагогикасы мен әдістемесі", subjects: "Биология – География" },
    { code: "B004", name: "Бастапқы әскери дайындық мұғалімдерін даярлау", subjects: "Шығармашылық" },
    { code: "B005", name: "Дене шынықтыру мұғалімдерін даярлау", subjects: "Шығармашылық" },
    { code: "B006", name: "Музыка мұғалімдерін даярлау", subjects: "Шығармашылық" },
    { code: "B007", name: "Көркем еңбек және сызу мұғалімдерін даярлау", subjects: "Шығармашылық" },
    { code: "B008", name: "Құқық және экономика негіздері мұғалімдерін даярлау", subjects: "Дүниежүзі тарихы – Құқық негіздері" },
    { code: "B009", name: "Математика мұғалімдерін даярлау", subjects: "Математика – Физика" },
    { code: "B010", name: "Физика мұғалімдерін даярлау", subjects: "Математика – Физика" },
    { code: "B011", name: "Информатика мұғалімдерін даярлау", subjects: "Математика – Информатика" },
    { code: "B012", name: "Химия мұғалімдерін даярлау", subjects: "Химия – Биология" },
    { code: "B013", name: "Биология мұғалімдерін даярлау", subjects: "Биология – Химия" },
    { code: "B014", name: "География мұғалімдерін даярлау", subjects: "География – Дүниежүзі тарихы" },
    { code: "B016", name: "Қазақ тілі мен әдебиеті мұғалімдерін даярлау", subjects: "Қазақ тілі – Қазақ әдебиеті" },
    { code: "B018", name: "Шет тілі мұғалімдерін даярлау", subjects: "Шет тілі – Дүниежүзі тарихы" },
    { code: "B044", name: "Менеджмент және басқару", subjects: "Математика – География" },
    { code: "B046", name: "Қаржы, экономика, банк және сақтандыру ісі", subjects: "Математика – География" },
    { code: "B049", name: "Құқық", subjects: "Дүниежүзі тарихы – Құқық негіздері" },
    { code: "B050", name: "Биологиялық және сабақтас ғылымдар", subjects: "Биология – Химия" },
    { code: "B057", name: "Ақпараттық технологиялар", subjects: "Математика – Информатика" },
    { code: "B058", name: "Ақпараттық қауіпсіздік", subjects: "Математика – Информатика" },
    { code: "B062", name: "Электр техникасы және энергетика", subjects: "Математика – Физика" },
    { code: "B086", name: "Жалпы медицина", subjects: "Биология – Химия" },
  ],
  /** Профессии → ВУЗы. logo: null → бас әріптер */
  universities: [
    { code: "013", name: "Л. Н. Гумилев атындағы Еуразия ұлттық университеті", short: "ЕҰУ", city: "Астана қ.", gov: true },
    { code: "002", name: "Қазақ ұлттық өнер университеті", short: "ҚҰ", city: "Астана қ.", gov: true },
    { code: "003", name: "Қазақ ұлттық хореография академиясы", short: "ҚҰ", city: "Астана қ.", gov: true },
    { code: "004", name: "С. Сейфуллин атындағы Қазақ агротехникалық университеті", short: "SU", city: "Астана қ.", gov: false },
    { code: "005", name: "Астана медицина университеті", short: "АМ", city: "Астана қ.", gov: false },
    { code: "010", name: "Әл-Фараби атындағы Қазақ ұлттық университеті", short: "ҚҰ", city: "Алматы қ.", gov: true },
    { code: "007", name: "Abai University", short: "AU", city: "Алматы қ.", gov: true },
    { code: "025", name: "Қазақ ұлттық қыздар педагогикалық университеті", short: "ҚҚ", city: "Алматы қ.", gov: true },
    { code: "029", name: "Satbayev University", short: "SU", city: "Алматы қ.", gov: false },
    { code: "041", name: "Қазақстан-Британ техникалық университеті", short: "KB", city: "Алматы қ.", gov: false },
    { code: "045", name: "SDU University", short: "SD", city: "Алматы обл.", gov: false },
    { code: "031", name: "Karaganda Buketov University", short: "KB", city: "Қарағанды обл.", gov: true },
    { code: "034", name: "Zhubanov University", short: "ZU", city: "Ақтөбе обл.", gov: true },
    { code: "008", name: "Altynsarin University (Арқалық педагогикалық институты)", short: "AU", city: "Қостанай обл.", gov: true },
    { code: "052", name: "М. Әуезов атындағы Оңтүстік Қазақстан университеті", short: "ОҚ", city: "Түркістан обл.", gov: true },
  ],
  trainerSubjects: [
    {
      id: 10,
      title: "Ағылшын тілі",
      courseId: 10,
      percent: 0,
      done: 0,
      total: 47,
      weak: 0,
      closed: 0,
      sections: [
        {
          title: "Nouns, Pronouns & Basic Tenses",
          percent: 0,
          topics: ["Countable / uncountable nouns", "Personal pronouns", "Possessive pronouns", "Present Simple", "Present Continuous", "Past Simple", "Future Simple"],
          count: 47,
        },
      ],
    },
    {
      id: 11,
      title: "Дүниежүзі Тарихы",
      courseId: 11,
      percent: 1,
      done: 0,
      total: 52,
      weak: 1,
      closed: 0,
      sections: [
        { title: "Ежелгі дүние тарихы", percent: 2, topics: ["Ежелгі Египет", "Ежелгі Греция", "Ежелгі Рим"], count: 18 },
        { title: "Орта ғасырлар", percent: 0, topics: ["Византия", "Араб халифаты", "Осман империясы"], count: 20 },
        { title: "Жаңа заман", percent: 0, topics: ["Ұлы географиялық ашулар", "Қайта өрлеу дәуірі"], count: 14 },
      ],
    },
  ],
  /** Тренажёр → Умная практика: сұрақтар (answer = дұрыс жауап индексі) */
  practice: {
    10: {
      topic: "Phrasal Verbs",
      questions: [
        { q: "Choose the word opposite in meaning: enter.", options: ["Sing.", "Jump.", "Play.", "Leave."], answer: 3, explain: "«Enter» — кіру, ал оның қарама-қарсы мағынасы «leave» — шығу, кету." },
        { q: "Choose the correct phrasal verb: Please ___ the lights when you leave.", options: ["turn off", "turn up", "take off", "put up"], answer: 0, explain: "«Turn off» — сөндіру. Шамды шығарда сөндіреді: turn off the lights." },
        { q: "“To give up” means…", options: ["to start", "to stop doing something", "to return", "to wait"], answer: 1, explain: "«Give up» — бір нәрсені істеуді доғару, тастау: give up smoking." },
        { q: "She ___ her grandmother every Sunday.", options: ["looks after", "looks for", "looks up", "looks like"], answer: 0, explain: "«Look after» — қамқорлық жасау, қарау. «Look for» — іздеу, «look up» — сөздіктен қарау." },
        { q: "Choose the synonym of “find out”.", options: ["forget", "discover", "hide", "lose"], answer: 1, explain: "«Find out» — білу, анықтау. Синонимі — «discover»." },
      ],
    },
    11: {
      topic: "Осман империясы",
      questions: [
        { q: "Осман империясының негізін қалаған кім?", options: ["Осман I", "Мехмед II", "Сүлейман I", "Селим I"], answer: 0, explain: "Мемлекетті 1299 жылы Осман I құрған, империя атауы да соның есімінен шыққан." },
        { q: "Константинополь қай жылы бағындырылды?", options: ["1299", "1453", "1529", "1683"], answer: 1, explain: "1453 жылы Мехмед II Константинопольді алып, оны империя астанасы — Стамбұл етті." },
        { q: "«Заң шығарушы» атанған сұлтан:", options: ["Баязид I", "Мұрат II", "Сүлейман I", "Ахмед I"], answer: 2, explain: "Сүлейман I заңдарды жүйелеген үшін «Қануни» — Заң шығарушы атанды (1520–1566)." },
        { q: "Осман армиясының жаяу әскері қалай аталды?", options: ["Сипахилер", "Янычарлар", "Мамлюктер", "Казактар"], answer: 1, explain: "Янычарлар — сұлтанның тұрақты жаяу әскері. Сипахилер — атты әскер." },
        { q: "Осман империясы ресми түрде қай жылы жойылды?", options: ["1908", "1918", "1922", "1945"], answer: 2, explain: "1922 жылы сұлтандық жойылып, 1923 жылы Түркия Республикасы жарияланды." },
      ],
    },
  },
  /** Аналитика */
  analytics: {
    goal: null,
    courses: { done: 2, total: 5 },
    lessons: { done: 0, total: 0 },
    tests: { done: 0, total: 200 },
    mockTests: 2,
  },
  /** Тесты → ЕНТ: выбор комбинации */
  entPicker: {
    electives: [
      { id: "math", title: "Математика", color: "#5B8FD6" },
      { id: "phys", title: "Физика", color: "#7B76E0" },
      { id: "inf", title: "Информатика", color: "#D0607F" },
      { id: "geo", title: "География", color: "#4FB1BA" },
      { id: "bio", title: "Биология", color: "#5CB36D" },
      { id: "chem", title: "Химия", color: "#B05CC8" },
      { id: "djt", title: "ДЖТ", color: "#E0A040" },
      { id: "eng", title: "Английский", color: "#5B6EC2" },
      { id: "law", title: "Право", color: "#C98A5A" },
      { id: "kz", title: "Қазақ тілі", color: "#3B9BD6" },
      { id: "kzlit", title: "Қазақ әдебиеті", color: "#D6834F" },
    ],
    core: [
      { title: "История", color: "#4FA78A" },
      { title: "Математическая грамотность", color: "#5B8FD6" },
      { title: "Грамотность чтения", color: "#E2AE1E" },
    ],
    selected: ["math", "geo"],
  },
  _nextId: 1000,
};

/* Топтарға студенттер тізімін генерациялау (скриншотта көрінбейтін топтар үшін) */
(() => {
  const first = ["Айгерім", "Нұрсұлтан", "Әлихан", "Дана", "Ерасыл", "Жансая", "Мадина", "Арман", "Аружан", "Бекзат", "Інжу", "Санжар", "Асель", "Темірлан", "Ақбота", "Нұрислам", "Камила", "Даулет", "Мерей", "Алдияр"];
  const last = ["Серікқызы", "Ахметов", "Жұмабай", "Қайратқызы", "Нұрланов", "Сапарова", "Омаров", "Бекова", "Тұрсын", "Әбілда"];
  const colors = ["#D9707A", "#E8A070", "#7CC8C8", "#A48EE0", "#6A9FD8", "#8CC07A", "#E0B04A"];
  const seen = ["был 4 минуты назад", "был 1 час назад", "был 3 часа назад", "был 12 часов назад", "был вчера", "был 29.09.26"];
  let id = 500;
  window.MOCK.groups.forEach((g, gi) => {
    const have = g.students || [];
    if (have.length >= g.studentsCount) return;
    const extra = Array.from({ length: g.studentsCount - have.length }, (_, i) => {
      const name = `${first[(i * 7 + gi * 3) % first.length]} ${last[(i * 3 + gi) % last.length]}`;
      return {
        id: id++,
        name,
        phone: `+7 7${((gi * 13 + i * 7) % 90) + 10} ${100 + ((i * 37 + gi * 11) % 900)} ${10 + ((i * 17) % 90)} ${10 + ((i * 29 + gi) % 90)}`,
        initials: name.split(" ").map((w) => w[0]).join("").toUpperCase(),
        color: colors[(i + gi) % colors.length],
        rank: i + 1,
        medal: i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : null,
        score: Math.max(0, 95 - i * Math.ceil(90 / g.studentsCount) - (gi % 4)),
        progress: `${Math.max(2, 77 - i * 3 - gi)}/77`,
        lastSeen: seen[(i + gi) % seen.length],
        pointsToday: i % 4 === 1 ? 3 + ((i + gi) % 9) : 0,
        rankChange: i % 5 === 2 ? 1 : i % 5 === 4 ? -1 : 0,
      };
    });
    if (have.length) {
      // Бар оқушылардан төмен балл: 40-тан төмен қарай
      extra.forEach((x, i) => {
        x.score = Math.max(0, 40 - i * 5);
        x.progress = `${Math.max(4, 44 - i * 4)}/77`;
      });
    }
    g.students = [...have, ...extra]
      .sort((a, b) => b.score - a.score)
      .map((x, i) => ({ ...x, rank: i + 1, medal: i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : null }));
  });
  /* Өткен апта чемпионы (21–27 қыркүйек): апта бойы ауыспайды */
  const champ = { 9: { id: 13, score: 91 } };
  window.MOCK.groups.forEach((g, gi) => {
    const c = champ[g.id];
    const s = c ? g.students.find((x) => x.id === c.id) : g.students[Math.min(g.students.length - 1, 1 + (gi % 3))];
    g.lastChampion = { id: s.id, score: c ? c.score : 88 + (gi % 9), week: "21–27 сентября" };
  });
})();
