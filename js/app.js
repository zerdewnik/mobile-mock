(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const NAV_STAFF = [
    { out: "home", fill: "home", outClass: "material-icons-outlined", fillClass: "material-icons-round", label: "Главная" },
    { out: "newspaper", fill: "newspaper", outClass: "material-icons-outlined", fillClass: "material-icons-round", label: "Новости" },
    { out: "groups", fill: "groups", outClass: "material-icons-outlined", fillClass: "material-icons-round", label: "Группы" },
    { out: "how_to_reg", fill: "how_to_reg", outClass: "material-icons-outlined", fillClass: "material-icons-round", label: "Зачисление" },
  ];
  const NAV_STUDENT = [
    { out: "home", fill: "home", outClass: "material-icons-outlined", fillClass: "material-icons-round", label: "Главная" },
    { out: "newspaper", fill: "newspaper", outClass: "material-icons-outlined", fillClass: "material-icons-round", label: "Новости" },
    { out: "groups", fill: "groups", outClass: "material-icons-outlined", fillClass: "material-icons-round", label: "Группы" },
    { out: "menu_book", fill: "menu_book", outClass: "material-icons-outlined", fillClass: "material-icons-round", label: "Мои курсы" },
  ];
  const CHIPS_STAFF = ["Главная", "Новости", "Группы", "Зачисление"];
  const CHIPS_STUDENT = ["Главная", "Новости", "Группы", "Мои курсы"];

  const state = {
    mode: "staff",
    tab: 3,
    expandedGroupId: null,
    efirDate: new Date(2026, 9, 3),
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
    staffRole: "curator",
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

  /** Элементті тек өз контейнерінің ішінде ортаға жылжыту (бүкіл бетті/телефонды жылжытпайды) */
  function centerIn(el, axis) {
    if (!el) return;
    let p = el.parentElement;
    const can = (n) => {
      const st = getComputedStyle(n);
      return axis === "x" ? /(auto|scroll)/.test(st.overflowX) && n.scrollWidth > n.clientWidth : /(auto|scroll)/.test(st.overflowY) && n.scrollHeight > n.clientHeight;
    };
    while (p && !can(p)) p = p.parentElement;
    if (!p || p === document.body || p === document.documentElement) return;
    const er = el.getBoundingClientRect(), pr = p.getBoundingClientRect();
    if (axis === "x") p.scrollLeft += er.left - pr.left - (pr.width - er.width) / 2;
    else p.scrollTop += er.top - pr.top - (pr.height - er.height) / 2;
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
    // Ұзақ басудан кейінгі «click» жаңалықты/картаны ашпауы үшін
    const fire = onLongPress;
    onLongPress = (x) => {
      el.dataset.lp = "1";
      fire(x);
    };
    el.addEventListener(
      "click",
      (e) => {
        if (el.dataset.lp === "1") {
          delete el.dataset.lp;
          e.stopImmediatePropagation();
          e.preventDefault();
        }
      },
      true
    );
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
    $("#roleSwitch").hidden = mode !== "staff";
    state.profileStudent = null;
    closeSheet();
    closeMenu();
    closeDialog();
    closeScreen();
    paintTabChips();
    setTab(0, { skipClose: true });
    if (toastMsg) toast(toastMsg, "ok");
  }

  function setTab(index, { skipClose } = {}) {
    if (state.mode === "staff" && index === 3 && state.staffRole !== "head") index = 0;
    state.tab = index;
    state.sub = null;
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
            ${visibleGroups().map((g) => `<option value="${g.id}">${g.name}</option>`).join("")}
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
      ];
      const head = `<div class="seg-tabs">${tabs
        .map(([k, l]) => `<button type="button" data-svctab="${k}" class="${tab === k ? "on" : ""}">${l}</button>`)
        .join("")}</div>`;
      const attempts = MOCK.entAttempts || [];
      if (tab === "history") {
        const ents = MOCK.entAttempts.length + (MOCK.entSeeded ? 0 : 2);
        return `${head}<div class="list-pad cl-list hist-list" style="padding-top:16px">
          <button type="button" class="hist-row ent" data-hist="ent">
            <span class="hist-ico">${icon("workspace_premium", "material-icons-outlined")}</span>
            <span style="flex:1;min-width:0"><b>Пробный ЕНТ</b><small>${ents} ${plural(ents, "тапсыру", "тапсыру", "тапсыру")} · разбор және сертификат</small></span>
            ${icon("chevron_right")}
          </button>
          <div class="t3-sec" style="margin:16px 2px 10px">Пәндер</div>
          ${MOCK.myCourses
            .map((c) => {
              const done = courseTests(c).filter((x) => x.done);
              const avg = done.length ? Math.round(done.reduce((t, x) => t + x.score, 0) / done.length) : null;
              return `<button type="button" class="hist-row" data-hist="${c.id}">
                <div class="cl-poster">${posterHtml(c.poster, "sq")}</div>
                <span style="flex:1;min-width:0"><b>${c.title}</b><small>${done.length} ${plural(done.length, "тест", "теста", "тестов")} сдано${avg != null ? ` · средний ${avg}%` : ""}</small></span>
                ${icon("chevron_right")}
              </button>`;
            })
            .join("")}
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
          ${trainerList()
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
    if (id === "tournament") {
      return `<div class="list-pad tour" style="padding-top:12px">${tourSegHtml(tournaments(), false)}</div>`;
    }
    if (id === "battle") {
      const B = battleState();
      const duels = MOCK.duels || [];
      const win = duels.filter((d) => d.win).length;
      let streak = 0;
      for (const d of duels) { if (d.win) streak++; else break; }
      const seg = state.btSeg || "play";
      const head = `
        <div class="bt-stats">
          <div><b>${B.rating}</b><small>Батл рейтингі</small></div>
          <div><b>${win}<i>/</i>${duels.length - win}</b><small>Жеңіс / жеңіліс</small></div>
          <div><b>${streak ? "🔥" + streak : "—"}</b><small>Серия</small></div>
        </div>
        <div class="seg-tabs bt-seg">
          <button type="button" data-btseg="play" class="${seg === "play" ? "on" : ""}">Ойнау${B.incoming.length ? ` · ${B.incoming.length}` : ""}</button>
          <button type="button" data-btseg="hist" class="${seg === "hist" ? "on" : ""}">Тарих · ${duels.length}</button>
        </div>`;
      if (seg === "hist")
        return `<div class="list-pad tour" style="padding-top:12px">${head}
          ${duels.length ? duels.map((d, i) => `
            <div class="bt-h ${d.win ? "w" : "l"}">
              <span class="bt-h-res">${d.win ? "Жеңіс" : "Жеңіліс"}</span>
              ${avatarHtml(d.opp)}
              <div style="flex:1;min-width:0"><b>${d.opp.name}</b><small>${d.opp.groupName ? `${d.opp.groupName} · ` : ""}${d.subjectTitle} · ${d.date}</small></div>
              <span class="bt-h-sc">${d.my}<i>:</i>${d.op}</span>
              <button type="button" class="bt-re" data-btre="${i}" title="Реванш">${icon("replay")}</button>
            </div>`).join("") : `<div class="empty">Әзірге батл болмады</div>`}
        </div>`;
      return `
        <div class="list-pad tour" style="padding-top:12px">${head}
          <div class="t3-sec">Топтар шайқасы</div>
          ${warCardHtml()}
          <div class="t3-sec">Жекпе-жек</div>
          <button type="button" class="bt-btn rand wide" id="btRandom">${icon("sports_kabaddi")}<b>Өз тобымнан қарсылас</b><small>Деңгейі жақын сыныптас</small>${icon("chevron_right")}</button>
          ${B.incoming.length ? `<div class="t3-sec">Саған шақыру · ${B.incoming.length}</div>${B.incoming.map((c, i) => `
            <div class="bt-inv">${avatarHtml(c.opp)}<div style="flex:1;min-width:0"><b>${c.opp.name}</b><small>${c.subjectTitle} · ${c.left} қалды</small></div>
              <button type="button" class="bt-no" data-btno="${i}">${icon("close")}</button><button type="button" class="bt-yes" data-btyes="${i}">Қабылдау</button></div>`).join("")}` : ""}
          ${B.outgoing.length ? `<div class="t3-sec">Жауап күтуде</div>${B.outgoing.map((c) => `<div class="bt-inv wait">${avatarHtml(c.opp)}<div style="flex:1;min-width:0"><b>${c.opp.name}</b><small>${c.subjectTitle} · сен ${c.my} ұпай жинадың · ${c.left} қалды</small></div>${icon("hourglass_top", "material-icons-outlined")}</div>`).join("")}` : ""}
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
          ${card({ emoji: "📝", tint: "#34485a", label: "Пройдено всего тестов", value: `${T.done} из ${T.total}`, bar: pct(T.done, T.total), meta: `Средний результат: ${T.avg}% · осталось сдать ${T.total - T.done}`, open: "tests" })}
          ${card({ emoji: "📋", tint: "#454a5c", label: "Пройдено пробных тестов", value: `${mockAttempts().length}`, meta: mockAttempts()[0]?.total != null ? `Последний: ${mockAttempts()[0].total} / 140` : "", open: "mock" })}
        </div>`;
    }
    if (id === "shop") return shopHtml();
    return `<div class="empty">Скоро</div>`;
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
        keys,
        ans: { ...E.ans },
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
        centerIn($(".tq-num.on"), "x");
        centerIn($(".ent-sub.on"), "x");
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

  /* ============================================================
     ТУРНИР және ЖЕКПЕ-ЖЕК (тренажёр сұрақтарымен)
     Жекпе-жек: 1-раунд Жеңіл 5×1, 2-раунд Орта 5×2, 3-раунд HARD 3×3 (макс 24)
     ============================================================ */
  const T_SUBJ = { 10: "english", 11: "world_history", 12: "biology", 13: "geography", 14: "informatics", 15: "mathematics" };
  const DUEL_ROUNDS = [
    { name: "Жеңіл", n: 5, pts: 1, cls: "easy" },
    { name: "Орта", n: 5, pts: 2, cls: "mid" },
    { name: "HARD", n: 3, pts: 3, cls: "hard" },
  ];
  const DUEL_MAX = DUEL_ROUNDS.reduce((t, r) => t + r.n * r.pts, 0);
  const stageName = (n) => ({ 16: "1/16 финал", 8: "1/8 финал", 4: "1/4 финал", 2: "Жартылай финал", 1: "Финал" })[n] || `${n * 2} қатысушы`;
  const firstName = (p) => (!p ? "—" : p.me ? "Сен" : p.name.split(" ")[0]);

  function simMatch(m) {
    const sc = (p, k) => Math.max(2, Math.min(DUEL_MAX, Math.round(DUEL_MAX * (0.3 + (p.score || 0) / 160) * (0.75 + rnd(p.id, k, 31) * 0.5))));
    m.sa = sc(m.a, (m.b.id || 1) * 7);
    m.sb = sc(m.b, (m.a.id || 1) * 13);
    if (m.sa === m.sb) m.sb -= 1;
    m.w = m.sa > m.sb ? m.a : m.b;
  }
  /* —— Турнирлер: куратор ашады, оқушы тіркеледі —— */
  /** Куратор курсы → ЕНТ банкіндегі пән кілті */
  const STAFF_SUBJ = { 10: "world_history", 11: "mathematics", 12: "law_basics", 13: "history_kz", 14: "chemistry", 15: "biology", 16: "english" };
  const COURSE_TITLE = { 10: "Дүниежүзі тарихы", 11: "Математика", 12: "Құқық негіздері", 13: "Қазақстан тарихы", 14: "Химия", 15: "Биология", 16: "Ағылшын тілі" };
  const TOUR_ME = () => ({ id: 0, name: `${MOCK.me.firstName} ${MOCK.me.lastName}`, initials: (MOCK.me.firstName[0] + MOCK.me.lastName[0]).toUpperCase(), color: "#5B6EC2", score: 60, me: true });
  const STAGE_DAYS = { 1: "1 күн", 2: "2 күн", 3: "3 күн" };

  /** Олимпиялық жүйе: тіркелгендер жұпқа бөлінеді, тақ болса — BYE (автоматты өтеді) */
  function buildBracket(T) {
    const ps = T.participants.map((p) => ({ p, r: rnd(p.id + 3, T.id * 17) })).sort((a, b) => a.r - b.r).map((x) => x.p);
    let size = 2;
    while (size < ps.length) size *= 2;
    // BYE: алғашқы k оқушы қарсыласысыз келесі кезеңге өтеді
    let byes = size - ps.length;
    const seeded = [];
    ps.forEach((p) => {
      seeded.push(p);
      if (byes > 0) seeded.push(null), byes--;
    });
    ps.splice(0, ps.length, ...seeded);
    const r0 = [];
    for (let i = 0; i < size; i += 2) {
      const m = { a: ps[i], b: ps[i + 1], sa: null, sb: null, w: null };
      if (!m.a || !m.b) m.w = m.a || m.b, (m.bye = true);
      r0.push(m);
    }
    T.size = size;
    T.rounds = [r0];
  }
  function tourAdvance(T) {
    for (;;) {
      const cur = T.rounds[T.rounds.length - 1];
      const meIn = cur.some((m) => !m.w && (m.a?.me || m.b?.me));
      cur.forEach((m) => !m.w && !(m.a?.me || m.b?.me) && simMatch(m));
      if (cur.some((m) => !m.w)) return;
      if (cur.length === 1) return void ((T.champion = cur[0].w), (T.status = "finished"));
      const next = [];
      for (let i = 0; i < cur.length; i += 2) next.push({ a: cur[i].w, b: cur[i + 1].w, sa: null, sb: null, w: null });
      T.rounds.push(next);
      if (meIn) return;
    }
  }
  /** Барлық кезеңді аяғына дейін ойнату (архив үшін) */
  function finishAll(T) {
    for (;;) {
      const cur = T.rounds[T.rounds.length - 1];
      cur.forEach((m) => !m.w && simMatch(m));
      if (cur.length === 1) return void ((T.champion = cur[0].w), (T.status = "finished"));
      const next = [];
      for (let i = 0; i < cur.length; i += 2) next.push({ a: cur[i].w, b: cur[i + 1].w, sa: null, sb: null, w: null });
      T.rounds.push(next);
    }
  }
  function startTournament(T) {
    if (T.format && T.format !== "knockout") return startStandings(T);
    T.status = "running";
    buildBracket(T);
    // Бірінші кезеңнің бір бөлігі ойналып қойған (макет)
    T.rounds[0].forEach((m, i) => !m.w && !(m.a.me || m.b.me) && i % 3 !== 2 && simMatch(m));
  }
  function tournaments() {
    if (!MOCK.tournaments) {
      const g = MOCK.groups[0];
      const me = TOUR_ME();
      const T1 = {
        id: 1,
        title: "Викингтер кубогы",
        organizer: "Диана · куратор",
        groups: [g.id],
        courseId: 10,
        module: "XIX–XX ғ. саяси өзгерістер және революциялар",
        topics: ["ЖАПОНИЯНЫҢ АШЫЛУЫ", "РЕСЕЙДЕГІ АҚПАН РЕВОЛЮЦИЯСЫ, КСРО-НЫҢ ҚҰРЫЛУЫ", "Қытайдағы Синьхай революциясы"],
        regTo: "2026-09-30T23:59",
        start: "2026-10-01T19:00",
        stageDays: 1,
        participants: [me, ...g.students],
        status: "registration",
      };
      startTournament(T1);
      const T2 = {
        id: 2,
        title: "Тарих лигасы · 2-кезең",
        organizer: "Диана · куратор",
        groups: [g.id],
        courseId: 10,
        module: "Бірінші дүниежүзілік соғыстан кейінгі әлем",
        topics: ["Версаль-Вашингтон жүйесі", "Ұлы депрессия"],
        regTo: "2026-10-05T23:59",
        start: "2026-10-06T19:00",
        stageDays: 1,
        participants: g.students.filter((_, i) => i % 2 === 0),
        status: "registration",
      };
      const T0 = {
        id: 3,
        title: "Қыркүйек кубогы",
        organizer: "Диана · куратор",
        groups: [g.id],
        courseId: 10,
        module: "Француз революциясы және XIX ғ. империялар",
        topics: ["Француз революциясы", "Наполеон империясы"],
        regTo: "2026-09-10T23:59",
        start: "2026-09-12T19:00",
        stageDays: 2,
        participants: [me, ...g.students],
        status: "registration",
      };
      startTournament(T0);
      finishAll(T0);
      MOCK.tournaments = [T2, T1, T0];
    }
    return MOCK.tournaments;
  }
  const fmtDT = (s) => {
    const d = new Date(s);
    return `${d.getDate()} ${KZ_MON_SHORT[d.getMonth()]} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const isReg = (T) => T.participants.some((p) => p.me);
  /** Кезеңдер кестесі: басталу күнінен әр кезең stageDays күн */
  function tourStages(T) {
    if (T.format === "swiss")
      return Array.from({ length: T.rounds_n || 5 }, (_, k) => {
        const d = new Date(T.start);
        d.setDate(d.getDate() + k * (T.stageDays || 1));
        return { name: `${k + 1}-раунд`, date: d };
      });
    if (T.format === "arena") return [{ name: `Арена · ${T.arenaHours === 24 ? "1 күн" : `${T.arenaHours} сағат`}`, date: new Date(T.start) }];
    if (T.stageDates && !T.size) {
      const all = [16, 8, 4, 2, 1].filter((x) => x <= (T.firstStage || 8));
      return all.map((m, k) => ({ name: stageName(m), date: new Date(T.stageDates[k]) }));
    }
    let n = T.size || 2;
    if (!T.size) {
      n = 2;
      while (n < Math.max(2, T.participants.length + (isReg(T) ? 0 : 1))) n *= 2;
    }
    const out = [];
    const d0 = new Date(T.start);
    for (let k = 0, m = n / 2; m >= 1; k++, m /= 2) {
      const d = new Date(d0);
      d.setDate(d.getDate() + k * T.stageDays);
      out.push({ name: stageName(m), date: d });
    }
    return out;
  }
  const myMatch = (T) => T.rounds && T.rounds[T.rounds.length - 1].find((m) => !m.w && (m.a?.me || m.b?.me));
  const meOut = (T) => T.rounds && T.rounds.some((r) => r.some((m) => m.w && !m.bye && (m.a?.me || m.b?.me) && !m.w.me));

  function avatarHtml(p, cls = "") {
    if (!p) return `<span class="du-av ${cls}" style="background:#34343c">—</span>`;
    return `<span class="du-av ${cls}" style="background:${p.color}">${p.initials}</span>`;
  }
  /** Турнир беті басы: баннерлер (1–3) болса — карусель, болмаса — жинақы тақырып */
  function tourHeroHtml(T) {
    const bs = T.banners || [];
    if (bs.length)
      return `<div class="th-banners">
        <div class="th-track" id="thTrack">${bs.map((b) => `<div class="th-slide" style="background-image:linear-gradient(0deg,rgba(0,0,0,.75),rgba(0,0,0,.05) 60%),url(${b})"></div>`).join("")}</div>
        <div class="th-copy"><b>${T.title}</b><small>${COURSE_TITLE[T.courseId]} · ${T_FORMATS[T.format || "knockout"].name}</small></div>
        ${bs.length > 1 ? `<div class="th-dots" id="thDots">${bs.map((_, i) => `<i class="${i ? "" : "on"}"></i>`).join("")}</div>` : ""}
      </div>`;
    return `<div class="th-plain">
      <img src="assets/tournament/belt_icon.png" alt="" />
      <div><b>${T.title}</b><small>${COURSE_TITLE[T.courseId]} · ${T_FORMATS[T.format || "knockout"].name}</small></div>
    </div>`;
  }
  function bindHeroSlides() {
    const tr = $("#thTrack");
    if (!tr) return;
    bindSwipe(tr, $("#thDots"));
  }
  function tourRules(T, register) {
    openSheet(`
      <div class="sheet-handle"></div>
      <div class="ex-title">${register ? "Тіркелмес бұрын" : "Турнир ережесі"}</div>
      <div class="ex-block"><div class="ex-l">${icon("sports_kabaddi")}Жекпе-жек</div>
        <div class="tr-rules">${DUEL_ROUNDS.map((r, i) => `<div class="tr-rule ${r.cls}"><b>${i + 1}-раунд · ${r.name}</b><span>${r.n} × ${r.pts} ұпай</span></div>`).join("")}</div>
      </div>
      <div class="ex-block"><ol>
        <li>Сұрақтар тек турнир тақырыптарынан, әр сұраққа 20 секунд</li>
        <li>${T.format === "arena" ? "Арена уақыты ішінде қанша көп ойнасаң — сонша ұпай; 3 жеңістен бастап серия 🔥" : T.format === "swiss" ? `${T.rounds_n || 5} раунд, ешкім шықпайды, ұпайы тең оқушылар кездеседі` : "Жеңілген турнирден шығады, жеңген келесі кезеңге өтеді"}</li>
        <li>Кезең уақытында ойнамасаң — қарсылас өтеді (екеуі де ойнамаса — рейтингі жоғары)</li>
        ${T.checkin ? "<li>Басталардан 30 мин бұрын «Қатысамын» деп растау керек</li>" : ""}
        <li>Ұпай тең болса — жылдамырақ жауап берген жеңеді</li>
      </ol></div>
      <div class="sheet-actions ${register ? "btn-row" : ""}">${register ? `<button type="button" class="btn btn-ghost" id="trNo">Болдырмау</button><button type="button" class="btn btn-primary" id="trYes">Танысып шықтым, тіркелу</button>` : `<button type="button" class="btn btn-ghost" id="trNo" style="width:100%">Түсінікті</button>`}</div>`);
    $("#trNo").onclick = closeSheet;
    $("#trYes")?.addEventListener("click", () => {
      T.participants.push(TOUR_ME());
      closeSheet();
      toast("Турнирге тіркелдің!");
      paintStack();
    });
  }

  function bracketHtml(T) {
    const cols = [];
    for (let r = 0, n = T.size / 2; n >= 1; r++, n /= 2) {
      const ms = Array.from({ length: n }, (_, i) => T.rounds[r]?.[i] || null);
      const box = (m) => {
        if (!m) return `<div class="br-m br-empty"><div class="br-p">—</div><div class="br-p">—</div></div>`;
        const row = (p, s) =>
          p
            ? `<div class="br-p ${m.w ? (m.w === p ? "win" : "lose") : ""} ${p.me ? "me" : ""}"><span>${firstName(p)}</span><b>${m.bye ? "" : s ?? ""}</b></div>`
            : `<div class="br-p bye"><span>BYE · автоматты</span></div>`;
        return `<div class="br-m ${!m.w && (m.a?.me || m.b?.me) ? "live" : ""}">${row(m.a, m.sa)}${row(m.b, m.sb)}</div>`;
      };
      const pairs = [];
      for (let i = 0; i < ms.length; i += 2) pairs.push(ms.slice(i, i + 2));
      cols.push(`<div class="br-col"><div class="br-h">${stageName(n)}</div><div class="br-body" style="height:${Math.max(160, (T.size / 2) * 92)}px">${pairs
        .map((p) => `<div class="br-pair ${p.length === 2 ? "two" : ""}">${p.map(box).join("")}</div>`)
        .join("")}</div></div>`);
    }
    cols.push(`<div class="br-col champ-col"><div class="br-h">Чемпион</div><div class="br-body" style="height:${Math.max(160, (T.size / 2) * 92)}px"><div class="br-pair"><div class="br-champ ${T.champion ? "" : "empty"}">
      <span class="br-crown">${icon("workspace_premium")}</span>
      ${T.champion ? `<span class="br-cav" style="background:${T.champion.color}">${T.champion.initials}</span>` : `<span class="br-cav q">?</span>`}
      <b>${T.champion ? firstName(T.champion) : "Чемпион"}</b>
      <small>${T.champion ? "ЧЕМПИОН" : "анықталмады"}</small>
      <img src="assets/tournament/belt.png" alt="" />
    </div></div></div></div>`);
    return `<div class="br">${cols.join("")}</div>`;
  }

  const modLabel = (T) => (T.module.split(" · ").length > 1 ? `${T.module.split(" · ").length} модуль` : T.module);
  function tourCard(T, staff = false) {
    const st = { registration: ["reg", "Тіркелу ашық"], running: ["live", "Өтіп жатыр"], finished: ["done", "Аяқталды"], cancelled: ["off", "Тоқтатылды"] }[T.status];
    const cur = T.rounds?.[T.rounds.length - 1];
    let line;
    if (T.status === "registration") line = `${icon("event", "material-icons-outlined")}${countdown(T.start) ? `Басталуына ${countdown(T.start)}` : `Тіркелу ${fmtDT(T.regTo)} дейін`} · ${T.participants.length} тіркелді`;
    else if (T.status === "running" && T.standings) line = `${icon("bolt")}${T_FORMATS[T.format].name} · ${T.standings.length} қатысушы`;
    else if (T.status === "running") line = `${icon("bolt")}${stageName(cur.length)} · ${staff ? `${cur.filter((m) => m.w).length}/${cur.length} жекпе-жек өтті` : myMatch(T) ? "сенің кезегің!" : "жұптар ойнап жатыр"}`;
    else if (T.status === "cancelled") line = `${icon("block", "material-icons-outlined")}Куратор тоқтатты · ${fmtDT(T.start)}`;
    else line = `${icon("emoji_events", "material-icons-outlined")}Чемпион: ${T.champion?.me ? "Сен" : T.champion?.name} · ${fmtDT(T.start)}`;
    return `
      <button type="button" class="t3-card" data-tour="${T.id}">
        <img class="t3-ico ${T.status === "cancelled" ? "off" : ""}" src="assets/tournament/belt_icon.png" alt="" />
        <div class="t3-body">
          <div class="t3-top"><span class="t3-badge ${st[0]}">${st[1]}</span>${isReg(T) && T.status === "registration" ? `<span class="t3-badge ok">${icon("check")}Тіркелдің</span>` : ""}</div>
          <div class="t3-title">${T.title}</div>
          <div class="t3-sub">${COURSE_TITLE[T.courseId]} · ${modLabel(T)}</div>
          <div class="t3-line">${line}</div>
        </div>
        ${icon("chevron_right")}
      </button>`;
  }

  /** Турнирлер екіге бөлінеді: Белсенді (тіркелу + өтіп жатыр) / Архив */
  function tourSegHtml(list, staff) {
    const seg = state.tourSeg || "active";
    const act = list.filter((t) => t.status === "registration" || t.status === "running");
    const arc = list.filter((t) => t.status === "finished" || t.status === "cancelled" && staff);
    const sec = (title, arr) => (arr.length ? `<div class="t3-sec">${title}</div>${arr.map((t) => tourCard(t, staff)).join("")}` : "");
    return `
      <div class="seg-tabs tour-seg">
        <button type="button" data-tseg="active" class="${seg === "active" ? "on" : ""}">Белсенді · ${act.length}</button>
        <button type="button" data-tseg="archive" class="${seg === "archive" ? "on" : ""}">Архив · ${arc.length}</button>
      </div>
      ${
        seg === "active"
          ? sec("Тіркелу ашық", act.filter((t) => t.status === "registration")) + sec("Өтіп жатыр", act.filter((t) => t.status === "running")) || `<div class="empty">Белсенді турнир жоқ</div>`
          : arc.map((t) => tourCard(t, staff)).join("") || `<div class="empty">Архив бос</div>`
      }`;
  }
  function bindTourSeg(repaint) {
    $$("[data-tseg]").forEach((b) => (b.onclick = () => ((state.tourSeg = b.dataset.tseg), repaint())));
  }

  function tournamentHtml(head) {
    const list = tournaments();
    const sec = (title, arr) => (arr.length ? `<div class="t3-sec">${title}</div>${arr.map(tourCard).join("")}` : "");
    const duels = MOCK.duels || [];
    return `${head}
      <div class="list-pad tour">
        ${tourSegHtml(list, false)}
        <div class="t3-panel">
          <div class="t3-panel-h"><img src="assets/tournament/duel.svg" alt="" /><div><b>Сыныптасыңды жарысқа шақыр</b><span>Тренажёр пәндері бойынша достық жекпе-жек</span></div></div>
          <button type="button" class="btn3d" id="duelInvite">${icon("person_add", "material-icons-outlined")}Жарысқа шақыру</button>
          ${duels
            .slice(0, 5)
            .map((d) => `<div class="tr-hist">${avatarHtml(d.opp)}<div style="flex:1;min-width:0"><b>${d.opp.name}</b><small>${d.subjectTitle} · ${d.date}</small></div><span class="${d.win ? "up" : "down"}">${d.my} : ${d.op}</span></div>`)
            .join("")}
        </div>
      </div>`;
  }

  /** Турнир беті: ұйымдастырушы, пән/модуль/тақырып, топтар, кесте, тіркелу, жекпе-жек */
  function openTournament(T, { staff = false } = {}) {
    const build = () => {
      const stages = tourStages(T);
      const groups = T.allStudents ? "Барлық оқушылар" : T.groups.map((id) => MOCK.groups.find((g) => g.id === id)?.name).join(", ");
      const cur = T.rounds?.[T.rounds.length - 1];
      const mm = myMatch(T);
      const opp = mm && (mm.a.me ? mm.b : mm.a);
      let action = "";
      if (staff) {
        action =
          T.status === "registration"
            ? `<button type="button" class="btn3d" id="tStart">${icon("play_arrow")}Тіркелуді жабу және бастау</button>
               <button type="button" class="btn3d ghost danger" id="tDel">${icon("delete_outline", "material-icons-outlined")}Турнирді өшіру</button>`
            : T.status === "running"
              ? `<button type="button" class="btn3d ghost danger" id="tStop">${icon("block", "material-icons-outlined")}Турнирді тоқтату</button>`
              : `<div class="t3-ok out">${icon("inventory_2", "material-icons-outlined")}<div><b>Архивте</b><span>${T.status === "cancelled" ? "Турнир тоқтатылған" : `Чемпион: ${T.champion?.name || "—"}`}</span></div></div>
                 <button type="button" class="btn3d ghost danger" id="tDel">${icon("delete_outline", "material-icons-outlined")}Архивтен өшіру</button>`;
      } else if (T.status === "registration") {
        action = isReg(T)
          ? `<div class="t3-ok">${icon("check_circle")}<div><b>Сен тіркелдің</b><span>Турнир ${fmtDT(T.start)} басталады.${T.checkin ? " Басталардан 30 мин бұрын «Қатысамын» деп растау керек." : ""}</span></div></div>
             <button type="button" class="btn3d ghost" id="tUnreg">Тіркелуден бас тарту</button>`
          : `<button type="button" class="btn3d" id="tReg">${icon("how_to_reg", "material-icons-outlined")}Тіркелу</button>`;
      } else if (T.standings && T.status === "running" && isReg(T)) {
        const me = T.standings.find((r) => r.p.me);
        const place = [...T.standings].sort((a, b) => b.pts - a.pts || b.w - a.w).indexOf(me) + 1;
        action = `<div class="tr-vs">
            <div class="tr-vs-h">${T_FORMATS[T.format].name}${T.format === "swiss" ? ` · ${T.round}-раунд / ${T.rounds_n}` : ` · ${T.arenaHours === 24 ? "1 күн" : `${T.arenaHours} сағ`}`}</div>
            <div class="sd-me"><div><b>${place}</b><small>орын</small></div><div><b>${me.pts}</b><small>ұпай</small></div><div><b>${me.w}/${me.l}</b><small>жеңіс/жеңіліс</small></div>${T.format === "arena" ? `<div><b>${me.streak ? "🔥" + me.streak : "—"}</b><small>серия</small></div>` : ""}</div>
            <button type="button" class="btn3d" id="tStGame">${icon("sports_kabaddi")}${T.format === "arena" ? "Келесі ойын" : "Раундты ойнау"}</button>
          </div>`;
      } else if (T.champion?.me) action = `<div class="t3-ok gold"><img src="assets/tournament/belt_icon.png" alt="" /><div><b>Сен чемпионсың!</b><span>${T.title} сенікі</span></div></div>`;
      else if (mm)
        action = `
          <div class="tr-vs">
            <div class="tr-vs-h">Сенің жекпе-жегің · ${stageName(cur.length)}</div>
            <div class="tr-vs-row">
              <div class="tr-vs-p">${avatarHtml(mm.a.me ? mm.a : mm.b, "lg")}<b>Сен</b></div>
              <img class="tr-vs-x" src="assets/tournament/duel.svg" alt="VS" />
              <div class="tr-vs-p">${avatarHtml(opp, "lg")}<b>${opp.name}</b><small>рейтингте ${opp.rank}-орын</small></div>
            </div>
            <div class="tr-vs-meta">3 раунд · 13 сұрақ · макс ${DUEL_MAX} ұпай · ${stages.find((s) => s.name === stageName(cur.length))?.date.getDate()} ${KZ_MON_SHORT[new Date(T.start).getMonth()]} дейін</div>
            <button type="button" class="btn3d" id="tourPlay">${icon("sports_kabaddi")}Жекпе-жекті бастау</button>
          </div>`;
      else if (meOut(T)) action = `<div class="t3-ok out">${icon("flag", "material-icons-outlined")}<div><b>Сен турнирден шықтың</b><span>Кестені бақылай бер. Келесі турнирде сәттілік!</span></div></div>`;
      else if (T.status === "running" && isReg(T)) action = `<div class="t3-ok">${icon("hourglass_top", "material-icons-outlined")}<div><b>Келесі кезеңді күт</b><span>Басқа жұптар ойнап жатыр</span></div></div>`;
      else if (T.status === "running") action = `<div class="t3-ok out">${icon("visibility", "material-icons-outlined")}<div><b>Сен тіркелмегенсің</b><span>Турнирді бақылай аласың</span></div></div>`;

      const cd = T.status === "registration" ? countdown(T.start) : null;
      return `
        <div class="list-pad tour">
          ${cd ? `<div class="t3-cd">${icon("timer", "material-icons-outlined")}Басталуына: <b>${cd}</b></div>` : ""}
          ${tourHeroHtml(T)}
          ${action}
          <div class="t3-panel">
            <div class="t3-info"><span>${icon("person", "material-icons-outlined")}Ұйымдастырушы</span><b>${T.organizer}</b></div>
            <div class="t3-info"><span>${icon("groups", "material-icons-outlined")}Қатысатын топтар</span><b>${groups}</b></div>
            ${T.module.split(" · ").length > 1 ? `<div class="t3-info col"><span>${icon("menu_book", "material-icons-outlined")}Модульдер · ${T.module.split(" · ").length}</span><div class="t3-chips">${T.module.split(" · ").map((m) => `<i>${m}</i>`).join("")}</div></div>` : `<div class="t3-info"><span>${icon("menu_book", "material-icons-outlined")}Модуль</span><b>${T.module}</b></div>`}
            <div class="t3-info col"><span>${icon("label", "material-icons-outlined")}Тақырыптар</span><div class="t3-chips">${T.topics.map((t) => `<i>${t}</i>`).join("")}</div></div>
            <div class="t3-info"><span>${icon("how_to_reg", "material-icons-outlined")}Тіркелгендер</span><b>${T.participants.length} оқушы</b></div>
          </div>
          <div class="t3-panel">
            <div class="ga-ctitle">Кесте</div>
            <div class="t3-tl">
              <div class="t3-tl-i ${T.status === "registration" ? "cur" : "done"}"><i></i><b>Тіркелу</b><span>${fmtDT(T.regTo)} дейін</span></div>
              ${stages
                .map((s, k) => {
                  const done = T.rounds && T.rounds[k] && T.rounds[k].every((m) => m.w);
                  const now = T.status === "running" && T.rounds && k === T.rounds.length - 1 && !done;
                  return `<div class="t3-tl-i ${done ? "done" : now ? "cur" : ""}"><i></i><b>${s.name}</b><span>${s.date.getDate()} ${KZ_MON_SHORT[s.date.getMonth()]} · ${pad(s.date.getHours())}:${pad(s.date.getMinutes())}</span></div>`;
                })
                .join("")}
            </div>
            <div class="ga-csub" style="margin-top:8px">${T.format === "arena" ? "Уақыт ішінде кез келген сыныптаспен ойнайсың. Ойын саны шектелмейді." : T.format === "swiss" ? "Әр раундта ұпайы жақын оқушымен кездесесің. Ешкім шықпайды." : `Әр кезеңнің уақытын ұйымдастырушы белгілеген.`} ${T.format && T.format !== "knockout" ? "" : "Жұп осы уақыт ішінде ойнамаса — жоғары рейтингтегі оқушы өтеді."}</div>
          </div>
          ${
            T.standings
              ? `<div class="t3-panel"><div class="ga-ctitle">Ұпай кестесі</div><div class="ga-csub">${T.format === "arena" ? "Жеңіс 2 ұпай · 3 жеңістен бастап 🔥 4 ұпай" : "Жеңіс 1 ұпай · келесі раундта ұпайы тең оқушылар кездеседі"}</div>${standingsHtml(T)}</div>`
              : T.rounds
              ? `<div class="t3-panel"><div class="ga-ctitle">Турнир кестесі</div><div class="ga-csub">Жеңімпаз келесі кезеңге өтеді · солға-оңға жылжыт</div><div class="br-scroll">${bracketHtml(T)}</div></div>`
              : `<div class="t3-panel"><div class="ga-ctitle">Тіркелгендер</div><div class="t3-ppl">${T.participants.map((p) => `<span title="${p.name}">${avatarHtml(p)}<small>${firstName(p)}</small></span>`).join("")}</div></div>`
          }
        </div>`;
    };
    pushScreen(T.title, build, () => {
      // (ⓘ ереже — app bar оң жағында)
      $("#tReg")?.addEventListener("click", () => tourRules(T, true));
      $("#tRules")?.addEventListener("click", () => tourRules(T, false));
      bindHeroSlides();
      $("#tUnreg")?.addEventListener("click", () => {
        T.participants = T.participants.filter((p) => !p.me);
        toast("Тіркелуден бас тарттың");
        paintStack();
      });
      $("#tStart")?.addEventListener("click", async () => {
        if (T.participants.length < 2) return toast("Турнир үшін кемінде 2 оқушы тіркелуі керек", "err");
        const ok = await confirmDialog({ title: "Турнирді бастау?", message: `${T.participants.length} оқушы тіркелді. Тіркелу жабылып, жұптар құрылады.`, confirmLabel: "Бастау" });
        if (!ok) return;
        startTournament(T);
        toast("Турнир басталды, жұптар құрылды");
        paintStack();
      });
      $("#tDel")?.addEventListener("click", async () => {
        const ok = await confirmDialog({
          title: T.status === "registration" ? "Турнирді өшіру?" : "Архивтен өшіру?",
          message: T.status === "registration" ? `«${T.title}» өшіріледі. Тіркелген ${T.participants.length} оқушыға хабарлама кетеді.` : `«${T.title}» нәтижелерімен бірге біржола өшіріледі.`,
          confirmLabel: "Өшіру",
          danger: true,
        });
        if (!ok) return;
        MOCK.tournaments = tournaments().filter((x) => x !== T);
        state.navStack.pop();
        paintStack();
        toast("Турнир өшірілді");
      });
      $("#tStop")?.addEventListener("click", async () => {
        const ok = await confirmDialog({ title: "Турнирді тоқтату?", message: "Ойналмаған жекпе-жектер жабылады, турнир «Тоқтатылды» болып архивке түседі.", confirmLabel: "Тоқтату", danger: true });
        if (!ok) return;
        T.status = "cancelled";
        toast("Турнир тоқтатылды — архивте");
        paintStack();
      });
      $("#tStGame")?.addEventListener("click", () => playStandingsGame(T));
      $("#tourPlay")?.addEventListener("click", () => {
        const m = myMatch(T);
        startDuel({ opp: m.a.me ? m.b : m.a, subject: STAFF_SUBJ[T.courseId], subjectTitle: COURSE_TITLE[T.courseId], match: m, T });
      });
      const sc = $(".br-scroll"), live = $(".br-m.live");
      if (sc && live) sc.scrollLeft = Math.max(0, live.offsetLeft - 20);
    }, { right: `<button type="button" class="appbar-icon-btn" id="tRules" title="Ереже">${icon("info", "material-icons-outlined")}</button>` });
  }

  /** Куратор: турнирлер тізімі және жаңа турнир құру */
  function openStaffTournaments() {
    pushScreen(
      "Турниры",
      () => `<div class="list-pad tour">
        ${tourSegHtml(tournaments(), true)}
      </div>`,
      () => {
        $("#tNew").onclick = openTourForm;
        bindTourSeg(paintStack);
        $$("[data-tour]").forEach((b) => (b.onclick = () => openTournament(tournaments().find((t) => t.id === Number(b.dataset.tour)), { staff: true })));
      },
      { right: `<button type="button" class="appbar-add" id="tNew" title="Турнир құру">${icon("add")}</button>` }
    );
  }

  /* —— Турнир форматтары (Challonge / chess.com үлгісімен) —— */
  const T_FORMATS = {
    knockout: { name: "Олимпиялық", icon: "account_tree", desc: "Жұптар, жеңілген шығады. Кезең саны → қатысушылар саны" },
    swiss: { name: "Швейцар жүйесі", icon: "swap_horiz", desc: "Ешкім шықпайды. Әр раундта ұпайы тең оқушылар кездеседі" },
    arena: { name: "Арена", icon: "bolt", desc: "Уақыт ішінде қанша көп ойнасаң — сонша ұпай. Жеңіс сериясына бонус" },
  };
  function countdown(to) {
    const ms = new Date(to) - AN_TODAY;
    if (ms <= 0) return null;
    const d = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5), m = Math.floor((ms % 36e5) / 6e4);
    return d ? `${d} күн ${h} сағ` : `${h} сағ ${m} мин`;
  }
  /** Швейцар/арена: кесте орнына ұпай тізімі */
  function startStandings(T) {
    T.status = "running";
    T.round = 1;
    T.standings = T.participants.map((p) => ({ p, pts: 0, w: 0, l: 0, streak: 0 }));
    T.standings.forEach((r) => {
      if (r.p.me) return;
      const games = T.format === "arena" ? 2 + Math.floor(rnd(r.p.id, T.id, 1) * 5) : 1;
      for (let i = 0; i < games; i++) {
        const win = rnd(r.p.id, T.id, i + 7) < 0.35 + (r.p.score || 0) / 180;
        standingsAdd(T, r, win);
      }
    });
  }
  function standingsAdd(T, r, win) {
    if (win) {
      r.w++;
      r.streak++;
      r.pts += T.format === "arena" ? (r.streak >= 3 ? 4 : 2) : 1;
    } else {
      r.l++;
      r.streak = 0;
    }
  }
  function standingsHtml(T) {
    const rows = [...T.standings].sort((a, b) => b.pts - a.pts || b.w - a.w);
    return `<div class="sd-head"><span>#</span><span>Қатысушы</span><span>Ж/Ж</span><span>Ұпай</span></div>${rows
      .map(
        (r, i) => `<div class="sd-row ${r.p.me ? "me" : ""}"><span class="sd-n ${i < 3 ? "top" : ""}">${i + 1}</span><span class="sd-p">${avatarHtml(r.p)}<b>${firstName(r.p)}</b>${T.format === "arena" && r.streak >= 2 ? `<i class="sd-fire">🔥${r.streak}</i>` : ""}</span><span>${r.w}/${r.l}</span><b>${r.pts}</b></div>`
      )
      .join("")}`;
  }
  function playStandingsGame(T) {
    const me = T.standings.find((r) => r.p.me);
    const others = T.standings.filter((r) => !r.p.me);
    const opp = (T.format === "swiss" ? [...others].sort((a, b) => Math.abs(a.pts - me.pts) - Math.abs(b.pts - me.pts))[0] : others[Math.floor(Math.random() * others.length)]).p;
    startDuel({
      opp,
      subject: STAFF_SUBJ[T.courseId],
      subjectTitle: COURSE_TITLE[T.courseId],
      onDone: (win) => {
        standingsAdd(T, me, win);
        const or = T.standings.find((r) => r.p === opp);
        standingsAdd(T, or, !win);
        if (T.format === "swiss") T.round = Math.min(T.rounds_n || 5, (T.round || 1) + 1);
      },
    });
  }

  function openTourForm() {
    const g0 = visibleGroups()[0] || MOCK.groups[0];
    const iso2 = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const STAGES = [16, 8, 4, 2, 1];
    const f = { step: 0, title: "", format: "knockout", first: 8, swissRounds: 5, arenaHours: 3, groups: new Set([g0.id]), seeding: "rating", checkin: true, courseId: g0.courseId || 10, mods: new Set(), topics: new Set(), regTo: "2026-10-05T23:59", start: "2026-10-06T19:00", gap: 1, dates: {}, banners: [], aud: "groups", prize: 200 };
    const secs = () => (STAFF_SECTIONS[f.courseId] || []).map(([t, items]) => ({ t, topics: items.filter((x) => !x.startsWith("w:")) }));
    const stageList = () => STAGES.filter((n) => n <= f.first);
    const pool = () => MOCK.groups.filter((g) => f.groups.has(g.id)).reduce((t, g) => t + g.studentsCount, 0);
    const cap = () => (f.format === "knockout" ? f.first * 2 : null);
    // Әр кезеңнің уақытын куратор өзі қояды (бір күнде бірнеше кезең болуы мүмкін)
    const stageDate = (k) => {
      if (k === 0) return f.start;
      if (f.dates[k]) return f.dates[k];
      const d = new Date(f.start);
      d.setHours(d.getHours() + k);
      return iso2(d);
    };
    const check = (on) => icon(on ? "check_box" : "check_box_outline_blank");
    const STEPS = ["Негізгі", "Қатысушылар", "Мазмұн", "Уақыт"];
    const valid = (k) =>
      k === 0 ? !!f.title.trim() : k === 1 ? f.groups.size > 0 : k === 2 ? f.mods.size > 0 && f.topics.size > 0 : !!(f.regTo && f.start && new Date(f.start) > new Date(f.regTo));
    const err = ["Атауын жазыңыз", "Кемінде бір топ таңдаңыз", "Модуль мен тақырып таңдаңыз", "Турнир тіркелу аяқталғаннан кейін басталуы керек"];
    const stepHtml = () => {
      if (f.step === 0)
        return `
          <div class="ef-label">Атауы <i>*</i></div>
          <input class="ef-input" id="tfTitle" placeholder="Мысалы: Викингтер кубогы" value="${f.title.replace(/"/g, "&quot;")}" />
          <div class="ef-label">Пән <i>*</i></div>
          <label class="ef-select"><span>${COURSE_TITLE[f.courseId]}</span><select id="tfCourse">${COURSE_IDS.map((id) => `<option value="${id}" ${id === f.courseId ? "selected" : ""}>${COURSE_TITLE[id]}</option>`).join("")}</select>${icon("expand_more")}</label>
          <div class="ef-label">Формат <i>*</i></div>
          <div class="tf-fmts">${Object.entries(T_FORMATS).map(([k, x]) => `<button type="button" class="tf-fmt3 ${f.format === k ? "on" : ""}" data-tffmt="${k}">${icon(x.icon, "material-icons-outlined")}<b>${x.name.replace(" жүйесі", "")}</b></button>`).join("")}</div>
          <div class="tf-sum">${icon("info", "material-icons-outlined")}${T_FORMATS[f.format].desc}</div>
          ${
            f.format === "knockout"
              ? `<div class="tf-row3"><div><div class="ef-label">Кезең саны</div><div class="tf-step"><button type="button" data-tfs="-1" ${f.first <= 2 ? "disabled" : ""}>${icon("remove")}</button><b>${Math.log2(f.first) + 1}</b><button type="button" data-tfs="1" ${f.first >= 16 ? "disabled" : ""}>${icon("add")}</button></div></div><div><div class="ef-label">Қатысушылар</div><div class="tf-cap"><b>${f.first * 2}</b> адам</div></div></div>
                 <div class="tf-sum">${stageList().map(stageName).join(" → ")}</div>`
              : f.format === "swiss"
                ? `<div class="ef-label">Раунд саны</div><div class="tf-step tf-step-w"><button type="button" data-tfr="-1" ${f.swissRounds <= 3 ? "disabled" : ""}>${icon("remove")}</button><b>${f.swissRounds} раунд</b><button type="button" data-tfr="1" ${f.swissRounds >= 9 ? "disabled" : ""}>${icon("add")}</button></div><div class="tf-sum">Қатысушылар саны шектелмейді · жеңіс = 1 ұпай</div>`
                : `<div class="ef-label">Арена ұзақтығы</div><div class="ent-chips">${[1, 3, 24].map((h) => `<button type="button" class="ent-chip ${f.arenaHours === h ? "on" : ""}" style="--c:var(--primary)" data-tfa="${h}">${h === 24 ? "1 күн" : `${h} сағат`}</button>`).join("")}</div><div class="tf-sum">Жеңіс = 2 ұпай, 3 жеңістен бастап серия 🔥 = 4 ұпай</div>`
          }`;
      if (f.step === 1)
        return `
          ${state.staffRole === "head" ? `<div class="ef-label">Кімге ашылады</div>
          <div class="ent-chips">${[["all", "Барлық оқушылар"], ["groups", "Таңдалған топтар"]].map(([k, l]) => `<button type="button" class="ent-chip ${f.aud === k ? "on" : ""}" style="--c:var(--primary)" data-tfaud="${k}">${l}</button>`).join("")}</div>` : ""}
          ${f.aud === "all" ? `<div class="tf-sum">${icon("public", "material-icons-outlined")}Платформадағы барлық ${MOCK.groups.reduce((t, g) => t + g.studentsCount, 0)} оқушыға ашылады (${MOCK.groups.length} топ)</div>` : `<div class="ef-label">Қатысатын топтар <i>*</i></div>`}
          ${f.aud === "all" ? "" : `<div class="ent-chips">${visibleGroups().map((g) => `<button type="button" class="ent-chip ${f.groups.has(g.id) ? "on" : ""}" style="--c:var(--primary)" data-tfg="${g.id}">${g.name} · ${g.studentsCount}</button>`).join("")}</div>`}
          <div class="tf-sum ${cap() && pool() < cap() ? "warn" : ""}">${icon("groups", "material-icons-outlined")}${f.aud === "all" ? "" : `Топтарда ${pool()} оқушы`}${cap() ? (pool() < cap() ? ` — ${cap()} орынға жетпейді, бос орын BYE` : pool() > cap() ? `${f.aud === "all" ? "Алғашқы" : " — алғашқы"} ${cap()} тіркелген қатысады` : " — дәл сай") : f.aud === "all" ? "Қатысушылар саны шектелмейді" : ""}</div>
          <div class="ef-label">Жұптастыру</div>
          <div class="ent-chips">${[["rating", "Рейтинг бойынша"], ["random", "Кездейсоқ"]].map(([k, l]) => `<button type="button" class="ent-chip ${f.seeding === k ? "on" : ""}" style="--c:var(--primary)" data-tfseed="${k}">${l}</button>`).join("")}</div>
          <div class="tf-sum">${f.seeding === "rating" ? "Күштілер бірінші кезеңде кездеспейді (1-орын 16-орынмен ойнайды)" : "Жұптар жеребе арқылы"}</div>
          <div class="nf-toggle-row"><div><b>Check-in</b><small>Басталардан 30 мин бұрын оқушы «Қатысамын» деп растайды; растамағандар кестеге кірмейді</small></div><button type="button" class="toggle ${f.checkin ? "on" : ""}" id="tfCheck"></button></div>
          <div class="ef-label">Жүлде · I4U монета</div>
          <div class="tf-prize">${[100, 200, 500].map((v) => `<button type="button" class="tf-pz ${f.prize === v ? "on" : ""}" data-tfpz="${v}">${COIN}<b>${v}</b></button>`).join("")}</div>
          <div class="tf-podium">${[["🥇 1-орын · чемпион", f.prize, "+ белбеу"], ["🥈 2-орын", f.prize / 2, ""], ["🥉 3-орын", f.prize / 4, ""]].map(([l, c, x]) => `<div><span>${l}</span><b>${c} ${COIN}</b>${x ? `<small>${x}</small>` : ""}</div>`).join("")}</div>`;
      if (f.step === 2) {
        const S = secs();
        const topics = S.filter((x) => f.mods.has(x.t)).flatMap((x) => x.topics.map((t) => ({ t, m: x.t })));
        return `
          <div class="tf-from">${icon("menu_book", "material-icons-outlined")}<b>${COURSE_TITLE[f.courseId]}</b><span>сұрақтар осы пәннің банкінен</span></div>
          <div class="ef-label">Модульдер <i>*</i></div>
          <button type="button" class="ef-select tf-dd ${f.mods.size ? "" : "ph"} ${f.openM ? "open" : ""}" id="tfDdM"><span>${f.mods.size ? [...f.mods].join(", ") : "Модульдерді таңдаңыз"}</span>${f.mods.size ? `<em>${f.mods.size}</em>` : ""}${icon(f.openM ? "expand_less" : "expand_more")}</button>
          ${f.openM ? `<div class="tf-drop"><button type="button" class="t3-all" id="tfAllM">барлығын таңдау</button><div class="tf-checks">${S.map((x) => `<button type="button" class="tf-check ${f.mods.has(x.t) ? "on" : ""}" data-tfm="${x.t.replace(/"/g, "&quot;")}">${check(f.mods.has(x.t))}<span>${x.t}</span></button>`).join("")}</div></div>` : ""}
          <div class="ef-label">Тақырыптар <i>*</i></div>
          <button type="button" class="ef-select tf-dd ${f.topics.size ? "" : "ph"} ${f.openT ? "open" : ""}" id="tfDdT" ${f.mods.size ? "" : "disabled"}><span>${f.topics.size ? [...f.topics].join(", ") : f.mods.size ? "Тақырыптарды таңдаңыз" : "Алдымен модуль таңдаңыз"}</span>${f.topics.size ? `<em>${f.topics.size}</em>` : ""}${icon(f.openT ? "expand_less" : "expand_more")}</button>
          ${f.openT && topics.length ? `<div class="tf-drop"><button type="button" class="t3-all" id="tfAllT">барлығын таңдау</button><div class="tf-checks">${topics.map((x) => `<button type="button" class="tf-check ${f.topics.has(x.t) ? "on" : ""}" data-tft="${x.t.replace(/"/g, "&quot;")}">${check(f.topics.has(x.t))}<span>${x.t}<small>${x.m}</small></span></button>`).join("")}</div></div>` : ""}
          <div class="ef-label">Баннерлер <small class="tf-hint">· 3-ке дейін, басты бетте және турнир бетінде</small></div>
          <div class="tf-bans">${f.banners.map((b, i) => `<div class="tf-ban" style="background-image:url(${b})"><button type="button" data-tfbx="${i}">${icon("close")}</button></div>`).join("")}${f.banners.length < 3 ? `<button type="button" class="tf-ban add" id="tfBanAdd">${icon("add_photo_alternate", "material-icons-outlined")}<span>Қосу</span></button>` : ""}</div>`;
      }
      const sched = f.format === "knockout" ? stageList().map((n, k) => { const d = new Date(stageDate(k)); return `${stageName(n)} — ${d.getDate()} ${KZ_MON_SHORT[d.getMonth()]}`; }).join(" · ") : f.format === "swiss" ? `${f.swissRounds} раунд, әр раунд ${f.gap === 7 ? "аптасына" : `${f.gap} күн сайын`}` : `Басталғаннан ${f.arenaHours === 24 ? "1 күн" : `${f.arenaHours} сағат`} бойы`;
      return `
        <div class="tf-row">
          <div><div class="ef-label">Тіркелу аяқталады <i>*</i></div><input class="ef-input" type="datetime-local" id="tfReg" value="${f.regTo}" /></div>
          <div><div class="ef-label">Турнир басталады <i>*</i></div><input class="ef-input" type="datetime-local" id="tfStart" value="${f.start}" /></div>
        </div>
        ${
          f.format === "knockout"
            ? `<div class="ef-label">Кезеңдердің уақыты</div>
               <div class="tf-stages">${stageList().map((n, k) => `<div class="tf-stage"><span><b>${stageName(n)}</b><small>${n} жұп</small></span><input class="ef-input" type="datetime-local" data-tfd="${k}" value="${stageDate(k)}" ${k === 0 ? "disabled" : ""} /></div>`).join("")}</div>
               <div class="tf-sum">${icon("info", "material-icons-outlined")}Бірінші кезең — «Турнир басталады». Бірнеше кезеңді бір күнге қоюға болады (мысалы 19:00, 20:00, 21:00).</div>`
            : f.format === "swiss"
              ? `<div class="ef-label">Раундтар аралығы</div><div class="ent-chips">${[1, 2, 3, 7].map((d) => `<button type="button" class="ent-chip ${f.gap === d ? "on" : ""}" style="--c:var(--primary)" data-tfgap="${d}">${d === 7 ? "1 апта" : `${d} күн`}</button>`).join("")}</div><div class="tf-sum">${icon("event", "material-icons-outlined")}${sched}</div>`
              : `<div class="tf-sum">${icon("event", "material-icons-outlined")}${sched}</div>`
        }
        <div class="tf-preview">
          ${f.banners.length ? `<div class="tf-pv-ban" style="background-image:url(${f.banners[0]})"></div>` : ""}
          <div class="tf-pv-h"><img src="assets/tournament/belt_icon.png" alt="" /><div><b>${f.title || "Атауы"}</b><small>${T_FORMATS[f.format].name} · ${COURSE_TITLE[f.courseId]}</small></div></div>
          <div class="tf-pv-r"><span>Қатысушылар</span><b>${cap() ? `${cap()} орын` : "шектеусіз"} · ${f.aud === "all" ? "барлық оқушылар" : [...f.groups].map((id) => MOCK.groups.find((g) => g.id === id)?.name).join(", ")}</b></div>
          <div class="tf-pv-r"><span>Тақырыптар</span><b>${f.topics.size} тақырып · ${f.mods.size} модуль</b></div>
          <div class="tf-pv-r"><span>Жұптастыру</span><b>${f.seeding === "rating" ? "рейтинг" : "кездейсоқ"}${f.checkin ? " · check-in" : ""}</b></div>
        </div>`;
    };
    const draw = () => {
      openSheet(
        `
        <div class="sheet-handle"></div>
        <div class="ef-head"><span>Жаңа турнир</span><button type="button" id="tfClose">${icon("close")}</button></div>
        <div class="tf-steps">${STEPS.map((x, k) => `<button type="button" class="tf-sp ${k === f.step ? "on" : k < f.step ? "done" : ""}" data-tfstep="${k}"><i>${k < f.step ? icon("check") : k + 1}</i><span>${x}</span></button>`).join("")}</div>
        <div class="tf-body">${stepHtml()}</div>
        <div class="sheet-actions btn-row">
          ${f.step ? `<button type="button" class="btn btn-ghost" id="tfPrev">Артқа</button>` : `<button type="button" class="btn btn-ghost" id="tfClose2">Болдырмау</button>`}
          <button type="button" class="btn btn-primary" id="tfNext">${f.step === 3 ? "Жариялау" : "Әрі қарай"}</button>
        </div>`,
        { tall: true }
      );
      const keep = () => {
        if ($("#tfTitle")) f.title = $("#tfTitle").value;
        if ($("#tfReg")) f.regTo = $("#tfReg").value;
        if ($("#tfStart")) f.start = $("#tfStart").value;
        $$("[data-tfd]").forEach((i) => !i.disabled && (f.dates[i.dataset.tfd] = i.value));
      };
      const on = (sel, fn) => $$(sel).forEach((b) => (b.onclick = () => (keep(), fn(b), draw())));
      $("#tfClose").onclick = closeSheet;
      $("#tfClose2")?.addEventListener("click", closeSheet);
      on("[data-tffmt]", (b) => (f.format = b.dataset.tffmt));
      on("[data-tfbx]", (b) => f.banners.splice(+b.dataset.tfbx, 1));
      $("#tfBanAdd")?.addEventListener("click", () => {
        keep();
        const inp = document.createElement("input");
        inp.type = "file";
        inp.accept = "image/*";
        inp.multiple = true;
        inp.onchange = () => {
          [...inp.files].slice(0, 3 - f.banners.length).forEach((file) => {
            const img = new Image();
            img.onload = () => {
              const k = Math.min(1, 900 / img.width);
              const cv = document.createElement("canvas");
              cv.width = img.width * k;
              cv.height = img.height * k;
              cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
              f.banners.push(cv.toDataURL("image/jpeg", 0.85));
              draw();
            };
            img.src = URL.createObjectURL(file);
          });
        };
        inp.click();
      });
      on("[data-tfs]", (b) => (f.first = Math.max(2, Math.min(16, b.dataset.tfs === "1" ? f.first * 2 : f.first / 2))));
      on("[data-tfr]", (b) => (f.swissRounds += +b.dataset.tfr));
      on("[data-tfa]", (b) => (f.arenaHours = +b.dataset.tfa));
      on("[data-tfg]", (b) => (f.groups.has(+b.dataset.tfg) ? f.groups.delete(+b.dataset.tfg) : f.groups.add(+b.dataset.tfg)));
      on("[data-tfseed]", (b) => (f.seeding = b.dataset.tfseed));
      on("[data-tfpz]", (b) => (f.prize = +b.dataset.tfpz));
      on("[data-tfaud]", (b) => {
        f.aud = b.dataset.tfaud;
        f.groups = f.aud === "all" ? new Set(MOCK.groups.map((g) => g.id)) : new Set([g0.id]);
      });
      on("#tfCheck", () => (f.checkin = !f.checkin));
      on("#tfDdM", () => ((f.openM = !f.openM), (f.openT = false)));
      on("#tfDdT", () => ((f.openT = !f.openT), (f.openM = false)));
      on("#tfAllM", () => secs().forEach((x) => f.mods.add(x.t)));
      on("#tfAllT", () => secs().filter((x) => f.mods.has(x.t)).forEach((x) => x.topics.forEach((t) => f.topics.add(t))));
      on("[data-tfm]", (b) => {
        const m = b.dataset.tfm;
        if (f.mods.has(m)) (f.mods.delete(m), (secs().find((x) => x.t === m)?.topics || []).forEach((t) => f.topics.delete(t)));
        else f.mods.add(m);
      });
      on("[data-tft]", (b) => (f.topics.has(b.dataset.tft) ? f.topics.delete(b.dataset.tft) : f.topics.add(b.dataset.tft)));
      on("[data-tfgap]", (b) => (f.gap = +b.dataset.tfgap));
      $("#tfCourse")?.addEventListener("change", (e) => (keep(), (f.courseId = +e.target.value), f.mods.clear(), f.topics.clear(), draw()));
      $("#tfStart")?.addEventListener("change", () => (keep(), (f.dates = {}), draw()));
      $$("[data-tfstep]").forEach((b) => (b.onclick = () => {
        keep();
        const k = +b.dataset.tfstep;
        for (let i = 0; i < k; i++) if (!valid(i)) return toast(err[i], "err");
        f.step = k;
        draw();
      }));
      $("#tfPrev")?.addEventListener("click", () => (keep(), f.step--, draw()));
      $("#tfNext").onclick = () => {
        keep();
        if (!valid(f.step)) return toast(err[f.step], "err");
        if (f.step < 3) return (f.step++, draw());
        if (f.format === "knockout") {
          const ds = stageList().map((n, k) => stageDate(k));
          if (ds.some((d, k) => k && new Date(d) <= new Date(ds[k - 1]))) return toast("Әр кезең алдыңғысынан кейін басталуы керек", "err");
        }
        tournaments().unshift({
          id: nextId(),
          title: f.title.trim(),
          format: f.format,
          rounds_n: f.swissRounds,
          arenaHours: f.arenaHours,
          seeding: f.seeding,
          checkin: f.checkin,
          organizer: `${myName()} · ${state.staffRole === "head" ? "бас куратор" : "куратор"}`,
          groups: [...f.groups],
          allStudents: f.aud === "all",
          courseId: f.courseId,
          module: [...f.mods].join(" · "),
          topics: [...f.topics],
          regTo: f.regTo,
          start: f.start,
          stageDays: f.gap,
          firstStage: f.first,
          stageDates: f.format === "knockout" ? stageList().map((n, k) => stageDate(k)) : null,
          banners: [...f.banners],
          prize: f.prize,
          participants: [],
          status: "registration",
        });
        closeSheet();
        const T = tournaments()[0];
        const reach = f.aud === "all" ? MOCK.groups : MOCK.groups.filter((g) => f.groups.has(g.id));
        const fmtD = (v) => { const d = new Date(v); return `${d.getDate()} ${KZ_MON_SHORT[d.getMonth()]} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
        if (reach.some((g) => g.id === MOCK.groups[0].id))
          notify({ type: "tour", title: `Жаңа турнир: ${T.title}`, body: `${COURSE_TITLE[T.courseId]} · ${T_FORMATS[T.format].name}. Тіркелу ${fmtD(T.regTo)} дейін, басталуы ${fmtD(T.start)}. Жүлде — ${T.prize} I4U монета`, go: { tour: T.id } });
        MOCK.pushes.unshift({ title: `Жаңа турнир: ${T.title}`, time: "Қазір", type: "Авто · Турнир", body: `Тіркелу ${fmtD(T.regTo)} дейін`, audience: f.aud === "all" ? "Барлық оқушылар" : reach.map((g) => g.name).join(", "), stats: `${reach.reduce((t, g) => t + g.studentsCount, 0)} / 0` });
        toast(`Турнир жарияланды — ${reach.reduce((t, g) => t + g.studentsCount, 0)} оқушыға хабарлама кетті`);
        paintStack();
      };
    };
    draw();
  }

  async function duelQuestions(subject, seed) {
    const pick = (arr, n, k) => {
      const a = [...arr].sort((x, y) => rnd(seed, k, x.id.length + x.stem.length) - rnd(seed, k, y.id.length + y.stem.length));
      return a.slice(0, n);
    };
    try {
      await loadProbnik();
      const P = window.PROBNIK.subjects[subject];
      const all = Object.values(P.variants).flat().filter((q) => q.type === "single_choice" && !q.ctx && q.options.filter((o) => o.correct).length === 1);
      const easy = all.filter((q) => (q.n || 0) <= 12), mid = all.filter((q) => (q.n || 0) > 12 && q.n <= 25), hard = all.filter((q) => (q.n || 0) > 25);
      const e = pick(easy.length >= 5 ? easy : all, 5, 1), m = pick(mid.length >= 5 ? mid : all, 5, 2), h = pick(hard.length >= 3 ? hard : all, 3, 3);
      return [...e, ...m, ...h].map((q) => ({ stem: q.stem, options: q.options.map((o) => o.content), answer: q.options.findIndex((o) => o.correct) }));
    } catch {
      const bank = Object.values(MOCK.practice).flatMap((p) => p.questions);
      return Array.from({ length: 13 }, (_, i) => {
        const q = bank[i % bank.length];
        return { stem: q.q, options: q.options, answer: q.answer };
      });
    }
  }

  async function startDuel({ opp, subject, subjectTitle, match, T, onDone }) {
    toast("Сұрақтар дайындалуда…");
    const seed = Date.now() % 100000;
    const qs = await duelQuestions(subject, seed);
    const plan = DUEL_ROUNDS.flatMap((r, ri) => Array.from({ length: r.n }, () => ({ ri, pts: r.pts })));
    const D = { i: 0, my: 0, op: 0, myT: 0, opT: 0, pick: null, reveal: false, splash: 0, done: false, left: 20, res: [] };
    const me = { name: "Сен", initials: MOCK.me.initials, color: "#5B6EC2" };
    let timer = null;
    const oppCorrect = (i) => rnd(opp.id, seed, i) < [0.78, 0.6, 0.42][plan[i].ri] * (0.65 + (opp.score || 0) / 220);
    const answer = (k) => {
      if (D.reveal) return;
      clearInterval(timer);
      const q = qs[D.i], p = plan[D.i];
      D.pick = k;
      D.reveal = true;
      const ok = k === q.answer;
      const opOk = oppCorrect(D.i);
      const opTime = 4 + rnd(opp.id, seed, D.i + 50) * 13;
      D.myT += 20 - D.left;
      D.opT += opTime;
      if (ok) D.my += p.pts;
      if (opOk) D.op += p.pts;
      D.res.push({ ok, opOk, ri: p.ri });
      paintStack();
      setTimeout(() => {
        D.reveal = false;
        D.pick = null;
        D.i += 1;
        if (D.i >= plan.length) finish();
        else if (plan[D.i].ri !== plan[D.i - 1].ri) D.splash = plan[D.i].ri;
        else startTimer();
        paintStack();
      }, 1100);
    };
    const startTimer = () => {
      D.left = 20;
      clearInterval(timer);
      timer = setInterval(() => {
        const el = $("#duTime");
        if (!el) return clearInterval(timer);
        D.left -= 1;
        el.textContent = D.left;
        $("#duTimeBar").style.width = `${(D.left / 20) * 100}%`;
        if (D.left <= 0) answer(-1);
      }, 1000);
    };
    const finish = () => {
      clearInterval(timer);
      D.done = true;
      const win = D.my > D.op || (D.my === D.op && D.myT <= D.opT);
      D.win = win;
      (MOCK.duels = MOCK.duels || []).unshift({ opp, my: D.my, op: D.op, win, subjectTitle, date: dmy(new Date()) });
      onDone?.(win, D.my, D.op);
      if (match) {
        const meA = match.a.me;
        match.sa = meA ? D.my : D.op;
        match.sb = meA ? D.op : D.my;
        if (match.sa === match.sb) meA === win ? (match.sb -= 0.5) : (match.sa -= 0.5);
        match.w = win ? (meA ? match.a : match.b) : meA ? match.b : match.a;
        match.sa = Math.ceil(match.sa);
        match.sb = Math.ceil(match.sb);
        tourAdvance(T);
      }
    };
    const scoreBar = () => `
      <div class="du-top">
        <div class="du-side">${avatarHtml(me)}<div><b>Сен</b><span class="du-pts">${D.my}</span></div></div>
        <div class="du-mid"><span class="du-round ${DUEL_ROUNDS[plan[Math.min(D.i, plan.length - 1)].ri].cls}">${plan[Math.min(D.i, plan.length - 1)].ri + 1}-раунд · ${DUEL_ROUNDS[plan[Math.min(D.i, plan.length - 1)].ri].name}</span><small>${subjectTitle}</small></div>
        <div class="du-side r"><div><b>${opp.name.split(" ")[0]}</b><span class="du-pts">${D.op}</span></div>${avatarHtml(opp)}</div>
      </div>
      <div class="du-dots">${plan.map((p, i) => {
        const r = D.res[i];
        return `<i class="${DUEL_ROUNDS[p.ri].cls} ${r ? (r.ok ? "ok" : "bad") : i === D.i ? "cur" : ""}"></i>`;
      }).join("")}</div>`;
    const build = () => {
      if (D.done) {
        const per = DUEL_ROUNDS.map((r, ri) => ({ r, my: D.res.filter((x) => x.ri === ri && x.ok).length * r.pts, op: D.res.filter((x) => x.ri === ri && x.opOk).length * r.pts }));
        return `
          <div class="du-res ${D.win ? "win" : "lose"}">
            <div class="du-res-ico">${D.win ? `<img src="assets/tournament/belt.png" alt="" class="du-belt" />` : icon("sentiment_dissatisfied", "material-icons-outlined")}</div>
            <div class="du-res-t">${D.win ? "Жеңіс!" : "Бұл жолы жеңіліс"}</div>
            <div class="du-res-s">${avatarHtml(me)}<b>${D.my}</b><span>:</span><b>${D.op}</b>${avatarHtml(opp)}</div>
            ${D.my === D.op ? `<div class="du-res-n">Ұпай тең — ${D.win ? "сен" : opp.name.split(" ")[0]} жылдамырақ жауап берді</div>` : ""}
            ${match ? `<div class="du-res-n">${D.win ? "Сен келесі кезеңге өттің!" : "Турнир сен үшін аяқталды"}</div>` : ""}
          </div>
          <div class="list-pad">${per
            .map((x, i) => `<div class="du-rr ${x.r.cls}"><span>${i + 1}-раунд · ${x.r.name}</span><b>${x.my} : ${x.op}</b></div>`)
            .join("")}</div>`;
      }
      if (D.splash) {
        const r = DUEL_ROUNDS[D.splash];
        return `${scoreBar()}<div class="du-splash ${r.cls}"><div class="du-sp-n">${D.splash + 1}-раунд</div><div class="du-sp-t">${r.name}</div><div class="du-sp-s">${r.n} сұрақ · әр сұрақ ${r.pts} ұпай</div><button type="button" class="tr-play" id="duGo">Бастау</button></div>`;
      }
      const q = qs[D.i];
      return `${scoreBar()}
        <div class="du-timer"><i id="duTimeBar" style="width:${(D.left / 20) * 100}%"></i><span id="duTime">${D.left}</span></div>
        <div class="du-q">
          <div class="du-qn">Сұрақ ${D.i + 1} / ${plan.length} · +${plan[D.i].pts} ұпай</div>
          <div class="tq-q">${md(q.stem)}</div>
          ${q.options
            .map((o, k) => {
              let cls = "";
              if (D.reveal && k === q.answer) cls = "ok";
              else if (D.reveal && k === D.pick) cls = "bad";
              return `<button type="button" class="pr-opt ${cls}" data-du="${k}"><span class="pr-radio"></span><span>${md(o)}</span></button>`;
            })
            .join("")}
          ${D.reveal ? `<div class="du-op">${opp.name.split(" ")[0]}: ${D.res[D.res.length - 1].opOk ? `<span class="up">дұрыс жауап берді</span>` : `<span class="down">қателесті</span>`}</div>` : ""}
        </div>`;
    };
    pushScreen(
      "Жекпе-жек",
      build,
      () => {
        renderMath($("#screenOverlay"));
        $$("[data-du]").forEach((b) => (b.onclick = () => answer(Number(b.dataset.du))));
        $("#duGo")?.addEventListener("click", () => {
          D.splash = 0;
          startTimer();
          paintStack();
        });
        $("#duBack")?.addEventListener("click", () => {
          state.navStack.pop();
          paintStack();
        });
        $("#duAgain")?.addEventListener("click", () => {
          state.navStack.pop();
          startDuel({ opp, subject, subjectTitle });
        });
      },
      {
        screenCls: "duel",
        footer: () =>
          D.done
            ? `<div class="sticky-foot rp-foot">${match ? "" : `<button type="button" class="rp-pdf" id="duAgain">${icon("replay")}Реванш</button>`}<button type="button" class="ef-submit" id="duBack" style="margin:0">${match ? "Турнирге оралу" : "Дайын"}</button></div>`
            : "",
      }
    );
    D.splash = 0;
    paintStack();
    startTimer();
  }

  /** Батл: рейтинг (Elo сияқты), келген және жіберілген шақырулар */
  function battleState() {
    if (!MOCK.battle) {
      const st = MOCK.groups[0].students;
      const rg = MOCK.groups.find((g) => g.id !== MOCK.groups[0].id) || MOCK.groups[0];
      MOCK.battle = {
        rating: 1000,
        rival: { group: rg, myPts: 7, theirPts: 9 },
        incoming: [
          { opp: st[1], subjectTitle: "Дүниежүзі Тарихы", subject: "world_history", left: "18 сағ" },
          { opp: st[4], subjectTitle: "Математика", subject: "mathematics", left: "5 сағ" },
        ],
        outgoing: [{ opp: st[2], subjectTitle: "Биология", my: 17, left: "21 сағ" }],
      };
    }
    return MOCK.battle;
  }
  function battleDone(win) {
    if (win) earnCoins(15, "Батлда жеңіс");
    const B = battleState();
    B.rating = Math.max(0, B.rating + (win ? 15 : -10));
  }
  function battleRules() {
    openSheet(`
      <div class="sheet-handle"></div>
      <div class="ex-title">Батл ережесі</div>
      <div class="tr-rules">${DUEL_ROUNDS.map((r, i) => `<div class="tr-rule ${r.cls}"><b>${i + 1}-раунд · ${r.name}</b><span>${r.n} сұрақ × ${r.pts} ұпай</span></div>`).join("")}</div>
      <div class="ex-block" style="margin-top:12px"><ol>
        <li>Әр сұраққа 20 секунд, ұпай тең болса — жылдамырақ жауап берген жеңеді</li>
        <li>Кезекпен ойналады: шақыруға 24 сағат ішінде жауап беру керек, әйтпесе шақырушы жеңеді</li>
        <li>Жеңіс +15 рейтинг, жеңіліс −10</li>
        <li>Басқа топтан қарсыласты жеңсең — «Топтар батлында» тобыңа +1 ұпай</li>
      </ol></div>
      <div class="sheet-actions"><button type="button" class="btn btn-ghost" id="brClose" style="width:100%">Түсінікті</button></div>`);
    $("#brClose").onclick = closeSheet;
  }
  function bindBattle() {
    const B = battleState();
    $$("[data-btseg]").forEach((b) => (b.onclick = () => ((state.btSeg = b.dataset.btseg), paintStack())));
    $("#btRules")?.addEventListener("click", battleRules);
    $("#warOpen")?.addEventListener("click", () => openWar());
    $("#btOther")?.addEventListener("click", () => {
      const g = B.rival.group;
      const opp = { ...g.students[Math.floor(Math.random() * g.students.length)] };
      opp.groupName = g.name;
      const c = MOCK.myCourses.find((x) => T_SUBJ[x.id]);
      toast(`${g.name} тобынан: ${opp.name}`);
      setTimeout(
        () =>
          startDuel({
            opp,
            subject: T_SUBJ[c.id],
            subjectTitle: c.title,
            onDone: (win) => {
              battleDone(win);
              win ? B.rival.myPts++ : B.rival.theirPts++;
            },
          }),
        500
      );
    });
    $("#btRandom")?.addEventListener("click", () => {
      const st = MOCK.groups[0].students;
      const near = [...st].sort((a, b) => Math.abs(a.score - 60) - Math.abs(b.score - 60)).slice(0, 5);
      const opp = near[Math.floor(Math.random() * near.length)];
      const c = MOCK.myCourses.find((x) => T_SUBJ[x.id]);
      toast(`Қарсылас табылды: ${opp.name}`);
      setTimeout(() => startDuel({ opp, subject: T_SUBJ[c.id], subjectTitle: c.title, onDone: battleDone }), 500);
    });
    $$("[data-btyes]").forEach((b) => (b.onclick = () => {
      const c = B.incoming.splice(Number(b.dataset.btyes), 1)[0];
      startDuel({ opp: c.opp, subject: c.subject, subjectTitle: c.subjectTitle, onDone: battleDone });
    }));
    $$("[data-btno]").forEach((b) => (b.onclick = () => {
      B.incoming.splice(Number(b.dataset.btno), 1);
      toast("Шақырудан бас тарттың");
      paintStack();
    }));
    $$("[data-btre]").forEach((b) => (b.onclick = () => {
      const d = MOCK.duels[Number(b.dataset.btre)];
      const c = MOCK.myCourses.find((x) => x.title === d.subjectTitle) || MOCK.myCourses.find((x) => T_SUBJ[x.id]);
      startDuel({ opp: d.opp, subject: T_SUBJ[c.id] || "world_history", subjectTitle: d.subjectTitle, onDone: battleDone });
    }));
  }

  /* ============================================================
     ТОП СОҒЫСЫ (Clash of Clans «Clan War» үлгісімен)
     Куратор бастайды → ортақ пәні бар, көлемі мен күші жақын топ ізделеді →
     Дайындық күні → Шайқас күні (әр қатысушыға 2 шабуыл) → көп ★ жинаған топ жеңеді
     ★: 40%+ = 1, 70%+ = 2, 100% = 3 (жекпе-жектегі 24 ұпайдан)
     ============================================================ */
  const WAR_SIZES = [5, 10, 15];
  const warStars = (pct) => (pct >= 100 ? 3 : pct >= 70 ? 2 : pct >= 40 ? 1 : 0);
  const COIN = `<img class="coin" src="assets/coin/coin.png" alt="монета" />`;
  const starsHtml = (n, max = 3) => Array.from({ length: max }, (_, i) => `<i class="cn ${i < n ? "on" : ""}"><img src="assets/coin/coin.png" alt="" /></i>`).join("");
  const groupPower = (g) => Math.round(g.students.reduce((t, x) => t + (x.score || 0), 0) / Math.max(1, g.students.length));

  function warCandidates(g, size) {
    return MOCK.groups
      .filter((x) => x.id !== g.id && x.courseId === g.courseId && x.students.length >= size && !(MOCK.war !== undefined && warOf(x)))
      .map((x) => ({ g: x, diff: Math.abs(groupPower(x) - groupPower(g)) }))
      .sort((a, b) => a.diff - b.diff);
  }
  function makeLineup(g, size, withMe) {
    const list = [...g.students].sort((a, b) => b.score - a.score).slice(0, withMe ? size - 1 : size);
    if (withMe) list.splice(Math.min(3, list.length), 0, TOUR_ME());
    return list.map((x, i) => ({ ...x, pos: i + 1 }));
  }
  /** Қарсыластың жауап шабуылдары (макет) */
  function simAttacks(W, side, count) {
    const atk = side === "them" ? W.them.lineup : W.us.lineup;
    const def = side === "them" ? W.us.lineup : W.them.lineup;
    let n = 0;
    for (const a of atk) {
      if (a.me) continue;
      const used = W.attacks.filter((x) => x.side === side && x.by === a.id).length;
      for (let k = used; k < 2 && n < count; k++) {
        const done = new Set(W.attacks.filter((x) => x.side === side && x.by === a.id).map((x) => x.target));
        const t = def.find((d) => Math.abs(d.pos - a.pos) <= 2 + k && !done.has(d.id)) || def.find((d) => !done.has(d.id));
        if (!t) break;
        const pct = Math.min(100, Math.round(35 + rnd(a.id, t.id, k, W.id) * 70 + ((a.score || 0) - (t.score || 0)) / 4));
        W.attacks.push({ side, by: a.id, target: t.id, pct, stars: warStars(pct) });
        n++;
      }
    }
  }
  function warTotals(W, side) {
    const def = side === "us" ? W.them.lineup : W.us.lineup;
    let stars = 0, pct = 0;
    def.forEach((d) => {
      const hits = W.attacks.filter((x) => x.side === side && x.target === d.id);
      const best = hits.reduce((m, x) => (x.stars > m.stars || (x.stars === m.stars && x.pct > m.pct) ? x : m), { stars: 0, pct: 0 });
      stars += best.stars;
      pct += best.pct;
    });
    return { stars, pct: Math.round(pct / def.length), used: W.attacks.filter((x) => x.side === side).length, max: W.size * 2 };
  }
  function war() {
    if (MOCK.war === undefined) {
      const g = MOCK.groups[0];
      const opp = warCandidates(g, 10)[0]?.g;
      const end = new Date(AN_TODAY);
      end.setHours(end.getHours() + 14);
      MOCK.war = opp && {
        id: 1,
        status: "battle",
        courseId: g.courseId,
        size: 10,
        startedBy: "Диана · куратор",
        us: { group: g, lineup: makeLineup(g, 10, true) },
        them: { group: opp, lineup: makeLineup(opp, 10, false) },
        attacks: [],
        battleEnd: end,
        history: [{ vs: "Тарихшылар", us: 21, them: 17, win: true, date: "28.09.2026" }],
      };
      if (MOCK.war) {
        simAttacks(MOCK.war, "us", 9);
        simAttacks(MOCK.war, "them", 11);
      }
    }
    return MOCK.war;
  }
  const warLeft = (W) => countdown(W.status === "prep" ? W.prepEnd : W.battleEnd) || "аяқталды";

  /** Батл бетіндегі соғыс карточкасы */
  function warCardHtml(W = war(), attr = 'id="warOpen"') {
    if (!W) return `<div class="wr-card none">${icon("shield", "material-icons-outlined")}<div><b>Топтар шайқасы жоқ</b><small>Шайқасты куратор бастайды</small></div></div>`;
    const me = attr.startsWith("data-wopen") ? null : W.us.lineup.find((x) => x.me);
    const myUsed = me ? W.attacks.filter((x) => x.side === "us" && x.by === me.id).length : 0;
    const U = warTotals(W, "us"), T = warTotals(W, "them");
    const st = { prep: "Дайындық күні", battle: "Шайқас күні", ended: U.stars > T.stars || (U.stars === T.stars && U.pct >= T.pct) ? "Жеңіс!" : "Жеңіліс" }[W.status];
    return `
      <button type="button" class="wr-card" ${attr}>
        <div class="wr-top"><span class="wr-badge ${W.status}">${icon(W.status === "battle" ? "local_fire_department" : W.status === "prep" ? "construction" : "emoji_events")}${st}</span><span class="wr-time">${W.status === "ended" ? "" : `${icon("timer", "material-icons-outlined")}${warLeft(W)}`}</span></div>
        <div class="wr-vs">
          <div class="wr-side"><b>${W.us.group.name}</b><span class="wr-st">${COIN}${U.stars}</span><small>${U.pct}%</small></div>
          <div class="wr-x"><img src="assets/tournament/battle_line.png" alt="" /><small>${W.size}×${W.size}</small></div>
          <div class="wr-side r"><b>${W.them.group.name}</b><span class="wr-st">${COIN}${T.stars}</span><small>${T.pct}%</small></div>
        </div>
        ${me && W.status === "battle" ? `<div class="wr-me">Сенің шабуылдарың: <span>${Array.from({ length: 2 }, (_, i) => `<i class="${i < myUsed ? "used" : ""}">⚔️</i>`).join("")}</span> ${2 - myUsed ? `· ${2 - myUsed} қалды` : "· бәрі қолданылды"}</div>` : ""}
        <div class="wr-sub">${COURSE_TITLE[W.courseId]} · шайқас картасын ашу ›</div>
      </button>`;
  }

  /** Шайқас картасы: қарсылас базалары / біздің топ / шабуылдар */
  function openWar({ staff = false, W = war() } = {}) {
    if (!W) return staff ? openStaffWars() : toast("Топтар шайқасы жоқ");
    let tab = staff ? "us" : "them";
    const me = W.us.lineup.find((x) => x.me);
    const build = () => {
      const U = warTotals(W, "us"), T = warTotals(W, "them");
      const best = (side, id) => W.attacks.filter((x) => x.side === side && x.target === id).reduce((m, x) => (x.stars > m.stars || (x.stars === m.stars && x.pct > m.pct) ? x : m), { stars: 0, pct: 0 });
      const myDone = me ? new Set(W.attacks.filter((x) => x.side === "us" && x.by === me.id).map((x) => x.target)) : new Set();
      const myLeft = me ? 2 - myDone.size : 0;
      const nameOf = (side, id) => (side === "us" ? W.us.lineup : W.them.lineup).find((x) => x.id === id);
      let body;
      if (tab === "them")
        body = `<div class="wr-map">${W.them.lineup
          .map((d, i) => {
            const b = best("us", d.id);
            const hit = W.attacks.some((x) => x.side === "us" && x.target === d.id);
            const can = W.status === "battle" && me && myLeft > 0 && !myDone.has(d.id);
            return `<button type="button" class="wr-node ${i % 2 ? "r" : "l"} ${hit ? "hit" : "locked"} ${b.stars === 3 ? "down" : ""}" ${can ? `data-watk="${d.id}"` : ""}>
              <span class="wr-ring">
                <span class="wr-av" style="background:${hit ? d.color : "#2a2a30"}">${hit ? d.initials : icon("lock")}</span>
                <span class="wr-num">${d.pos}</span>
              </span>
              <span class="wr-coins">${starsHtml(b.stars)}</span>
              ${hit ? `<small class="wr-nm">${firstName(d)}</small>` : ""}
            </button>`;
          })
          .join("")}</div>`;
      else if (tab === "us")
        body = W.us.lineup
          .map((m) => {
            const mine = W.attacks.filter((x) => x.side === "us" && x.by === m.id);
            const got = best("them", m.id);
            return `<div class="wr-base ${m.me ? "me" : ""}">
              <span class="wr-pos">${m.pos}</span>${avatarHtml(m)}
              <span class="wr-bn"><b>${m.me ? "Сен" : m.name}</b><small>Қорғаныста берді: ${starsHtml(got.stars)}</small></span>
              <span class="wr-atks">${[0, 1].map((k) => (mine[k] ? `<em class="s${mine[k].stars}">${mine[k].stars}${COIN}</em>` : `<em class="no">—</em>`)).join("")}</span>
            </div>`;
          })
          .join("");
      else
        body =
          [...W.attacks]
            .reverse()
            .map((a) => {
              const by = nameOf(a.side, a.by), t = nameOf(a.side === "us" ? "them" : "us", a.target);
              return `<div class="wr-log ${a.side}"><span>${a.side === "us" ? "🟦" : "🟥"}</span><span style="flex:1;min-width:0"><b>${by?.me ? "Сен" : firstName(by)}</b> → #${t?.pos} ${firstName(t)}</span><span class="wr-stars sm">${starsHtml(a.stars)}</span><small>${a.pct}%</small></div>`;
            })
            .join("") || `<div class="empty">Әзірге шабуыл жоқ</div>`;
      return `
        <div class="wr-hero">
          <div class="wr-top"><span class="wr-badge ${W.status}">${W.status === "battle" ? "Шайқас күні" : W.status === "prep" ? "Дайындық күні" : "Шайқас аяқталды"}</span><span class="wr-time">${W.status === "ended" ? "" : warLeft(W)}</span></div>
          <div class="wr-vs big">
            <div class="wr-side"><b>${W.us.group.name}</b><span class="wr-st">${COIN}${U.stars}</span><small>${U.pct}% · ${U.used}/${U.max} шабуыл</small></div>
            <div class="wr-x"><img src="assets/tournament/battle_line.png" alt="" /></div>
            <div class="wr-side r"><b>${W.them.group.name}</b><span class="wr-st">${COIN}${T.stars}</span><small>${T.pct}% · ${T.used}/${T.max} шабуыл</small></div>
          </div>
          <div class="wr-bar"><i style="width:${(U.stars / Math.max(1, U.stars + T.stars)) * 100}%"></i></div>
          <div class="wr-sub">${COURSE_TITLE[W.courseId]} · ${W.size}×${W.size}</div>
          <div class="wr-by">${icon("campaign", "material-icons-outlined")}<span>Шайқасты ашқан: <b>${W.startedBy}</b></span></div>
        </div>
        ${W.status === "prep" ? `<div class="t3-note">${icon("construction", "material-icons-outlined")}Дайындық күні: шабуыл әлі жоқ. Тренажёрда «${COURSE_TITLE[W.courseId]}» тақырыптарын қайталаңдар — шайқас ${countdown(W.prepEnd) || "жақында"} кейін басталады.</div>` : ""}
        ${!staff && me && W.status === "battle" ? `<div class="wr-hint">${icon("touch_app", "material-icons-outlined")}Қарсыластың базасын таңда — ${myLeft} шабуыл қалды. Бір базаға екі рет шабуылдауға болмайды.</div>` : ""}
        <div class="seg-tabs seg-3 wr-tabs">
          ${[["them", "Қарсылас"], ["us", "Біздің топ"], ["log", "Шабуылдар"]].map(([k, l]) => `<button type="button" data-wtab="${k}" class="${tab === k ? "on" : ""}">${l}</button>`).join("")}
        </div>
        <div class="list-pad" style="padding-top:8px">${body}</div>
        ${staff && W.status !== "ended" ? `<div class="list-pad"><button type="button" class="btn3d ghost danger" id="warStop">${icon("flag", "material-icons-outlined")}Шайқасты аяқтау</button></div>` : ""}
        ${staff && W.status === "ended" ? `<div class="list-pad"><button type="button" class="btn3d" id="warNew">${icon("add")}Жаңа шайқас бастау</button></div>` : ""}
        ${W.history?.length ? `<div class="list-pad"><div class="t3-sec">Өткен шайқастар</div>${W.history.map((h) => `<div class="tr-hist"><span class="wr-hres ${h.win ? "w" : "l"}">${h.win ? "Ж" : "Ж-с"}</span><div style="flex:1"><b>vs ${h.vs}</b><small>${h.date}</small></div><span class="${h.win ? "up" : "down"}">${h.us} : ${h.them}</span></div>`).join("")}</div>` : ""}`;
    };
    pushScreen(
      "Топтар шайқасы",
      build,
      () => {
        $$("[data-wtab]").forEach((b) => (b.onclick = () => ((tab = b.dataset.wtab), paintStack())));
        $("#warRules")?.addEventListener("click", warRules);
        $("#warNew")?.addEventListener("click", () => (state.navStack.pop(), openWarStart(W.us.group)));
        $("#warStop")?.addEventListener("click", async () => {
          const ok = await confirmDialog({ title: "Шайқасты аяқтау?", message: "Қалған шабуылдар жабылады, нәтиже қазіргі ★ бойынша.", confirmLabel: "Аяқтау", danger: true });
          if (!ok) return;
          W.status = "ended";
          const U = warTotals(W, "us"), T = warTotals(W, "them");
          W.history = [{ vs: W.them.group.name, us: U.stars, them: T.stars, win: U.stars > T.stars, date: dmy(AN_TODAY) }, ...(W.history || [])];
          paintStack();
        });
        $$("[data-watk]").forEach((b) => {
          b.onclick = () => {
            const d = W.them.lineup.find((x) => String(x.id) === b.dataset.watk);
            openSheet(`
              <div class="sheet-handle"></div>
              <div class="ex-title">Шабуыл: #${d.pos} база</div>
              <div class="wr-atk-p">${avatarHtml(d, "lg")}<div><b>${d.name}</b><small>${W.them.group.name} · рейтинг ${d.score}</small></div></div>
              <div class="ex-block"><ol><li>3 раунд, 13 сұрақ, макс 24 ұпай</li><li>40% = 1 монета · 70% = 2 · 100% = 3 ${COIN}</li><li>Тобыңа ең жақсы нәтиже есептеледі; монеталар сенің әмияныңа да түседі</li></ol></div>
              <div class="sheet-actions btn-row"><button type="button" class="btn btn-ghost" id="waNo">Болдырмау</button><button type="button" class="btn btn-primary" id="waGo">Шабуылдау ⚔️</button></div>`);
            $("#waNo").onclick = closeSheet;
            $("#waGo").onclick = () => {
              closeSheet();
              startDuel({
                opp: { ...d, groupName: W.them.group.name },
                subject: STAFF_SUBJ[W.courseId],
                subjectTitle: COURSE_TITLE[W.courseId],
                onDone: (win, my) => {
                  const pct = Math.round((my / DUEL_MAX) * 100);
                  W.attacks.push({ side: "us", by: me.id, target: d.id, pct, stars: warStars(pct) });
                  simAttacks(W, "them", 1);
                  earnCoins(warStars(pct) * 10, "Топтар шайқасы");
                },
              });
            };
          };
        });
      },
      { right: `<button type="button" class="appbar-icon-btn" id="warRules" title="Ереже">${icon("info", "material-icons-outlined")}</button>` }
    );
  }
  function warRules() {
    openSheet(`
      <div class="sheet-handle"></div>
      <div class="ex-title">Топтар шайқасы қалай өтеді</div>
      <div class="ex-block"><ol>
        <li><b>Кім бастайды:</b> топтың кураторы (немесе бас куратор). Қатысушыларды таңдайды — 5, 10 не 15 адам</li>
        <li><b>Қарсылас:</b> жүйе ортақ пәні бар, көлемі бірдей, рейтингі жақын топты табады</li>
        <li><b>Дайындық күні</b> (24 сағ): шабуыл жоқ, тақырыптарды қайталау</li>
        <li><b>Шайқас күні</b> (24 сағ): әр қатысушыға 2 шабуыл, кез келген қарсылас базасына, бір базаға бір рет</li>
        <li><b>Шабуыл = жекпе-жек:</b> 40% → 1, 70% → 2, 100% → 3 I4U монета</li>
        <li><b>Жеңіс:</b> көп монета жинаған топ; тең болса — орташа % жоғары топ</li><li>Қарсылас базалары шабуыл жасалғанша <b>құлыпта</b> — кім екені көрінбейді</li>
      </ol></div>
      <div class="sheet-actions"><button type="button" class="btn btn-ghost" id="wrClose" style="width:100%">Түсінікті</button></div>`);
    $("#wrClose").onclick = closeSheet;
  }

  const allWars = () => [war(), ...(MOCK.extraWars || [])].filter(Boolean);
  /** Топтың белсенді шайқасы (біз жақта да, қарсылас жақта да) */
  const warOf = (g) => allWars().find((w) => w.status !== "ended" && (w.us.group.id === g.id || w.them.group.id === g.id));

  /** Staff: Топтар шайқасы — өз топтары (бас куратор — барлық топ), әр топқа шайқас бастау / ашу */
  function openStaffWars() {
    pushScreen(
      "Батл",
      () => {
        const groups = visibleGroups();
        const wars = allWars();
        const hist = wars.flatMap((w) => (w.history || []).map((h) => ({ ...h, g: w.us.group.name })));
        return `<div class="list-pad tour">
          <div class="t3-note">${icon("campaign", "material-icons-outlined")}<span>Шайқасты <b>топтың кураторы</b> ашады${isHead() ? ", бас куратор — <b>кез келген топқа</b>" : ""}. Топты таңдап «Бастау» → көлем мен қатысушыларды белгілеу → жүйе ортақ пәні бар қарсылас топты табады.</span></div>
          <div class="t3-sec">${isHead() ? "Барлық топтар" : "Менің топтарым"} · ${groups.length}</div>
          ${groups
            .map((g) => {
              const W = warOf(g);
              if (W) return warCardHtml(W, `data-wopen="${g.id}"`);
              const cands = warCandidates(g, WAR_SIZES[0]);
              return `<div class="wr-grp">
                ${icon("groups", "material-icons-outlined")}
                <div style="flex:1;min-width:0"><b>${g.name}</b><small>${COURSE_TITLE[g.courseId] || ""} · ${g.students.length} оқушы · ${cands.length ? `${cands.length} қарсылас топ бар` : "ортақ пәні бар топ жоқ"}</small></div>
                <button type="button" class="wr-go" data-wstart="${g.id}" ${cands.length ? "" : "disabled"}>${icon("shield")}Бастау</button>
              </div>`;
            })
            .join("")}
          ${hist.length ? `<div class="t3-sec">Өткен шайқастар</div>${hist.map((h) => `<div class="tr-hist"><span class="wr-hres ${h.win ? "w" : "l"}">${h.win ? "Ж" : "Ж-с"}</span><div style="flex:1"><b>${h.g} vs ${h.vs}</b><small>${h.date}</small></div><span class="${h.win ? "up" : "down"}">${h.us} : ${h.them}</span></div>`).join("")}` : ""}
        </div>`;
      },
      () => {
        $("#warRules2").onclick = warRules;
        $$("[data-wstart]").forEach((b) => (b.onclick = () => openWarStart(MOCK.groups.find((g) => g.id === +b.dataset.wstart))));
        $$("[data-wopen]").forEach((b) => (b.onclick = () => openWar({ staff: true, W: warOf({ id: +b.dataset.wopen }) })));
      },
      { right: `<button type="button" class="appbar-icon-btn" id="warRules2" title="Ереже">${icon("info", "material-icons-outlined")}</button>` }
    );
  }

  /** Куратор: соғыс бастау — көлем, қатысушылар, қарсылас іздеу */
  function openWarStart(g = visibleGroups()[0] || MOCK.groups[0]) {
    if (warOf(g)) return toast(`${g.name}: шайқас әлі жүріп жатыр`, "err");
    const size0 = [...WAR_SIZES].reverse().find((n) => n <= 10 && n <= g.students.length && warCandidates(g, n).length) || WAR_SIZES[0];
    const f = { size: size0, picked: new Set([...g.students].sort((a, b) => b.score - a.score).slice(0, size0).map((x) => x.id)), found: null, prep: 24 };
    const draw = () => {
      const cands = warCandidates(g, f.size);
      openSheet(
        `
        <div class="sheet-handle"></div>
        <div class="ef-head"><span>Топтар шайқасын бастау</span><button type="button" id="wsClose">${icon("close")}</button></div>
        <div class="wr-from">${icon("groups", "material-icons-outlined")}<b>${g.name}</b><span>${COURSE_TITLE[g.courseId]} · күші ${groupPower(g)}</span></div>
        <div class="ef-label">Шайқас көлемі</div>
        <div class="ent-chips">${WAR_SIZES.map((n) => `<button type="button" class="ent-chip ${f.size === n ? "on" : ""}" style="--c:var(--primary)" data-wsz="${n}" ${g.students.length < n ? "disabled" : ""}>${n} × ${n}</button>`).join("")}</div>
        <div class="ef-label">Қатысушылар · ${f.picked.size}/${f.size} <button type="button" class="t3-all" id="wsTop">рейтинг бойынша үздіктер</button></div>
        <div class="tf-checks">${[...g.students].sort((a, b) => b.score - a.score).map((x) => `<button type="button" class="tf-check ${f.picked.has(x.id) ? "on" : ""}" data-wsp="${x.id}">${icon(f.picked.has(x.id) ? "check_box" : "check_box_outline_blank")}<span>${x.name}<small>рейтинг ${x.score}</small></span></button>`).join("")}</div>
        <div class="ef-label">Дайындық күні</div>
        <div class="ent-chips">${[12, 24, 48].map((h) => `<button type="button" class="ent-chip ${f.prep === h ? "on" : ""}" style="--c:var(--primary)" data-wsprep="${h}">${h} сағат</button>`).join("")}</div>
        ${
          f.found
            ? `<div class="wr-found">${icon("radar", "material-icons-outlined")}<div><b>Қарсылас табылды: ${f.found.name}</b><small>${COURSE_TITLE[f.found.courseId]} · ${f.found.studentsCount} оқушы · күші ${groupPower(f.found)}</small></div></div>`
            : `<div class="tf-sum ${cands.length ? "" : "warn"}">${icon("search", "material-icons-outlined")}${cands.length ? `Ортақ пәні бар ${cands.length} топ: ${cands.map((c) => c.g.name).join(", ")}` : "Ортақ пәні бар, көлемі жететін топ жоқ"}</div>`
        }
        <button type="button" class="ef-submit" id="wsGo" ${cands.length ? "" : "disabled"}>${f.found ? "Шайқасты бастау ⚔️" : "Қарсылас іздеу"}</button>`,
        { tall: true }
      );
      $("#wsClose").onclick = closeSheet;
      $$("[data-wsz]").forEach((b) => (b.onclick = () => ((f.size = +b.dataset.wsz), (f.found = null), (f.picked = new Set([...g.students].sort((a, c) => c.score - a.score).slice(0, f.size).map((x) => x.id))), draw())));
      $("#wsTop").onclick = () => ((f.picked = new Set([...g.students].sort((a, c) => c.score - a.score).slice(0, f.size).map((x) => x.id))), draw());
      $$("[data-wsp]").forEach((b) => (b.onclick = () => {
        const id = +b.dataset.wsp;
        if (f.picked.has(id)) f.picked.delete(id);
        else if (f.picked.size < f.size) f.picked.add(id);
        else return toast(`Тек ${f.size} қатысушы`, "err");
        draw();
      }));
      $$("[data-wsprep]").forEach((b) => (b.onclick = () => ((f.prep = +b.dataset.wsprep), draw())));
      $("#wsGo").onclick = () => {
        if (f.picked.size !== f.size) return toast(`${f.size} қатысушы таңдаңыз`, "err");
        if (!f.found) {
          f.found = cands[0].g;
          toast("Іздеу… қарсылас табылды");
          return draw();
        }
        const prepEnd = new Date(AN_TODAY);
        prepEnd.setHours(prepEnd.getHours() + f.prep);
        const battleEnd = new Date(prepEnd);
        battleEnd.setHours(battleEnd.getHours() + 24);
        const lineup = [...g.students].filter((x) => f.picked.has(x.id)).sort((a, b) => b.score - a.score).map((x, i) => ({ ...x, pos: i + 1 }));
        const prev = allWars().find((w) => w.us.group.id === g.id);
        const W = {
          id: nextId(),
          status: "prep",
          courseId: g.courseId,
          size: f.size,
          startedBy: `${myName()} · ${state.staffRole === "head" ? "бас куратор" : "куратор"}`,
          us: { group: g, lineup },
          them: { group: f.found, lineup: makeLineup(f.found, f.size, false) },
          attacks: [],
          prepEnd,
          battleEnd,
          history: prev ? (prev.status === "ended" ? prev.history : []) : [],
        };
        // Оқушы көретін топ (макетте — бірінші топ) MOCK.war-да, қалғандары extraWars-та
        if (g.id === MOCK.groups[0].id) MOCK.war = W;
        else MOCK.extraWars = [...(MOCK.extraWars || []).filter((w) => w.us.group.id !== g.id), W];
        closeSheet();
        if ([g.id, f.found.id].includes(MOCK.groups[0].id))
          notify({ type: "war", title: `Топтар шайқасы: ${g.name} vs ${f.found.name}`, body: `Дайындық күні басталды (${f.prep} сағ). Шайқас күні әр қатысушыға 2 шабуыл беріледі`, go: { war: true } });
        MOCK.pushes.unshift({ title: `Топтар шайқасы: ${g.name} vs ${f.found.name}`, time: "Қазір", type: "Авто · Шайқас", body: `${f.size}×${f.size}, дайындық ${f.prep} сағ`, audience: `${g.name}, ${f.found.name}`, stats: `${g.studentsCount + f.found.studentsCount} / 0` });
        toast("Шайқас жарияланды — екі топқа хабарлама кетті");
        if (state.navStack.length) paintStack();
        openWar({ staff: true, W });
      };
    };
    draw();
  }

  /* ============================================================
     I4U МОНЕТАЛАРЫ ЖӘНЕ ДҮКЕН
     Монета: сабақ қарау, тест, апталық сынақ, батл, турнир, топтар шайқасы
     ============================================================ */
  const COIN_RULES = [
    ["smart_display", "Видеосабақты соңына дейін қарау", 5],
    ["description", "Конспект тапсыру (қабылданса)", 5],
    ["quiz", "Сабақ тестін тапсыру", 10],
    ["calendar_month", "Апталық сынақ", 20],
    ["sports_kabaddi", "Батлда жеңу", 15],
    ["shield", "Топтар шайқасы: әр монета-жұлдыз", 10],
    ["emoji_events", "Турнирде келесі кезеңге өту / чемпион", "20 / 200"],
    ["local_fire_department", "7 күн қатарынан кіру", 50],
  ];
  const SHOP = [
    { id: "frame_gold", cat: "avatar", name: "Алтын жиек", desc: "Аватарға алтын жиек", price: 300, icon: "account_circle", color: "#F2C230" },
    { id: "frame_fire", cat: "avatar", name: "От жиегі", desc: "Аватарға жалынды жиек", price: 500, icon: "local_fire_department", color: "#FF6A3D" },
    { id: "title_master", cat: "avatar", name: "«Тарих шебері» атағы", desc: "Рейтингте атыңның жанында", price: 400, icon: "military_tech", color: "#B07CFF" },
    { id: "hint5", cat: "boost", name: "5 кеңес", desc: "Тестте бір қате нұсқаны алып тастайды", price: 150, icon: "lightbulb", color: "#FFD54F" },
    { id: "freeze", cat: "boost", name: "Серияны сақтау", desc: "Бір күн кірмесең де серия үзілмейді", price: 200, icon: "ac_unit", color: "#7FD3E8" },
    { id: "x2", cat: "boost", name: "×2 монета (24 сағ)", desc: "Бір тәулік бойы монета екі есе", price: 350, icon: "bolt", color: "#5CB36D" },
    { id: "theme_neon", cat: "theme", name: "«Неон» тақырыбы", desc: "Қосымшаның түс тақырыбы", price: 600, icon: "palette", color: "#4F9BFF" },
    { id: "sticker", cat: "merch", name: "I4U стикерпак", desc: "Офистен алып кетесің", price: 800, icon: "sell", color: "#E2574C" },
    { id: "hoodie", cat: "merch", name: "I4U худи", desc: "Шектеулі коллекция", price: 5000, icon: "checkroom", color: "#8A94F5" },
  ];
  function wallet() {
    if (!MOCK.wallet)
      MOCK.wallet = {
        coins: 1240,
        owned: ["hint5"],
        log: [
          { t: "Апталық сынақ (11 - апта)", c: 20, d: "03.10" },
          { t: "Сабақ тесті: Жаңа Заман ұғымы", c: 10, d: "02.10" },
          { t: "Видеосабақ: ЖАПОНИЯНЫҢ АШЫЛУЫ", c: 5, d: "02.10" },
          { t: "Дүкен: 5 кеңес", c: -150, d: "01.10" },
        ],
      };
    return MOCK.wallet;
  }
  function earnCoins(n, why) {
    if (!n) return;
    const w = wallet();
    w.coins += n;
    w.log.unshift({ t: why, c: n, d: dmy(new Date()).slice(0, 5) });
    toast(`+${n} I4U монета · ${why}`);
  }
  function coinChip() {
    return `<span class="coin-chip">${COIN}<b>${wallet().coins.toLocaleString("ru-RU")}</b></span>`;
  }
  function shopHtml() {
    const w = wallet();
    const cat = state.shopCat || "all";
    const cats = [["all", "Барлығы"], ["avatar", "Аватар"], ["boost", "Күшейткіш"], ["theme", "Тақырып"], ["merch", "Мерч"]];
    const items = SHOP.filter((x) => !x.hidden && (cat === "all" || x.cat === cat));
    return `
      <div class="list-pad shop">
        <div class="shop-bal">
          <img src="assets/coin/coin.png" alt="" />
          <div><small>Менің монеталарым</small><b>${w.coins.toLocaleString("ru-RU")}</b></div>
          <button type="button" class="shop-how" id="shopHow">Қалай жинаймын?</button>
        </div>
        <div class="acc-chips shop-cats">${cats.map(([k, l]) => `<button type="button" class="ent-chip ${cat === k ? "on" : ""}" style="--c:var(--primary)" data-shopcat="${k}">${l}</button>`).join("")}</div>
        <div class="shop-grid">${items
          .map((x) => {
            const own = w.owned.includes(x.id);
            return `<button type="button" class="shop-item ${own ? "own" : ""}" data-shopbuy="${x.id}">
              <span class="shop-ic" style="--c:${x.color}">${icon(x.icon)}</span>
              <b>${x.name}</b><small>${x.desc}</small>
              <span class="shop-price ${own ? "own" : w.coins < x.price ? "no" : ""}">${own ? `${icon("check")}Сенде бар` : `${COIN}${x.price.toLocaleString("ru-RU")}`}</span>
            </button>`;
          })
          .join("")}</div>
        <div class="t3-sec">Монета тарихы</div>
        ${w.log.slice(0, 8).map((l) => `<div class="coin-log"><span>${l.t}</span><small>${l.d}</small><b class="${l.c > 0 ? "up" : "down"}">${l.c > 0 ? "+" : ""}${l.c}</b></div>`).join("")}
      </div>`;
  }
  /* —— Staff: Магазин ——
     Бас куратор: тауарлар (қосу, баға, қалдық, жасыру), барлық тапсырыстар, монета беру (≤500)
     Куратор: өз топтарының тапсырыстары (дайын → берілді), оқушы монеталары, бонус (≤50/апта бір оқушыға) */
  const stCoins = (st) => (MOCK.stCoins ||= {})[st.id] ?? Math.round(150 + rnd(st.id, 77) * 1850);
  const ORDER_ST = { new: ["Жаңа", "#F2A93B"], ready: ["Дайын · алып кетуді күтуде", "#5B9BF2"], given: ["Берілді", "#5CB36D"] };
  function shopOrders() {
    if (!MOCK.shopOrders) {
      const merch = SHOP.filter((x) => x.cat === "merch");
      MOCK.shopOrders = MOCK.groups.flatMap((g) =>
        g.students.filter((st) => rnd(st.id, 31) > 0.82).map((st, i) => ({ id: nextId(), st, g, item: merch[i % merch.length].id, date: `0${1 + Math.floor(rnd(st.id, 5) * 5)}.10.2026`, status: ["new", "ready", "given"][Math.floor(rnd(st.id, 9) * 3)] }))
      );
    }
    return MOCK.shopOrders;
  }
  function openStaffShop() {
    let tab = "orders";
    let gid = visibleGroups()[0]?.id;
    pushScreen(
      "Магазин",
      () => {
        const gids = new Set(visibleGroups().map((g) => g.id));
        const orders = shopOrders().filter((o) => gids.has(o.g.id));
        const nNew = orders.filter((o) => o.status !== "given").length;
        let body;
        if (tab === "orders")
          body = orders.length
            ? orders
                .map((o) => {
                  const it = SHOP.find((x) => x.id === o.item);
                  const [lb, c] = ORDER_ST[o.status];
                  return `<div class="so-row">
                    <span class="shop-ic" style="--c:${it.color}">${icon(it.icon)}</span>
                    <div style="flex:1;min-width:0"><b>${it.name}</b><small>${o.st.name} · ${o.g.name} · ${o.date}</small><em style="--c:${c}">${lb}</em></div>
                    ${o.status === "given" ? "" : `<button type="button" class="wr-go" data-ord="${o.id}">${o.status === "new" ? "Дайын" : "Берілді"}</button>`}
                  </div>`;
                })
                .join("")
            : `<div class="empty">Тапсырыс жоқ</div>`;
        else if (tab === "items")
          body = `${isHead() ? "" : `<div class="t3-note">${icon("info", "material-icons-outlined")}<span>Тауарлар мен бағаны <b>бас куратор</b> басқарады</span></div>`}
            ${SHOP.map((x) => `<button type="button" class="so-row ${x.hidden ? "off" : ""}" ${isHead() ? `data-item="${x.id}"` : ""}>
              <span class="shop-ic" style="--c:${x.color}">${icon(x.icon)}</span>
              <div style="flex:1;min-width:0"><b>${x.name}</b><small>${x.desc}${x.cat === "merch" ? ` · қалдық ${x.stock ?? 20}` : ""}${x.hidden ? " · жасырын" : ""}</small></div>
              <span class="shop-price">${COIN}${x.price.toLocaleString("ru-RU")}</span>
            </button>`).join("")}`;
        else {
          const g = MOCK.groups.find((x) => x.id === gid);
          body = `<div class="acc-chips shop-cats">${visibleGroups().map((x) => `<button type="button" class="ent-chip ${x.id === gid ? "on" : ""}" style="--c:var(--primary)" data-sgid="${x.id}">${x.name}</button>`).join("")}</div>
            <div class="t3-note">${icon("redeem", "material-icons-outlined")}<span>Оқушыны басып бонус монета беріңіз${isHead() ? " (бір реттік ≤500)" : " — бір оқушыға аптасына ≤50"}</span></div>
            ${[...g.students].sort((a, b) => stCoins(b) - stCoins(a)).map((st, i) => `<button type="button" class="so-row" data-coinst="${st.id}">
              <span class="wr-pos">${i + 1}</span>${avatarHtml(st)}
              <div style="flex:1;min-width:0"><b>${st.name}</b><small>рейтинг ${st.score}</small></div>
              <span class="shop-price">${COIN}${stCoins(st).toLocaleString("ru-RU")}</span>
            </button>`).join("")}`;
        }
        return `<div class="list-pad shop">
          <div class="seg-tabs seg-3">${[["orders", `Тапсырыс${nNew ? ` · ${nNew}` : ""}`], ["items", "Тауарлар"], ["coins", "Монеталар"]].map(([k, l]) => `<button type="button" data-stab="${k}" class="${tab === k ? "on" : ""}">${l}</button>`).join("")}</div>
          <div style="margin-top:10px">${body}</div>
        </div>`;
      },
      () => {
        $$("[data-stab]").forEach((b) => (b.onclick = () => ((tab = b.dataset.stab), paintStack())));
        $$("[data-sgid]").forEach((b) => (b.onclick = () => ((gid = +b.dataset.sgid), paintStack())));
        $$("[data-ord]").forEach((b) => (b.onclick = () => {
          const o = shopOrders().find((x) => x.id === +b.dataset.ord);
          o.status = o.status === "new" ? "ready" : "given";
          toast(o.status === "ready" ? `${o.st.name}: «алып кет» хабарламасы кетті` : "Берілді деп белгіленді");
          paintStack();
        }));
        $$("[data-item]").forEach((b) => (b.onclick = () => openShopItemForm(SHOP.find((x) => x.id === b.dataset.item))));
        $("#siNew")?.addEventListener("click", () => openShopItemForm());
        $$("[data-coinst]").forEach((b) => (b.onclick = () => openCoinAward(MOCK.groups.find((g) => g.id === gid).students.find((x) => x.id === +b.dataset.coinst))));
      },
      { right: isHead() ? `<button type="button" class="appbar-add" id="siNew" title="Тауар қосу">${icon("add")}</button>` : "<span></span>" }
    );
  }
  function openShopItemForm(x) {
    const f = x ? { ...x } : { id: `it${nextId()}`, cat: "merch", name: "", desc: "", price: 500, icon: "redeem", color: "#8A94F5", stock: 20 };
    const cats = [["avatar", "Аватар"], ["boost", "Күшейткіш"], ["theme", "Тақырып"], ["merch", "Мерч"]];
    openSheet(`
      <div class="sheet-handle"></div>
      <div class="ef-head"><span>${x ? "Тауарды өзгерту" : "Жаңа тауар"}</span><button type="button" id="siClose">${icon("close")}</button></div>
      <div class="ef-label">Атауы</div><input class="ef-input" id="siName" value="${f.name}" placeholder="Мысалы: I4U дәптер" />
      <div class="ef-label">Сипаттама</div><input class="ef-input" id="siDesc" value="${f.desc}" />
      <div class="ef-label">Санат</div>
      <div class="ent-chips">${cats.map(([k, l]) => `<button type="button" class="ent-chip ${f.cat === k ? "on" : ""}" style="--c:var(--primary)" data-sicat="${k}">${l}</button>`).join("")}</div>
      <div class="ef-label">Бағасы (I4U монета)</div><input class="ef-input" id="siPrice" type="number" min="1" value="${f.price}" />
      <div class="ef-label">Қалдық (мерч үшін)</div><input class="ef-input" id="siStock" type="number" min="0" value="${f.stock ?? 20}" />
      <button type="button" class="tf-check ${f.hidden ? "on" : ""}" id="siHide">${icon(f.hidden ? "check_box" : "check_box_outline_blank")}<span>Оқушылардан жасыру</span></button>
      <button type="button" class="ef-submit" id="siSave">${x ? "Сақтау" : "Қосу"}</button>`, { tall: true });
    $("#siClose").onclick = closeSheet;
    $$("[data-sicat]").forEach((b) => (b.onclick = () => { f.cat = b.dataset.sicat; $$("[data-sicat]").forEach((c) => c.classList.toggle("on", c === b)); }));
    $("#siHide").onclick = (e) => { f.hidden = !f.hidden; e.currentTarget.classList.toggle("on", f.hidden); e.currentTarget.querySelector(".material-icons-round").textContent = f.hidden ? "check_box" : "check_box_outline_blank"; };
    $("#siSave").onclick = () => {
      f.name = $("#siName").value.trim();
      f.desc = $("#siDesc").value.trim();
      f.price = +$("#siPrice").value;
      f.stock = +$("#siStock").value;
      if (!f.name || !(f.price > 0)) return toast("Атауы мен бағасын толтырыңыз", "err");
      if (x) Object.assign(x, f);
      else SHOP.push(f);
      closeSheet();
      toast(x ? "Сақталды" : "Тауар қосылды — оқушылар дүкенінде көрінеді");
      paintStack();
    };
  }
  function openCoinAward(st) {
    const max = isHead() ? 500 : 50;
    const given = (MOCK.coinAwards || []).filter((a) => a.st === st.id).reduce((t, a) => t + a.n, 0);
    const left = isHead() ? max : Math.max(0, max - given);
    let n = Math.min(10, left);
    const draw = () => {
      openSheet(`
        <div class="sheet-handle"></div>
        <div class="ef-head"><span>Бонус монета</span><button type="button" id="caClose">${icon("close")}</button></div>
        <div class="wr-atk-p">${avatarHtml(st, "lg")}<div><b>${st.name}</b><small>Балансы: ${stCoins(st).toLocaleString("ru-RU")} монета${isHead() ? "" : ` · осы аптада тағы ${left} беруге болады`}</small></div></div>
        <div class="ef-label">Саны</div>
        <div class="ent-chips">${[5, 10, 20, 50, ...(isHead() ? [100, 200, 500] : [])].map((v) => `<button type="button" class="ent-chip ${n === v ? "on" : ""}" style="--c:var(--primary)" data-can="${v}" ${v > left ? "disabled" : ""}>+${v}</button>`).join("")}</div>
        <div class="ef-label">Себебі (оқушыға көрінеді)</div><input class="ef-input" id="caWhy" placeholder="Мысалы: эфирде белсенді болды" />
        <button type="button" class="ef-submit" id="caGo" ${left && n ? "" : "disabled"}>${left ? `+${n} монета беру` : "Апталық лимит таусылды"}</button>`);
      $("#caClose").onclick = closeSheet;
      $$("[data-can]").forEach((b) => (b.onclick = () => ((n = +b.dataset.can), draw())));
      $("#caGo").onclick = () => {
        const why = $("#caWhy").value.trim();
        if (!why) return toast("Себебін жазыңыз", "err");
        MOCK.stCoins[st.id] = stCoins(st) + n;
        (MOCK.coinAwards ||= []).push({ st: st.id, n, why, by: myName() });
        closeSheet();
        toast(`${st.name}: +${n} монета · ${why}`);
        paintStack();
      };
    };
    draw();
  }
  function bindShop() {
    $$("[data-shopcat]").forEach((b) => (b.onclick = () => ((state.shopCat = b.dataset.shopcat), paintStack())));
    $("#shopHow")?.addEventListener("click", () => {
      openSheet(`
        <div class="sheet-handle"></div>
        <div class="ex-title">I4U монета қалай жиналады</div>
        ${COIN_RULES.map(([ic, t, c]) => `<div class="coin-rule">${icon(ic, "material-icons-outlined")}<span>${t}</span><b>+${c} ${COIN}</b></div>`).join("")}
        <div class="sheet-actions"><button type="button" class="btn btn-ghost" id="chClose" style="width:100%">Түсінікті</button></div>`);
      $("#chClose").onclick = closeSheet;
    });
    $$("[data-shopbuy]").forEach((b) => {
      b.onclick = async () => {
        const w = wallet();
        const x = SHOP.find((i) => i.id === b.dataset.shopbuy);
        if (w.owned.includes(x.id) && x.cat !== "boost") return toast("Бұл зат сенде бар");
        if (w.coins < x.price) return toast(`Монета жетпейді: тағы ${x.price - w.coins} керек`, "err");
        const ok = await confirmDialog({ title: `${x.name} сатып алу?`, message: `${x.price} I4U монета жұмсалады. Қалады: ${w.coins - x.price}.`, confirmLabel: "Сатып алу" });
        if (!ok) return;
        w.coins -= x.price;
        if (!w.owned.includes(x.id)) w.owned.push(x.id);
        w.log.unshift({ t: `Дүкен: ${x.name}`, c: -x.price, d: dmy(new Date()).slice(0, 5) });
        if (x.cat === "merch") shopOrders().unshift({ id: nextId(), st: TOUR_ME(), g: MOCK.groups[0], item: x.id, date: dmy(AN_TODAY), status: "new" });
        toast(x.cat === "merch" ? "Сатып алынды! Куратор дайын деп белгілегенде офистен алып кет 🎁" : "Сатып алынды!");
        paintStack();
      };
    });
  }

  function openDuelInvite() {
    const g = MOCK.groups[0];
    const subs = MOCK.myCourses.filter((c) => T_SUBJ[c.id]);
    const st = { who: null, sub: subs[0]?.id };
    const draw = () => {
      openSheet(
        `
        <div class="sheet-handle"></div>
        <div class="ef-head"><span>Жарысқа шақыру</span><button type="button" id="dvClose">${icon("close")}</button></div>
        <div class="ef-label">Пән</div>
        <div class="ent-chips">${subs.map((c) => `<button type="button" class="ent-chip ${st.sub === c.id ? "on" : ""}" style="--c:#6C7FD8" data-dvs="${c.id}">${c.title}</button>`).join("")}</div>
        <div class="ef-label">Сыныптас</div>
        <div class="pick-list">${g.students
          .map((x) => `<button type="button" class="pick-opt dv-p ${st.who === x.id ? "on" : ""}" data-dvp="${x.id}">${avatarHtml(x)}<span style="flex:1">${x.name}</span>${st.who === x.id ? icon("check") : ""}</button>`)
          .join("")}</div>
        <button type="button" class="ef-submit" id="dvGo" ${st.who ? "" : "disabled"}>Шақыру</button>`,
        { tall: true }
      );
      $("#dvClose").onclick = closeSheet;
      $$("[data-dvs]").forEach((b) => (b.onclick = () => ((st.sub = Number(b.dataset.dvs)), draw())));
      $$("[data-dvp]").forEach((b) => (b.onclick = () => ((st.who = Number(b.dataset.dvp)), draw())));
      $("#dvGo").onclick = () => {
        const opp = g.students.find((x) => x.id === st.who);
        const c = MOCK.myCourses.find((x) => x.id === st.sub);
        const B = battleState();
        closeSheet();
        // Кезекпен: шақырушы өз бөлігін қазір ойнайды → досына push «X сені батлға шақырды» (24 сағ) → дос ойнаған соң екеуіне нәтиже
        toast(`Шақыру жіберілді — ${firstName(opp)} хабарлама алды. Енді өз раундыңды ойна`);
        setTimeout(
          () =>
            startDuel({
              opp,
              subject: T_SUBJ[c.id],
              subjectTitle: c.title,
              onDone: (_, my) => {
                const inv = { opp, subjectTitle: c.title, my, left: "24 сағ" };
                B.outgoing.unshift(inv);
                setTimeout(() => {
                  B.outgoing = B.outgoing.filter((x) => x !== inv);
                  const op = Math.round(6 + rnd(opp.id, my, 3) * 16);
                  const win = my > op || (my === op && rnd(opp.id, 9) > 0.5);
                  battleDone(win);
                  notify({ type: "battle", title: `${firstName(opp)} шақыруыңа жауап берді`, body: `${c.title}: сен ${my} : ${op} ${opp.name}. ${win ? "Жеңіс! +15 рейтинг" : "Жеңіліс. Реванш жасап көр"}`, go: { service: "battle", title: "Батл" } });
                  if (state.navStack.length) paintStack();
                }, 8000);
              },
            }),
          600
        );
      };
    };
    draw();
  }

  function bindTournament() {
    bindShop();
    bindBattle();
    bindTourSeg(paintStack);
    $("#duelInvite")?.addEventListener("click", openDuelInvite);
    $$("[data-tour]").forEach((b) => (b.onclick = () => openTournament(tournaments().find((t) => t.id === Number(b.dataset.tour)))));
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

  /** Тренажёр: «Мои курсы» ішіндегі барлық пән */
  function trainerList() {
    return MOCK.myCourses.map((c) => {
      let t = MOCK.trainerSubjects.find((x) => x.courseId === c.id);
      if (!t) {
        const cc = MOCK.courseContent[c.id];
        const sections = (cc ? cc.sections : [{ title: c.title, items: [] }]).map((sec) => {
          const topics = sec.items.filter((x) => x.startsWith("v:")).map((x) => x.slice(2));
          return { title: sec.title, percent: 0, topics, count: topics.length };
        });
        t = { id: c.id, title: c.title, courseId: c.id, percent: 0, done: 0, total: sections.reduce((a, x) => a + x.count, 0), weak: 0, closed: 0, sections };
        MOCK.trainerSubjects.push(t);
      }
      if (!MOCK.practice[c.id] && MOCK.lessonTests[c.id]) MOCK.practice[c.id] = { topic: c.title, questions: MOCK.lessonTests[c.id] };
      if (!MOCK.practice[c.id]) MOCK.practice[c.id] = MOCK.practice[10];
      return t;
    });
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
    bindTournament();
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
          openMockAttempts();
        }
      };
    });
    $$("[data-hatt]").forEach((b) => (b.onclick = () => openAttemptReview(mockAttempts()[Number(b.dataset.hatt)])));
    $$("[data-hist]").forEach((b) => {
      b.onclick = () => {
        if (b.dataset.hist === "ent") return openMockAttempts();
        openSubjectTests(MOCK.myCourses.find((c) => c.id === Number(b.dataset.hist)));
      };
    });
    $$("[data-trainer]").forEach((btn) => {
      btn.onclick = () => openTrainerSubject(trainerList().find((x) => x.id === Number(btn.dataset.trainer)));
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
        right: id === "shop" ? coinChip() : id === "battle" ? `<span class="ab-icons"><button type="button" class="appbar-icon-btn" id="duelInvite" title="Досты шақыру">${icon("person_add", "material-icons-outlined")}</button><button type="button" class="appbar-icon-btn" id="btRules" title="Ережелер">${icon("info", "material-icons-outlined")}</button></span>` : id === "tournament" ? "<span></span>" : undefined,
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
    const accent = inStaff ? "#5B6EC2" : "#8B5CF6";
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
      applyPrefs();
      toast(state.darkTheme ? "Тёмная тема" : "Светлая тема", "ok");
    };
    $$("[data-lang]", el).forEach((btn) => {
      btn.onclick = () => {
        state.lang = btn.dataset.lang;
        applyPrefs();
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
          ${(() => {
            const L = levelOf(data.done, data.total);
            return `<div class="sp-lvl2" style="--lc:${L.level.color}"><span>${L.level.emoji}</span><b>${L.level.name}</b><em>${L.i + 1}/10</em><i style="width:${L.pct}%"></i></div>`;
          })()}
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
    centerIn($(".road-step.cur"), "y");
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
  /* —— Пробный ЕНТ: тапсырылған нұсқалар тізімі → разбор + сертификат —— */
  function mockAttempts() {
    if (!MOCK.entSeeded) {
      MOCK.entSeeded = true;
      const sel = MOCK.entPicker.selected.map((id) => ENT_KEYS[id]);
      const keys = [...sel, "history_kz", "math_literacy", "reading_literacy"];
      MOCK.entAttempts.push(
        { variant: 2, date: "20 сентября", keys, seed: 86, target: 86 },
        { variant: 1, date: "6 сентября", keys, seed: 79, target: 79 }
      );
    }
    return MOCK.entAttempts;
  }
  /** Нұсқаның пәндерін құрастыру; жауаптар жоқ болса (ескі тапсыру) — тұрақты түрде симуляция */
  function attemptSubjects(att) {
    const P = window.PROBNIK;
    const subs = att.keys.map((k) => {
      const vs = P.subjects[k].variants;
      const v = vs[att.variant] ? att.variant : Number(Object.keys(vs)[0]);
      return { key: k, title: P.subjects[k].title, qs: vs[v] };
    });
    if (!att.ans) {
      att.ans = {};
      const p = Math.min(0.95, (att.target || 70) / 140 + 0.08);
      subs.forEach((sub) =>
        sub.qs.forEach((q, i) => {
          const ok = rnd(att.seed, i, sub.key.length) < p;
          if (q.type === "matching") {
            const key = matchingKey(q);
            att.ans[q.id] = Object.fromEntries(Object.entries(key).map(([l, r], j) => [l, ok || j ? r : "9"]));
          } else if (q.type === "multiple_choice") {
            att.ans[q.id] = new Set(q.options.map((o, k) => (o.correct === ok ? k : -1)).filter((k) => k >= 0).slice(0, ok ? 9 : 1));
          } else att.ans[q.id] = ok ? q.options.findIndex((o) => o.correct) : q.options.findIndex((o) => !o.correct);
        })
      );
    }
    const core = (sub) => sub.key in ENT_MIN;
    subs.forEach((sub) => {
      sub.qMax = (q) => (core(sub) ? 1 : maxQ(q));
      sub.qScore = (q) => {
        const sc = scoreQ(q, att.ans[q.id]);
        return core(sub) ? (sc === maxQ(q) ? 1 : 0) : sc;
      };
      sub.score = sub.qs.reduce((t, q) => t + sub.qScore(q), 0);
      sub.max = sub.qs.reduce((t, q) => t + sub.qMax(q), 0);
    });
    att.total = subs.reduce((t, s2) => t + s2.score, 0);
    return subs;
  }

  async function openMockAttempts() {
    try {
      await loadProbnik();
    } catch {
      return toast("Сұрақтар жүктелмеді", "err");
    }
    const list = mockAttempts();
    list.forEach((a) => attemptSubjects(a));
    const tot = list.map((a) => a.total);
    const avg = tot.length ? Math.round(tot.reduce((x, y) => x + y, 0) / tot.length) : 0;
    const best = tot.length ? Math.max(...tot) : 0;
    const prog = tot.length > 1 ? ((tot[0] - tot[1]) / Math.max(1, tot[1])) * 100 : 0;
    const profNames = (a) => a.keys.filter((k) => !(k in ENT_MIN)).map((k) => window.PROBNIK.subjects[k].title).join(", ");
    pushScreen(
      "ҰБТ сынақ тесттері",
      () => `<div class="list-pad mt-wrap">
        <div class="mt-tiles">
          <div class="mt-tile"><span class="material-icons-round" style="color:#4caf50">check_circle</span><small>Тапсырылды</small><b>${list.length}</b></div>
          <div class="mt-tile"><span class="material-icons-round" style="color:#2f8cf0">insert_chart</span><small>Орташа балл</small><b>${avg}</b></div>
          <div class="mt-tile"><span class="material-icons-round" style="color:#f2c230">star</span><small>Үздік балл</small><b>${best}</b></div>
        </div>
        <div class="mt-prog"><span class="material-icons-round ${prog < 0 ? "down" : "up"}">${prog < 0 ? "trending_down" : "trending_up"}</span><div><small>Айлық прогресс</small><b class="${prog < 0 ? "down" : "up"}">${prog >= 0 ? "+" : ""}${prog.toFixed(1)}%</b></div></div>
        <div class="mt-h">Тапсырылған тесттер тарихы</div>
        ${list
          .map(
            (a, i) => `
          <button type="button" class="mt-card" data-att="${i}">
            <div class="mt-card-top"><b>Пробный ЕНТ: ${profNames(a)}</b><span class="mt-badge">Тапсырды</span></div>
            <div class="mt-date">${a.date}</div>
            <div class="mt-nums"><div><small>Балл</small><b>${a.total}/140</b></div><div><small>Пайыз</small><b>${Math.round((a.total / 140) * 100)}%</b></div></div>
          </button>`
          )
          .join("") || `<div class="empty">Пробный ЕНТ әлі тапсырылмаған</div>`}
      </div>`,
      () => $$("[data-att]").forEach((b) => (b.onclick = () => openAttemptReview(list[Number(b.dataset.att)]))),
      { screenCls: "mt-screen", centered: true }
    );
  }

  function openAttemptReview(att) {
    const subs = attemptSubjects(att);
    const build = () => {
      const passAll = subs.every((s2) => s2.score >= (ENT_MIN[s2.key] || 5));
      return `
        <div class="er-head">
          <div class="er-total"><b>${att.total}</b> / 140</div>
          <div class="er-sub">${att.date} · ${att.variant}-нұсқа · ${passAll && att.total >= 50 ? "грантқа қатысуға болады" : passAll ? "шекті балл өтті" : "кейбір пәнде шекті балл жоқ"}</div>
        </div>
        <div class="list-pad">
          <button type="button" class="cert-btn" id="maCert">${icon("workspace_premium", "material-icons-outlined")}Сертификат${icon("chevron_right")}</button>
          <div class="er-title" style="margin-top:16px">Пәндер</div>
          ${subs
            .map((s2, i) => {
              const min = ENT_MIN[s2.key] || 5;
              return `<button type="button" class="er-row" data-masub="${i}">
                <span class="er-name">${s2.title}</span>
                <span class="er-min ${s2.score >= min ? "ok" : "bad"}">${icon(s2.score >= min ? "check_circle" : "error_outline", "material-icons-outlined")}мин ${min}</span>
                <b>${s2.score}<small> / ${s2.max}</small></b>
                ${icon("chevron_right")}
              </button>`;
            })
            .join("")}
        </div>`;
    };
    /* ҰБТ талдауы — қосымшадағыдай: пән қойындылары, сұрақ нөмірлері, бір сұрақ, Артқа/Алға */
    const R = { s: 0, q: subs.map(() => 0) };
    const qOk = (sub, q) => sub.qScore(q) === sub.qMax(q);
    const anaBuild = () => {
      const sub = subs[R.s];
      const qi = R.q[R.s];
      const q = sub.qs[qi];
      const a = att.ans[q.id];
      const got = sub.qScore(q), mx = sub.qMax(q);
      let body;
      if (q.type === "matching") {
        const { stem, right } = splitMatching(q.stem);
        const key = matchingKey(q);
        body = `<div class="an-q">${md(stem)}</div>
          <div class="an-right">${right.map((r) => `<div><b>${r.n})</b> ${md(r.text)}</div>`).join("")}</div>
          ${q.options.map((o) => {
            const mine = a?.[o.id];
            const good = mine && mine === key[o.id];
            return `<div class="an-opt ${good ? "ok" : "bad"}"><span><b>${o.id}</b> ${md(o.content)}</span><span class="an-pair">${mine || "—"}${good ? "" : ` → ${key[o.id]}`}</span></div>`;
          }).join("")}`;
      } else {
        const picked = (k) => (q.type === "multiple_choice" ? a?.has?.(k) : a === k);
        body = `<div class="an-q">${md(q.stem)}</div>
          ${q.options.map((o, k) => `<div class="an-opt ${o.correct ? "ok" : picked(k) ? "bad" : ""}"><span>${md(o.content)}</span>${picked(k) ? icon(o.correct ? "check_circle" : "cancel") : ""}</div>`).join("")}`;
      }
      const okN = (s2) => s2.qs.filter((x) => qOk(s2, x)).length;
      return `
        <div class="an-subs">${subs.map((s2, i) => `<button type="button" class="an-sub ${i === R.s ? "on" : ""}" data-ans="${i}">${ENT_SHORT[s2.key] || s2.title}<small>${okN(s2)}/${s2.qs.length}</small></button>`).join("")}</div>
        <div class="an-nums">${sub.qs.map((x, k) => `<button type="button" class="an-num ${qOk(sub, x) ? "ok" : sub.qScore(x) > 0 ? "part" : "bad"} ${k === qi ? "on" : ""}" data-anq="${k}">${k + 1}</button>`).join("")}</div>
        <div class="an-body">
          ${body}
          <div class="an-ex ${got === mx ? "ok" : "bad"}">
            <b>${got === mx ? "Дұрыс" : got > 0 ? "Жартылай дұрыс" : "Қате"} · ${got}/${mx} балл</b>
            ${got === mx ? "" : `<div>Дұрыс жауабы: ${q.type === "matching" ? q.matching : q.options.filter((o) => o.correct).map((o) => md(o.content)).join("; ")}</div>`}
            ${q.note ? `<div class="an-note">${md(q.note)}</div>` : ""}
          </div>
        </div>`;
    };
    const anaFoot = () => `
      <div class="an-foot">
        <button type="button" class="an-nav" id="anPrev">${icon("arrow_circle_left", "material-icons-outlined")}Артқа</button>
        <button type="button" class="an-nav" id="anNext">Алға${icon("arrow_circle_right", "material-icons-outlined")}</button>
      </div>`;
    const openAnalysis = (si) => {
      R.s = si;
      pushScreen(
        "ҰБТ талдауы",
        anaBuild,
        () => {
          renderMath($("#screenOverlay"));
          $$("[data-ans]").forEach((b) => (b.onclick = () => ((R.s = Number(b.dataset.ans)), paintStack())));
          $$("[data-anq]").forEach((b) => (b.onclick = () => ((R.q[R.s] = Number(b.dataset.anq)), paintStack())));
          $("#anPrev").onclick = () => {
            if (R.q[R.s] > 0) R.q[R.s]--;
            else if (R.s > 0) (R.s--, (R.q[R.s] = subs[R.s].qs.length - 1));
            paintStack();
          };
          $("#anNext").onclick = () => {
            if (R.q[R.s] < subs[R.s].qs.length - 1) R.q[R.s]++;
            else if (R.s < subs.length - 1) (R.s++, (R.q[R.s] = 0));
            paintStack();
          };
          centerIn($(".an-num.on"), "x");
          centerIn($(".an-sub.on"), "x");
        },
        { screenCls: "an-dark", footer: anaFoot }
      );
    };
    pushScreen(
      `Разбор · ${att.variant}-нұсқа`,
      build,
      () => {
        renderMath($("#screenOverlay"));
        $$("[data-masub]").forEach(
          (b) =>
            (b.onclick = () => {
              openAnalysis(Number(b.dataset.masub));
            })
        );
        $("#maCert").onclick = () => {
          const me = MOCK.me;
          const grp = MOCK.groups.find((g) => g.students?.some((x) => x.phone === me.phone));
          openCertificate({
            name: `${me.firstName} ${me.lastName}`,
            phone: me.phone,
            group: grp ? grp.name : "—",
            date: att.date,
            lang: "Қазақ тілі / Казахский",
            rows: subs.map((s2) => ({ key: s2.key, score: s2.score })),
            total: att.total,
          });
        };
      },
      { screenCls: "ent-light" }
    );
  }

  /** История → пән → тапсырылған тесттер → разбор */
  function openSubjectTests(c) {
    const done = courseTests(c).filter((x) => x.done).reverse();
    pushScreen(
      c.title,
      () => `<div class="list-pad" style="padding-top:14px">${
        done
          .map(
            (x, i) => `
        <button type="button" class="hist-row" data-st="${i}">
          ${kindIcon(x.kind)}
          <span style="flex:1;min-width:0"><b>${x.title}</b><small>${x.section || ""}</small></span>
          <b class="hist-sc ${x.score >= 80 ? "up" : x.score >= 60 ? "mid" : "down"}">${x.score}%</b>
          ${icon("chevron_right")}
        </button>`
          )
          .join("") || `<div class="empty">Бұл пән бойынша тест тапсырылмаған</div>`
      }</div>`,
      () => $$("[data-st]").forEach((b) => (b.onclick = () => openLessonTestReview(c, done[Number(b.dataset.st)]))),
      { right: "<span></span>" }
    );
  }
  function openLessonTestReview(c, x) {
    const bank = MOCK.lessonTests[c.id] || MOCK.practice[c.id]?.questions || MOCK.practice[10].questions;
    const H = (t) => (/<span class=/.test(t) ? t : md(t));
    const qs = bank.map((q) => ({ stem: q.q, options: q.options, answer: q.answer, explain: q.explain || "" }));
    const okCount = Math.round((x.score / 100) * qs.length);
    const picks = qs.map((q, i) => (i < okCount ? q.answer : (q.answer + 1) % q.options.length));
    pushScreen(
      x.title,
      () => `
        <div class="er-head" style="padding-top:16px"><div class="er-total"><b>${x.score}</b> из 100</div><div class="er-sub">${c.title} · дұрыс ${okCount} / ${qs.length}</div></div>
        <div class="an-body" style="padding-top:8px">${qs
          .map((q, i) => {
            const ok = picks[i] === q.answer;
            return `<div class="lt-card ${ok ? "ok" : "bad"}">
              <div class="rv-top"><span class="rv-n">${i + 1}</span><span class="lt-st">${ok ? "Дұрыс" : "Қате"}</span></div>
              <div class="an-q">${H(q.stem)}</div>
              ${q.options.map((o, k) => `<div class="an-opt ${k === q.answer ? "ok" : k === picks[i] ? "bad" : ""}"><span>${H(o)}</span>${k === picks[i] ? icon(ok ? "check_circle" : "cancel") : ""}</div>`).join("")}
              <div class="an-ex ${ok ? "ok" : "bad"}"><b>${ok ? "Дұрыс!" : `Дұрыс жауабы: ${H(q.options[q.answer])}`}</b>${q.explain ? `<div class="an-note">${md(q.explain)}</div>` : ""}</div>
            </div>`;
          })
          .join("")}</div>`,
      () => renderMath($("#screenOverlay")),
      { right: "<span></span>", screenCls: "an-dark" }
    );
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
            const items = courseTests(c);
            const done = items.filter((x) => x.done);
            const avg = done.length ? Math.round(done.reduce((t, x) => t + x.score, 0) / done.length) : null;
            pushScreen(
              c.title,
              () =>
                items.length
                  ? `<div class="list-pad cl-list">
                    <div class="tl-sum"><div><b>${done.length}</b><span>из ${items.length} сдано</span></div><div><b>${avg ?? "—"}${avg != null ? "%" : ""}</b><span>средний балл (по сданным)</span></div></div>
                    ${items
                      .map(
                        (x) => `
                  <div class="tl-row ${x.done ? "" : "todo"}">
                    ${kindIcon(x.kind)}
                    <div style="flex:1;min-width:0"><div class="tl-title">${x.title}</div>${x.section ? `<div class="cl-meta">${x.section}</div>` : ""}</div>
                    ${x.done ? `<b class="${x.score >= 80 ? "up" : x.score >= 60 ? "mid" : "down"}">${x.score}%</b>` : `<span class="tl-todo">Не сдан</span>`}
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

  /** Оқушының кесте бойынша жағдайы: бүгін / апта / мерзімі өткен */
  function staffSchedule(s, data) {
    const items = scheduleFor(data, SCHED_START, periodRange("week", AN_TODAY).to).flatMap((r) => {
      const st = rowStatus(s, r);
      if (r.type === "lesson")
        return [
          { date: r.date, kind: "video", title: r.title, done: !!st.watched, future: !!st.future },
          { date: r.date, kind: "test", title: r.title, done: !!st.tested, future: !!st.future, score: st.score },
        ];
      if (r.type === "weekly") return [{ date: r.date, kind: "weekly", title: r.title, done: !!st.done, future: !!st.future, score: st.score }];
      return [];
    });
    const wk = periodRange("week", AN_TODAY);
    const same = (a, b) => dayKey(a) === dayKey(b);
    return {
      today: items.filter((x) => same(x.date, AN_TODAY)),
      week: items.filter((x) => x.date >= wk.from && x.date <= wk.to),
      overdue: items.filter((x) => x.date < new Date(AN_TODAY.getFullYear(), AN_TODAY.getMonth(), AN_TODAY.getDate()) && !x.done),
    };
  }
  function staffSchedHtml(S, f) {
    const tile = (k, n, label, c) => `<button type="button" class="sch-stat ${f === k ? "on" : ""}" data-ssf="${k}" style="--c:${c}"><b>${n}</b><span>${label}</span></button>`;
    const WD = ["Жс", "Дс", "Сс", "Ср", "Бс", "Жм", "Сб"];
    const list = f ? S[f] : [];
    const badge = (x) =>
      x.done ? `<span class="sch-badge ok">${x.score != null ? `${x.score} из 100` : "Пройден"}</span>` : x.date > AN_TODAY || dayKey(x.date) === dayKey(AN_TODAY) ? `<span class="sch-badge">Предстоит</span>` : `<span class="sch-badge bad">Просрочено</span>`;
    return `
      <div class="sch-stats ss-stats">
        ${tile("today", S.today.length, "Сегодня", "#5CB36D")}
        ${tile("week", S.week.length, "На неделе", "#6C7FD8")}
        ${tile("overdue", S.overdue.length, "Просрочено", "#E86B6B")}
      </div>
      ${
        f
          ? `<div class="sch-list-head" style="margin:16px 2px 10px"><span>${{ today: "По расписанию сегодня", week: "Уроки на неделе", overdue: "Просроченные уроки" }[f]}</span><button type="button" id="ssClose">К модулям</button></div>
             ${list.length ? list.map((x) => `
               <div class="sch-card">
                 ${kindIcon(x.kind)}
                 <div style="flex:1;min-width:0">
                   <div class="sch-course">${WD[x.date.getDay()]}, ${pad(x.date.getDate())}.${pad(x.date.getMonth() + 1)}</div>
                   <div class="sch-lesson">${x.title}</div>
                   <div class="sch-tags"><span>${{ video: "Видео", test: "Тест", weekly: "Апталық сынақ" }[x.kind]}</span></div>
                 </div>
                 ${badge(x)}
               </div>`).join("") : `<div class="empty" style="padding:24px">Нет уроков</div>`}`
          : ""
      }`;
  }

  /* —— Апталық сынақ: куратор оқушымен өткізеді (ашық / жабық сұрақ) —— */
  async function weeklyQuestions(courseId, seed) {
    try {
      await loadProbnik();
      const P = window.PROBNIK.subjects[STAFF_SUBJ[courseId] || "world_history"];
      const all = Object.values(P.variants).flat().filter((q) => q.type === "single_choice" && !q.ctx && q.options.filter((o) => o.correct).length === 1);
      return [...all].sort((a, b) => rnd(seed, a.id.length + a.stem.length) - rnd(seed, b.id.length + b.stem.length)).slice(0, 10).map((q) => ({ q: q.stem, options: q.options.map((o) => o.content), answer: q.options.findIndex((o) => o.correct), explain: q.note || "" }));
    } catch {
      return MOCK.practice[10].questions.concat(MOCK.practice[11].questions).slice(0, 10);
    }
  }
  function openWeeklyMode(s, g, data, x) {
    openSheet(`
      <div class="sheet-handle"></div>
      <div class="ef-head"><span>${x.title}</span><button type="button" id="wmClose">${icon("close")}</button></div>
      <div class="ga-csub" style="margin:-4px 0 14px">${s.name} · 10 сұрақ · ${x.result != null ? `қазір ${x.result} из 100` : "әлі тапсырылмаған"}</div>
      <button type="button" class="wm-opt" data-wm="open">${icon("record_voice_over", "material-icons-outlined")}<span><b>Ашық сұрақ</b><small>Сұрақ пен жауабы ғана көрінеді. Оқушы ауызша жауап береді, сіз «Дұрыс / Дұрыс емес» белгілейсіз</small></span>${icon("chevron_right")}</button>
      <button type="button" class="wm-opt" data-wm="closed">${icon("checklist", "material-icons-outlined")}<span><b>Жабық сұрақ</b><small>Тренажёрдағыдай жауап нұсқаларымен</small></span>${icon("chevron_right")}</button>`);
    $("#wmClose").onclick = closeSheet;
    $$("[data-wm]").forEach((b) => (b.onclick = () => (closeSheet(), runWeekly(s, g, data, x, b.dataset.wm))));
  }
  async function runWeekly(s, g, data, x, mode) {
    const qs = await weeklyQuestions(data.cid, s.id * 31 + x.title.length);
    const W = { i: 0, correct: 0, answered: 0, picked: null, checked: false, done: false };
    const total = qs.length;
    const finish = () => {
      W.done = true;
      const score = Math.round((W.correct / total) * 100);
      const old = x.result;
      x.result = score;
      x.wMode = mode;
      if (old != null) s.score = Math.max(0, (s.score || 0) - Math.round(old / 10) + Math.round(score / 10));
      else s.score = (s.score || 0) + Math.round(score / 10);
      if (g) {
        g.students.sort((a, b) => b.score - a.score);
        g.students.forEach((y, i) => ((y.rank = i + 1), (y.medal = i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : null)));
      }
      W.old = old;
      W.score = score;
      paintStack();
    };
    const build = () => {
      if (W.done)
        return `<div class="pr-result">
          <div class="pr-result-ico">${W.score >= 80 ? "🎉" : W.score >= 50 ? "👍" : "💪"}</div>
          <div class="pr-result-title">Апталық сынақ аяқталды</div>
          <div class="pr-result-score">${W.score} <small style="font-size:16px;color:#9a9db0">из 100</small></div>
          <div class="pr-result-sub">Дұрыс: ${W.correct} / ${total} сұрақ (${mode === "open" ? "ашық" : "жабық"})${W.old != null ? `<br>Бұрынғы нәтиже ${W.old} → ${W.score}` : ""}<br>Рейтингке жазылды</div>
        </div>`;
      const q = qs[W.i];
      const head = `<div class="pr-head">
          <div class="pr-top"><span class="pr-badge">${mode === "open" ? "Ашық сұрақ" : "Жабық сұрақ"}</span><b>${W.correct} / ${W.answered}</b></div>
          <div class="pr-bar warm"><i style="width:${(W.answered / total) * 100}%"></i></div>
          <div class="pr-status">Сұрақ ${W.i + 1} из ${total} · ${s.name}</div>
        </div>`;
      if (mode === "open")
        return `${head}<div class="pr-body">
          <div class="pr-q">${md(q.q)}</div>
          <div class="wk-ans"><div class="wk-l">Жауабы</div><b>${md(q.options[q.answer])}</b>${q.explain ? `<div class="pr-explain wk-ex">${md(q.explain)}</div>` : ""}</div>
        </div>`;
      return `${head}<div class="pr-body">
        <div class="pr-q">${md(q.q)}</div>
        ${q.options
          .map((o, k) => {
            let cls = "";
            if (W.checked && k === q.answer) cls = "ok";
            else if (W.checked && k === W.picked) cls = "bad";
            else if (!W.checked && k === W.picked) cls = "sel";
            return `<button type="button" class="pr-opt ${cls}" data-wq="${k}"><span class="pr-radio"></span><span>${md(o)}</span></button>`;
          })
          .join("")}
        ${W.checked ? `<div class="pr-fb ${W.picked === q.answer ? "ok" : "bad"}"><div class="pr-fb-title">${W.picked === q.answer ? "Верно" : "Неверно"}</div><div class="pr-explain">${W.picked === q.answer ? "<b>Дұрыс!</b> " : `<b>Дұрыс емес.</b> Дұрыс жауабы: <b>${md(q.options[q.answer])}</b> `}${md(q.explain || "")}</div></div>` : ""}
      </div>`;
    };
    const footer = () => {
      if (W.done) return `<div class="sticky-foot"><button type="button" class="ef-submit" id="wkBack" style="margin:0">Курсқа оралу</button></div>`;
      if (mode === "open")
        return `<div class="sticky-foot wk-foot"><button type="button" class="wk-btn bad" id="wkNo">${icon("close")}Дұрыс емес</button><button type="button" class="wk-btn ok" id="wkYes">${icon("check")}Дұрыс</button></div>`;
      const label = !W.checked ? "Ответить" : W.i + 1 < total ? "Дальше" : "Завершить";
      return `<div class="sticky-foot"><button type="button" class="smart-btn pr-go" id="wkGo">${label}</button></div>`;
    };
    const next = () => {
      W.i += 1;
      W.picked = null;
      W.checked = false;
      if (W.i >= total) finish();
      else paintStack();
    };
    pushScreen(
      x.title,
      build,
      () => {
        renderMath($("#screenOverlay"));
        $("#wkYes")?.addEventListener("click", () => ((W.correct += 1), (W.answered += 1), next()));
        $("#wkNo")?.addEventListener("click", () => ((W.answered += 1), next()));
        $$("[data-wq]").forEach((b) => (b.onclick = () => !W.checked && ((W.picked = Number(b.dataset.wq)), paintStack())));
        $("#wkGo")?.addEventListener("click", () => {
          if (!W.checked) {
            if (W.picked == null) return toast("Жауапты таңдаңыз", "err");
            W.checked = true;
            W.answered += 1;
            if (W.picked === qs[W.i].answer) W.correct += 1;
            paintStack();
          } else next();
        });
        $("#wkFlag")?.addEventListener("click", async () => {
          if (W.done) return;
          const ok = await confirmDialog({ title: "Сынақты аяқтау?", message: `Жауап берілгені: ${W.answered} / ${total}. Қалған сұрақтар қате деп есептеледі. Балл ${total} сұраққа шаққанда есептеледі.`, confirmLabel: "Аяқтау" });
          if (ok) finish();
        });
        $("#wkBack")?.addEventListener("click", () => {
          state.navStack.pop();
          paintStack();
        });
      },
      { footer, right: `<button type="button" class="appbar-icon-btn" id="wkFlag" title="Аяқтау">${icon("outlined_flag")}</button>` }
    );
  }

  function openStaffCourse(s, data) {
    const open = {};
    let ssf = null;
    const build = () => `
      <div class="list-pad course-secs staff-secs" style="--acc:#2e3a34">${staffSchedHtml(staffSchedule(s, data), ssf)}${ssf ? "" : `<div style="height:12px"></div>`}${ssf ? "" : data.sections
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
      $$("[data-ssf]").forEach((b) => (b.onclick = () => ((ssf = ssf === b.dataset.ssf ? null : b.dataset.ssf), paintStack())));
      $("#ssClose")?.addEventListener("click", () => ((ssf = null), paintStack()));
      $$("[data-ssec]").forEach((b) => (b.onclick = () => ((open[b.dataset.ssec] = !open[b.dataset.ssec]), paintStack())));
      $$("[data-sitem]").forEach((b) => {
        b.onclick = () => {
          const x = data.flat[Number(b.dataset.sitem)];
          if (x.state === "locked") return toast("Студент ещё не открыл этот урок", "err");
          if (x.kind === "weekly") return openWeeklyMode(s, MOCK.groups.find((gg) => gg.students.includes(s)), data, x);
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

  /** Конспект беттері (макет: дәптер беттері; нағыз нұсқада — оқушы жүктеген фотолар) */
  function conspectPages(x) {
    const n = 2 + (x.title.length % 3);
    return Array.from({ length: n }, (_, p) => {
      const lines = Array.from({ length: 11 }, (_, i) => `<i style="width:${48 + ((i * 37 + p * 23) % 46)}%;${i % 4 === 0 ? "background:#c0392b;opacity:.55;height:4px" : ""}"></i>`).join("");
      return `<div class="cs-page"><div class="cs-head">${x.title}</div><div class="cs-lines">${lines}</div><span class="cs-file">${icon("image", "material-icons-outlined")}${p + 1} / ${n}</span></div>`;
    });
  }
  /** Саусақпен (және тінтуірмен) сырғытылатын галерея: иконкасыз, нүктелер */
  function bindSwipe(track, dots) {
    if (!track) return;
    const sync = () => {
      const i = Math.round(track.scrollLeft / track.clientWidth);
      dots && $$("i", dots).forEach((d, k) => d.classList.toggle("on", k === i));
    };
    track.addEventListener("scroll", sync, { passive: true });
    let down = false, x0 = 0, s0 = 0, moved = false;
    track.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse") return;
      down = true; moved = false; x0 = e.clientX; s0 = track.scrollLeft;
      track.style.scrollSnapType = "none";
    });
    window.addEventListener("pointermove", (e) => {
      if (!down) return;
      if (Math.abs(e.clientX - x0) > 4) moved = true;
      track.scrollLeft = s0 - (e.clientX - x0);
    });
    window.addEventListener("pointerup", () => {
      if (!down) return;
      down = false;
      const w = track.clientWidth;
      const i = Math.round(track.scrollLeft / w);
      track.style.scrollSnapType = "";
      track.scrollTo({ left: i * w, behavior: "smooth" });
    });
    track.addEventListener("click", (e) => moved && (e.stopPropagation(), e.preventDefault(), (moved = false)), true);
  }
  function openConspectFull(pages, start) {
    const layer = document.createElement("div");
    layer.className = "cs-full";
    layer.innerHTML = `
      <button type="button" class="cs-full-x">${icon("close")}</button>
      <div class="cs-full-track" id="csFullTrack">${pages.map((p) => `<div class="cs-full-slide">${p}</div>`).join("")}</div>
      <div class="cs-dots light" id="csFullDots">${pages.map((_, i) => `<i class="${i === start ? "on" : ""}"></i>`).join("")}</div>`;
    $(".phone .app").appendChild(layer);
    const tr = layer.querySelector("#csFullTrack");
    requestAnimationFrame(() => (tr.scrollLeft = start * tr.clientWidth));
    bindSwipe(tr, layer.querySelector("#csFullDots"));
    layer.querySelector(".cs-full-x").onclick = () => layer.remove();
  }

  function openConspect(s, x) {
    const pages = conspectPages(x);
    const pending = x.note === "pending";
    openSheet(
      `
      <div class="sheet-handle"></div>
      <div class="sheet-title">Конспект</div>
      <div class="sheet-sub">${s.name} · ${x.title}<br>${x.date} · ${pages.length} ${plural(pages.length, "бет", "бет", "бет")}</div>
      <div class="cs-track" id="csTrack">${pages.map((p, i) => `<button type="button" class="cs-slide" data-csi="${i}">${p}</button>`).join("")}</div>
      <div class="cs-dots" id="csDots">${pages.map((_, i) => `<i class="${i ? "" : "on"}"></i>`).join("")}</div>
      ${
        pending
          ? `<div class="ef-label" style="margin-top:6px">Комментарий для ученика</div>
             <textarea class="ef-input nf-text cs-com" id="csCom" placeholder="Например: допиши выводы по теме, перепиши разборчивее…">${x.comment || ""}</textarea>
             <div class="sheet-actions btn-row" style="margin-top:12px">
              <button type="button" class="btn cs-back" id="csBack">Вернуть</button>
              <button type="button" class="btn btn-primary" id="csOk">Принять</button>
            </div>`
          : `<div class="cs-status ${x.note}">${x.note === "ok" ? "Конспект принят" : "Отправлен на доработку"}</div>
             ${x.comment ? `<div class="cs-comment">${icon("chat_bubble_outline", "material-icons-outlined")}<span>${x.comment}</span></div>` : ""}`
      }`,
      { tall: true }
    );
    bindSwipe($("#csTrack"), $("#csDots"));
    $$("[data-csi]").forEach((b) => (b.onclick = () => openConspectFull(pages, Number(b.dataset.csi))));
    const decide = (note) => {
      x.note = note;
      x.comment = $("#csCom").value.trim();
      if (note === "back" && !x.comment) return toast("Напишите комментарий — что исправить", "err");
      closeSheet();
      toast(note === "ok" ? `Конспект принят${x.comment ? " · комментарий отправлен" : ""}` : "Конспект возвращён на доработку · комментарий отправлен");
      paintStack();
    };
    $("#csOk") && ($("#csOk").onclick = () => decide("ok"));
    $("#csBack") && ($("#csBack").onclick = () => decide("back"));
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

  /* —— Отчёт: расписание бойынша апта / ай —— */
  const SCHED_START = new Date(2026, 8, 1); // курс 1 қыркүйектен басталды
  /**
   * Кесте: Дс–Жм күн сайын 1 сабақ (видео → конспект → тест),
   * Жм кешке эфир, Сб апталық сынақ. Апта ретімен: сабақтар, эфир, апталық сынақ.
   */
  function scheduleFor(data, from, to) {
    const topics = data.flat.filter((x) => x.kind === "video").map((x) => x.title);
    const rows = [];
    let n = 0, week = 1;
    for (let d = new Date(SCHED_START); d <= to; d.setDate(d.getDate() + 1)) {
      const wd = d.getDay();
      const day = new Date(d);
      if (wd === 1 && day > SCHED_START) week++;
      if (wd >= 1 && wd <= 5) {
        n++;
        const title = topics[(n - 1) % topics.length];
        if (day >= from) rows.push({ type: "lesson", n, week, date: day, title });
        if (wd === 5 && day >= from) rows.push({ type: "efir", week, date: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 19, 0), title: `Эфир: разбор ${week}-недели` });
      } else if (wd === 6 && day >= from) {
        rows.push({ type: "weekly", week, date: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 10, 0), title: `Апталық сынақ (${week} - апта)` });
      }
    }
    return rows;
  }
  const hm = (d) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  /** Оқушының орындауы (тұрақты жалған деректер) */
  function rowStatus(s, r) {
    if (r.date > AN_TODAY) return { future: true };
    const skill = (s.score || 0) / 100;
    const k = dayKey(r.date);
    const at = (h, m) => new Date(r.date.getFullYear(), r.date.getMonth(), r.date.getDate(), h, m);
    if (r.type === "lesson") {
      const len = 12 + Math.floor(rnd(s.id, k, 1) * 9);
      const watched = rnd(s.id, k, 2) < 0.35 + skill * 0.6;
      const min = watched ? len : Math.floor(len * rnd(s.id, k, 3) * 0.6);
      const vt = at(15 + Math.floor(rnd(s.id, k, 4) * 7), Math.floor(rnd(s.id, k, 5) * 60));
      const noteSent = watched && rnd(s.id, k, 6) < 0.45 + skill * 0.5;
      const fresh = (AN_TODAY - r.date) / 864e5 <= 2;
      const note = !noteSent ? "none" : fresh ? "pending" : rnd(s.id, k, 7) < 0.85 ? "ok" : "back";
      const tested = watched && rnd(s.id, k, 8) < 0.4 + skill * 0.6;
      const score = tested ? Math.round((45 + skill * 40 + rnd(s.id, k, 9) * 20) / 5) * 5 : null;
      return { watched, min, len, vTime: watched || min ? vt : null, note, tested, score, tTime: tested ? new Date(vt.getTime() + (25 + rnd(s.id, k, 10) * 40) * 6e4) : null };
    }
    if (r.type === "efir") return { attended: rnd(s.id, k, 11) < 0.4 + skill * 0.5 };
    const done = rnd(s.id, k, 12) < 0.5 + skill * 0.5;
    return { done, score: done ? Math.round((50 + skill * 40 + rnd(s.id, k, 13) * 15) / 5) * 5 : null, time: done ? at(10, Math.floor(rnd(s.id, k, 14) * 50)) : null };
  }

  /* —— Отчёт → PDF (ақ бланк, A4) —— */
  let pdfLibs = null;
  function loadPdfLibs() {
    if (!pdfLibs)
      pdfLibs = Promise.all([
        loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"),
        loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"),
      ]);
    return pdfLibs;
  }
  function reportDocHtml(s, data, c, label, periodWord) {
    const ex = studentExtra(s);
    const cell = (v, cls = "") => `<td class="${cls}">${v}</td>`;
    const st = (ok, yes, no) => `<span class="${ok ? "ok" : "bad"}">${ok ? yes : no}</span>`;
    const noteTxt = { none: ["bad", "Не сдан"], pending: ["warn", "На проверке"], ok: ["ok", "Принят"], back: ["bad", "На доработке"] };
    const rows = c.rows
      .map((r) => {
        const t = r.st;
        if (t.future) return `<tr class="fut">${cell(r.n ? r.n + "." : "")}${cell(r.type === "lesson" ? "Урок" : r.type === "efir" ? "Эфир" : "Апталық сынақ")}${cell(r.title)}<td colspan="4">Предстоит</td></tr>`;
        if (r.type === "lesson")
          return `<tr>${cell(r.n + ".")}${cell("Видео")}${cell(r.title)}${cell(`${t.min} / ${t.len} мин`)}${cell(st(t.watched, "Пройден", t.min ? "Не досмотрел" : "Не пройден"))}${cell(t.vTime ? hm(t.vTime) : "—")}${cell(`<span class="${noteTxt[t.note][0]}">${noteTxt[t.note][1]}</span>`)}</tr>
            <tr>${cell("")}${cell("Тест")}${cell(r.title)}${cell(t.tested ? `${t.score} из 100` : "—")}${cell(st(t.tested, "Пройден", "Не сдан"))}${cell(t.tTime ? hm(t.tTime) : "—")}${cell("—")}</tr>`;
        if (r.type === "efir") return `<tr class="sp">${cell("")}${cell("Эфир")}${cell(r.title)}${cell("—")}${cell(st(t.attended, "Присутствовал", "Не был"))}${cell(hm(r.date))}${cell("—")}</tr>`;
        return `<tr class="sp">${cell("")}${cell("Апталық сынақ")}${cell(r.title)}${cell(t.done ? `${t.score} из 100` : "—")}${cell(st(t.done, "Пройден", "Не сдан"))}${cell(t.time ? hm(t.time) : hm(r.date))}${cell("—")}</tr>`;
      })
      .join("");
    const pct = c.due ? Math.round((c.done / c.due) * 100) : 0;
    return `
      <div class="pdoc">
        <div class="pdoc-head"><b>I4U</b><div>I4U.kz Білім беру орталығы<br>Образовательный центр I4U.kz</div></div>
        <h1>Отчёт об успеваемости</h1>
        <div class="pdoc-sub">${periodWord === "week" ? "Неделя" : "Месяц"}: ${label} · сформирован ${dmy(new Date())}</div>
        <table class="pdoc-info">
          <tr><td>Ученик</td><td><b>${s.name}</b></td><td>Курс</td><td><b>${data.poster.title}</b></td></tr>
          <tr><td>Телефон</td><td>${s.phone}</td><td>Группа</td><td>${MOCK.groups.find((g) => g.students.includes(s))?.name || "—"}</td></tr>
          <tr><td>Родитель</td><td>${ex.parentName}</td><td>Куратор</td><td>Диана</td></tr>
        </table>
        <div class="pdoc-plan">План по расписанию: <b>${c.plan.lessons}</b> уроков · <b>${c.plan.efirs}</b> эфир · <b>${c.plan.weekly}</b> апталық сынақ.
          Выполнено <b>${c.done} из ${c.due}</b> (${pct}%).</div>
        <table class="pdoc-sum">
          <tr><th>Видео</th><th>Конспекты</th><th>Тесты</th><th>Эфиры</th><th>Апталық сынақ</th><th>Средний балл</th></tr>
          <tr><td>${c.watched} / ${c.lDue}</td><td>${c.notes} / ${c.lDue}</td><td>${c.tests} / ${c.lDue}</td><td>${c.efirs} / ${c.eDue}</td><td>${c.weekly} / ${c.wDue}</td><td>${c.avg ?? "—"}</td></tr>
        </table>
        <table class="pdoc-tbl">
          <tr><th>№</th><th>Тип</th><th>Название</th><th>Прогресс</th><th>Статус</th><th>Дата и время</th><th>Конспект</th></tr>
          ${rows}
        </table>
        <div class="pdoc-foot">Отчёт сформирован автоматически в приложении I4U.</div>
      </div>`;
  }
  async function makeReportPdf(html, fileName) {
    await loadPdfLibs();
    const box = document.createElement("div");
    box.className = "pdoc-host";
    box.innerHTML = html;
    document.body.appendChild(box);
    try {
      const canvas = await window.html2canvas(box.firstElementChild, { scale: 2, backgroundColor: "#ffffff" });
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const pagePx = Math.floor((canvas.width * ph) / pw);
      for (let y = 0, i = 0; y < canvas.height; y += pagePx, i++) {
        const part = document.createElement("canvas");
        part.width = canvas.width;
        part.height = Math.min(pagePx, canvas.height - y);
        part.getContext("2d").drawImage(canvas, 0, y, canvas.width, part.height, 0, 0, canvas.width, part.height);
        if (i) pdf.addPage();
        pdf.addImage(part.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, pw, (part.height * pw) / canvas.width);
      }
      return new File([pdf.output("blob")], fileName, { type: "application/pdf" });
    } finally {
      box.remove();
    }
  }
  function saveFile(file) {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function openStudentReport(s, data) {
    const R = { period: "week", date: new Date(AN_TODAY) };
    const calc = () => {
      const { from, to } = periodRange(R.period, R.date);
      const rows = scheduleFor(data, from, to).map((r) => ({ ...r, st: rowStatus(s, r) }));
      const L = rows.filter((r) => r.type === "lesson"), Lp = L.filter((r) => !r.st.future);
      const E = rows.filter((r) => r.type === "efir"), Ep = E.filter((r) => !r.st.future);
      const W = rows.filter((r) => r.type === "weekly"), Wp = W.filter((r) => !r.st.future);
      const scores = [...Lp.filter((r) => r.st.tested).map((r) => r.st.score), ...Wp.filter((r) => r.st.done).map((r) => r.st.score)];
      const due = Lp.length * 3 + Ep.length + Wp.length;
      const done = Lp.reduce((t, r) => t + (r.st.watched ? 1 : 0) + (r.st.note !== "none" ? 1 : 0) + (r.st.tested ? 1 : 0), 0) + Ep.filter((r) => r.st.attended).length + Wp.filter((r) => r.st.done).length;
      return {
        from, to, rows,
        plan: { lessons: L.length, efirs: E.length, weekly: W.length },
        due, done,
        watched: Lp.filter((r) => r.st.watched).length, lDue: Lp.length,
        notes: Lp.filter((r) => r.st.note !== "none").length,
        tests: Lp.filter((r) => r.st.tested).length,
        efirs: Ep.filter((r) => r.st.attended).length, eDue: Ep.length,
        weekly: Wp.filter((r) => r.st.done).length, wDue: Wp.length,
        avg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
      };
    };
    const pctCls = (v) => (v >= 80 ? "ok" : v >= 60 ? "mid" : "low");
    const row = (iconHtml, title, prog, status, time, extra = "") => `
      <div class="rt-row">
        <span class="rt-ico">${iconHtml}</span>
        <div class="rt-main">
          <div class="rt-title">${title}</div>
          <div class="rt-line">${prog}${status}</div>
          ${time ? `<div class="rt-time">${time}</div>` : ""}
        </div>
        ${extra}
      </div>`;
    const FUT = `<span class="rt-st fut">Предстоит</span>`;
    const build = () => {
      const c = calc();
      const pct = c.due ? Math.round((c.done / c.due) * 100) : 0;
      const word = R.period === "week" ? "неделю" : "месяц";
      let lastWeek = null;
      const list = c.rows
        .map((r) => {
          let head = "";
          if (R.period === "month" && r.week !== lastWeek) {
            lastWeek = r.week;
            head = `<div class="rt-week">${r.week}-апта</div>`;
          }
          const st = r.st;
          if (r.type === "lesson") {
            const noteTag = st.future
              ? `<span class="rt-dash">—</span>`
              : {
                  none: `<span class="rt-st bad">Не сдан</span>`,
                  pending: `<span class="rt-st warn">На проверке</span>`,
                  ok: `<span class="rt-st ok">Принят</span>`,
                  back: `<span class="rt-st bad">На доработке</span>`,
                }[st.note];
            return `${head}
              <div class="rt-lesson ${st.future ? "fut" : ""}">
                <div class="rt-n">${r.n}.</div>
                <div style="flex:1;min-width:0">
                  ${row(
                    PLAY_SVG,
                    r.title,
                    st.future ? "" : `<span class="rt-prog"><b class="g">${st.min}</b> мин из <b class="b">${st.len}</b> мин</span>`,
                    st.future ? FUT : `<span class="rt-st ${st.watched ? "ok" : "bad"}">${st.watched ? "Пройден" : st.min ? "Не досмотрел" : "Не пройден"}</span>`,
                    st.vTime ? hm(st.vTime) : ""
                  )}
                  ${row(
                    icon("description", "material-icons-outlined"),
                    "Конспект",
                    "",
                    noteTag,
                    "",
                    !st.future && st.note !== "none" ? `<button type="button" class="rt-see" data-rt-note="${r.n}">Посмотреть</button>` : ""
                  )}
                  ${row(
                    icon("assignment_turned_in", "material-icons-outlined"),
                    r.title,
                    st.tested ? `<span class="rt-prog"><b class="g">${st.score}</b> из <b class="b">100</b> <b class="${pctCls(st.score)}">(${st.score}%)</b></span>` : "",
                    st.future ? FUT : `<span class="rt-st ${st.tested ? "ok" : "bad"}">${st.tested ? "Пройден" : "Не сдан"}</span>`,
                    st.tTime ? hm(st.tTime) : ""
                  )}
                </div>
              </div>`;
          }
          if (r.type === "efir")
            return `${head}<div class="rt-lesson special ${st.future ? "fut" : ""}"><div class="rt-n"></div><div style="flex:1;min-width:0">${row(
              icon("live_tv", "material-icons-outlined"),
              r.title,
              "",
              st.future ? FUT : `<span class="rt-st ${st.attended ? "ok" : "bad"}">${st.attended ? "Присутствовал" : "Не был"}</span>`,
              hm(r.date)
            )}</div></div>`;
          return `${head}<div class="rt-lesson special ${st.future ? "fut" : ""}"><div class="rt-n"></div><div style="flex:1;min-width:0">${row(
            `<span class="material-icons-outlined" style="color:#A05AD8">calendar_month</span>`,
            r.title,
            st.done ? `<span class="rt-prog"><b class="g">${st.score}</b> из <b class="b">100</b> <b class="${pctCls(st.score)}">(${st.score}%)</b></span>` : "",
            st.future ? FUT : `<span class="rt-st ${st.done ? "ok" : "bad"}">${st.done ? "Пройден" : "Не сдан"}</span>`,
            st.time ? hm(st.time) : hm(r.date)
          )}</div></div>`;
        })
        .join("");
      return `
        <div class="ga">
          <div class="ga-head">
            <div class="ga-title">${s.name}</div>
            <div class="ga-sub">${data.poster.title} · отчёт по расписанию</div>
          </div>
          <div class="ga-period">
            <div class="seg-tabs ga-seg" style="margin:0">
              ${[["week", "Неделя"], ["month", "Месяц"]].map(([k, l]) => `<button type="button" data-rp-period="${k}" class="${R.period === k ? "on" : ""}">${l}</button>`).join("")}
            </div>
            <div class="ga-dnav">
              <button type="button" class="sch-arrow" data-rp-shift="-1">${icon("chevron_left")}</button>
              <div class="ga-date">${icon("calendar_today")}${periodLabel(R.period, R.date)}</div>
              <button type="button" class="sch-arrow" data-rp-shift="1" ${c.to >= AN_TODAY ? "disabled" : ""}>${icon("chevron_right")}</button>
            </div>
          </div>

          <div class="ga-card" style="margin-top:0">
            <div class="ga-ctitle">План на ${word} по расписанию</div>
            <div class="rp-plan">${c.plan.lessons} ${plural(c.plan.lessons, "урок", "урока", "уроков")} · ${c.plan.efirs} ${plural(c.plan.efirs, "эфир", "эфира", "эфиров")} · ${c.plan.weekly} апталық сынақ
              <small>Каждый урок: видео → конспект → тест · в конце недели эфир и апталық сынақ</small></div>
            <div class="gp-row">
              <div class="gp-big"><b>${c.done}<span style="font-size:16px;color:#8a8d9c;display:inline"> / ${c.due}</span></b><span>${c.to > AN_TODAY ? "выполнено из положенного на сегодня" : "выполнено за период"}</span></div>
              <div class="gp-pct ${pct >= 90 ? "ok" : pct >= 60 ? "mid" : "low"}">${pct}%</div>
            </div>
            <div class="gp-bar"><i style="width:${pct}%"></i></div>
          </div>

          <div class="ga-tiles rp-tiles">
            <div class="ga-tile"><span>${icon("smart_display", "material-icons-outlined")}Видео</span><b>${c.watched}<small> / ${c.lDue}</small></b></div>
            <div class="ga-tile"><span>${icon("description", "material-icons-outlined")}Конспекты</span><b>${c.notes}<small> / ${c.lDue}</small></b></div>
            <div class="ga-tile"><span>${icon("assignment_turned_in", "material-icons-outlined")}Тесты</span><b>${c.tests}<small> / ${c.lDue}</small></b></div>
            <div class="ga-tile"><span>${icon("live_tv", "material-icons-outlined")}Эфиры</span><b>${c.efirs}<small> / ${c.eDue}</small></b></div>
            <div class="ga-tile"><span>${icon("calendar_month", "material-icons-outlined")}Апталық сынақ</span><b>${c.weekly}<small> / ${c.wDue}</small></b></div>
            <div class="ga-tile"><span>${icon("grade", "material-icons-outlined")}Средний балл</span><b>${c.avg ?? "—"}<small>${c.avg != null ? " из 100" : ""}</small></b></div>
          </div>

          <div class="ga-card">
            <div class="ga-ctitle">По порядку</div>
            ${list || `<div class="ga-csub" style="margin-top:10px">Нет уроков в этом периоде</div>`}
          </div>
        </div>`;
    };
    const waText = () => {
      const c = calc();
      return encodeURIComponent(
        `Отчёт I4U · ${s.name}\n${data.poster.title}, ${R.period === "week" ? "неделя" : "месяц"} ${periodLabel(R.period, R.date)}\n` +
          `План: ${c.plan.lessons} уроков, ${c.plan.efirs} эфир, ${c.plan.weekly} апталық сынақ\n` +
          `Видео: ${c.watched}/${c.lDue}\nКонспекты: ${c.notes}/${c.lDue}\nТесты: ${c.tests}/${c.lDue}\nЭфиры: ${c.efirs}/${c.eDue}\nАпталық сынақ: ${c.weekly}/${c.wDue}` +
          (c.avg != null ? `\nСредний балл: ${c.avg}` : "")
      );
    };
    pushScreen(
      "Отчёт",
      build,
      () => {
        $$("[data-rp-period]").forEach((b) => (b.onclick = () => ((R.period = b.dataset.rpPeriod), paintStack())));
        $$("[data-rp-shift]").forEach((b) => {
          b.onclick = () => {
            const k = Number(b.dataset.rpShift);
            const d = new Date(R.date);
            if (R.period === "week") d.setDate(d.getDate() + 7 * k);
            else d.setMonth(d.getMonth() + k, 1);
            R.date = d > AN_TODAY ? new Date(AN_TODAY) : d < SCHED_START ? new Date(SCHED_START) : d;
            paintStack();
          };
        });
        $$("[data-rt-note]").forEach((b) => {
          b.onclick = () => {
            const r = calc().rows.find((x) => x.type === "lesson" && x.n === Number(b.dataset.rtNote));
            const x = { title: r.title, date: hm(r.st.vTime || r.date), note: r.st.note === "pending" ? "pending" : r.st.note };
            openConspect(s, x);
          };
        });
        const pdfFile = async () => {
          const c = calc();
          const label = periodLabel(R.period, R.date);
          const name = `I4U_otchet_${s.name.replace(/\s+/g, "_")}_${label.replace(/[^\dа-яёәіңғүұқөһa-z]+/gi, "-")}.pdf`;
          return makeReportPdf(reportDocHtml(s, data, c, label, R.period), name);
        };
        const busy = (b, on, txt) => {
          b.disabled = on;
          b.dataset.t = b.dataset.t || b.innerHTML;
          b.innerHTML = on ? txt : b.dataset.t;
        };
        // Макет: WhatsApp Business API арқылы жіберуді көрсетеді (сервер жоқ — PDF жасалады, жіберу имитация)
        $("#rpSend").onclick = async (e) => {
          const b = e.currentTarget;
          const phone = studentExtra(s).parentPhone;
          if (String(phone).replace(/\D/g, "").length < 10) return toast("Номер родителя не указан", "err");
          busy(b, true, "Отправляем PDF…");
          try {
            const file = await pdfFile();
            await new Promise((r) => setTimeout(r, 700));
            b.dataset.t = `${icon("check_circle")}Отправлено`;
            toast(`PDF-отчёт отправлен в WhatsApp родителю ${phone}`);
            (s.reportsSent = s.reportsSent || []).unshift({ at: new Date(), period: periodLabel(R.period, R.date), size: file.size });
          } catch {
            toast("Не удалось отправить отчёт", "err");
          }
          busy(b, false);
        };
      },
      {
        right: "<span></span>",
        footer: () => `<div class="sticky-foot rp-foot"><button type="button" class="ef-submit" id="rpSend" style="margin:0">${waSvg()}Отправить родителю</button></div>`,
      }
    );
  }

  function openStudentEdit(s) {
    const ex = studentExtra(s);
    openSheet(
      `
      <div class="sheet-handle"></div>
      <div class="sheet-title">Изменить данные</div>
      <div class="ef-label">ФИО родителя</div><input class="ef-input" id="seParent" value="${ex.parentName === "—" ? "" : ex.parentName}" placeholder="Иванова Айгүл" />
      <div class="ef-label">Номер родителя</div><input class="ef-input" id="sePhone" value="${ex.parentPhone}" />
      <div class="ef-label">Класс</div>
      <label class="ef-select"><span id="seGradeL">${ex.grade}</span><select id="seGrade">${["9 класс", "10 класс", "11 класс", "Выпускник"].map((g) => `<option ${g === ex.grade ? "selected" : ""}>${g}</option>`).join("")}</select>${icon("expand_more")}</label>
      <button type="button" class="ef-submit" id="seSave">Сохранить</button>`,
      { tall: true }
    );
    $("#seGrade").onchange = () => ($("#seGradeL").textContent = $("#seGrade").value);
    $("#seSave").onclick = () => {
      ex.parentName = $("#seParent").value.trim() || "—";
      ex.parentPhone = $("#sePhone").value.trim() || "—";
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

  /** Куратор — тек өз топтары; бас куратор / академ. бөлім басшысы — барлық топ */
  const MY_CURATOR_ID = 1;
  function visibleGroups() {
    return state.staffRole === "head" ? MOCK.groups : MOCK.groups.filter((g) => g.curatorId === MY_CURATOR_ID);
  }

  function renderGroups() {
    return `
      <div class="list-pad groups-list">
        ${state.staffRole === "head" ? `<div class="t3-sec" style="margin:2px 2px 10px">Барлық топтар · ${MOCK.groups.length}</div>` : ""}
        ${visibleGroups()
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
        ${visibleGroups()
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

  /* —— Көрсеткіштерге түсіндірме: не екені, қалай есептеледі, мысал —— */
  function openMetricExplain(key, a, period, g) {
    const W = { day: "күн", week: "апта", month: "ай" }[period];
    const RU = { day: "день", week: "неделю", month: "месяц" }[period];
    const n = g.students.length;
    const pct = a.plan ? Math.round((a.avgLessons / a.plan) * 100) : 0;
    const E = {
      ent: {
        t: "Пробный ЕНТ · средний балл группы",
        what: `Таңдалған кезеңде (${W}) тапсырылған барлық сынақ ҰБТ нәтижелерінің орташасы. Максимум 140 балл.`,
        how: ["Кезеңдегі әр оқушының әр пробный нәтижесі алынады", "Барлығы қосылып, нәтижелер санына бөлінеді", "«к прошлому периоду» — алдыңғы кезеңнің орташасымен айырмасы", "Жолақтағы сызық — грантқа қатысу шегі 50 балл", "«≥ 50 баллов» — соңғы пробныйда 50-ден жоғары жинағандар"],
        ex: a.entAvg != null ? `${a.entCount} оқушы тапсырды → орташа ${a.entAvg} / 140. ${a.entGrant} оқушы ≥ 50.` : "Бұл кезеңде пробный болмады.",
        src: "Студенттің «Тесты → ЕНТ» бөлімінде тапсырған сынақ ҰБТ-лары.",
      },
      points: {
        t: `Средний балл за ${RU}`,
        what: "Топ рейтингіндегі балдардың орташасы — оқушы кезең ішінде жинаған белсенділік ұпайы.",
        how: ["Әр тапсырылған сабақ тесті: нәтиже / 10 ұпай (мысалы 80 из 100 → 8 ұпай)", "Оқушының кезеңдегі барлық ұпайы қосылады", "Топтағы барлық оқушының ұпайы қосылып, оқушы санына бөлінеді (тапсырмағандар 0 болып есептеледі)"],
        ex: `${n} оқушы · орташа ${a.avgPoints} ұпай.`,
        src: "Сабақ тесттерінің нәтижелері (курс беті → тест).",
      },
      tests: {
        t: "Средний результат тестов",
        what: "Кезеңде тапсырылған барлық сабақ тесттерінің орташа нәтижесі, 100 баллдық шкала.",
        how: ["Кезеңдегі әр тест нәтижесі (0–100) алынады", "Барлығы қосылып, тест санына бөлінеді", "Тапсырылмаған тест есепке кірмейді"],
        ex: a.testsCount ? `${a.testsCount} тест тапсырылды → орташа ${a.avgTest} из 100.` : "Бұл кезеңде тест тапсырылмады.",
        src: "Курс ішіндегі сабақ тесттері (апталық сынақ пен пробный ЕНТ кірмейді).",
      },
      active: {
        t: `Активны за ${RU}`,
        what: "Кезең ішінде қосымшаға кем дегенде бір рет кіріп, бір әрекет жасаған (сабақ ашқан, тест тапсырған) оқушылар саны.",
        how: ["Әр оқушының кезеңдегі әрекеттері тексеріледі", "Кемінде бір әрекеті болса — белсенді", "Белсенділер / топтағы барлық оқушы"],
        ex: `${a.active} / ${n} оқушы белсенді (${Math.round((a.active / n) * 100)}%).`,
        src: "Қосымшаға кіру және сабақ әрекеттері журналы.",
      },
      notes: {
        t: "Конспекты",
        what: "Кезеңде оқушылар тапсырған конспект саны және оның қаншасы куратордың тексеруін күтіп тұр.",
        how: ["«сдано» — видеосабақтан кейін тіркелген конспекттер саны", "«на проверке» — куратор әлі «Принять / Вернуть» баспағандары", "Тексеру: оқушы профилі → курс → 🕒 конспект"],
        ex: `${a.notes} сдано · ${a.pending} на проверке.`,
        src: "Видеосабақтағы «Прикрепите конспект».",
        btn: a.pending ? "Тексеруге өту" : null,
      },
      progress: {
        t: `Прогресс за ${RU}`,
        what: "Бір оқушы кезеңде орта есеппен неше сабақ өткені және кесте бойынша жоспардың орындалуы.",
        how: ["Жоспар: әр жұмыс күні 1,6 сабақ (апта ≈ 8, ай ≈ 35); сенбі-жексенбі есептелмейді", "Ағымдағы кезеңде — тек бүгінге дейінгі күндер", "Орташа = оқушылардың өткен сабақтары қосындысы / оқушы саны", "Орындалу % = орташа / жоспар × 100", "«Выполнили» — жоспарды толық орындаған оқушылар"],
        ex: a.plan ? `Жоспар ${a.plan} · орташа +${a.avgLessons} → ${pct}%. Орындағандар: ${a.met} из ${n}.` : "Бұл күні жоспар жоқ (демалыс).",
        src: "Сабақтардың аяқталу күндері.",
      },
      activity: {
        t: "Активность",
        what: "Қосымшаға кірген оқушылар саны уақыт бойынша.",
        how: ["Күн — 2 сағаттық аралықтар (08:00–24:00)", "Апта — күн сайын (Дс–Жс)", "Ай — айдың әр күні", "Бір оқушы бір аралықта бір рет саналады", "Ашық баған — ең көп кірген уақыт (пик)"],
        ex: "Бағанның үстіне апарсаңыз, нақты сан шығады.",
        src: "Қосымшаға кіру журналы.",
      },
      entStudents: {
        t: "Пробный ЕНТ по ученикам",
        what: "Кезеңде пробный тапсырған әр оқушының соңғы нәтижесі (140-тан), жоғарыдан төмен.",
        how: ["Кезеңдегі оқушының соңғы пробныйы алынады", "Жасыл/қызыл сан — оның алдыңғы пробныйымен айырмасы", "Жолды басқанда — оқушы профилі"],
        ex: `${a.entCount} оқушы тапсырды.`,
        src: "Сынақ ҰБТ нәтижелері.",
      },
      attention: {
        t: "Требуют внимания",
        what: "Куратор назар аударуы керек оқушылар — себебімен.",
        how: ["Кезеңде мүлдем кірмеген", "Жоспардың жартысынан аз сабақ өткен", "Тесттердің орташа нәтижесі 55-тен төмен", "Бір оқушыда бірнеше себеп болуы мүмкін"],
        ex: `${a.attention.length} оқушы.`,
        src: "Белсенділік, прогресс және тест нәтижелері.",
      },
    }[key];
    if (!E) return;
    openSheet(`
      <div class="sheet-handle"></div>
      <div class="ex-title">${E.t}</div>
      <div class="ex-block"><div class="ex-l">${icon("help_outline", "material-icons-outlined")}Бұл не?</div><p>${E.what}</p></div>
      <div class="ex-block"><div class="ex-l">${icon("calculate", "material-icons-outlined")}Қалай есептеледі?</div><ol>${E.how.map((h) => `<li>${h}</li>`).join("")}</ol></div>
      <div class="ex-block ex-now"><div class="ex-l">${icon("insights", "material-icons-outlined")}Қазір (${g.name})</div><p>${E.ex}</p></div>
      <div class="ex-src">${icon("storage", "material-icons-outlined")}Дереккөз: ${E.src}</div>
      <div class="sheet-actions">${E.btn ? `<button type="button" class="ef-submit" id="exGo" style="margin:0">${E.btn}</button>` : `<button type="button" class="btn btn-ghost" id="exClose" style="width:100%">Түсінікті</button>`}</div>`);
    $("#exClose")?.addEventListener("click", closeSheet);
    $("#exGo")?.addEventListener("click", () => {
      closeSheet();
      const s = g.students.find((x) => pendingCount(staffCourseFor(x, g)) > 0) || g.students[0];
      openStaffStudent(s, g);
    });
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

        <div class="ga-ent" data-ex="ent">
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
          <div class="ga-tile" data-ex="points"><span>Средний балл за ${word()}</span><b>${a.avgPoints}</b></div>
          <div class="ga-tile" data-ex="tests"><span>Средний результат тестов</span><b>${a.testsCount ? a.avgTest : "—"}<small> ${a.testsCount ? "из 100" : ""}</small></b></div>
          <div class="ga-tile" data-ex="active"><span>Активны за ${word()}</span><b>${a.active}<small> / ${n}</small></b></div>
          <div class="ga-tile ${a.pending ? "warn" : ""}" data-ex="notes"><span>${icon(a.pending ? "schedule" : "description", "material-icons-outlined")}Конспекты</span><b>${a.notes}<small> сдано${a.pending ? ` · ${a.pending} на проверке` : ""}</small></b></div>
        </div>

        <div class="ga-card">
          <div class="ga-ctitle ex-h" data-ex="progress">Прогресс за ${word()}${icon("info", "material-icons-outlined")}</div>
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
          <div class="ga-ctitle ex-h" data-ex="activity">Активность${icon("info", "material-icons-outlined")}</div>
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
          <div class="ga-ctitle ex-h" data-ex="entStudents">Пробный ЕНТ по ученикам${icon("info", "material-icons-outlined")}</div>
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
          <div class="ga-ctitle ex-h" data-ex="attention">Требуют внимания${icon("info", "material-icons-outlined")}</div>
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
        $$("[data-ex]").forEach((el) =>
          el.addEventListener("click", (e) => {
            if (e.target.closest("button")) return;
            openMetricExplain(el.dataset.ex, analyze(g, A.period, A.date), A.period, g);
          })
        );
      },
      { right: "<span></span>" }
    );
  }

  /** Ерекше плиткаларда белгі жоқ (2026-10-06: LIVE және сан алынды) */
  function hotBadge() {
    return "";
  }

  /** Staff басты беті: баннер + сервистер (Аналитика, Эфир, Турнирлер) + бүгінгі эфирлер */
  function renderStaffHome() {
    const today = MOCK.efirs.filter((e) => e.date === iso(AN_TODAY)).sort((a, b) => a.time.localeCompare(b.time));
    const services = [
      { sub: "analytics", label: "Аналитика", img: "assets/v2/analyticsv2.png" },
      { sub: "efir", label: "Эфир", icon: "live_tv" },
      { sub: "shop", label: "Магазин", img: "assets/v2/shopv2.png" },
      { sub: "war", label: "Батл", img: "assets/tournament/battle_line.png", hot: "war" },
      { sub: "tours", label: "Турниры", img: "assets/tournament/cup_line.png", hot: "cup" },
    ];
    return `
      ${bannerHtml()}
      <div class="section-title">Сервисы</div>
      <div class="service-grid">
        ${services
          .map(
            (s) => `
          <button type="button" class="service-tile ${s.hot ? `hot hot-${s.hot}` : ""}" data-staff-sub="${s.sub}">
            ${hotBadge(s.hot)}
            ${s.img ? `<img src="${s.img}" alt="" />` : s.svg ? `<img src="${s.svg}" alt="" style="width:30px;height:30px" />` : `<span class="material-icons-outlined" style="color:var(--primary)">${s.icon}</span>`}
            <span>${s.label}</span>
          </button>`
          )
          .join("")}
      </div>
      <div class="section-row" style="margin-top:4px">
        <div class="section-title">Эфиры на сегодня</div>
        <button type="button" class="section-date" data-staff-sub="efir">${dmy(AN_TODAY)}</button>
      </div>
      <div class="today-wrap">
        <div class="today-card">
          ${
            today.length
              ? today
                  .map(
                    (e, i) => `${i ? `<div class="today-div"></div>` : ""}
              <button type="button" class="today-row" data-staff-sub="efir">
                <span class="material-icons-outlined ls-ico" style="color:var(--primary)">live_tv</span>
                <div style="flex:1;min-width:0"><div class="tr-course">${e.time} · ${e.groups.map((id) => MOCK.groups.find((g) => g.id === id)?.name).join(", ")}</div><div class="tr-lesson">${e.title}</div></div>
                <span class="material-icons-round chev">chevron_right</span>
              </button>`
                  )
                  .join("")
              : `<div class="ga-csub">Сегодня эфиров нет</div>`
          }
        </div>
      </div>`;
  }

  /** Зачисление (тек бас куратор / академ. бөлім басшысы): оқушылар және доступы бар курстары */
  function accessStudents() {
    if (!MOCK.access) {
      const map = new Map();
      MOCK.groups.forEach((g) =>
        g.students.forEach((x) => {
          if (!map.has(x.id)) map.set(x.id, { x, courses: [] });
          const r = map.get(x.id);
          const add = (cid, k) => {
            if (r.courses.some((c) => c.courseId === cid)) return;
            const end = new Date(AN_TODAY);
            end.setDate(end.getDate() + 3 + Math.floor(rnd(x.id, cid, k) * 300));
            r.courses.push({ courseId: cid, end, price: 0, comment: "" });
          };
          add(g.courseId, 1);
          if (rnd(x.id, 9) < 0.35) add([10, 11, 12, 13, 14, 15, 16][Math.floor(rnd(x.id, 10) * 7)], 2);
        })
      );
      MOCK.access = [...map.values()];
    }
    return MOCK.access;
  }
  const daysLeft = (end) => Math.max(0, Math.ceil((end - AN_TODAY) / 864e5));
  const COURSE_IDS = [10, 11, 12, 13, 14, 15, 16];

  function renderAccessList() {
    const F = state.accF || { course: null, soon: false };
    const rows = accessStudents()
      .map((r) => ({ ...r, cs: r.courses.filter((c) => (!F.course || c.courseId === F.course) && (!F.soon || daysLeft(c.end) <= 30)) }))
      .filter((r) => r.cs.length && matches(state.accQ || "", r.x.name, r.x.phone, ...r.cs.map((c) => COURSE_TITLE[c.courseId])))
      .sort((a, b) => a.x.name.localeCompare(b.x.name));
    const active = (F.course ? 1 : 0) + (F.soon ? 1 : 0);
    return `
      <div class="search-row">
        <div class="search-field acc-search">
          ${icon("search")}
          <input id="accSearch" placeholder="Поиск по имени, телефону, курсу" value="${(state.accQ || "").replace(/"/g, "&quot;")}" />
          <button type="button" class="acc-filter ${active ? "on" : ""}" id="accFilter" title="Фильтр">${icon("tune")}${active ? `<i>${active}</i>` : ""}</button>
        </div>
      </div>
      <div class="acc-count">${icon("school", "material-icons-outlined")}<b>${rows.length}</b> ${plural(rows.length, "ученик", "ученика", "учеников")}${F.course ? ` · ${COURSE_TITLE[F.course]}` : ""}${F.soon ? " · ≤ 30 дней" : ""}</div>
      <div class="list-pad tight-top">
        ${
          rows.length
            ? rows
                .map(
                  (r) => `
          <button type="button" class="acc-row" data-acc-st="${r.x.id}">
            <span class="avatar" style="background:${r.x.color}">${r.x.initials}</span>
            <span class="acc-main">
              <b>${r.x.name}</b>
              ${r.cs
                .map((c) => {
                  const d = daysLeft(c.end);
                  return `<span class="acc-c"><span>${COURSE_TITLE[c.courseId]}</span><em class="${d <= 7 ? "bad" : d <= 30 ? "warn" : ""}">${d} ${plural(d, "день", "дня", "дней")}</em></span>`;
                })
                .join("")}
            </span>
          </button>`
                )
                .join("")
            : `<div class="empty">Ничего не найдено</div>`
        }
      </div>`;
  }

  function openAccessFilter() {
    const F = { ...(state.accF || { course: null, soon: false }) };
    const draw = () => {
      openSheet(`
        <div class="sheet-handle"></div>
        <div class="ef-head"><span>Фильтр</span><button type="button" id="afClose">${icon("close")}</button></div>
        <div class="ef-label">Курс</div>
        <div class="ent-chips">${[null, ...COURSE_IDS].map((id) => `<button type="button" class="ent-chip ${F.course === id ? "on" : ""}" style="--c:var(--primary)" data-afc="${id ?? ""}">${id ? COURSE_TITLE[id] : "Все"}</button>`).join("")}</div>
        <div class="nf-toggle-row"><div><b>Доступ заканчивается</b><small>Осталось 30 дней и меньше</small></div><button type="button" class="toggle ${F.soon ? "on" : ""}" id="afSoon"></button></div>
        <div class="sheet-actions btn-row">
          <button type="button" class="btn btn-ghost" id="afReset">Сбросить</button>
          <button type="button" class="btn btn-primary" id="afApply">Применить</button>
        </div>`);
      $("#afClose").onclick = closeSheet;
      $$("[data-afc]").forEach((b) => (b.onclick = () => ((F.course = b.dataset.afc ? Number(b.dataset.afc) : null), draw())));
      $("#afSoon").onclick = () => ((F.soon = !F.soon), draw());
      $("#afReset").onclick = () => ((state.accF = null), closeSheet(), render());
      $("#afApply").onclick = () => ((state.accF = F), closeSheet(), render());
    };
    draw();
  }

  /** «+» → Зачислить: студент, курс(тар), басталуы, аяқталуы, құны, түсініктеме */
  function openEnrollForm(presetId = null) {
    const all = accessStudents();
    const f = { st: presetId ? all.find((r) => r.x.id === presetId)?.x : null, courses: new Set(), start: "", today: true, end: "", months: 1, price: "", comment: "" };
    const iso2 = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const calcEnd = () => {
      if (f.end) return new Date(f.end);
      const s = f.today || !f.start ? new Date(AN_TODAY) : new Date(f.start);
      s.setMonth(s.getMonth() + f.months);
      return s;
    };
    const draw = () => {
      const cs = [...f.courses];
      openSheet(
        `
        <div class="sheet-handle"></div>
        <div class="ef-head"><span>Зачислить</span><button type="button" id="enClose">${icon("close")}</button></div>
        <div class="ef-label">Студент <i>*</i></div>
        <button type="button" class="ef-select ${f.st ? "" : "ph"}" id="enSt">${f.st ? `<span class="en-st">${avatarHtml(f.st)}<span>${f.st.name}<small>${f.st.phone}</small></span></span>` : `<span>Выбрать студента</span>`}${icon("expand_more")}</button>
        <div class="ef-label">Курс <i>*</i></div>
        <div class="en-row">
          <button type="button" class="ef-select ${cs.length ? "" : "ph"}" id="enCourse" style="flex:1"><span>${cs.length ? COURSE_TITLE[cs[0]] : "Выбрать курсы"}</span>${icon("expand_more")}</button>
          ${cs.length > 1 ? `<span class="en-more">+${cs.length - 1}</span>` : ""}
        </div>
        <div class="ef-label">Начало <i>*</i></div>
        <div class="en-row">
          <input type="date" class="ef-input" id="enStart" value="${f.today ? "" : f.start}" style="flex:1" />
          <span class="en-or">или</span>
          <button type="button" class="en-chip ${f.today ? "on" : ""}" id="enToday">Сегодня</button>
        </div>
        <div class="ef-label">Окончание <i>*</i></div>
        <div class="en-row">
          <input type="date" class="ef-input" id="enEnd" value="${f.end}" style="flex:1" />
          <span class="en-or">или</span>
          <label class="ef-select en-dur ${f.end ? "ph" : ""}"><span id="enDurL">${f.months} мес.</span><select id="enDur">${[1, 2, 3, 6, 9, 12].map((m) => `<option value="${m}" ${m === f.months ? "selected" : ""}>${m} мес.</option>`).join("")}</select>${icon("expand_more")}</label>
        </div>
        <div class="en-hint">${icon("event_available", "material-icons-outlined")}Доступ до ${dmy(calcEnd())} · ${daysLeft(calcEnd())} ${plural(daysLeft(calcEnd()), "день", "дня", "дней")}</div>
        <div class="ef-label">Стоимость <i>*</i></div>
        <div class="en-row"><input type="number" min="0" class="ef-input" id="enPrice" placeholder="0" value="${f.price}" style="flex:1" /><span class="en-cur">₸</span></div>
        <div class="ef-label">Комментарий</div>
        <textarea class="ef-input nf-text" id="enCom" placeholder="Необязательно" style="height:80px">${f.comment}</textarea>
        <div class="sheet-actions btn-row">
          <button type="button" class="btn btn-ghost" id="enCancel">Отмена</button>
          <button type="button" class="btn btn-primary" id="enSave">Зачислить</button>
        </div>`,
        { tall: true }
      );
      const keep = () => {
        f.start = $("#enStart").value;
        if (f.start) f.today = false;
        f.end = $("#enEnd").value;
        f.price = $("#enPrice").value;
        f.comment = $("#enCom").value;
      };
      $("#enClose").onclick = $("#enCancel").onclick = closeSheet;
      $("#enStart").onchange = () => (keep(), draw());
      $("#enEnd").onchange = () => (keep(), draw());
      $("#enToday").onclick = () => (keep(), (f.today = true), (f.start = ""), draw());
      $("#enDur").onchange = (e) => (keep(), (f.months = Number(e.target.value)), (f.end = ""), draw());
      $("#enSt").onclick = () => {
        keep();
        const q = { v: "" };
        const pick = () => {
          const list = all.filter((r) => matches(q.v, r.x.name, r.x.phone)).slice(0, 60);
          openSheet(`
            <div class="sheet-handle"></div>
            <div class="ef-head"><span>Выбрать студента</span><button type="button" id="spBack">${icon("arrow_back")}</button></div>
            <input class="ef-input" id="spQ" placeholder="Имя или телефон" value="${q.v.replace(/"/g, "&quot;")}" />
            <div class="pick-list">${list.map((r) => `<button type="button" class="pick-opt dv-p" data-spk="${r.x.id}">${avatarHtml(r.x)}<span style="flex:1">${r.x.name}<small class="ef-gsub">${r.x.phone}</small></span></button>`).join("") || `<div class="empty">Не найдено</div>`}</div>`, { tall: true });
          bindSearch("#spQ", (v) => ((q.v = v), pick()));
          $("#spBack").onclick = draw;
          $$("[data-spk]").forEach((b) => (b.onclick = () => ((f.st = all.find((r) => r.x.id === Number(b.dataset.spk)).x), draw())));
        };
        pick();
      };
      $("#enCourse").onclick = () => {
        keep();
        const st = f.st && all.find((r) => r.x.id === f.st.id);
        openSheet(`
          <div class="sheet-handle"></div>
          <div class="ef-head"><span>Выбрать курсы</span></div>
          <div class="pick-list">${COURSE_IDS.map((id) => {
            const has = st?.courses.find((c) => c.courseId === id);
            return `<button type="button" class="pick-opt ${f.courses.has(id) ? "on" : ""}" data-enc="${id}"><span>${COURSE_TITLE[id]}${has ? `<small class="ef-gsub">уже есть доступ · ${daysLeft(has.end)} дн. — продлится</small>` : ""}</span>${icon(f.courses.has(id) ? "check_box" : "check_box_outline_blank")}</button>`;
          }).join("")}</div>
          <div class="sheet-actions"><button type="button" class="ef-submit" id="encDone">Готово</button></div>`);
        $$("[data-enc]").forEach((b) => {
          b.onclick = () => {
            const id = Number(b.dataset.enc);
            f.courses.has(id) ? f.courses.delete(id) : f.courses.add(id);
            b.classList.toggle("on", f.courses.has(id));
            b.querySelector(".material-icons-round").textContent = f.courses.has(id) ? "check_box" : "check_box_outline_blank";
          };
        });
        $("#encDone").onclick = draw;
      };
      $("#enSave").onclick = () => {
        keep();
        if (!f.st) return toast("Выберите студента", "err");
        if (!f.courses.size) return toast("Выберите курс", "err");
        if (f.price === "" || Number(f.price) < 0) return toast("Укажите стоимость", "err");
        const end = calcEnd();
        const startD = f.today || !f.start ? new Date(AN_TODAY) : new Date(f.start);
        if (end <= startD) return toast("Окончание должно быть позже начала", "err");
        let r = all.find((x) => x.x.id === f.st.id);
        if (!r) all.push((r = { x: f.st, courses: [] }));
        f.courses.forEach((cid) => {
          const ex = r.courses.find((c) => c.courseId === cid);
          if (ex) Object.assign(ex, { end, price: Number(f.price), comment: f.comment });
          else r.courses.push({ courseId: cid, end, price: Number(f.price), comment: f.comment });
        });
        closeSheet();
        toast(`${f.st.name.split(" ")[0]} зачислен: ${[...f.courses].map((c) => COURSE_TITLE[c]).join(", ")}`);
        render();
      };
    };
    draw();
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
          <div class="pick-list">${visibleGroups()
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
      { id: "shop", label: "Магазин", img: "assets/v2/shopv2.png" },
      { id: "battle", label: "Батл", img: "assets/tournament/battle_line.png", hot: "war" },
      { id: "tournament", label: "Турниры", img: "assets/tournament/cup_line.png", hot: "cup" },
    ];
    return `
      ${bannerHtml()}
      <div class="section-title">Сервисы</div>
      <div class="service-grid">
        ${services
          .map(
            (s) => `
          <button type="button" class="service-tile ${s.soon ? "locked" : ""} ${s.hot ? `hot hot-${s.hot}` : ""}" data-service="${s.id}" data-title="${s.label}">
            ${s.soon ? `<span class="soon-badge">скоро</span>` : ""}
            ${hotBadge(s.hot)}
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

  /* ============================================================
     ЖАҢАЛЫҚТАР: куратор жазады → тексеру (бас куратор / академ. бөлім басшысы)
     → жарияланады (баннер болса — басты беттегі баннерге шығады) немесе қайтарылады
     ============================================================ */
  const NEWS_ST = { pending: ["warn", "Тексеруде"], published: ["ok", "Жарияланды"], rejected: ["bad", "Қайтарылды"] };
  const isHead = () => state.staffRole === "head";
  const myName = () => `${MOCK.me.firstName} ${MOCK.me.lastName}`;
  const publishedNews = () => MOCK.news.filter((n) => (n.status || "published") === "published");

  /** Басты беттегі баннерлер: тұрақты I4U баннері + баннер ретінде жарияланған жаңалықтар */
  function bannerHtml() {
    const news = publishedNews().filter((n) => n.banner);
    const base = `
      <div class="banner-slide" id="openBanner">
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
      </div>`;
    const T = typeof tournaments === "function" ? tournaments() : [];
    const champ = T.filter((t) => t.status === "finished" && t.champion).map(
      (t) => `<button type="button" class="banner-slide cb-slide" data-btour="${t.id}">
        <span class="cb-copy"><small>ЧЕМПИОН · ${t.title}</small><b>${t.champion.me ? "Сен!" : t.champion.name}</b><em>${COURSE_TITLE[t.courseId]}</em></span>
        <span class="cb-av" style="background:${t.champion.color}">${t.champion.initials}</span>
        <img src="assets/tournament/belt.png" alt="" />
      </button>`
    );
    const tb = T.filter((t) => t.status !== "finished" && t.status !== "cancelled" && t.banners?.length).flatMap((t) =>
      t.banners.map((b) => `<button type="button" class="banner-slide nb-slide" data-btour="${t.id}" style="background-image:linear-gradient(90deg,rgba(0,0,0,.65),rgba(0,0,0,.05)),url(${b})"><span class="banner-logo">!4U</span><span class="nb-copy"><b>${t.title}</b><small>${t.status === "registration" ? `Тіркелу ашық · ${countdown(t.start) ? "басталуына " + countdown(t.start) : ""}` : "Турнир өтіп жатыр"}</small></span></button>`)
    );
    const slides = [base, ...champ, ...tb, ...news.map((n) => newsBannerSlide(n, `data-news="${n.id}"`))];
    return `
      <div class="banner-wrap">
        <div class="banner-track banner-scroll" id="bannerTrack">${slides.join("")}</div>
        <div class="banner-dots">${slides.map((_, i) => `<i class="${i === 0 ? "on" : ""}"></i>`).join("")}</div>
      </div>`;
  }
  function newsBannerSlide(n, attr = "") {
    return `<button type="button" class="banner-slide nb-slide" ${attr} style="${n.img ? `background-image:linear-gradient(90deg,rgba(0,0,0,.65),rgba(0,0,0,.1)),url(${n.img})` : `background:${n.bg || "linear-gradient(120deg,#3b4089,#5b6ec2 60%,#8a94f5)"}`}">
      <span class="banner-logo">!4U</span>
      <span class="nb-copy"><b>${n.title}</b><small>${n.body.slice(0, 70)}${n.body.length > 70 ? "…" : ""}</small></span>
    </button>`;
  }
  let bannerTimer = null;
  function bindBanner() {
    const tr = $("#bannerTrack");
    clearInterval(bannerTimer);
    if (!tr) return;
    // Автоматты ауысу: 4 секунд сайын келесі баннер
    bannerTimer = setInterval(() => {
      if (!document.body.contains(tr)) return clearInterval(bannerTimer);
      const n = tr.children.length;
      if (n < 2) return;
      const i = (Math.round(tr.scrollLeft / tr.clientWidth) + 1) % n;
      tr.scrollTo({ left: i * tr.clientWidth, behavior: "smooth" });
    }, 4000);
    $$("[data-btour]", tr).forEach((b) => (b.onclick = () => {
      state.navStack = [];
      openTournament(tournaments().find((t) => t.id === Number(b.dataset.btour)), { staff: state.mode === "staff" });
    }));
    tr.onscroll = () => {
      const i = Math.round(tr.scrollLeft / tr.clientWidth);
      $$(".banner-dots i").forEach((d, k) => d.classList.toggle("on", k === i));
    };
  }

  function newsRow(n, extra = "") {
    const st = NEWS_ST[n.status || "published"];
    return `
      <button type="button" class="blog-row" ${extra}>
        <div style="flex:1;min-width:0">
          ${n.status && n.status !== "published" || extra.includes("nmine") ? `<div class="nw-meta"><span class="nw-st ${st[0]}">${st[1]}</span>${n.banner ? `<span class="nw-st ban">${icon("view_carousel", "material-icons-outlined")}Баннер</span>` : ""}</div>` : ""}
          <div class="blog-title">${n.title}</div>
          <div class="blog-body">${n.body}</div>
          ${n.author ? `<div class="nw-author">${n.author}${n.date ? ` · ${n.date}` : ""}</div>` : ""}
        </div>
        ${n.img ? `<span class="news-thumb" style="background:url(${n.img}) center/cover"></span>` : newsThumb(n.thumb)}
      </button>`;
  }

  function renderStaffNews() {
    const seg = state.newsSeg || "all";
    const pending = MOCK.news.filter((n) => n.status === "pending");
    const mine = MOCK.news.filter((n) => n.author === myName());
    const tabs = [["all", "Жаңалықтар"], ["mine", `Менікі${mine.length ? ` · ${mine.length}` : ""}`]];
    if (isHead()) tabs.push(["review", `Тексеру${pending.length ? ` · ${pending.length}` : ""}`]);
    let list = "";
    if (seg === "all") list = publishedNews().map((n) => newsRow(n, `data-news="${n.id}"`)).join("");
    else if (seg === "mine")
      list = mine.length ? mine.map((n) => newsRow(n, `data-nmine="${n.id}"`)).join("") : `<div class="empty">Сіз әлі жаңалық жазбадыңыз</div>`;
    else list = pending.length ? pending.map((n) => newsRow(n, `data-nreview="${n.id}"`)).join("") : `<div class="empty">Тексеретін жаңалық жоқ ✨</div>`;
    return `
      <div class="seg-tabs ${tabs.length === 3 ? "seg-3" : ""}" style="margin-top:12px">${tabs.map(([k, l]) => `<button type="button" data-nseg="${k}" class="${seg === k ? "on" : ""}">${l}</button>`).join("")}</div>
      <div class="list-pad news-list" style="padding-top:14px">
        ${seg !== "review" ? `<button type="button" class="btn3d" id="newsNew" style="margin:0 0 16px">${icon("edit", "material-icons-outlined")}Жаңалық жазу</button>` : ""}
        ${seg === "mine" && !isHead() ? `<div class="t3-note" style="margin:0 0 14px">${icon("info", "material-icons-outlined")}Жаңалық бас куратор немесе академиялық бөлім басшысы тексергеннен кейін жарияланады.</div>` : ""}
        ${list}
      </div>`;
  }

  function openNewsForm(edit = null) {
    const f = edit ? { ...edit } : { title: "", body: "", img: null, banner: false, audience: "all" };
    const draw = () => {
      openSheet(
        `
        <div class="sheet-handle"></div>
        <div class="ef-head"><span>${edit ? "Жаңалықты түзету" : "Жаңалық жазу"}</span><button type="button" id="nfClose">${icon("close")}</button></div>
        <div class="ef-label">Тақырып <i>*</i></div>
        <input class="ef-input" id="nfTitle" maxlength="80" placeholder="Мысалы: Сенбіде сынақ ҰБТ" value="${f.title.replace(/"/g, "&quot;")}" />
        <div class="ef-label">Мәтін <i>*</i></div>
        <textarea class="ef-input nf-text" id="nfBody" placeholder="Жаңалықтың толық мәтіні">${f.body}</textarea>
        <div class="ef-label">Сурет</div>
        <button type="button" class="nf-img" id="nfImg" style="${f.img ? `background:url(${f.img}) center/cover` : ""}">${f.img ? "" : `${icon("add_photo_alternate", "material-icons-outlined")}<span>Сурет қосу (JPEG/PNG)</span>`}</button>
        <div class="nf-toggle-row">
          <div><b>Баннер ретінде көрсету</b><small>Жарияланғанда студенттердің басты бетіндегі баннерге шығады</small></div>
          <button type="button" class="toggle ${f.banner ? "on" : ""}" id="nfBanner"></button>
        </div>
        ${f.banner ? `<div class="ef-label">Баннердің түрі</div><div class="nf-prev">${newsBannerSlide({ ...f, title: f.title || "Тақырып", body: f.body || "Мәтін" })}</div>` : ""}
        <div class="ef-label">Кімге</div>
        <div class="ent-chips">${[["all", "Барлық студенттер"], ["groups", "Менің топтарым"]].map(([k, l]) => `<button type="button" class="ent-chip ${f.audience === k ? "on" : ""}" style="--c:var(--primary)" data-nfa="${k}">${l}</button>`).join("")}</div>
        <button type="button" class="ef-submit" id="nfSend">${isHead() ? "Жариялау" : "Тексеруге жіберу"}</button>`,
        { tall: true }
      );
      const keep = () => {
        f.title = $("#nfTitle").value;
        f.body = $("#nfBody").value;
      };
      $("#nfClose").onclick = closeSheet;
      $("#nfBanner").onclick = () => (keep(), (f.banner = !f.banner), draw());
      $$("[data-nfa]").forEach((b) => (b.onclick = () => (keep(), (f.audience = b.dataset.nfa), draw())));
      $("#nfImg").onclick = () => {
        keep();
        const inp = document.createElement("input");
        inp.type = "file";
        inp.accept = "image/*";
        inp.onchange = () => {
          const file = inp.files[0];
          if (!file) return;
          const img = new Image();
          img.onload = () => {
            const k = Math.min(1, 900 / img.width);
            const cv = document.createElement("canvas");
            cv.width = img.width * k;
            cv.height = img.height * k;
            cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
            f.img = cv.toDataURL("image/jpeg", 0.85);
            draw();
          };
          img.src = URL.createObjectURL(file);
        };
        inp.click();
      };
      $("#nfSend").onclick = () => {
        keep();
        if (!f.title.trim() || !f.body.trim()) return toast("Тақырып пен мәтінді толтырыңыз", "err");
        const status = isHead() ? "published" : "pending";
        const data = { ...f, title: f.title.trim(), body: f.body.trim(), author: myName(), date: dmy(new Date()), status, reason: null };
        if (edit) Object.assign(edit, data);
        else MOCK.news.unshift({ id: nextId(), thumb: null, ...data });
        closeSheet();
        state.newsSeg = "mine";
        toast(isHead() ? "Жаңалық жарияланды" : "Тексеруге жіберілді — нәтижесі туралы хабарлама келеді");
        render();
      };
    };
    draw();
  }

  function newsMenu(n, anchor) {
    showActionMenu(anchor, [
      { label: "Редактировать", icon: "edit", onTap: () => openNewsForm(n) },
      {
        label: "Удалить",
        icon: "delete",
        danger: true,
        onTap: async () => {
          const ok = await confirmDialog({
            title: "Жаңалықты өшіру?",
            message: `«${n.title}» ${n.banner ? "баннерден және " : ""}жаңалықтар тізімінен біржола өшіріледі.`,
            confirmLabel: "Өшіру",
            danger: true,
          });
          if (!ok) return;
          MOCK.news = MOCK.news.filter((x) => x !== n);
          toast("Жаңалық өшірілді");
          render();
        },
      },
    ]);
  }

  function newsPreviewHtml(n) {
    return `
      <div class="list-pad">
        ${n.banner ? `<div class="ga-csub" style="margin:4px 2px 8px">Баннер (басты бет)</div><div class="nf-prev">${newsBannerSlide(n)}</div>` : ""}
        <div class="ga-csub" style="margin:14px 2px 8px">Жаңалықтар тізімінде</div>
        ${newsRow({ ...n, status: "published" })}
        <div class="t3-panel" style="margin-top:6px">
          <div class="t3-info"><span>${icon("person", "material-icons-outlined")}Авторы</span><b>${n.author}</b></div>
          <div class="t3-info"><span>${icon("event", "material-icons-outlined")}Жіберілді</span><b>${n.date || "—"}</b></div>
          <div class="t3-info"><span>${icon("groups", "material-icons-outlined")}Кімге</span><b>${n.audience === "groups" ? "Автордың топтары" : "Барлық студенттер"}</b></div>
          ${n.reason ? `<div class="t3-info col"><span>${icon("feedback", "material-icons-outlined")}Қайтару себебі</span><b style="text-align:left;color:#e06b5b">${n.reason}</b></div>` : ""}
        </div>
        ${n.img ? `<img src="${n.img}" alt="" style="width:100%;border-radius:14px;margin-top:14px" />` : ""}
        <div class="news-card" style="margin-top:14px"><div class="n-title">${n.title}</div><div class="n-body" style="white-space:pre-wrap">${n.body}</div></div>
      </div>`;
  }

  function openNewsReview(n) {
    pushScreen(
      "Жаңалықты тексеру",
      () => newsPreviewHtml(n),
      () => {
        $("#nrOk").onclick = () => {
          n.status = "published";
          n.reason = null;
          state.navStack.pop();
          paintStack();
          toast(n.banner ? "Жарияланды — баннерге шықты" : "Жарияланды");
          render();
        };
        $("#nrNo").onclick = () => {
          openSheet(`
            <div class="sheet-handle"></div>
            <div class="ef-head"><span>Қайтару себебі</span></div>
            <div class="ent-chips">${["Қате бар", "Сурет сапасы нашар", "Мазмұны сәйкес емес", "Баннерге келмейді"].map((r) => `<button type="button" class="ent-chip" style="--c:var(--primary)" data-nrr="${r}">${r}</button>`).join("")}</div>
            <textarea class="ef-input nf-text" id="nrText" placeholder="Түсініктеме (автор көреді)" style="margin-top:12px"></textarea>
            <button type="button" class="ef-submit" id="nrSend">Авторға қайтару</button>`);
          $$("[data-nrr]").forEach((b) => (b.onclick = () => ($("#nrText").value = ($("#nrText").value ? $("#nrText").value + ". " : "") + b.dataset.nrr)));
          $("#nrSend").onclick = () => {
            const r = $("#nrText").value.trim();
            if (!r) return toast("Себебін жазыңыз", "err");
            n.status = "rejected";
            n.reason = r;
            closeSheet();
            state.navStack.pop();
            paintStack();
            toast("Авторға қайтарылды");
            render();
          };
        };
      },
      {
        right: "<span></span>",
        footer: () => `<div class="sticky-foot rp-foot"><button type="button" class="rp-pdf" id="nrNo">${icon("undo")}Қайтару</button><button type="button" class="ef-submit" id="nrOk" style="margin:0">${icon("check")}Жариялау</button></div>`,
      }
    );
  }

  function openMyNews(n) {
    pushScreen(
      "Менің жаңалығым",
      () => `<div class="list-pad"><div class="nw-meta" style="margin:6px 2px 0"><span class="nw-st ${NEWS_ST[n.status][0]}">${NEWS_ST[n.status][1]}</span></div></div>${newsPreviewHtml(n)}`,
      () => {
        $("#nmEdit")?.addEventListener("click", () => {
          state.navStack.pop();
          paintStack();
          openNewsForm(n);
        });
      },
      {
        right: "<span></span>",
        footer: () => (n.status === "published" ? "" : `<div class="sticky-foot"><button type="button" class="ef-submit" id="nmEdit" style="margin:0">${icon("edit", "material-icons-outlined")}${n.status === "rejected" ? "Түзетіп қайта жіберу" : "Өңдеу"}</button></div>`),
      }
    );
  }

  function renderNews() {
    return `
      <div class="list-pad news-list">
        ${publishedNews()
          .map((n) => newsRow(n, `data-news="${n.id}"`))
          .join("")}
      </div>`;
  }

  /** Студент: өз тобы — өткен апта чемпионы және апталық рейтинг */
  function renderStudentGroup() {
    const g = MOCK.groups[0];
    return `
      <div class="list-pad groups-list student-group">
        <div class="card ${state.sgClosed ? "" : "expanded"}">
          <div class="group-head" id="sgToggle">
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
            </div>
            ${g.students.map((x, i) => renderRankRow(x, i === g.students.length - 1)).join("")}
          </div>
        </div>
      </div>`;
  }

  /* —— Оқушы хабарламалары ——
     Автоматты: жаңа турнир (топқа/барлығына), тіркелу аяқталуға 2 сағ, check-in (басталардан 30 мин), кезең басталды;
     батл шақыруы келді, досың жауап берді (нәтиже), шақыру мерзімі бітуге 2 сағ;
     топтар шайқасы жарияланды, шайқас күні басталды, өз шабуылың қалды */
  const NOTIF_TYPES = {
    tour: { img: "assets/tournament/cup_line.png", label: "Турниры" },
    battle: { img: "assets/tournament/battle_line.png", label: "Батл шақырулары мен нәтижелері" },
    war: { img: "assets/tournament/clash_line.png", label: "Топтар шайқасы" },
    study: { img: "assets/v2/notification.png", label: "Сабақ, эфир, конспект" },
  };
  function notifPrefs() {
    return (MOCK.notifPrefs ||= { tour: true, battle: true, war: true, study: true });
  }
  /** Оқушыға хабарлама (макетте — осы құрылғыдағы оқушы). Нақты қосымшада — сервер FCM push + қосымша ішіндегі тізім */
  function notify({ type = "study", title, body, go }) {
    if (!notifPrefs()[type]) return;
    MOCK.studentNotifs.unshift({ id: nextId(), type, when: "Қазір", title, body, go, read: false });
    const bell = $("#studentBell");
    if (bell) {
      const n = MOCK.studentNotifs.filter((x) => !x.read).length;
      bell.querySelector("i")?.remove();
      bell.insertAdjacentHTML("beforeend", `<i>${n}</i>`);
    }
  }
  function openNotif(n) {
    const g = n.go || {};
    state.navStack = [];
    if (g.tour) {
      const T = tournaments().find((t) => t.id === g.tour);
      if (T) return openTournament(T);
    }
    if (g.service) return openService(g.service, g.title || "");
    if (g.war) return openWar();
    pushScreen(n.title, () => `<div class="list-pad"><div class="push-row"><img src="${NOTIF_TYPES[n.type || "study"].img}" alt="" /><span class="push-line"></span><span><span class="push-when">${n.when}</span><span class="push-title">${n.title}</span><span class="push-body">${n.body}</span></span></div></div>`);
  }
  function openNotifPrefs() {
    const P = notifPrefs();
    const draw = () => {
      openSheet(`
        <div class="sheet-handle"></div>
        <div class="ex-title">Хабарлама баптаулары</div>
        ${Object.entries(NOTIF_TYPES).map(([k, x]) => `<div class="nf-toggle-row"><img src="${x.img}" alt="" style="width:24px;height:24px" /><div><b>${x.label}</b></div><button type="button" class="toggle ${P[k] ? "on" : ""}" data-np="${k}"></button></div>`).join("")}
        <div class="tf-sum">${icon("info", "material-icons-outlined")}Өшірілген түрлер телефонға push болып келмейді және тізімге түспейді</div>
        <div class="sheet-actions"><button type="button" class="btn btn-ghost" id="npClose" style="width:100%">Дайын</button></div>`);
      $("#npClose").onclick = closeSheet;
      $$("[data-np]").forEach((b) => (b.onclick = () => ((P[b.dataset.np] = !P[b.dataset.np]), draw())));
    };
    draw();
  }

  function renderStudentNotifs() {
    return `
      <div class="list-pad">
        ${MOCK.studentNotifs
          .map(
            (n) => `
          <button type="button" class="push-row ${n.read === false ? "unread" : ""}" data-push="${n.id}">
            <img src="${NOTIF_TYPES[n.type || "study"].img}" alt="" />
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
          if (i === cc.cur) earnCoins(5, "Видеосабақ");
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
            if (x.state !== "done") earnCoins(10, "Сабақ тесті");
            paintStack();
          });
        $("#tqBack") &&
          ($("#tqBack").onclick = () => {
            if (x.state === "done") {
              state.navStack.pop();
              paintStack();
            } else finishLesson(c, cc, i);
          });
        centerIn($(".tq-num.on"), "x");
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
      const titles = ["Главная", "Новости", "Группы", "Мои курсы"];
      const unread = MOCK.studentNotifs.filter((n) => !n.read).length;
      return `
        <div class="appbar-title" style="flex:1">${titles[state.tab] || "Главная"}</div>
        <button type="button" class="appbar-bell" id="studentBell" title="Уведомления">${icon("notifications_none")}${unread ? `<i>${unread}</i>` : ""}</button>
        <button type="button" class="appbar-profile" id="curatorAvatar">${icon("person")}</button>`;
    }
    // Басты беттен ашылатын бөлімдер (Аналитика, Эфир, Хабарлама)
    if (state.sub) {
      const title = { analytics: "Аналитика", efir: "Эфир", pushes: "Хабарлама" }[state.sub];
      return `
        <button type="button" class="appbar-back" id="subBack">${icon("arrow_back")}</button>
        <div class="appbar-title" style="flex:1">${title}</div>
        ${state.sub === "pushes" ? `<button type="button" class="appbar-bell" id="addPush" title="Отправить пуш">${icon("add_circle_outline", "material-icons-outlined")}</button>` : ""}
        <button type="button" class="appbar-profile" id="curatorAvatar">${icon("person")}</button>`;
    }
    if (state.tab === 3)
      return `
      <div class="appbar-title-row"><span class="appbar-title">Зачисление</span><button type="button" class="appbar-add" id="enrollAdd" title="Дать доступ к курсу">${icon("add")}</button></div>
      <button type="button" class="appbar-bell" id="staffBell" title="Хабарлама">${icon("notifications_none")}</button>
      <button type="button" class="appbar-profile" id="curatorAvatar">${icon("person")}</button>`;
    return `
      <div class="appbar-title" style="flex:1">${["Главная", "Новости", "Группы", "Зачисление"][state.tab]}</div>
      <button type="button" class="appbar-bell" id="staffBell" title="Хабарлама">${icon("notifications_none")}</button>
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
      else if (state.tab === 2) content.innerHTML = renderStudentGroup();
      else content.innerHTML = renderMyCourses();
      bindStudentContent();
      return;
    }

    if (state.sub === "analytics") content.innerHTML = renderStaffAnalytics();
    else if (state.sub === "efir") content.innerHTML = renderEfir();
    else if (state.sub === "pushes") content.innerHTML = renderPushes();
    else if (state.tab === 0) content.innerHTML = renderStaffHome();
    else if (state.tab === 1) content.innerHTML = renderStaffNews();
    else if (state.tab === 3) content.innerHTML = renderAccessList();
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
        openInner(n.title, `<div class="list-pad news-open">${n.img ? `<img src="${n.img}" alt="" style="width:100%;border-radius:15px" />` : newsThumb(n.thumb)}<div class="news-card" style="margin-top:12px"><div class="n-body" style="white-space:pre-wrap">${n.body}</div>${n.author ? `<div class="nw-author">${n.author} · ${n.date || ""}</div>` : ""}</div></div>`);
      };
    });
    bindBanner();
    $("#sgToggle")?.addEventListener("click", () => {
      state.sgClosed = !state.sgClosed;
      render();
    });
    $("#studentBell")?.addEventListener("click", () => {
      state.navStack = [];
      pushScreen("Уведомления", renderStudentNotifs, () => {
        MOCK.studentNotifs.forEach((n) => (n.read = true));
        $("#npOpen")?.addEventListener("click", openNotifPrefs);
        $$("#screenOverlay [data-push]").forEach((btn) => {
          btn.onclick = () => openNotif(MOCK.studentNotifs.find((x) => x.id === Number(btn.dataset.push)));
        });
      }, { right: `<button type="button" class="appbar-icon-btn" id="npOpen" title="Баптаулар">${icon("tune")}</button>` });
      $("#appbar").innerHTML = appbarHtml();
      bindStudentContent();
    });
    $$("[data-push]").forEach((btn) => {
      btn.onclick = () => {
        const n = MOCK.studentNotifs.find((x) => x.id === Number(btn.dataset.push));
        if (n) openNotif(n);
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
    $$("[data-news]").forEach((btn) => {
      btn.onclick = () => {
        const n = MOCK.news.find((x) => x.id === Number(btn.dataset.news));
        if (n) openInner(n.title, `<div class="list-pad news-open">${n.img ? `<img src="${n.img}" alt="" style="width:100%;border-radius:15px" />` : newsThumb(n.thumb)}<div class="news-card" style="margin-top:12px"><div class="n-body" style="white-space:pre-wrap">${n.body}</div>${n.author ? `<div class="nw-author">${n.author} · ${n.date || ""}</div>` : ""}</div></div>`);
      };
    });
    bindBanner();
    $$("[data-nseg]").forEach((b) => (b.onclick = () => ((state.newsSeg = b.dataset.nseg), render())));
    $("#newsNew")?.addEventListener("click", () => openNewsForm());
    // Ұзақ басу → Редактировать / Удалить (өз жаңалығы; бас куратор — кез келгені)
    $$("#content [data-news], #content [data-nmine], #content [data-nreview]").forEach((row) => {
      const id = Number(row.dataset.news || row.dataset.nmine || row.dataset.nreview);
      const n = MOCK.news.find((x) => x.id === id);
      if (!n || !(isHead() || n.author === myName())) return;
      bindLongPress(row, () => newsMenu(n, row));
    });
    $$("[data-nmine]").forEach((b) => (b.onclick = () => ((state.navStack = []), openMyNews(MOCK.news.find((n) => n.id === Number(b.dataset.nmine))))));
    $$("[data-nreview]").forEach((b) => (b.onclick = () => ((state.navStack = []), openNewsReview(MOCK.news.find((n) => n.id === Number(b.dataset.nreview))))));
    bindSearch("#accSearch", (v) => {
      state.accQ = v;
      render();
    });
    $("#accFilter")?.addEventListener("click", openAccessFilter);
    $("#enrollAdd")?.addEventListener("click", () => openEnrollForm());
    $$("[data-acc-st]").forEach((b) => {
      const id = Number(b.dataset.accSt);
      b.onclick = () => {
        const g = MOCK.groups.find((x) => x.students.some((y) => y.id === id));
        state.navStack = [];
        openStaffStudent(g.students.find((y) => y.id === id), g);
      };
      bindLongPress(b, () => showActionMenu(b, [{ label: "Зачислить / продлить", icon: "add", onTap: () => openEnrollForm(id) }]));
    });
    $("#subBack")?.addEventListener("click", () => {
      state.sub = null;
      render();
    });
    $("#staffBell")?.addEventListener("click", () => {
      state.sub = "pushes";
      render();
    });
    $$("[data-staff-sub]").forEach((b) => {
      b.onclick = () => {
        if (b.dataset.staffSub === "war") {
          state.navStack = [];
          return openStaffWars();
        }
        if (b.dataset.staffSub === "shop") {
          state.navStack = [];
          return openStaffShop();
        }
        if (b.dataset.staffSub === "tours") {
          state.navStack = [];
          return openStaffTournaments();
        }
        state.sub = b.dataset.staffSub;
        if (state.sub === "efir") state.efirDate = new Date(AN_TODAY);
        render();
      };
    });
    $("#staffTours")?.addEventListener("click", () => {
      state.navStack = [];
      openStaffTournaments();
    });
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

  /* —— Тема және тіл —— */
  function translateNode(root) {
    if (state.lang !== "kk" || !window.I18N_KK) return;
    const D = window.I18N_KK;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (w.nextNode()) nodes.push(w.currentNode);
    nodes.forEach((n) => {
      const t = n.nodeValue.trim();
      if (!t) return;
      if (D[t]) return (n.nodeValue = n.nodeValue.replace(t, D[t]));
      for (const [re, to] of window.I18N_KK_RE || []) if (re.test(t)) return (n.nodeValue = n.nodeValue.replace(t, t.replace(re, to)));
    });
    root.querySelectorAll?.("[placeholder]").forEach((el) => {
      const t = el.getAttribute("placeholder");
      if (D[t]) el.setAttribute("placeholder", D[t]);
    });
  }
  let i18nObs = null;
  function applyPrefs() {
    document.documentElement.dataset.theme = state.darkTheme ? "dark" : "light";
    document.documentElement.lang = state.lang === "kk" ? "kk" : "ru";
    try {
      localStorage.setItem("prefs", JSON.stringify({ dark: state.darkTheme, lang: state.lang }));
    } catch {}
    const app = $(".phone .app");
    if (state.lang === "kk") {
      translateNode(app);
      if (!i18nObs) {
        i18nObs = new MutationObserver((ms) => {
          if (state.lang !== "kk") return;
          i18nObs.disconnect();
          ms.forEach((m) => m.addedNodes.forEach((n) => (n.nodeType === 1 ? translateNode(n) : n.nodeType === 3 && n.parentNode && translateNode(n.parentNode))));
          i18nObs.observe(app, { childList: true, subtree: true });
        });
        i18nObs.observe(app, { childList: true, subtree: true });
      }
    } else if (i18nObs) {
      i18nObs.disconnect();
      i18nObs = null;
      render();
    }
  }

  function init() {
    try {
      const p = JSON.parse(localStorage.getItem("prefs") || "{}");
      if (typeof p.dark === "boolean") state.darkTheme = p.dark;
      if (p.lang) state.lang = p.lang;
    } catch {}
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
    $$(".chip-role").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.staffRole = btn.dataset.role;
        $$(".chip-role").forEach((b) => b.classList.toggle("active", b === btn));
        if (state.staffRole === "curator" && state.newsSeg === "review") state.newsSeg = "all";
        document.documentElement.dataset.role = state.staffRole;
        if (state.staffRole === "curator" && state.tab === 3) return setTab(0);
        toast(state.staffRole === "head" ? "Рөл: бас куратор / академ. бөлім басшысы" : "Рөл: куратор");
        render();
      });
    });
    // По умолчанию — студент; staff: .../mobile-mock/#staff
    setMode(location.hash === "#staff" ? "staff" : "student");
    applyPrefs();
  }

  window.__i4u = { tournaments, startTournament }; // макетті тексеру үшін
  document.addEventListener("DOMContentLoaded", init);
})();
