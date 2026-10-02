(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const NAV_STAFF = [
    { out: "assignment", fill: "assignment", outClass: "material-icons-outlined", fillClass: "material-icons-round", label: "Зачисления" },
    { out: "people_outline", fill: "people", outClass: "material-icons-round", fillClass: "material-icons-round", label: "Студенты" },
    { out: "notifications_none", fill: "notifications", outClass: "material-icons-round", fillClass: "material-icons-round", label: "Уведомления" },
    { out: "groups", fill: "groups", outClass: "material-icons-outlined", fillClass: "material-icons-round", label: "Мои группы" },
  ];
  const NAV_STUDENT = [
    { out: "home", fill: "home", outClass: "material-icons-outlined", fillClass: "material-icons-round", label: "Главная" },
    { out: "newspaper", fill: "newspaper", outClass: "material-icons-outlined", fillClass: "material-icons-round", label: "Новости" },
    { out: "notifications_none", fill: "notifications", outClass: "material-icons-round", fillClass: "material-icons-round", label: "Уведомление" },
    { out: "menu_book", fill: "menu_book", outClass: "material-icons-outlined", fillClass: "material-icons-round", label: "Мои курсы" },
  ];
  const CHIPS_STAFF = ["Зачисления", "Студенты", "Уведомления", "Мои группы"];
  const CHIPS_STUDENT = ["Главная", "Новости", "Уведомления", "Мои курсы"];

  const state = {
    mode: "staff",
    tab: 3,
    expandedGroupId: 1,
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
  }
  function closeScreen() {
    const el = $("#screenOverlay");
    el.hidden = true;
    el.className = "screen-overlay";
    el.innerHTML = "";
  }

  function showActionMenu(anchorEl, items) {
    closeMenu();
    const phone = $(".phone .app").getBoundingClientRect();
    const rect = anchorEl.getBoundingClientRect();
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
    if (state.mode === "student") {
      if (fabCore) {
        fabCore.innerHTML = `<img src="assets/logo/ai3.png" alt="" width="22" height="22" />`;
      }
    } else if (fabCore) {
      fabCore.innerHTML = `<span class="material-icons-round" id="fabIcon">live_tv</span>`;
    }
    $("#navFab").title = state.mode === "student" ? "AI" : "Эфир";
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
      MOCK.pushes.unshift({
        id: nextId(),
        title,
        body,
        time: "сейчас",
        audience: audienceLabel,
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
      <div class="appbar ${student ? "appbar-inner" : ""} ${page.centered ? "appbar-centered" : ""}">
        <button type="button" class="appbar-back" id="innerBack">${icon("arrow_back")}</button>
        <div class="appbar-title" style="flex:1">${page.title}</div>
        ${page.right || (student ? "" : `<button type="button" class="appbar-profile" id="innerProfile">${icon("person")}</button>`)}
      </div>
      <div class="content ${page.cls || ""}">${page.build()}</div>
      ${page.footer ? page.footer() : ""}`;
    $("#innerBack").onclick = () => {
      state.navStack.pop();
      if (!state.navStack.length) closeScreen();
      else paintStack();
    };
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
      if (tab === "history") {
        return `${head}<div class="list-pad" style="padding-top:16px">
          <div class="news-card"><div class="n-title">Пробный ЕНТ</div><div class="n-body">86 баллов · 20 сентября</div></div>
          <div class="news-card"><div class="n-title">Пробный ЕНТ</div><div class="n-body">79 баллов · 6 сентября</div></div>
        </div>`;
      }
      if (tab === "stats") {
        return `${head}<div class="list-pad" style="padding-top:16px">
          <div class="stat-tile"><div class="stat-val">86</div><div class="stat-lbl">лучший балл</div></div>
          <div class="stat-tile" style="margin-top:8px"><div class="stat-val">2</div><div class="stat-lbl">попытки</div></div>
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
          ${card({ emoji: "🎓", tint: "#4a3a40", label: "Всего курсов", value: `${A.courses.done} из ${A.courses.total}`, bar: pct(A.courses.done, A.courses.total), meta: "Осталось посмотреть: 0 тестов", open: "courses" })}
          ${card({ emoji: "👆", tint: "#4f4834", label: "Просмотрено всего уроков", value: `${A.lessons.done} из ${A.lessons.total}`, meta: `Осталось посмотреть: ${A.lessons.total - A.lessons.done} уроков` })}
          ${card({ emoji: "📝", tint: "#34485a", label: "Пройдено всего тестов", value: `${A.tests.done} из ${A.tests.total}`, meta: `Осталось сдать: ${A.tests.total - A.tests.done} тестов` })}
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
          state.courseSeg = "courses";
          setTab(3);
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
    $("#startEnt") &&
      ($("#startEnt").onclick = () => {
        openSheet(`
          <div class="sheet-handle"></div>
          <div class="sheet-title">Пробный ЕНТ</div>
          <div class="sheet-sub">5 предметов · 120 вопросов. Время начнётся после старта.</div>
          <div class="sheet-actions"><button type="button" class="btn btn-primary" id="entGo" style="width:100%">Начать</button></div>`);
        $("#entGo").onclick = () => {
          closeSheet();
          pushScreen("Пробный ЕНТ", () => `<div class="empty">Вопрос 1 из 120<br><br>История</div>`);
        };
      });
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
    if (state.mode === "student") openAiScreen();
    else openEfirScreen();
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

  function openUserProfile() {
    const me = MOCK.me;
    const inStaff = state.mode === "staff";
    const accent = inStaff ? "#5B6EC2" : "#25AB7C";
    const staffToggle = me.canStaff
      ? `
      <div class="menu-block">
        ${menuRow({
          iconName: inStaff ? "school" : "admin_panel_settings",
          title: inStaff ? "Вернуться в приложение" : "Админ-панель",
          accent,
          action: "toggleStaff",
        })}
      </div>`
      : "";

    const el = $("#screenOverlay");
    el.hidden = false;
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
            <div class="user-avatar" style="background:${me.color}">${me.initials}</div>
            <div class="user-name">${me.firstName} ${me.lastName}</div>
          </div>
        </div>
        <div class="menu-block">
          ${menuRow({ iconName: "info", title: "О компании I4U", action: "about" })}
          <div class="menu-divider"></div>
          ${menuRow({ iconName: "description", title: "Условия и положения", action: "terms" })}
          <div class="menu-divider"></div>
          ${menuRow({ iconName: "security", title: "Политика конфиденциальности", action: "privacy" })}
        </div>
        <div class="menu-block">
          ${menuRow({ iconName: "headset_mic", title: "Помощь и поддержка", action: "help" })}
          <div class="menu-divider"></div>
          ${menuRow({ iconName: "restore", iconClass: "material-icons-round", title: "Восстановить покупки", action: "restore" })}
          <div class="menu-divider"></div>
          <div class="menu-row switch-row">
            <span class="menu-ico material-icons-outlined">dark_mode</span>
            <span class="menu-title">Тёмная тема</span>
            <button type="button" class="toggle ${state.darkTheme ? "on" : ""}" id="themeToggle" aria-label="Тёмная тема"></button>
          </div>
          <div class="menu-divider"></div>
          <div class="menu-row switch-row">
            <span class="menu-ico material-icons-round">language</span>
            <span class="menu-title">Выберите язык</span>
            <div class="lang-switch">
              <button type="button" class="lang-chip ${state.lang === "ru" ? "active" : ""}" data-lang="ru">РУС</button>
              <button type="button" class="lang-chip ${state.lang === "kk" ? "active" : ""}" data-lang="kk">ҚАЗ</button>
            </div>
          </div>
        </div>
        <div class="menu-block">
          ${menuRow({ leading: igSvg(), title: "Наш Instagram", action: "instagram" })}
          <div class="menu-divider"></div>
          ${menuRow({ leading: waSvg(), title: "Написать в WhatsApp", action: "whatsapp" })}
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
        $$("[data-lang]", el).forEach((b) => b.classList.toggle("active", b.dataset.lang === state.lang));
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

  function renderGroups() {
    return `
      <div class="longpress-hint">Долгое нажатие / ПКМ — меню</div>
      <div class="list-pad">
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
                <span class="pill">${g.studentsCount} учеников</span>
                <span class="chevron">${icon("keyboard_arrow_down")}</span>
              </div>
              <div class="group-body">
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

  function renderPushes() {
    return `
      <div class="list-pad">
        <button type="button" class="btn btn-primary" id="sendPush" style="width:100%;margin-bottom:12px">
          ${icon("add")} Отправить пуш
        </button>
        ${MOCK.pushes
          .map(
            (p) => `
          <div class="card push-card">
            <div class="push-title">${p.title}</div>
            <div class="push-body">${p.body}</div>
            <div class="push-time">${p.time} · ${p.audience}</div>
          </div>`
          )
          .join("")}
      </div>`;
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
      <div class="poster ${variant}" style="background:${p.bg}">
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
    return `
      <div class="sch-stats">
        <div class="sch-stat"><b style="color:#5CB36D">${S.stats.today}</b><span>Сегодня</span></div>
        <div class="sch-stat"><b style="color:#6C7FD8">${S.stats.week}</b><span>На неделе</span></div>
        <div class="sch-stat"><b style="color:#E86B6B">${S.stats.overdue}</b><span>Просрочено</span></div>
      </div>
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
      <div class="list-pad" style="padding-top:0">
        ${items
          .map(
            (e) => `
          <button type="button" class="sch-card" data-lesson="${e.lesson}" data-course="${e.course}">
            ${lessonIcon(e.kind)}
            <div style="flex:1;min-width:0">
              <div class="sch-course">${e.course}</div>
              <div class="sch-lesson">${e.lesson}</div>
              <div class="sch-tags"><span>${e.kind === "test" ? "Тест" : "Видео"}</span><span>Нед. ${e.week}</span></div>
            </div>
            ${badge(e.when)}
          </button>`
          )
          .join("")}
      </div>`;
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
    if (state.tab === 3) {
      return `
        <div class="appbar-title-row" id="addGroup">${icon("add")}<span class="appbar-title">добавить группу</span></div>
        <button type="button" class="appbar-profile" id="curatorAvatar">${icon("person")}</button>`;
    }
    if (state.tab === 0) {
      return `
        <div class="appbar-title-row" id="addEnroll">${icon("add")}<span class="appbar-title">добавить</span></div>
        <button type="button" class="appbar-profile" id="curatorAvatar">${icon("person")}</button>`;
    }
    if (state.tab === 2) {
      return `
        <div class="appbar-title-row" id="addPush">${icon("add")}<span class="appbar-title">уведомление</span></div>
        <button type="button" class="appbar-profile" id="curatorAvatar">${icon("person")}</button>`;
    }
    return `
      <div class="appbar-title" style="flex:1">Студенты</div>
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

    if (state.tab === 0) content.innerHTML = renderEnrollments();
    else if (state.tab === 1) content.innerHTML = renderStudents();
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
        openInner(
          c.title,
          `<div class="list-pad">
            <div class="course-hero">${posterHtml(c.poster)}</div>
            <div class="news-card" style="margin-top:12px"><div class="n-body">Всего ${c.total} ${plural(c.total, "урок", "урока", "уроков")}<br>Пройдено ${c.done}</div></div>
            ${["Урок 1. Введение", "Урок 2. Практика", "Урок 3. Зачёт"]
              .map(
                (name) => `<button type="button" class="cat-row" data-open="${name}"><span>${name}</span><span class="material-icons-round chev">chevron_right</span></button>`
              )
              .join("")}
          </div>`
        );
        $$("[data-open]").forEach((row) => {
          row.onclick = () => pushScreen(row.dataset.open, () => `<div class="empty">${row.dataset.open}</div>`);
        });
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
    $$("[data-student-id]").forEach((row) => {
      row.onclick = () => {
        const s = findStudent(Number(row.dataset.studentId));
        if (s) {
          state.profileStudent = s;
          render();
        }
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
    $("#addGroup")?.addEventListener("click", () => openGroupForm());
    $("#addEnroll")?.addEventListener("click", () => openEnrollmentForm());
    $("#curatorAvatar")?.addEventListener("click", openUserProfile);
  }

  function init() {
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
