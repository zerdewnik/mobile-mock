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
    { out: "notifications_none", fill: "notifications", outClass: "material-icons-round", fillClass: "material-icons-round", label: "Уведомления" },
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
      const list = MOCK.pickerStudents.filter(
        (s) =>
          !q.value ||
          s.name.toLowerCase().includes(q.value) ||
          s.phone.replace(/\s/g, "").includes(q.value.replace(/\s/g, ""))
      );
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
      $("#pickSearch").oninput = (e) => {
        q.value = e.target.value.trim().toLowerCase();
        draw();
        const again = $("#pickSearch");
        again.focus();
        again.setSelectionRange(again.value.length, again.value.length);
      };
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
    el.innerHTML = `
      <div class="appbar">
        <button type="button" class="appbar-back" id="innerBack">${icon("arrow_back")}</button>
        <div class="appbar-title" style="flex:1">${page.title}</div>
        <button type="button" class="appbar-profile" id="innerProfile">${icon("person")}</button>
      </div>
      <div class="content">${page.build()}</div>`;
    $("#innerBack").onclick = () => {
      state.navStack.pop();
      if (!state.navStack.length) closeScreen();
      else paintStack();
    };
    $("#innerProfile").onclick = openUserProfile;
    page.after?.();
  }

  function openInner(title, bodyHtml) {
    state.navStack = [{ title, build: () => bodyHtml }];
    paintStack();
  }

  function pushScreen(title, build, after) {
    state.navStack.push({ title, build, after });
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
        return `${head}<div class="list-pad">
          <div class="news-card"><div class="n-title">Пробный ЕНТ</div><div class="n-body">86 баллов · 20 сентября</div></div>
          <div class="news-card"><div class="n-title">Пробный ЕНТ</div><div class="n-body">79 баллов · 6 сентября</div></div>
        </div>`;
      }
      if (tab === "stats") {
        return `${head}<div class="list-pad">
          <div class="stat-tile"><div class="stat-val">86</div><div class="stat-lbl">лучший балл</div></div>
          <div class="stat-tile" style="margin-top:8px"><div class="stat-val">2</div><div class="stat-lbl">попытки</div></div>
        </div>`;
      }
      return `${head}
        <div class="list-pad">
          <div class="news-card">
            <div class="n-title">Комбинация</div>
            <div class="n-body">Математика<br>История Казахстана<br>Ағылшын тілі · Дүниежүзі тарихы</div>
          </div>
        </div>
        <div class="sheet-actions"><button type="button" class="btn btn-primary" id="startEnt" style="width:100%">Пройти пробный ЕНТ</button></div>`;
    }
    if (id === "professions") {
      const isUni = tab === "uni";
      const rows = isUni ? MOCK.universities : MOCK.specialities;
      return `
        <div class="seg-tabs">
          <button type="button" data-svctab="spec" class="${!isUni ? "on" : ""}">Специальности</button>
          <button type="button" data-svctab="uni" class="${isUni ? "on" : ""}">Вузы</button>
        </div>
        <div class="hub-head">
          <div class="hub-title">${isUni ? "Вузы" : "Специальности"}</div>
          <div class="hub-sub">справочник · ${rows.length}/${rows.length}</div>
          <input class="field-input" placeholder="Поиск" />
        </div>
        <div class="guide-card">
          ${rows
            .map(
              (r, i) => `
            <button type="button" class="guide-row" data-open="${r.name}">
              <div>
                <div class="guide-code">${r.code}</div>
                <div class="guide-name">${r.name}</div>
                <div class="guide-meta">${r.meta || `${r.city} · ${r.kind}`}</div>
              </div>
              <span class="material-icons-round chev">chevron_right</span>
            </button>`
            )
            .join("")}
        </div>`;
    }
    if (id === "trainer") {
      return `
        <div class="list-pad">
          <p class="hub-sub" style="margin-bottom:12px">Короткие вопросы по темам курса. Отвечай и закрывай пробелы.</p>
          ${MOCK.trainerSubjects
            .map(
              (s) => `
            <button type="button" class="trainer-card" data-open="${s.title}">
              <img src="${s.thumb}" alt="" />
              <div style="flex:1;min-width:0">
                <div class="purchase-title">${s.title}</div>
                <div class="stopped-progress" style="margin-top:8px"><i style="width:${s.percent}%;background:#E07A3D"></i></div>
                <div class="hub-sub">${s.percent}% · ${s.done}/${s.total} тем</div>
              </div>
              <span class="material-icons-round chev">chevron_right</span>
            </button>`
            )
            .join("")}
        </div>`;
    }
    if (id === "analytics") {
      return `
        <div class="analytics">
          <div class="news-card"><div class="n-title">Цель</div><div class="n-body">ЕНТ · 120 баллов</div></div>
          <button type="button" class="news-card" data-open="Курсы" style="width:100%;text-align:left;color:inherit;font-family:inherit">
            <div class="n-title">Курсы</div><div class="n-body">2 из 5</div>
          </button>
          <button type="button" class="news-card" data-open="Уроки" style="width:100%;text-align:left;color:inherit;font-family:inherit">
            <div class="n-title">Уроки</div><div class="n-body">21 из 84</div>
          </button>
        </div>`;
    }
    return `<div class="empty">Скоро наш магазин откроется — запасы знаний готовы, и скидки на гениальность уже подвозят!</div>`;
  }

  function bindService() {
    $$("[data-svctab]").forEach((btn) => {
      btn.onclick = () => {
        state.svc.tab = btn.dataset.svctab;
        paintStack();
      };
    });
    $$("[data-open]").forEach((btn) => {
      btn.onclick = () => {
        const name = btn.dataset.open;
        pushScreen(name, () => `<div class="list-pad"><div class="news-card"><div class="n-title">${name}</div><div class="n-body">Раздел открыт, как в приложении.</div></div></div>`);
      };
    });
    $("#startEnt") &&
      ($("#startEnt").onclick = () => {
        openSheet(`
          <div class="sheet-handle"></div>
          <div class="sheet-title">Пробный ЕНТ</div>
          <div class="sheet-sub">4 предмета · 140 вопросов. Время начнётся после старта.</div>
          <div class="sheet-actions"><button type="button" class="btn btn-primary" id="entGo" style="width:100%">Начать</button></div>`);
        $("#entGo").onclick = () => {
          closeSheet();
          pushScreen("Пробный ЕНТ", () => `<div class="empty">Вопрос 1 из 140<br><br>Математика</div>`);
        };
      });
  }

  function openService(id, title) {
    state.svc = { id, tab: id === "professions" ? "spec" : "ent" };
    state.navStack = [{ title, build: pageHtml, after: bindService }];
    paintStack();
  }

  function openAiScreen() {
    const el = $("#screenOverlay");
    el.hidden = false;
    el.innerHTML = `
      <div class="appbar">
        <button type="button" class="appbar-back" id="aiBack">${icon("arrow_back")}</button>
        <div class="appbar-title" style="flex:1">AI-помощник</div>
        <button type="button" class="appbar-profile" style="visibility:hidden">${icon("person")}</button>
      </div>
      <div class="content">
        <div class="empty">
          ${icon("smart_toy")}<br /><br />
          Спросите что угодно по курсам
        </div>
      </div>`;
    $("#aiBack").onclick = closeScreen;
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
    const q = state.searchStudents;
    if (q) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.phone.replace(/\s/g, "").includes(q.replace(/\s/g, ""))
      );
    }
    return list;
  }

  function filteredEnrollments() {
    let list = MOCK.enrollments;
    const st = MOCK.filters.enrollmentStatus;
    if (st === "active") list = list.filter((e) => e.status === "active");
    if (st === "waiting" || st === "pending")
      list = list.filter((e) => e.status === "pending" || e.status === "freeze");
    if (st === "ended") list = list.filter((e) => e.status === "ended");
    if (st === "not_started") list = list.filter((e) => e.status === "pending");
    const q = state.searchEnroll;
    if (q) {
      list = list.filter(
        (e) =>
          e.student.toLowerCase().includes(q) ||
          (e.phone || "").replace(/\s/g, "").includes(q.replace(/\s/g, ""))
      );
    }
    return list;
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
            <div class="banner-art">
              <div class="banner-pic"></div>
              <div class="banner-copy">
                <strong>«БІР ПЛАТФОРМА –<br>БАРЛЫҚ ПӘНДЕР!»</strong>
                <small>«АРМАНЫҢДАҒЫ БАЛЛҒА ЖЕТУ ҮШІН,<br>БАРЛЫҚ ПӘНДЕРГЕ СЕНІМЕН!»</small>
              </div>
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
              <span class="material-icons-outlined" style="color:${e.accent}">${e.icon}</span>
              <div style="flex:1;min-width:0">
                <div class="tr-course">${e.course}</div>
                <div class="tr-lesson ${e.done ? "done" : ""}">${e.lesson}</div>
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
      <div class="list-pad" style="padding-top:16px">
        ${MOCK.news
          .map(
            (n) => `
          <button type="button" class="blog-row" data-news="${n.id}">
            <div>
              <div class="blog-title">${n.title}</div>
              <div class="blog-body">${n.body}</div>
            </div>
            <img src="${n.thumb}" alt="" />
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

  function renderMyCourses() {
    const tab = state.courseSeg || "courses";
    return `
      <div class="seg-tabs">
        <button type="button" class="${tab === "courses" ? "on" : ""}" data-seg="courses">Курсы</button>
        <button type="button" class="${tab === "schedule" ? "on" : ""}" data-seg="schedule">Расписание</button>
      </div>
      <div class="list-pad" style="padding-top:12px">
        ${
          tab === "schedule"
            ? `<div class="today-card">${MOCK.scheduleToday
                .map(
                  (e, i) => `
            ${i > 0 ? `<div class="today-div"></div>` : ""}
            <button type="button" class="today-row" data-lesson="${e.lesson}" data-course="${e.course}">
              <span class="material-icons-outlined" style="color:${e.accent}">${e.icon}</span>
              <div style="flex:1;min-width:0">
                <div class="tr-course">${e.course}</div>
                <div class="tr-lesson ${e.done ? "done" : ""}">${e.lesson}</div>
              </div>
              <span class="material-icons-round chev">chevron_right</span>
            </button>`
                )
                .join("")}</div>`
            : MOCK.myCourses
                .map(
                  (c) => `
            <button type="button" class="purchase-row" data-course-id="${c.id}">
              <div class="purchase-thumb">
                <img src="${c.thumb}" alt="" style="background:${c.color};object-fit:contain;padding:8px" />
                <div class="purchase-days">осталось ${c.days} дней</div>
              </div>
              <div style="flex:1;min-width:0;text-align:left">
                <div class="purchase-title">${c.title}</div>
                <div class="purchase-meta">Всего ${c.total} уроков</div>
                <div class="purchase-meta">Пройдено ${c.done} уроков</div>
              </div>
            </button>`
                )
                .join("")
        }
      </div>`;
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
        openInner(n.title, `<div class="list-pad"><img src="${n.thumb}" alt="" style="width:100%;height:140px;object-fit:contain;background:var(--card);border-radius:15px" /><div class="news-card" style="margin-top:12px"><div class="n-body">${n.body}</div></div></div>`);
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
            <img src="${c.thumb}" alt="" style="width:100%;height:120px;object-fit:contain;background:${c.color};border-radius:15px;padding:16px" />
            <div class="news-card" style="margin-top:12px"><div class="n-body">Всего ${c.total} уроков<br>Пройдено ${c.done}</div></div>
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

    const wireSearch = (sel, key) => {
      const input = $(sel);
      if (!input) return;
      input.oninput = () => {
        state[key] = input.value.trim().toLowerCase();
        const pos = input.selectionStart;
        render();
        const again = $(sel);
        if (again) {
          again.focus();
          again.setSelectionRange(pos, pos);
        }
      };
    };
    wireSearch("#studentSearch", "searchStudents");
    wireSearch("#enrollSearch", "searchEnroll");

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
    paintTabChips();

    setTab(state.tab);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
