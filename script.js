// ====================== КОНСТАНТЫ ======================
const WA_PHONE = "77002392380";

// ====================== GITHUB STORAGE ======================
const TG_USERNAME = "Shbobat";

// ====================== GOOGLE MAPS ======================
let map = null;
let detailMap = null;
let marker = null;
let mapMarkers = [];

function initMap() {
    if (map) return;

    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;

    map = new google.maps.Map(mapContainer, {
        center: { lat: 43.238949, lng: 76.889709 },
        zoom: 12,
        mapTypeId: 'roadmap',
        fullscreenControl: true,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: true
    });

    console.log("✅ Google Maps загружена");
}

// Показать все объявления на карте (для админ-панели)
function showAllListingsOnMap() {
    const adminContent = document.getElementById('adminContent');
    if (!adminContent) return;
    
    const listingsWithLocation = items.filter(i => i.latitude && i.longitude);
    
    let html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h3 style="color:#f1f5f9;">🗺️ Карта объектов (${listingsWithLocation.length} объявлений)</h3>
            <button onclick="showAdminStats()" class="btn-secondary" style="background:#4b5563; color:white; padding:10px 18px;">
                <i class="fas fa-arrow-left"></i> Назад
            </button>
        </div>
        <div id="adminMapContainer" style="width:100%; height:500px; border-radius:16px; border:1px solid #334155; margin-top:15px;"></div>
        ${listingsWithLocation.length === 0 ? '<p style="color:#cbd5e1; text-align:center; padding:40px;">Нет объявлений с координатами</p>' : ''}
    `;
    
    adminContent.innerHTML = html;
    
    if (listingsWithLocation.length === 0) return;
    
    // Небольшая задержка для рендеринга DOM
    setTimeout(() => {
        const adminMapContainer = document.getElementById('adminMapContainer');
        if (!adminMapContainer) return;
        
        // Очищаем старые маркеры
        mapMarkers.forEach(m => m.setMap(null));
        mapMarkers = [];
        
        const adminMap = new google.maps.Map(adminMapContainer, {
            center: { lat: 43.238949, lng: 76.889709 },
            zoom: 6,
            mapTypeId: 'roadmap',
            fullscreenControl: true,
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: true
        });
        
        const bounds = new google.maps.LatLngBounds();
        
        listingsWithLocation.forEach(item => {
            const lat = parseFloat(item.latitude);
            const lng = parseFloat(item.longitude);
            
            const marker = new google.maps.Marker({
                position: { lat, lng },
                map: adminMap,
                title: item.title,
                animation: google.maps.Animation.DROP
            });
            
            bounds.extend({ lat, lng });
            
            const infoWindow = new google.maps.InfoWindow({
                content: `
                    <div style="padding:10px; max-width:280px;">
                        <h4 style="margin:0 0 8px; color:#1e2937; font-size:14px;">${sanitizeHTML(item.title)}</h4>
                        <p style="margin:0; color:#6366f1; font-weight:600; font-size:16px;">${item.price.toLocaleString()} ₸</p>
                        <p style="margin:5px 0 0; color:#64748b; font-size:12px;">${item.city} • ${item.category}</p>
                        <button onclick="openDetail(${item.id}); closeModal('adminModal');" 
                                style="margin-top:8px; padding:6px 12px; background:#6366f1; color:white; border:none; border-radius:6px; cursor:pointer; font-size:12px;">
                            Смотреть объявление
                        </button>
                    </div>
                `
            });
            
            marker.addListener('click', () => {
                infoWindow.open(adminMap, marker);
            });
            
            mapMarkers.push(marker);
        });
        
        // Масштабировать карту чтобы показать все маркеры
        if (mapMarkers.length > 0) {
            adminMap.fitBounds(bounds);
        }
        
        console.log(`✅ Показано ${listingsWithLocation.length} объявлений на карте`);
    }, 100);
}

function showDetailMap(latitude, longitude) {
    if (!latitude || !longitude) return;

    const detailContainer = document.getElementById('detailMap');
    if (!detailContainer) return;

    if (detailMap) detailMap = null;

    detailMap = new google.maps.Map(detailContainer, {
        center: { lat: parseFloat(latitude), lng: parseFloat(longitude) },
        zoom: 17,
        mapTypeId: 'roadmap'
    });

    new google.maps.Marker({
        position: { lat: parseFloat(latitude), lng: parseFloat(longitude) },
        map: detailMap,
        title: "Местоположение объекта"
    });
}

async function geocodeAddress(address) {
    if (!address || address.length < 8) return;

    try {
        const geocoder = new google.maps.Geocoder();
        const result = await geocoder.geocode({ 
            address: address + ", Казахстан",
            region: 'KZ'
        });

        if (result.results && result.results.length > 0) {
            const location = result.results[0].geometry.location;
            const formatted = result.results[0].formatted_address || address;

            document.getElementById('latitude').value = location.lat();
            document.getElementById('longitude').value = location.lng();

            if (map) {
                map.setCenter(location);
                map.setZoom(17);

                if (marker) marker.setMap(null);
                marker = new google.maps.Marker({
                    position: location,
                    map: map,
                    title: formatted
                });
            }
            showToast(`✅ Адрес найден: ${formatted}`, "success");
        } else {
            showToast("Адрес не найден. Уточните (улица + номер)", "error");
        }
    } catch (err) {
        console.error('Ошибка геокодирования:', err);
        showToast("Ошибка геокодирования", "error");
    }
}

function setupAddressListeners() {
    const addressInput = document.getElementById('address');
    const findBtn = document.getElementById('find-address-btn');
    
    if (!addressInput || !findBtn) return;

    findBtn.onclick = () => geocodeAddress(addressInput.value.trim());

    addressInput.onblur = () => {
        const val = addressInput.value.trim();
        if (val.length > 12) {
            geocodeAddress(val);
        }
    };
}

// ====================== ДАННЫЕ ======================
let items = []; // Будет загружено из Firebase
let users = JSON.parse(localStorage.getItem('krysha_u_users')) || {};
let currentUser = localStorage.getItem('krysha_u_logged') || null;
let favorites = JSON.parse(localStorage.getItem('krysha_u_favs')) || [];
let subscriptions = JSON.parse(localStorage.getItem('krysha_subscriptions')) || [];
let payments = JSON.parse(localStorage.getItem('krysha_payments')) || [];

let isDark = localStorage.getItem('krysha_theme') === 'dark';
let currentTheme = localStorage.getItem('krysha_color_theme') || 'default';
let currentLang = localStorage.getItem('krysha_lang') || 'ru';
let currentMode = 'all';
let currentImages = [];
let searchQuery = '';
let sortBy = 'date'; // date, price-asc, price-desc, views
let viewedItems = JSON.parse(localStorage.getItem('krysha_viewed')) || [];
let userProfiles = JSON.parse(localStorage.getItem('krysha_profiles')) || {};
let chatMessages = JSON.parse(localStorage.getItem('krysha_chats')) || [];
let lastRequestTime = {}; // Для rate limiting
let plusExpiryDate = localStorage.getItem('krysha_plus_expiry') 
    ? new Date(localStorage.getItem('krysha_plus_expiry')) 
    : null;

// ====================== ЧАТ В РЕАЛЬНОМ ВРЕМЕНИ ======================

// Загрузка сообщений чата из Firebase
async function loadChatsFromFirebase() {
    if (!db) return;
    
    try {
        const snapshot = await db.collection("chats").orderBy("timestamp", "asc").get();
        chatMessages = [];
        snapshot.forEach((doc) => {
            chatMessages.push({ id: doc.id, ...doc.data() });
        });
        console.log(`✅ Загружено ${chatMessages.length} сообщений чата из Firebase`);
    } catch (error) {
        console.error("Ошибка загрузки чатов из Firebase:", error);
    }
}

// Real-time синхронизация чата
function enableChatRealtimeSync() {
    if (!db) return;
    
    if (unsubscribeChats) {
        unsubscribeChats();
    }
    
    // Подписываемся на все сообщения чатов
    unsubscribeChats = db.collection("chats")
        .orderBy("timestamp", "asc")
        .onSnapshot((snapshot) => {
            // Сохраняем текущую позицию скролла если чат открыт
            const container = document.getElementById('chatMessagesContainer');
            const wasAtBottom = container && (container.scrollHeight - container.scrollTop - container.clientHeight < 100);
            
            // Обновляем локальный массив
            const newMessages = [];
            snapshot.forEach((doc) => {
                newMessages.push({ id: doc.id, ...doc.data() });
            });
            
            // Проверяем, изменились ли сообщения
            const oldIds = chatMessages.map(m => m.id);
            const newIds = newMessages.map(m => m.id);
            const hasChanged = oldIds.length !== newIds.length || 
                              !oldIds.every((id, i) => id === newIds[i]);
            
            if (hasChanged) {
                chatMessages = newMessages;
                console.log(`🔄 Чат синхронизирован: ${chatMessages.length} сообщений`);
                
                // Обновляем открытое окно чата
                const chatModal = document.getElementById('chatModal');
                if (chatModal && chatModal.style.display === 'flex') {
                    const container = document.getElementById('chatMessagesContainer');
                    if (container) {
                        container.innerHTML = renderChatMessagesForContainer();
                        if (wasAtBottom || chatMessages.length <= 5) {
                            container.scrollTop = container.scrollHeight;
                        }
                    }
                }
            }
        }, (error) => {
            console.error("Ошибка real-time синхронизации чата:", error);
        });
}
    
// Рендер сообщений для обновления открытого чата
function renderChatMessagesForContainer() {
    const container = document.getElementById('chatMessagesContainer');
    if (!container) return '';
    
    const listingId = parseInt(container.dataset.listingId);
    if (!listingId) return '';
    
    const item = items.find(i => i.id === listingId);
    if (!item) return '';
    
    const messages = getChatMessages(listingId);
    
    if (messages.length === 0) {
        return `<p style="text-align:center; color:var(--text-light); padding:40px 20px;">
            💬 Начните диалог с продавцом
        </p>`;
    }
    
    return messages.map(msg => {
        const isMyMessage = msg.from === currentUser;
        let timestamp = msg.timestamp;
        if (timestamp && timestamp.toDate) {
            timestamp = timestamp.toDate();
        }
        const time = new Date(timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        
        return `
            <div style="margin-bottom:12px; ${isMyMessage ? 'text-align:right;' : ''}">
                <div style="display:inline-block; max-width:75%; padding:10px 14px; border-radius:16px; 
                            ${isMyMessage 
                                ? 'background:linear-gradient(135deg, #6366f1, #4f46e5); color:white;' 
                                : 'background:var(--card-bg); border:1px solid var(--border);'}">
                    <p style="margin:0; word-wrap:break-word;">${msg.message}</p>
                    <small style="opacity:0.7; font-size:11px; display:block; margin-top:5px;">
                        ${time} ${msg.read && isMyMessage ? '✓' : ''}
                    </small>
                </div>
            </div>
        `;
    }).join('');
}

// ====================== ОСНОВНОЙ FIREBASE SYNC ======================
let unsubscribeListings = null;
let unsubscribeChats = null;

// Загрузка объявлений из Firebase
async function loadListingsFromFirebase() {
    if (!db) {
        console.error("Firebase не инициализирован");
        return;
    }
    
    try {
        const querySnapshot = await db.collection("listings").orderBy("createdAt", "desc").get();
        
        items = [];
        querySnapshot.forEach((doc) => {
            items.push({ id: doc.id, ...doc.data() });
        });
        
        console.log(`✅ Загружено ${items.length} объявлений из Firebase`);
        render();
    } catch (error) {
        console.error("Ошибка загрузки из Firebase:", error);
        showToast("Ошибка загрузки данных", "error");
    }
}
    
// Real-time синхронизация
function enableRealtimeSync() {
    if (!db) return;
    
    // Отписываемся от предыдущей подписки
    if (unsubscribeListings) {
        unsubscribeListings();
    }
    
    // Подписка на изменения в реальном времени
    unsubscribeListings = db.collection("listings")
        .orderBy("createdAt", "desc")
        .onSnapshot((snapshot) => {
            items = [];
            snapshot.forEach((doc) => {
                items.push({ id: doc.id, ...doc.data() });
            });
            
            console.log(`🔄 Синхронизировано ${items.length} объявлений`);
            render();
        }, (error) => {
            console.error("Ошибка real-time синхронизации:", error);
        });
}

// Сохранение объявления
async function saveListingToFirebase(listing, editId = null) {
    if (!db) {
        console.error("Firebase не инициализирован");
        return;
    }
    
    try {
        if (editId) {
            // Обновление — Firebase использует doc ID
            await db.collection("listings").doc(String(editId)).update({
                ...listing,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            // Обновляем локально
            const localItem = items.find(i => i.id == editId || i.id === editId);
            if (localItem) {
                Object.assign(localItem, listing, { updatedAt: new Date().toISOString() });
            }
            showToast("Объявление обновлено!", "success");
        } else {
            // Создание — без ID, Firestore сгенерирует сам
            const docRef = await db.collection("listings").add({
                ...listing,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                views: 0,
                isVIP: false,
                vipUntil: null
            });
            // Обновляем локально с новым ID
            const newItem = { id: docRef.id, ...listing, createdAt: new Date().toISOString(), views: 0 };
            const idx = items.findIndex(i => !i.id);
            if (idx >= 0) {
                items[idx] = newItem;
            } else {
                items.unshift(newItem);
            }
            showToast("Объявление опубликовано!", "success");
        }
        
        closeModal('addFormModal');
        render();
    } catch (error) {
        console.error("Ошибка сохранения:", error);
        showToast("Ошибка при сохранении", "error");
    }
}
    
// Удаление объявления
async function deleteListingFromFirebase(id) {
    if (!db) return false;
    
    try {
        await db.collection("listings").doc(id).delete();
        showToast("Объявление удалено", "success");
        return true;
    } catch (error) {
        console.error("Ошибка удаления:", error);
        showToast("Ошибка при удалении", "error");
        return false;
    }
}
    
// Обновление просмотров
async function incrementViewCount(id) {
    if (!db) return;
    
    try {
        await db.collection("listings").doc(id).update({
            views: firebase.firestore.FieldValue.increment(1)
        });
    } catch (error) {
        console.error("Ошибка обновления просмотров:", error);
    }
}
    
// ====================== ЯЗЫКОВЫЕ СЛОВАРИ ======================
const translations = {
    ru: {
        nav: {
            all: 'Все объявления',
            my: 'Мои объявления',
            fav: 'Избранное',
            viewed: '📜 История',
            plus: 'Krisha Plus',
            admin: '👑 Админ',
            profile: '👤 Профиль',
            payments: '💳 Платежи',
            logout: 'Выйти',
            login: '🔑 Войти'
        },
        filters: {
            search: '🔍 Поиск по названию, описанию, городу...',
            sort: {
                date: '📅 По дате (новые)',
                priceAsc: '💰 По цене (возрастание)',
                priceDesc: '💰 По цене (убывание)',
                views: '👁 По просмотрам'
            },
            city: 'Все города',
            type: 'Продажа / Аренда',
            category: 'Все категории',
            price: 'Цена до (₸)',
            owners: 'Владельцев до',
            submit: '➕ Подать объявление'
        },
        buttons: {
            valuation: '📐 Оценить квартиру',
            mortgage: '🏦 Ипотечный калькулятор',
            subscription: '🔔 Подписка на поиск',
            share: '📤 Поделиться',
            newListing: 'Новое объявление',
            editListing: 'Редактировать объявление',
            publish: '✅ Опубликовать объявление',
            save: '💾 Сохранить',
            delete: '🗑 Удалить',
            edit: '✏️ Редактировать',
            vip: '⭐ VIP',
            makeVip: 'Сделать VIP',
            chat: '💬 Чат',
            writeSeller: '💬 Написать продавцу'
        },
        auth: {
            title: 'Вход / Регистрация',
            login: 'Логин',
            password: 'Пароль',
            submit: 'Войти или Создать аккаунт',
            logoutConfirm: 'Выйти из аккаунта?'
        },
        listing: {
            category: 'Категория',
            title: 'Заголовок объявления *',
            price: 'Цена (₸) *',
            city: 'Город',
            owners: 'Кол-во владельцев',
            address: 'Точный адрес (улица, дом)',
            description: 'Подробное описание...',
            photos: 'Фотографии (до 5)',
            uploadPhotos: '📁 Выбрать фото с компьютера',
            addressOnMap: 'Укажите адрес на карте',
            findAddress: 'Найти на карте',
            noPhotos: '📷 Нет фотографий'
        },
        detail: {
            city: 'Город',
            owners: 'Количество владельцев',
            type: 'Тип',
            category: 'Категория',
            author: 'Автор',
            views: 'Просмотров',
            location: '📍 Местоположение',
            rent: 'Аренда',
            sale: 'Продажа'
        },
        profile: {
            title: 'Профиль пользователя',
            memberSince: 'На сайте с',
            listings: 'Объявлений',
            views: 'Просмотров',
            favorites: 'В избранном',
            settings: '⚙️ Настройки профиля',
            avatar: '📷 Аватар',
            phone: '📞 Телефон',
            bio: '📝 О себе',
            bioPlaceholder: 'Расскажите немного о себе...',
            saveProfile: '💾 Сохранить профиль',
            myListings: '📋 Мои объявления',
            viewHistory: '📜 История просмотров'
        },
        admin: {
            title: '👑 Админ-панель Krysha Pro',
            stats: '📊 Статистика проекта',
            listings: 'Объявлений',
            users: 'Пользователей',
            views: 'Просмотров',
            revenue: 'Доход (₸)',
            messages: 'Сообщений',
            unread: 'Непрочитанных',
            details: '📈 Детальная статистика',
            subscriptions: 'Подписки',
            payments: 'Платежей',
            plusActive: 'Plus активен',
            days: 'дн.',
            cities: 'Городов',
            logs: 'Логи действий',
            onMap: 'На карте',
            manage: '⚙️ Управление',
            allListings: '📋 Все объявления',
            allUsers: '👥 Пользователи',
            allSubs: '📬 Подписки',
            allPayments: '💳 Платежи',
            actionLogs: '📜 Логи действий',
            map: '🗺️ Карта объектов',
            clearAll: '🗑 Очистить всю базу',
            resetListings: '🔄 Сбросить объявления',
            export: '💾 Экспорт данных',
            import: '📥 Импорт данных',
            usersTitle: 'Пользователи',
            noSubs: 'Подписок пока нет',
            logsTitle: '📜 Логи действий',
            logsEmpty: 'Логи пока пустые',
            clearLogs: '🗑 Очистить логи',
            listingsTitle: 'Все объявления',
            confirmDelete: 'Удалить это объявление навсегда?',
            deleted: 'Объявление удалено',
            edit: '✏️ Редактировать',
            delete: '🗑 Удалить',
            resetConfirm: '🗑 Сбросить ВСЕ объявления? Пользователи и платежи останутся.',
            resetSuccess: '✅ Объявления сброшены',
            clearConfirm1: '⚠️ ВЫ УВЕРЕНЫ? Будет удалено ВСЁ (объявления, пользователи, платежи)!',
            clearConfirm2: 'Последнее подтверждение — очистить базу?',
            exportSuccess: '✅ Данные экспортированы',
            importConfirm: '⚠️ Импорт данных из',
            importWarning: '\n\nТекущие данные будут ЗАМЕНЕНЫ!',
            importSuccess: '✅ Данные импортированы! Страница перезагрузится...',
            importError: '❌ Ошибка импорта: неверный формат файла'
        },
        plus: {
            title: 'Krisha Plus',
            active: '✅ Krisha Plus активен (осталось',
            days: 'дней)',
            selectTariff: 'Выберите тариф',
            safe: 'Оплата безопасная • Активация сразу после оплаты',
            month: 'месяц',
            months: 'месяца',
            discount: 'Скидка',
            originalPrice: 'Обычная цена',
            popular: 'Самый выгодный',
            payment: 'Оплата Krisha Plus',
            selectMethod: 'Выберите способ оплаты',
            cardPayment: '💳 Оплата банковской картой',
            cardNumber: 'Номер карты',
            expiry: 'Срок действия (MM/YY)',
            cvv: 'CVV',
            cardName: 'Имя владельца карты',
            pay: 'Оплатить'
        },
        valuation: {
            title: 'Оценка недвижимости',
            area: 'Площадь, м²',
            rooms: 'Количество комнат',
            calculate: 'Рассчитать стоимость',
            result: 'Примерная стоимость'
        },
        subscription: {
            title: 'Подписка на новые объявления',
            anyCity: 'Любой город',
            anyType: 'Продажа или Аренда',
            saleOnly: 'Только продажа',
            rentOnly: 'Только аренда',
            anyCategory: 'Любая категория',
            priceFrom: 'Цена от (₸)',
            priceTo: 'Цена до (₸)',
            minRooms: 'Количество комнат (минимум)',
            create: '✅ Создать подписку',
            mySubs: 'Ваши активные подписки',
            noSubs: 'У вас пока нет активных подписок'
        },
        history: {
            title: '📜 История просмотров',
            noHistory: 'Вы ещё не просматривали объявления',
            clear: '🗑 Очистить историю',
            clearConfirm: '🗑 Очистить историю просмотров?'
        },
        chat: {
            with: '💬 Чат с',
            placeholder: 'Введите сообщение...',
            noMessages: '💬 Начните диалог с продавцом\nСообщения сохраняются только в этом браузере'
        },
        categories: {
            flat: 'Квартира',
            house: 'Дом / Коттедж',
            room: 'Комната',
            garage: 'Гараж',
            land: 'Земельный участок',
            commercial: 'Коммерция',
            other: 'Другое'
        },
        cities: {
            almaty: 'Алматы',
            astana: 'Астана',
            shymkent: 'Шымкент',
            semey: 'Семей'
        },
        messages: {
            loginRequired: '⚠️ Войдите в аккаунт',
            fillFields: 'Заполните обязательные поля',
            listingPublished: 'Объявление опубликовано!',
            listingUpdated: 'Объявление обновлено!',
            deleted: 'Удалено',
            saved: 'Сохранено',
            error: 'Ошибка',
            success: 'Успешно',
            confirmDelete: 'Удалить объявление?',
            vipActivated: '✅ Объявление стало VIP на 7 дней!',
            vipRemoved: '✅ VIP статус снят',
            plusRequired: '⚠️ Функция доступна только с Krisha Plus'
        }
    },
    kk: {
        nav: {
            all: 'Барлық хабарламалар',
            my: 'Менің хабарламаларым',
            fav: 'Таңдамалы',
            viewed: '📜 Тарих',
            plus: 'Krisha Plus',
            admin: '👑 Әкімші',
            profile: '👤 Профиль',
            payments: '💳 Төлемдер',
            logout: 'Шығу',
            login: '🔑 Кіру'
        },
        filters: {
            search: '🔍 Атауы, сипаттамасы, қаласы бойынша іздеу...',
            sort: {
                date: '📅 Күні бойынша (жаңа)',
                priceAsc: '💰 Бағасы (өсу)',
                priceDesc: '💰 Бағасы (кему)',
                views: '👁 Көрулер'
            },
            city: 'Барлық қалалар',
            type: 'Сату / Жалдау',
            category: 'Барлық санаттар',
            price: 'Бағасы дейін (₸)',
            owners: 'Иелері дейін',
            submit: '➕ Хабарлама беру'
        },
        buttons: {
            valuation: '📐 Пәтерді бағалау',
            mortgage: '🏦 Ипотекалық калькулятор',
            subscription: '🔔 Іздеуге жазылу',
            share: '📤 Бөлісу',
            newListing: 'Жаңа хабарлама',
            editListing: 'Хабарламаны өңдеу',
            publish: '✅ Жариялау',
            save: '💾 Сақтау',
            delete: '🗑 Жою',
            edit: '✏️ Өңдеу',
            vip: '⭐ VIP',
            makeVip: 'VIP жасау',
            chat: '💬 Чат',
            writeSeller: '💬 Сатушыға жазу'
        },
        auth: {
            title: 'Кіру / Тіркелу',
            login: 'Логин',
            password: 'Құпиясөз',
            submit: 'Кіру немесе Аккаунт жасау',
            logoutConfirm: 'Аккаунттан шығу?'
        },
        listing: {
            category: 'Санат',
            title: 'Хабарлама тақырыбы *',
            price: 'Бағасы (₸) *',
            city: 'Қала',
            owners: 'Иелер саны',
            address: 'Толық мекенжай (көше, үй)',
            description: 'Толық сипаттама...',
            photos: 'Фотосуреттер (5-ке дейін)',
            uploadPhotos: '📁 Компьютерден фото таңдау',
            addressOnMap: 'Картадан мекенжайды көрсетіңіз',
            findAddress: 'Картадан табу',
            noPhotos: '📷 Фотосуреттер жоқ'
        },
        detail: {
            city: 'Қала',
            owners: 'Иелер саны',
            type: 'Түрі',
            category: 'Санаты',
            author: 'Авторы',
            views: 'Көрулер',
            location: '📍 Орналасуы',
            rent: 'Жалдау',
            sale: 'Сату'
        },
        profile: {
            title: 'Пайдаланушы профилі',
            memberSince: 'Сайтта',
            listings: 'Хабарламалар',
            views: 'Көрулер',
            favorites: 'Таңдамалыда',
            settings: '⚙️ Профиль параметрлері',
            avatar: '📷 Аватар',
            phone: '📞 Телефон',
            bio: '📝 Өзіңіз туралы',
            bioPlaceholder: 'Өзіңіз туралы айтып беріңіз...',
            saveProfile: '💾 Профильді сақтау',
            myListings: '📋 Менің хабарламаларым',
            viewHistory: '📜 Көру тарихы'
        },
        admin: {
            title: '👑 Әкімші панелі Krysha Pro',
            stats: '📊 Жоба статистикасы',
            listings: 'Хабарламалар',
            users: 'Пайдаланушылар',
            views: 'Көрулер',
            revenue: 'Кіріс (₸)',
            messages: 'Хабарламалар',
            unread: 'Оқылмаған',
            details: '📈 Егжей-тегжейлі статистика',
            subscriptions: 'Жазылымдар',
            payments: 'Төлемдер',
            plusActive: 'Plus активті',
            days: 'күн',
            cities: 'Қалалар',
            logs: 'Әрекеттер журналы',
            onMap: 'Картада',
            manage: '⚙️ Басқару',
            allListings: '📋 Барлық хабарламалар',
            allUsers: '👥 Пайдаланушылар',
            allSubs: '📬 Жазылымдар',
            allPayments: '💳 Төлемдер',
            actionLogs: '📜 Әрекеттер журналы',
            map: '🗺️ Объектілер картасы',
            clearAll: '🗑 Барлық базаны тазалау',
            resetListings: '🔄 Хабарламаларды қалпына келтіру',
            export: '💾 Деректерді экспорт',
            import: '📥 Деректерді импорт',
            usersTitle: 'Пайдаланушылар',
            noSubs: 'Жазылымдар әлі жоқ',
            logsTitle: '📜 Әрекеттер журналы',
            logsEmpty: 'Журнал бос',
            clearLogs: '🗑 Журналды тазалау',
            listingsTitle: 'Барлық хабарламалар',
            confirmDelete: 'Бұл хабарламаны мәңгіге жою?',
            deleted: 'Хабарлама жойылды',
            edit: '✏️ Өңдеу',
            delete: '🗑 Жою',
            resetConfirm: '🗑 Барлық хабарламаларды қалпына келтіру? Пайдаланушылар мен төлемдер сақталады.',
            resetSuccess: '✅ Хабарламалар қалпына келтірілді',
            clearConfirm1: '⚠️ СІЗ СЕНІМДІСІЗ БЕ? БӘРІ жойылады (хабарламалар, пайдаланушылар, төлемдер)!',
            clearConfirm2: 'Соңғы растау — базаны тазалау?',
            exportSuccess: '✅ Деректер экспортталды',
            importConfirm: '⚠️ Деректерді импорттау',
            importWarning: '\n\nАғымдағы деректер АУЫСТЫРЫЛАДЫ!',
            importSuccess: '✅ Деректер импортталды! Парақ жүктеледі...',
            importError: '❌ Импорт қатесі: дұрыс емес файл пішімі'
        },
        plus: {
            title: 'Krisha Plus',
            active: '✅ Krisha Plus активті (қалды',
            days: 'күн)',
            selectTariff: 'Тарифті таңдаңыз',
            safe: 'Төлем қауіпсіз • Бірден белсендіру',
            month: 'ай',
            months: 'ай',
            discount: 'Жеңілдік',
            originalPrice: 'Қалыпты баға',
            popular: 'Ең тиімді',
            payment: 'Krisha Plus төлемі',
            selectMethod: 'Төлем әдісін таңдаңыз',
            cardPayment: '💳 Банк картасымен төлем',
            cardNumber: 'Карта нөмірі',
            expiry: 'Қолданыс мерзімі (АА/ЖЖ)',
            cvv: 'CVV',
            cardName: 'Карта иесінің аты',
            pay: 'Төлеу'
        },
        valuation: {
            title: 'Мүлікті бағалау',
            area: 'Ауданы, м²',
            rooms: 'Бөлмелер саны',
            calculate: 'Құнды есептеу',
            result: 'Шамамен құны'
        },
        subscription: {
            title: 'Жаңа хабарламаларға жазылу',
            anyCity: 'Кез келген қала',
            anyType: 'Сату немесе Жалдау',
            saleOnly: 'Тек сату',
            rentOnly: 'Тек жалдау',
            anyCategory: 'Кез келген санат',
            priceFrom: 'Бағасы бастап (₸)',
            priceTo: 'Бағасы дейін (₸)',
            minRooms: 'Бөлмелер саны (минимум)',
            create: '✅ Жазылым жасау',
            mySubs: 'Сіздің белсенді жазылымдарыңыз',
            noSubs: 'Сізде әлі белсенді жазылымдар жоқ'
        },
        history: {
            title: '📜 Көру тарихы',
            noHistory: 'Сіз әлі хабарламаларды қараған жоқсыз',
            clear: '🗑 Тарихты тазалау',
            clearConfirm: '🗑 Көру тарихын тазалау?'
        },
        chat: {
            with: '💬 Чат',
            placeholder: 'Хабарлама енгізіңіз...',
            noMessages: '💬 Сатушымен диалог бастаңыз\nХабарламалар тек осы браузерде сақталады'
        },
        categories: {
            flat: 'Пәтер',
            house: 'Үй / Коттедж',
            room: 'Бөлме',
            garage: 'Гараж',
            land: 'Жер учаскесі',
            commercial: 'Коммерция',
            other: 'Басқа'
        },
        cities: {
            almaty: 'Алматы',
            astana: 'Астана',
            shymkent: 'Шымкент',
            semey: 'Семей'
        },
        messages: {
            loginRequired: '⚠️ Аккаунтқа кіріңіз',
            fillFields: 'Міндетті өрістерді толтырыңыз',
            listingPublished: 'Хабарлама жарияланды!',
            listingUpdated: 'Хабарлама жаңартылды!',
            deleted: 'Жойылды',
            saved: 'Сақталды',
            error: 'Қате',
            success: 'Сәтті',
            confirmDelete: 'Хабарламаны жою?',
            vipActivated: '✅ Хабарлама 7 күнге VIP болды!',
            vipRemoved: '✅ VIP мәртебесі алынды',
            plusRequired: '⚠️ Функция тек Krisha Plus үшін қолжетімді'
        }
    },
    en: {
        nav: {
            all: 'All Listings',
            my: 'My Listings',
            fav: 'Favorites',
            viewed: '📜 History',
            plus: 'Krisha Plus',
            admin: '👑 Admin',
            profile: '👤 Profile',
            payments: '💳 Payments',
            logout: 'Logout',
            login: '🔑 Login'
        },
        filters: {
            search: '🔍 Search by title, description, city...',
            sort: {
                date: '📅 By Date (Newest)',
                priceAsc: '💰 By Price (Low to High)',
                priceDesc: '💰 By Price (High to Low)',
                views: '👁 By Views'
            },
            city: 'All Cities',
            type: 'Sale / Rent',
            category: 'All Categories',
            price: 'Price up to (₸)',
            owners: 'Owners up to',
            submit: '➕ Submit Listing'
        },
        buttons: {
            valuation: '📐 Valuation',
            mortgage: '🏦 Mortgage Calculator',
            subscription: '🔔 Search Alerts',
            share: '📤 Share',
            newListing: 'New Listing',
            editListing: 'Edit Listing',
            publish: '✅ Publish Listing',
            save: '💾 Save',
            delete: '🗑 Delete',
            edit: '✏️ Edit',
            vip: '⭐ VIP',
            makeVip: 'Make VIP',
            chat: '💬 Chat',
            writeSeller: '💬 Contact Seller'
        },
        auth: {
            title: 'Login / Register',
            login: 'Username',
            password: 'Password',
            submit: 'Login or Create Account',
            logoutConfirm: 'Logout from account?'
        },
        listing: {
            category: 'Category',
            title: 'Listing Title *',
            price: 'Price (₸) *',
            city: 'City',
            owners: 'Number of Owners',
            address: 'Full Address (Street, Building)',
            description: 'Detailed Description...',
            photos: 'Photos (up to 5)',
            uploadPhotos: '📁 Upload Photos from Computer',
            addressOnMap: 'Specify Address on Map',
            findAddress: 'Find on Map',
            noPhotos: '📷 No Photos'
        },
        detail: {
            city: 'City',
            owners: 'Number of Owners',
            type: 'Type',
            category: 'Category',
            author: 'Author',
            views: 'Views',
            location: '📍 Location',
            rent: 'Rent',
            sale: 'Sale'
        },
        profile: {
            title: 'User Profile',
            memberSince: 'Member Since',
            listings: 'Listings',
            views: 'Views',
            favorites: 'In Favorites',
            settings: '⚙️ Profile Settings',
            avatar: '📷 Avatar',
            phone: '📞 Phone',
            bio: '📝 About Me',
            bioPlaceholder: 'Tell us a bit about yourself...',
            saveProfile: '💾 Save Profile',
            myListings: '📋 My Listings',
            viewHistory: '📜 View History'
        },
        admin: {
            title: '👑 Admin Panel Krysha Pro',
            stats: '📊 Project Statistics',
            listings: 'Listings',
            users: 'Users',
            views: 'Views',
            revenue: 'Revenue (₸)',
            messages: 'Messages',
            unread: 'Unread',
            details: '📈 Detailed Statistics',
            subscriptions: 'Subscriptions',
            payments: 'Payments',
            plusActive: 'Plus Active',
            days: 'days',
            cities: 'Cities',
            logs: 'Action Logs',
            onMap: 'On Map',
            manage: '⚙️ Management',
            allListings: '📋 All Listings',
            allUsers: '👥 Users',
            allSubs: '📬 Subscriptions',
            allPayments: '💳 Payments',
            actionLogs: '📜 Action Logs',
            map: '🗺️ Objects Map',
            clearAll: '🗑 Clear All Database',
            resetListings: '🔄 Reset Listings',
            export: '💾 Export Data',
            import: '📥 Import Data',
            usersTitle: 'Users',
            noSubs: 'No subscriptions yet',
            logsTitle: '📜 Action Logs',
            logsEmpty: 'Logs are empty',
            clearLogs: '🗑 Clear Logs',
            listingsTitle: 'All Listings',
            confirmDelete: 'Delete this listing forever?',
            deleted: 'Listing deleted',
            edit: '✏️ Edit',
            delete: '🗑 Delete',
            resetConfirm: '🗑 Reset ALL listings? Users and payments will remain.',
            resetSuccess: '✅ Listings reset',
            clearConfirm1: '⚠️ ARE YOU SURE? EVERYTHING will be deleted (listings, users, payments)!',
            clearConfirm2: 'Final confirmation — clear database?',
            exportSuccess: '✅ Data exported',
            importConfirm: '⚠️ Import data from',
            importWarning: '\n\nCurrent data will be REPLACED!',
            importSuccess: '✅ Data imported! Page will reload...',
            importError: '❌ Import error: invalid file format'
        },
        plus: {
            title: 'Krisha Plus',
            active: '✅ Krisha Plus Active (left',
            days: 'days)',
            selectTariff: 'Select Tariff',
            safe: 'Secure Payment • Instant Activation',
            month: 'month',
            months: 'months',
            discount: 'Discount',
            originalPrice: 'Regular Price',
            popular: 'Best Value',
            payment: 'Krisha Plus Payment',
            selectMethod: 'Select Payment Method',
            cardPayment: '💳 Credit Card Payment',
            cardNumber: 'Card Number',
            expiry: 'Expiry Date (MM/YY)',
            cvv: 'CVV',
            cardName: 'Cardholder Name',
            pay: 'Pay'
        },
        valuation: {
            title: 'Property Valuation',
            area: 'Area, m²',
            rooms: 'Number of Rooms',
            calculate: 'Calculate Value',
            result: 'Estimated Value'
        },
        subscription: {
            title: 'Subscribe to New Listings',
            anyCity: 'Any City',
            anyType: 'Sale or Rent',
            saleOnly: 'Sale Only',
            rentOnly: 'Rent Only',
            anyCategory: 'Any Category',
            priceFrom: 'Price From (₸)',
            priceTo: 'Price To (₸)',
            minRooms: 'Rooms (Minimum)',
            create: '✅ Create Subscription',
            mySubs: 'Your Active Subscriptions',
            noSubs: 'You have no active subscriptions'
        },
        history: {
            title: '📜 View History',
            noHistory: 'You haven\'t viewed any listings yet',
            clear: '🗑 Clear History',
            clearConfirm: '🗑 Clear view history?'
        },
        chat: {
            with: '💬 Chat with',
            placeholder: 'Enter message...',
            noMessages: '💬 Start a conversation with the seller\nMessages are stored only in this browser'
        },
        categories: {
            flat: 'Apartment',
            house: 'House / Cottage',
            room: 'Room',
            garage: 'Garage',
            land: 'Land Plot',
            commercial: 'Commercial',
            other: 'Other'
        },
        cities: {
            almaty: 'Almaty',
            astana: 'Astana',
            shymkent: 'Shymkent',
            semey: 'Semey'
        },
        messages: {
            loginRequired: '⚠️ Please login',
            fillFields: 'Fill in required fields',
            listingPublished: 'Listing published!',
            listingUpdated: 'Listing updated!',
            deleted: 'Deleted',
            saved: 'Saved',
            error: 'Error',
            success: 'Success',
            confirmDelete: 'Delete listing?',
            vipActivated: '✅ Listing is VIP for 7 days!',
            vipRemoved: '✅ VIP status removed',
            plusRequired: '⚠️ Feature available only with Krisha Plus'
        }
    }
};

// Функция перевода
function t(category, key, subkey = null) {
    const lang = translations[currentLang] || translations.ru;
    let result = lang[category]?.[key];
    
    if (subkey && result?.[subkey] !== undefined) {
        result = result[subkey];
    }
    
    return result || key;
}

// Применение переводов к странице
function applyTranslations() {
    // Элементы с data-translate
    document.querySelectorAll('[data-translate]').forEach(el => {
        const key = el.getAttribute('data-translate');
        const [category, subkey] = key.split('.');
        el.textContent = t(category, subkey);
    });
    
    // Элементы с data-translate-placeholder
    document.querySelectorAll('[data-translate-placeholder]').forEach(el => {
        const key = el.getAttribute('data-translate-placeholder');
        const [category, subkey] = key.split('.');
        el.placeholder = t(category, subkey);
    });
    
    // Навигация - вкладки
    const tabAll = document.getElementById('tabAll');
    const tabMy = document.getElementById('tabMy');
    const tabFav = document.getElementById('tabFav');
    const tabViewed = document.getElementById('tabViewed');
    
    if (tabAll) tabAll.textContent = t('nav', 'all');
    if (tabMy) tabMy.textContent = t('nav', 'my');
    if (tabFav) tabFav.textContent = t('nav', 'fav');
    if (tabViewed) tabViewed.textContent = t('nav', 'viewed');
    
    // Поиск и фильтры
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.placeholder = t('filters', 'search');
    
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.options[0].text = t('filters', 'sort', 'date');
        sortSelect.options[1].text = t('filters', 'sort', 'priceAsc');
        sortSelect.options[2].text = t('filters', 'sort', 'priceDesc');
        sortSelect.options[3].text = t('filters', 'sort', 'views');
    }
    
    // Кнопки фильтров - placeholder
    const filterCity = document.getElementById('filterCity');
    const filterType = document.getElementById('filterType');
    const filterCategory = document.getElementById('filterCategory');
    const filterPrice = document.getElementById('filterPrice');
    const filterOwners = document.getElementById('filterOwners');
    
    if (filterPrice) filterPrice.placeholder = t('filters', 'price');
    if (filterOwners) filterOwners.placeholder = t('filters', 'owners');
    
    // Обновляем опции select фильтров
    if (filterCity) {
        filterCity.options[0].text = t('filters', 'city');
    }
    if (filterType) {
        filterType.options[0].text = t('filters', 'type');
    }
    if (filterCategory) {
        filterCategory.options[0].text = t('filters', 'category');
    }
    
    // Кнопка подачи объявления
    const submitBtn = document.querySelector('button[onclick="checkAuthAndOpen()"]');
    if (submitBtn) submitBtn.innerHTML = `<i class="fas fa-plus"></i> ${t('filters', 'submit')}`;
    
    // Кнопки оценки, ипотеки и подписки
    document.querySelectorAll('button[onclick="openValuationModal()"]').forEach(btn => {
        btn.innerHTML = `<i class="fas fa-calculator"></i> ${t('buttons', 'valuation')}`;
    });
    document.querySelectorAll('button[onclick="openMortgageModal()"]').forEach(btn => {
        btn.innerHTML = `<i class="fas fa-home"></i> ${t('buttons', 'mortgage') || '🏦 Ипотека'}`;
    });
    document.querySelectorAll('button[onclick="openSubscriptionModal()"]').forEach(btn => {
        btn.innerHTML = `<i class="fas fa-bell"></i> ${t('buttons', 'subscription')}`;
    });
    
    // Обновляем заголовки модальных окон
    const authModalTitle = document.querySelector('#authModal h2');
    if (authModalTitle) authModalTitle.textContent = t('auth', 'title');
    
    // Обновляем кнопки в настройках
    const settingsBtn = document.querySelector('button[onclick="openSettingsModal()"]');
    if (settingsBtn) settingsBtn.innerHTML = '<i class="fas fa-cog"></i>';
    
    // Обновляем текст в админ-панели если она открыта
    if (document.getElementById('adminModal')?.style.display === 'flex') {
        const adminContent = document.getElementById('adminContent');
        if (adminContent && adminContent.innerHTML.includes('showAdminStats')) {
            showAdminStats();
        }
    }
    
    // Обновляем карточки объявлений
    render();
    
    // Обновляем авторизацию
    renderAuth();
    
    // Обновляем профиль если открыт
    if (document.getElementById('profileModal')?.style.display === 'flex') {
        openProfileModal();
    }
    
    // Обновляем плюс если открыт
    if (document.getElementById('plusModal')?.style.display === 'flex') {
        openPlusModal();
    }
    
    // Обновляем подписки если открыты
    if (document.getElementById('subscriptionModal')?.style.display === 'flex') {
        renderMySubscriptions();
    }
    
    // Обновляем ипотечный калькулятор если открыт
    if (document.getElementById('mortgageModal')?.style.display === 'flex') {
        // Перерисовка не требуется, значения пользовательские
    }
    
    // Обновляем оценку если открыта
    if (document.getElementById('valuationModal')?.style.display === 'flex') {
        // Перерисовка не требуется
    }
    
    // Обновляем чат если открыт
    if (document.getElementById('chatModal')?.style.display === 'flex') {
        openChatModal();
    }
    
    // Обновляем страницу заголовка
    document.title = `Krysha Pro — ${currentLang === 'ru' ? 'Недвижимость Казахстана' : currentLang === 'kk' ? 'Қазақстан Тасымалы' : 'Real Estate Kazakhstan'}`;
}

// Переключение языка
async function setLanguage(lang) {
    if (!translations[lang]) return;
    currentLang = lang;
    localStorage.setItem('krysha_lang', lang);
    
    // Сохраняем в GitHub если пользователь авторизован
    if (currentUser && typeof ghStorage !== 'undefined') {
        try {
            const settings = await ghStorage.getUserSettings(currentUser);
            await ghStorage.saveUserSettings(currentUser, { ...settings, language: lang });
        } catch (error) {
            console.error("Ошибка сохранения языка:", error);
        }
    }

    applyTranslations();
    showToast(`🌐 Language: ${lang.toUpperCase()}`, 'success');
}

// Переключение темы
async function setColorTheme(theme) {
    currentTheme = theme;
    localStorage.setItem('krysha_color_theme', theme);
    document.body.setAttribute('data-color-theme', theme);
    
    // Сохраняем в GitHub если пользователь авторизован
    if (currentUser && typeof ghStorage !== 'undefined') {
        try {
            const settings = await ghStorage.getUserSettings(currentUser);
            await ghStorage.saveUserSettings(currentUser, { ...settings, colorTheme: theme });
        } catch (error) {
            console.error("Ошибка сохранения темы:", error);
        }
    }
    
    // Обновляем активную кнопку
    document.querySelectorAll('.theme-color-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });
    
    showToast(`🎨 Theme: ${theme}`, 'success');
    applyTranslations();
}

// Применение темы
function applyTheme() {
    if (isDark) {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
    
    if (currentTheme && currentTheme !== 'default') {
        document.body.setAttribute('data-color-theme', currentTheme);
    }
    
    // Обновляем иконку темы
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
        themeBtn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        themeBtn.title = isDark ? 'Светлая тема' : 'Тёмная тема';
    }
}

// Открытие настроек
function openSettingsModal() {
    openModal('settingsModal');
    
    // Устанавливаем активные кнопки
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.style.background = btn.dataset.lang === currentLang 
            ? 'linear-gradient(135deg, #6366f1, #4f46e5)' 
            : '';
        btn.style.color = btn.dataset.lang === currentLang ? 'white' : '';
        btn.style.borderColor = btn.dataset.lang === currentLang ? 'transparent' : '';
    });
    
    document.querySelectorAll('.theme-color-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === currentTheme);
    });
}

// Быстрое переключение языка (для админки)
function cycleLanguage() {
    const langs = ['ru', 'kk', 'en'];
    const currentIndex = langs.indexOf(currentLang);
    const nextLang = langs[(currentIndex + 1) % langs.length];
    setLanguage(nextLang);
    showAdminStats();
}

// Применяем цветовую тему
if (currentTheme && currentTheme !== 'default') {
    document.body.setAttribute('data-color-theme', currentTheme);
}

// Применяем тёмную тему
if (isDark) document.body.classList.add('dark-theme');

function isPlusActiveNow() {
    if (!plusExpiryDate) return false;
    return new Date() < plusExpiryDate;
}

// ====================== ИНИЦИАЛИЗАЦИЯ БАЗЫ ======================
function initDatabase() {
    // Создаём только пользователя admin по умолчанию
    if (Object.keys(users).length === 0) {
        users = { "admin": "123456" };
        localStorage.setItem('krysha_u_users', JSON.stringify(users));
        console.log("✅ Пользователь admin создан");
    }
}

// Сброс пароля админа (для разработки)
function resetAdminPassword() {
    users["admin"] = "123456";
    localStorage.setItem('krysha_u_users', JSON.stringify(users));
    showToast("✅ Пароль админа сброшен: 123456", "success");
    document.getElementById('userNameInput').value = 'admin';
    document.getElementById('userPassInput').value = '123456';
}

// ====================== ТЕМА ======================
async function toggleTheme() {
    isDark = !isDark;
    document.body.classList.toggle('dark-theme', isDark);
    localStorage.setItem('krysha_theme', isDark ? 'dark' : 'light');
    
    // Сохраняем в GitHub если пользователь авторизован
    if (currentUser && typeof ghStorage !== 'undefined') {
        try {
            const settings = await ghStorage.getUserSettings(currentUser);
            await ghStorage.saveUserSettings(currentUser, { ...settings, theme: isDark ? 'dark' : 'light' });
        } catch (error) {
            console.error("Ошибка сохранения темы:", error);
        }
    }

    // Обновляем иконку
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
        themeBtn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        themeBtn.title = isDark ? 'Светлая тема' : 'Тёмная тема';
    }
}

// ====================== МОДАЛКИ ======================
function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.style.display = 'flex';

    // addFormModal закрывается только через крестик
    if (id === 'addFormModal') {
        modal.onclick = null;
    } else if (id !== 'detailModal') {
        modal.onclick = (e) => {
            if (e.target === modal) closeModal(id);
        };
    } else {
        modal.onclick = null;
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
}

document.addEventListener('keydown', (e) => {
    if (e.key === "Escape") {
        // addFormModal нельзя закрыть через Escape
        const activeModal = document.querySelector('.modal-overlay[style*="display: flex"]');
        if (activeModal && activeModal.id !== 'addFormModal') {
            closeModal(activeModal.id);
        }
    }
});

function showToast(text, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i> ${text}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// ====================== АВТОРИЗАЦИЯ ======================
function renderAuth() {
    const navAuth = document.getElementById('navAuth');
    if (!navAuth) return;

    let html = '';
    if (currentUser) {
        html = `<button onclick="openProfileModal()" class="btn-secondary" style="margin-right:8px;">👤 ${currentUser}</button>`;
        
        if (currentUser === 'admin') {
            html += `<button onclick="openAdminPanel()" class="btn-primary" style="margin-right:8px;">${t('nav', 'admin')}</button>`;
        }
        
        html += `<button onclick="openPlusModal()" class="btn-primary" style="margin-right:8px; background:#22c55e;">
            ${isPlusActiveNow() ? '✅ Plus' : t('nav', 'plus')}
        </button>`;
        
        html += `<button onclick="setMode('payments')" class="btn-secondary" style="margin-right:8px;">${t('nav', 'payments')}</button>`;
        html += `<button onclick="logout()" class="btn-secondary">${t('nav', 'logout')}</button>`;
    } else {
        html = `<button onclick="openModal('authModal')" class="btn-primary"><i class="fas fa-user"></i> ${t('nav', 'login')}</button>`;
    }
    navAuth.innerHTML = html;
}

function handleAuth() {
    const name = document.getElementById('userNameInput').value.trim();
    const pass = document.getElementById('userPassInput').value.trim();
    
    // Валидация
    if (!name || name.length < 3) {
        return showToast("Логин должен содержать минимум 3 символа", "error");
    }
    if (name.length > 20) {
        return showToast("Логин слишком длинный (макс. 20 символов)", "error");
    }
    if (!pass || !isValidPassword(pass)) {
        return showToast("Пароль должен содержать минимум 6 символов", "error");
    }
    
    // Проверка на специальные символы в логине
    if (!/^[a-zA-Zа-яА-Я0-9_]+$/.test(name)) {
        return showToast("Логин может содержать только буквы, цифры и _", "error");
    }

    if (users[name]) {
        if (users[name] === pass) {
            logAction('login', `User: ${name}`);
            loginSuccess(name);
        } else {
            showToast("Неверный пароль", "error");
            logAction('failed_login', `User: ${name}`);
        }
    } else {
        users[name] = pass;
        localStorage.setItem('krysha_u_users', JSON.stringify(users));
        logAction('register', `User: ${name}`);
        loginSuccess(name);
    }
}

function loginSuccess(name) {
    currentUser = name;
    localStorage.setItem('krysha_u_logged', name);
    closeModal('authModal');
    renderAuth();
    showToast(`Добро пожаловать, ${name}!`);
    render();
}

function logout() {
    if (confirm("Выйти из аккаунта?")) {
        currentUser = null;
        localStorage.removeItem('krysha_u_logged');
        renderAuth();
        render();
    }
}

// ====================== АДМИН-ПАНЕЛЬ ======================
function openAdminPanel() {
    if (currentUser !== 'admin') {
        return showToast("Доступ запрещён! Только для администратора.", "error");
    }
    openModal('adminModal');
    showAdminStats();
}

function showAdminStats() {
    const totalListings = items.length;
    const totalUsers = Object.keys(users).length;
    const totalSubs = subscriptions.length;
    const totalPayments = payments.length;
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalViews = items.reduce((sum, i) => sum + (i.views || 0), 0);
    const totalChats = chatMessages.length;
    const unreadChats = chatMessages.filter(m => !m.read).length;
    
    const activePlus = plusExpiryDate && new Date() < plusExpiryDate;
    const daysLeft = activePlus ? Math.ceil((plusExpiryDate - new Date()) / (1000*60*60*24)) : 0;

    const logs = JSON.parse(localStorage.getItem('krysha_action_logs')) || [];

    const currentLangName = currentLang === 'ru' ? '🇷🇺 RU' : currentLang === 'kk' ? '🇰🇿 KK' : '🇺🇸 EN';

    // Переводы для статистики
    const statsLabels = {
        listings: currentLang === 'ru' ? '📋 Объявлений' : currentLang === 'kk' ? '📋 Хабарламалар' : '📋 Listings',
        users: currentLang === 'ru' ? '👥 Пользователей' : currentLang === 'kk' ? '👥 Пайдаланушылар' : '👥 Users',
        views: currentLang === 'ru' ? '👁 Просмотров' : currentLang === 'kk' ? '👁 Көрулер' : '👁 Views',
        revenue: currentLang === 'ru' ? '💰 Доход (₸)' : currentLang === 'kk' ? '💰 Кіріс (₸)' : '💰 Revenue (₸)',
        messages: currentLang === 'ru' ? '💬 Сообщений' : currentLang === 'kk' ? '💬 Хабарламалар' : '💬 Messages',
        unread: currentLang === 'ru' ? '🔔 Непрочитанных' : currentLang === 'kk' ? '🔔 Оқылмаған' : '🔔 Unread',
        detailTitle: currentLang === 'ru' ? '📈 Детальная статистика' : currentLang === 'kk' ? '📈 Егжей-тегжейлі статистика' : '📈 Detailed Statistics',
        subsLabel: currentLang === 'ru' ? '📬 Подписки' : currentLang === 'kk' ? '📬 Жазылымдар' : '📬 Subscriptions',
        paymentsLabel: currentLang === 'ru' ? '💳 Платежей' : currentLang === 'kk' ? '💳 Төлемдер' : '💳 Payments',
        plusLabel: currentLang === 'ru' ? '⭐ Plus активен' : currentLang === 'kk' ? '⭐ Plus активті' : '⭐ Plus Active',
        days: currentLang === 'ru' ? 'дн.' : currentLang === 'kk' ? 'күн' : 'days',
        citiesLabel: currentLang === 'ru' ? '🏙 Городов' : currentLang === 'kk' ? '🏙 Қалалар' : '🏙 Cities',
        logsLabel: currentLang === 'ru' ? '📝 Логи действий' : currentLang === 'kk' ? '📝 Әрекеттер журналы' : '📝 Action Logs',
        mapLabel: currentLang === 'ru' ? '🗺️ На карте' : currentLang === 'kk' ? '🗺️ Картада' : '🗺️ On Map',
        manageTitle: currentLang === 'ru' ? '⚙️ Управление' : currentLang === 'kk' ? '⚙️ Басқару' : '⚙️ Management',
        allListings: currentLang === 'ru' ? '📋 Все объявления' : currentLang === 'kk' ? '📋 Барлық хабарламалар' : '📋 All Listings',
        allUsers: currentLang === 'ru' ? '👥 Пользователи' : currentLang === 'kk' ? '👥 Пайдаланушылар' : '👥 Users',
        allSubs: currentLang === 'ru' ? '📬 Подписки' : currentLang === 'kk' ? '📬 Жазылымдар' : '📬 Subscriptions',
        allPayments: currentLang === 'ru' ? '💳 Платежи' : currentLang === 'kk' ? '💳 Төлемдер' : '💳 Payments',
        actionLogs: currentLang === 'ru' ? '📜 Логи действий' : currentLang === 'kk' ? '📜 Әрекеттер журналы' : '📜 Action Logs',
        mapObjects: currentLang === 'ru' ? '🗺️ Карта объектов' : currentLang === 'kk' ? '🗺️ Объектілер картасы' : '🗺️ Objects Map',
        clearAll: currentLang === 'ru' ? '🗑 Очистить всю базу' : currentLang === 'kk' ? '🗑 Барлық базаны тазалау' : '🗑 Clear All Database',
        resetListings: currentLang === 'ru' ? '🔄 Сбросить объявления' : currentLang === 'kk' ? '🔄 Хабарламаларды қалпына келтіру' : '🔄 Reset Listings',
        export: currentLang === 'ru' ? '💾 Экспорт данных' : currentLang === 'kk' ? '💾 Деректерді экспорт' : '💾 Export Data',
        import: currentLang === 'ru' ? '📥 Импорт данных' : currentLang === 'kk' ? '📥 Деректерді импорт' : '📥 Import Data'
    };

    const html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h3 style="text-align:center; flex:1;">${t('admin', 'stats')}</h3>
            <button onclick="cycleLanguage()" class="btn-secondary" style="padding:8px 14px; font-size:13px;">
                🌐 ${currentLangName}
            </button>
        </div>
        
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; padding:15px; background:linear-gradient(135deg, #6366f1, #4f46e5); border-radius:12px; color:white;">
            <div>
                <h4 style="margin:0 0 8px 0;">📊 Общая статистика</h4>
                <p style="margin:0; opacity:0.9; font-size:13px;">Просмотрите сводные данные и управляйте платформой</p>
            </div>
            <button onclick="showAdminStats()" class="btn-secondary" style="background:white; color:#6366f1; padding:10px 20px; font-weight:600;">
                <i class="fas fa-arrow-left"></i> Назад к статистике
            </button>
        </div>
        
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:15px; margin-bottom:30px;">
            <div style="background:linear-gradient(135deg, #6366f1, #4f46e5); color:white; padding:20px; border-radius:16px; text-align:center;">
                <div style="font-size:32px; font-weight:700;">${totalListings}</div>
                <div style="opacity:0.9; font-size:13px;">${statsLabels.listings}</div>
            </div>
            <div style="background:linear-gradient(135deg, #22c55e, #16a34a); color:white; padding:20px; border-radius:16px; text-align:center;">
                <div style="font-size:32px; font-weight:700;">${totalUsers}</div>
                <div style="opacity:0.9; font-size:13px;">${statsLabels.users}</div>
            </div>
            <div style="background:linear-gradient(135deg, #f59e0b, #d97706); color:white; padding:20px; border-radius:16px; text-align:center;">
                <div style="font-size:32px; font-weight:700;">${totalViews}</div>
                <div style="opacity:0.9; font-size:13px;">${statsLabels.views}</div>
            </div>
            <div style="background:linear-gradient(135deg, #06b6d4, #0891b2); color:white; padding:20px; border-radius:16px; text-align:center;">
                <div style="font-size:32px; font-weight:700;">${totalRevenue.toLocaleString()}</div>
                <div style="opacity:0.9; font-size:13px;">${statsLabels.revenue}</div>
            </div>
            <div style="background:linear-gradient(135deg, #ec4899, #db2777); color:white; padding:20px; border-radius:16px; text-align:center;">
                <div style="font-size:32px; font-weight:700;">${totalChats}</div>
                <div style="opacity:0.9; font-size:13px;">${statsLabels.messages}</div>
            </div>
            <div style="background:linear-gradient(135deg, #8b5cf6, #7c3aed); color:white; padding:20px; border-radius:16px; text-align:center;">
                <div style="font-size:32px; font-weight:700;">${unreadChats}</div>
                <div style="opacity:0.9; font-size:13px;">${statsLabels.unread}</div>
            </div>
        </div>
        
        <div style="background:var(--card-bg); padding:20px; border-radius:16px; margin-bottom:25px; border:1px solid var(--border);">
            <h4 style="margin-bottom:15px;">${statsLabels.detailTitle}</h4>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:12px;">
                <div><strong>${statsLabels.subsLabel}:</strong> ${totalSubs}</div>
                <div><strong>${statsLabels.paymentsLabel}:</strong> ${totalPayments}</div>
                <div><strong>${statsLabels.plusLabel}:</strong> ${activePlus ? `✅ (${daysLeft} ${statsLabels.days})` : '❌'}</div>
                <div><strong>${statsLabels.citiesLabel}:</strong> ${[...new Set(items.map(i => i.city))].length}</div>
                <div><strong>${statsLabels.logsLabel}:</strong> ${logs.length}</div>
                <div><strong>${statsLabels.mapLabel}:</strong> ${items.filter(i => i.latitude && i.longitude).length}</div>
            </div>
        </div>
        
        <h4 style="margin-bottom:15px;">${statsLabels.manageTitle}</h4>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:15px;">
            <button onclick="showAdminAllListings()" class="btn-primary">${statsLabels.allListings}</button>
            <button onclick="showAdminUsers()" class="btn-primary">${statsLabels.allUsers}</button>
            <button onclick="showAdminSubscriptions()" class="btn-primary">${statsLabels.allSubs}</button>
            <button onclick="showAdminPayments()" class="btn-primary">${statsLabels.allPayments}</button>
            <button onclick="showAdminLogs()" class="btn-primary">${statsLabels.actionLogs}</button>
            <button onclick="showAllListingsOnMap()" class="btn-primary">${statsLabels.mapObjects}</button>
            <button onclick="clearAllData()" class="btn-danger" style="background:#ef4444;">${statsLabels.clearAll}</button>
            <button onclick="resetListings()" class="btn-secondary" style="background:#f59e0b;">${statsLabels.resetListings}</button>
            <button onclick="exportData()" class="btn-secondary" style="background:#0891b2;">${statsLabels.export}</button>
            <button onclick="document.getElementById('importFile').click()" class="btn-secondary" style="background:#7c3aed;">${statsLabels.import}</button>
            <input type="file" id="importFile" accept=".json" style="display:none;" onchange="importData(event)">
        </div>
    `;
    document.getElementById('adminContent').innerHTML = html;
}

function showAdminUsers() {
    const usersTitle = currentLang === 'ru' ? `Пользователи (${Object.keys(users).length})` : currentLang === 'kk' ? `Пайдаланушылар (${Object.keys(users).length})` : `Users (${Object.keys(users).length})`;
    
    let html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h3 style="color:#f1f5f9;">${usersTitle}</h3>
            <button onclick="showAdminStats()" class="btn-secondary" style="background:#4b5563; color:white; padding:10px 18px;">
                <i class="fas fa-arrow-left"></i> Назад
            </button>
        </div>
        <div style="background:#1e2937; padding:15px; border-radius:12px;">
    `;
    Object.keys(users).forEach(user => {
        html += `<p style="color:#f1f5f9;"><strong>${user}</strong></p>`;
    });
    html += `</div>`;
    document.getElementById('adminContent').innerHTML = html;
}

function showAdminSubscriptions() {
    const subsTitle = currentLang === 'ru' ? `Все подписки (${subscriptions.length})` : currentLang === 'kk' ? `Барлық жазылымдар (${subscriptions.length})` : `All Subscriptions (${subscriptions.length})`;
    const noSubs = currentLang === 'ru' ? 'Подписок пока нет' : currentLang === 'kk' ? 'Жазылымдар әлі жоқ' : 'No subscriptions yet';
    
    let html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h3 style="color:#f1f5f9;">${subsTitle}</h3>
            <button onclick="showAdminStats()" class="btn-secondary" style="background:#4b5563; color:white; padding:10px 18px;">
                <i class="fas fa-arrow-left"></i> Назад
            </button>
        </div>
    `;
    if (subscriptions.length === 0) {
        html += `<p style="color:#cbd5e1;">${noSubs}</p>`;
    } else {
        html += `<div style="background:#1e2937; padding:15px; border-radius:12px;">`;
        subscriptions.forEach(sub => {
            html += `<p style="color:#f1f5f9;"><strong>${sub.user}</strong> — ${sub.city} | ${sub.type}</p>`;
        });
        html += `</div>`;
    }
    document.getElementById('adminContent').innerHTML = html;
}

function showAdminPayments() {
    const paymentsTitle = currentLang === 'ru' ? `💳 Платежи (${payments.length})` : currentLang === 'kk' ? `💳 Төлемдер (${payments.length})` : `💳 Payments (${payments.length})`;
    
    const html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h3 style="color:#f1f5f9;">${paymentsTitle}</h3>
            <button onclick="showAdminStats()" class="btn-secondary" style="background:#4b5563; color:white; padding:10px 18px;">
                <i class="fas fa-arrow-left"></i> Назад
            </button>
        </div>
    `;
    document.getElementById('adminContent').innerHTML = html;
    renderPaymentsHistoryAdmin();
}

function renderPaymentsHistoryAdmin() {
    let html = '<div style="background:#1e2937; padding:15px; border-radius:12px;">';
    
    if (payments.length === 0) {
        html += `<p style="color:#cbd5e1; text-align:center; padding:40px;">${currentLang === 'ru' ? 'Платежей пока нет' : currentLang === 'kk' ? 'Төлемдер әлі жоқ' : 'No payments yet'}</p>`;
    } else {
        payments.forEach(p => {
            const date = new Date(p.date).toLocaleDateString('ru-RU', { 
                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
            });
            html += `
                <div style="padding:12px; border-bottom:1px solid #334155; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <strong style="color:#f1f5f9;">${p.months} ${p.months === 1 ? 'месяц' : 'месяца'} Krisha Plus</strong><br>
                        <small style="color:#94a3b8;">${date} • ${p.method} • ${p.user}</small>
                    </div>
                    <div style="font-size:18px; font-weight:700; color:#22c55e;">${p.amount.toLocaleString()} ₸</div>
                </div>
            `;
        });
    }
    html += '</div>';
    document.getElementById('adminContent').innerHTML += html;
}

function showAdminLogs() {
    const logs = JSON.parse(localStorage.getItem('krysha_action_logs')) || [];
    
    const logsTitle = currentLang === 'ru' ? `📜 Логи действий (${logs.length})` : currentLang === 'kk' ? `📜 Әрекеттер журналы (${logs.length})` : `📜 Action Logs (${logs.length})`;
    const logsEmpty = currentLang === 'ru' ? 'Логи пока пустые' : currentLang === 'kk' ? 'Журнал бос' : 'Logs are empty';
    const clearLogs = currentLang === 'ru' ? '🗑 Очистить логи' : currentLang === 'kk' ? '🗑 Журналды тазалау' : '🗑 Clear Logs';
    
    let html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h3 style="color:#f1f5f9;">${logsTitle}</h3>
            <button onclick="showAdminStats()" class="btn-secondary" style="background:#4b5563; color:white; padding:10px 18px;">
                <i class="fas fa-arrow-left"></i> Назад
            </button>
        </div>
    `;
    
    if (logs.length === 0) {
        html += `<p style="color:#cbd5e1; text-align:center; padding:40px;">${logsEmpty}</p>`;
    } else {
        html += `<div style="max-height:500px; overflow-y:auto; background:#1e2937; padding:15px; border-radius:12px; margin-top:15px;">`;
        logs.slice(0, 100).forEach(log => {
            const time = new Date(log.timestamp).toLocaleString('ru-RU');
            html += `
                <div style="padding:10px; border-bottom:1px solid #334155; font-family:monospace; font-size:13px; color:#e2e8f0;">
                    <span style="color:#22c55e;">[${time}]</span>
                    <span style="color:#60a5fa; margin:0 8px;">${log.user}</span>
                    <span style="color:#f59e0b;">${log.action}</span>
                    ${log.details ? `<span style="color:#94a3b8;">— ${log.details}</span>` : ''}
                </div>
            `;
        });
        html += `</div>`;
        html += `<button onclick="localStorage.removeItem('krysha_action_logs'); showAdminLogs();" class="btn-secondary" style="margin-top:15px;">${clearLogs}</button>`;
    }
    
    document.getElementById('adminContent').innerHTML = html;
}

function clearAllData() {
    const confirm1 = currentLang === 'ru' ? '⚠️ ВЫ УВЕРЕНЫ? Будет удалено ВСЁ (объявления, пользователи, платежи)!' : currentLang === 'kk' ? '⚠️ СІЗ СЕНІМДІСІЗ БЕ? БӘРІ жойылады (хабарламалар, пайдаланушылар, төлемдер)!' : '⚠️ ARE YOU SURE? EVERYTHING will be deleted (listings, users, payments)!';
    const confirm2 = currentLang === 'ru' ? 'Последнее подтверждение — очистить базу?' : currentLang === 'kk' ? 'Соңғы растау — базаны тазалау?' : 'Final confirmation — clear database?';
    
    if (confirm(confirm1)) {
        if (confirm(confirm2)) {
            localStorage.clear();
            location.reload();
        }
    }
}

function resetListings() {
    const confirmMsg = currentLang === 'ru' ? '🗑 Сбросить ВСЕ объявления? Пользователи и платежи останутся.' : currentLang === 'kk' ? '🗑 Барлық хабарламаларды қалпына келтіру? Пайдаланушылар мен төлемдер сақталады.' : '🗑 Reset ALL listings? Users and payments will remain.';
    const successMsg = currentLang === 'ru' ? '✅ Объявления сброшены' : currentLang === 'kk' ? '✅ Хабарламалар қалпына келтірілді' : '✅ Listings reset';
    
    if (confirm(confirmMsg)) {
        localStorage.removeItem('krysha_u_db');
        items = [];
        showToast(successMsg, "success");
        showAdminStats();
    }
}

// ====================== ЭКСПОРТ / ИМПОРТ ДАННЫХ ======================
function exportData() {
    const data = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        items: items,
        users: users,
        subscriptions: subscriptions,
        payments: payments,
        plusExpiry: plusExpiryDate ? plusExpiryDate.toISOString() : null
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `krysha_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    const exportMsg = currentLang === 'ru' ? '✅ Данные экспортированы' : currentLang === 'kk' ? '✅ Деректер экспортталды' : '✅ Data exported';
    showToast(exportMsg, "success");
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const importConfirm = currentLang === 'ru' ? '⚠️ Импорт данных из' : currentLang === 'kk' ? '⚠️ Деректерді импорттау' : '⚠️ Import data from';
    const importWarning = currentLang === 'ru' ? '\n\nТекущие данные будут ЗАМЕНЕНЫ!' : currentLang === 'kk' ? '\n\nАғымдағы деректер АУЫСТЫРЫЛАДЫ!' : '\n\nCurrent data will be REPLACED!';
    const importSuccess = currentLang === 'ru' ? '✅ Данные импортированы! Страница перезагрузится...' : currentLang === 'kk' ? '✅ Деректер импортталды! Парақ жүктеледі...' : '✅ Data imported! Page will reload...';
    const importError = currentLang === 'ru' ? '❌ Ошибка импорта: неверный формат файла' : currentLang === 'kk' ? '❌ Импорт қатесі: дұрыс емес файл пішімі' : '❌ Import error: invalid file format';
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (!confirm(`${importConfirm} ${data.exportDate || 'неизвестно'}?${importWarning}`)) {
                return;
            }
            
            if (data.items) {
                items = data.items;
                localStorage.setItem('krysha_u_db', JSON.stringify(items));
            }
            if (data.users) {
                users = data.users;
                localStorage.setItem('krysha_u_users', JSON.stringify(users));
            }
            if (data.subscriptions) {
                subscriptions = data.subscriptions;
                localStorage.setItem('krysha_subscriptions', JSON.stringify(subscriptions));
            }
            if (data.payments) {
                payments = data.payments;
                localStorage.setItem('krysha_payments', JSON.stringify(payments));
            }
            if (data.plusExpiry) {
                plusExpiryDate = new Date(data.plusExpiry);
                localStorage.setItem('krysha_plus_expiry', data.plusExpiry);
            }
            
            showToast(importSuccess, "success");
            setTimeout(() => location.reload(), 1500);
            
        } catch (err) {
            console.error('Ошибка импорта:', err);
            showToast(importError, "error");
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function showAdminAllListings() {
    const listingsTitle = currentLang === 'ru' ? `Все объявления (${items.length})` : currentLang === 'kk' ? `Барлық хабарламалар (${items.length})` : `All Listings (${items.length})`;
    const editBtn = currentLang === 'ru' ? '✏️ Редактировать' : currentLang === 'kk' ? '✏️ Өңдеу' : '✏️ Edit';
    const deleteBtn = currentLang === 'ru' ? '🗑 Удалить' : currentLang === 'kk' ? '🗑 Жою' : '🗑 Delete';
    const confirmDelete = currentLang === 'ru' ? 'Удалить это объявление навсегда?' : currentLang === 'kk' ? 'Бұл хабарламаны мәңгіге жою?' : 'Delete this listing forever?';
    const deletedMsg = currentLang === 'ru' ? 'Объявление удалено' : currentLang === 'kk' ? 'Хабарлама жойылды' : 'Listing deleted';
    
    let html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h3 style="color:#f1f5f9;">${listingsTitle}</h3>
            <button onclick="showAdminStats()" class="btn-secondary" style="background:#4b5563; color:white; padding:10px 18px;">
                <i class="fas fa-arrow-left"></i> Назад
            </button>
        </div>
        <div class="listings-grid">
    `;

    items.forEach(item => {
        const typeLabel = item.type === 'rent' ? (currentLang === 'ru' ? 'Аренда' : currentLang === 'kk' ? 'Жалдау' : 'Rent') : (currentLang === 'ru' ? 'Продажа' : currentLang === 'kk' ? 'Сату' : 'Sale');
        html += `
            <div class="card">
                <img src="${item.images[0]}" alt="${item.title}">
                <div class="category-tag">${item.category} • ${typeLabel}</div>
                <div class="card-body">
                    <div class="card-price">${item.price.toLocaleString()} ₸</div>
                    <h3>${item.title}</h3>
                    <p>${item.city} | ${currentLang === 'ru' ? 'Автор' : currentLang === 'kk' ? 'Авторы' : 'Author'}: <strong>${item.author}</strong></p>
                </div>
                <div style="padding:12px; display:flex; gap:8px;">
                    <button onclick="adminEditListing(${item.id});" class="btn-secondary" style="flex:1;">${editBtn}</button>
                    <button onclick="adminDeleteListing(${item.id}, '${confirmDelete}', '${deletedMsg}');" class="btn-danger" style="flex:1;">${deleteBtn}</button>
                </div>
            </div>`;
    });

    html += `</div>`;
    document.getElementById('adminContent').innerHTML = html;
}

async function adminDeleteListing(id, confirmMsg, successMsg) {
    if (confirm(confirmMsg || "Удалить это объявление навсегда?")) {
        await deleteListingFromFirebase(id);
        showAdminAllListings();
    }
}

function adminEditListing(id) {
    closeModal('adminModal');
    setTimeout(() => {
        openEditModal(id);
    }, 300);
}

// Быстрое переключение языка (для админки)
function cycleLanguage() {
    const langs = ['ru', 'kk', 'en'];
    const currentIndex = langs.indexOf(currentLang);
    const nextLang = langs[(currentIndex + 1) % langs.length];
    setLanguage(nextLang);
    setTimeout(() => {
        showAdminStats();
    }, 100);
}

// ====================== VIP ОБЪЯВЛЕНИЯ ======================
async function makeListingVIP(id) {
    if (!isPlusActiveNow()) {
        showToast("⚠️ Функция доступна только с Krisha Plus", "error");
        openPlusModal();
        return;
    }
    
    const item = items.find(i => i.id === id);
    if (!item) return;
    
    const vipUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    
    try {
        await db.collection("listings").doc(String(id)).update({
            isVIP: true,
            vipUntil: vipUntil,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        // Обновляем локально
        const localItem = items.find(i => i.id === id);
        if (localItem) {
            localItem.isVIP = true;
            localItem.vipUntil = vipUntil;
        }
        showToast("✅ Объявление стало VIP на 7 дней!", "success");
        render();
    } catch (error) {
        console.error("Ошибка VIP:", error);
        showToast("Ошибка при активации VIP", "error");
    }
}
    
async function removeListingVIP(id) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    
    try {
        await db.collection("listings").doc(String(id)).update({
            isVIP: false,
            vipUntil: null,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        // Обновляем локально
        const localItem = items.find(i => i.id === id);
        if (localItem) {
            localItem.isVIP = false;
            localItem.vipUntil = null;
        }
        showToast("✅ VIP статус снят", "success");
        render();
    } catch (error) {
        console.error("Ошибка снятия VIP:", error);
        showToast("Ошибка при снятии VIP", "error");
    }
}
    
// Проверка и очистка просроченных VIP
async function checkVIPExpiry() {
    const now = new Date();
    
    for (const item of items) {
        if (item.isVIP && item.vipUntil && new Date(item.vipUntil) < now) {
            item.isVIP = false;
            item.vipUntil = null;
            try {
                await db.collection("listings").doc(String(item.id)).update({
                    isVIP: false,
                    vipUntil: null
                });
            } catch (e) {
                console.error("Ошибка обновления VIP:", e);
            }
        }
    }
}

// ====================== KRY SHA PLUS ======================
function openPlusModal() {
    const currentActive = isPlusActiveNow();
    let activeInfo = '';
    if (currentActive) {
        const daysLeft = Math.ceil((plusExpiryDate - new Date()) / (1000*60*60*24));
        activeInfo = `<p style="text-align:center; color:#22c55e; margin:15px 0; font-size:16px;">✅ Krisha Plus активен (осталось ${daysLeft} дней)</p>`;
    }

    const html = `
        <h2 style="text-align:center; margin-bottom:10px;">Krisha Plus</h2>
        ${activeInfo}
        <h3 style="text-align:center; margin:20px 0 25px; color:#a5b4fc;">Выберите тариф</h3>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:16px; margin-bottom:30px;" id="tariffCards"></div>
        <p style="text-align:center; color:#94a3b8; font-size:14px;">Оплата безопасная • Активация сразу после оплаты</p>
    `;
    
    document.getElementById('plusContent').innerHTML = html;
    openModal('plusModal');
    renderTariffCards();
}

function renderTariffCards() {
    const container = document.getElementById('tariffCards');
    if (!container) return;

    const tariffs = [
        { months: 1, price: 990, discount: 0 },
        { months: 3, price: 2790, discount: 8, popular: true },
        { months: 12, price: 8900, discount: 25 }
    ];

    let html = '';
    tariffs.forEach(t => {
        const original = t.months * 990;
        const savings = original - t.price;
        html += `
            <div class="tariff-card ${t.popular ? 'popular' : ''}" onclick="selectTariff(${t.months}, ${t.price})">
                ${t.popular ? '<div class="popular-badge">Самый выгодный</div>' : ''}
                <h3>${t.months} ${t.months === 1 ? 'месяц' : 'месяца'}</h3>
                <div class="price">${t.price.toLocaleString()} ₸</div>
                ${t.discount > 0 ? `<div class="discount">Скидка ${t.discount}% (-${savings} ₸)</div>` : ''}
                <small>Обычная цена: ${original.toLocaleString()} ₸</small>
            </div>
        `;
    });
    container.innerHTML = html;
}

function selectTariff(months, price) {
    closeModal('plusModal');
    
    const html = `
        <h2 style="text-align:center; margin-bottom:20px;">Оплата Krisha Plus</h2>
        <p style="text-align:center; font-size:18px; margin-bottom:25px;">
            ${months} ${months === 1 ? 'месяц' : 'месяца'} — <strong>${price.toLocaleString()} ₸</strong>
        </p>
        <h4 style="margin:20px 0 12px; color:#e0e7ff;">Выберите способ оплаты:</h4>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap:12px;">
            <button onclick="processPlusPayment(${months}, ${price}, 'kaspi')" class="payment-btn">Kaspi Pay</button>
            <button onclick="processPlusPayment(${months}, ${price}, 'halyk')" class="payment-btn">Halyk Pay</button>
            <button onclick="processPlusPayment(${months}, ${price}, 'card')" class="payment-btn">💳 Банковская карта</button>
            <button onclick="processPlusPayment(${months}, ${price}, 'sbp')" class="payment-btn">СБП / QR</button>
        </div>
    `;

    document.getElementById('plusContent').innerHTML = html;
    openModal('plusModal');
}

function processPlusPayment(months, price, method) {
    if (method === 'card') {
        showCardPaymentForm(months, price);
    } else {
        const methodName = method === 'kaspi' ? 'Kaspi Pay' : method === 'halyk' ? 'Halyk Pay' : 'СБП';
        if (confirm(`Оплатить ${price.toLocaleString()} ₸ через ${methodName}?`)) {
            completePayment(months, price, methodName);
        }
    }
}

// ====================== ФОРМА ОПЛАТЫ КАРТОЙ ======================
function showCardPaymentForm(months, price) {
    const html = `
        <h2 style="text-align:center; margin-bottom:15px;">💳 Оплата банковской картой</h2>
        <p style="text-align:center; font-size:18px; margin-bottom:25px;">
            ${months} ${months === 1 ? 'месяц' : 'месяца'} — <strong>${price.toLocaleString()} ₸</strong>
        </p>
        
        <div style="background:#1e2937; padding:25px; border-radius:16px;">
            <label style="color:#f1f5f9;">Номер карты</label>
            <input type="text" id="cardNumber" maxlength="19" placeholder="1234 5678 9012 3456" 
                   oninput="formatCardNumber(this)" style="width:100%; padding:12px; margin:8px 0 15px; border-radius:8px; background:#0f172a; border:1px solid #334155; color:#f1f5f9;">

            <div style="display:flex; gap:15px;">
                <div style="flex:1;">
                    <label style="color:#f1f5f9;">Срок действия (MM/YY)</label>
                    <input type="text" id="cardExpiry" maxlength="5" placeholder="12/28" 
                           oninput="formatExpiry(this)" style="width:100%; padding:12px; margin:8px 0 15px; border-radius:8px; background:#0f172a; border:1px solid #334155; color:#f1f5f9;">
                </div>
                <div style="flex:1;">
                    <label style="color:#f1f5f9;">CVV</label>
                    <input type="text" id="cardCVV" maxlength="4" placeholder="123" 
                           oninput="this.value = this.value.replace(/\\D/g,'')" 
                           style="width:100%; padding:12px; margin:8px 0 15px; border-radius:8px; background:#0f172a; border:1px solid #334155; color:#f1f5f9;">
                </div>
            </div>
            
            <label style="color:#f1f5f9;">Имя владельца карты</label>
            <input type="text" id="cardName" placeholder="ИВАН ИВАНОВ" 
                   style="width:100%; padding:12px; margin:8px 0 20px; border-radius:8px; background:#0f172a; border:1px solid #334155; color:#f1f5f9; text-transform:uppercase;">
            
            <button onclick="processCardPayment(${months}, ${price})" 
                    style="width:100%; padding:16px; background:#22c55e; color:#000; font-weight:600; border:none; border-radius:12px; font-size:17px;">
                Оплатить ${price.toLocaleString()} ₸
            </button>
        </div>
    `;

    document.getElementById('plusContent').innerHTML = html;
    openModal('plusModal');
}

function formatCardNumber(input) {
    let value = input.value.replace(/\D/g, '').substring(0, 16);
    input.value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatExpiry(input) {
    let value = input.value.replace(/\D/g, '').substring(0, 4);
    if (value.length > 2) {
        input.value = value.slice(0,2) + '/' + value.slice(2);
    } else {
        input.value = value;
    }
}

function processCardPayment(months, price) {
    const cardNumber = document.getElementById('cardNumber').value.trim().replace(/\s/g, '');
    const expiry = document.getElementById('cardExpiry').value.trim();
    const cvv = document.getElementById('cardCVV').value.trim();
    const name = document.getElementById('cardName').value.trim();

    if (cardNumber.length !== 16) return showToast("Номер карты должен содержать 16 цифр", "error");
    if (!expiry || !cvv || !name) return showToast("Заполните все поля", "error");
    if (cvv.length < 3) return showToast("CVV должен содержать 3 или 4 цифры", "error");

    const btn = event.currentTarget;
    btn.innerHTML = 'Обработка...';
    btn.disabled = true;

    setTimeout(() => {
        completePayment(months, price, "Банковской картой");
    }, 1600);
}

async function completePayment(months, price, methodName) {
    const now = new Date();
    if (plusExpiryDate && plusExpiryDate > now) {
        plusExpiryDate = new Date(plusExpiryDate.getTime() + months * 30 * 86400000);
    } else {
        plusExpiryDate = new Date(now.getTime() + months * 30 * 86400000);
    }

    localStorage.setItem('krysha_plus_expiry', plusExpiryDate.toISOString());

    const payment = {
        id: Date.now(),
        date: new Date().toISOString(),
        amount: price,
        months: months,
        method: methodName,
        user: currentUser,
        status: "success"
    };

    payments.unshift(payment);
    localStorage.setItem('krysha_payments', JSON.stringify(payments));

    closeModal('plusModal');
    showToast(`✅ Оплата прошла успешно!`, "success");
    renderAuth();
    if (currentMode === 'payments') renderPaymentsHistory();
}

// ====================== ИСТОРИЯ ПЛАТЕЖЕЙ ======================
function renderPaymentsHistory() {
    const grid = document.getElementById('listingsGrid');
    if (!grid) return;

    grid.innerHTML = `<h2 style="grid-column:1/-1; margin-bottom:20px;">💳 История платежей</h2>`;

    let filteredPayments = payments;

    if (currentUser !== 'admin') {
        filteredPayments = payments.filter(p => p.user === currentUser);
    }

    if (filteredPayments.length === 0) {
        grid.innerHTML += `<p style="grid-column:1/-1; text-align:center; padding:100px 20px; color:#64748b;">
            ${currentUser === 'admin' ? 'Пока нет платежей' : 'У вас пока нет платежей'}
        </p>`;
        return;
    }

    let html = '<div style="grid-column:1/-1;">';
    filteredPayments.forEach(p => {
        const date = new Date(p.date).toLocaleDateString('ru-RU', { 
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
        });
        html += `
            <div style="background:var(--card-bg); border:1px solid var(--border); border-radius:16px; padding:18px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <strong>${p.months} ${p.months === 1 ? 'месяц' : 'месяца'} Krisha Plus</strong><br>
                    <small>${date} • ${p.method}</small>
                    ${currentUser === 'admin' ? `<br><small style="color:#94a3b8;">Пользователь: ${p.user || 'Неизвестно'}</small>` : ''}
                </div>
                <div style="text-align:right;">
                    <div style="font-size:21px; font-weight:700; color:#22c55e;">${p.amount.toLocaleString()} ₸</div>
                    <span style="color:#22c55e;">✓ Оплачено</span>
                </div>
            </div>`;
    });
    html += '</div>';
    grid.innerHTML += html;
}

// ====================== Остальные функции (без изменений) ======================
function openAddModal() {
    document.getElementById('modalFormTitle').innerText = "Новое объявление";
    document.getElementById('editItemId').value = "";
    resetAddForm();
    openModal('addFormModal');
    initImageUpload();
    
    setTimeout(() => {
        initMap();
        setupAddressListeners();
    }, 700);
}

function openEditModal(id) {
    const item = items.find(i => i.id == id || i.id === id);
    if (!item) return showToast("Объявление не найдено", "error");

    document.getElementById('modalFormTitle').innerText = "Редактировать объявление";
    document.getElementById('editItemId').value = item.id;

    document.getElementById('addType').value = item.type || "sale";
    document.getElementById('addCategory').value = item.category || "";
    document.getElementById('addTitle').value = item.title || "";
    document.getElementById('addPrice').value = item.price || "";
    document.getElementById('addCity').value = item.city || "Алматы";
    document.getElementById('addDescription').value = item.description || "";
    document.getElementById('addOwners').value = item.owners || 1;

    currentImages = item.images ? [...item.images] : [];
    renderImagePreview();

    openModal('addFormModal');
    initImageUpload();
    
    setTimeout(() => {
        initMap();
        setupAddressListeners();
    }, 700);
}

function resetAddForm() {
    document.getElementById('addType').value = "sale";
    document.getElementById('addCategory').value = "";
    document.getElementById('addTitle').value = "";
    document.getElementById('addPrice').value = "";
    document.getElementById('addDescription').value = "";
    document.getElementById('addOwners').value = 1;
    currentImages = [];
    
    const preview = document.getElementById('imagePreview');
    if (preview) preview.innerHTML = '';

    document.getElementById('latitude').value = '';
    document.getElementById('longitude').value = '';
}

async function saveListing() {
    if (!currentUser) return showToast("Войдите в аккаунт", "error");

    // Rate limiting: максимум 5 объявлений в минуту
    if (!checkRateLimit('create_listing', 5, 60000)) {
        return showToast("⚠️ Слишком много действий. Подождите минуту.", "error");
    }

    const editId = document.getElementById('editItemId').value;
    const type = document.getElementById('addType').value;
    const category = document.getElementById('addCategory').value;
    const title = document.getElementById('addTitle').value.trim();
    const price = parseInt(document.getElementById('addPrice').value);
    const city = document.getElementById('addCity').value;
    const owners = parseInt(document.getElementById('addOwners').value) || 1;
    const description = document.getElementById('addDescription').value.trim();
    const latitude = document.getElementById('latitude').value;
    const longitude = document.getElementById('longitude').value;

    // Валидация данных
    const errors = validateListing({ title, price, category, city, description });
    if (errors.length > 0) {
        return showToast(errors[0], "error");
    }

    // Санитизация (защита от XSS)
    const sanitizedTitle = sanitizeHTML(title);
    const sanitizedDescription = sanitizeHTML(description);

    if (currentImages.length === 0) {
        currentImages = ["https://picsum.photos/id/1015/800/600"];
    }

    const listing = {
        type,
        category,
        title: sanitizedTitle,
        price,
        city,
        owners,
        description: sanitizedDescription || "Описание отсутствует",
        images: [...currentImages],
        author: currentUser,
        date: new Date().toISOString(),
        views: 0,
        latitude: latitude || null,
        longitude: longitude || null
    };

    // Сохраняем в Firebase
    await saveListingToFirebase(listing, editId || null);
    
    // Логирование
    logAction(editId ? 'update_listing' : 'create_listing', `ID: ${editId || 'new'}, Title: ${listing.title}`);
    
    // Уведомление о новом объявлении
    if (!editId) {
        notifyNewListing(listing);
    }
    
    resetAddForm();
}

function initImageUpload() {
    const uploadInput = document.getElementById('imageUpload');
    if (!uploadInput) return;

    uploadInput.onchange = function(e) {
        Array.from(e.target.files).forEach(file => {
            if (!file.type.startsWith('image/')) return;
            if (currentImages.length >= 5) {
                return showToast("Максимум 5 фотографий", "error");
            }
            const reader = new FileReader();
            reader.onload = ev => {
                currentImages.push(ev.target.result);
                renderImagePreview();
            };
            reader.readAsDataURL(file);
        });
    };
}

function renderImagePreview() {
    const preview = document.getElementById('imagePreview');
    if (!preview) return;
    preview.innerHTML = '';

    currentImages.forEach((base64, i) => {
        const div = document.createElement('div');
        div.style.cssText = 'position:relative; width:130px; height:130px;';
        div.innerHTML = `
            <img src="${base64}" style="width:100%; height:100%; object-fit:cover; border-radius:12px;">
            <button onclick="removeImage(${i}); event.stopImmediatePropagation();" 
                    style="position:absolute; top:6px; right:6px; background:#ef4444; color:white; border:none; width:26px; height:26px; border-radius:50%;">✕</button>
        `;
        preview.appendChild(div);
    });
}

function removeImage(index) {
    currentImages.splice(index, 1);
    renderImagePreview();
}

function render() {
    const grid = document.getElementById('listingsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    let filtered = [...items];

    const cityFilter = document.getElementById('filterCity')?.value || 'all';
    const typeFilter = document.getElementById('filterType')?.value || 'all';
    const catFilter = document.getElementById('filterCategory')?.value || 'all';
    const priceFilter = parseInt(document.getElementById('filterPrice')?.value) || Infinity;
    const ownersFilter = parseInt(document.getElementById('filterOwners')?.value) || Infinity;

    // Поиск по тексту
    if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(i => 
            i.title.toLowerCase().includes(query) || 
            i.description.toLowerCase().includes(query) ||
            i.city.toLowerCase().includes(query)
        );
    }

    if (cityFilter !== 'all') filtered = filtered.filter(i => i.city === cityFilter);
    if (typeFilter !== 'all') filtered = filtered.filter(i => i.type === typeFilter);
    if (catFilter !== 'all') filtered = filtered.filter(i => i.category === catFilter);
    filtered = filtered.filter(i => i.price <= priceFilter);
    filtered = filtered.filter(i => (i.owners || 1) <= ownersFilter);

    // Сортировка
    filtered.sort((a, b) => {
        // VIP всегда в топе
        if (a.isVIP && !b.isVIP) return -1;
        if (!a.isVIP && b.isVIP) return 1;
        
        switch (sortBy) {
            case 'price-asc': return a.price - b.price;
            case 'price-desc': return b.price - a.price;
            case 'views': return (b.views || 0) - (a.views || 0);
            case 'date':
            default: return new Date(b.date) - new Date(a.date);
        }
    });

    if (currentMode === 'my' && currentUser) filtered = filtered.filter(i => i.author === currentUser);
    if (currentMode === 'fav') filtered = filtered.filter(i => favorites.includes(i.id));

    if (filtered.length === 0) {
        grid.innerHTML = `<p style="grid-column:1/-1; text-align:center; padding:80px 20px; color:var(--text-light); font-size:17px;">
            ${currentMode === 'my' ? 'У вас пока нет объявлений' : currentMode === 'fav' ? 'Избранное пустое' : 'Объявлений не найдено'}
        </p>`;
        return;
    }
    
    let cardsAdded = 0;
    filtered.forEach((item, index) => {
        const card = document.createElement('div');
        card.innerHTML = createCardHTML(item);
        card.querySelector('.card').onclick = (e) => {
            if (!e.target.closest('button')) openDetail(item.id);
        };
        grid.appendChild(card.querySelector('.card'));
        cardsAdded++;
        
        // Вставляем рекламный блок после каждых 6 карточек
        if (cardsAdded % 6 === 0 && cardsAdded < filtered.length) {
            const adBlock = document.createElement('div');
            adBlock.className = 'ad-banner-small';
            adBlock.onclick = showAdInfo;
            adBlock.innerHTML = `
                <div style="display:flex; align-items:center; justify-content:center; gap:12px; padding:15px;">
                    <i class="fas fa-ad" style="font-size:24px; color:#f59e0b;"></i>
                    <div style="text-align:center;">
                        <div style="font-size:14px; font-weight:600; color:var(--text);">🏷️ Здесь могла бы быть ваша реклама</div>
                        <div style="font-size:11px; color:var(--text-light);">Видимое место в ленте • от 25 000 ₸/месяц</div>
                    </div>
                </div>
            `;
            adBlock.style.gridColumn = '1 / -1';
            grid.appendChild(adBlock);
        }
    });
}

function toggleFav(id) {
    if (favorites.includes(id)) {
        favorites = favorites.filter(f => f !== id);
    } else {
        favorites.push(id);
    }
    localStorage.setItem('krysha_u_favs', JSON.stringify(favorites));
    render();
}
    
let currentSlideIndex = 0;

function openDetail(id) {
    const item = items.find(i => i.id === id);
    if (!item) return showToast("Объявление не найдено", "error");

    // Добавляем в историю просмотров
    addToViewedHistory(id);

    const waText = encodeURIComponent(`Здравствуйте! Интересует "${item.title}" за ${item.price.toLocaleString()} ₸`);
    currentSlideIndex = 0;

    const hasImages = item.images && item.images.length > 0;
    const totalImages = hasImages ? item.images.length : 0;

    let imagesHtml = hasImages 
        ? `
        <div style="position:relative; margin-bottom:25px;">
            <div id="sliderContainer" style="position:relative; overflow:hidden; border-radius:16px; cursor:pointer;">
                <img id="currentSlide" src="${item.images[0]}" style="width:100%; height:420px; object-fit:cover; display:block; transition:opacity 0.3s ease;" onclick="changeSlide(1)">
            </div>
            ${totalImages > 1 ? `
            <button onclick="changeSlide(-1)" style="position:absolute; left:15px; top:50%; transform:translateY(-50%); background:rgba(0,0,0,0.7); color:white; border:none; width:50px; height:50px; border-radius:50%; cursor:pointer; font-size:24px; z-index:10; backdrop-filter:blur(4px); transition:all 0.3s;">&#10094;</button>
            <button onclick="changeSlide(1)" style="position:absolute; right:15px; top:50%; transform:translateY(-50%); background:rgba(0,0,0,0.7); color:white; border:none; width:50px; height:50px; border-radius:50%; cursor:pointer; font-size:24px; z-index:10; backdrop-filter:blur(4px); transition:all 0.3s;">&#10095;</button>
            ` : ''}
            ${totalImages > 1 ? `
            <div id="slideIndicators" style="position:absolute; bottom:20px; left:50%; transform:translateX(-50%); display:flex; gap:10px; z-index:10;">
                ${item.images.map((_, i) => `<span onclick="goToSlide(${i})" style="width:12px; height:12px; border-radius:50%; background:${i === 0 ? 'white' : 'rgba(255,255,255,0.5)'}; cursor:pointer; display:inline-block; transition:all 0.3s;"></span>`).join('')}
            </div>
            ` : ''}
            <div style="position:absolute; top:15px; right:15px; background:rgba(0,0,0,0.7); color:white; padding:8px 16px; border-radius:20px; font-size:14px; z-index:10; backdrop-filter:blur(4px);">
                📷 <span id="slideCounter">1 / ${totalImages}</span>
            </div>
        </div>
        `
        : '<p style="color:#64748b; text-align:center; padding:60px 20px; background:#f8fafc; border-radius:16px;">📷 Нет фотографий</p>';

    const isOwner = typeof currentUser !== 'undefined' && currentUser && (item.author === currentUser || currentUser === 'admin');
    
    const html = `
        ${imagesHtml}
        <h2 style="margin-bottom:12px;">${item.title}</h2>
        <p style="font-size:32px; font-weight:700; color:var(--primary); margin-bottom:20px;">${item.price.toLocaleString()} ₸</p>
        
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:12px; margin-bottom:25px; padding:18px; background:var(--card-bg); border-radius:14px; border:1px solid var(--border);">
            <div><i class="fas fa-city" style="color:var(--primary); margin-right:8px;"></i><strong>Город:</strong> ${item.city}</div>
            <div><i class="fas fa-users" style="color:var(--primary); margin-right:8px;"></i><strong>Владельцев:</strong> ${item.owners || 1}</div>
            <div><i class="fas fa-tag" style="color:var(--primary); margin-right:8px;"></i><strong>Тип:</strong> ${item.type === 'rent' ? 'Аренда' : 'Продажа'}</div>
            <div><i class="fas fa-building" style="color:var(--primary); margin-right:8px;"></i><strong>Категория:</strong> ${item.category}</div>
            <div><i class="fas fa-user" style="color:var(--primary); margin-right:8px;"></i><strong>Автор:</strong> ${item.author}</div>
            <div><i class="fas fa-eye" style="color:var(--primary); margin-right:8px;"></i><strong>Просмотров:</strong> ${item.views || 0}</div>
        </div>
        
        <div class="description-box">${item.description || 'Описание отсутствует'}</div>

        <div style="margin: 35px 0 25px;">
            <h3 style="margin-bottom: 15px;">📍 Местоположение</h3>
            <div id="detailMap" style="width:100%; height:380px; border-radius:16px; border:1px solid #334155;"></div>
        </div>
        
        <div style="display:flex; gap:12px; margin:35px 0 20px;">
            <button onclick="openChatModal(${item.id}, '${item.author}')" class="btn-secondary" style="flex:1; padding:16px; font-size:15px;">
                💬 Написать продавцу
            </button>
            <button onclick="shareListing(${item.id})" class="btn-secondary" style="flex:1; padding:16px; font-size:15px;">
                📤 Поделиться
            </button>
            <button onclick="openMortgageModal(${item.price})" class="btn-secondary" style="flex:1; padding:16px; font-size:15px;">
                🏦 Ипотека
            </button>
        </div>
        
        <!-- Рекламный блок в детальном просмотре -->
        <div class="ad-banner-inline" onclick="showAdInfo()" style="margin:30px 0; padding:18px; background:linear-gradient(135deg, #f8fafc, #e2e8f0); border:2px dashed #cbd5e1; border-radius:14px; cursor:pointer; transition:0.3s;">
            <div style="display:flex; align-items:center; justify-content:center; gap:12px; text-align:center;">
                <i class="fas fa-store" style="font-size:28px; color:#22c55e;"></i>
                <div>
                    <div style="font-size:14px; font-weight:600; color:#1e2937;">🏪 Здесь могла бы быть ваша реклама</div>
                    <div style="font-size:11px; color:#64748b;">Реклама рядом с объявлением • от 35 000 ₸/месяц</div>
                </div>
            </div>
        </div>
        
        <div style="display:flex; gap:10px; margin-top:15px; flex-wrap:wrap;">
            ${isOwner ? `
            <button onclick="event.stopPropagation(); openEditModal('${item.id}');" class="btn-secondary" style="flex:1; padding:16px; font-size:15px; background:#f59e0b; color:#000;">
                ✏️ Редактировать
            </button>
            <button onclick="event.stopPropagation(); confirmAndDeleteListing('${item.id}');" class="btn-danger" style="flex:1; padding:16px; font-size:15px;">
                🗑 Удалить
            </button>` : ''}
            <a href="https://wa.me/${WA_PHONE}?text=${waText}" target="_blank" class="btn-whatsapp" style="flex:1; min-width:120px;">
                <i class="fab fa-whatsapp"></i> WhatsApp
            </a>
            <a href="https://t.me/${TG_USERNAME}" target="_blank" class="btn-telegram" style="flex:1; min-width:120px;">
                <i class="fab fa-telegram-plane"></i> Telegram
            </a>
        </div>
    `;
    
    const detailContent = document.getElementById('detailContent');
    detailContent.innerHTML = html;
    detailContent.dataset.itemId = id;
    openModal('detailModal');

    setTimeout(() => {
        const lat = item.latitude || 43.238949;
        const lng = item.longitude || 76.889709;
        showDetailMap(lat, lng);
    }, 800);
}

function changeSlide(direction) {
    const item = items.find(i => i.id === parseInt(document.getElementById('detailContent').dataset.itemId));
    if (!item || !item.images || item.images.length <= 1) return;
    
    currentSlideIndex = (currentSlideIndex + direction + item.images.length) % item.images.length;
    updateSlide(item.images);
}

function goToSlide(index) {
    const item = items.find(i => i.id === parseInt(document.getElementById('detailContent').dataset.itemId));
    if (!item || !item.images) return;
    
    currentSlideIndex = index;
    updateSlide(item.images);
}

function updateSlide(images) {
    const slideImg = document.getElementById('currentSlide');
    const counter = document.getElementById('slideCounter');
    const indicators = document.getElementById('slideIndicators');
    
    if (slideImg) {
        // Плавная анимация
        slideImg.style.opacity = '0';
        setTimeout(() => {
            slideImg.src = images[currentSlideIndex];
            slideImg.style.opacity = '1';
        }, 150);
    }
    if (counter) counter.textContent = `${currentSlideIndex + 1} / ${images.length}`;
    if (indicators) {
        indicators.querySelectorAll('span').forEach((dot, i) => {
            dot.style.background = i === currentSlideIndex ? 'white' : 'rgba(255,255,255,0.5)';
            dot.style.transform = i === currentSlideIndex ? 'scale(1.3)' : 'scale(1)';
        });
    }
}

function confirmAndDeleteListing(id) {
    if (confirm("Удалить объявление?")) {
        deleteListing(id);
        closeModal('detailModal');
    }
}

async function deleteListing(id) {
    const item = items.find(i => i.id === id);
    if (!item || (item.author !== currentUser && currentUser !== 'admin')) return;
    
    await deleteListingFromFirebase(id);
}

function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.cabinet-tabs button').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`tab${mode.charAt(0).toUpperCase() + mode.slice(1)}`);
    if (activeBtn) activeBtn.classList.add('active');

    if (mode === 'payments') {
        renderPaymentsHistory();
    } else if (mode === 'viewed') {
        renderViewedHistory();
    } else {
        render();
    }
}
    
function checkNewListingAgainstSubscriptions(newItem) {
    if (!isPlusActiveNow()) return;
    subscriptions.filter(s => s.user === currentUser).forEach(sub => {
        let match = true;
        if (sub.city !== 'all' && sub.city !== newItem.city) match = false;
        if (sub.type !== 'all' && sub.type !== newItem.type) match = false;
        if (sub.category !== 'all' && sub.category !== newItem.category) match = false;
        if (sub.priceFrom && newItem.price < sub.priceFrom) match = false;
        if (sub.priceTo !== Infinity && newItem.price > sub.priceTo) match = false;

        if (match) {
            showToast(`🔔 Новое объявление по вашей подписке: ${newItem.title}`, "success");
            // Отправляем Telegram уведомление
            notifyNewListing(newItem);
        }
    });
}

function openValuationModal() { 
    openModal('valuationModal'); 
}

function calculateValuation() {
    const area = parseFloat(document.getElementById('valArea').value) || 0;
    if (area < 10) return showToast("Введите площадь", "error");
    
    const city = document.getElementById('valCity').value;
    let pricePerM2 = city === "Алматы" ? 650000 : 580000;
    let estimated = Math.round(area * pricePerM2);
    
    const result = document.getElementById('valuationResult');
    result.style.display = 'block';
    result.innerHTML = `Примерная стоимость: <strong style="color:#22c55e;">${estimated.toLocaleString()} ₸</strong>`;
}

function openSubscriptionModal() {
    if (!currentUser) {
        showToast("Войдите в аккаунт для создания подписки", "error");
        openModal('authModal');
        return;
    }
    if (!isPlusActiveNow()) {
        showToast("Эта функция доступна только с Krisha Plus!", "error");
        openPlusModal();
        return;
    }
    
    openModal('subscriptionModal');
    renderMySubscriptions();
}

async function saveSubscription() {
    const sub = {
        id: Date.now(),
        user: currentUser,
        city: document.getElementById('subCity').value,
        type: document.getElementById('subType').value,
        category: document.getElementById('subCategory').value,
        priceFrom: parseInt(document.getElementById('subPriceFrom').value) || 0,
        priceTo: parseInt(document.getElementById('subPriceTo').value) || Infinity,
        rooms: parseInt(document.getElementById('subRooms').value) || 0
    };

    subscriptions.push(sub);
    localStorage.setItem('krysha_subscriptions', JSON.stringify(subscriptions));
    
    showToast("✅ Подписка успешно создана!", "success");
    closeModal('subscriptionModal');
    renderMySubscriptions();
}

function renderMySubscriptions() {
    const container = document.getElementById('mySubscriptions');
    const mySubs = subscriptions.filter(s => s.user === currentUser);
    
    if (mySubs.length === 0) {
        container.innerHTML = '<p style="color:#94a3b8; text-align:center; padding:40px;">У вас пока нет активных подписок</p>';
        return;
    }

    let html = '';
    mySubs.forEach(sub => {
        html += `
            <div style="background:var(--card-bg); padding:16px; border-radius:12px; margin-bottom:12px; border:1px solid var(--border); color:var(--text);">
                <strong style="color:var(--text);">${sub.city === 'all' ? 'Все города' : sub.city}</strong> — 
                ${sub.type === 'all' ? 'Любой тип' : sub.type} | 
                ${sub.category === 'all' ? 'Любая категория' : sub.category}<br>
                Цена: ${sub.priceFrom || 0} — ${sub.priceTo === Infinity ? '∞' : sub.priceTo} ₸
                <button onclick="deleteSubscription(${sub.id})" style="float:right; color:#ef4444; background:none; border:none; font-size:14px; cursor:pointer;">Удалить</button>
            </div>`;
    });
    container.innerHTML = html;
}

async function deleteSubscription(id) {
    if (confirm("Удалить эту подписку?")) {
        subscriptions = subscriptions.filter(s => s.id !== id);
        localStorage.setItem('krysha_subscriptions', JSON.stringify(subscriptions));
        
        renderMySubscriptions();
        showToast("Подписка удалена");
    }
}

// ====================== ПОИСК И СОРТИРОВКА ======================
function handleSearch() {
    searchQuery = document.getElementById('searchInput')?.value || '';
    render();
}

function handleSort() {
    sortBy = document.getElementById('sortSelect')?.value || 'date';
    render();
}

// ====================== ИСТОРИЯ ПРОСМОТРОВ ======================
function addToViewedHistory(id) {
    const timestamp = Date.now();
    viewedItems = viewedItems.filter(v => v.id !== id);
    viewedItems.unshift({ id, timestamp });
    
    // Храним только последние 50 просмотров
    if (viewedItems.length > 50) viewedItems = viewedItems.slice(0, 50);
    
    localStorage.setItem('krysha_viewed', JSON.stringify(viewedItems));
    
    // Обновляем просмотр в Firebase
    incrementViewCount(id);
}

function getViewedHistory() {
    return viewedItems.map(v => items.find(i => i.id === v.id)).filter(Boolean);
}

function clearViewedHistory() {
    if (confirm("🗑 Очистить историю просмотров?")) {
        viewedItems = [];
        localStorage.removeItem('krysha_viewed');
        showToast("✅ История очищена", "success");
        renderViewedHistory();
    }
}

function renderViewedHistory() {
    const grid = document.getElementById('listingsGrid');
    if (!grid) return;
    
    grid.innerHTML = `<h2 style="grid-column:1/-1; margin-bottom:20px;">📜 История просмотров</h2>`;
    
    const history = getViewedHistory();
    
    if (history.length === 0) {
        grid.innerHTML += `<p style="grid-column:1/-1; text-align:center; padding:80px 20px; color:var(--text-light);">Вы ещё не просматривали объявления</p>`;
        return;
    }
    
    let html = '<div style="grid-column:1/-1;" class="listings-grid">';
    history.forEach(item => {
        const viewedDate = viewedItems.find(v => v.id === item.id)?.timestamp;
        const dateStr = viewedDate ? new Date(viewedDate).toLocaleDateString('ru-RU') : '';
        html += createCardHTML(item, dateStr);
    });
    html += '</div>';
    html += `<div style="grid-column:1/-1; margin-top:20px;"><button onclick="clearViewedHistory()" class="btn-secondary">🗑 Очистить историю</button></div>`;
    grid.innerHTML += html;
}

function createCardHTML(item, dateStr = '') {
    const typeLabel = item.type === 'rent' ? 'Аренда' : 'Продажа';
    const isOwner = typeof currentUser !== 'undefined' && currentUser && (item.author === currentUser || currentUser === 'admin');
    const isVIP = item.isVIP && item.vipUntil && new Date(item.vipUntil) > new Date();
    const hasChat = currentUser && currentUser !== item.author;
    
    return `
        <div class="card ${isVIP ? 'vip-card' : ''}" onclick="openDetail(${item.id})">
            ${isVIP ? '<div class="vip-badge">⭐ VIP</div>' : ''}
            <img src="${item.images[0]}" alt="${item.title}">
            <div class="category-tag">${item.category} • ${typeLabel}</div>
            <button class="fav-btn ${favorites.includes(item.id) ? 'active' : ''}" 
                    onclick="event.stopPropagation(); toggleFav(${item.id})">❤️</button>
            <div class="card-body">
                <div class="card-price">${item.price.toLocaleString()} ₸</div>
                <h3>${item.title}</h3>
                <p>${item.city} • Владельцев: ${item.owners || 1}</p>
                <small>Автор: ${item.author}</small>
                ${dateStr ? `<small style="color:#94a3b8; display:block; margin-top:5px;">👁 ${dateStr}</small>` : ''}
            </div>
            ${isOwner ? `
            <div style="position:absolute; bottom:12px; right:12px; display:flex; gap:5px;">
                ${isVIP 
                    ? `<button onclick="event.stopPropagation(); removeListingVIP(${item.id});" class="btn-secondary" style="padding:5px 10px; font-size:12px; background:#f59e0b;">⭐ VIP</button>`
                    : `<button onclick="event.stopPropagation(); makeListingVIP(${item.id});" class="btn-secondary" style="padding:5px 10px; font-size:12px; background:#eab308; color:black;">Сделать VIP</button>`
                }
                <button onclick="event.stopPropagation(); openEditModal(${item.id});" class="btn-secondary" style="padding:5px 10px; font-size:12px;">✏️</button>
                <button onclick="event.stopPropagation(); deleteListing(${item.id});" class="btn-danger" style="padding:5px 10px; font-size:12px;">🗑</button>
            </div>` : hasChat ? `
            <div style="position:absolute; bottom:12px; right:12px;">
                <button onclick="event.stopPropagation(); openChatModal(${item.id}, '${item.author}');" 
                        class="btn-secondary" style="padding:8px 14px; font-size:12px;">💬 Чат</button>
            </div>` : ''}
        </div>
    `;
}

// ====================== ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ ======================
function getUserProfile(username) {
    return userProfiles[username] || {
        username,
        avatar: null,
        phone: '',
        bio: '',
        joinDate: new Date().toISOString(),
        totalListings: items.filter(i => i.author === username).length,
        totalViews: items.filter(i => i.author === username).reduce((sum, i) => sum + (i.views || 0), 0)
    };
}

function saveUserProfile(data) {
    userProfiles[currentUser] = { ...getUserProfile(currentUser), ...data };
    localStorage.setItem('krysha_profiles', JSON.stringify(userProfiles));
    showToast("✅ Профиль сохранён", "success");
}

function openProfileModal() {
    if (!currentUser) {
        showToast("⚠️ Войдите в аккаунт", "error");
        openModal('authModal');
        return;
    }
    
    const profile = getUserProfile(currentUser);
    const stats = getUserStats(currentUser);
    
    const html = `
        <div style="text-align:center; margin-bottom:25px;">
            <div style="width:120px; height:120px; margin:0 auto 15px; border-radius:50%; overflow:hidden; border:4px solid var(--primary);">
                ${profile.avatar 
                    ? `<img src="${profile.avatar}" style="width:100%; height:100%; object-fit:cover;">`
                    : `<div style="width:100%; height:100%; background:linear-gradient(135deg, #6366f1, #4f46e5); display:flex; align-items:center; justify-content:center; font-size:48px; color:white;">${currentUser.charAt(0).toUpperCase()}</div>`
                }
            </div>
            <h2 style="margin-bottom:5px;">${currentUser}</h2>
            <p style="color:var(--text-light);">На сайте с ${new Date(profile.joinDate).toLocaleDateString('ru-RU')}</p>
        </div>
        
        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:12px; margin-bottom:25px;">
            <div style="background:var(--card-bg); padding:15px; border-radius:12px; text-align:center; border:1px solid var(--border);">
                <div style="font-size:24px; font-weight:700; color:var(--primary);">${stats.listings}</div>
                <div style="font-size:13px; color:var(--text-light);">Объявлений</div>
            </div>
            <div style="background:var(--card-bg); padding:15px; border-radius:12px; text-align:center; border:1px solid var(--border);">
                <div style="font-size:24px; font-weight:700; color:var(--primary);">${stats.views}</div>
                <div style="font-size:13px; color:var(--text-light);">Просмотров</div>
            </div>
            <div style="background:var(--card-bg); padding:15px; border-radius:12px; text-align:center; border:1px solid var(--border);">
                <div style="font-size:24px; font-weight:700; color:var(--primary);">${stats.favorites}</div>
                <div style="font-size:13px; color:var(--text-light);">В избранном</div>
            </div>
        </div>
        
        <div style="background:var(--card-bg); padding:20px; border-radius:14px; border:1px solid var(--border); margin-bottom:20px;">
            <h3 style="margin-bottom:15px;">⚙️ Настройки профиля</h3>
            <div style="display:flex; flex-direction:column; gap:12px;">
                <div>
                    <label style="display:block; margin-bottom:6px; font-weight:500; color:var(--text-light);">📷 Аватар</label>
                    <input type="file" id="avatarUpload" accept="image/*" onchange="uploadAvatar(this)" style="width:100%; padding:10px; border:2px solid var(--border); border-radius:8px;">
                </div>
                <div>
                    <label style="display:block; margin-bottom:6px; font-weight:500; color:var(--text-light);">📞 Телефон</label>
                    <input type="tel" id="profilePhone" value="${profile.phone || ''}" placeholder="+7 777 123 4567" 
                           style="width:100%; padding:12px; border:2px solid var(--border); border-radius:8px; font-size:15px;">
                </div>
                <div>
                    <label style="display:block; margin-bottom:6px; font-weight:500; color:var(--text-light);">📝 О себе</label>
                    <textarea id="profileBio" rows="3" placeholder="Расскажите немного о себе..." 
                              style="width:100%; padding:12px; border:2px solid var(--border); border-radius:8px; font-size:15px; resize:vertical;">${profile.bio || ''}</textarea>
                </div>
                <button onclick="saveProfileSettings()" class="btn-primary" style="padding:14px;">💾 Сохранить профиль</button>
            </div>
        </div>
        
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <button onclick="showMyListings()" class="btn-secondary" style="flex:1;">📋 Мои объявления</button>
            <button onclick="renderViewedHistory(); openModal('profileModal');" class="btn-secondary" style="flex:1;">📜 История просмотров</button>
        </div>
    `;
    
    document.getElementById('profileContent').innerHTML = html;
    openModal('profileModal');
}

function getUserStats(username) {
    return {
        listings: items.filter(i => i.author === username).length,
        views: items.filter(i => i.author === username).reduce((sum, i) => sum + (i.views || 0), 0),
        favorites: favorites.length
    };
}

function uploadAvatar(input) {
    const file = input.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        return showToast("⚠️ Выберите изображение", "error");
    }
    if (file.size > 2 * 1024 * 1024) {
        return showToast("⚠️ Файл больше 2MB", "error");
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        saveUserProfile({ avatar: e.target.result });
        openProfileModal();
    };
    reader.readAsDataURL(file);
}

function saveProfileSettings() {
    const phone = document.getElementById('profilePhone')?.value || '';
    const bio = document.getElementById('profileBio')?.value || '';
    saveUserProfile({ phone, bio });
}

function showMyListings() {
    closeModal('profileModal');
    setMode('my');
}

// ====================== ПРОВЕРКА АУТЕНТИФИКАЦИИ ======================
function checkAuthAndOpen() {
    if (!currentUser) {
        showToast("⚠️ Войдите в аккаунт для подачи объявления", "error");
        openModal('authModal');
        return;
    }
    openAddModal();
}

// ====================== БЕЗОПАСНОСТЬ И ВАЛИДАЦИЯ ======================

// Санитизация HTML (защита от XSS)
function sanitizeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Валидация email
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Валидация телефона (Казахстан)
function isValidPhone(phone) {
    return /^(\+7|7|8)?\d{10}$/.test(phone.replace(/[\s\-\(\)]/g, ''));
}

// Валидация пароля (минимум 6 символов)
function isValidPassword(password) {
    return password && password.length >= 6;
}

// Rate limiting (защита от спама)
function checkRateLimit(action, limit = 5, interval = 60000) {
    const now = Date.now();
    const key = `${action}_${currentUser || 'anon'}`;
    
    if (!lastRequestTime[key]) {
        lastRequestTime[key] = [];
    }
    
    // Очищаем старые запросы
    lastRequestTime[key] = lastRequestTime[key].filter(time => now - time < interval);
    
    if (lastRequestTime[key].length >= limit) {
        return false; // Превышен лимит
    }
    
    lastRequestTime[key].push(now);
    return true;
}

// Проверка на CSRF (токен сессии)
function getSessionToken() {
    let token = sessionStorage.getItem('krysha_session');
    if (!token) {
        token = 'sess_' + Math.random().toString(36).substr(2) + Date.now();
        sessionStorage.setItem('krysha_session', token);
    }
    return token;
}

// Валидация объявления перед сохранением
function validateListing(data) {
    const errors = [];
    
    if (!data.title || data.title.trim().length < 5) {
        errors.push('Заголовок должен содержать минимум 5 символов');
    }
    if (data.title.length > 100) {
        errors.push('Заголовок слишком длинный (макс. 100 символов)');
    }
    if (!data.price || data.price < 100000) {
        errors.push('Минимальная цена 100,000 ₸');
    }
    if (data.price > 1000000000) {
        errors.push('Максимальная цена 1,000,000,000 ₸');
    }
    if (!data.category) {
        errors.push('Выберите категорию');
    }
    if (!data.city) {
        errors.push('Выберите город');
    }
    if (data.description && data.description.length > 5000) {
        errors.push('Описание слишком длинное (макс. 5000 символов)');
    }
    
    return errors;
}

// Логирование действий (для админа)
function logAction(action, details = '') {
    const logs = JSON.parse(localStorage.getItem('krysha_action_logs')) || [];
    logs.unshift({
        timestamp: new Date().toISOString(),
        user: currentUser || 'anon',
        action,
        details,
        session: getSessionToken()
    });
    
    // Храним только последние 500 записей
    if (logs.length > 500) logs = logs.slice(0, 500);
    
    localStorage.setItem('krysha_action_logs', JSON.stringify(logs));
}

// ====================== ПОДЕЛИТЬСЯ В СОЦСЕТЯХ ======================
function shareListing(id) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    
    const url = window.location.href.split('#')[0];
    const title = encodeURIComponent(item.title);
    const price = item.price.toLocaleString() + ' ₸';
    const city = item.city;
    
    const shareData = {
        title: item.title,
        text: `🏠 ${item.title}\n💰 ${price}\n📍 ${city}\n\nСмотрите на Krysha Pro!`,
        url: url
    };
    
    // Проверяем поддержку Web Share API
    if (navigator.share) {
        navigator.share(shareData)
            .then(() => showToast('✅ Поделиться успешно', 'success'))
            .catch((err) => {
                if (err.name !== 'AbortError') {
                    showShareModal(id);
                }
            });
    } else {
        showShareModal(id);
    }
}

function showShareModal(id) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    
    const url = window.location.href.split('#')[0];
    const title = encodeURIComponent(item.title);
    const text = encodeURIComponent(`🏠 ${item.title} - ${item.price.toLocaleString()} ₸\n📍 ${item.city}`);
    
    const html = `
        <h3 style="text-align:center; margin-bottom:20px; color:var(--text);">📤 Поделиться объявлением</h3>
        
        <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:12px; margin-bottom:20px;">
            <a href="https://wa.me/?text=${text}%0A%0A${encodeURIComponent(url)}" target="_blank" 
               style="display:flex; align-items:center; justify-content:center; gap:10px; padding:14px; background:#25D366; color:white; border-radius:12px; text-decoration:none; font-weight:600; transition:0.3s;">
                <i class="fab fa-whatsapp" style="font-size:20px;"></i> WhatsApp
            </a>
            <a href="https://t.me/share/url?url=${encodeURIComponent(url)}&text=${text}" target="_blank"
               style="display:flex; align-items:center; justify-content:center; gap:10px; padding:14px; background:#229ED9; color:white; border-radius:12px; text-decoration:none; font-weight:600; transition:0.3s;">
                <i class="fab fa-telegram-plane" style="font-size:20px;"></i> Telegram
            </a>
            <a href="https://vk.com/share.php?title=${title}&url=${encodeURIComponent(url)}" target="_blank"
               style="display:flex; align-items:center; justify-content:center; gap:10px; padding:14px; background:#0077FF; color:white; border-radius:12px; text-decoration:none; font-weight:600; transition:0.3s;">
                <i class="fab fa-vk" style="font-size:20px;"></i> ВКонтакте
            </a>
            <a href="https://www.instagram.com/" target="_blank"
               style="display:flex; align-items:center; justify-content:center; gap:10px; padding:14px; background:linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888); color:white; border-radius:12px; text-decoration:none; font-weight:600; transition:0.3s;">
                <i class="fab fa-instagram" style="font-size:20px;"></i> Instagram
            </a>
            <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}" target="_blank"
               style="display:flex; align-items:center; justify-content:center; gap:10px; padding:14px; background:#1877F2; color:white; border-radius:12px; text-decoration:none; font-weight:600; transition:0.3s;">
                <i class="fab fa-facebook" style="font-size:20px;"></i> Facebook
            </a>
            <button onclick="copyListingLink('${url}')"
                    style="display:flex; align-items:center; justify-content:center; gap:10px; padding:14px; background:var(--card-bg); color:var(--text); border:2px solid var(--border); border-radius:12px; cursor:pointer; font-weight:600; transition:0.3s;">
                <i class="fas fa-link" style="font-size:18px;"></i> Копировать ссылку
            </button>
        </div>
        
        <div style="background:var(--card-bg); padding:15px; border-radius:12px; border:1px solid var(--border);">
            <div style="font-size:13px; color:var(--text-light); margin-bottom:8px;">📋 Ссылка на объявление:</div>
            <div style="display:flex; gap:8px;">
                <input type="text" id="shareLinkInput" value="${url}" readonly 
                       style="flex:1; padding:10px; border:2px solid var(--border); border-radius:8px; font-size:13px; background:var(--card-bg); color:var(--text);">
                <button onclick="copyListingLink('${url}')" class="btn-primary" style="padding:10px 16px;">
                    <i class="fas fa-copy"></i>
                </button>
            </div>
        </div>
    `;
    
    document.getElementById('shareContent').innerHTML = html;
    openModal('shareModal');
}

function copyListingLink(url) {
    navigator.clipboard.writeText(url).then(() => {
        showToast('✅ Ссылка скопирована в буфер обмена', 'success');
        closeModal('shareModal');
    }).catch(() => {
        const input = document.getElementById('shareLinkInput');
        if (input) {
            input.select();
            document.execCommand('copy');
            showToast('✅ Ссылка скопирована', 'success');
            closeModal('shareModal');
        }
    });
}

// ====================== ИПОТЕЧНЫЙ КАЛЬКУЛЯТОР ======================
let mortgageChartInstance = null;

function openMortgageModal(price = 0) {
    if (price > 0) {
        document.getElementById('mortgagePrice').value = price;
        document.getElementById('mortgageInitial').value = Math.round(price * 0.2);
    }
    openModal('mortgageModal');
}

function calculateMortgage() {
    const price = parseFloat(document.getElementById('mortgagePrice').value) || 0;
    const initial = parseFloat(document.getElementById('mortgageInitial').value) || 0;
    const years = parseFloat(document.getElementById('mortgageYears').value) || 15;
    const rate = parseFloat(document.getElementById('mortgageRate').value) || 14;
    
    if (price <= 0) {
        return showToast("⚠️ Введите стоимость недвижимости", "error");
    }
    if (initial >= price) {
        return showToast("⚠️ Первоначальный взнос должен быть меньше стоимости", "error");
    }
    
    const loanAmount = price - initial;
    const monthlyRate = rate / 100 / 12;
    const months = years * 12;
    
    // Формула аннуитетного платежа
    const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
    const totalPayment = monthlyPayment * months;
    const totalInterest = totalPayment - loanAmount;
    
    // Показываем результат
    document.getElementById('mortgageResult').style.display = 'block';
    document.getElementById('monthlyPayment').textContent = Math.round(monthlyPayment).toLocaleString() + ' ₸';
    document.getElementById('loanAmount').textContent = loanAmount.toLocaleString() + ' ₸';
    document.getElementById('totalInterest').textContent = totalInterest.toLocaleString() + ' ₸';
    document.getElementById('totalPayment').textContent = totalPayment.toLocaleString() + ' ₸';
    document.getElementById('loanTerm').textContent = months + ' месяцев (' + years + ' лет)';
    
    // Строим график
    buildMortgageChart(loanAmount, totalInterest, initial);
    
    showToast("✅ Расчёт готов!", "success");
}

function buildMortgageChart(loanAmount, totalInterest, initial) {
    const ctx = document.getElementById('mortgageChart');
    if (!ctx) return;
    
    if (mortgageChartInstance) {
        mortgageChartInstance.destroy();
    }
    
    const isDarkMode = document.body.classList.contains('dark-theme');
    const textColor = isDarkMode ? '#f1f5f9' : '#1e2937';
    
    mortgageChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Первоначальный взнос', 'Сумма кредита', 'Проценты'],
            datasets: [{
                data: [initial, loanAmount, totalInterest],
                backgroundColor: [
                    '#22c55e',
                    '#6366f1',
                    '#f59e0b'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: textColor,
                        padding: 15,
                        font: { size: 12 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.toLocaleString();
                            return context.label + ': ' + value + ' ₸';
                        }
                    }
                }
            }
        }
    });
}

// ====================== ЧАТ МЕЖДУ ПОКУПАТЕЛЕМ И ПРОДАВЦОМ ======================

// Получение ID чата для объявления
function getChatId(listingId) {
    return `chat_${listingId}`;
}

// Отправка сообщения
async function sendChatMessage(listingId, recipient, message) {
    if (!currentUser) {
        showToast("⚠️ Войдите в аккаунт для отправки сообщений", "error");
        openModal('authModal');
        return false;
    }
    
    // Rate limiting: максимум 10 сообщений в минуту
    if (!checkRateLimit('chat_message', 10, 60000)) {
        showToast("⚠️ Слишком много сообщений. Подождите минуту.", "error");
        return false;
    }
    
    if (!message || message.trim().length === 0) {
        showToast("⚠️ Введите сообщение", "error");
        return false;
    }
    
    if (message.length > 1000) {
        showToast("⚠️ Сообщение слишком длинное (макс. 1000 символов)", "error");
        return false;
    }
    
    const chatData = {
        chatId: getChatId(listingId),
        listingId,
        from: currentUser,
        to: recipient,
        message: sanitizeHTML(message.trim()),
        read: false,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Сохраняем в Firebase для real-time синхронизации
    if (db) {
        try {
            await db.collection("chats").add(chatData);
            console.log("✅ Сообщение отправлено в Firebase");
        } catch (error) {
            console.error("Ошибка отправки сообщения в Firebase:", error);
            showToast("Ошибка отправки сообщения", "error");
            return false;
        }
    } else {
        // Fallback на localStorage если Firebase недоступен
        const chatMessage = {
            id: Date.now(),
            chatId: getChatId(listingId),
            listingId,
            from: currentUser,
            to: recipient,
            message: sanitizeHTML(message.trim()),
            timestamp: new Date().toISOString(),
            read: false
        };
        
        chatMessages.push(chatMessage);
        localStorage.setItem('krysha_chats', JSON.stringify(chatMessages));
    }
    
    logAction('send_message', `To: ${recipient}, Listing: ${listingId}`);
    
    return true;
}

// Получение сообщений для чата
function getChatMessages(listingId) {
    const chatId = getChatId(listingId);
    return chatMessages
        .filter(m => m.chatId === chatId)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

// Пометить сообщения как прочитанные
async function markMessagesAsRead(listingId, username) {
    const chatId = getChatId(listingId);
    let changed = false;
    
    // Обновляем локально
    chatMessages.forEach(msg => {
        if (msg.chatId === chatId && msg.to === username && !msg.read) {
            msg.read = true;
            changed = true;
        }
    });
    
    // Обновляем в Firebase
    if (db && changed) {
        try {
            const snapshot = await db.collection("chats")
                .where("chatId", "==", chatId)
                .where("to", "==", username)
                .where("read", "==", false)
                .get();
            
            const batch = db.batch();
            snapshot.forEach((doc) => {
                batch.update(doc.ref, { read: true });
            });
            await batch.commit();
            console.log(`✅ Сообщения помечены как прочитанные в Firebase`);
        } catch (error) {
            console.error("Ошибка при пометке сообщений как прочитанных:", error);
        }
    }
    
    if (changed && !db) {
        localStorage.setItem('krysha_chats', JSON.stringify(chatMessages));
    }
}

// Получить количество непрочитанных
function getUnreadCount(username) {
    return chatMessages.filter(m => m.to === username && !m.read).length;
}

// Открыть окно чата
function openChatModal(listingId, sellerName) {
    if (!currentUser) {
        showToast("⚠️ Войдите в аккаунт для начала чата", "error");
        openModal('authModal');
        return;
    }
    
    if (currentUser === sellerName) {
        showToast("⚠️ Нельзя написать самому себе", "error");
        return;
    }
    
    const item = items.find(i => i.id === listingId);
    if (!item) return;
    
    // Помечаем сообщения как прочитанные
    markMessagesAsRead(listingId, currentUser);
    
    const html = `
        <div style="display:flex; flex-direction:column; height:500px;">
            <div style="padding:15px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <h3 style="margin-bottom:5px;">💬 Чат с ${sellerName}</h3>
                    <p style="color:var(--text-light); font-size:13px;">📋 ${item.title}</p>
                </div>
                <button onclick="closeModal('chatModal')" style="background:none; border:none; font-size:24px; cursor:pointer; color:var(--text-light);">&times;</button>
            </div>
            
            <div id="chatMessagesContainer" data-listing-id="${listingId}" style="flex:1; overflow-y:auto; padding:15px; background:#f8fafc;">
                ${renderChatMessages(listingId)}
            </div>
            
            <div style="padding:15px; border-top:1px solid var(--border); display:flex; gap:10px;">
                <input type="text" id="chatMessageInput" placeholder="Введите сообщение..." 
                       onkeypress="if(event.key==='Enter') sendChatMessageFromInput(${listingId}, '${sellerName}')"
                       style="flex:1; padding:12px 16px; border:2px solid var(--border); border-radius:12px; font-size:15px;">
                <button onclick="sendChatMessageFromInput(${listingId}, '${sellerName}')" 
                        class="btn-primary" style="padding:12px 24px;">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        </div>
    `;
    
    document.getElementById('chatContent').innerHTML = html;
    openModal('chatModal');
    
    // Прокрутка вниз
    setTimeout(() => {
        const container = document.getElementById('chatMessagesContainer');
        if (container) container.scrollTop = container.scrollHeight;
    }, 100);
}

// Рендер сообщений чата
function renderChatMessages(listingId) {
    const messages = getChatMessages(listingId);
    
    if (messages.length === 0) {
        return `<p style="text-align:center; color:var(--text-light); padding:40px 20px;">
            💬 Начните диалог с продавцом<br><small>Сообщения синхронизируются в реальном времени</small>
        </p>`;
    }
    
    return messages.map(msg => {
        const isMyMessage = msg.from === currentUser;
        let timestamp = msg.timestamp;
        if (timestamp && timestamp.toDate) {
            timestamp = timestamp.toDate();
        }
        const time = new Date(timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        
        return `
            <div style="margin-bottom:12px; ${isMyMessage ? 'text-align:right;' : ''}">
                <div style="display:inline-block; max-width:75%; padding:10px 14px; border-radius:16px; 
                            ${isMyMessage 
                                ? 'background:linear-gradient(135deg, #6366f1, #4f46e5); color:white;' 
                                : 'background:var(--card-bg); border:1px solid var(--border);'}">
                    <p style="margin:0; word-wrap:break-word;">${msg.message}</p>
                    <small style="opacity:0.7; font-size:11px; display:block; margin-top:5px;">
                        ${time} ${msg.read && isMyMessage ? '✓' : ''}
                    </small>
                </div>
            </div>
        `;
    }).join('');
}

// Отправка сообщения из input
function sendChatMessageFromInput(listingId, sellerName) {
    const input = document.getElementById('chatMessageInput');
    const message = input?.value || '';
    
    if (sendChatMessage(listingId, sellerName, message)) {
        input.value = '';
        
        // Real-time listener обновит сообщения автоматически
        // Просто прокручиваем вниз
        setTimeout(() => {
            const container = document.getElementById('chatMessagesContainer');
            if (container) container.scrollTop = container.scrollHeight;
        }, 100);
    }
}

// Кнопка чата в карточке
function renderChatButton(listingId, sellerName) {
    const unread = getUnreadCount(currentUser);
    return `
        <button onclick="openChatModal(${listingId}, '${sellerName}')" 
                class="btn-secondary" style="flex:1; padding:10px; font-size:13px;">
            💬 Чат ${unread > 0 ? `(${unread})` : ''}
        </button>
    `;
}

// ====================== TELEGRAM УВЕДОМЛЕНИЯ ======================
function sendTelegramNotification(message) {
    // Отправка уведомления через Telegram Bot API
    const botToken = ''; // Пользователь может добавить свой токен
    const chatId = '';   // Пользователь может добавить свой chat ID
    
    if (!botToken || !chatId) {
        console.log('Telegram уведомления не настроены');
        return;
    }
    
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML'
        })
    }).catch(err => console.error('Telegram ошибка:', err));
}

function notifyNewListing(item) {
    const message = `
🏠 <b>Новое объявление!</b>

<b>${item.title}</b>
💰 ${item.price.toLocaleString()} ₸
📍 ${item.city}
📝 ${item.category} • ${item.type === 'rent' ? 'Аренда' : 'Продажа'}

<a href="${window.location.origin}">Посмотреть на сайте</a>
    `.trim();
    
    sendTelegramNotification(message);
}

// ====================== РЕКЛАМА ======================
function showAdInfo() {
    const html = `
        <div style="text-align:center; padding:10px;">
            <i class="fas fa-bullhorn" style="font-size:48px; color:#f59e0b; margin-bottom:15px;"></i>
            <h2 style="color:var(--text); margin-bottom:10px;">📢 Рекламное место</h2>
            <p style="color:var(--text-light); margin-bottom:20px; font-size:15px;">
                Разместите свою рекламу на Krysha Pro и получите доступ к тысячам потенциальных клиентов!
            </p>
            
            <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:15px; margin-bottom:25px;">
                <div style="background:var(--card-bg); padding:18px; border-radius:12px; border:1px solid var(--border);">
                    <div style="font-size:24px; font-weight:700; color:#6366f1; margin-bottom:5px;">50 000 ₸</div>
                    <div style="font-size:13px; color:var(--text-light);">Главный баннер / месяц</div>
                </div>
                <div style="background:var(--card-bg); padding:18px; border-radius:12px; border:1px solid var(--border);">
                    <div style="font-size:24px; font-weight:700; color:#22c55e; margin-bottom:5px;">35 000 ₸</div>
                    <div style="font-size:13px; color:var(--text-light);">В детальном просмотре / месяц</div>
                </div>
                <div style="background:var(--card-bg); padding:18px; border-radius:12px; border:1px solid var(--border);">
                    <div style="font-size:24px; font-weight:700; color:#f59e0b; margin-bottom:5px;">25 000 ₸</div>
                    <div style="font-size:13px; color:var(--text-light);">Малый баннер / месяц</div>
                </div>
                <div style="background:var(--card-bg); padding:18px; border-radius:12px; border:1px solid var(--border);">
                    <div style="font-size:24px; font-weight:700; color:#ec4899; margin-bottom:5px;">15 000 ₸</div>
                    <div style="font-size:13px; color:var(--text-light);">Неделя (любой формат)</div>
                </div>
            </div>
            
            <div style="background:linear-gradient(135deg, #6366f1, #4f46e5); color:white; padding:20px; border-radius:14px; margin-bottom:20px;">
                <div style="font-size:18px; font-weight:600; margin-bottom:10px;">📊 Охват аудитории:</div>
                <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:10px; text-align:center;">
                    <div>
                        <div style="font-size:24px; font-weight:700;">10K+</div>
                        <div style="font-size:12px; opacity:0.9;">Просмотров/месяц</div>
                    </div>
                    <div>
                        <div style="font-size:24px; font-weight:700;">5K+</div>
                        <div style="font-size:12px; opacity:0.9;">Уникальных посетителей</div>
                    </div>
                    <div>
                        <div style="font-size:24px; font-weight:700;">3K+</div>
                        <div style="font-size:12px; opacity:0.9;">Потенциальных клиентов</div>
                    </div>
                </div>
            </div>
            
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
                <a href="https://wa.me/${WA_PHONE}?text=Здравствуйте! Хочу разместить рекламу на Krysha Pro" 
                   target="_blank" class="btn-whatsapp" style="flex:1; min-width:140px;">
                    <i class="fab fa-whatsapp"></i> WhatsApp
                </a>
                <a href="https://t.me/${TG_USERNAME}" target="_blank" class="btn-telegram" style="flex:1; min-width:140px;">
                    <i class="fab fa-telegram-plane"></i> Telegram
                </a>
            </div>
            
            <p style="font-size:12px; color:var(--text-light); margin-top:15px;">
                * Цены ориентировочные. Свяжитесь с нами для обсуждения деталей.
            </p>
        </div>
    `;
    
    document.getElementById('adInfoContent').innerHTML = html;
    openModal('adInfoModal');
}

// ====================== ЗАПУСК ======================
window.onload = async () => {
    console.log("🚀 Запуск Krysha Pro...");
    
    // Проверяем сохранённого пользователя
    const savedUser = localStorage.getItem('krysha_u_logged');
    if (savedUser) {
        currentUser = savedUser;
    }
    
    // Инициализируем Firebase и загружаем данные
    if (typeof db !== 'undefined') {
        console.log('✅ Firebase готов к работе');
        await loadListingsFromFirebase();
        await loadChatsFromFirebase();
        enableRealtimeSync();
        enableChatRealtimeSync();
    } else {
        console.log('⚠️ Firebase не инициализирован, используем локальные данные');
        // Загружаем из localStorage если Firebase недоступен
        items = JSON.parse(localStorage.getItem('krysha_u_db')) || [];
        render();
    }
    
    checkVIPExpiry(); // Проверка просроченных VIP
    applyTranslations(); // Применяем язык
    applyTheme(); // Применяем тему
    renderAuth();
    setMode('all');
};

// ====================== ЭКСПОРТ ФУНКЦИЙ ДЛЯ HTML ======================
window.openModal = openModal;
window.closeModal = closeModal;
window.resetAdminPassword = resetAdminPassword;
window.openValuationModal = openValuationModal;
window.calculateValuation = calculateValuation;
window.openMortgageModal = openMortgageModal;
window.calculateMortgage = calculateMortgage;
window.openSubscriptionModal = openSubscriptionModal;
window.saveSubscription = saveSubscription;
window.openPlusModal = openPlusModal;
window.openProfileModal = openProfileModal;
window.saveProfileSettings = saveProfileSettings;
window.uploadAvatar = uploadAvatar;
window.showMyListings = showMyListings;
window.renderViewedHistory = renderViewedHistory;
window.clearViewedHistory = clearViewedHistory;
window.openChatModal = openChatModal;
window.shareListing = shareListing;
window.showAdInfo = showAdInfo;
window.openSettingsModal = openSettingsModal;
window.setLanguage = setLanguage;
window.setColorTheme = setColorTheme;
window.toggleTheme = toggleTheme;
window.openAdminPanel = openAdminPanel;
window.showAdminStats = showAdminStats;
window.showAdminUsers = showAdminUsers;
window.showAdminSubscriptions = showAdminSubscriptions;
window.showAdminPayments = showAdminPayments;
window.showAdminLogs = showAdminLogs;
window.showAdminAllListings = showAdminAllListings;
window.adminDeleteListing = adminDeleteListing;
window.adminEditListing = adminEditListing;
window.cycleLanguage = cycleLanguage;
window.clearAllData = clearAllData;
window.resetListingsData = resetListingsData;
window.exportData = exportData;
window.importData = importData;
window.showAllListingsOnMap = showAllListingsOnMap;
window.openMortgageModal = openMortgageModal;
window.calculateMortgage = calculateMortgage;