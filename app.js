"use strict";

(() => {
    const supabaseConfig = window.supabaseConfig;
    const supabaseClient = window.supabase && supabaseConfig
        ? window.supabase.createClient(supabaseConfig.url, supabaseConfig.key)
        : null;
    const menuToggle = document.querySelector("#menu-toggle");
    const menu = document.querySelector("#menu");
    const themeToggle = document.querySelector("#theme-toggle");
    const themeColorMeta = document.querySelector("#theme-color");
    const orderModal = document.querySelector("#order-modal");
    const orderForm = document.querySelector("#order-form");
    const orderTitle = document.querySelector("#order-title");
    const orderTotal = document.querySelector("#order-total");
    const orderMessage = document.querySelector("#order-message");
    const quantityInput = document.querySelector("#quantity");
    const cartToggle = document.querySelector("#cart-toggle");
    const cartModal = document.querySelector("#cart-modal");
    const cartCount = document.querySelector("#cart-count");
    const cartItems = document.querySelector("#cart-items");
    const cartTotal = document.querySelector("#cart-total");
    const checkoutButton = document.querySelector("#checkout-button");
    const continueShopping = document.querySelector("#continue-shopping");
    const checkoutModal = document.querySelector("#checkout-modal");
    const checkoutForm = document.querySelector("#checkout-form");
    const checkoutMessage = document.querySelector("#checkout-message");
    const checkoutSubmit = checkoutForm?.querySelector("button[type='submit']");
    const toast = document.querySelector("#toast");
    const backToTop = document.querySelector("#back-to-top");
    const splashScreen = document.querySelector("#splash-screen");

    const closeSplashScreen = () => {
        if (!(splashScreen instanceof HTMLElement)) return;
        splashScreen.classList.add("is-hidden");
        window.setTimeout(() => splashScreen.remove(), 650);
    };

    window.setTimeout(closeSplashScreen, 1250);

    if (!(menuToggle instanceof HTMLButtonElement) || !(menu instanceof HTMLElement)) {
        console.error("تعذر تهيئة قائمة الطعام: عناصر التحكم المطلوبة غير موجودة.");
        return;
    }

    const updateMenuState = (isOpen) => {
        menu.hidden = !isOpen;
        menuToggle.setAttribute("aria-expanded", String(isOpen));
        menuToggle.textContent = isOpen ? "إخفاء القائمة" : "استعرض القائمة";
    };

    menuToggle.addEventListener("click", () => {
        const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
        updateMenuState(!isOpen);

        if (!isOpen) {
            menu.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    });

    updateMenuState(false);

    if (!(themeToggle instanceof HTMLButtonElement)) {
        console.error("تعذر تهيئة تبديل المظهر: زر المظهر غير موجود.");
        return;
    }

    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = savedTheme === "dark" || (!savedTheme && prefersDark) ? "dark" : "light";

    const updateTheme = (theme) => {
        const isDark = theme === "dark";
        document.documentElement.dataset.theme = theme;
        const themeIcon = themeToggle.querySelector("span[aria-hidden]");
        const themeLabel = themeToggle.querySelector(".theme-label");
        if (themeIcon && themeLabel) {
            themeIcon.textContent = isDark ? "☀️" : "🌙";
            themeLabel.textContent = isDark ? "الوضع الفاتح" : "الوضع الداكن";
        } else {
            themeToggle.textContent = isDark ? "☀️ الوضع الفاتح" : "🌙 الوضع الداكن";
        }
        if (themeColorMeta instanceof HTMLMetaElement) {
            themeColorMeta.content = isDark ? "#000000" : "#f2f2f7";
        }
        themeToggle.setAttribute(
            "aria-label",
            isDark ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن",
        );
        themeToggle.setAttribute("aria-pressed", String(isDark));
    };

    updateTheme(initialTheme);
    document.body.classList.add("is-ready");

    const showToast = (message) => {
        if (!(toast instanceof HTMLElement)) return;
        toast.textContent = message;
        toast.classList.add("is-visible");
        window.clearTimeout(showToast.timeoutId);
        showToast.timeoutId = window.setTimeout(() => {
            toast.classList.remove("is-visible");
        }, 2600);
    };

    if (backToTop instanceof HTMLButtonElement) {
        const updateBackToTop = () => {
            backToTop.classList.toggle("is-visible", window.scrollY > 420);
        };
        window.addEventListener("scroll", updateBackToTop, { passive: true });
        backToTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
        updateBackToTop();
    }

    themeToggle.addEventListener("click", () => {
        const currentTheme = document.documentElement.dataset.theme;
        const nextTheme = currentTheme === "dark" ? "light" : "dark";

        updateTheme(nextTheme);
        localStorage.setItem("theme", nextTheme);
    });

    if (
        !(orderModal instanceof HTMLElement) ||
        !(orderForm instanceof HTMLFormElement) ||
        !(orderTitle instanceof HTMLElement) ||
        !(orderTotal instanceof HTMLElement) ||
        !(orderMessage instanceof HTMLElement) ||
        !(quantityInput instanceof HTMLInputElement) ||
        !(checkoutSubmit instanceof HTMLButtonElement)
    ) {
        console.error("تعذر تهيئة نموذج الطلب: عناصر النموذج المطلوبة غير موجودة.");
        return;
    }

    if (!(continueShopping instanceof HTMLButtonElement)) {
        console.error("تعذر تهيئة زر متابعة التسوق.");
        return;
    }

    let selectedProduct = null;

    const updateOrderTotal = () => {
        if (!selectedProduct) return;
        const selectedSize = orderForm.elements.namedItem("size");
        if (!(selectedSize instanceof RadioNodeList)) return;
        const selectedOption = selectedSize.value
            ? orderForm.querySelector(`input[name="size"][value="${selectedSize.value}"]`)
            : null;
        const extra = selectedOption instanceof HTMLInputElement
            ? Number(selectedOption.dataset.extra || 0)
            : 0;
        const quantity = Math.min(20, Math.max(1, Number(quantityInput.value) || 1));
        quantityInput.value = String(quantity);
        orderTotal.textContent = `${(selectedProduct.price + extra) * quantity} ج.م`;
    };

    const closeOrderModal = () => {
        orderModal.hidden = true;
        document.body.style.overflow = "";
        selectedProduct = null;
    };

    document.querySelectorAll(".product-action").forEach((button) => {
        button.addEventListener("click", () => {
            const product = button.closest(".product");
            if (!(product instanceof HTMLElement)) return;

            const name = product.dataset.product;
            const price = Number(product.dataset.price);
            if (!name || !Number.isFinite(price)) return;

            selectedProduct = { name, price };
            orderTitle.textContent = name;
            orderMessage.textContent = "";
            quantityInput.value = "1";
            orderModal.hidden = false;
            document.body.style.overflow = "hidden";
            updateOrderTotal();
            orderForm.querySelector("input[name='size']").focus();
        });
    });

    orderForm.addEventListener("change", updateOrderTotal);
    quantityInput.addEventListener("input", updateOrderTotal);

    orderModal.querySelectorAll("[data-close-modal]").forEach((element) => {
        element.addEventListener("click", closeOrderModal);
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !orderModal.hidden) closeOrderModal();
    });

    orderForm.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!selectedProduct) return;

        const selectedSize = orderForm.elements.namedItem("size");
        const size = selectedSize instanceof RadioNodeList ? selectedSize.value : "صغير";
        const extraInput = orderForm.querySelector(`input[name="size"][value="${size}"]`);
        const extra = extraInput instanceof HTMLInputElement ? Number(extraInput.dataset.extra || 0) : 0;
        const quantity = Number(quantityInput.value);
        const item = {
            name: selectedProduct.name,
            size,
            quantity,
            unitPrice: selectedProduct.price + extra,
        };
        const existingItem = cart.find((cartItem) => (
            cartItem.name === item.name && cartItem.size === item.size
        ));
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.push(item);
        }
        saveCart();
        renderCart();
        showToast(`تمت إضافة ${item.name} إلى السلة`);
        closeOrderModal();
        openModal(cartModal, cartToggle);
    });

    const cart = JSON.parse(localStorage.getItem("cart") || "[]");

    const saveCart = () => localStorage.setItem("cart", JSON.stringify(cart));

    const renderCart = () => {
        const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
        const total = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
        cartCount.textContent = String(itemCount);
        cartTotal.textContent = `${total} ج.م`;
        checkoutButton.disabled = cart.length === 0;
        cartItems.replaceChildren();
        if (cart.length === 0) {
            const emptyMessage = document.createElement("p");
            emptyMessage.className = "empty-cart";
            emptyMessage.textContent = "السلة فارغة حاليًا.";
            cartItems.append(emptyMessage);
            return;
        }

        cart.forEach((item, index) => {
            const cartItem = document.createElement("div");
            cartItem.className = "cart-item";
            const details = document.createElement("div");
            const name = document.createElement("strong");
            const summary = document.createElement("small");
            const removeButton = document.createElement("button");

            name.textContent = item.name;
            summary.textContent = `${item.quantity} × ${item.size} — ${item.unitPrice * item.quantity} ج.م`;
            removeButton.className = "remove-item";
            removeButton.type = "button";
            removeButton.textContent = "حذف";
            removeButton.addEventListener("click", () => {
                cart.splice(index, 1);
                saveCart();
                renderCart();
            });
            details.append(name, summary);
            cartItem.append(details, removeButton);
            cartItems.append(cartItem);
        });
    };

    const openModal = (modal, trigger) => {
        modal.hidden = false;
        trigger?.setAttribute("aria-expanded", "true");
        document.body.style.overflow = "hidden";
    };

    const closeModal = (modal, trigger) => {
        modal.hidden = true;
        trigger?.setAttribute("aria-expanded", "false");
        if (orderModal.hidden && cartModal.hidden && checkoutModal.hidden) {
            document.body.style.overflow = "";
        }
    };

    cartToggle.addEventListener("click", () => {
        if (cartModal.hidden) {
            renderCart();
            openModal(cartModal, cartToggle);
        } else {
            closeModal(cartModal, cartToggle);
        }
    });

    cartModal.querySelectorAll("[data-close-cart]").forEach((element) => {
        element.addEventListener("click", () => closeModal(cartModal, cartToggle));
    });

    checkoutButton.addEventListener("click", () => {
        closeModal(cartModal, cartToggle);
        checkoutMessage.textContent = "";
        openModal(checkoutModal);
        checkoutModal.querySelector("input").focus();
    });

    continueShopping.addEventListener("click", () => {
        closeModal(cartModal, cartToggle);
        menu.hidden = false;
        menuToggle.setAttribute("aria-expanded", "true");
        menuToggle.textContent = "إخفاء القائمة";
        menu.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    checkoutModal.querySelectorAll("[data-close-checkout]").forEach((element) => {
        element.addEventListener("click", () => closeModal(checkoutModal));
    });

    checkoutForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        checkoutSubmit.disabled = true;
        checkoutMessage.textContent = "جاري إرسال الطلب...";
        if (!supabaseClient) {
            checkoutMessage.textContent = "تعذر الاتصال بخدمة الطلبات. حاول مرة أخرى بعد قليل.";
            checkoutSubmit.disabled = false;
            return;
        }
        const formData = new FormData(checkoutForm);
        const orderNumber = `ORD-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${Math.floor(1000 + Math.random() * 9000)}`;
        const order = {
            orderNumber,
            customer: Object.fromEntries(formData.entries()),
            items: [...cart],
            total: cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
            status: "new",
            createdAt: new Date().toISOString(),
        };
        if (supabaseClient) {
            let orderError;
            try {
                ({ error: orderError } = await supabaseClient.rpc("create_order", {
                    order_data: {
                        order_number: order.orderNumber,
                        customer_name: order.customer.name,
                        phone: order.customer.phone,
                        address: order.customer.address,
                        notes: order.customer.notes || "",
                        payment_method: order.customer.paymentMethod,
                        total: order.total,
                    },
                    items_data: order.items.map((item) => ({
                        product_name: item.name,
                        size: item.size,
                        quantity: item.quantity,
                        unit_price: item.unitPrice,
                        total_price: item.unitPrice * item.quantity,
                    })),
                }));
            } catch (error) {
                console.error("حدث خطأ أثناء الاتصال بخدمة الطلبات:", error);
                orderError = error;
            }

            if (orderError) {
                console.error("فشل حفظ الطلب في قاعدة البيانات:", orderError);
                checkoutMessage.textContent = "تعذر إرسال الطلب. تأكد من إعداد قاعدة البيانات ثم حاول مرة أخرى.";
                checkoutSubmit.disabled = false;
                return;
            }
        }

        const savedOrders = JSON.parse(localStorage.getItem("orders") || "[]");
        savedOrders.unshift(order);
        localStorage.setItem("orders", JSON.stringify(savedOrders));
        localStorage.setItem("lastOrder", JSON.stringify(order));
        localStorage.removeItem("cart");
        cart.length = 0;
        renderCart();
        checkoutForm.reset();
        checkoutMessage.textContent = `تم استلام طلبك رقم ${orderNumber}. سنتواصل معك للتأكيد.`;
        checkoutSubmit.disabled = false;
    });

    document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        if (!orderModal.hidden) closeModal(orderModal);
        else if (!cartModal.hidden) closeModal(cartModal, cartToggle);
        else if (!checkoutModal.hidden) closeModal(checkoutModal);
    });

    renderCart();

    const revealSections = document.querySelectorAll(".menu-section");
    if ("IntersectionObserver" in window) {
        revealSections.forEach((section) => section.classList.add("reveal"));
        const observer = new IntersectionObserver((entries, currentObserver) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add("is-visible");
                currentObserver.unobserve(entry.target);
            });
        }, { threshold: 0.12 });
        revealSections.forEach((section) => observer.observe(section));
    }
})();
