"use strict";

(() => {
    const config = window.supabaseConfig;
    const client = window.supabase && config
        ? window.supabase.createClient(config.url, config.key)
        : null;
    const $ = (selector) => document.querySelector(selector);
    const elements = {
        loginSection: $("#login-section"),
        dashboard: $("#dashboard-content"),
        loginForm: $("#login-form"),
        loginMessage: $("#login-message"),
        signOut: $("#sign-out"),
        themeToggle: $("#theme-toggle"),
        refresh: $("#refresh-orders"),
        export: $("#export-orders"),
        notifications: $("#notifications-toggle"),
        ordersList: $("#orders-list"),
        lastUpdated: $("#last-updated"),
        search: $("#order-search"),
        status: $("#status-filter"),
        sort: $("#sort-orders"),
        date: $("#date-filter"),
        total: $("#total-orders"),
        fresh: $("#new-orders"),
        sales: $("#total-sales"),
        active: $("#active-orders"),
        todayOrders: $("#today-orders"),
        todaySales: $("#today-sales"),
        average: $("#average-order"),
        quickAll: $("#quick-all"),
        quickNew: $("#quick-new"),
        quickPreparing: $("#quick-preparing"),
        quickDelivering: $("#quick-delivering"),
        board: $("#orders-board"),
        detailModal: $("#order-detail-modal"),
        detailTitle: $("#detail-title"),
        detailContent: $("#detail-content"),
        sidebarNew: $("#sidebar-new-count"),
        sidebar: $("#admin-sidebar"),
        sidebarToggle: $("#sidebar-toggle"),
        sidebarPanel: $("#sidebar-panel"),
        sidebarPanelIcon: $("#sidebar-panel-icon"),
        sidebarPanelTitle: $("#sidebar-panel-title"),
        sidebarPanelDescription: $("#sidebar-panel-description"),
        sidebarPanelContent: $("#sidebar-panel-content"),
        sidebarPanelAction: $("#sidebar-panel-action"),
    };

    const openDetails = (order) => {
        elements.detailTitle.textContent = `#${order.orderNumber}`;
        elements.detailContent.replaceChildren();
        const summary = document.createElement("div");
        summary.className = "detail-summary";
        [
            ["العميل", order.customer.name],
            ["الهاتف", order.customer.phone],
            ["العنوان", order.customer.address],
            ["الدفع", order.paymentMethod],
            ["الحالة", statusLabels[order.status]],
            ["التاريخ", new Date(order.createdAt).toLocaleString("ar-EG")],
        ].forEach(([label, value]) => {
            const item = document.createElement("div");
            item.innerHTML = `<small>${label}</small><strong></strong>`;
            item.querySelector("strong").textContent = value;
            summary.append(item);
        });
        const items = document.createElement("div");
        items.className = "detail-items";
        order.items.forEach((item) => {
            const row = document.createElement("div");
            row.className = "detail-item";
            row.innerHTML = `<span></span><strong></strong>`;
            row.querySelector("span").textContent = `${item.quantity} × ${item.name} (${item.size})`;
            row.querySelector("strong").textContent = `${(item.quantity * item.unitPrice).toFixed(2)} ج.م`;
            items.append(row);
        });
        const total = document.createElement("div");
        total.className = "detail-total";
        total.textContent = `الإجمالي ${order.total.toFixed(2)} ج.م`;
        elements.detailContent.append(summary, items, total);
        elements.detailModal.hidden = false;
        document.body.style.overflow = "hidden";
    };

    const renderBoard = () => {
        document.querySelectorAll(".board-column").forEach((column) => {
            const status = column.dataset.boardStatus;
            const body = column.querySelector("div");
            const columnOrders = getVisibleOrders().filter((order) => order.status === status);
            column.querySelector("b").textContent = String(columnOrders.length);
            body.replaceChildren();
            columnOrders.forEach((order) => {
                const card = document.createElement("button");
                card.type = "button";
                card.className = "board-order";
                card.innerHTML = `<strong></strong><small></small><span></span>`;
                card.querySelector("strong").textContent = `#${order.orderNumber}`;
                card.querySelector("small").textContent = order.customer.name;
                card.querySelector("span").textContent = `${order.total.toFixed(2)} ج.م`;
                card.addEventListener("click", () => openDetails(order));
                body.append(card);
            });
        });
    };

    if (!client || Object.values(elements).some((element) => !(element instanceof HTMLElement))) {
        console.error("تعذر تهيئة لوحة التحكم أو إعداد Supabase غير موجود.");
        return;
    }

    const statusLabels = {
        new: "طلب جديد",
        accepted: "تم القبول",
        preparing: "جاري التحضير",
        delivering: "خرج للتوصيل",
        delivered: "تم التسليم",
        cancelled: "ملغي",
    };
    const activeStatuses = ["accepted", "preparing", "delivering"];
    let orders = [];
    let notificationsEnabled = false;
    let previousOrderIds = new Set();

    const setAuthenticated = (authenticated) => {
        elements.loginSection.hidden = authenticated;
        elements.dashboard.hidden = !authenticated;
    };

    const setSidebarOpen = (isOpen) => {
        elements.sidebar.hidden = !isOpen;
        elements.sidebarToggle.setAttribute("aria-expanded", String(isOpen));
        elements.sidebarToggle.classList.toggle("is-open", isOpen);
        elements.sidebarToggle.querySelector("span").textContent = isOpen ? "إغلاق القائمة" : "القائمة";
    };

    const openSidebarPanel = (view) => {
        const panelData = {
            overview: {
                icon: "⌂",
                title: "نظرة عامة",
                description: "ملخص سريع لحالة كبابجي العرب الآن.",
                content: `لديك ${orders.length} طلبًا، منها ${orders.filter((order) => order.status === "new").length} طلبات جديدة.`,
                action: "البقاء في الرئيسية",
            },
            orders: {
                icon: "▤",
                title: "الطلبات",
                description: "راجع كل الطلبات وابحث فيها أو غيّر حالتها.",
                content: `إجمالي الطلبات: ${orders.length} — الجديدة: ${orders.filter((order) => order.status === "new").length}.`,
                action: "عرض كل الطلبات",
            },
            kitchen: {
                icon: "◌",
                title: "المطبخ",
                description: "الطلبات التي تحتاج متابعة وتجهيزًا الآن.",
                content: `طلبات قيد التحضير: ${orders.filter((order) => order.status === "preparing").length}.`,
                action: "عرض طلبات المطبخ",
            },
            delivery: {
                icon: "➜",
                title: "التوصيل",
                description: "تابع الطلبات الخارجة إلى العملاء.",
                content: `طلبات التوصيل الحالية: ${orders.filter((order) => order.status === "delivering").length}.`,
                action: "عرض طلبات التوصيل",
            },
        }[view];
        elements.sidebarPanelIcon.textContent = panelData.icon;
        elements.sidebarPanelTitle.textContent = panelData.title;
        elements.sidebarPanelDescription.textContent = panelData.description;
        elements.sidebarPanelContent.textContent = panelData.content;
        elements.sidebarPanelAction.textContent = panelData.action;
        elements.sidebarPanel.hidden = false;
        document.body.style.overflow = "hidden";
        elements.sidebarPanelAction.onclick = () => {
            elements.sidebarPanel.hidden = true;
            document.body.style.overflow = "";
        };
    };

    const setTheme = (theme) => {
        const dark = theme === "dark";
        document.documentElement.dataset.theme = theme;
        elements.themeToggle.textContent = dark ? "☀️ الوضع الفاتح" : "🌙 الوضع الداكن";
        elements.themeToggle.setAttribute("aria-pressed", String(dark));
        localStorage.setItem("admin-theme", theme);
    };

    const normalizeOrder = (order) => ({
        id: order.id,
        orderNumber: order.order_number,
        customer: {
            name: order.customer_name,
            phone: order.phone,
            address: order.address,
            notes: order.notes || "",
        },
        paymentMethod: order.payment_method === "transfer" ? "تحويل بنكي" : "الدفع عند الاستلام",
        items: (order.order_items || []).map((item) => ({
            name: item.product_name,
            size: item.size,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unit_price),
        })),
        total: Number(order.total),
        status: order.status,
        createdAt: order.created_at,
    });

    const showListMessage = (message) => {
        elements.ordersList.replaceChildren();
        const empty = document.createElement("p");
        empty.className = "empty-orders";
        empty.textContent = message;
        elements.ordersList.append(empty);
    };

    const loadOrders = async () => {
        const { data, error } = await client
            .from("orders")
            .select("*, order_items (*)")
            .order("created_at", { ascending: false });
        if (error) {
            console.error("فشل تحميل الطلبات:", error);
            elements.lastUpdated.textContent = "تعذر تحميل البيانات";
            showListMessage("تعذر تحميل الطلبات. تحقق من صلاحيات حساب المدير.");
            return false;
        }
        orders = data.map(normalizeOrder);
        return true;
    };

    const isToday = (date) => {
        const value = new Date(date);
        const now = new Date();
        return value.toDateString() === now.toDateString();
    };

    const updateStats = () => {
        const validOrders = orders.filter((order) => order.status !== "cancelled");
        const today = validOrders.filter((order) => isToday(order.createdAt));
        const sales = validOrders.reduce((sum, order) => sum + order.total, 0);
        const todaySales = today.reduce((sum, order) => sum + order.total, 0);
        elements.total.textContent = String(orders.length);
        elements.fresh.textContent = String(orders.filter((order) => order.status === "new").length);
        elements.active.textContent = String(orders.filter((order) => activeStatuses.includes(order.status)).length);
        elements.sales.textContent = `${sales.toFixed(2)} ج.م`;
        elements.todayOrders.textContent = String(today.length);
        elements.todaySales.textContent = `${todaySales.toFixed(2)} ج.م`;
        elements.average.textContent = `${(validOrders.length ? sales / validOrders.length : 0).toFixed(2)} ج.م`;
        elements.quickAll.textContent = String(orders.length);
        elements.quickNew.textContent = String(orders.filter((order) => order.status === "new").length);
        elements.quickPreparing.textContent = String(orders.filter((order) => order.status === "preparing").length);
        elements.quickDelivering.textContent = String(orders.filter((order) => order.status === "delivering").length);
        elements.sidebarNew.textContent = String(orders.filter((order) => order.status === "new").length);
    };

    const withinDateRange = (order) => {
        const filter = elements.date.value;
        if (filter === "all") return true;
        const age = Date.now() - new Date(order.createdAt).getTime();
        const days = filter === "today" ? 1 : filter === "week" ? 7 : 30;
        return age >= 0 && age <= days * 24 * 60 * 60 * 1000;
    };

    const getVisibleOrders = () => {
        const query = elements.search.value.trim().toLowerCase();
        const filtered = orders.filter((order) => {
            const text = `${order.orderNumber} ${order.customer.name} ${order.customer.phone} ${order.customer.address}`.toLowerCase();
            return (elements.status.value === "all" || order.status === elements.status.value)
                && withinDateRange(order)
                && (!query || text.includes(query));
        });
        return filtered.sort((first, second) => {
            if (elements.sort.value === "highest") return second.total - first.total;
            const firstDate = new Date(first.createdAt).getTime();
            const secondDate = new Date(second.createdAt).getTime();
            return elements.sort.value === "oldest" ? firstDate - secondDate : secondDate - firstDate;
        });
    };

    const updateStatus = async (order, status, select) => {
        select.disabled = true;
        const { error } = await client.from("orders").update({ status }).eq("id", order.id);
        select.disabled = false;
        if (error) {
            console.error("فشل تحديث حالة الطلب:", error);
            select.value = order.status;
            return;
        }
        order.status = status;
        render();
    };

    const deleteOrder = async (order, button) => {
        const confirmed = window.confirm(`هل أنت متأكد من حذف الطلب #${order.orderNumber}؟ لا يمكن التراجع عن هذا الإجراء.`);
        if (!confirmed) return;

        button.disabled = true;
        const originalLabel = button.textContent;
        button.textContent = "جاري الحذف...";
        const { error } = await client.rpc("delete_order", { target_order_id: order.id });
        button.disabled = false;
        button.textContent = originalLabel;
        if (error) {
            console.error("فشل حذف الطلب:", error);
            const details = [error.message, error.code].filter(Boolean).join(" — ");
            window.alert(details
                ? `تعذر حذف الطلب:\n${details}`
                : "تعذر حذف الطلب: لم يتم نشر دالة الحذف في Supabase بعد.");
            return;
        }

        orders = orders.filter((item) => item.id !== order.id);
        if (!elements.detailModal.hidden && elements.detailTitle.textContent === `#${order.orderNumber}`) {
            elements.detailModal.hidden = true;
            document.body.style.overflow = "";
        }
        render();
    };

    const createStatusSelect = (order) => {
        const select = document.createElement("select");
        select.className = "status-select";
        select.setAttribute("aria-label", `حالة الطلب ${order.orderNumber}`);
        Object.entries(statusLabels).forEach(([value, label]) => {
            select.append(new Option(label, value, value === order.status, value === order.status));
        });
        select.addEventListener("change", () => void updateStatus(order, select.value, select));
        return select;
    };

    const createOrderCard = (order) => {
        const card = document.createElement("article");
        card.className = `admin-order status-${order.status}`;
        const heading = document.createElement("div");
        heading.className = "order-heading";
        const title = document.createElement("h2");
        title.textContent = `#${order.orderNumber}`;
        const time = document.createElement("time");
        time.dateTime = order.createdAt;
        time.textContent = new Date(order.createdAt).toLocaleString("ar-EG");
        heading.append(title, time);

        const customer = document.createElement("div");
        customer.className = "customer-info";
        const customerLine = document.createElement("span");
        customerLine.textContent = `${order.customer.name} — ${order.customer.phone}`;
        const address = document.createElement("span");
        address.textContent = `العنوان: ${order.customer.address}`;
        const payment = document.createElement("span");
        payment.textContent = `الدفع: ${order.paymentMethod}`;
        customer.append(customerLine, address, payment);
        if (order.customer.notes) {
            const notes = document.createElement("span");
            notes.className = "order-notes";
            notes.textContent = `ملاحظات: ${order.customer.notes}`;
            customer.append(notes);
        }

        const actions = document.createElement("div");
        actions.className = "contact-actions";
        const call = document.createElement("a");
        call.href = `tel:${order.customer.phone}`;
        call.textContent = "اتصال";
        const map = document.createElement("a");
        map.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.customer.address)}`;
        map.target = "_blank";
        map.rel = "noopener";
        map.textContent = "الخريطة";
        actions.append(call, map);
        customer.append(actions);

        const items = document.createElement("div");
        items.className = "order-items";
        order.items.forEach((item) => {
            const line = document.createElement("div");
            line.className = "order-line";
            const name = document.createElement("strong");
            name.textContent = `${item.quantity} × ${item.name} (${item.size})`;
            const price = document.createElement("small");
            price.textContent = `${(item.unitPrice * item.quantity).toFixed(2)} ج.م`;
            line.append(name, price);
            items.append(line);
        });

        const footer = document.createElement("div");
        footer.className = "order-footer";
        const total = document.createElement("strong");
        total.textContent = `${order.total.toFixed(2)} ج.م`;
        const controls = document.createElement("div");
        controls.className = "footer-actions";
        const print = document.createElement("button");
        print.type = "button";
        print.className = "print-order";
        print.textContent = "طباعة";
        print.addEventListener("click", () => window.print());
        const details = document.createElement("button");
        details.type = "button";
        details.className = "print-order";
        details.textContent = "التفاصيل";
        details.addEventListener("click", () => openDetails(order));
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "delete-order";
        remove.textContent = "🗑 حذف الطلب";
        remove.setAttribute("aria-label", `حذف الطلب ${order.orderNumber}`);
        remove.addEventListener("click", () => void deleteOrder(order, remove));
        controls.append(details, print, remove, createStatusSelect(order));
        footer.append(total, controls);
        card.append(heading, customer, items, footer);
        return card;
    };

    const render = () => {
        updateStats();
        elements.ordersList.replaceChildren();
        const visible = getVisibleOrders();
        if (!visible.length) {
            showListMessage(orders.length ? "لا توجد نتائج مطابقة." : "لا توجد طلبات حتى الآن.");
            return;
        }
        visible.forEach((order) => elements.ordersList.append(createOrderCard(order)));
        renderBoard();
    };

    const refresh = async (notify = false) => {
        elements.refresh.disabled = true;
        const oldIds = new Set(orders.map((order) => order.id));
        const loaded = await loadOrders();
        elements.refresh.disabled = false;
        if (!loaded) return;
        const hasNew = orders.some((order) => !oldIds.has(order.id));
        elements.lastUpdated.textContent = `آخر تحديث: ${new Date().toLocaleTimeString("ar-EG")}`;
        render();
        if (notify && hasNew && notificationsEnabled) {
            if ("Notification" in window && Notification.permission === "granted") {
                new Notification("طلب جديد", { body: "وصل طلب جديد إلى لوحة المطعم." });
            }
            if ("AudioContext" in window) {
                const audio = new AudioContext();
                const oscillator = audio.createOscillator();
                const gain = audio.createGain();
                oscillator.frequency.value = 880;
                gain.gain.value = 0.08;
                oscillator.connect(gain);
                gain.connect(audio.destination);
                oscillator.start();
                oscillator.stop(audio.currentTime + 0.18);
            }
        }
        previousOrderIds = new Set(orders.map((order) => order.id));
    };

    const csvCell = (value) => `"${String(value).replaceAll('"', '""')}"`;
    const exportOrders = () => {
        const rows = [["رقم الطلب", "التاريخ", "العميل", "الهاتف", "العنوان", "الحالة", "الدفع", "الإجمالي"]];
        getVisibleOrders().forEach((order) => rows.push([
            order.orderNumber,
            new Date(order.createdAt).toLocaleString("ar-EG"),
            order.customer.name,
            order.customer.phone,
            order.customer.address,
            statusLabels[order.status],
            order.paymentMethod,
            order.total.toFixed(2),
        ]));
        const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
        const link = document.createElement("a");
        link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        link.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
    };

    elements.loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        elements.loginMessage.textContent = "جاري تسجيل الدخول...";
        const email = $("#admin-email").value.trim();
        const password = $("#admin-password").value;
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) {
            console.error("فشل تسجيل الدخول:", error);
            elements.loginMessage.textContent = "بيانات الدخول غير صحيحة أو الحساب غير مصرح له.";
            return;
        }
        elements.loginForm.reset();
        elements.loginMessage.textContent = "";
    });

    elements.signOut.addEventListener("click", async () => {
        const { error } = await client.auth.signOut();
        if (error) console.error("فشل تسجيل الخروج:", error);
    });
    elements.sidebarToggle.addEventListener("click", () => {
        setSidebarOpen(elements.sidebar.hidden);
    });
    document.querySelectorAll("[data-view]").forEach((button) => {
        button.addEventListener("click", () => setSidebarOpen(false));
    });
    elements.themeToggle.addEventListener("click", () => {
        setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
    });
    elements.refresh.addEventListener("click", () => void refresh());
    elements.export.addEventListener("click", exportOrders);
    document.querySelectorAll("[data-orders-view]").forEach((button) => {
        button.addEventListener("click", () => {
            document.querySelectorAll("[data-orders-view]").forEach((item) => item.classList.remove("is-active"));
            button.classList.add("is-active");
            const boardMode = button.dataset.ordersView === "board";
            elements.ordersList.hidden = boardMode;
            elements.board.hidden = !boardMode;
            if (boardMode) renderBoard();
        });
    });
    document.querySelectorAll("[data-view]").forEach((button) => {
        button.addEventListener("click", () => {
            document.querySelectorAll("[data-view]").forEach((item) => item.classList.remove("is-active"));
            button.classList.add("is-active");
            const view = button.dataset.view;
            const status = view === "kitchen" ? "preparing" : view === "delivery" ? "delivering" : view === "orders" ? "all" : "all";
            elements.status.value = status;
            $("#active-view-title").textContent = view === "kitchen" ? "المطبخ" : view === "delivery" ? "التوصيل" : view === "orders" ? "كل الطلبات" : "نظرة عامة";
            $("#active-view-description").textContent = view === "kitchen" ? "تابع الطلبات التي يتم تجهيزها الآن." : view === "delivery" ? "تابع الطلبات الخارجة إلى العملاء." : "كل ما يحدث في مطعمك في مكان واحد.";
            render();
            openSidebarPanel(view);
        });
    });
    document.querySelectorAll("[data-close-detail]").forEach((element) => {
        element.addEventListener("click", () => {
            elements.detailModal.hidden = true;
            document.body.style.overflow = "";
        });
        document.querySelectorAll("[data-close-sidebar-panel]").forEach((element) => {
            element.addEventListener("click", () => {
                elements.sidebarPanel.hidden = true;
                document.body.style.overflow = "";
            });
        });
    });
    [elements.search, elements.status, elements.sort, elements.date]
        .forEach((control) => {
            control.addEventListener("input", render);
            control.addEventListener("change", render);
        });
    document.querySelectorAll("[data-quick-status]").forEach((button) => {
        button.addEventListener("click", () => {
            elements.status.value = button.dataset.quickStatus;
            document.querySelectorAll("[data-quick-status]").forEach((item) => item.classList.remove("is-active"));
            button.classList.add("is-active");
            render();
        });
    });
    elements.notifications.addEventListener("click", async () => {
        notificationsEnabled = !notificationsEnabled;
        elements.notifications.textContent = notificationsEnabled ? "🔔 التنبيهات مفعلة" : "🔕 التنبيهات";
        if (notificationsEnabled && "Notification" in window && Notification.permission === "default") {
            await Notification.requestPermission();
        }
    });
    client.auth.onAuthStateChange((_event, session) => {
        setAuthenticated(Boolean(session));
        if (session) void refresh();
    });
    client.auth.getSession().then(({ data }) => {
        setAuthenticated(Boolean(data.session));
        if (data.session) void refresh();
    });
    client.channel("orders-dashboard")
        .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => void refresh(true))
        .subscribe();
    setTheme(localStorage.getItem("admin-theme") || "light");
})();
