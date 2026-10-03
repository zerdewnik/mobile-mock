(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const NAV_STAFF = [
    { out: "insert_chart", fill: "insert_chart", outClass: "material-icons-outlined", fillClass: "material-icons-round", label: "Аналитика" },
    { out: "live_tv", fill: "live_tv", outClass: "material-icons-outlined", fillClass: "material-icons-outlined", label: "Эфир" },
    { out: "notifications_none", fill: "notifications", outClass: "material-icons-round", fillClass: "material-icons-round", label: "Хабарлама" },
    { out: "groups", fill: "groups", outClass: "material-icons-outlined", fillClass: "material-icons-round", label: "Мои группы" },
  ];
  const NAV_STUDENT = [
    { out: "home", fill: "home", outClass: "material-icons-outlined", fillClass: "material-icons-round", label: "Главная" },
    { out: "newspaper", fill: "newspaper", outClass: "material-icons-outlined", fillClass: "material-icons-round", label: "Новости" },
    { out: "notifications_none", fill: "notifications", outClass: "material-icons-round", fillClass: "material-icons-round", label: "Уведомление" },
    { out: "menu_book", fill: "menu_book", outClass: "material-icons-outlined", fillClass: "material-icons-round", label: "Мои курсы" },
  ];
  const CHIPS_STAFF = ["Аналитика", "Эфир", "Хабарлама", "Мои группы"];
  const CHIPS_STUDENT = ["Главная", "Новости", "Уведомления", "Мои курсы"];

  const state = {
    mode: "staff",
    tab: 3,
    expandedGroupId: null,
    efirDate: new Date(2026, 9, 2),
    expandedEnrollmentId: null,
    profileStudent: null,
    periodStart: null,
    periodEnd: null,
    searchStudents: "",
    searchEnroll: "",
    lang: "ru",
    darkTheme: true,
    courseSeg: "courses",
    schedPeriod: "day",
    trainerOpen: {},
    navStack: [],
    svc: { id: "", tab: "ent" },
  };

  function navConf() {
    return state.mode === "student" ? NAV_STUDENT : NAV_STAFF;
  }

  const STATUS_ENROLL = {
    active: "Активен",
    freeze: "Заморозка",
    pending: "Ожидает",
    waiting: "Ожидает",
    not_started: "Не начат",
    ended: "Завершён",
  };

  function pad(n) {
    return String(n).padStart(2, "0");
  }
  function formatDay(d) {
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${String(d.getFullYear()).slice(-2)}`;
  }
  function ymd(d) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  function currentIsoWeek() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start = new Date(today);
    start.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
  }
  function initials(name) {
    const p = name.trim().split(/\s+/);
    return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || "?";
  }
  /* —— Поиск: одна функция для всех списков ——
     «томирис», «Томирис 778», «ақжол» = «акжол», «87782153557» = «+7 778 215 35 57» */
  const KZ = { ә: "а", і: "и", ң: "н", ғ: "г", ү: "у", ұ: "у", қ: "к", ө: "о", һ: "х", ё: "е" };
  function norm(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[әіңғүұқөһё]/g, (ch) => KZ[ch]);
  }
  function digits(text) {
    return String(text || "").replace(/\D/g, "").replace(/^8/, "7");
  }
  function matches(query, ...fields) {
    const words = norm(query).split(/\s+/).filter(Boolean);
    if (!words.length) return true;
    const text = norm(fields.join(" "));
    const nums = fields.map(digits).join(" ");
    return words.every((w) => text.includes(w) || (/^\+?\d+$/.test(w) && nums.includes(digits(w))));
  }
  /** Перерисовать список и вернуть курсор в поле поиска */
  function bindSearch(selector, onChange) {
    const input = $(selector);
    if (!input) return;
    input.oninput = () => {
      const pos = input.selectionStart;
      onChange(input.value);
      const again = $(selector);
      if (again) {
        again.focus();
        again.setSelectionRange(pos, pos);
      }
    };
  }

  function nextId() {
    return ++MOCK._nextId;
  }
  function icon(name, cls = "material-icons-round") {
    return `<span class="${cls}">${name}</span>`;
  }
  function courseLabel(courseId, curatorId) {
    const course = MOCK.courses.find((c) => c.id === courseId);
    const curator = MOCK.curators.find((c) => c.id === curatorId);
    return `${course?.short || "—"} • ${curator?.name?.split(" ")[0] || "—"}`;
  }

  function toast(msg, type = "ok") {
    const el = $("#toast");
    el.textContent = msg;
    el.className = `toast show ${type}`;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      el.className = "toast";
    }, 2200);
  }

  /* —— Layers —— */
  function closeSheet() {
    $("#overlay").classList.remove("open");
    $("#overlay").innerHTML = "";
  }
  function openSheet(html, { tall } = {}) {
    const overlay = $("#overlay");
    overlay.innerHTML = `<div class="sheet ${tall ? "tall" : ""}">${html}</div>`;
    overlay.classList.add("open");
  }
  function closeMenu() {
    const layer = $("#menuLayer");
    layer.hidden = true;
    layer.innerHTML = "";
  }
  function closeDialog() {
    const layer = $("#dialogLayer");
    layer.hidden = true;
    layer.innerHTML = "";
    layer.onclick = null;
  }
  function closeScreen() {
    const el = $("#screenOverlay");
    el.hidden = true;
    el.className = "screen-overlay";
    el.innerHTML = "";
  }

  /** Телефон кішірейтілгенде экран координаталарын макет координаталарына аудару */
  function phoneRects(anchorEl) {
    const k = view.scale || 1;
    const ph = $(".phone .app").getBoundingClientRect();
    const r = anchorEl.getBoundingClientRect();
    const map = (v, o) => (v - o) / k;
    return {
      phone: { left: 0, top: 0, width: ph.width / k, height: ph.height / k },
      rect: { left: map(r.left, ph.left), right: map(r.right, ph.left), top: map(r.top, ph.top), bottom: map(r.bottom, ph.top), width: r.width / k },
    };
  }

  function showActionMenu(anchorEl, items) {
    closeMenu();
    const { phone, rect } = phoneRects(anchorEl);
    const menuW = 156;
    const menuH = items.length * 38;
    let left = rect.right - phone.left - menuW;
    left = Math.max(12, Math.min(left, phone.width - menuW - 12));
    let top = rect.bottom - phone.top + 8;
    if (top + menuH > phone.height - 20) {
      top = rect.top - phone.top - menuH - 8;
    }
    top = Math.max(8, top);

    const layer = $("#menuLayer");
    layer.hidden = false;
    layer.innerHTML = `
      <div class="action-menu" style="left:${left}px;top:${top}px">
        ${items
          .map(
            (it, i) => `
          <button type="button" class="action-menu-item ${it.danger ? "danger" : ""}" data-menu-i="${i}">
            ${icon(it.icon, "material-icons-outlined")}
            <span>${it.label}</span>
          </button>`
          )
          .join("")}
      </div>`;
    layer.onclick = (e) => {
      if (e.target === layer) closeMenu();
    };
    $$("[data-menu-i]", layer).forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const it = items[Number(btn.dataset.menuI)];
        closeMenu();
        it.onTap?.();
      };
    });
  }

  function confirmDialog({ title, message, confirmLabel = "Подтвердить", danger = false }) {
    return new Promise((resolve) => {
      const layer = $("#dialogLayer");
      layer.hidden = false;
      layer.innerHTML = `
        <div class="confirm-dialog">
          <div class="confirm-title">${title}</div>
          <div class="confirm-msg">${message}</div>
          <div class="confirm-actions">
            <button type="button" class="btn btn-ghost" id="dlgCancel">Отмена</button>
            <button type="button" class="btn ${danger ? "btn-danger" : "btn-primary"}" id="dlgOk">${confirmLabel}</button>
          </div>
        </div>`;
      $("#dlgCancel").onclick = () => {
        closeDialog();
        resolve(false);
      };
      $("#dlgOk").onclick = () => {
        closeDialog();
        resolve(true);
      };
      layer.onclick = (e) => {
        if (e.target === layer) {
          closeDialog();
          resolve(false);
        }
      };
    });
  }

  function bindLongPress(el, onLongPress) {
    let timer = null;
    let startX = 0;
    let startY = 0;
    const clear = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };
    el.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      onLongPress(el);
    });
    el.addEventListener("touchstart", (e) => {
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      clear();
      timer = setTimeout(() => onLongPress(el), 450);
    }, { passive: true });
    el.addEventListener("touchmove", (e) => {
      const t = e.touches[0];
      if (Math.abs(t.clientX - startX) > 10 || Math.abs(t.clientY - startY) > 10) clear();
    }, { passive: true });
    el.addEventListener("touchend", clear);
    el.addEventListener("touchcancel", clear);
    el.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      clear();
      timer = setTimeout(() => onLongPress(el), 500);
    });
    el.addEventListener("mouseup", clear);
    el.addEventListener("mouseleave", clear);
  }

  /* —— Tabs / mode —— */
  function paintNavIcons() {
    const NAV = navConf();
    $$(".nav-item").forEach((btn) => {
      const i = Number(btn.dataset.tab);
      const active = i === state.tab;
      btn.classList.toggle("active", active);
      const conf = NAV[i];
      const ico = btn.querySelector(".nav-ico");
      const label = btn.querySelector(".nav-label");
      if (label && conf) label.textContent = conf.label;
      if (!ico || !conf) return;
      ico.className = `nav-ico ${active ? conf.fillClass : conf.outClass}`;
      ico.textContent = active ? conf.fill : conf.out;
    });
    const slot = state.tab < 2 ? state.tab : state.tab + 1;
    $("#navIndicator").style.transform = `translateX(${slot * 100}%)`;
    const fabCore = $(".fab-core");
    if (fabCore) fabCore.innerHTML = `<img src="assets/logo/ai3.png" alt="" width="22" height="22" />`;
    $("#navFab").title = "AI";
  }

  function paintTabChips() {
    const labels = state.mode === "student" ? CHIPS_STUDENT : CHIPS_STAFF;
    const wrap = $("#tabChips");
    wrap.innerHTML = labels
      .map((label, i) => `<button type="button" class="chip" data-goto="${i}">${label}</button>`)
      .join("");
    $$("[data-goto]", wrap).forEach((chip) => {
      chip.addEventListener("click", () => setTab(Number(chip.dataset.goto)));
    });
  }

  function setMode(mode, { toastMsg } = {}) {
    state.mode = mode;
    document.documentElement.dataset.mode = mode;
    $$(".chip-mode").forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
    state.profileStudent = null;
    closeSheet();
    closeMenu();
    closeDialog();
    closeScreen();
    paintTabChips();
    setTab(mode === "student" ? 0 : 3, { skipClose: true });
    if (toastMsg) toast(toastMsg, "ok");
  }

  function setTab(index, { skipClose } = {}) {
    state.tab = index;
    state.profileStudent = null;
    if (!skipClose) {
      closeSheet();
      closeMenu();
      closeDialog();
      closeScreen();
    }
    paintNavIcons();
    render();
  }

  /* —— Sheets —— */
  function openRatingSheet(group) {
    const week = currentIsoWeek();
    state.periodStart = week.start;
    state.periodEnd = week.end;
    openSheet(`
      <div class="sheet-handle"></div>
      <div class="sheet-title">Рейтинг</div>
      <div class="sheet-sub">${group.name}</div>
      <div class="sheet-label">Период</div>
      <div class="period-field" id="periodField">
        ${icon("calendar_today", "material-icons-outlined")}
        <span id="periodText">${formatDay(week.start)} — ${formatDay(week.end)}</span>
        ${icon("chevron_right")}
      </div>
      <div class="sheet-actions btn-row">
        <button type="button" class="btn btn-ghost" id="sheetCancel">Отмена</button>
        <button type="button" class="btn btn-primary" id="sheetDownload">${icon("download")} Скачать</button>
      </div>`);
    $("#sheetCancel").onclick = closeSheet;
    $("#sheetDownload").onclick = () => {
      closeSheet();
      toast(`PDF: ${group.name} (${ymd(state.periodStart)} — ${ymd(state.periodEnd)})`, "ok");
    };
    $("#periodField").onclick = () => {
      const start = new Date(state.periodStart);
      start.setDate(start.getDate() - 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      state.periodStart = start;
      state.periodEnd = end;
      $("#periodText").textContent = `${formatDay(start)} — ${formatDay(end)}`;
    };
  }

  function openFilterSheet({ title, options, value, onApply }) {
    let selected = value;
    openSheet(`
      <div class="sheet-handle"></div>
      <div class="sheet-title">${title}</div>
      <div class="field-label">Статус</div>
      <div class="radio-row" id="filterRadios">
        ${options
          .map(
            (o) => `
          <div class="radio-item ${selected === o.value ? "active" : ""}" data-val="${o.value === null ? "" : o.value}">
            <span class="radio-dot"></span>
            <span>${o.label}</span>
          </div>`
          )
          .join("")}
      </div>
      <div class="sheet-actions btn-row">
        <button type="button" class="btn btn-ghost" id="filterReset">Сбросить</button>
        <button type="button" class="btn btn-primary" id="filterApply">Применить</button>
      </div>`);
    const paint = () => {
      $$("#filterRadios .radio-item").forEach((el) => {
        const v = el.dataset.val === "" ? null : el.dataset.val;
        el.classList.toggle("active", v === selected || (v === null && selected === null));
      });
    };
    $$("#filterRadios .radio-item").forEach((el) => {
      el.onclick = () => {
        selected = el.dataset.val === "" ? null : el.dataset.val;
        paint();
      };
    });
    $("#filterReset").onclick = () => {
      selected = null;
      onApply(null);
      closeSheet();
      toast("Фильтр сброшен", "ok");
      render();
    };
    $("#filterApply").onclick = () => {
      onApply(selected);
      closeSheet();
      toast("Фильтр применён", "ok");
      render();
    };
  }

  function openGroupForm(editGroup = null) {
    const isEdit = !!editGroup;
    let courseId = editGroup?.courseId ?? 10;
    let curatorId = editGroup?.curatorId ?? 1;
    const selected = new Set(editGroup?.students?.map((s) => s.id) || []);
    const name0 = editGroup?.name || "";

    const paint = () => {
      openSheet(
        `
        <div class="sheet-handle"></div>
        <div class="sheet-title">${isEdit ? "Редактировать группу" : "Новая группа"}</div>
        <div class="field-label">Название</div>
        <input class="field-input" id="gName" value="${name0.replace(/"/g, "&quot;")}" placeholder="Название группы" />
        <div class="field-label">Курс</div>
        <select class="field-select" id="gCourse">
          ${MOCK.courses.map((c) => `<option value="${c.id}" ${c.id === courseId ? "selected" : ""}>${c.title}</option>`).join("")}
        </select>
        <div class="field-label">Куратор</div>
        <select class="field-select" id="gCurator">
          ${MOCK.curators
            .filter((c) => c.courseId == null || c.courseId === courseId || courseId === 0)
            .map((c) => `<option value="${c.id}" ${c.id === curatorId ? "selected" : ""}>${c.name}${c.isChief ? " (Главный)" : ""}</option>`)
            .join("")}
        </select>
        <div class="field-label">Ученики (${selected.size})</div>
        <button type="button" class="btn btn-ghost" id="gPickStudents" style="width:100%">Выбрать учеников</button>
        <div class="chips" id="gChips">
          ${[...selected]
            .map((id) => {
              const s = MOCK.pickerStudents.find((x) => x.id === id);
              return s
                ? `<span class="chip-tag" data-rm="${id}">${s.name}<button type="button">${icon("close")}</button></span>`
                : "";
            })
            .join("")}
        </div>
        <div class="sheet-actions btn-row">
          <button type="button" class="btn btn-ghost" id="sheetCancel">Отмена</button>
          <button type="button" class="btn btn-primary" id="gSave">${isEdit ? "Сохранить" : "Создать"}</button>
        </div>`,
        { tall: true }
      );

      $("#sheetCancel").onclick = closeSheet;
      $("#gCourse").onchange = (e) => {
        courseId = Number(e.target.value);
        paint();
      };
      $("#gCurator").onchange = (e) => {
        curatorId = Number(e.target.value);
      };
      $$("#gChips [data-rm]").forEach((chip) => {
        chip.querySelector("button").onclick = () => {
          selected.delete(Number(chip.dataset.rm));
          paint();
        };
      });
      $("#gPickStudents").onclick = () => openStudentPicker(selected, () => paint());
      $("#gSave").onclick = () => {
        const name = $("#gName").value.trim();
        if (!name) {
          toast("Введите название", "error");
          return;
        }
        curatorId = Number($("#gCurator").value);
        courseId = Number($("#gCourse").value);
        const students = MOCK.pickerStudents
          .filter((s) => selected.has(s.id))
          .map((s, i) => ({
            id: s.id,
            name: s.name,
            phone: s.phone,
            initials: initials(s.name),
            color: ["#5B6EC2", "#25AB7C", "#F28C28", "#9BB8DA", "#CD7F32", "#85899A"][i % 6],
            rank: i + 1,
            medal: i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : null,
            score: Math.max(0, 90 - i * 8),
            progress: `${20 + i}/${50 + i}`,
            lastSeen: "был час назад",
            pointsToday: 0,
            rankChange: 0,
          }));

        if (isEdit) {
          editGroup.name = name;
          editGroup.courseId = courseId;
          editGroup.curatorId = curatorId;
          editGroup.courseLabel = courseLabel(courseId, curatorId);
          editGroup.students = students;
          editGroup.studentsCount = students.length;
          toast("Изменения сохранены", "ok");
        } else {
          MOCK.groups.unshift({
            id: nextId(),
            name,
            courseId,
            curatorId,
            courseLabel: courseLabel(courseId, curatorId),
            studentsCount: students.length,
            students,
          });
          toast("Группа создана", "ok");
        }
        closeSheet();
        render();
      };
    };
    paint();
  }

  function openStudentPicker(selectedSet, onDone) {
    const q = { value: "" };
    const draw = () => {
      const list = MOCK.pickerStudents.filter((s) => matches(q.value, s.name, s.phone));
      openSheet(
        `
        <div class="sheet-handle"></div>
        <div class="sheet-title">Ученики</div>
        <input class="field-input" id="pickSearch" placeholder="Поиск" value="${q.value}" />
        <div class="picker-list">
          ${list
            .map(
              (s) => `
            <button type="button" class="picker-row ${selectedSet.has(s.id) ? "selected" : ""}" data-pick="${s.id}">
              <div class="avatar" style="width:32px;height:32px;font-size:11px;background:#5B6EC2">${initials(s.name)}</div>
              <div style="flex:1;min-width:0">
                <div style="font-weight:600;font-size:14px">${s.name}</div>
                <div style="font-size:12px;color:var(--hint)">${s.phone}</div>
              </div>
              ${icon("check", "material-icons-round check")}
            </button>`
            )
            .join("")}
        </div>
        <div class="sheet-actions btn-row">
          <button type="button" class="btn btn-ghost" id="pickBack">Назад</button>
          <button type="button" class="btn btn-primary" id="pickApply">Применить (${selectedSet.size})</button>
        </div>`,
        { tall: true }
      );
      bindSearch("#pickSearch", (v) => {
        q.value = v;
        draw();
      });
      $$("[data-pick]").forEach((row) => {
        row.onclick = () => {
          const id = Number(row.dataset.pick);
          if (selectedSet.has(id)) selectedSet.delete(id);
          else selectedSet.add(id);
          draw();
        };
      });
      $("#pickBack").onclick = () => onDone();
      $("#pickApply").onclick = () => onDone();
    };
    draw();
  }

  function openEnrollmentForm(edit = null) {
    const isEdit = !!edit;
    openSheet(
      `
      <div class="sheet-handle"></div>
      <div class="sheet-title">${isEdit ? "Редактировать зачисление" : "Новое зачисление"}</div>
      <div class="field-label">Ученик</div>
      <input class="field-input" id="eStudent" value="${(edit?.student || "").replace(/"/g, "&quot;")}" placeholder="ФИО" />
      <div class="field-label">Телефон</div>
      <input class="field-input" id="ePhone" value="${(edit?.phone || "").replace(/"/g, "&quot;")}" placeholder="+7 ..." />
      <div class="field-label">Курс</div>
      <select class="field-select" id="eCourse">
        ${MOCK.courses
          .filter((c) => c.id > 0)
          .map((c) => `<option value="${c.id}" ${edit?.courseId === c.id ? "selected" : ""}>${c.title}</option>`)
          .join("")}
      </select>
      <div class="field-label">Дата начала</div>
      <input class="field-input" id="eDate" type="date" value="${edit?.dateIso || "2026-09-01"}" />
      <div class="sheet-actions btn-row">
        <button type="button" class="btn btn-ghost" id="sheetCancel">Отмена</button>
        <button type="button" class="btn btn-primary" id="eSave">${isEdit ? "Сохранить" : "Зачислить"}</button>
      </div>`,
      { tall: true }
    );
    $("#sheetCancel").onclick = closeSheet;
    $("#eSave").onclick = () => {
      const student = $("#eStudent").value.trim();
      const phone = $("#ePhone").value.trim();
      const courseId = Number($("#eCourse").value);
      const course = MOCK.courses.find((c) => c.id === courseId);
      const dateIso = $("#eDate").value;
      if (!student) {
        toast("Укажите ученика", "error");
        return;
      }
      const [y, m, d] = dateIso.split("-");
      const date = `${d}.${m}.${y}`;
      if (isEdit) {
        edit.student = student;
        edit.phone = phone;
        edit.courseId = courseId;
        edit.course = course?.short || course?.title;
        edit.date = date;
        edit.dateIso = dateIso;
        toast("Сохранено", "ok");
      } else {
        MOCK.enrollments.unshift({
          id: nextId(),
          student,
          phone,
          course: course?.short || course?.title,
          courseId,
          status: "active",
          statusLabel: "Активен",
          date,
          dateIso,
          daysLeft: 90,
        });
        toast("Зачисление создано", "ok");
      }
      closeSheet();
      render();
    };
  }

  function openPushSheet() {
    let audience = "all";
    openSheet(
      `
      <div class="sheet-handle"></div>
      <div class="sheet-title">Отправить пуш</div>
      <div class="field-label">Тип</div>
      <select class="field-select" id="pType">
        ${MOCK.pushTypes.map((t) => `<option value="${t.value}">${t.label}</option>`).join("")}
      </select>
      <div class="field-label">Аудитория</div>
      <select class="field-select" id="pAudience">
        ${MOCK.audiences.map((a) => `<option value="${a.value}">${a.label}</option>`).join("")}
      </select>
      <div id="pAudienceExtra"></div>
      <div class="field-label">Заголовок</div>
      <input class="field-input" id="pTitle" placeholder="Заголовок" />
      <div class="field-label">Текст</div>
      <textarea class="field-textarea" id="pBody" placeholder="Сообщение"></textarea>
      <div class="sheet-actions btn-row">
        <button type="button" class="btn btn-ghost" id="sheetCancel">Отмена</button>
        <button type="button" class="btn btn-primary" id="pSend">Отправить</button>
      </div>`,
      { tall: true }
    );

    const extra = () => {
      const box = $("#pAudienceExtra");
      if (audience === "group") {
        box.innerHTML = `
          <div class="field-label">Группа</div>
          <select class="field-select" id="pGroup">
            ${MOCK.groups.map((g) => `<option value="${g.id}">${g.name}</option>`).join("")}
          </select>`;
      } else if (audience === "course") {
        box.innerHTML = `
          <div class="field-label">Курс</div>
          <select class="field-select" id="pCourse">
            ${MOCK.courses.filter((c) => c.id > 0).map((c) => `<option value="${c.id}">${c.title}</option>`).join("")}
          </select>`;
      } else if (audience === "student") {
        box.innerHTML = `
          <div class="field-label">Ученик</div>
          <select class="field-select" id="pStudent">
            ${MOCK.students.map((s) => `<option value="${s.id}">${s.name}</option>`).join("")}
          </select>`;
      } else box.innerHTML = "";
    };
    extra();
    $("#pAudience").onchange = (e) => {
      audience = e.target.value;
      extra();
    };
    $("#sheetCancel").onclick = closeSheet;
    $("#pSend").onclick = () => {
      const title = $("#pTitle").value.trim();
      const body = $("#pBody").value.trim();
      if (!title || !body) {
        toast("Заполните заголовок и текст", "error");
        return;
      }
      let audienceLabel = MOCK.audiences.find((a) => a.value === audience)?.label || audience;
      if (audience === "group") {
        const g = MOCK.groups.find((x) => x.id === Number($("#pGroup")?.value));
        audienceLabel = g?.name || audienceLabel;
      }
      const now = new Date();
      const grp = audience === "group" ? MOCK.groups.find((x) => x.id === Number($("#pGroup")?.value)) : null;
      MOCK.pushes.unshift({
        id: nextId(),
        title,
        body,
        type: MOCK.pushTypes.find((t) => t.value === $("#pType").value)?.label || "Объявление",
        time: `Сегодня ${pad(now.getHours())}:${pad(now.getMinutes())}`,
        audience: audienceLabel,
        stats: `${grp ? grp.studentsCount : 0} / 0`,
      });
      closeSheet();
      toast("Пуш отправлен", "ok");
      render();
    };
  }

  function openEfirScreen() {
    const el = $("#screenOverlay");
    el.hidden = false;
    el.innerHTML = `
      <div class="appbar">
        <button type="button" class="appbar-back" id="efirBack">${icon("arrow_back")}</button>
        <div class="appbar-title" style="flex:1">Эфир</div>
        <button type="button" class="appbar-profile" style="visibility:hidden">${icon("person")}</button>
      </div>
      <div class="content">
        <div class="list-pad">
          <button type="button" class="btn btn-primary" id="efirCreate" style="width:100%;margin-bottom:12px">
            ${icon("add")} Создать эфир
          </button>
          ${MOCK.efirs
            .map(
              (e) => `
            <div class="card efir-card">
              ${icon("live_tv")}
              <div style="flex:1">
                <div style="font-weight:600;font-size:15px">${e.title}</div>
                <div style="font-size:12px;color:var(--hint);margin-top:2px">${e.when}</div>
              </div>
              <span class="badge ${e.status === "done" ? "badge-off" : "badge-ok"}">${
                e.status === "done" ? "завершён" : "запланирован"
              }</span>
            </div>`
            )
            .join("")}
        </div>
      </div>`;
    $("#efirBack").onclick = closeScreen;
    $("#efirCreate").onclick = () => {
      MOCK.efirs.unshift({
        id: nextId(),
        title: "Новый эфир",
        when: "сегодня 20:00",
        status: "planned",
      });
      toast("Эфир создан", "ok");
      openEfirScreen();
    };
  }

  function paintStack() {
    const page = state.navStack[state.navStack.length - 1];
    if (!page) {
      closeScreen();
      return;
    }
    const el = $("#screenOverlay");
    el.hidden = false;
    const student = state.mode === "student";
    el.className = `screen-overlay ${page.screenCls || ""}`;
    el.innerHTML = `
      ${
        page.bar
          ? page.bar()
          : `<div class="appbar ${student ? "appbar-inner" : ""} ${page.centered ? "appbar-centered" : ""}">
        <button type="button" class="appbar-back" id="innerBack">${icon("arrow_back")}</button>
        <div class="appbar-title" style="flex:1">${page.title}</div>
        ${page.right || (student ? "" : `<button type="button" class="appbar-profile" id="innerProfile">${icon("person")}</button>`)}
      </div>`
      }
      <div class="content ${page.cls || ""}">${page.build()}</div>
      ${page.footer ? page.footer() : ""}`;
    $("#innerBack") && ($("#innerBack").onclick = () => {
      state.navStack.pop();
      if (!state.navStack.length) closeScreen();
      else paintStack();
    });
    $("#innerProfile")?.addEventListener("click", openUserProfile);
    page.after?.();
  }

  function openInner(title, bodyHtml) {
    state.navStack = [{ title, build: () => bodyHtml }];
    paintStack();
  }

  function pushScreen(title, build, after, extra = {}) {
    state.navStack.push({ title, build, after, ...extra });
    paintStack();
  }

  function pageHtml() {
    const id = state.svc.id;
    const tab = state.svc.tab;
    if (id === "subjects") {
      return `<div class="list-pad">${MOCK.subjects
        .map(
          (s) => `
        <button type="button" class="cat-row" data-open="${s.title}">
          <span class="cat-ico" style="background:${s.color}"><img src="${s.img}" alt="" /></span>
          <span>${s.title}</span>
          <span class="material-icons-round chev">chevron_right</span>
        </button>`
        )
        .join("")}</div>`;
    }
    if (id === "tests") {
      const tabs = [
        ["ent", "ЕНТ"],
        ["history", "История"],
        ["stats", "Статистика"],
      ];
      const head = `<div class="seg-tabs seg-3">${tabs
        .map(([k, l]) => `<button type="button" data-svctab="${k}" class="${tab === k ? "on" : ""}">${l}</button>`)
        .join("")}</div>`;
      const attempts = MOCK.entAttempts || [];
      if (tab === "history") {
        return `${head}<div class="list-pad" style="padding-top:16px">
          ${
            attempts
              .map(
                (a) => `<div class="news-card"><div class="n-title">Пробный ЕНТ · ${a.variant}-нұсқа <span class="eh-score">${a.total}</span></div>
                <div class="n-body">${a.date}<br>${a.subjects.map((x) => `${x.title}: ${x.score}/${x.max}`).join(" · ")}</div></div>`
              )
              .join("") || `<div class="empty">Әзірге пробный ЕНТ тапсырылмаған.<br>«ЕНТ» қойындысынан бастаңыз.</div>`
          }
        </div>`;
      }
      if (tab === "stats") {
        const best = attempts.reduce((m, a) => Math.max(m, a.total), 0);
        const avg = attempts.length ? Math.round(attempts.reduce((t, a) => t + a.total, 0) / attempts.length) : 0;
        return `${head}<div class="list-pad sch-stats" style="padding:16px 0 0;margin:0 15px">
          <div class="sch-stat"><b style="color:#5CB36D">${best}</b><span>лучший балл</span></div>
          <div class="sch-stat"><b style="color:#6C7FD8">${avg}</b><span>средний</span></div>
          <div class="sch-stat"><b style="color:#E0A84A">${attempts.length}</b><span>попытки</span></div>
        </div>`;
      }
      return head + entPickerHtml();
    }
    if (id === "trainer") {
      return `
        <div class="list-pad trainer-list">
          <p class="trainer-intro">Выберите предмет и потренируйте слабые темы. Вопросы подбираются по вашему прогрессу.</p>
          ${MOCK.trainerSubjects
            .map((t) => {
              const c = MOCK.myCourses.find((x) => x.id === t.courseId);
              return `
            <button type="button" class="trainer-card" data-trainer="${t.id}">
              ${posterHtml(c.poster, "sq")}
              <div style="flex:1;min-width:0">
                <div class="trainer-title">${t.title}</div>
                <div class="trainer-bar"><i style="width:${t.percent}%"></i></div>
                <div class="trainer-meta">${t.percent}% · ${t.done}/${t.total} освоено</div>
              </div>
              <span class="material-icons-round chev">chevron_right</span>
            </button>`;
            })
            .join("")}
        </div>`;
    }
    if (id === "professions") {
      const isUni = tab === "uni";
      const q = state.svc.q || "";
      const filter = isUni ? state.svc.region : state.svc.subj;
      const all = isUni ? MOCK.universities : MOCK.specialities;
      const rows = all.filter(
        (r) => matches(q, r.code, r.name) && (!filter || (isUni ? r.city : r.subjects) === filter)
      );
      return `
        <div class="seg-tabs">
          <button type="button" data-svctab="spec" class="${!isUni ? "on" : ""}">Специальности</button>
          <button type="button" data-svctab="uni" class="${isUni ? "on" : ""}">ВУЗы</button>
        </div>
        <div class="hub-head">
          <div class="hub-title">${isUni ? "Высшие учебные заведения" : "Специальности"}</div>
          <div class="hub-sub">Официальные данные · ${rows.length}/${all.length}</div>
          <div class="prof-tools">
            <label class="prof-search">${icon("search")}<input id="svcSearch" placeholder="Поиск по коду или названию" value="${q.replace(/"/g, "&quot;")}" /></label>
            <button type="button" class="prof-drop" id="profFilter"><span>${filter || (isUni ? "Барлық аймақ" : "Барлық пәндер")}</span>${icon("expand_more")}</button>
          </div>
        </div>
        <div class="guide-card prof-list">
          ${rows.map((r) => (isUni ? uniRowHtml(r) : specRowHtml(r))).join("") || `<div class="empty">Ничего не найдено</div>`}
        </div>`;
    }
    if (id === "analytics") {
      const A = MOCK.analytics;
      const pct = (d, t) => (t ? Math.round((d / t) * 100) : 0);
      const allDone = MOCK.myCourses.reduce((t, c) => t + c.done, 0);
      const allTotal = MOCK.myCourses.reduce((t, c) => t + c.total, 0);
      const T = testsSummary();
      const card = ({ emoji, tint, label, value, bar, meta, open }) => `
        <button type="button" class="an-card" ${open ? `data-an="${open}"` : ""}>
          <span class="an-ico" style="background:${tint}">${emoji}</span>
          <span class="an-body">
            <span class="an-label">${label}</span>
            <span class="an-value">${value}</span>
            ${bar != null ? `<span class="an-bar"><i style="width:${bar}%"></i></span>` : ""}
            ${meta ? `<span class="an-meta">${meta}</span>` : ""}
          </span>
          ${open ? `<span class="material-icons-round an-chev">chevron_right</span>` : ""}
        </button>`;
      return `
        <div class="an-wrap">
          ${
            A.goal
              ? `
          <div class="an-goal">
            <div class="an-goal-head">
              <span class="an-goal-ico">🎯</span>
              <div>
                <div class="an-goal-title">Моя цель</div>
                <div class="an-goal-sub">${A.goal.uni || "ЕНТ"}</div>
              </div>
            </div>
            <div class="an-goal-score"><b>${A.goal.score}</b> баллов</div>
            <div class="an-goal-text">Последний пробный ЕНТ: 86 баллов. До цели осталось ${Math.max(0, A.goal.score - 86)}.</div>
            <button type="button" class="an-goal-btn" id="setGoal">${icon("edit", "material-icons-outlined")}Изменить цель</button>
          </div>`
              : `
          <div class="an-goal">
            <div class="an-goal-head">
              <span class="an-goal-ico">🎯</span>
              <div>
                <div class="an-goal-title">Поставь цель!</div>
                <div class="an-goal-sub">Определи свою цель для ЕНТ</div>
              </div>
            </div>
            <div class="an-goal-text">Установи целевой балл или выбери университет, в который хочешь поступить. Мы поможем тебе отслеживать прогресс!</div>
            <button type="button" class="an-goal-btn" id="setGoal">${icon("add_circle_outline", "material-icons-outlined")}Установить цель</button>
          </div>`
          }
          ${card({ emoji: "🎓", tint: "#4a3a40", label: "Всего курсов", value: `${pct(allDone, allTotal)}%`, bar: pct(allDone, allTotal), meta: `Пройдено ${allDone} из ${allTotal} уроков по ${MOCK.myCourses.length} предметам`, open: "courses" })}
          ${card({ emoji: "👆", tint: "#4f4834", label: "Просмотрено всего уроков", value: `${allDone} из ${allTotal}`, meta: `Осталось посмотреть: ${allTotal - allDone} уроков` })}
          ${card({ emoji: "📝", tint: "#34485a", label: "Пройдено всего тестов", value: `${T.done} из ${T.total}`, bar: pct(T.done, T.total), meta: `Средний результат: ${T.avg}% · осталось сдать ${T.total - T.done}`, open: "tests" })}
          ${card({ emoji: "📋", tint: "#454a5c", label: "Пройдено пробных тестов", value: `${A.mockTests}`, open: "mock" })}
        </div>`;
    }
    return `<div class="empty">Скоро наш магазин откроется — запасы знаний готовы, и скидки на гениальность уже подвозят!</div>`;
  }

  /* —— Профессии —— */
  function hashNum(str) {
    let h = 7;
    for (const ch of str) h = (h * 31 + ch.charCodeAt(0)) % 100003;
    return h;
  }
  /** Проходной балл вуза на специальность (null — не набирает) */
  function passScore(spec, uni) {
    const h = hashNum(spec.code + uni.code);
    if (h % 100 >= 70) return null;
    return 55 + (h % 36) + (uni.gov ? 0 : -5);
  }
  function specRowHtml(r) {
    return `
      <button type="button" class="prof-row" data-spec="${r.code}">
        <span class="prof-code">${r.code}</span>
        <span class="prof-main">
          <span class="prof-name">${r.name}</span>
          <span class="prof-tag">${r.subjects}</span>
        </span>
        <span class="material-icons-round chev">chevron_right</span>
      </button>`;
  }
  function uniRowHtml(u) {
    return `
      <button type="button" class="prof-row" data-uni="${u.code}">
        <span class="prof-logo">${u.short}</span>
        <span class="prof-main">
          <span class="prof-num">${u.code}</span>
          <span class="prof-name">${u.name}</span>
          <span class="prof-city">${u.city}<span class="prof-tag ${u.gov ? "" : "grey"}">${u.gov ? "Государственный" : "Частный"}</span></span>
        </span>
        <span class="material-icons-round chev">chevron_right</span>
      </button>`;
  }
  /** Выпадающий список снизу: tap = выбрать */
  function pickSheet(title, options, value, onPick) {
    openSheet(`
      <div class="sheet-handle"></div>
      <div class="sheet-title">${title}</div>
      <div class="pick-list">
        ${options
          .map(
            (o) => `<button type="button" class="pick-opt ${o.value === value ? "on" : ""}" data-pickval="${o.value ?? ""}">
              <span>${o.label}</span>${o.value === value ? icon("check") : ""}</button>`
          )
          .join("")}
      </div>`);
    $$("[data-pickval]").forEach((b) => {
      b.onclick = () => {
        closeSheet();
        onPick(b.dataset.pickval || null);
      };
    });
  }
  const uniq = (arr) => [...new Set(arr)];

  function detailListHtml(rows, emptyText) {
    return (
      rows
        .map(
          (r) => `
        <button type="button" class="where-row" ${r.attr}>
          <span class="where-code">${r.code}</span>
          <span class="where-main"><span class="where-name">${r.name}</span><span class="where-city">${r.sub}</span></span>
          <span class="where-score">${r.score}</span>
        </button>`
        )
        .join("") || `<div class="empty">${emptyText}</div>`
    );
  }

  function openSpecDetail(spec) {
    const st = { q: "", sort: "desc", region: null };
    const build = () => {
      const all = MOCK.universities.map((u) => ({ u, score: passScore(spec, u) })).filter((x) => x.score != null);
      let rows = all.filter((x) => matches(st.q, x.u.code, x.u.name) && (!st.region || x.u.city === st.region));
      rows.sort((a, b) => (st.sort === "desc" ? b.score - a.score : a.score - b.score));
      return `
        <div class="list-pad prof-detail">
          <div class="pd-card">
            <div class="pd-over">Профиль специальности</div>
            <span class="pd-code">${spec.code}</span>
            <div class="pd-name">${spec.name}</div>
            <span class="pd-pill">${spec.subjects}</span>
          </div>
          <div class="where-card">
            <div class="where-head">
              <div>
                <div class="where-title">Где можно учиться</div>
                <div class="where-sub">Вузы, которые набирают на эту специальность</div>
              </div>
              <span class="where-count">${all.length}</span>
            </div>
            <label class="prof-search wide">${icon("search")}<input id="pdSearch" placeholder="Поиск по коду или названию" value="${st.q.replace(/"/g, "&quot;")}" /></label>
            <div class="where-tools">
              <button type="button" class="prof-drop" id="pdSort"><span>${st.sort === "desc" ? "Сначала высокие" : "Сначала низкие"}</span>${icon("expand_more")}</button>
              <button type="button" class="prof-drop" id="pdRegion"><span>${st.region || "Все регионы"}</span>${icon("expand_more")}</button>
            </div>
            ${detailListHtml(
              rows.map((x) => ({ attr: `data-uni="${x.u.code}"`, code: x.u.code, name: x.u.name, sub: x.u.city, score: x.score })),
              "Ничего не найдено"
            )}
          </div>
        </div>`;
    };
    pushScreen("К списку специальностей", build, () => {
      bindSearch("#pdSearch", (v) => {
        st.q = v;
        paintStack();
      });
      $("#pdSort").onclick = () =>
        pickSheet("Сортировка", [{ value: "desc", label: "Сначала высокие" }, { value: "asc", label: "Сначала низкие" }], st.sort, (v) => {
          st.sort = v || "desc";
          paintStack();
        });
      $("#pdRegion").onclick = () =>
        pickSheet("Регион", [{ value: null, label: "Все регионы" }, ...uniq(MOCK.universities.map((u) => u.city)).map((c) => ({ value: c, label: c }))], st.region, (v) => {
          st.region = v;
          paintStack();
        });
      $$("[data-uni]").forEach((b) => (b.onclick = () => openUniDetail(MOCK.universities.find((u) => u.code === b.dataset.uni))));
    });
  }

  function openUniDetail(uni) {
    const st = { q: "" };
    const build = () => {
      const all = MOCK.specialities.map((sp) => ({ sp, score: passScore(sp, uni) })).filter((x) => x.score != null);
      const rows = all.filter((x) => matches(st.q, x.sp.code, x.sp.name));
      return `
        <div class="list-pad prof-detail">
          <div class="pd-card">
            <div class="pd-over">Профиль вуза</div>
            <span class="pd-code">${uni.code}</span>
            <div class="pd-name">${uni.name}</div>
            <span class="pd-pill">${uni.city} · ${uni.gov ? "Государственный" : "Частный"}</span>
          </div>
          <div class="where-card">
            <div class="where-head">
              <div>
                <div class="where-title">Специальности</div>
                <div class="where-sub">На что набирает этот вуз</div>
              </div>
              <span class="where-count">${all.length}</span>
            </div>
            <label class="prof-search wide">${icon("search")}<input id="udSearch" placeholder="Поиск по коду или названию" value="${st.q.replace(/"/g, "&quot;")}" /></label>
            ${detailListHtml(
              rows.map((x) => ({ attr: `data-spec="${x.sp.code}"`, code: x.sp.code, name: x.sp.name, sub: x.sp.subjects, score: x.score })),
              "Ничего не найдено"
            )}
          </div>
        </div>`;
    };
    pushScreen("К списку вузов", build, () => {
      bindSearch("#udSearch", (v) => {
        st.q = v;
        paintStack();
      });
      $$("[data-spec]").forEach((b) => (b.onclick = () => openSpecDetail(MOCK.specialities.find((x) => x.code === b.dataset.spec))));
    });
  }

  function openGoalSheet() {
    const g = MOCK.analytics.goal || { score: 120, uni: "" };
    openSheet(`
      <div class="sheet-handle"></div>
      <div class="sheet-title">Цель на ЕНТ</div>
      <div class="sheet-sub">Целевой балл (максимум 140) и вуз мечты</div>
      <div class="sheet-label">Целевой балл</div>
      <input class="field-input" id="goalScore" type="number" min="50" max="140" value="${g.score}" />
      <div class="sheet-label">Университет</div>
      <select class="field-select" id="goalUni">
        <option value="">Не выбран</option>
        ${MOCK.universities.map((u) => `<option ${u.name === g.uni ? "selected" : ""}>${u.name}</option>`).join("")}
      </select>
      <div class="sheet-actions"><button type="button" class="btn btn-primary" id="goalSave" style="width:100%">Сохранить</button></div>`);
    $("#goalSave").onclick = () => {
      const score = Number($("#goalScore").value);
      if (!score || score < 50 || score > 140) {
        toast("Балл должен быть от 50 до 140", "err");
        return;
      }
      MOCK.analytics.goal = { score, uni: $("#goalUni").value };
      closeSheet();
      paintStack();
      toast("Цель сохранена");
    };
  }

  /* —— Тренажёр → Умная практика —— */
  function openPractice(t, topicTitle) {
    const bank = MOCK.practice[t.id];
    const P = { i: 0, picked: null, checked: false, correct: 0, answered: 0, done: false };
    const total = bank.questions.length;
    const mastery = () => Math.round((P.correct / total) * 100);
    const status = () => {
      if (!P.answered) return "Новая · 0%";
      const pct = mastery();
      if (P.done && pct >= 80) return `Закрыта · ${pct}%`;
      return `${P.correct ? "В работе" : "Слабая"} · ${pct}%`;
    };
    const build = () => {
      if (P.done) {
        const pct = Math.round((P.correct / total) * 100);
        return `
          <div class="pr-result">
            <div class="pr-result-ico">${pct >= 80 ? "🎉" : "💪"}</div>
            <div class="pr-result-title">${pct >= 80 ? "Тема закрыта!" : "Хорошая попытка"}</div>
            <div class="pr-result-score">${P.correct} / ${total}</div>
            <div class="pr-result-sub">${pct >= 80 ? "Вы ответили правильно на большинство вопросов." : "Слабые вопросы вернутся в следующей практике."}</div>
          </div>`;
      }
      const item = bank.questions[P.i];
      return `
        <div class="pr-head">
          <div class="pr-top"><span class="pr-badge">Умная практика</span><b>${P.correct} / ${P.answered}</b></div>
          <div class="pr-bar ${P.correct ? "warm" : ""}"><i style="width:${(P.answered / total) * 100}%"></i></div>
          <div class="pr-status">${status()}</div>
        </div>
        <div class="pr-body">
          <div class="pr-q">${item.q}</div>
          ${item.options
            .map((o, k) => {
              let cls = "";
              if (P.checked && k === item.answer) cls = "ok";
              else if (P.checked && k === P.picked) cls = "bad";
              else if (!P.checked && k === P.picked) cls = "sel";
              return `<button type="button" class="pr-opt ${cls}" data-opt="${k}"><span class="pr-radio"></span><span>${o}</span></button>`;
            })
            .join("")}
          ${P.checked ? feedbackHtml(item) : ""}
        </div>`;
    };
    const feedbackHtml = (item) => {
      const ok = P.picked === item.answer;
      return `
        <div class="pr-fb ${ok ? "ok" : "bad"}">
          <div class="pr-fb-title">${ok ? "Верно" : "Неверно"}</div>
          <div class="pr-fb-sub">Освоение темы: ${mastery()}%</div>
          <div class="pr-explain">
            ${ok ? "<b>Дұрыс!</b>" : `<b>Дұрыс емес.</b> Дұрыс жауабы: <b>${item.options[item.answer]}</b> — `}
            ${item.explain || ""}
          </div>
        </div>`;
    };
    const footer = () => {
      const label = P.done ? "Готово" : !P.checked ? "Ответить" : P.i + 1 < total ? "Дальше" : "Завершить";
      return `<div class="sticky-foot"><button type="button" class="smart-btn pr-go ${!P.done && !P.checked && P.picked == null ? "off" : ""}" id="prGo">${label}</button></div>`;
    };
    pushScreen(
      topicTitle || bank.topic,
      build,
      () => {
        $$("[data-opt]").forEach((b) => {
          b.onclick = () => {
            if (P.checked) return;
            P.picked = Number(b.dataset.opt);
            paintStack();
          };
        });
        $("#prFlag").onclick = () =>
          pickSheet(
            "Пожаловаться на вопрос",
            [
              { value: "wrong", label: "Неверный ответ" },
              { value: "typo", label: "Опечатка в вопросе" },
              { value: "unclear", label: "Непонятный вопрос" },
            ],
            null,
            () => toast("Спасибо! Мы проверим вопрос")
          );
        $("#prGo").onclick = () => {
          if (P.done) {
            state.navStack.pop();
            paintStack();
            return;
          }
          if (!P.checked) {
            if (P.picked == null) {
              toast("Выберите ответ", "err");
              return;
            }
            P.checked = true;
            P.answered += 1;
            if (P.picked === bank.questions[P.i].answer) P.correct += 1;
          } else if (P.i + 1 < total) {
            P.i += 1;
            P.picked = null;
            P.checked = false;
          } else {
            P.done = true;
            t.done = Math.min(t.total, t.done + (P.correct === total ? 1 : 0));
            t.percent = Math.round((t.done / t.total) * 100) || t.percent;
          }
          paintStack();
        };
      },
      {
        footer,
        right: `<button type="button" class="appbar-icon-btn" id="prFlag" title="Пожаловаться">${icon("outlined_flag")}</button>`,
      }
    );
  }

  /* —— Пробный ЕНТ: testcenter.kz нұсқалары (js/probnik.js, ент-банктен) —— */
  const ENT_KEYS = {
    math: "mathematics", phys: "physics", inf: "informatics", geo: "geography", bio: "biology", chem: "chemistry",
    djt: "world_history", eng: "english", law: "law_basics", kz: "kazakh_language", kzlit: "kazakh_literature",
  };
  const ENT_SHORT = { history_kz: "Тарих", math_literacy: "Мат-сауат", reading_literacy: "Оқу сауат" };
  const ENT_MIN = { history_kz: 5, math_literacy: 3, reading_literacy: 3 };
  MOCK.entAttempts = MOCK.entAttempts || [];

  function loadScript(src) {
    return new Promise((ok, fail) => {
      const el = document.createElement("script");
      el.src = src;
      el.onload = ok;
      el.onerror = fail;
      document.head.appendChild(el);
    });
  }
  function loadCss(href) {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = href;
    document.head.appendChild(l);
  }
  let probnikReady = null;
  function loadProbnik() {
    if (!probnikReady) {
      const v = ($('script[src*="js/app.js"]')?.src.split("?v=")[1]) || "1";
      loadCss("https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css");
      probnikReady = Promise.all([
        loadScript(`js/probnik.js?v=${v}`),
        loadScript("https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js")
          .then(() => loadScript("https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/contrib/auto-render.min.js"))
          .catch(() => null),
      ]);
    }
    return probnikReady;
  }
  /** Markdown (жуан, сурет, жол) + LaTeX ($…$ KaTeX арқылы кейін) */
  function md(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img class="md-img" src="$2" alt="$1" />')
      .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
      .replace(/\n/g, "<br>");
  }
  function renderMath(root) {
    if (window.renderMathInElement && root)
      window.renderMathInElement(root, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
        ],
        throwOnError: false,
      });
  }
  /** Сәйкестендіру: сұрақ мәтіні мен оң жақ нұсқаларын бөлу */
  function splitMatching(stem) {
    const i = stem.indexOf("Сәйкестендіру нұсқалары:");
    if (i < 0) return { stem, right: [] };
    const tail = stem.slice(i + "Сәйкестендіру нұсқалары:".length);
    const right = [...tail.matchAll(/(\d+)\)\s*([\s\S]*?)(?=\s\d+\)\s|$)/g)].map((m) => ({ n: m[1], text: m[2].trim() }));
    return { stem: stem.slice(0, i).trim(), right };
  }
  function matchingKey(q) {
    const key = {};
    (q.matching || "").split(",").forEach((p) => {
      const [l, r] = p.trim().split("-");
      if (l && r) key[l.trim()] = r.trim();
    });
    return key;
  }
  /** п.18 Правил: single 1 балл; multiple/matching макс 2 */
  function scoreQ(q, ans) {
    if (ans == null) return 0;
    if (q.type === "single_choice") return q.options[ans]?.correct ? 1 : 0;
    let k, c, w;
    if (q.type === "matching") {
      const key = matchingKey(q);
      k = Object.keys(key).length;
      c = Object.entries(ans).filter(([l, r]) => r && key[l] === r).length;
      w = Object.entries(ans).filter(([l, r]) => r && key[l] !== r).length;
    } else {
      k = q.options.filter((o) => o.correct).length;
      c = [...ans].filter((i) => q.options[i].correct).length;
      w = [...ans].filter((i) => !q.options[i].correct).length;
    }
    if (w >= 2) return 0;
    if (c === k && w === 0) return 2;
    const need = k <= 2 ? 1 : k - 1;
    return c >= need && c > 0 ? 1 : 0;
  }
  function maxQ(q) {
    return q.type === "single_choice" ? 1 : 2;
  }
  function isAnswered(q, a) {
    if (a == null) return false;
    if (q.type === "multiple_choice") return a.size > 0;
    if (q.type === "matching") return Object.values(a).some(Boolean);
    return true;
  }

  /* —— ҰБТ нәтижесі сертификаты (I4U бланкі) —— */
  const CERT_NAMES = {
    history_kz: ["Қазақстан тарихы", "История Казахстана"],
    reading_literacy: ["Оқу сауаттылығы", "Грамотность чтения"],
    math_literacy: ["Математикалық сауаттылық", "Математическая грамотность"],
    mathematics: ["Математика", "Математика"],
    physics: ["Физика", "Физика"],
    informatics: ["Информатика", "Информатика"],
    geography: ["География", "География"],
    biology: ["Биология", "Биология"],
    chemistry: ["Химия", "Химия"],
    world_history: ["Дүниежүзі тарихы", "Всемирная история"],
    english: ["Ағылшын тілі", "Английский язык"],
    law_basics: ["Құқық негіздері", "Основы права"],
    kazakh_language: ["Қазақ тілі", "Казахский язык"],
    kazakh_literature: ["Қазақ әдебиеті", "Казахская литература"],
  };
  function drawCertificate(d) {
    const W = 906, H = 1280, S = 2;
    const cv = document.createElement("canvas");
    cv.width = W * S;
    cv.height = H * S;
    const x = cv.getContext("2d");
    x.scale(S, S);
    const blue = "#2d5a8c", ink = "#111";
    x.fillStyle = "#fff";
    x.fillRect(0, 0, W, H);
    x.fillStyle = "#eef4f8";
    x.fillRect(22, 22, W - 44, H - 44);
    // толқынды жиек
    x.strokeStyle = "#6f9cc4";
    x.lineWidth = 2;
    const wave = (x0, y0, x1, y1) => {
      const len = Math.hypot(x1 - x0, y1 - y0), n = Math.floor(len / 6);
      x.beginPath();
      for (let i = 0; i <= n; i++) {
        const t = i / n, px = x0 + (x1 - x0) * t, py = y0 + (y1 - y0) * t;
        const o = Math.sin(i * 1.6) * 3;
        x0 === x1 ? x.lineTo(px + o, py) : x.lineTo(px, py + o);
      }
      x.stroke();
    };
    wave(24, 24, W - 24, 24); wave(24, H - 24, W - 24, H - 24); wave(24, 24, 24, H - 24); wave(W - 24, 24, W - 24, H - 24);
    // логотип
    x.fillStyle = "#3b3f8f";
    x.font = "bold 64px Arial";
    x.fillText("I4U", 70, 108);
    x.fillStyle = blue;
    x.font = "bold 17px Times New Roman";
    x.fillText("I4U.kz Білім беру орталығы", 487, 68);
    x.fillText("Образовательный центр I4U.kz", 487, 90);
    const line = (y, x0 = 44, x1 = W - 44) => { x.strokeStyle = "#555"; x.lineWidth = 1; x.beginPath(); x.moveTo(x0, y); x.lineTo(x1, y); x.stroke(); };
    line(137);
    x.textAlign = "center";
    x.font = "bold 19px Times New Roman";
    x.fillText("ТЕСТІЛЕНУШІНІҢ ҰБТ НӘТИЖЕСІ", W / 2, 176);
    x.fillText("РЕЗУЛЬТАТЫ ЕНТ ТЕСТИРУЕМОГО", W / 2, 197);
    x.textAlign = "left";
    x.fillStyle = ink;
    const field = (label, value, y, lx, w) => {
      x.font = "bold 17px Times New Roman";
      x.fillText(label, 46, y);
      x.font = "17px Arial";
      x.fillText(value, lx + 4, y - 3);
      line(y + 4, lx, lx + w);
    };
    field("Номер телефона", d.phone, 245, 186, 220);
    field("Группы", d.group, 276, 120, 220);
    x.font = "bold 22px Arial";
    x.textAlign = "center";
    x.fillText(d.name, W / 2, 316);
    x.textAlign = "left";
    line(327);
    x.font = "italic 13px Times New Roman";
    x.textAlign = "center";
    x.fillText("Т.А.Ә. бар болған жағдайда/Ф.И.О. при его наличии", W / 2, 342);
    x.textAlign = "left";
    x.font = "17px Times New Roman";
    x.fillText("ҰБТ тапсырған мерзімі:", 46, 375);
    x.fillText("Дата сдачи ЕНТ:", 46, 399);
    x.font = "17px Arial";
    x.fillText(d.date, 236, 372);
    line(378, 230, 376);
    x.font = "17px Times New Roman";
    x.fillText("ҰБТ тапсыру тілі:", 46, 432);
    x.fillText("Язык сдачи ЕНТ:", 46, 456);
    x.font = "16px Arial";
    x.fillText(d.lang, 192, 429);
    line(437, 186, 420);
    // кесте
    const tx = 46, ty = 482, tw = W - 92, c1 = 42, c2 = 498, rh = 43;
    const rows = [...d.rows].sort((a, b) => ["history_kz", "reading_literacy", "math_literacy"].indexOf(a.key) - ["history_kz", "reading_literacy", "math_literacy"].indexOf(b.key));
    const order = ["history_kz", "reading_literacy", "math_literacy"];
    const sorted = [...rows.filter((r) => order.includes(r.key)).sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key)), ...rows.filter((r) => !order.includes(r.key))];
    x.strokeStyle = "#222";
    x.lineWidth = 1;
    x.strokeRect(tx, ty, tw, 28 + sorted.length * rh + 43 + 34);
    x.fillStyle = blue;
    x.font = "bold 13px Times New Roman";
    x.textAlign = "center";
    x.fillText("№", tx + c1 / 2, ty + 18);
    x.fillText("Пәндер атауы/Наименование предметов", tx + c1 + c2 / 2, ty + 18);
    x.fillText("Жинаған балдары/Набранные баллы", tx + c1 + c2 + (tw - c1 - c2) / 2, ty + 18);
    const hl = (y) => { x.beginPath(); x.moveTo(tx, y); x.lineTo(tx + tw, y); x.stroke(); };
    const vl = (xx, y0, y1) => { x.beginPath(); x.moveTo(xx, y0); x.lineTo(xx, y1); x.stroke(); };
    hl(ty + 28);
    sorted.forEach((r, i) => {
      const y = ty + 28 + i * rh;
      const [kz, ru] = CERT_NAMES[r.key] || [r.key, r.key];
      x.fillStyle = ink;
      x.textAlign = "center";
      x.font = "15px Times New Roman";
      x.fillText(String(i + 1), tx + c1 / 2, y + 27);
      x.textAlign = "left";
      x.font = "14px Times New Roman";
      x.fillText(kz, tx + c1 + 4, y + 16);
      x.fillText(ru, tx + c1 + 4, y + 37);
      x.setLineDash([3, 3]);
      x.beginPath(); x.moveTo(tx + c1, y + 21); x.lineTo(tx + c1 + c2, y + 21); x.stroke();
      x.setLineDash([]);
      x.textAlign = "center";
      x.font = "bold 20px Arial";
      x.fillText(String(r.score), tx + c1 + c2 + (tw - c1 - c2) / 2, y + 29);
      hl(y + rh);
    });
    const yEnd = ty + 28 + sorted.length * rh;
    vl(tx + c1, ty, yEnd);
    vl(tx + c1 + c2, ty, yEnd + 43);
    x.lineWidth = 2;
    hl(yEnd);
    x.lineWidth = 1;
    x.fillStyle = blue;
    x.textAlign = "right";
    x.font = "bold 14px Times New Roman";
    x.fillText("Барлығы/Итого", tx + c1 + c2 - 2, yEnd + 27);
    x.fillStyle = ink;
    x.textAlign = "center";
    x.font = "bold 22px Arial";
    x.fillText(String(d.total), tx + c1 + c2 + (tw - c1 - c2) / 2, yEnd + 30);
    hl(yEnd + 43);
    x.font = "13px Times New Roman";
    x.fillText("мүмкін болған", 600, yEnd + 60);
    x.fillText("из возможных", 600, yEnd + 74);
    x.font = "14px Times New Roman";
    x.fillText("140", 718, yEnd + 66);
    x.font = "13px Times New Roman";
    x.fillText("балдан", 800, yEnd + 60);
    x.fillText("баллов", 800, yEnd + 74);
    x.textAlign = "left";
    x.font = "13px Times New Roman";
    const fy = yEnd + 100;
    x.fillText("Білім беру гранттарын беру конкурсына қатысу үшін жарамсыз", 46, fy);
    x.fillText("Не действителен для участия в конкурсе по присуждению образовательных грантов", 46, fy + 18);
    x.font = "bold 13px Times New Roman";
    x.fillText("Ресми сертификат болып табылмайды", 50, fy + 70);
    x.fillText("Не является официальным сертификатом", 50, fy + 86);
    line(fy + 150);
    return cv;
  }
  function openCertificate(d) {
    const url = drawCertificate(d).toDataURL("image/png");
    pushScreen(
      "Сертификат",
      () => `<div class="cert-view"><img src="${url}" alt="Сертификат" /></div>`,
      () => ($("#certSave").onclick = () => downloadCertificate(d)),
      {
        screenCls: "ent-light",
        footer: () => `<div class="sticky-foot"><button type="button" class="save-btn cert-save" id="certSave">${icon("download")}Скачать</button></div>`,
      }
    );
  }

  function downloadCertificate(d) {
    const cv = drawCertificate(d);
    cv.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `I4U_UBT_natizhe_${d.date.replace(/\./g, "-")}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast("Сертификат жүктелді");
    }, "image/png");
  }

  function openEntStartSheet() {
    const P = MOCK.entPicker;
    const rows = [
      ...P.selected.map((id) => {
        const e = P.electives.find((x) => x.id === id);
        return { title: e.title === "ДЖТ" ? "Дүниежүзі тарихы" : e.title, color: e.color, n: 40 };
      }),
      { title: "Қазақстан тарихы", color: "#2E8B73", n: 20 },
      { title: "Оқу сауаттылығы", color: "#E2AE1E", n: 10 },
      { title: "Математикалық сауаттылық", color: "#4A93CC", n: 10 },
    ];
    // Нұсқа кезекпен: 1 → 2 → 3 → 1 …
    const variant = ((MOCK.entAttempts?.length || 0) % 3) + 1;
    const layer = $("#dialogLayer");
    layer.hidden = false;
    layer.innerHTML = `
      <div class="ent-dlg">
        <div class="ent-dlg-title">Сынақ ҰБТ</div>
        ${rows.map((r) => `<div class="ent-dlg-row" style="--c:${r.color}"><span>${r.title}</span><b>${r.n}</b></div>`).join("")}
        <div class="ent-dlg-meta">${icon("quiz", "material-icons-outlined")}120 сұрақ <i>·</i> ${icon("schedule", "material-icons-outlined")}4 сағат</div>
        <div class="ent-dlg-actions">
          <button type="button" class="ent-dlg-cancel" id="entCancel">Бас тарту</button>
          <button type="button" class="ent-dlg-go" id="entGo">Бастау</button>
        </div>
      </div>`;
    layer.onclick = (e) => e.target === layer && closeDialog();
    $("#entCancel").onclick = closeDialog;
    $("#entGo").onclick = async () => {
      $("#entGo").textContent = "…";
      try {
        await loadProbnik();
      } catch {
        toast("Сұрақтар жүктелмеді", "err");
        return;
      }
      closeDialog();
      openEntTest(variant);
    };
  }

  function openEntTest(variant) {
    const P = window.PROBNIK;
    // Қосымшадағыдай: алдымен бейіндік пәндер, сосын міндетті
    const keys = [...MOCK.entPicker.selected.map((id) => ENT_KEYS[id]), "history_kz", "math_literacy", "reading_literacy"];
    const subjects = keys.map((k) => {
      const vs = P.subjects[k].variants;
      const v = vs[variant] ? variant : Number(Object.keys(vs)[0]);
      return { key: k, title: P.subjects[k].title, short: ENT_SHORT[k] || P.subjects[k].title, qs: vs[v], fallback: v !== variant ? v : null };
    });
    const E = { s: 0, q: subjects.map(() => 0), ans: {}, done: false, started: Date.now(), limit: 4 * 3600, ctxOpen: true, review: 0 };
    const all = subjects.flatMap((sub) => sub.qs);
    const answeredCount = () => all.filter((q) => isAnswered(q, E.ans[q.id])).length;
    // Міндетті пәндерде (тарих, сауаттылық) әр сұрақ — 1 балл: толық дұрыс болса ғана
    const core = (sub) => sub.key in ENT_MIN;
    const qMax = (sub, q) => (core(sub) ? 1 : maxQ(q));
    const qScore = (sub, q) => {
      const sc = scoreQ(q, E.ans[q.id]);
      return core(sub) ? (sc === maxQ(q) ? 1 : 0) : sc;
    };
    const subjScore = (sub) => sub.qs.reduce((t, q) => t + qScore(sub, q), 0);
    const subjMax = (sub) => sub.qs.reduce((t, q) => t + qMax(sub, q), 0);
    const leftSec = () => Math.max(0, E.limit - Math.floor((Date.now() - E.started) / 1000));
    const fmtT = (t) => `${pad(Math.floor(t / 3600))}:${String(Math.floor((t % 3600) / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
    let timer = null;

    const questionHtml = (sub, q, qi) => {
      const a = E.ans[q.id];
      const ctx = q.ctx && P.contexts[q.ctx];
      let body = "";
      if (q.type === "matching") {
        const { stem, right } = splitMatching(q.stem);
        body = `
          <div class="tq-q">${md(stem)}</div>
          <div class="mt-hint">Сәйкестендіріңіз</div>
          <div class="mt-right">${right.map((r) => `<div><b>${r.n})</b> ${md(r.text)}</div>`).join("")}</div>
          ${q.options
            .map(
              (o) => `
            <div class="mt-row">
              <span class="mt-l"><b>${o.id}</b> ${md(o.content)}</span>
              <span class="mt-picks">${right
                .map((r) => `<button type="button" class="mt-pick ${a?.[o.id] === r.n ? "on" : ""}" data-mt="${o.id}:${r.n}">${r.n}</button>`)
                .join("")}</span>
            </div>`
            )
            .join("")}`;
      } else {
        const multi = q.type === "multiple_choice";
        body = `
          <div class="tq-q">${md(q.stem)}</div>
          ${multi ? `<div class="mt-hint">Бір немесе бірнеше дұрыс жауап</div>` : ""}
          ${q.options
            .map((o, k) => {
              const on = multi ? a?.has(k) : a === k;
              return `<button type="button" class="tq-opt ${multi ? "multi" : ""} ${on ? "on" : ""}" data-eo="${k}"><span class="tq-radio"></span><span class="eo-id">${o.id}</span><span>${md(o.content)}</span></button>`;
            })
            .join("")}`;
      }
      return `
        ${
          ctx
            ? `<div class="ent-ctx ${E.ctxOpen ? "open" : ""}">
                <button type="button" class="ent-ctx-head" id="ctxToggle">${icon("article", "material-icons-outlined")}<span>${ctx.title || "Мәтін"}</span>${icon(E.ctxOpen ? "expand_less" : "expand_more")}</button>
                ${E.ctxOpen ? `<div class="ent-ctx-body">${md(ctx.body)}</div>` : ""}
              </div>`
            : ""
        }
        <div class="tq-meta">${sub.title} · ${qi + 1} / ${sub.qs.length}${sub.fallback ? ` · ${sub.fallback}-нұсқа` : ""}</div>
        ${body}`;
    };

    const resultHtml = () => {
      const total = subjects.reduce((t, sub) => t + subjScore(sub), 0);
      const max = subjects.reduce((t, sub) => t + subjMax(sub), 0);
      const passAll = subjects.every((sub) => subjScore(sub) >= (ENT_MIN[sub.key] || 5));
      const sub = subjects[E.review];
      return `
        <div class="er-head">
          <div class="er-total"><b>${total}</b> / ${max}</div>
          <div class="er-sub">${passAll && total >= 50 ? "Грантқа қатысуға болады (≥ 50 балл)" : passAll ? "Шекті балл өтті, грантқа 50 балл керек" : "Кейбір пән бойынша шекті балл жоқ"}</div>
        </div>
        <div class="list-pad">
          ${subjects
            .map((s2, i) => {
              const sc = subjScore(s2);
              const min = ENT_MIN[s2.key] || 5;
              return `<div class="er-row">
                <span class="er-name">${s2.title}</span>
                <span class="er-min ${sc >= min ? "ok" : "bad"}">${icon(sc >= min ? "check_circle" : "error_outline", "material-icons-outlined")}мин ${min}</span>
                <b>${sc}<small> / ${subjMax(s2)}</small></b>
              </div>`;
            })
            .join("")}
          <button type="button" class="cert-btn" id="certDownload">${icon("workspace_premium", "material-icons-outlined")}Сертификат${icon("chevron_right")}</button>
        </div>`;
    };

    const build = () => {
      if (E.done) return resultHtml();
      const sub = subjects[E.s];
      const qi = E.q[E.s];
      return `
        <div class="ent-subs">${subjects
          .map((s2, i) => {
            const n = s2.qs.filter((q) => isAnswered(q, E.ans[q.id])).length;
            return `<button type="button" class="ent-sub ${i === E.s ? "on" : ""}" data-es="${i}">${s2.short}<small>${n}/${s2.qs.length}</small></button>`;
          })
          .join("")}</div>
        <div class="tq-nums">${sub.qs
          .map((q, k) => `<button type="button" class="tq-num ${k === qi ? "on" : isAnswered(q, E.ans[q.id]) ? "ans" : ""}" data-qn="${k}">${k + 1}</button>`)
          .join("")}</div>
        <div class="tq-body">${questionHtml(sub, sub.qs[qi], qi)}</div>`;
    };

    const footer = () => {
      if (E.done) return `<div class="sticky-foot"><button type="button" class="save-btn" id="entExit">Тесттерге оралу</button></div>`;
      const pct = Math.round((answeredCount() / all.length) * 100);
      const sub = subjects[E.s];
      const lastQ = E.q[E.s] === sub.qs.length - 1;
      const lastAll = lastQ && E.s === subjects.length - 1;
      return `
        <div class="tq-foot">
          <div class="tq-prog"><span class="tq-pill" style="left:calc(${pct}% * 0.88)">${pct}%</span><i style="width:${pct}%"></i></div>
          <div class="tq-nav">
            <button type="button" class="tq-btn" id="eqPrev" ${E.s === 0 && E.q[0] === 0 ? "disabled" : ""}>${icon("arrow_circle_left", "material-icons-outlined")}Артқа</button>
            <button type="button" class="tq-btn ${lastAll ? "finish" : ""}" id="eqNext">${lastAll ? "Аяқтау" : "Алға"}${icon(lastAll ? "check_circle" : "arrow_circle_right", "material-icons-outlined")}</button>
          </div>
        </div>`;
    };

    const finish = async (auto) => {
      if (!auto) {
        const ok = await confirmDialog({
          title: "Тестті аяқтау?",
          message: `Жауап берілді: ${answeredCount()} / ${all.length}. Аяқтағаннан кейін жауаптарды өзгерту мүмкін емес.`,
          confirmLabel: "Аяқтау",
        });
        if (!ok) return;
      }
      clearInterval(timer);
      E.done = true;
      E.review = 0;
      const total = subjects.reduce((t, sub) => t + subjScore(sub), 0);
      MOCK.entAttempts.unshift({
        variant,
        total,
        date: new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long" }),
        subjects: subjects.map((sub) => ({ title: sub.title, score: subjScore(sub), max: subjMax(sub) })),
      });
      paintStack();
    };

    pushScreen(
      `Пробный ЕНТ · ${variant}-нұсқа`,
      build,
      () => {
        const root = $("#screenOverlay");
        renderMath(root);
        $$("[data-review]").forEach((b) => (b.onclick = () => ((E.review = Number(b.dataset.review)), paintStack())));
        $("#certDownload")?.addEventListener("click", () => {
          const me = MOCK.me;
          const grp = MOCK.groups.find((g) => g.students?.some((x) => x.phone === me.phone));
          openCertificate({
            name: `${me.firstName} ${me.lastName}`,
            phone: me.phone,
            group: grp ? grp.name : "—",
            date: dmy(new Date()),
            lang: "Қазақ тілі / Казахский",
            rows: subjects.map((s2) => ({ key: s2.key, score: subjScore(s2) })),
            total: subjects.reduce((t, s2) => t + subjScore(s2), 0),
          });
        });
        $("#entClose")?.addEventListener("click", () => {
          state.navStack.pop();
          paintStack();
        });
        $("#entFinish")?.addEventListener("click", () => finish(false));
        $("#entExit") &&
          ($("#entExit").onclick = () => {
            state.navStack.pop();
            state.svc.tab = "history";
            paintStack();
          });
        if (E.done) return;
        const sub = subjects[E.s];
        const q = sub.qs[E.q[E.s]];
        $$("[data-es]").forEach((b) => (b.onclick = () => ((E.s = Number(b.dataset.es)), paintStack())));
        $$("[data-qn]").forEach((b) => (b.onclick = () => ((E.q[E.s] = Number(b.dataset.qn)), paintStack())));
        $("#ctxToggle") && ($("#ctxToggle").onclick = () => ((E.ctxOpen = !E.ctxOpen), paintStack()));
        $$("[data-eo]").forEach((b) => {
          b.onclick = () => {
            const k = Number(b.dataset.eo);
            if (q.type === "multiple_choice") {
              const set = new Set(E.ans[q.id] || []);
              set.has(k) ? set.delete(k) : set.add(k);
              E.ans[q.id] = set;
            } else E.ans[q.id] = E.ans[q.id] === k ? null : k;
            paintStack();
          };
        });
        $$("[data-mt]").forEach((b) => {
          b.onclick = () => {
            const [l, r] = b.dataset.mt.split(":");
            const cur = { ...(E.ans[q.id] || {}) };
            cur[l] = cur[l] === r ? null : r;
            E.ans[q.id] = cur;
            paintStack();
          };
        });
        $("#eqPrev").onclick = () => {
          if (E.q[E.s] > 0) E.q[E.s] -= 1;
          else if (E.s > 0) {
            E.s -= 1;
            E.q[E.s] = subjects[E.s].qs.length - 1;
          }
          paintStack();
        };
        $("#eqNext").onclick = () => {
          if (E.q[E.s] < sub.qs.length - 1) E.q[E.s] += 1;
          else if (E.s < subjects.length - 1) E.s += 1;
          else return finish(false);
          paintStack();
        };
        $(".tq-num.on")?.scrollIntoView({ inline: "center", block: "nearest" });
        $(".ent-sub.on")?.scrollIntoView({ inline: "center", block: "nearest" });
        const t = $("#entTimer");
        clearInterval(timer);
        timer = setInterval(() => {
          const el = $("#entTimer");
          if (!el) return clearInterval(timer);
          const left = leftSec();
          el.textContent = fmtT(left);
          if (!left) finish(true);
        }, 1000);
        if (t) t.textContent = fmtT(leftSec());
      },
      {
        footer,
        screenCls: "ent-light",
        bar: () =>
          E.done
            ? `<div class="appbar ent-bar"><button type="button" class="appbar-back" id="entClose">${icon("arrow_back")}</button><div class="appbar-title" style="flex:1">Нәтиже · ${variant}-нұсқа</div></div>`
            : `<div class="appbar ent-bar"><span class="ent-clock" id="entTimer">${fmtT(leftSec())}</span><span style="flex:1"></span><button type="button" class="ent-finish" id="entFinish">Аяқтау</button></div>`,
      }
    );
  }

  function entPickerHtml() {
    const P = MOCK.entPicker;
    const sel = state.entSel;
    const open = state.entOpen;
    const chip = (x, on) =>
      `<button type="button" class="ent-chip ${on ? "on" : ""}" ${x.id ? `data-elective="${x.id}"` : ""} style="--c:${x.color}">${x.title}</button>`;
    const picked = P.electives.filter((x) => sel.includes(x.id));
    return `
      <div class="list-pad" style="padding-top:16px">
        <div class="ent-card">
          <button type="button" class="ent-card-head" id="entToggle">
            <span>${open ? "Выбрать комбинацию" : "Комбинация"}</span>
            ${open ? `<span class="material-icons-round" id="entClear">close</span>` : ""}
            <span class="material-icons-round">${open ? "expand_less" : "expand_more"}</span>
          </button>
          ${
            open
              ? `
          <div class="ent-sec">
            <div class="ent-sec-head">
              <span class="ent-sec-ico">${icon("tune")}</span>
              <div>
                <div class="ent-sec-title">Выборочные предметы</div>
                <div class="ent-sec-sub">Выберите ровно два профильных предмета</div>
              </div>
            </div>
            <div class="ent-chips">${P.electives.map((x) => chip(x, sel.includes(x.id))).join("")}</div>
          </div>
          <div class="ent-sec">
            <div class="ent-sec-head">
              <span class="ent-sec-ico">${icon("lock", "material-icons-outlined")}</span>
              <div>
                <div class="ent-sec-title">Основные предметы</div>
                <div class="ent-sec-sub">Обязательные для всех</div>
              </div>
            </div>
            <div class="ent-chips">${P.core.map((x) => chip(x, true)).join("")}</div>
          </div>`
              : `
          <div class="ent-summary">
            ${[...P.core, ...picked].map((x) => chip(x, true)).join("")}
          </div>
          <button type="button" class="btn btn-primary ent-start" id="startEnt">Пройти пробный ЕНТ</button>`
          }
        </div>
      </div>`;
  }

  function trainerSubjectHtml(t) {
    return `
      <div class="list-pad trainer-subject">
        <div class="trainer-meta-top">Освоено ${t.percent}%. Слабых тем: ${t.weak}, закрытых: ${t.closed}</div>
        <button type="button" class="smart-btn" id="smartPractice">${icon("auto_awesome")}Умная практика</button>
        <div class="trainer-hint">Сначала слабые и давно не тронутые темы. Можно открыть любую тему отдельно.</div>
        ${t.sections
          .map((sec, i) => {
            const open = state.trainerOpen[`${t.id}:${i}`];
            return `
          <div class="tsec">
            <button type="button" class="tsec-head" data-tsec="${t.id}:${i}">
              <div style="flex:1;min-width:0">
                <div class="tsec-title">${sec.title}</div>
                <div class="tsec-meta">${sec.percent}% · ${sec.count} тем</div>
              </div>
              <span class="material-icons-round">${open ? "expand_less" : "expand_more"}</span>
            </button>
            ${
              open
                ? `<div class="tsec-body">${sec.topics
                    .map((tp) => `<button type="button" class="tsec-topic" data-topic="${tp}"><span>${tp}</span><span class="tsec-pct">0%</span></button>`)
                    .join("")}</div>`
                : ""
            }
          </div>`;
          })
          .join("")}
      </div>`;
  }

  function openTrainerSubject(t) {
    pushScreen(t.title, () => trainerSubjectHtml(t), () => {
      $$("[data-tsec]").forEach((b) => {
        b.onclick = () => {
          const k = b.dataset.tsec;
          state.trainerOpen[k] = !state.trainerOpen[k];
          paintStack();
        };
      });
      $("#smartPractice").onclick = () => openPractice(t);
      $$("[data-topic]").forEach((b) => {
        b.onclick = () => openPractice(t, b.dataset.topic);
      });
    });
  }

  function bindService() {
    bindSearch("#svcSearch", (v) => {
      state.svc.q = v;
      paintStack();
    });
    $$("[data-svctab]").forEach((btn) => {
      btn.onclick = () => {
        state.svc.tab = btn.dataset.svctab;
        state.svc.q = "";
        state.svc.subj = null;
        state.svc.region = null;
        paintStack();
      };
    });
    $$("[data-open]").forEach((btn) => {
      btn.onclick = () => {
        const name = btn.dataset.open;
        pushScreen(name, () => `<div class="list-pad"><div class="news-card"><div class="n-title">${name}</div><div class="n-body">Раздел открыт, как в приложении.</div></div></div>`);
      };
    });
    $("#profFilter") &&
      ($("#profFilter").onclick = () => {
        const isUni = state.svc.tab === "uni";
        const values = uniq((isUni ? MOCK.universities : MOCK.specialities).map((r) => (isUni ? r.city : r.subjects)));
        pickSheet(
          isUni ? "Аймақ" : "Пәндер",
          [{ value: null, label: isUni ? "Барлық аймақ" : "Барлық пәндер" }, ...values.map((v) => ({ value: v, label: v }))],
          isUni ? state.svc.region : state.svc.subj,
          (v) => {
            state.svc[isUni ? "region" : "subj"] = v;
            paintStack();
          }
        );
      });
    $$("[data-spec]").forEach((b) => (b.onclick = () => openSpecDetail(MOCK.specialities.find((x) => x.code === b.dataset.spec))));
    $$("[data-uni]").forEach((b) => (b.onclick = () => openUniDetail(MOCK.universities.find((u) => u.code === b.dataset.uni))));
    $("#setGoal") && ($("#setGoal").onclick = openGoalSheet);
    $$("[data-an]").forEach((b) => {
      b.onclick = () => {
        if (b.dataset.an === "courses") {
          openCourseLevels();
        } else if (b.dataset.an === "tests") {
          openTestsBySubject();
        } else {
          pushScreen(
            "Пробные тесты",
            () => `<div class="list-pad" style="padding-top:16px">
              <div class="news-card"><div class="n-title">Пробный ЕНТ</div><div class="n-body">86 баллов · 20 сентября</div></div>
              <div class="news-card"><div class="n-title">Пробный ЕНТ</div><div class="n-body">79 баллов · 6 сентября</div></div>
            </div>`,
            null,
            { screenCls: "an-screen", centered: true }
          );
        }
      };
    });
    $$("[data-trainer]").forEach((btn) => {
      btn.onclick = () => openTrainerSubject(MOCK.trainerSubjects.find((x) => x.id === Number(btn.dataset.trainer)));
    });
    $("#entToggle") &&
      ($("#entToggle").onclick = (e) => {
        if (e.target.id === "entClear") {
          state.entSel = [];
        } else {
          state.entOpen = !state.entOpen;
        }
        paintStack();
      });
    $$("[data-elective]").forEach((btn) => {
      btn.onclick = () => {
        const id = btn.dataset.elective;
        const sel = state.entSel;
        if (sel.includes(id)) state.entSel = sel.filter((x) => x !== id);
        else if (sel.length >= 2) {
          toast("Можно выбрать только два предмета", "err");
          return;
        } else state.entSel = [...sel, id];
        paintStack();
      };
    });
    $("#entSave") &&
      ($("#entSave").onclick = () => {
        if (state.entSel.length !== 2) {
          toast("Выберите ровно два предмета", "err");
          return;
        }
        MOCK.entPicker.selected = [...state.entSel];
        state.entOpen = false;
        paintStack();
        toast("Комбинация сохранена");
      });
    $("#startEnt") && ($("#startEnt").onclick = openEntStartSheet);
  }

  function openService(id, title) {
    state.svc = { id, tab: id === "professions" ? "spec" : "ent" };
    state.entSel = [...MOCK.entPicker.selected];
    state.entOpen = true;
    state.navStack = [
      {
        title,
        build: pageHtml,
        after: bindService,
        screenCls: id === "analytics" ? "an-screen" : "",
        centered: id === "analytics",
        footer: () =>
          id === "tests" && state.svc.tab === "ent" && state.entOpen
            ? `<div class="sticky-foot"><button type="button" class="save-btn" id="entSave">Сохранить</button></div>`
            : "",
      },
    ];
    paintStack();
  }

  function aiAnswerHtml() {
    const f = (x) => `<span class="ai-math">${x}</span>`;
    const frac = (a, b) => `<span class="ai-frac"><span>${a}</span><span>${b}</span></span>`;
    return `### 4. Арифметикалық прогрессия (Қысқаша конспект)
* **Анықтама:** Әрбір мүшесі алдыңғы мүшесіне бірдей тұрақты санды ( ${f("d")} ) қосқанда шығатын сан тізбегі.
* **Формулалар:**
&nbsp;&nbsp;* Айырмасы: ${f("d = a<sub>n+1</sub> − a<sub>n</sub>")}
&nbsp;&nbsp;* ${f("n")} -ші мүшесі: ${f("a<sub>n</sub> = a<sub>1</sub> + (n − 1)d")}
&nbsp;&nbsp;* Алғашқы ${f("n")} мүшесінің қосындысы:
${f(`S<sub>n</sub> = ${frac("a<sub>1</sub> + a<sub>n</sub>", "2")} · n`)}

---

### 5. Есім хан (Қысқаша конспект)
* **Кім:** Қазақ хандығының көрнекті хандарының бірі (XVI ғасырдың соңы — XVII ғасырдың басы), Шығай ханның ұлы.
* **Саясаты:**
&nbsp;&nbsp;* Орталық билікті нығайтуға күш салды.
&nbsp;&nbsp;* Тұрсын ханның бүлігін басып, хандықтың тұтастығын сақтап қалды.
&nbsp;&nbsp;* «Есім ханның ескі жолы» атты заңдар жинағын қабылдады.

Админ, осы тақырыптардың қайсысын тереңірек тарқатайық? Жалғастырамыз ба?`;
  }

  function openAiScreen() {
    const el = $("#screenOverlay");
    el.hidden = false;
    el.classList.add("ai-screen");
    const chips = [
      ["auto_stories", "Объяснение"],
      ["fact_check", "Тест"],
      ["article", "Конспект"],
      ["workspace_premium", "Карточки"],
    ];
    el.innerHTML = `
      <div class="ai-bar">
        <button type="button" class="ai-round" id="aiBack">${icon("arrow_back")}</button>
        <div class="ai-title">AI for you</div>
        <button type="button" class="ai-round" id="aiMore">${icon("more_vert")}</button>
      </div>
      <div class="ai-feed" id="aiFeed">
        <div class="ai-msg">${aiAnswerHtml()}</div>
        <button type="button" class="ai-copy" title="Копировать">${icon("content_copy", "material-icons-outlined")}</button>
      </div>
      <div class="ai-chips">${chips
        .map(([ic, l]) => `<button type="button" class="ai-chip" data-aichip="${l}">${icon(ic, "material-icons-outlined")}${l}</button>`)
        .join("")}</div>
      <form class="ai-input" id="aiForm">
        <button type="button" class="ai-plus">${icon("add")}</button>
        <input id="aiText" placeholder="Спросите что угодно" autocomplete="off" />
        <button type="submit" class="ai-send" id="aiSend">${icon("arrow_upward")}</button>
      </form>`;
    const feed = $("#aiFeed");
    feed.scrollTop = feed.scrollHeight;
    const input = $("#aiText");
    const sync = () => $("#aiSend").classList.toggle("on", !!input.value.trim());
    input.oninput = sync;
    $("#aiBack").onclick = () => {
      el.classList.remove("ai-screen");
      closeScreen();
    };
    $("#aiMore").onclick = () => toast("Новый чат", "ok");
    $$(".ai-copy", el).forEach((b) => (b.onclick = () => toast("Скопировано")));
    $$("[data-aichip]").forEach((b) => {
      b.onclick = () => {
        input.value = `${b.dataset.aichip}: `;
        input.focus();
        sync();
      };
    });
    $("#aiForm").onsubmit = (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      input.value = "";
      sync();
      feed.insertAdjacentHTML("beforeend", `<div class="ai-user">${text.replace(/</g, "&lt;")}</div>`);
      feed.scrollTop = feed.scrollHeight;
      setTimeout(() => {
        feed.insertAdjacentHTML(
          "beforeend",
          `<div class="ai-msg">Жақсы сұрақ! Осы тақырып бойынша қысқаша түсіндірме дайындап жатырмын…</div><button type="button" class="ai-copy">${icon("content_copy", "material-icons-outlined")}</button>`
        );
        $$(".ai-copy", el).forEach((b) => (b.onclick = () => toast("Скопировано")));
        feed.scrollTop = feed.scrollHeight;
      }, 600);
    };
  }

  function openCenterAction() {
    openAiScreen();
  }

  function igSvg() {
    return `<span class="menu-brand"><svg viewBox="0 0 24 24" fill="#E1306C"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm6.5-.9a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"/></svg></span>`;
  }
  function waSvg() {
    return `<span class="menu-brand"><svg viewBox="0 0 24 24" fill="#25D366"><path d="M12 2a10 10 0 0 0-8.7 14.9L2 22l5.3-1.4A10 10 0 1 0 12 2zm0 2a8 8 0 0 1 6.7 12.3l-.3.5.5 1.9-2-.5-.5.3A8 8 0 1 1 12 4zm4.4 9.6c-.2-.1-1.3-.6-1.5-.7-.2-.1-.4-.1-.5.1l-.7.8c-.1.1-.3.2-.5.1-.2-.1-.9-.3-1.7-1.1-.6-.6-1.1-1.3-1.2-1.5-.1-.2 0-.4.1-.5l.4-.5c.1-.1.1-.3.1-.4 0-.1 0-.3-.1-.4l-.7-1.7c-.2-.4-.4-.4-.5-.4h-.4c-.1 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.3c.1.2 1.6 2.5 3.9 3.4 2.3.9 2.3.6 2.7.6.4 0 1.3-.5 1.5-1 .2-.5.2-.9.1-1 0-.1-.2-.2-.4-.3z"/></svg></span>`;
  }

  function menuRow({ iconName, iconClass = "material-icons-outlined", leading, title, accent, action, trailing }) {
    const ico = leading || `<span class="menu-ico ${iconClass}">${iconName}</span>`;
    const chev = trailing || `<span class="menu-chevron material-icons-round">chevron_right</span>`;
    return `
      <button type="button" class="menu-row ${accent ? "accent" : ""}" ${action ? `data-profile-action="${action}"` : ""} ${accent ? `style="--menu-accent:${accent}"` : ""}>
        ${ico}
        <span class="menu-title">${title}</span>
        ${chev}
      </button>`;
  }

  const PROFILE_T = {
    ru: { about: "О компании I4U", terms: "Условия и положения", privacy: "Политика конфиденциальности", help: "Помощь и поддержка", restore: "Восстановить покупки", dark: "Тёмная тема", lang: "Язык", ig: "Наш Instagram", wa: "Написать в WhatsApp", admin: "Админ-панель", back: "Вернуться в приложение" },
    kk: { about: "I4U компаниясы туралы", terms: "Шарттар мен ережелер", privacy: "Құпиялылық саясаты", help: "Көмек және қолдау", restore: "Сатып алуларды қалпына келтіру", dark: "Қараңғы тема", lang: "Тіл", ig: "Біздің Instagram", wa: "WhatsApp-қа жазу", admin: "Админ-панель", back: "Қосымшаға оралу" },
  };

  function openUserProfile() {
    const me = MOCK.me;
    const L = PROFILE_T[state.lang] || PROFILE_T.ru;
    const inStaff = state.mode === "staff";
    const accent = inStaff ? "#5B6EC2" : "#25AB7C";
    const staffToggle = me.canStaff
      ? `
      <div class="menu-block">
        ${menuRow({
          iconName: inStaff ? "school" : "admin_panel_settings",
          title: inStaff ? L.back : L.admin,
          accent,
          action: "toggleStaff",
        })}
      </div>`
      : "";

    const el = $("#screenOverlay");
    el.hidden = false;
    el.className = "screen-overlay";
    el.innerHTML = `
      <div class="appbar">
        <button type="button" class="appbar-back" id="profileBack">${icon("arrow_back")}</button>
        <div class="appbar-title" style="flex:1">Профиль</div>
        <button type="button" class="appbar-icon-btn" id="profileLogout" title="Выйти">${icon("logout", "material-icons-outlined")}</button>
      </div>
      <div class="content user-profile">
        <div class="user-card">
          <button type="button" class="user-card-edit" id="profileEdit">${icon("edit", "material-icons-outlined")}</button>
          <div class="user-card-body">
            ${
              inStaff
                ? `<div class="user-avatar" style="background:${me.color}">${me.initials}</div>`
                : `<div class="user-avatar ph">${icon("person")}</div>`
            }
            <div class="user-name">${me.firstName} ${me.lastName}</div>
          </div>
        </div>
        <div class="menu-block">
          ${menuRow({ iconName: "info", title: L.about, action: "about" })}
          <div class="menu-divider"></div>
          ${menuRow({ iconName: "description", title: L.terms, action: "terms" })}
          <div class="menu-divider"></div>
          ${menuRow({ iconName: "security", title: L.privacy, action: "privacy" })}
        </div>
        <div class="menu-block">
          ${menuRow({ iconName: "headset_mic", title: L.help, action: "help" })}
          <div class="menu-divider"></div>
          ${menuRow({ iconName: "restore", iconClass: "material-icons-round", title: L.restore, action: "restore" })}
          <div class="menu-divider"></div>
          <div class="menu-row switch-row">
            <span class="menu-ico material-icons-outlined">dark_mode</span>
            <span class="menu-title">${L.dark}</span>
            <button type="button" class="toggle ${state.darkTheme ? "on" : ""}" id="themeToggle" aria-label="Тёмная тема"></button>
          </div>
          <div class="menu-divider"></div>
          <div class="menu-row switch-row">
            <span class="menu-ico material-icons-round">language</span>
            <span class="menu-title">${L.lang}</span>
            <div class="lang-switch">
              <button type="button" class="lang-chip ${state.lang === "ru" ? "active" : ""}" data-lang="ru">РУС</button>
              <button type="button" class="lang-chip ${state.lang === "kk" ? "active" : ""}" data-lang="kk">ҚАЗ</button>
            </div>
          </div>
        </div>
        <div class="menu-block">
          ${menuRow({ leading: igSvg(), title: L.ig, action: "instagram" })}
          <div class="menu-divider"></div>
          ${menuRow({ leading: waSvg(), title: L.wa, action: "whatsapp" })}
        </div>
        ${staffToggle}
      </div>`;

    $("#profileBack").onclick = closeScreen;
    $("#profileLogout").onclick = async () => {
      const ok = await confirmDialog({
        title: "Выход",
        message: "Вы уверены, что хотите выйти",
        confirmLabel: "Выйти",
        danger: true,
      });
      if (ok) {
        closeScreen();
        toast("Вы вышли", "ok");
      }
    };
    $("#profileEdit").onclick = () => toast("Редактировать профиль", "ok");
    $("#themeToggle").onclick = () => {
      state.darkTheme = !state.darkTheme;
      $("#themeToggle").classList.toggle("on", state.darkTheme);
      toast(state.darkTheme ? "Тёмная тема" : "Светлая тема", "ok");
    };
    $$("[data-lang]", el).forEach((btn) => {
      btn.onclick = () => {
        state.lang = btn.dataset.lang;
        openUserProfile();
        toast(state.lang === "kk" ? "Қазақша" : "Русский", "ok");
      };
    });
    $$("[data-profile-action]", el).forEach((btn) => {
      btn.onclick = () => {
        const a = btn.dataset.profileAction;
        if (a === "toggleStaff") {
          closeScreen();
          if (inStaff) setMode("student", { toastMsg: "Режим студента" });
          else setMode("staff", { toastMsg: "Админ-панель" });
          return;
        }
        if (a === "restore") {
          openSheet(`
            <div class="sheet-handle"></div>
            <div class="sheet-title">Восстановление покупок</div>
            <div class="sheet-sub">Для восстановления ваших покупок курсов нажмите кнопку «Восстановить»</div>
            <div class="sheet-actions">
              <button type="button" class="btn btn-primary" id="restoreOk" style="width:100%">Восстановить</button>
            </div>`);
          $("#restoreOk").onclick = () => {
            closeSheet();
            toast("Покупки восстановлены", "ok");
          };
          return;
        }
        const labels = {
          about: "О компании I4U",
          terms: "Условия и положения",
          privacy: "Политика конфиденциальности",
          help: "Помощь и поддержка",
          instagram: "Instagram @i4u.kz",
          whatsapp: "WhatsApp",
        };
        toast(labels[a] || a, "ok");
      };
    });
  }

  /* —— Menus —— */
  function groupMenu(group, anchor) {
    showActionMenu(anchor, [
      {
        label: "Редактировать",
        icon: "edit",
        onTap: () => openGroupForm(group),
      },
      {
        label: "Удалить",
        icon: "delete",
        danger: true,
        onTap: async () => {
          const ok = await confirmDialog({
            title: "Удалить группу?",
            message: `Группа «${group.name}» будет удалена без возможности восстановления.`,
            confirmLabel: "Удалить",
            danger: true,
          });
          if (!ok) return;
          MOCK.groups = MOCK.groups.filter((g) => g.id !== group.id);
          if (state.expandedGroupId === group.id) state.expandedGroupId = null;
          toast("Группа удалена", "ok");
          render();
        },
      },
    ]);
  }

  function enrollmentMenu(item, anchor) {
    const frozen = item.status === "freeze";
    showActionMenu(anchor, [
      {
        label: "Редактировать",
        icon: "edit",
        onTap: () => openEnrollmentForm(item),
      },
      {
        label: frozen ? "Разморозить" : "Заморозить",
        icon: frozen ? "play_arrow" : "ac_unit",
        onTap: async () => {
          const ok = await confirmDialog({
            title: frozen ? "Разморозить зачисление?" : "Заморозить зачисление?",
            message: frozen
              ? "Зачисление будет разморожено и переведено в активный статус."
              : "Зачисление будет переведено в статус «Ожидает».",
            confirmLabel: frozen ? "Разморозить" : "Заморозить",
          });
          if (!ok) return;
          if (frozen) {
            item.status = "active";
            item.statusLabel = "Активен";
          } else {
            item.status = "freeze";
            item.statusLabel = "Заморозка";
          }
          toast(frozen ? "Разморожено" : "Заморожено", "ok");
          render();
        },
      },
      {
        label: "Удалить",
        icon: "delete",
        danger: true,
        onTap: async () => {
          const ok = await confirmDialog({
            title: "Удалить зачисление?",
            message: `Зачисление «${item.student}» будет удалено.`,
            confirmLabel: "Удалить",
            danger: true,
          });
          if (!ok) return;
          MOCK.enrollments = MOCK.enrollments.filter((e) => e.id !== item.id);
          toast("Удалено", "ok");
          render();
        },
      },
    ]);
  }

  function studentMenu(item, anchor) {
    showActionMenu(anchor, [
      {
        label: item.blocked ? "Разблокировать" : "Заблокировать",
        icon: item.blocked ? "lock_open" : "block",
        onTap: async () => {
          const ok = await confirmDialog({
            title: item.blocked ? "Разблокировать студента?" : "Заблокировать студента?",
            message: item.blocked
              ? `Студент «${item.name}» снова сможет войти в приложение.`
              : `Студент «${item.name}» не сможет войти в приложение.`,
            confirmLabel: item.blocked ? "Разблокировать" : "Заблокировать",
            danger: !item.blocked,
          });
          if (!ok) return;
          item.blocked = !item.blocked;
          toast(item.blocked ? "Заблокирован" : "Разблокирован", "ok");
          render();
        },
      },
      {
        label: "Удалить",
        icon: "delete",
        danger: true,
        onTap: async () => {
          const ok = await confirmDialog({
            title: "Удалить студента?",
            message: `Студент «${item.name}» будет удалён.`,
            confirmLabel: "Удалить",
            danger: true,
          });
          if (!ok) return;
          MOCK.students = MOCK.students.filter((s) => s.id !== item.id);
          toast("Удалён", "ok");
          render();
        },
      },
    ]);
  }

  /* —— Staff: студент профилі және курс прогресі —— */
  const STAFF_POSTERS = {
    10: { lines: ["ДҮНИЕЖҮЗІ", "ТАРИХЫ"], bg: "linear-gradient(135deg,#3f8a78,#2e6e5f)", img: "assets/v2/history_world.png", title: "Дүниежүзі Тарихы" },
    11: { lines: ["МАТЕМАТИКА"], bg: "linear-gradient(135deg,#4f86d0,#3567b0)", img: "assets/v2/math.png", title: "Математика" },
    12: { lines: ["ҚҰҚЫҚ"], bg: "linear-gradient(135deg,#8a5a3a,#6a4128)", img: "assets/v2/law.png", title: "Құқық негіздері" },
    13: { lines: ["ҚАЗАҚСТАН", "ТАРИХЫ"], bg: "linear-gradient(135deg,#2f8a7d,#226b61)", img: "assets/v2/history_kz.png", title: "Қазақстан тарихы" },
    14: { lines: ["ХИМИЯ"], bg: "linear-gradient(135deg,#9a3fb4,#73288a)", img: "assets/v2/chemistry.png", title: "Химия" },
    15: { lines: ["БИОЛОГИЯ"], bg: "linear-gradient(135deg,#46a14f,#2f7d3a)", img: "assets/v2/bio.png", title: "Биология" },
    16: { lines: ["АҒЫЛШЫН", "ТІЛІ"], bg: "linear-gradient(135deg,#7b2fc0,#5a1f9a)", img: "assets/v2/eng_uk.png", title: "Ағылшын тілі" },
  };
  /** Курс бөлімдері (staff көрінісі). ДЖТ — скриншоттағыдай */
  const STAFF_SECTIONS = {
    10: [
      ["Ерте орта ғасырлар және Ислам әлемі", ["Ерте орта ғасырлар", "Араб халифаты"]],
      ["Феодалдық соғыстар және Абсолютизмге өту", ["Жүзжылдық соғыс", "Англия мен Ресейдегі абсолютизм"]],
      ["Ұлы географиялық ашулар, Реформация және Ағартушылық", ["Ұлы географиялық ашулар", "Реформация", "Ағартушылық"]],
      ["Француз революциясы және XIX ғ. империялар", ["Француз революциясы", "Наполеон империясы"]],
      ["XIX ғасырдағы дағдарыстар, соғыстар мен реформалар", ["Қырым соғысы", "Ресейдегі 1861 жылғы реформа"]],
      ["XIX ҒАСЫРДАҒЫ РЕВОЛЮЦИЯЛАР МЕН ИМПЕРИАЛИЗМ", ["1848 жылғы революциялар", "Германияның бірігуі"]],
      [
        "XIX–XX ғ. саяси өзгерістер және революциялар",
        ["ЖАПОНИЯНЫҢ АШЫЛУЫ", "Жаңа Заман ұғымы", "Капиталистік қатынастар арасындағы қайшылықтар", "w:Апталық сынақ (11 - апта)", "РЕСЕЙДЕГІ АҚПАН РЕВОЛЮЦИЯСЫ, КСРО-НЫҢ ҚҰРЫЛУЫ", "Осман империясында Сұлтандық биліктің жойылуы", "Қытайдағы Синьхай революциясы", "Гоминьдан партиясы, ҚКП және азамат соғысы"],
      ],
      ["Бірінші дүниежүзілік соғыстан кейінгі әлем", ["Версаль-Вашингтон жүйесі", "Ұлы депрессия"]],
      ["II Дүниежүзілік соғыс және Мәдени бағыттар", ["Екінші дүниежүзілік соғыс", "XX ғасыр мәдениеті"]],
      ["Қырғи қабақ соғыс", ["Қырғи қабақ соғыстың басталуы", "Кариб дағдарысы"]],
    ],
    11: [["Теңдеулер", ["Сызықтық теңдеулер", "Квадрат теңдеулер"]], ["Теңсіздіктер", ["Интервалдар әдісі", "w:Апталық сынақ (5 - апта)"]], ["Функция", ["Функция. Анықтамасы", "Гипербола. Кубтық парабола"]], ["Логарифм", ["Логарифм анықтамасы"]]],
    12: [["Мемлекет және құқық", ["Мемлекет нысандары", "Құқық көздері"]], ["Конституциялық құқық", ["ҚР Конституциясы", "w:Апталық сынақ (4 - апта)"]], ["Азаматтық құқық", ["Меншік құқығы"]]],
    13: [["Ежелгі Қазақстан", ["Тас ғасыры", "Сақтар"]], ["Орта ғасырлар", ["Түрік қағанаты", "Қарахандар", "w:Апталық сынақ (6 - апта)"]], ["Қазақ хандығы", ["Қазақ хандығының құрылуы", "Есім хан"]], ["Алаш қозғалысы", ["Алаш партиясы"]]],
    14: [["Атом құрылысы", ["Атом құрылысы", "Изотоптар"]], ["Химиялық байланыс", ["Ковалентті байланыс", "w:Апталық сынақ (3 - апта)"]], ["Органикалық химия", ["Алкандар"]]],
    15: [["Микробиология", ["Вирустар", "Бактериялар"]], ["Жасушалық биология", ["Жасуша құрылысы", "Митоз", "w:Апталық сынақ (4 - апта)"]], ["Ботаника", ["Фотосинтез"]]],
    16: [["Nouns, Pronouns & Basic Tenses", ["Noun", "Adjective", "Present Simple"]], ["Tenses System", ["Present Perfect", "w:Апталық сынақ (4 - апта)"]], ["Modals", ["Modal Verbs"]]],
  };
  const staffProgress = {};
  function staffCourseFor(student, group) {
    if (staffProgress[student.id]) return staffProgress[student.id];
    const cid = STAFF_SECTIONS[group?.courseId] ? group.courseId : 10;
    const flat = [];
    STAFF_SECTIONS[cid].forEach(([title, topics], si) =>
      topics.forEach((t) => {
        if (t.startsWith("w:")) flat.push({ si, kind: "weekly", title: t.slice(2) });
        else {
          flat.push({ si, kind: "video", title: t });
          flat.push({ si, kind: "test", title: t });
        }
      })
    );
    const [done, total] = String(student.progress || "0/1").split("/").map(Number);
    // ДЖТ: «Гоминьдан…» тесті — қазір өтетін сабақ (скриншоттағыдай)
    let cur = cid === 10 ? flat.findIndex((x) => x.kind === "test" && x.title.startsWith("Гоминьдан")) : Math.round((done / total) * flat.length);
    cur = Math.max(0, Math.min(flat.length - 1, cur));
    const start = new Date(2026, 8, 28, 18, 5);
    const h = (n) => (n * 2654435761) % 1000;
    // Күндер: ағымдағы сабақтан артқа қарай, әр сабақ арасы 9–38 сағат
    const when = [];
    for (let i = cur - 1, t = start.getTime(); i >= 0; i--) {
      t -= (9 + (h(i + student.id) % 30)) * 3600 * 1000;
      when[i] = new Date(t);
    }
    flat.forEach((x, i) => {
      x.state = i < cur ? "done" : i === cur ? "current" : "locked";
      if (x.state !== "done") return;
      const back = cur - i;
      const d = when[i];
      x.date = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
      if (x.kind === "test") x.result = 40 + (h(i * 7 + student.id) % 13) * 5;
      if (x.kind === "weekly") x.result = 60 + (h(i * 3 + student.id) % 9) * 5;
      if (x.kind === "video") x.note = back <= 9 && back % 2 === 1 && h(i + student.id) % 3 !== 0 ? "pending" : h(i * 5 + student.id) % 3 === 0 ? "none" : "ok";
    });
    if (cid === 10) {
      const fix = { "ЖАПОНИЯНЫҢ АШЫЛУЫ": ["none", 50], "Жаңа Заман ұғымы": ["ok", 55], "Капиталистік қатынастар арасындағы қайшылықтар": ["pending", 55], "РЕСЕЙДЕГІ АҚПАН РЕВОЛЮЦИЯСЫ, КСРО-НЫҢ ҚҰРЫЛУЫ": ["pending", 80], "Осман империясында Сұлтандық биліктің жойылуы": ["pending", 80], "Қытайдағы Синьхай революциясы": ["pending", 70], "Гоминьдан партиясы, ҚКП және азамат соғысы": ["pending", null] };
      const dates = ["21.09.2026 22:11", "21.09.2026 22:43", "23.09.2026 20:05", "23.09.2026 20:49", "23.09.2026 22:07", "24.09.2026 01:09", "27.09.2026 09:44", "28.09.2026 15:18", "28.09.2026 17:11", "28.09.2026 17:25", "28.09.2026 18:05", "29.09.2026 19:40", "29.09.2026 20:22", "01.10.2026 21:15"];
      const sec = flat.filter((x) => x.si === 6);
      sec.forEach((x, k) => {
        if (dates[k] && x.state === "done") x.date = dates[k];
        const f = fix[x.title];
        if (!f || x.state !== "done") return;
        if (x.kind === "video") x.note = f[0];
        if (x.kind === "test" && f[1] != null) x.result = f[1];
      });
      const wk = sec.find((x) => x.kind === "weekly");
      if (wk) wk.result = 90;
    }
    const data = { cid, flat, cur, done, total, poster: STAFF_POSTERS[cid], sections: STAFF_SECTIONS[cid].map(([t]) => t) };
    staffProgress[student.id] = data;
    return data;
  }
  const pendingCount = (data, si = null) => data.flat.filter((x) => x.note === "pending" && (si == null || x.si === si)).length;

  /** Студент id бойынша тұрақты UUID (8-4-4-4-12) */
  function fakeUuid(seed) {
    let x = (seed * 2654435761) | 0 || 1;
    let hex = "";
    while (hex.length < 32) {
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      hex += (x >>> 0).toString(16).toUpperCase().padStart(8, "0");
    }
    return [8, 4, 4, 4, 12].reduce((acc, n, i, arr) => {
      const from = arr.slice(0, i).reduce((t, k) => t + k, 0);
      return [...acc, hex.slice(from, from + n)];
    }, []).join("-");
  }

  function studentExtra(s) {
    if (!s.extra) {
      const n = s.id * 7919;
      s.extra = {
        parentName: "—",
        parentPhone: `+7 7${70 + (n % 9)} ${100 + (n % 900)} ${10 + (n % 89)} ${10 + ((n >> 3) % 89)}`,
        city: "—",
        grade: "11 класс",
        uuid: fakeUuid(s.id),
      };
    }
    return s.extra;
  }

  function openStaffStudent(s, group) {
    const data = staffCourseFor(s, group);
    const ex = studentExtra(s);
    const curItem = data.flat[data.cur];
    const build = () => {
      const pend = pendingCount(data);
      return `
        <div class="sp-head">
          <div class="sp-avatar" style="background:${s.color}">${s.initials}</div>
          <div class="sp-name">${s.name.toUpperCase()}</div>
          <div class="sp-seen">${s.lastSeen || ""}</div>
          <button type="button" class="lvl-btn" id="spLevel">${levelBadge(data.done, data.total)}${icon("expand_more")}</button>
        </div>
        <div class="sp-actions">
          <button type="button" class="sp-act" id="spCall">${icon("call", "material-icons-outlined")}<span>Звонок</span></button>
          <button type="button" class="sp-act" id="spWa">${waSvg()}<span>Написать</span></button>
          <button type="button" class="sp-act" id="spReport">${icon("check_circle_outline", "material-icons-outlined")}<span>Отчёт</span></button>
          <button type="button" class="sp-act" id="spEdit">${icon("edit", "material-icons-outlined")}<span>Изменить</span></button>
        </div>
        <div class="sp-info">
          <div class="sp-f"><span>Номер ученика</span><a href="tel:${s.phone.replace(/\s/g, "")}" class="green">${s.phone}</a></div>
          <div class="sp-f"><span>ФИО родителя</span><b>${ex.parentName}</b></div>
          <div class="sp-f"><span>Номер родителя</span><b>${ex.parentPhone}</b></div>
          <div class="sp-f"><span>Город</span><b>${ex.city}</b></div>
          <div class="sp-f"><span>Класс</span><b>${ex.grade}</b></div>
          <div class="sp-f"><span>UUID</span><b class="mono">${ex.uuid}</b></div>
        </div>
        <button type="button" class="sp-course" id="spCourse">
          ${pend ? `<span class="sp-badge">${pend}</span>` : ""}
          <div class="sp-poster">${posterHtml(data.poster)}</div>
          <div class="sp-cbody">
            <div class="sp-ctitle">${data.poster.title}</div>
            <div class="sp-cmeta">Пройдено ${data.done} из ${data.total}</div>
            <div class="sp-cur">${kindIcon(curItem.kind)}<span>${curItem.title}</span></div>
          </div>
        </button>`;
    };
    pushScreen(
      "Профиль",
      build,
      () => {
        $("#spCourse").onclick = () => openStaffCourse(s, data);
        $("#spLevel").onclick = () => openLevelRoad(data.done, data.total, data.poster.title);
        $("#spCall").onclick = (e) => openContactMenu(e.currentTarget, s, "call");
        $("#spWa").onclick = (e) => openContactMenu(e.currentTarget, s, "wa");
        $("#spHistory").onclick = () => openLoginHistory(s);
        $("#spReport").onclick = () => openStudentReport(s, data);
        $("#spEdit").onclick = () => openStudentEdit(s);
      },
      { screenCls: "sp-screen", right: `<button type="button" class="sp-hist" id="spHistory">История входа</button>` }
    );
  }

  /* —— Уровни: курстың әр 10%-ы — бір деңгей —— */
  const LEVELS = [
    { name: "Bronze", emoji: "🥉", color: "#CD7F32" },
    { name: "Silver", emoji: "🥈", color: "#B8C2CC" },
    { name: "Gold", emoji: "🥇", color: "#F2C230" },
    { name: "Platinum", emoji: "💎", color: "#7FD3E8" },
    { name: "Diamond", emoji: "💠", color: "#4F9BFF" },
    { name: "Heroic", emoji: "🦅", color: "#B07CFF" },
    { name: "Master", emoji: "👑", color: "#FFB547" },
    { name: "Grandmaster", emoji: "🔥", color: "#FF6A3D" },
    { name: "Elite Master", emoji: "⭐", color: "#FFD84D" },
    { name: "Grandmaster Elite", emoji: "🏆", color: "#FFE27A" },
  ];
  /** done / total → { i (0..9), level, next, toNext (сабақ), pct ішіндегі прогресс } */
  function levelOf(done, total) {
    const step = total / 10;
    const i = Math.min(9, Math.floor(done / step));
    const nextAt = Math.floor(step * (i + 1)) + 1; // 12,8 → 13-сабақта келесі деңгей
    return {
      i,
      level: LEVELS[i],
      next: i < 9 ? LEVELS[i + 1] : null,
      toNext: i < 9 ? Math.max(1, nextAt - done) : 0,
      pct: i < 9 ? Math.min(100, ((done - step * i) / step) * 100) : 100,
    };
  }
  /** Деңгей жолы: өтілгені ашық, қазіргісі белгіленген, қалғаны құлыпта */
  function levelRoadHtml(done, total) {
    const L = levelOf(done, total);
    const startOf = (k) => (k === 0 ? 0 : Math.floor((total / 10) * k) + 1);
    return `
      <div class="road">
        ${LEVELS.map((lv, k) => {
          const st = k < L.i ? "done" : k === L.i ? "cur" : "locked";
          const need = Math.max(0, startOf(k) - done);
          const sub =
            st === "done"
              ? `Пройден · с ${startOf(k)} урока`
              : st === "cur"
                ? L.next
                  ? `Текущий уровень · до ${L.next.name} ещё ${L.toNext} ${plural(L.toNext, "урок", "урока", "уроков")}`
                  : "Максимальный уровень"
                : `Откроется с ${startOf(k)} урока · ещё ${need} ${plural(need, "урок", "урока", "уроков")}`;
          return `
          <div class="road-step ${st}" style="--lc:${lv.color}">
            <div class="road-rail"><span class="road-dot">${st === "locked" ? icon("lock", "material-icons-round") : lv.emoji}</span></div>
            <div class="road-body">
              <div class="road-name"><span>${k + 1}.</span> ${lv.name}</div>
              <div class="road-sub">${sub}</div>
              ${st === "cur" && L.next ? `<div class="road-bar"><i style="width:${L.pct}%"></i></div>` : ""}
            </div>
          </div>`;
        })
          .reverse()
          .join("")}
      </div>`;
  }
  function openLevelRoad(done, total, title) {
    const L = levelOf(done, total);
    openSheet(
      `
      <div class="sheet-handle"></div>
      <div class="road-head" style="--lc:${L.level.color}">
        <span class="lvl-emoji">${L.level.emoji}</span>
        <div><div class="sheet-title">${L.level.name} · уровень ${L.i + 1} из 10</div><div class="sheet-sub">${title ? `${title} · ` : ""}пройдено ${done} из ${total} уроков</div></div>
      </div>
      <div class="road-scroll">${levelRoadHtml(done, total)}</div>`,
      { tall: true }
    );
    $(".road-step.cur")?.scrollIntoView({ block: "center" });
  }

  /* —— Студент: тесттер пәндер бойынша —— */
  /** Пәннің сабақ тесттері: өтілгендері нәтижемен (тұрақты жалған балдар) */
  function courseTests(c) {
    const cc = MOCK.courseContent[c.id];
    let items;
    if (cc) {
      items = courseItems(cc)
        .filter((x) => x.kind !== "video")
        .map((x) => ({ title: x.title, kind: x.kind, done: x.state === "done", section: cc.sections[x.si].title }));
    } else {
      const n = Math.round(c.total / 2);
      items = Array.from({ length: n }, (_, i) => ({ title: `Тест ${i + 1}`, kind: "test", done: i < Math.floor(c.done / 2), section: "" }));
    }
    items.forEach((x, i) => {
      if (x.done) x.score = Math.round((55 + rnd(c.id, i, 3) * 45) / 5) * 5;
    });
    return items;
  }
  function testsSummary() {
    const all = MOCK.myCourses.flatMap((c) => courseTests(c));
    const done = all.filter((x) => x.done);
    return { done: done.length, total: all.length, avg: done.length ? Math.round(done.reduce((t, x) => t + x.score, 0) / done.length) : 0 };
  }
  function openTestsBySubject() {
    pushScreen(
      "Тесты по предметам",
      () => `<div class="list-pad cl-list">${MOCK.myCourses
        .map((c) => {
          const items = courseTests(c);
          const done = items.filter((x) => x.done);
          const avg = done.length ? Math.round(done.reduce((t, x) => t + x.score, 0) / done.length) : null;
          const p = items.length ? Math.round((done.length / items.length) * 100) : 0;
          return `
          <button type="button" class="cl-row" data-tc="${c.id}" style="--lc:${avg == null ? "#6c6f84" : avg >= 80 ? "#5cb36d" : avg >= 60 ? "#e0a84a" : "#e06b5b"}">
            <div class="cl-poster">${posterHtml(c.poster, "sq")}</div>
            <div style="flex:1;min-width:0">
              <div class="cl-title">${c.title}</div>
              <div class="cl-lvl">${avg == null ? "Тестов пока нет" : `Средний результат ${avg}%`}</div>
              <div class="lvl-bar"><i style="width:${p}%;background:#6c7fd8"></i></div>
              <div class="cl-meta">Пройдено ${done.length} из ${items.length} тестов · ${p}%</div>
            </div>
            ${icon("chevron_right")}
          </button>`;
        })
        .join("")}</div>`,
      () => {
        $$("[data-tc]").forEach((b) => {
          b.onclick = () => {
            const c = MOCK.myCourses.find((x) => x.id === Number(b.dataset.tc));
            const items = courseTests(c).filter((x) => x.done);
            pushScreen(
              c.title,
              () =>
                items.length
                  ? `<div class="list-pad cl-list">${items
                      .reverse()
                      .map(
                        (x) => `
                  <div class="tl-row">
                    ${kindIcon(x.kind)}
                    <div style="flex:1;min-width:0"><div class="tl-title">${x.title}</div>${x.section ? `<div class="cl-meta">${x.section}</div>` : ""}</div>
                    <b class="${x.score >= 80 ? "up" : x.score >= 60 ? "mid" : "down"}">${x.score}%</b>
                  </div>`
                      )
                      .join("")}</div>`
                  : `<div class="empty">Тестов по этому предмету пока нет</div>`,
              null,
              { screenCls: "an-screen", centered: true }
            );
          };
        });
      },
      { screenCls: "an-screen", centered: true }
    );
  }

  function openCourseLevels() {
    pushScreen(
      "Мои курсы · уровни",
      () => `<div class="list-pad cl-list">${MOCK.myCourses
        .map((c) => {
          const L = levelOf(c.done, c.total);
          return `
          <button type="button" class="cl-row" data-cl="${c.id}" style="--lc:${L.level.color}">
            <div class="cl-poster">${posterHtml(c.poster, "sq")}</div>
            <div style="flex:1;min-width:0">
              <div class="cl-title">${c.title}</div>
              <div class="cl-lvl">${L.level.emoji} ${L.level.name} <span>· уровень ${L.i + 1}/10</span></div>
              <div class="lvl-bar"><i style="width:${L.pct}%"></i></div>
              <div class="cl-meta">${L.next ? `До ${L.next.name}: ещё ${L.toNext} ${plural(L.toNext, "урок", "урока", "уроков")}` : "Максимальный уровень"} · ${c.done}/${c.total}</div>
            </div>
            ${icon("chevron_right")}
          </button>`;
        })
        .join("")}</div>`,
      () => {
        $$("[data-cl]").forEach((b) => {
          b.onclick = () => {
            const c = MOCK.myCourses.find((x) => x.id === Number(b.dataset.cl));
            openLevelRoad(c.done, c.total, c.title);
          };
        });
      },
      { screenCls: "an-screen", centered: true }
    );
  }

  function levelBadge(done, total, small) {
    const L = levelOf(done, total);
    return `<span class="lvl-badge ${small ? "sm" : ""}" style="--lc:${L.level.color}">${L.level.emoji} ${L.level.name}</span>`;
  }
  function levelCardHtml(done, total, title) {
    const L = levelOf(done, total);
    return `
      <div class="lvl-card" style="--lc:${L.level.color}">
        <div class="lvl-top">
          <span class="lvl-emoji">${L.level.emoji}</span>
          <div style="flex:1;min-width:0">
            <div class="lvl-over">Уровень ${L.i + 1} из 10${title ? ` · ${title}` : ""}</div>
            <div class="lvl-name">${L.level.name}</div>
          </div>
        </div>
        <div class="lvl-bar"><i style="width:${L.pct}%"></i></div>
        <div class="lvl-meta">${
          L.next
            ? `До ${L.next.emoji} ${L.next.name}: ещё ${L.toNext} ${plural(L.toNext, "урок", "урока", "уроков")}`
            : "Максимальный уровень достигнут"
        }<span>${done} / ${total}</span></div>
        <div class="lvl-steps">${LEVELS.map((lv, k) => `<span class="${k < L.i ? "done" : k === L.i ? "cur" : ""}" title="${lv.name} · с ${Math.floor((total / 10) * k) + (k ? 1 : 0)} урока">${lv.emoji}</span>`).join("")}</div>
      </div>`;
  }

  /** «Звонок» / «Написать» → Ученику | Родителю */
  function openContactMenu(anchor, s, kind) {
    closeMenu();
    const { phone, rect } = phoneRects(anchor);
    const w = 190;
    const left = Math.max(12, Math.min(rect.left - phone.left + rect.width / 2 - w / 2, phone.width - w - 12));
    const top = rect.bottom - phone.top + 8;
    const layer = $("#menuLayer");
    layer.hidden = false;
    layer.innerHTML = `
      <div class="ct-menu" style="left:${left}px;top:${top}px;width:${w}px">
        <div class="ct-head">${kind === "call" ? icon("call", "material-icons-outlined") : waSvg()}<span>${kind === "call" ? "Позвонить" : "Написать"}</span></div>
        <button type="button" class="ct-row" data-ct="student">${icon("school")}<span>Ученику</span></button>
        <button type="button" class="ct-row" data-ct="parent">${icon("groups")}<span>Родителю</span></button>
      </div>`;
    layer.onclick = (e) => e.target === layer && closeMenu();
    $$("[data-ct]", layer).forEach((b) => {
      b.onclick = () => {
        closeMenu();
        const who = b.dataset.ct;
        const num = who === "student" ? s.phone : studentExtra(s).parentPhone;
        const digits = String(num).replace(/\D/g, "");
        if (digits.length < 10) {
          toast("Номер родителя не указан", "err");
          return;
        }
        const url = kind === "call" ? `tel:+${digits}` : `https://wa.me/${digits}`;
        toast(`${kind === "call" ? "Звонок" : "WhatsApp"}: ${who === "student" ? "ученику" : "родителю"} ${num}`);
        window.open(url, kind === "call" ? "_self" : "_blank", "noopener");
      };
    });
  }

  function openStaffCourse(s, data) {
    const open = {};
    const build = () => `
      <div class="list-pad course-secs staff-secs" style="--acc:#2e3a34">${data.sections
        .map((title, si) => {
          const rows = data.flat.map((x, i) => ({ ...x, i })).filter((x) => x.si === si);
          const dim = rows.every((x) => x.state === "locked");
          const pend = pendingCount(data, si);
          return `
          <div class="csec ${open[si] ? "open" : ""} ${dim ? "dim" : ""}">
            <button type="button" class="csec-head" data-ssec="${si}">
              <span>${title}</span>${pend ? `<i class="sp-badge in">${pend}</i>` : ""}${icon(open[si] ? "expand_less" : "expand_more")}
            </button>
            ${
              open[si]
                ? `<div class="csec-body">${rows
                    .map((x) => {
                      let right = "";
                      if (x.state === "locked") right = icon("lock", "material-icons-outlined lk");
                      else if (x.state === "current") right = `<span class="ln-act grey">Не пройдено</span>`;
                      else if (x.kind === "video")
                        right =
                          x.note === "pending"
                            ? `<span class="ln-act orange">Конспект ${icon("schedule", "material-icons-outlined")}</span>`
                            : x.note === "ok"
                              ? `<span class="ln-act white">Конспект ${icon("check_circle")}</span>`
                              : x.note === "back"
                                ? `<span class="ln-act red">На доработке</span>`
                                : `<span class="ln-act grey">Нет конспекта</span>`;
                      else right = `<span class="ln-act ${x.kind === "weekly" ? "purple" : "green"}">${x.result} из 100</span>`;
                      return `
              <button type="button" class="ln-row ${x.state} ${x.note === "pending" ? "pending" : ""}" data-sitem="${x.i}">
                ${kindIcon(x.kind)}
                <span class="ln-title">${x.title}${x.date ? `<small>${x.date}</small>` : ""}</span>
                ${right}
              </button>`;
                    })
                    .join("")}</div>`
                : ""
            }
          </div>`;
        })
        .join("")}</div>`;
    pushScreen(data.poster.title, build, () => {
      $$("[data-ssec]").forEach((b) => (b.onclick = () => ((open[b.dataset.ssec] = !open[b.dataset.ssec]), paintStack())));
      $$("[data-sitem]").forEach((b) => {
        b.onclick = () => {
          const x = data.flat[Number(b.dataset.sitem)];
          if (x.state === "locked") return toast("Студент ещё не открыл этот урок", "err");
          if (x.state === "current") return toast("Студент ещё не прошёл этот урок");
          if (x.kind === "video") {
            if (x.note === "none") return toast("Студент не прикрепил конспект");
            return openConspect(s, x);
          }
          toast(`${x.title}: ${x.result} из 100`);
        };
      });
    }, { right: "<span></span>" });
  }

  function openConspect(s, x) {
    openSheet(
      `
      <div class="sheet-handle"></div>
      <div class="sheet-title">Конспект</div>
      <div class="sheet-sub">${s.name} · ${x.title}<br>${x.date}</div>
      <div class="cs-page">
        <div class="cs-lines">${Array.from({ length: 9 }, (_, i) => `<i style="width:${55 + ((i * 37) % 40)}%"></i>`).join("")}</div>
        <span class="cs-file">${icon("image", "material-icons-outlined")}konspekt_${x.date.slice(0, 5).replace(".", "_")}.jpg</span>
      </div>
      ${
        x.note === "pending"
          ? `<div class="sheet-actions btn-row">
              <button type="button" class="btn cs-back" id="csBack">Вернуть</button>
              <button type="button" class="btn btn-primary" id="csOk">Принять</button>
            </div>`
          : `<div class="cs-status ${x.note}">${x.note === "ok" ? "Конспект принят" : "Отправлен на доработку"}</div>`
      }`,
      { tall: true }
    );
    $("#csOk") &&
      ($("#csOk").onclick = () => {
        x.note = "ok";
        closeSheet();
        toast("Конспект принят");
        paintStack();
      });
    $("#csBack") &&
      ($("#csBack").onclick = () => {
        x.note = "back";
        closeSheet();
        toast("Конспект возвращён на доработку");
        paintStack();
      });
  }

  function openLoginHistory(s) {
    const rows = [
      ["iPhone 13 · iOS 18.6", "02.10.2026 22:18"],
      ["iPhone 13 · iOS 18.6", "02.10.2026 08:41"],
      ["Chrome · Windows", "30.09.2026 19:02"],
      ["iPhone 13 · iOS 18.6", "28.09.2026 15:10"],
    ];
    openSheet(`
      <div class="sheet-handle"></div>
      <div class="sheet-title">История входа</div>
      <div class="sheet-sub">${s.name}</div>
      <div class="lh-list">${rows
        .map(([d, t], i) => `<div class="lh-row">${icon(d.startsWith("Chrome") ? "laptop" : "phone_iphone", "material-icons-outlined")}<span>${d}${i === 0 ? ` <i>сейчас</i>` : ""}</span><b>${t}</b></div>`)
        .join("")}</div>`);
  }

  function openStudentReport(s, data) {
    const tests = data.flat.filter((x) => x.state === "done" && x.result != null);
    const avg = tests.length ? Math.round(tests.reduce((t, x) => t + x.result, 0) / tests.length) : 0;
    const notes = data.flat.filter((x) => x.kind === "video" && x.state === "done");
    openSheet(`
      <div class="sheet-handle"></div>
      <div class="sheet-title">Отчёт за неделю</div>
      <div class="sheet-sub">${s.name} · ${data.poster.title}</div>
      <div class="rp-grid">
        <div class="sch-stat"><b style="color:#58aa80">${data.done}/${data.total}</b><span>пройдено</span></div>
        <div class="sch-stat"><b style="color:#6C7FD8">${avg}</b><span>средний балл</span></div>
        <div class="sch-stat"><b style="color:#E0A84A">${notes.filter((x) => x.note === "ok").length}/${notes.length}</b><span>конспекты</span></div>
      </div>
      <div class="rp-text">Рейтинг в группе: ${s.rank ?? "—"} место · ${s.score ?? 0} баллов за неделю${s.pointsToday ? ` (+${s.pointsToday} сегодня)` : ""}.</div>
      <div class="sheet-actions"><button type="button" class="btn btn-primary" id="rpSend" style="width:100%">Отправить родителю в WhatsApp</button></div>`);
    $("#rpSend").onclick = () => {
      closeSheet();
      toast("Отчёт отправлен родителю");
    };
  }

  function openStudentEdit(s) {
    const ex = studentExtra(s);
    openSheet(
      `
      <div class="sheet-handle"></div>
      <div class="sheet-title">Изменить данные</div>
      <div class="ef-label">ФИО родителя</div><input class="ef-input" id="seParent" value="${ex.parentName === "—" ? "" : ex.parentName}" placeholder="Иванова Айгүл" />
      <div class="ef-label">Номер родителя</div><input class="ef-input" id="sePhone" value="${ex.parentPhone}" />
      <div class="ef-label">Город</div><input class="ef-input" id="seCity" value="${ex.city === "—" ? "" : ex.city}" placeholder="Алматы" />
      <div class="ef-label">Класс</div>
      <label class="ef-select"><span id="seGradeL">${ex.grade}</span><select id="seGrade">${["9 класс", "10 класс", "11 класс", "Выпускник"].map((g) => `<option ${g === ex.grade ? "selected" : ""}>${g}</option>`).join("")}</select>${icon("expand_more")}</label>
      <button type="button" class="ef-submit" id="seSave">Сохранить</button>`,
      { tall: true }
    );
    $("#seGrade").onchange = () => ($("#seGradeL").textContent = $("#seGrade").value);
    $("#seSave").onclick = () => {
      ex.parentName = $("#seParent").value.trim() || "—";
      ex.parentPhone = $("#sePhone").value.trim() || "—";
      ex.city = $("#seCity").value.trim() || "—";
      ex.grade = $("#seGrade").value;
      closeSheet();
      toast("Сохранено");
      paintStack();
    };
  }

  /* —— Render —— */
  function medalColor(medal) {
    if (medal === "gold") return "var(--gold)";
    if (medal === "silver") return "var(--silver)";
    return "var(--bronze)";
  }

  function renderRankBadge(s) {
    if (s.medal === "gold" || s.medal === "silver" || s.medal === "bronze") {
      const c = medalColor(s.medal);
      return `<div class="rank-badge"><span class="material-icons-round trophy" style="color:${c}">emoji_events</span><span class="num-bubble" style="border-color:${c}">${s.rank}</span></div>`;
    }
    return `<div class="rank-badge"><div class="rank-circle">${s.rank}</div></div>`;
  }

  function renderRankRow(s, isLast) {
    const points =
      s.pointsToday > 0
        ? `<span class="rank-points-today">(+${s.pointsToday})</span>`
        : "";
    let change = "";
    if (s.rankChange > 0)
      change = `<span class="rank-change up">${icon("arrow_drop_up")}+${s.rankChange}</span>`;
    else if (s.rankChange < 0)
      change = `<span class="rank-change down">${icon("arrow_drop_down")}${s.rankChange}</span>`;
    const online = s.lastSeen === "онлайн";
    return `
      <div class="rank-row" data-student-id="${s.id}">
        ${renderRankBadge(s)}
        <div class="avatar" style="background:${s.color}">${s.initials}</div>
        <div class="rank-info">
          <div class="rank-name">${s.name}</div>
          <div class="rank-phone">${s.phone}</div>
        </div>
        <div class="rank-stats">
          <div class="rank-score-line">
            <span class="rank-progress">${s.progress}</span>
            <span class="rank-score">${s.score}</span>
            ${points}${change}
          </div>
          <div class="rank-seen ${online ? "online" : ""}">${s.lastSeen}</div>
        </div>
      </div>
      ${isLast ? "" : '<div class="rank-sep"></div>'}`;
  }

  function filteredStudents() {
    let list = MOCK.students;
    if (MOCK.filters.studentBlocked === "1") list = list.filter((s) => s.blocked);
    if (MOCK.filters.studentBlocked === "0") list = list.filter((s) => !s.blocked);
    return list.filter((s) => matches(state.searchStudents, s.name, s.phone, s.course));
  }

  function filteredEnrollments() {
    let list = MOCK.enrollments;
    const st = MOCK.filters.enrollmentStatus;
    if (st === "active") list = list.filter((e) => e.status === "active");
    if (st === "waiting" || st === "pending")
      list = list.filter((e) => e.status === "pending" || e.status === "freeze");
    if (st === "ended") list = list.filter((e) => e.status === "ended");
    if (st === "not_started") list = list.filter((e) => e.status === "pending");
    return list.filter((e) => matches(state.searchEnroll, e.student, e.phone, e.course));
  }

  /** Чемпион фотосы: әзірге кез келген фото қоюға болады (сол құрылғыда сақталады) */
  function champPhoto(id) {
    try {
      return localStorage.getItem(`champPhoto:${id}`) || MOCK.champPhotos?.[id] || null;
    } catch {
      return MOCK.champPhotos?.[id] || null;
    }
  }
  const PERSON_SVG = `<svg class="champ-person" viewBox="0 0 160 170" aria-hidden="true">
      <path d="M6 170c4-42 27-60 54-66l20 13 20-13c27 6 50 24 54 66z" fill="#4a4f5e"/>
      <path d="M60 104l20 13 20-13 6 3-26 22-26-22z" fill="#3a3e4a"/>
      <path d="M67 92h26v16l-13 9-13-9z" fill="#c99a74"/>
      <ellipse cx="80" cy="60" rx="26" ry="32" fill="#ddb48f"/>
      <path d="M53 56c0-23 12-35 28-35s28 10 28 32c-6-9-15-13-28-13s-21 6-28 16z" fill="#2a2420"/>
    </svg>`;

  /** Өткен апта чемпионы — рейтингтің үстінде, апта бойы тұрады */
  function championHtml(g) {
    const c = g.lastChampion;
    const st = c && g.students.find((x) => x.id === c.id);
    if (!st) return "";
    const photo = champPhoto(st.id);
    return `
      <div class="champ" data-student-id="${st.id}">
        <div class="champ-text">
          <div class="champ-over">Чемпион прошлой недели</div>
          <div class="champ-name">${st.name}</div>
          <div class="champ-sub">Чемпион · ${c.score} баллов</div>
          <div class="champ-week">${c.week}</div>
        </div>
        <div class="champ-pic" data-champ-photo="${st.id}" title="Поставить фото">
          ${photo ? `<img class="champ-photo" src="${photo}" alt="" />` : PERSON_SVG}
          <span class="champ-cam">${icon("photo_camera", "material-icons-outlined")}</span>
        </div>
      </div>`;
  }

  /** Фото таңдап, 480px-ке дейін кішірейтіп сақтау */
  function pickChampPhoto(id) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const f = input.files[0];
      if (!f) return;
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, 480 / Math.max(img.width, img.height));
        const cv = document.createElement("canvas");
        cv.width = Math.round(img.width * k);
        cv.height = Math.round(img.height * k);
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        const url = cv.toDataURL("image/jpeg", 0.85);
        try {
          localStorage.setItem(`champPhoto:${id}`, url);
        } catch {
          toast("Фото не сохранится после обновления", "err");
        }
        MOCK.champPhotos = { ...(MOCK.champPhotos || {}), [id]: url };
        render();
        toast("Фото чемпиона обновлено");
      };
      img.src = URL.createObjectURL(f);
    };
    input.click();
  }

  function renderGroups() {
    return `
      <div class="list-pad groups-list">
        ${MOCK.groups
          .map((g) => {
            const open = state.expandedGroupId === g.id;
            return `
            <div class="card ${open ? "expanded" : ""}" data-group-card="${g.id}">
              <div class="group-head" data-toggle-group="${g.id}">
                <div class="group-meta">
                  <div class="group-name">${g.name}</div>
                  <div class="group-course">${g.courseLabel}</div>
                </div>
                <span class="pill">${g.studentsCount} ${plural(g.studentsCount, "ученик", "ученика", "учеников")}</span>
                <span class="chevron">${icon("keyboard_arrow_down")}</span>
              </div>
              <div class="group-body">
                ${championHtml(g)}
                <div class="rating-head">
                  ${icon("emoji_events", "material-icons-outlined")}
                  <span class="label">Рейтинг за неделю</span>
                  <button type="button" class="icon-btn" data-download="${g.id}">${icon("download")}</button>
                </div>
                ${g.students.map((s, i) => renderRankRow(s, i === g.students.length - 1)).join("")}
              </div>
            </div>`;
          })
          .join("")}
      </div>`;
  }

  function renderStudents() {
    const list = filteredStudents();
    return `
      <div class="search-row">
        <div class="search-field">
          ${icon("search")}
          <input id="studentSearch" placeholder="Поиск" value="${state.searchStudents}" />
        </div>
        <button type="button" class="filter-btn" id="studentFilter">${icon("filter_list", "material-icons-outlined")}</button>
      </div>
      <div class="longpress-hint">Долгое нажатие / ПКМ — меню</div>
      <div class="list-pad tight-top">
        <div class="student-list">
          ${
            list.length
              ? list
                  .map(
                    (s) => `
            <div class="student-row" data-student-id="${s.id}" data-student-card="${s.id}">
              <div class="avatar" style="background:${s.color}">${s.initials}</div>
              <div class="rank-info">
                <div class="student-name">${s.name}</div>
                <div class="student-sub">${s.phone} · ${s.course}</div>
              </div>
              ${
                s.blocked
                  ? '<span class="badge badge-warn">блок</span>'
                  : s.status === "online"
                    ? '<span class="badge badge-ok">онлайн</span>'
                    : s.status === "recent"
                      ? '<span class="badge badge-ok">был недавно</span>'
                      : '<span class="badge badge-off">офлайн</span>'
              }
            </div>`
                  )
                  .join("")
              : `<div class="empty">Никого не найдено</div>`
          }
        </div>
      </div>`;
  }

  function renderEnrollments() {
    const list = filteredEnrollments();
    return `
      <div class="search-row">
        <div class="search-field">
          ${icon("search")}
          <input id="enrollSearch" placeholder="Поиск" value="${state.searchEnroll}" />
        </div>
        <button type="button" class="filter-btn" id="enrollFilter">${icon("filter_list", "material-icons-outlined")}</button>
      </div>
      <div class="longpress-hint">Долгое нажатие / ПКМ — меню</div>
      <div class="list-pad tight-top">
        ${
          list.length
            ? list
                .map((e) => {
                  const open = state.expandedEnrollmentId === e.id;
                  const badgeClass =
                    e.status === "active"
                      ? "badge-ok"
                      : e.status === "freeze" || e.status === "pending"
                        ? "badge-warn"
                        : "badge-off";
                  return `
            <div class="card enroll-card" data-enroll-card="${e.id}">
              <div class="enroll-top" data-toggle-enroll="${e.id}">
                <div style="flex:1;min-width:0">
                  <div class="enroll-name">${e.student}</div>
                  <div class="enroll-phone">${e.phone || ""}</div>
                </div>
                <span class="badge ${badgeClass}">${e.statusLabel}</span>
                <span class="enroll-chevron">${icon(open ? "keyboard_arrow_up" : "keyboard_arrow_down")}</span>
              </div>
              ${
                open
                  ? `<div class="enroll-meta">Курс: ${e.course}<br/>с ${e.date}${
                      e.daysLeft != null ? ` · осталось ${e.daysLeft} дн.` : ""
                    }</div>`
                  : ""
              }
            </div>`;
                })
                .join("")
            : `<div class="empty">Ничего не найдено</div>`
        }
      </div>`;
  }

  /* —— Staff: Аналитика (топтар → топ аналитикасы) —— */
  function groupStats(g) {
    const st = g.students;
    const pct = (x) => {
      const [d, t] = String(x.progress || "0/1").split("/").map(Number);
      return t ? Math.round((d / t) * 100) : 0;
    };
    const today = (x) => /минут|час назад|часа назад|часов назад|онлайн/.test(x.lastSeen || "");
    const avgScore = st.length ? Math.round(st.reduce((t, x) => t + (x.score || 0), 0) / st.length) : 0;
    const avgProgress = st.length ? Math.round(st.reduce((t, x) => t + pct(x), 0) / st.length) : 0;
    const active = st.filter(today).length;
    const pending = st.reduce((t, x) => t + pendingCount(staffCourseFor(x, g)), 0);
    const tests = st.flatMap((x) => staffCourseFor(x, g).flat.filter((i) => i.result != null).map((i) => i.result));
    const avgTest = tests.length ? Math.round(tests.reduce((t, v) => t + v, 0) / tests.length) : 0;
    // Белсенділік (Дс–Жс): топ көлеміне қарай тұрақты сандар
    const week = [0.72, 0.8, 0.64, 0.86, 0.58, 0.41, Math.max(0.1, active / Math.max(1, st.length))].map((k, i) =>
      Math.min(st.length, Math.round(st.length * k + ((g.id * (i + 3)) % 3) - 1))
    );
    const attention = st
      .map((x) => {
        const reasons = [];
        if (pct(x) < 40) reasons.push(`прогресс ${pct(x)}%`);
        if (!x.score) reasons.push("0 баллов за неделю");
        if (/\d\d\.\d\d\.\d\d|вчера/.test(x.lastSeen || "")) reasons.push(x.lastSeen);
        return { x, reasons };
      })
      .filter((r) => r.reasons.length);
    return { avgScore, avgProgress, active, pending, avgTest, week, attention, pct };
  }

  function renderStaffAnalytics() {
    return `
      <div class="list-pad an-groups">
        ${MOCK.groups
          .map(
            (g) => `
          <button type="button" class="ag-card" data-an-group="${g.id}">
            <div class="ag-top">
              <div style="flex:1;min-width:0">
                <div class="group-name">${g.name}</div>
                <div class="group-course">${g.courseLabel}</div>
              </div>
              ${icon("chevron_right")}
            </div>
          </button>`
          )
          .join("")}
      </div>`;
  }

  /* —— Топ аналитикасы: бәрі таңдалған кезеңге (күн / апта / ай) байланысты —— */
  const AN_TODAY = new Date(2026, 9, 3);
  const dayKey = (d) => d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate();
  /** 0..1 тұрақты кездейсоқ сан */
  function rnd(...n) {
    let x = 2166136261;
    n.forEach((v) => {
      x ^= v & 0xffff;
      x = Math.imul(x, 16777619);
      x ^= v >>> 16;
      x = Math.imul(x, 16777619);
    });
    x ^= x >>> 13;
    x = Math.imul(x, 0x5bd1e995);
    x ^= x >>> 15;
    return (x >>> 0) / 4294967296;
  }
  function periodRange(period, date) {
    let from, to;
    if (period === "day") from = to = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    else if (period === "week") {
      from = new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() + 6) % 7));
      to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 6);
    } else {
      from = new Date(date.getFullYear(), date.getMonth(), 1);
      to = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    }
    const days = [];
    for (let d = new Date(from); d <= to && d <= AN_TODAY; d.setDate(d.getDate() + 1)) days.push(new Date(d));
    return { from, to, days };
  }
  function periodLabel(period, date) {
    const { from, to } = periodRange(period, date);
    const dm = (d) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
    if (period === "day") return dmy(from);
    if (period === "week") return `${dm(from)} – ${dm(to)}`;
    return `${KZ_MONTHS[from.getMonth()].replace(/^./, (c) => c.toUpperCase())} ${from.getFullYear()}`;
  }
  /** Оқушының бір күні: кірді ме, неше сабақ, тест нәтижелері, конспект */
  function studentDay(x, d) {
    const k = dayKey(d);
    const skill = (x.score || 0) / 100;
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    const active = rnd(x.id, k, 1) < (0.3 + skill * 0.6) * (weekend ? 0.55 : 1);
    if (!active) return { active: false, lessons: 0, tests: [], notes: 0, hour: 0 };
    const lessons = 1 + (rnd(x.id, k, 2) < 0.35 + skill * 0.4 ? 1 : 0) + (rnd(x.id, k, 3) < 0.15 ? 1 : 0);
    const tests = Array.from({ length: lessons }, (_, i) => Math.round((40 + skill * 45 + rnd(x.id, k, 10 + i) * 20) / 5) * 5);
    const notes = rnd(x.id, k, 4) < 0.6 ? 1 : 0;
    const hour = [8, 10, 12, 14, 16, 18, 20, 22][Math.min(7, Math.floor(Math.pow(rnd(x.id, k, 5), 0.6) * 8))];
    return { active, lessons, tests, notes, hour };
  }
  /** Пробный ЕНТ — әр сенбі (29.08-ден бүгінге дейін) */
  function entAttempts(x) {
    if (!x.entAll) {
      x.entAll = [];
      const skill = (x.score || 0) / 100;
      for (let d = new Date(2026, 7, 29), i = 0; d <= AN_TODAY; d.setDate(d.getDate() + 7), i++) {
        if (rnd(x.id, i, 7) < 0.15) continue;
        const score = Math.round(Math.min(140, 40 + skill * 70 + i * 2.5 + (rnd(x.id, i, 8) - 0.5) * 16));
        x.entAll.push({ date: new Date(d), score });
      }
    }
    return x.entAll;
  }
  function analyze(g, period, date) {
    const R = periodRange(period, date);
    const st = g.students;
    const workdays = R.days.filter((d) => d.getDay() !== 0 && d.getDay() !== 6).length;
    const plan = workdays ? Math.max(1, Math.round(workdays * 1.6)) : 0;
    const per = st.map((x) => {
      const days = R.days.map((d) => studentDay(x, d));
      const tests = days.flatMap((d) => d.tests);
      const inRange = entAttempts(x).filter((e) => e.date >= R.from && e.date <= R.to);
      return {
        x,
        days,
        active: days.some((d) => d.active),
        activeDays: days.filter((d) => d.active).length,
        lessons: days.reduce((t, d) => t + d.lessons, 0),
        tests,
        points: tests.reduce((t, v) => t + Math.round(v / 10), 0),
        notes: days.reduce((t, d) => t + d.notes, 0),
        pendingNotes: R.days.reduce((t, d, i) => t + (days[i].notes && (AN_TODAY - d) / 864e5 <= 2 ? 1 : 0), 0),
        ent: inRange,
      };
    });
    const avg = (arr) => (arr.length ? arr.reduce((t, v) => t + v, 0) / arr.length : 0);
    // Алдыңғы кезең (ЕНТ салыстыру үшін)
    const prevDate = new Date(R.from);
    if (period === "day") prevDate.setDate(prevDate.getDate() - 1);
    else if (period === "week") prevDate.setDate(prevDate.getDate() - 7);
    else prevDate.setMonth(prevDate.getMonth() - 1);
    const P = periodRange(period, prevDate);
    const entNow = per.flatMap((r) => r.ent.map((e) => e.score));
    const entPrev = st.flatMap((x) => entAttempts(x).filter((e) => e.date >= P.from && e.date <= P.to).map((e) => e.score));
    const allTests = per.flatMap((r) => r.tests);
    let series;
    if (period === "day") {
      const hours = [8, 10, 12, 14, 16, 18, 20, 22];
      series = hours.map((h, i) => ({ label: pad(h), tip: `${pad(h)}:00–${pad(hours[i + 1] || 24)}:00`, v: per.filter((r) => r.days[0]?.active && r.days[0].hour === h).length }));
    } else {
      const all = [];
      for (let d = new Date(R.from); d <= R.to; d.setDate(d.getDate() + 1)) all.push(new Date(d));
      series = all.map((d, i) => {
        const idx = R.days.findIndex((x) => dayKey(x) === dayKey(d));
        const v = idx < 0 ? null : per.filter((r) => r.days[idx].active).length;
        const wd = ["Жс", "Дс", "Сс", "Ср", "Бс", "Жм", "Сб"][d.getDay()];
        const label = period === "week" ? wd : (i + 1) % 5 === 0 || i === 0 ? String(i + 1) : "";
        return { label, tip: `${wd}, ${pad(d.getDate())}.${pad(d.getMonth() + 1)}`, v };
      });
    }
    const attention = per
      .map((r) => {
        const reasons = [];
        if (!r.active) reasons.push("не заходил за период");
        else if (plan && r.lessons < plan * 0.5) reasons.push(`прошёл ${r.lessons} из ${plan} уроков`);
        if (r.tests.length && avg(r.tests) < 55) reasons.push(`ср. тест ${Math.round(avg(r.tests))}`);
        return { x: r.x, reasons };
      })
      .filter((r) => r.reasons.length);
    return {
      R,
      per,
      plan,
      future: !R.days.length,
      active: per.filter((r) => r.active).length,
      avgPoints: Math.round(avg(per.map((r) => r.points))),
      avgTest: Math.round(avg(allTests)),
      testsCount: allTests.length,
      notes: per.reduce((t, r) => t + r.notes, 0),
      pending: per.reduce((t, r) => t + r.pendingNotes, 0),
      avgLessons: Math.round(avg(per.map((r) => r.lessons)) * 10) / 10,
      met: per.filter((r) => plan && r.lessons >= plan).length,
      entAvg: entNow.length ? Math.round(avg(entNow)) : null,
      entPrev: entPrev.length ? Math.round(avg(entPrev)) : null,
      entCount: per.filter((r) => r.ent.length).length,
      entGrant: per.filter((r) => r.ent.length && r.ent[r.ent.length - 1].score >= 50).length,
      series,
      attention,
    };
  }

  function openGroupAnalytics(g) {
    const A = { period: "week", date: new Date(AN_TODAY), attAll: false, who: false };
    const word = () => ({ day: "день", week: "неделю", month: "месяц" })[A.period];
    const build = () => {
      const a = analyze(g, A.period, A.date);
      const n = g.students.length;
      const head = `
        <div class="ga-head">
          <div class="ga-title">${g.name}</div>
          <div class="ga-sub">${g.courseLabel} · ${n} ${plural(n, "ученик", "ученика", "учеников")}</div>
        </div>
        <div class="ga-period">
          <div class="seg-tabs seg-3 ga-seg" style="margin:0">
            ${[["day", "День"], ["week", "Неделя"], ["month", "Месяц"]].map(([k, l]) => `<button type="button" data-ga-period="${k}" class="${A.period === k ? "on" : ""}">${l}</button>`).join("")}
          </div>
          <div class="ga-dnav">
            <button type="button" class="sch-arrow" data-ga-shift="-1">${icon("chevron_left")}</button>
            <button type="button" class="ga-date" id="gaDate">${icon("calendar_today")}${periodLabel(A.period, A.date)}</button>
            <button type="button" class="sch-arrow" data-ga-shift="1" ${a.R.to >= AN_TODAY ? "disabled" : ""}>${icon("chevron_right")}</button>
          </div>
        </div>`;
      if (a.future) return `<div class="ga">${head}<div class="efir-empty" style="min-height:300px">Данных за этот период пока нет</div></div>`;
      const diff = a.entAvg != null && a.entPrev != null ? a.entAvg - a.entPrev : null;
      const pct = a.plan ? Math.round((a.avgLessons / a.plan) * 100) : 0;
      const maxV = Math.max(1, ...a.series.map((p) => p.v || 0));
      const peak = a.series.findIndex((p) => p.v === maxV);
      const ranked = a.per.filter((r) => r.ent.length).sort((p, q) => q.ent[q.ent.length - 1].score - p.ent[p.ent.length - 1].score);
      return `
      <div class="ga">
        ${head}

        <div class="ga-ent">
          <div class="ga-ent-l">Пробный ЕНТ · средний балл группы за ${word()}</div>
          ${
            a.entAvg == null
              ? `<div class="ga-ent-none">${icon("event_busy", "material-icons-outlined")}За этот период пробных ЕНТ не было</div>`
              : `
          <div class="ga-ent-v"><b>${a.entAvg}</b><span> / 140</span>
            ${diff != null ? `<em class="${diff >= 0 ? "up" : "down"}">${icon(diff >= 0 ? "arrow_upward" : "arrow_downward")}${diff >= 0 ? "+" : ""}${diff} к прошлому периоду</em>` : ""}
          </div>
          <div class="ga-ent-bar"><i style="width:${(a.entAvg / 140) * 100}%"></i><s style="left:${(50 / 140) * 100}%" title="Порог гранта 50"></s></div>
          <div class="ga-ent-meta"><span>Сдавали: ${a.entCount} из ${n}</span><span>≥ 50 баллов: ${a.entGrant} из ${a.entCount}</span></div>`
          }
        </div>

        <div class="ga-tiles">
          <div class="ga-tile"><span>Средний балл за ${word()}</span><b>${a.avgPoints}</b></div>
          <div class="ga-tile"><span>Средний результат тестов</span><b>${a.testsCount ? a.avgTest : "—"}<small> ${a.testsCount ? "из 100" : ""}</small></b></div>
          <div class="ga-tile"><span>Активны за ${word()}</span><b>${a.active}<small> / ${n}</small></b></div>
          <div class="ga-tile ${a.pending ? "warn" : ""}" ${a.pending ? 'data-ga-pending="1"' : ""}><span>${icon(a.pending ? "schedule" : "description", "material-icons-outlined")}Конспекты</span><b>${a.notes}<small> сдано${a.pending ? ` · ${a.pending} на проверке` : ""}</small></b></div>
        </div>

        <div class="ga-card">
          <div class="ga-ctitle">Прогресс за ${word()}</div>
          <div class="gp-row">
            <div class="gp-big"><b>+${a.avgLessons}</b><span>${plural(Math.round(a.avgLessons), "урок", "урока", "уроков")} в среднем на ученика</span></div>
            ${a.plan ? `<div class="gp-pct ${pct >= 100 ? "ok" : pct >= 70 ? "mid" : "low"}">${pct}%</div>` : ""}
          </div>
          ${
            a.plan
              ? `<div class="gp-bar"><i style="width:${Math.min(100, pct)}%"></i></div>
          <div class="gp-meta"><span>План${a.R.to > AN_TODAY ? " на сегодня" : ""}: ${a.plan} ${plural(a.plan, "урок", "урока", "уроков")} · выполнен на ${pct}%</span><span>Выполнили: ${a.met} из ${n}</span></div>`
              : `<div class="gp-meta"><span>Выходной — план не задан</span></div>`
          }
          <button type="button" class="ga-more gp-who" id="gpWho">${A.who ? "Скрыть" : "Кто сколько прошёл"}</button>
          ${
            A.who
              ? `<div class="ga-hbars">${[...a.per]
                  .sort((p, q) => q.lessons - p.lessons)
                  .map((r) => {
                    const ok = a.plan && r.lessons >= a.plan;
                    const w = a.plan ? Math.min(100, (r.lessons / a.plan) * 100) : r.lessons * 30;
                    return `
                <button type="button" class="ga-hrow" data-ga-student="${r.x.id}" data-tip="${r.x.name}: ${r.lessons} ${plural(r.lessons, "урок", "урока", "уроков")}">
                  <span class="ga-hname">${r.x.name}</span>
                  <span class="ga-htrack"><i style="width:${Math.max(2, w)}%;${ok ? "" : "background:color-mix(in srgb,var(--primary) 55%,#1e1e1e)"}"></i></span>
                  <span class="ga-hval">${r.lessons}${a.plan ? `/${a.plan}` : ""}</span>
                </button>`;
                  })
                  .join("")}</div>`
              : ""
          }
        </div>

        <div class="ga-card">
          <div class="ga-ctitle">Активность</div>
          <div class="ga-csub">Сколько учеников заходили в приложение${A.period === "day" ? " · по часам" : ""}</div>
          <div class="ga-bars ${A.period === "month" ? "month" : ""}" style="grid-template-columns:repeat(${a.series.length},1fr)">
            ${a.series
              .map(
                (p, i) => `
              <button type="button" class="ga-bar ${i === peak ? "today" : ""} ${p.v == null ? "none" : ""}" data-tip="${p.tip}: ${p.v == null ? "ещё не наступил" : `${p.v} из ${n}`}">
                ${i === peak && A.period !== "month" ? `<em>${p.v}</em>` : ""}
                <i style="height:${p.v == null ? 0 : Math.max(3, (p.v / n) * 100)}%"></i>
                <span>${p.label}</span>
              </button>`
              )
              .join("")}
          </div>
          <div class="ga-peak">${maxV ? `Пик: ${a.series[peak].tip} · ${maxV} из ${n}` : "Никто не заходил"}</div>
        </div>

        <div class="ga-card">
          <div class="ga-ctitle">Пробный ЕНТ по ученикам</div>
          <div class="ga-csub">Результат за ${word()} из 140 · нажмите, чтобы открыть профиль</div>
          ${
            ranked.length
              ? `<div class="ga-hbars">${ranked
                  .map((r) => {
                    const v = r.ent[r.ent.length - 1].score;
                    const all = entAttempts(r.x);
                    const i = all.indexOf(r.ent[r.ent.length - 1]);
                    const d = i > 0 ? v - all[i - 1].score : null;
                    return `
              <button type="button" class="ga-hrow" data-ga-student="${r.x.id}" data-tip="${r.ent.map((e) => `${pad(e.date.getDate())}.${pad(e.date.getMonth() + 1)}: ${e.score}`).join(" · ")}">
                <span class="ga-hname">${r.x.name}</span>
                <span class="ga-htrack"><i style="width:${(v / 140) * 100}%"></i></span>
                <span class="ga-hval">${v}${d != null ? `<small class="${d >= 0 ? "up" : "down"}">${d >= 0 ? "+" : ""}${d}</small>` : ""}</span>
              </button>`;
                  })
                  .join("")}</div>`
              : `<div class="ga-csub" style="margin-top:12px">В этот период никто не сдавал пробный ЕНТ</div>`
          }
        </div>

        <div class="ga-card">
          <div class="ga-ctitle">Требуют внимания</div>
          ${
            a.attention.length
              ? a.attention
                  .slice(0, A.attAll ? 999 : 5)
                  .map(
                    (r) => `
              <button type="button" class="ga-att" data-ga-student="${r.x.id}">
                <span class="ga-att-ico">${icon("warning_amber", "material-icons-outlined")}</span>
                <span style="flex:1;min-width:0"><b>${r.x.name}</b><small>${r.reasons.join(" · ")}</small></span>
                ${icon("chevron_right")}
              </button>`
                  )
                  .join("") + (a.attention.length > 5 && !A.attAll ? `<button type="button" class="ga-more" id="gaMore">Показать ещё ${a.attention.length - 5}</button>` : "")
              : `<div class="ga-ok">${icon("check_circle", "material-icons-outlined")}Все ученики в норме</div>`
          }
        </div>
      </div>`;
    };
    pushScreen(
      "Аналитика группы",
      build,
      () => {
        $$("[data-ga-student]").forEach((b) => (b.onclick = () => openStaffStudent(g.students.find((x) => x.id === Number(b.dataset.gaStudent)), g)));
        $$("[data-ga-period]").forEach((b) => (b.onclick = () => ((A.period = b.dataset.gaPeriod), paintStack())));
        $$("[data-ga-shift]").forEach((b) => {
          b.onclick = () => {
            const k = Number(b.dataset.gaShift);
            const d = new Date(A.date);
            if (A.period === "day") d.setDate(d.getDate() + k);
            else if (A.period === "week") d.setDate(d.getDate() + 7 * k);
            else d.setMonth(d.getMonth() + k, 1);
            A.date = d > AN_TODAY ? new Date(AN_TODAY) : d;
            paintStack();
          };
        });
        $("#gaDate").onclick = () => openDatePicker(A.date, (d) => ((A.date = d), paintStack()));
        $("#gaMore")?.addEventListener("click", () => ((A.attAll = true), paintStack()));
        $("#gpWho")?.addEventListener("click", () => ((A.who = !A.who), paintStack()));
        $("[data-ga-pending]")?.addEventListener("click", () => {
          const s = g.students.find((x) => pendingCount(staffCourseFor(x, g)) > 0) || g.students[0];
          openStaffStudent(s, g);
        });
      },
      { right: "<span></span>" }
    );
  }

  function renderEnrollSoon() {
    return `
      <div class="soon-screen">
        ${icon("handyman")}
        <div class="soon-title">Аналитика</div>
        <div class="soon-sub">Скоро будет доступно</div>
      </div>`;
  }

  function renderPushes() {
    return `
      <div class="list-pad push-list">
        ${MOCK.pushes
          .map(
            (p) => `
          <div class="spush">
            <div class="spush-top"><div class="spush-title">${p.title}</div><div class="spush-time">${p.time}</div></div>
            <div class="spush-type">${p.type || "Объявление"}</div>
            <div class="spush-body">${p.body}</div>
            <div class="spush-foot"><span>Группа: ${p.audience}</span><b title="получили / прочитали">${p.stats || "0 / 0"}</b></div>
          </div>`
          )
          .join("")}
      </div>`;
  }

  /* —— Эфир —— */
  const KZ_MONTHS = ["қаңтар", "ақпан", "наурыз", "сәуір", "мамыр", "маусым", "шілде", "тамыз", "қыркүйек", "қазан", "қараша", "желтоқсан"];
  const KZ_MON_SHORT = ["қаң.", "ақп.", "нау.", "сәу.", "мам.", "мау.", "шіл.", "там.", "қыр.", "қаз.", "қар.", "жел."];
  const KZ_WD_SHORT = ["жс", "дс", "сс", "ср", "бс", "жм", "сб"];
  const dmy = (d) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  function renderEfir() {
    const list = MOCK.efirs.filter((e) => e.date === iso(state.efirDate)).sort((a, b) => a.time.localeCompare(b.time));
    return `
      <div class="efir-tools">
        <button type="button" class="efir-date" id="efirDate">${icon("calendar_today")}${dmy(state.efirDate)}</button>
        <button type="button" class="efir-add" id="efirAdd">${icon("add")}Добавить</button>
      </div>
      ${
        list.length
          ? `<div class="list-pad">${list
              .map(
                (e) => `
            <div class="efir-item">
              <div class="efir-time">${e.time}</div>
              <div style="flex:1;min-width:0">
                <div class="efir-title">${e.title}</div>
                <div class="efir-groups">${e.groups.map((id) => MOCK.groups.find((g) => g.id === id)?.name).filter(Boolean).join(", ")}</div>
                <a class="efir-link" href="${e.link}" target="_blank" rel="noopener">${icon("link")}${e.link.replace(/^https?:\/\//, "")}</a>
              </div>
              <button type="button" class="efir-del" data-efir-del="${e.id}" title="Удалить">${icon("delete_outline", "material-icons-outlined")}</button>
            </div>`
              )
              .join("")}</div>`
          : `<div class="efir-empty"><div>На эту дату эфиров нет</div><button type="button" id="efirCreate">Создать эфир</button></div>`
      }`;
  }

  function openDatePicker(value, onPick) {
    let sel = new Date(value);
    let view = new Date(sel.getFullYear(), sel.getMonth(), 1);
    const layer = $("#dialogLayer");
    const paint = () => {
      const first = (view.getDay() + 6) % 7;
      const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
      const cells = [...Array(first).fill(""), ...Array.from({ length: days }, (_, i) => i + 1)];
      layer.hidden = false;
      layer.innerHTML = `
        <div class="dp">
          <div class="dp-label">Күнді таңдау</div>
          <div class="dp-head"><span>${sel.getDate()} ${KZ_MON_SHORT[sel.getMonth()]}, ${KZ_WD_SHORT[sel.getDay()]}</span>${icon("edit", "material-icons-outlined")}</div>
          <div class="dp-nav">
            <span>${view.getFullYear()} ж. ${KZ_MONTHS[view.getMonth()]} ${icon("arrow_drop_down")}</span>
            <span><button type="button" data-dpm="-1">${icon("chevron_left")}</button><button type="button" data-dpm="1">${icon("chevron_right")}</button></span>
          </div>
          <div class="dp-grid">
            ${["Д", "С", "С", "Б", "Ж", "С", "Ж"].map((w) => `<span class="dp-wd">${w}</span>`).join("")}
            ${cells
              .map((d) => {
                if (!d) return "<span></span>";
                const on = d === sel.getDate() && view.getMonth() === sel.getMonth() && view.getFullYear() === sel.getFullYear();
                return `<button type="button" class="dp-day ${on ? "on" : ""}" data-dpd="${d}">${d}</button>`;
              })
              .join("")}
          </div>
          <div class="dp-actions"><button type="button" id="dpCancel">Бас тарту</button><button type="button" id="dpOk">Иә</button></div>
        </div>`;
      $$("[data-dpm]", layer).forEach((b) => (b.onclick = () => ((view = new Date(view.getFullYear(), view.getMonth() + Number(b.dataset.dpm), 1)), paint())));
      $$("[data-dpd]", layer).forEach((b) => (b.onclick = () => ((sel = new Date(view.getFullYear(), view.getMonth(), Number(b.dataset.dpd))), paint())));
      $("#dpCancel").onclick = closeDialog;
      $("#dpOk").onclick = () => {
        closeDialog();
        onPick(sel);
      };
    };
    paint();
    layer.onclick = (e) => e.target === layer && closeDialog();
  }

  function openEfirForm() {
    const f = { title: "", link: "", time: "", groups: new Set() };
    const times = [];
    for (let h = 8; h <= 22; h++) ["00", "30"].forEach((m) => times.push(`${pad(h)}:${m}`));
    const groupsLabel = () =>
      f.groups.size ? [...f.groups].map((id) => MOCK.groups.find((g) => g.id === id)?.name).join(", ") : "Выбрать группы";
    const draw = () => {
      openSheet(
        `
        <div class="sheet-handle"></div>
        <div class="ef-head"><span>Добавить эфир</span><button type="button" id="efClose">${icon("close")}</button></div>
        <div class="ef-label">Название <i>*</i></div>
        <input class="ef-input" id="efTitle" placeholder="Например: Разбор ЕНТ" value="${f.title.replace(/"/g, "&quot;")}" />
        <div class="ef-label">Ссылка <i>*</i></div>
        <input class="ef-input" id="efLink" placeholder="https://..." value="${f.link.replace(/"/g, "&quot;")}" />
        <div class="ef-label">Время <i>*</i></div>
        <label class="ef-select ${f.time ? "" : "ph"}">
          <span id="efTimeLabel">${f.time || "Выбери время"}</span>
          <select id="efTime">
            <option value="" ${f.time ? "" : "selected"} disabled>Выбери время</option>
            ${times.map((t) => `<option ${t === f.time ? "selected" : ""}>${t}</option>`).join("")}
          </select>${icon("expand_more")}
        </label>
        <div class="ef-label">Группы <i>*</i></div>
        <button type="button" class="ef-select ${f.groups.size ? "" : "ph"}" id="efGroups"><span>${groupsLabel()}</span>${icon("expand_more")}</button>
        <div class="ef-note">Спикер — ты. Курс подставится из группы.</div>
        <button type="button" class="ef-submit" id="efCreate">Создать</button>`,
        { tall: true }
      );
      const keep = () => {
        f.title = $("#efTitle").value;
        f.link = $("#efLink").value;
        f.time = $("#efTime").value;
      };
      $("#efClose").onclick = closeSheet;
      $("#efTime").onchange = () => {
        keep();
        $("#efTime").closest(".ef-select").classList.toggle("ph", !f.time);
        $("#efTimeLabel").textContent = f.time || "Выбери время";
      };
      $("#efGroups").onclick = () => {
        keep();
        openSheet(`
          <div class="sheet-handle"></div>
          <div class="ef-head"><span>Группы</span></div>
          <div class="pick-list">${MOCK.groups
            .map(
              (g) => `<button type="button" class="pick-opt ${f.groups.has(g.id) ? "on" : ""}" data-efg="${g.id}">
                <span>${g.name}<small class="ef-gsub">${g.courseLabel}</small></span>${icon(f.groups.has(g.id) ? "check_box" : "check_box_outline_blank")}</button>`
            )
            .join("")}</div>
          <div class="sheet-actions"><button type="button" class="ef-submit" id="efgDone">Готово</button></div>`);
        $$("[data-efg]").forEach((b) => {
          b.onclick = () => {
            const id = Number(b.dataset.efg);
            f.groups.has(id) ? f.groups.delete(id) : f.groups.add(id);
            b.classList.toggle("on", f.groups.has(id));
            b.querySelector(".material-icons-round").textContent = f.groups.has(id) ? "check_box" : "check_box_outline_blank";
          };
        });
        $("#efgDone").onclick = draw;
      };
      $("#efCreate").onclick = () => {
        keep();
        if (!f.title.trim() || !f.link.trim() || !f.time || !f.groups.size) {
          toast("Заполните все обязательные поля", "err");
          return;
        }
        if (!/^https?:\/\//.test(f.link.trim())) {
          toast("Ссылка должна начинаться с https://", "err");
          return;
        }
        MOCK.efirs.push({ id: nextId(), title: f.title.trim(), link: f.link.trim(), date: iso(state.efirDate), time: f.time, groups: [...f.groups] });
        closeSheet();
        toast("Эфир создан");
        render();
      };
    };
    draw();
  }

  function renderProfile(student) {
    return `
      <div class="profile-block">
        <div class="profile-avatar-lg" style="background:${student.color}">${student.initials}</div>
        <div class="profile-name">${student.name}</div>
        <div class="profile-phone">${student.phone || ""}</div>
      </div>
      <div class="profile-stats">
        <div class="stat-tile"><div class="stat-val">${student.score ?? "—"}</div><div class="stat-lbl">баллы</div></div>
        <div class="stat-tile"><div class="stat-val">${student.progress || "—"}</div><div class="stat-lbl">прогресс</div></div>
        <div class="stat-tile"><div class="stat-val">${student.rank ?? "—"}</div><div class="stat-lbl">место</div></div>
      </div>
      <div class="list-pad">
        <div class="card" style="padding:14px 16px">
          <div style="font-size:13px;color:var(--hint);margin-bottom:6px">Статус</div>
          <div style="font-size:14px">${student.lastSeen || (student.blocked ? "заблокирован" : "—")}</div>
        </div>
      </div>`;
  }

  function posterHtml(p, variant = "") {
    return `
      <div class="poster ${variant} ${Math.max(...p.lines.map((l) => l.length)) > 9 ? "long" : ""}" style="background:${p.bg}">
        <div class="poster-text">
          <b>${p.lines.join("<br>")}</b>
          <i>ҰБТ 2026</i>
        </div>
        <img src="${p.img}" alt="" />
        <span class="poster-logo">i4U</span>
      </div>`;
  }

  const PLAY_SVG = `<svg class="ls-ico" viewBox="0 0 24 24" fill="none" stroke="#4FB1BA" stroke-width="2" stroke-linejoin="round"><path d="M8 5.5v13l10-6.5z"/></svg>`;
  function lessonIcon(kind) {
    return kind === "test"
      ? `<span class="material-icons-outlined ls-ico" style="color:#5CB36D">help_outline</span>`
      : PLAY_SVG;
  }

  function newsThumb(t) {
    if (!t) return `<span class="news-thumb ph">${icon("image", "material-icons-outlined")}</span>`;
    if (t.kind === "unis")
      return `<span class="news-thumb nt-light"><small class="nt-tag">#i4u</small><b>ҚАЗАҚСТАННЫҢ<br><em>ҮЗДІК</em><br><s>УНИВЕРСИТЕТТЕРІ</s></b><span class="nt-blob"></span></span>`;
    if (t.kind === "grants")
      return `<span class="news-thumb nt-light"><small class="nt-tag">#i4u</small><b>ЕҢ КӨП <em>ГРАНТ</em><br>БӨЛІНГЕН<br>МАМАНДЫҚТАР</b><span class="nt-coin"></span></span>`;
    return `<span class="news-thumb nt-dark"><span class="nt-search">i4U.kz</span><i></i><i></i></span>`;
  }

  function renderStudentHome() {
    const services = [
      { id: "subjects", label: "Предметы", img: "assets/v2/subjectsv2.png" },
      { id: "tests", label: "Тесты", img: "assets/v2/testv2.png" },
      { id: "trainer", label: "Тренажёр", icon: "track_changes", color: "#E07A3D" },
      { id: "professions", label: "Профессии", img: "assets/v2/profv2.png" },
      { id: "analytics", label: "Аналитика", img: "assets/v2/analyticsv2.png" },
      { id: "shop", label: "Магазин", img: "assets/v2/shopv2.png", soon: true },
    ];
    return `
      <div class="banner-wrap">
        <div class="banner-track">
          <button type="button" class="banner-slide" id="openBanner">
            <span class="banner-logo">!4U</span>
            <div class="banner-pic">
              <span class="bp-board">${icon("lightbulb")}</span>
              <span class="bp-cap">${icon("school")}</span>
              <span class="bp-cal">${icon("calendar_month")}</span>
              <span class="bp-list">${icon("checklist")}</span>
              <span class="bp-doc">${icon("description", "material-icons-outlined")}</span>
            </div>
            <div class="banner-copy">
              <strong>"БІР ПЛАТФОРМА –<br><em>БАРЛЫҚ ПӘНДЕР!"</em></strong>
              <small>"АРМАНЫҢДАҒЫ БАЛЛҒА ЖЕТУ ҮШІН,<br><em>БАРЛЫҚ ПӘНДЕРГЕ СЕНІМЕН!"</em></small>
            </div>
          </button>
        </div>
        <div class="banner-dots">${MOCK.stories.map((_, i) => `<i class="${i === 0 ? "on" : ""}"></i>`).join("")}</div>
      </div>
      <div class="section-title">Сервисы</div>
      <div class="service-grid">
        ${services
          .map(
            (s) => `
          <button type="button" class="service-tile ${s.soon ? "locked" : ""}" data-service="${s.id}" data-title="${s.label}">
            ${s.soon ? `<span class="soon-badge">скоро</span>` : ""}
            ${
              s.img
                ? `<img src="${s.img}" alt="" />`
                : `<span class="material-icons-round" style="color:${s.color}">${s.icon}</span>`
            }
            <span>${s.label}</span>
          </button>`
          )
          .join("")}
      </div>
      <div class="section-row" style="margin-top:4px">
        <div class="section-title">Расписание на сегодня</div>
        <button type="button" class="section-date" id="openCoursesTab">02.10 4 Нед.</button>
      </div>
      <div class="today-wrap">
        <div class="today-card">
          ${MOCK.scheduleToday
            .map(
              (e, i) => `
            ${i > 0 ? `<div class="today-div"></div>` : ""}
            <button type="button" class="today-row" data-lesson="${e.lesson}" data-course="${e.course}">
              ${lessonIcon(e.kind)}
              <div style="flex:1;min-width:0">
                <div class="tr-course">${e.course}</div>
                <div class="tr-lesson">${e.lesson}</div>
              </div>
              <span class="material-icons-round chev">chevron_right</span>
            </button>`
            )
            .join("")}
        </div>
      </div>`;
  }

  function renderNews() {
    return `
      <div class="list-pad news-list">
        ${MOCK.news
          .map(
            (n) => `
          <button type="button" class="blog-row" data-news="${n.id}">
            <div style="flex:1;min-width:0">
              <div class="blog-title">${n.title}</div>
              <div class="blog-body">${n.body}</div>
            </div>
            ${newsThumb(n.thumb)}
          </button>`
          )
          .join("")}
      </div>`;
  }

  function renderStudentNotifs() {
    return `
      <div class="list-pad">
        ${MOCK.studentNotifs
          .map(
            (n) => `
          <button type="button" class="push-row" data-push="${n.id}">
            <img src="assets/v2/notification.png" alt="" />
            <span class="push-line"></span>
            <span>
              <span class="push-when">${n.when}</span>
              <span class="push-title">${n.title}</span>
              <span class="push-body">${n.body}</span>
            </span>
          </button>`
          )
          .join("")}
      </div>`;
  }

  /* —— Курс: бөлімдер мен сабақтар —— */
  const LESSON_KIND = { v: "video", t: "test", w: "weekly", f: "final" };
  function courseItems(cc) {
    const flat = [];
    cc.sections.forEach((sec, si) =>
      sec.items.forEach((raw) => flat.push({ si, key: raw, kind: LESSON_KIND[raw[0]], title: raw.slice(2) }))
    );
    if (cc.cur == null) cc.cur = Math.max(0, flat.findIndex((x) => x.key === cc.current));
    flat.forEach((x, i) => (x.state = i < cc.cur ? "done" : i === cc.cur ? "current" : "locked"));
    return flat;
  }
  function kindIcon(kind) {
    if (kind === "video") return PLAY_SVG;
    if (kind === "test") return `<span class="material-icons-outlined ls-ico" style="color:#5CB36D">help_outline</span>`;
    if (kind === "weekly") return `<span class="material-icons-outlined ls-ico" style="color:#A05AD8">calendar_month</span>`;
    return `<span class="material-icons-outlined ls-ico" style="color:#E0604A">grid_on</span>`;
  }
  function lessonAction(x) {
    if (x.state === "locked") return icon("lock", "material-icons-outlined lk");
    if (x.kind === "video") return `<span class="ln-act teal">Смотреть</span>`;
    if (x.kind === "final") return `<span class="ln-act red">Модульный зачёт</span>`;
    return x.state === "done" ? `<span class="ln-act green">Результат</span>` : `<span class="ln-act green">Пройти тест</span>`;
  }

  function openCourse(c) {
    const cc = MOCK.courseContent[c.id];
    if (!cc) {
      openInner(c.title, `<div class="empty">Скоро здесь появятся уроки</div>`);
      return;
    }
    const items = courseItems(cc);
    const open = { [items[cc.cur]?.si ?? 0]: true };
    const build = () => {
      const flat = courseItems(cc);
      return `<div class="list-pad course-secs" style="--acc:${cc.accent || "#2a3647"}">${cc.sections
        .map((sec, si) => {
          const rows = flat.map((x, i) => ({ ...x, i })).filter((x) => x.si === si);
          const dim = cc.dimLocked && rows.every((x) => x.state === "locked");
          return `
          <div class="csec ${open[si] ? "open" : ""} ${dim ? "dim" : ""}">
            <button type="button" class="csec-head" data-csec="${si}">
              <span>${cc.numbered ? `${si + 1}. ` : ""}${sec.title}</span>${icon(open[si] ? "expand_less" : "expand_more")}
            </button>
            ${
              open[si]
                ? `<div class="csec-body">${rows
                    .map(
                      (x) => `
              <button type="button" class="ln-row ${x.state}" data-lesson-i="${x.i}">
                ${kindIcon(x.kind)}
                <span class="ln-title">${x.title}</span>
                ${lessonAction(x)}
              </button>`
                    )
                    .join("")}</div>`
                : ""
            }
          </div>`;
        })
        .join("")}</div>`;
    };
    pushScreen(c.title, build, () => {
      $$("[data-csec]").forEach((b) => {
        b.onclick = () => {
          const si = Number(b.dataset.csec);
          open[si] = !open[si];
          paintStack();
        };
      });
      $$("[data-lesson-i]").forEach((b) => {
        b.onclick = () => {
          const flat = courseItems(cc);
          const x = flat[Number(b.dataset.lessonI)];
          if (x.state === "locked") {
            toast("Сначала пройдите предыдущие уроки", "err");
            return;
          }
          openLesson(c, cc, Number(b.dataset.lessonI));
        };
      });
    });
  }

  function openLesson(c, cc, i) {
    const x = courseItems(cc)[i];
    if (x.kind === "video") openVideoLesson(c, cc, i);
    else openLessonTest(c, cc, i);
  }

  /** Келесі сабаққа өту: ағымдағыны аяқталды деп белгілеп, келесісін ашу */
  function finishLesson(c, cc, i, { goNext = true } = {}) {
    if (i === cc.cur) {
      cc.cur += 1;
      c.done = Math.min(c.total, c.done + 1);
    }
    state.navStack.pop();
    const flat = courseItems(cc);
    if (goNext && flat[i + 1]) openLesson(c, cc, i + 1);
    else paintStack();
  }

  function openVideoLesson(c, cc, i) {
    const x = courseItems(cc)[i];
    const v = { playing: false, t: 0, len: 193, speed: 1, timer: null, note: null };
    const fmt = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
    const sync = () => {
      const time = $("#vTime");
      if (!time) {
        clearInterval(v.timer);
        return;
      }
      time.textContent = `${fmt(v.t)} / ${fmt(v.len)}`;
      $("#vLine").style.width = `${(v.t / v.len) * 100}%`;
      $("#vPlayBig").hidden = v.playing;
      $("#vPlay").innerHTML = icon(v.playing ? "pause" : "play_arrow");
      $("#vSpeed").textContent = `${v.speed}x`;
    };
    const toggle = () => {
      v.playing = !v.playing;
      clearInterval(v.timer);
      if (v.playing)
        v.timer = setInterval(() => {
          v.t = Math.min(v.len, v.t + 0.5 * v.speed);
          if (v.t >= v.len) v.playing = false;
          sync();
        }, 500);
      sync();
    };
    const build = () => `
      <div class="vplayer" id="vPlayer">
        <div class="v-slide">
          <div class="v-cam"><span class="v-logo">i4U</span><span class="v-face"></span><span class="v-tag">${c.title.toUpperCase()}</span></div>
          <div class="v-board">
            <span class="v-bulb">${icon("lightbulb", "material-icons-outlined")}</span>
            <span class="v-subject">${c.title}</span>
            <span class="v-name">${x.title}</span>
          </div>
        </div>
        <button type="button" class="v-big" id="vPlayBig">${icon("play_arrow")}</button>
        <div class="v-ctrl left">
          <button type="button" id="vPlay">${icon("play_arrow")}</button>
          <button type="button" id="vMute">${icon("volume_up")}</button>
          <button type="button" id="vSpeed" class="v-speed">1x</button>
        </div>
        <div class="v-ctrl right">
          <span id="vTime">0:00 / 3:13</span>
          <button type="button" id="vFull">${icon("open_in_full")}</button>
        </div>
        <div class="v-line"><i id="vLine"></i></div>
      </div>
      ${v.note ? `<div class="v-note">${icon("description", "material-icons-outlined")}<span>${v.note}</span>${icon("check_circle")}</div>` : ""}`;
    const footer = () => `
      <div class="sticky-foot lesson-foot">
        <button type="button" class="attach-row" id="vAttach">
          <span class="attach-plus">${icon(v.note ? "check" : "add")}</span>
          <span>${v.note ? "Конспект прикреплён" : "Прикрепите конспект"}</span>
        </button>
        <button type="button" class="save-btn" id="vNext">Келесі сабақ</button>
      </div>`;
    pushScreen(
      x.title,
      build,
      () => {
        $("#vPlayBig").onclick = toggle;
        $("#vPlay").onclick = toggle;
        $("#vMute").onclick = (e) => {
          const b = e.currentTarget;
          const muted = b.textContent.includes("off");
          b.innerHTML = icon(muted ? "volume_up" : "volume_off");
        };
        $("#vSpeed").onclick = () => {
          v.speed = v.speed === 1 ? 1.5 : v.speed === 1.5 ? 2 : 1;
          sync();
        };
        $("#vFull").onclick = () => toast("Полноэкранный режим");
        $("#vAttach").onclick = () =>
          openAttachSheet((name) => {
            v.note = name;
            const t = v.t;
            paintStack();
            v.t = t;
            sync();
            toast("Конспект прикреплён");
          });
        $("#vNext").onclick = () => {
          clearInterval(v.timer);
          finishLesson(c, cc, i);
        };
        sync();
      },
      { footer }
    );
  }

  function openAttachSheet(onFile) {
    openSheet(`
      <div class="sheet-handle"></div>
      <div class="sheet-title attach-title">Прикрепить конспект</div>
      <button type="button" class="attach-opt" data-accept="image/jpeg,image/png,image/webp,image/heic,.heic">
        ${icon("photo_library", "material-icons-outlined")}
        <span><b>Галерея</b><small>JPEG, PNG, WebP, HEIC</small></span>
      </button>
      <button type="button" class="attach-opt" data-accept="application/pdf,.pdf">
        ${icon("picture_as_pdf", "material-icons-outlined")}
        <span><b>Файл</b><small>PDF</small></span>
      </button>
      <input type="file" id="attachInput" hidden />`);
    $$("[data-accept]").forEach((b) => {
      b.onclick = () => {
        const input = $("#attachInput");
        input.accept = b.dataset.accept;
        input.onchange = () => {
          const f = input.files[0];
          if (!f) return;
          closeSheet();
          onFile(f.name);
        };
        input.click();
      };
    });
  }

  function openLessonTest(c, cc, i) {
    const x = courseItems(cc)[i];
    const bank = MOCK.lessonTests[c.id] || MOCK.practice[c.id]?.questions || MOCK.lessonTests[15];
    const T = { i: 0, picks: bank.map(() => null), done: x.state === "done" };
    const answered = () => T.picks.filter((p) => p != null).length;
    const score = () => T.picks.filter((p, k) => p === bank[k].answer).length;
    if (T.done) T.picks = bank.map((q, k) => (k % 4 === 3 ? (q.answer + 1) % q.options.length : q.answer));
    const build = () => {
      if (T.done) {
        return `
          <div class="tr-result">
            <div class="tr-score"><b>${score()}</b> / ${bank.length}</div>
            <div class="tr-sub">${score() === bank.length ? "Отлично! Все ответы верные." : "Результат теста"}</div>
          </div>
          <div class="list-pad">${bank
            .map((q, k) => {
              const ok = T.picks[k] === q.answer;
              return `<div class="tr-item ${ok ? "ok" : "bad"}">
                <div class="tr-q"><span class="tr-n">${k + 1}</span>${q.q}</div>
                <div class="tr-a">${icon(ok ? "check_circle" : "cancel")}<span>${q.options[q.answer]}</span></div>
              </div>`;
            })
            .join("")}</div>`;
      }
      const q = bank[T.i];
      return `
        <div class="tq-nums">${bank
          .map((_, k) => `<button type="button" class="tq-num ${k === T.i ? "on" : T.picks[k] != null ? "ans" : ""}" data-qn="${k}">${k + 1}</button>`)
          .join("")}</div>
        <div class="tq-body">
          <div class="tq-q">${q.q}</div>
          ${q.options
            .map(
              (o, k) =>
                `<button type="button" class="tq-opt ${T.picks[T.i] === k ? "on" : ""}" data-tq="${k}"><span class="tq-radio"></span><span>${o}</span></button>`
            )
            .join("")}
        </div>`;
    };
    const footer = () => {
      if (T.done)
        return `<div class="sticky-foot"><button type="button" class="save-btn" id="tqBack">${x.state === "done" ? "Назад к урокам" : "Келесі сабақ"}</button></div>`;
      const pct = Math.round((answered() / bank.length) * 100);
      const last = T.i === bank.length - 1;
      return `
        <div class="tq-foot">
          <div class="tq-prog"><span class="tq-pill" style="left:calc(${pct}% * 0.88)">${pct}%</span><i style="width:${pct}%"></i></div>
          <div class="tq-nav">
            <button type="button" class="tq-btn" id="tqPrev" ${T.i === 0 ? "disabled" : ""}>${icon("arrow_circle_left", "material-icons-outlined")}Назад</button>
            <button type="button" class="tq-btn ${last ? "finish" : ""}" id="tqNext">${last ? "Завершить" : "Вперёд"}${icon(last ? "check_circle" : "arrow_circle_right", "material-icons-outlined")}</button>
          </div>
        </div>`;
    };
    pushScreen(
      x.title,
      build,
      () => {
        $$("[data-qn]").forEach((b) => (b.onclick = () => ((T.i = Number(b.dataset.qn)), paintStack())));
        $$("[data-tq]").forEach((b) => (b.onclick = () => ((T.picks[T.i] = Number(b.dataset.tq)), paintStack())));
        $("#tqPrev") && ($("#tqPrev").onclick = () => ((T.i -= 1), paintStack()));
        $("#tqNext") &&
          ($("#tqNext").onclick = async () => {
            if (T.i < bank.length - 1) {
              T.i += 1;
              paintStack();
              return;
            }
            if (answered() < bank.length) {
              const ok = await confirmDialog({
                title: "Завершить тест?",
                message: `Отвечено ${answered()} из ${bank.length}. Неотвеченные вопросы будут засчитаны как неверные.`,
                confirmLabel: "Завершить",
              });
              if (!ok) return;
            }
            T.done = true;
            paintStack();
          });
        $("#tqBack") &&
          ($("#tqBack").onclick = () => {
            if (x.state === "done") {
              state.navStack.pop();
              paintStack();
            } else finishLesson(c, cc, i);
          });
        $(".tq-num.on")?.scrollIntoView({ inline: "center", block: "nearest" });
      },
      { footer }
    );
  }

  function plural(n, one, few, many) {
    const m10 = n % 10;
    const m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }

  function renderSchedule() {
    const S = MOCK.schedule;
    const per = state.schedPeriod;
    const label = per === "day" ? S.day : per === "week" ? S.week : S.month;
    const badge = (w) =>
      w === "today"
        ? `<span class="sch-badge ok">Сегодня</span>`
        : w === "overdue"
          ? `<span class="sch-badge bad">Просрочено</span>`
          : `<span class="sch-badge">${w}</span>`;
    const items = S.items.filter((x) => x.period.includes(per));
    const f = state.schedFilter;
    const card = (e) => `
          <button type="button" class="sch-card" data-lesson="${e.lesson}" data-course="${e.course}">
            ${lessonIcon(e.kind)}
            <div style="flex:1;min-width:0">
              <div class="sch-course">${e.course}</div>
              <div class="sch-lesson">${e.lesson}</div>
              <div class="sch-tags"><span>${e.kind === "test" ? "Тест" : "Видео"}</span><span>Нед. ${e.week}</span></div>
            </div>
            ${badge(e.when)}
          </button>`;
    const stats = `
      <div class="sch-stats">
        <button type="button" class="sch-stat ${f === "today" ? "on" : ""}" data-sfilter="today" style="--c:#5CB36D"><b>${S.stats.today}</b><span>Сегодня</span></button>
        <button type="button" class="sch-stat ${f === "week" ? "on" : ""}" data-sfilter="week" style="--c:#6C7FD8"><b>${S.stats.week}</b><span>На неделе</span></button>
        <button type="button" class="sch-stat ${f === "overdue" ? "on" : ""}" data-sfilter="overdue" style="--c:#E86B6B"><b>${S.stats.overdue}</b><span>Просрочено</span></button>
      </div>`;
    if (f) {
      const list = f === "today" ? S.items.filter((x) => x.when === "today") : f === "week" ? S.weekList : S.overdueList;
      const title = { today: "Уроки на сегодня", week: "Уроки на неделе", overdue: "Просроченные уроки" }[f];
      return `${stats}
        <div class="sch-list-head"><span>${title}</span><button type="button" id="toCalendar">К календарю</button></div>
        <div class="list-pad" style="padding-top:0">${list.map(card).join("")}</div>`;
    }
    return `${stats}
      <div class="seg-tabs seg-3 sch-seg">
        ${[["day", "День"], ["week", "Неделя"], ["month", "Месяц"]]
          .map(([k, l]) => `<button type="button" data-period="${k}" class="${per === k ? "on" : ""}">${l}</button>`)
          .join("")}
      </div>
      <div class="sch-nav">
        <button type="button" class="sch-arrow" data-shift="-1">${icon("chevron_left")}</button>
        <b>${label}</b>
        <button type="button" class="sch-arrow" data-shift="1">${icon("chevron_right")}</button>
      </div>
      <div class="list-pad" style="padding-top:0">${items.map(card).join("")}</div>`;
  }

  function renderMyCourses() {
    const tab = state.courseSeg || "courses";
    return `
      <div class="seg-tabs courses-seg">
        <button type="button" class="${tab === "courses" ? "on" : ""}" data-seg="courses">Курсы</button>
        <button type="button" class="${tab === "schedule" ? "on" : ""}" data-seg="schedule">Расписание</button>
      </div>
      ${
        tab === "schedule"
          ? renderSchedule()
          : `<div class="list-pad" style="padding-top:12px">${MOCK.myCourses
              .map(
                (c) => `
            <button type="button" class="purchase-row" data-course-id="${c.id}">
              <div class="purchase-top">
                <div class="purchase-thumb">
                  ${posterHtml(c.poster)}
                  <div class="purchase-days">Осталось ${c.days} ${plural(c.days, "день", "дня", "дней")}</div>
                </div>
                <div style="flex:1;min-width:0;text-align:left">
                  <div class="purchase-title">${c.title}</div>
                  <div class="purchase-meta">Всего ${c.total} ${plural(c.total, "урок", "урока", "уроков")}</div>
                  <div class="purchase-meta">Пройдено ${c.done} ${plural(c.done, "урок", "урока", "уроков")}</div>
                </div>
              </div>
              <div class="purchase-bar"><i style="width:${(c.done / c.total) * 100}%"></i></div>
            </button>`
              )
              .join("")}</div>`
      }`;
  }

  function findStudent(id) {
    for (const g of MOCK.groups) {
      const s = g.students.find((x) => x.id === id);
      if (s) return s;
    }
    return MOCK.students.find((x) => x.id === id);
  }

  function appbarHtml() {
    if (state.profileStudent) {
      return `
        <button type="button" class="appbar-back" id="backBtn">${icon("arrow_back")}</button>
        <div class="appbar-title" style="flex:1">Ученик</div>
        <button type="button" class="appbar-profile" id="curatorAvatar">${icon("person")}</button>`;
    }
    if (state.mode === "student") {
      const titles = ["Главная", "Новости", "Уведомления", "Мои курсы"];
      return `
        <div class="appbar-title" style="flex:1">${titles[state.tab] || "Главная"}</div>
        <button type="button" class="appbar-profile" id="curatorAvatar">${icon("person")}</button>`;
    }
    if (state.tab === 2) {
      return `
        <div class="appbar-title-row" id="addPush">${icon("add")}<span class="appbar-title">Отправить пуш</span></div>
        <button type="button" class="appbar-profile" id="curatorAvatar">${icon("person")}</button>`;
    }
    return `
      <div class="appbar-title" style="flex:1">${["Аналитика", "Эфир", "", "Мои группы"][state.tab]}</div>
      <button type="button" class="appbar-profile" id="curatorAvatar">${icon("person")}</button>`;
  }

  function render() {
    $("#appbar").innerHTML = appbarHtml();
    const content = $("#content");

    if (state.profileStudent) {
      content.innerHTML = renderProfile(state.profileStudent);
      $("#backBtn").onclick = () => {
        state.profileStudent = null;
        render();
      };
      $("#curatorAvatar")?.addEventListener("click", openUserProfile);
      return;
    }

    if (state.mode === "student") {
      if (state.tab === 0) content.innerHTML = renderStudentHome();
      else if (state.tab === 1) content.innerHTML = renderNews();
      else if (state.tab === 2) content.innerHTML = renderStudentNotifs();
      else content.innerHTML = renderMyCourses();
      bindStudentContent();
      return;
    }

    if (state.tab === 0) content.innerHTML = renderStaffAnalytics();
    else if (state.tab === 1) content.innerHTML = renderEfir();
    else if (state.tab === 2) content.innerHTML = renderPushes();
    else content.innerHTML = renderGroups();

    bindContent();
  }

  function bindStudentContent() {
    $("#curatorAvatar")?.addEventListener("click", openUserProfile);
    $("#openCoursesTab")?.addEventListener("click", () => {
      state.courseSeg = "schedule";
      setTab(3);
    });
    $("#openBanner")?.addEventListener("click", () =>
      openInner("Баннер", `<div class="empty">Бір платформа — барлық пәндер</div>`)
    );
    $$("[data-service]").forEach((btn) => {
      btn.onclick = () => openService(btn.dataset.service, btn.dataset.title);
    });
    $$("[data-lesson]").forEach((btn) => {
      btn.onclick = () =>
        openInner(
          btn.dataset.lesson,
          `<div class="list-pad"><div class="news-card"><div class="n-title">${btn.dataset.course}</div><div class="n-body">${btn.dataset.lesson}</div></div></div>`
        );
    });
    $$("[data-news]").forEach((btn) => {
      btn.onclick = () => {
        const n = MOCK.news.find((x) => x.id === Number(btn.dataset.news));
        if (!n) return;
        openInner(n.title, `<div class="list-pad news-open">${newsThumb(n.thumb)}<div class="news-card" style="margin-top:12px"><div class="n-body">${n.body}</div></div></div>`);
      };
    });
    $$("[data-push]").forEach((btn) => {
      btn.onclick = () => {
        const n = MOCK.studentNotifs.find((x) => x.id === Number(btn.dataset.push));
        if (!n) return;
        openInner(n.title, `<div class="list-pad"><div class="push-row"><img src="assets/v2/notification.png" alt="" /><span class="push-line"></span><span><span class="push-when">${n.when}</span><span class="push-title">${n.title}</span><span class="push-body">${n.body}</span></span></div></div>`);
      };
    });
    $$("[data-course-id]").forEach((btn) => {
      btn.onclick = () => {
        const c = MOCK.myCourses.find((x) => x.id === Number(btn.dataset.courseId));
        if (!c) return;
        state.navStack = [];
        openCourse(c);
      };
    });
    $$("[data-seg]").forEach((btn) => {
      btn.onclick = () => {
        state.courseSeg = btn.dataset.seg;
        render();
      };
    });
    $$("[data-period]").forEach((btn) => {
      btn.onclick = () => {
        state.schedPeriod = btn.dataset.period;
        render();
      };
    });
    $$("[data-sfilter]").forEach((btn) => {
      btn.onclick = () => {
        state.schedFilter = state.schedFilter === btn.dataset.sfilter ? null : btn.dataset.sfilter;
        render();
      };
    });
    $("#toCalendar")?.addEventListener("click", () => {
      state.schedFilter = null;
      render();
    });
    $$("[data-shift]").forEach((btn) => {
      btn.onclick = () => toast(btn.dataset.shift === "1" ? "Следующий период" : "Предыдущий период");
    });
  }

  function bindContent() {
    $$("[data-toggle-group]").forEach((el) => {
      el.onclick = () => {
        const id = Number(el.dataset.toggleGroup);
        state.expandedGroupId = state.expandedGroupId === id ? null : id;
        render();
      };
    });
    $$("[data-toggle-enroll]").forEach((el) => {
      el.onclick = () => {
        const id = Number(el.dataset.toggleEnroll);
        state.expandedEnrollmentId = state.expandedEnrollmentId === id ? null : id;
        render();
      };
    });
    $$("[data-download]").forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const group = MOCK.groups.find((g) => g.id === Number(btn.dataset.download));
        if (group) openRatingSheet(group);
      };
    });
    $$("[data-champ-photo]").forEach((el) => {
      el.onclick = (e) => {
        e.stopPropagation();
        pickChampPhoto(Number(el.dataset.champPhoto));
      };
    });
    $$("[data-student-id]").forEach((row) => {
      row.onclick = () => {
        const id = Number(row.dataset.studentId);
        const group = MOCK.groups.find((g) => g.students?.some((x) => x.id === id));
        const s = findStudent(id);
        if (s) openStaffStudent(s, group);
      };
    });

    $$("[data-group-card]").forEach((card) => {
      const group = MOCK.groups.find((g) => g.id === Number(card.dataset.groupCard));
      bindLongPress(card, () => groupMenu(group, card));
    });
    $$("[data-enroll-card]").forEach((card) => {
      const item = MOCK.enrollments.find((e) => e.id === Number(card.dataset.enrollCard));
      bindLongPress(card, () => enrollmentMenu(item, card));
    });
    $$("[data-student-card]").forEach((card) => {
      const item = MOCK.students.find((s) => s.id === Number(card.dataset.studentCard));
      bindLongPress(card, () => studentMenu(item, card));
    });

    bindSearch("#studentSearch", (v) => {
      state.searchStudents = v;
      render();
    });
    bindSearch("#enrollSearch", (v) => {
      state.searchEnroll = v;
      render();
    });

    $("#studentFilter")?.addEventListener("click", () =>
      openFilterSheet({
        title: "Фильтр студентов",
        value: MOCK.filters.studentBlocked,
        options: [
          { value: null, label: "Все" },
          { value: "0", label: "Активные" },
          { value: "1", label: "Заблокированные" },
        ],
        onApply: (v) => {
          MOCK.filters.studentBlocked = v;
        },
      })
    );
    $("#enrollFilter")?.addEventListener("click", () =>
      openFilterSheet({
        title: "Фильтр зачислений",
        value: MOCK.filters.enrollmentStatus,
        options: [
          { value: null, label: "Все" },
          { value: "waiting", label: "Ожидает" },
          { value: "not_started", label: "Не начат" },
          { value: "active", label: "Активен" },
          { value: "ended", label: "Завершён" },
        ],
        onApply: (v) => {
          MOCK.filters.enrollmentStatus = v;
        },
      })
    );

    $("#sendPush")?.addEventListener("click", openPushSheet);
    $("#addPush")?.addEventListener("click", openPushSheet);
    $("#efirDate")?.addEventListener("click", () =>
      openDatePicker(state.efirDate, (d) => {
        state.efirDate = d;
        render();
      })
    );
    $("#efirAdd")?.addEventListener("click", openEfirForm);
    $$("[data-an-group]").forEach((b) => {
      b.onclick = () => openGroupAnalytics(MOCK.groups.find((g) => g.id === Number(b.dataset.anGroup)));
    });
    $("#efirCreate")?.addEventListener("click", openEfirForm);
    $$("[data-efir-del]").forEach((b) => {
      b.onclick = async () => {
        const ok = await confirmDialog({ title: "Удалить эфир?", message: "Студенты больше не увидят этот эфир.", confirmLabel: "Удалить", danger: true });
        if (!ok) return;
        MOCK.efirs = MOCK.efirs.filter((e) => e.id !== Number(b.dataset.efirDel));
        render();
      };
    });
    $("#addGroup")?.addEventListener("click", () => openGroupForm());
    $("#addEnroll")?.addEventListener("click", () => openEnrollmentForm());
    $("#curatorAvatar")?.addEventListener("click", openUserProfile);
  }

  /* —— Телефонды жылжыту және кішірейту (компьютерде) —— */
  const view = { x: 0, y: 0, scale: 1 };
  function applyView() {
    const stage = $("#phoneStage");
    const small = window.matchMedia("(max-width: 440px)").matches;
    stage.style.transform = small ? "" : `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
    $("#zoomVal").textContent = `${Math.round(view.scale * 100)}%`;
    try {
      localStorage.setItem("phoneView", JSON.stringify(view));
    } catch {}
  }
  function initPhoneView() {
    try {
      Object.assign(view, JSON.parse(localStorage.getItem("phoneView") || "{}"));
    } catch {}
    const clamp = (v) => Math.min(1.6, Math.max(0.4, Math.round(v * 100) / 100));
    const stage = $("#phoneStage");
    const phone = $(".phone");
    $$("[data-zoom]").forEach((b) => (b.onclick = () => ((view.scale = clamp(view.scale + Number(b.dataset.zoom) * 0.1)), applyView())));
    $("#zoomReset").onclick = () => (Object.assign(view, { x: 0, y: 0, scale: 1 }), applyView());
    // Рамкадан (немесе «шоқыдан») ұстап жылжыту
    phone.addEventListener("pointerdown", (e) => {
      if (e.target !== phone && !e.target.classList.contains("phone-notch")) return;
      e.preventDefault();
      const sx = e.clientX - view.x;
      const sy = e.clientY - view.y;
      phone.setPointerCapture(e.pointerId);
      stage.classList.add("dragging");
      const move = (ev) => ((view.x = ev.clientX - sx), (view.y = ev.clientY - sy), applyView());
      const up = () => {
        stage.classList.remove("dragging");
        phone.removeEventListener("pointermove", move);
        phone.removeEventListener("pointerup", up);
      };
      phone.addEventListener("pointermove", move);
      phone.addEventListener("pointerup", up);
    });
    // Бұрыштан тартып өлшемін өзгерту
    const grip = $("#phoneResize");
    grip.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      const r = phone.getBoundingClientRect();
      const s0 = view.scale;
      const d0 = Math.hypot(e.clientX - r.left, e.clientY - r.top);
      grip.setPointerCapture(e.pointerId);
      const move = (ev) => {
        view.scale = clamp((s0 * Math.hypot(ev.clientX - r.left, ev.clientY - r.top)) / d0);
        applyView();
      };
      const up = () => {
        grip.removeEventListener("pointermove", move);
        grip.removeEventListener("pointerup", up);
      };
      grip.addEventListener("pointermove", move);
      grip.addEventListener("pointerup", up);
    });
    phone.addEventListener("dblclick", (e) => {
      if (e.target === phone) (Object.assign(view, { x: 0, y: 0, scale: 1 }), applyView());
    });
    window.addEventListener("resize", applyView);
    applyView();
  }

  function init() {
    initPhoneView();
    const week = currentIsoWeek();
    state.periodStart = week.start;
    state.periodEnd = week.end;
    MOCK.enrollments.forEach((e) => {
      if (!e.dateIso && e.date) {
        const [d, m, y] = e.date.split(".");
        e.dateIso = `${y}-${m}-${d}`;
      }
    });

    const time = $("#statusTime");
    const tick = () => {
      const n = new Date();
      time.textContent = `${pad(n.getHours())}:${pad(n.getMinutes())}`;
    };
    tick();
    setInterval(tick, 30000);

    $$(".nav-item").forEach((btn) => {
      btn.addEventListener("click", () => setTab(Number(btn.dataset.tab)));
    });
    $("#navFab").addEventListener("click", openCenterAction);
    $("#overlay").addEventListener("click", (e) => {
      if (e.target.id === "overlay") closeSheet();
    });
    $$(".chip-mode").forEach((btn) => {
      btn.addEventListener("click", () => setMode(btn.dataset.mode));
    });
    // По умолчанию — студент; staff: .../mobile-mock/#staff
    setMode(location.hash === "#staff" ? "staff" : "student");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
