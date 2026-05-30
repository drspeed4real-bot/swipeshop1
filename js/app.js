
// Config loaded from js/supabase-config.js

const RECAPTCHA_SITE_KEY = '6LehiQEtAAAAAB2y9gnyxergO6MfHPdDjaaFQbmO';
let loginRecaptchaId = null;
let signupRecaptchaId = null;

function onRecaptchaLoad() {
    loginRecaptchaId = grecaptcha.render('loginRecaptcha', { sitekey: RECAPTCHA_SITE_KEY });
    signupRecaptchaId = grecaptcha.render('signupRecaptcha', { sitekey: RECAPTCHA_SITE_KEY });
}

let currentUser = null;
let currentPage = 'feed';
let feedProducts = [];
let feedPage = 0;
let isLoadingFeed = false;
let currentProductDetail = null;
let currentModalProduct = null;
let currentFilterCategory = 'all';
let cart = [];
let likedProducts = new Set();
let selectedImages = [];
let lastTap = 0;
let pullStartY = 0;
let isPulling = false;

// Demo products for first-time load
const demoProducts = [
    { name: 'Wireless Headphones', desc: 'Premium sound quality with noise cancellation', price: 199, category: 'tech', images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800', 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800'], username: 'TechStore', avatar: 'https://i.pravatar.cc/150?img=1' },
    { name: 'Summer Dress', desc: 'Elegant floral pattern perfect for summer days', price: 89, category: 'fashion', images: ['https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800', 'https://images.unsplash.com/photo-1568251188392-ae32f898cb3b?w=800'], username: 'FashionHub', avatar: 'https://i.pravatar.cc/150?img=5' },
    { name: 'Smart Watch', desc: 'Track your fitness and stay connected', price: 299, category: 'tech', images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800', 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800'], username: 'TechGadgets', avatar: 'https://i.pravatar.cc/150?img=3' },
    { name: 'Skincare Set', desc: 'Complete routine for glowing skin', price: 149, category: 'beauty', images: ['https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800', 'https://images.unsplash.com/photo-1571875257727-256c39da42af?w=800'], username: 'BeautyWorld', avatar: 'https://i.pravatar.cc/150?img=9' },
    { name: 'Running Shoes', desc: 'Lightweight and comfortable for all terrains', price: 129, category: 'sports', images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800', 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800'], username: 'SportsPro', avatar: 'https://i.pravatar.cc/150?img=12' },
    { name: 'Minimalist Lamp', desc: 'Modern design for your workspace', price: 79, category: 'home', images: ['https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800'], username: 'HomeStyle', avatar: 'https://i.pravatar.cc/150?img=20' }
];

// Init
(async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        currentUser = session.user;
        await loadUserProfile();
        showApp();
    } else {
        document.getElementById('loadingScreen').classList.add('hidden');
        showAuth();
    }
})();

supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
        currentUser = session.user;
        loadUserProfile();
        showApp();
    } else if (event === 'SIGNED_OUT') {
        currentUser = null;
        showAuth();
    }
});

// Auth Functions
function showAuth() {
    document.getElementById('authModal').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
}

function closeAuth() {
    document.getElementById('authModal').classList.add('hidden');
}

function toggleAuthForm() {
    document.getElementById('loginForm').classList.toggle('hidden');
    document.getElementById('signupForm').classList.toggle('hidden');
}

async function handleSignup() {
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const username = document.getElementById('signupUsername').value;

    if (!email || !password || !username) {
        showToast('Please fill all fields');
        return;
    }

    const recaptchaToken = signupRecaptchaId !== null ? grecaptcha.getResponse(signupRecaptchaId) : '';
    if (!recaptchaToken) {
        showToast('Please complete the reCAPTCHA');
        return;
    }

    const { data, error } = await supabaseClient.auth.signUp({
        email, password,
        options: { data: { username, avatar: `https://ui-avatars.com/api/?name=${username}&background=ec4899&color=fff` } }
    });

    if (error) {
        showToast(error.message);
        grecaptcha.reset(signupRecaptchaId);
    } else {
        showToast('Account created! Please check your email');
        grecaptcha.reset(signupRecaptchaId);
        toggleAuthForm();
    }
}

async function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const recaptchaToken = loginRecaptchaId !== null ? grecaptcha.getResponse(loginRecaptchaId) : '';
    if (!recaptchaToken) {
        showToast('Please complete the reCAPTCHA');
        return;
    }

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
        showToast(error.message);
        grecaptcha.reset(loginRecaptchaId);
    } else {
        grecaptcha.reset(loginRecaptchaId);
    }
}

async function handleLogout() {
    await supabaseClient.auth.signOut();
}

async function loadUserProfile() {
    if (!currentUser) return;
    document.getElementById('profileUsername').textContent = '@' + (currentUser.user_metadata.username || 'user');
    document.getElementById('profileAvatar').src = currentUser.user_metadata.avatar || 'https://ui-avatars.com/api/?name=User&background=ec4899&color=fff';
    // عرض البايو ورقم الهاتف
    const meta = currentUser.user_metadata || {};
    document.getElementById('profileBio').textContent = meta.bio || 'SwipeShop seller';
    const phoneEl = document.getElementById('profilePhone');
    if (meta.phone) {
        phoneEl.textContent = '📞 ' + meta.phone;
        phoneEl.classList.remove('hidden');
    } else {
        phoneEl.classList.add('hidden');
    }
    loadUserProducts();
    loadLikedProducts();
    loadAnalytics();
}

function showApp() {
    document.getElementById('loadingScreen').classList.add('hidden');
    document.getElementById('authModal').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    loadFeed();
    setupPullToRefresh();
    setupRealtime();
    checkDeepLink();
}

// Page Navigation
function showPage(page, triggerBtn) {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.getElementById(page + 'Page').classList.remove('hidden');
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('text-white');
        btn.classList.add('text-zinc-600');
    });
    const clickedBtn = triggerBtn || (typeof event !== 'undefined' && event && event.currentTarget);
    if (clickedBtn && clickedBtn.classList) {
        clickedBtn.classList.remove('text-zinc-600');
        clickedBtn.classList.add('text-white');
    }
    
    currentPage = page;
    
    if (page === 'search') loadSearchResults();
    if (page === 'profile') loadUserProducts();
}

function showSearch() {
    showPage('search');
    document.querySelectorAll('.nav-btn')[1].classList.replace('text-zinc-600', 'text-white');
}

// ===== خوارزمية الفيد الذكية (مثل TikTok) =====
let viewedProducts = new Set(); // المنتجات التي شاهدها المستخدم
let userInterests = {}; // تتبع اهتمامات المستخدم { category: score }

// تسجيل مشاهدة منتج
async function recordView(productId) {
    if (!productId || viewedProducts.has(productId)) return;
    viewedProducts.add(productId);

    // زيادة عداد المشاهدات في Supabase
    try {
        await supabaseClient.rpc('increment_views', { product_id: productId });
    } catch(e) {
        // fallback: update مباشرة
        try {
            const { data: p } = await supabaseClient.from('products').select('views').eq('id', productId).single();
            await supabaseClient.from('products').update({ views: (p?.views || 0) + 1 }).eq('id', productId);
        } catch(e2) {}
    }

    // تحديث عداد المشاهدات في الـ DOM فوراً
    const feedItem = document.querySelector(`[data-product-id="${productId}"]`);
    if (feedItem) {
        const viewEl = feedItem.querySelector('.views-count');
        if (viewEl) viewEl.textContent = parseInt(viewEl.textContent || '0') + 1;
    }
}

// حساب نقاط المنتج بناءً على اهتمامات المستخدم
function scoreProduct(product) {
    let score = 0;

    // عامل التفاعل (likes + comments + views)
    const likes = product.likes || 0;
    const comments = product.comments || 0;
    const views = product.views || 1;
    const engagementRate = (likes + comments * 2) / Math.max(views, 1);
    score += engagementRate * 50;

    // عامل الحداثة — المنتجات الجديدة تأخذ أولوية
    const createdAt = product.created_at ? new Date(product.created_at) : new Date(0);
    const ageHours = (Date.now() - createdAt.getTime()) / 3600000;
    score += Math.max(0, 100 - ageHours * 0.5);

    // عامل الاهتمام الشخصي
    const catScore = userInterests[product.category] || 0;
    score += catScore * 30;

    // عامل عشوائي (للتنوع — مثل TikTok)
    score += Math.random() * 20;

    // عقوبة المنتجات المشاهدة
    if (viewedProducts.has(product.id)) score -= 200;

    return score;
}

// Feed
async function loadFeed(refresh = false) {
    if (isLoadingFeed) return;
    isLoadingFeed = true;
    
    if (refresh) {
        feedPage = 0;
        feedProducts = [];
        document.getElementById('feedContainer').innerHTML = '';
    }
    
    // جلب عدد أكبر من المنتجات للخوارزمية
    const { data, error } = await supabaseClient
        .from('products')
        .select('*')
        .range(feedPage * 10, (feedPage + 1) * 10 - 1);
    
    let products = data;
    if (error || !data || data.length === 0) {
        products = demoProducts;
        if (feedPage === 0) showToast('Demo mode — Connect Supabase to see real products');
    }

    // ترتيب المنتجات بالخوارزمية الذكية
    const scored = products
        .map(p => ({ p, score: scoreProduct(p) }))
        .sort((a, b) => b.score - a.score)
        .map(({ p }) => p);
    
    feedProducts = [...feedProducts, ...scored];
    renderFeed(scored, !refresh);
    feedPage++;
    isLoadingFeed = false;
}

function renderFeed(products, append = true) {
    const container = document.getElementById('feedContainer');
    if (!append) container.innerHTML = '';
    
    products.forEach((product, idx) => {
        const item = document.createElement('div');
        item.className = 'feed-item relative w-full h-screen';
        item.dataset.productId = product.id || idx;
        
        const images = Array.isArray(product.images) ? product.images : 
                       [product.images || 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=800'];
        
        item.innerHTML = `
            <div class="absolute inset-0" ondblclick="handleDoubleTap('${product.id || idx}')">
                <div class="product-carousel h-full relative" data-current="0">
                    ${images.map((img, i) => `
                        <img src="${img}" class="absolute inset-0 w-full h-full object-cover ${i === 0 ? '' : 'hidden'}" alt="${product.name}">
                    `).join('')}
                    
                    ${images.length > 1 ? `
                        <div class="carousel-dots absolute bottom-24 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                            ${images.map((_, i) => `<div class="w-2 h-2 rounded-full bg-white/50 transition-all ${i === 0 ? 'active' : ''}"></div>`).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <!-- Like Animation -->
            <div class="like-icon absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none hidden">
                <i class="fa-solid fa-heart text-white text-[100px]"></i>
            </div>
            
            <!-- Info Overlay -->
            <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 pb-24">
                <div class="flex items-end justify-between">
                    <div class="flex-1 mr-4" onclick="showProductDetail(${JSON.stringify(product).replace(/"/g, '&quot;')})">
                        <div class="flex items-center gap-2 mb-2">
                            <img src="${product.avatar || product.user_avatar || 'https://i.pravatar.cc/150?img=' + idx}" class="w-8 h-8 rounded-full">
                            <span class="font-semibold text-sm">${product.username || product.seller || '@seller'}</span>
                        </div>
                        <h3 class="font-bold text-lg mb-1">${product.name}</h3>
                        <p class="text-zinc-300 text-sm mb-2 swipe-desc-only">${product.desc || product.description || ''}</p>
                        <div class="text-2xl font-bold mb-2">LYD${product.price}</div>
                        <button onclick="openWhatsApp('${product.phone || ""}', '${product.name}')" class="bg-green-500 rounded-full px-3 py-1.5 text-xs font-semibold flex items-center gap-1 w-fit">
                            <i class="fa-brands fa-whatsapp"></i> واتساب
                        </button>
                    </div>
                    
                    <div class="flex flex-col gap-4">
                        <button onclick="toggleLike('${product.id || idx}', this)" class="flex flex-col items-center">
                            <i class="fa-${likedProducts.has(product.id || idx) ? 'solid text-pink-500' : 'regular'} fa-heart text-3xl"></i>
                            <span class="text-xs mt-1">${product.likes || 0}</span>
                        </button>
                        <button onclick="showComments('${product.id || idx}')" class="flex flex-col items-center">
                            <i class="fa-regular fa-comment text-3xl"></i>
                            <span class="text-xs mt-1">${product.comments || 0}</span>
                        </button>
                        <!-- عداد المشاهدات -->
                        <div class="flex flex-col items-center">
                            <i class="fa-solid fa-eye text-3xl text-zinc-300"></i>
                            <span class="views-count text-xs mt-1">${product.views || 0}</span>
                        </div>
                        <button onclick="addToCart(${JSON.stringify(product).replace(/"/g, '&quot;')})" class="flex flex-col items-center">
                            <i class="fa-solid fa-bag-shopping text-3xl"></i>
                        </button>
                        <button onclick="shareProduct(${JSON.stringify(product).replace(/"/g, '&quot;')})" class="flex flex-col items-center">
                            <i class="fa-solid fa-share-nodes text-3xl"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        container.appendChild(item);
        
        // Carousel swipe
        if (images.length > 1) {
            addCarouselSwipe(item.querySelector('.product-carousel'), images.length);
        }
    });

    // Intersection Observer — يسجل المشاهدة عند توقف المستخدم على المنتج
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.7) {
                const productId = entry.target.dataset.productId;
                // انتظر ثانيتين قبل تسجيل المشاهدة
                entry.target._viewTimer = setTimeout(() => {
                    recordView(productId);
                    // تحديث اهتمامات المستخدم
                    const product = feedProducts.find(p => String(p.id) === String(productId));
                    if (product?.category) {
                        userInterests[product.category] = (userInterests[product.category] || 0) + 1;
                    }
                }, 2000);
            } else {
                clearTimeout(entry.target._viewTimer);
            }
        });
    }, { threshold: 0.7 });

    container.querySelectorAll('.feed-item').forEach(item => observer.observe(item));
    
    // Infinite scroll
    container.onscroll = () => {
        if (container.scrollTop + container.clientHeight >= container.scrollHeight - 100) {
            loadFeed();
        }
    };
}

function addCarouselSwipe(carousel, totalImages) {
    let startX = 0;
    let startY = 0;
    let currentIdx = 0;

    // السحب باللمس
    carousel.addEventListener('touchstart', e => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    }, { passive: true });

    carousel.addEventListener('touchend', e => {
        const diffX = e.changedTouches[0].clientX - startX;
        const diffY = e.changedTouches[0].clientY - startY;
        // فقط إذا كان الحركة أفقية أكثر من عمودية
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
            if (diffX > 0 && currentIdx > 0) currentIdx--;
            else if (diffX < 0 && currentIdx < totalImages - 1) currentIdx++;
            updateCarousel(carousel, currentIdx);
        }
    }, { passive: true });

    // الضغط على يمين/يسار الشاشة للتبديل
    carousel.addEventListener('click', e => {
        const rect = carousel.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const third = rect.width / 3;

        if (x < third && currentIdx > 0) {
            currentIdx--;
            updateCarousel(carousel, currentIdx);
        } else if (x > third * 2 && currentIdx < totalImages - 1) {
            currentIdx++;
            updateCarousel(carousel, currentIdx);
        }
        // المنطقة الوسطى تفتح التفاصيل (onclick الموجود على الـ parent)
    });

    // أسهم يمين/يسار مرئية (تظهر عند وجود أكثر من صورة)
    const leftArrow = document.createElement('button');
    leftArrow.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
    leftArrow.className = 'carousel-arrow carousel-arrow-left absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-black/40 rounded-full w-8 h-8 flex items-center justify-center text-white opacity-0 transition-opacity';
    const rightArrow = document.createElement('button');
    rightArrow.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
    rightArrow.className = 'carousel-arrow carousel-arrow-right absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-black/40 rounded-full w-8 h-8 flex items-center justify-center text-white opacity-0 transition-opacity';

    function updateArrows() {
        leftArrow.style.opacity = currentIdx > 0 ? '1' : '0';
        rightArrow.style.opacity = currentIdx < totalImages - 1 ? '1' : '0';
    }

    leftArrow.addEventListener('click', e => {
        e.stopPropagation();
        if (currentIdx > 0) { currentIdx--; updateCarousel(carousel, currentIdx); updateArrows(); }
    });
    rightArrow.addEventListener('click', e => {
        e.stopPropagation();
        if (currentIdx < totalImages - 1) { currentIdx++; updateCarousel(carousel, currentIdx); updateArrows(); }
    });

    carousel.style.position = 'relative';
    carousel.appendChild(leftArrow);
    carousel.appendChild(rightArrow);

    // أظهر الأسهم عند التمرير فوقها (موبايل: دائماً)
    carousel.addEventListener('mouseenter', updateArrows);
    carousel.addEventListener('mouseleave', () => {
        leftArrow.style.opacity = '0';
        rightArrow.style.opacity = '0';
    });
    updateArrows();
    setTimeout(updateArrows, 100);
}

function updateCarousel(carousel, idx) {
    const imgs = carousel.querySelectorAll('img');
    const dots = carousel.querySelectorAll('.carousel-dots div');
    imgs.forEach((img, i) => img.classList.toggle('hidden', i !== idx));
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === idx);
    });
    carousel.dataset.current = idx;
}

function handleDoubleTap(productId) {
    const item = document.querySelector(`[data-product-id="${productId}"]`);
    const likeIcon = item.querySelector('.like-icon');
    likeIcon.classList.remove('hidden');
    likeIcon.classList.add('like-animation');
    
    if (!likedProducts.has(productId)) {
        toggleLike(productId, item.querySelector('.fa-heart').parentElement);
    }
    
    setTimeout(() => {
        likeIcon.classList.add('hidden');
        likeIcon.classList.remove('like-animation');
    }, 1000);
}

async function toggleLike(productId, btn) {
    const icon = btn.querySelector('i');
    const countEl = btn.querySelector('span');
    const isLiked = likedProducts.has(productId);
    let currentCount = parseInt(countEl?.textContent || '0');

    // تحديث فوري للواجهة
    if (isLiked) {
        likedProducts.delete(productId);
        icon.classList.replace('fa-solid', 'fa-regular');
        icon.classList.remove('text-pink-500');
        currentCount = Math.max(0, currentCount - 1);
    } else {
        likedProducts.add(productId);
        icon.classList.replace('fa-regular', 'fa-solid');
        icon.classList.add('text-pink-500');
        currentCount++;
    }
    if (countEl) countEl.textContent = currentCount;

    // تحديث Supabase
    if (currentUser) {
        try {
            // سجّل/احذف اللايك في جدول likes
            if (!isLiked) {
                await supabaseClient.from('likes').upsert({
                    user_id: currentUser.id,
                    product_id: productId,
                    liked: true
                }, { onConflict: 'user_id,product_id' });
            } else {
                await supabaseClient.from('likes')
                    .delete()
                    .eq('user_id', currentUser.id)
                    .eq('product_id', productId);
            }
            // احسب العدد الحقيقي من DB وحدّث العمود
            const { count } = await supabaseClient
                .from('likes')
                .select('id', { count: 'exact', head: true })
                .eq('product_id', productId)
                .eq('liked', true);
            if (count !== null) {
                await supabaseClient.from('products')
                    .update({ likes: count })
                    .eq('id', productId);
                if (countEl) countEl.textContent = count;
            }
        } catch (err) {
            console.error('Like update error:', err);
        }
    }
}

function setupPullToRefresh() {
    const container = document.getElementById('feedContainer');
    const indicator = document.getElementById('pullIndicator');
    let didPullEnough = false;
    
    container.addEventListener('touchstart', e => {
        if (container.scrollTop === 0) {
            pullStartY = e.touches[0].clientY;
            isPulling = true;
            didPullEnough = false;
        }
    });
    
    container.addEventListener('touchmove', e => {
        if (!isPulling) return;
        const diff = e.touches[0].clientY - pullStartY;
        if (diff > 0 && diff < 100) {
            indicator.style.transform = `translateY(${diff - 64}px)`;
            didPullEnough = diff > 60;
        }
    });
    
    container.addEventListener('touchend', () => {
        if (!isPulling) return;
        isPulling = false;
        indicator.style.transform = 'translateY(-100%)';
        
        if (didPullEnough) {
            loadFeed(true);
            showToast('Feed refreshed');
        }
        didPullEnough = false;
    });
}

// Comments
function showComments(productId) {
    currentProductDetail = productId;
    document.getElementById('commentsDrawer').classList.remove('hidden');
    loadComments(productId);
}

function closeComments() {
    document.getElementById('commentsDrawer').classList.add('hidden');
}

async function loadComments(productId) {
    const { data } = await supabaseClient
        .from('comments')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });
    
    const comments = data || [
        { username: 'buyer123', text: 'Love this! 😍', avatar: 'https://i.pravatar.cc/150?img=10' },
        { username: 'shopper', text: 'Is this still available?', avatar: 'https://i.pravatar.cc/150?img=15' }
    ];
    
    document.getElementById('commentsCount').textContent = comments.length;
    document.getElementById('commentsList').innerHTML = comments.map(c => `
        <div class="flex gap-3">
            <img src="${c.avatar || 'https://i.pravatar.cc/150?img=1'}" class="w-8 h-8 rounded-full">
            <div class="flex-1">
                <div class="font-semibold text-sm">${c.username || 'User'}</div>
                <div class="text-zinc-300 text-sm">${c.text}</div>
            </div>
        </div>
    `).join('');
}

async function sendComment() {
    const input = document.getElementById('commentInput');
    const text = input.value.trim();
    if (!text || !currentUser) {
        if (!currentUser) showToast('Please login to comment');
        return;
    }

    try {
        const { error } = await supabaseClient.from('comments').insert({
            user_id: currentUser.id,
            product_id: currentProductDetail,
            text,
            username: currentUser.user_metadata?.username || 'user',
            avatar: currentUser.user_metadata?.avatar || ''
        });
        if (error) throw error;

        input.value = '';
        await loadComments(currentProductDetail);

        // احسب العدد الحقيقي وحدّث العمود + الواجهة
        const { count } = await supabaseClient
            .from('comments')
            .select('id', { count: 'exact', head: true })
            .eq('product_id', currentProductDetail);

        if (count !== null) {
            await supabaseClient.from('products')
                .update({ comments: count })
                .eq('id', currentProductDetail);
            // حدّث زر التعليق في الفيد
            const feedItem = document.querySelector(`[data-product-id="${currentProductDetail}"]`);
            if (feedItem) {
                const commentBtn = feedItem.querySelectorAll('.flex.flex-col.items-center')[1];
                if (commentBtn) {
                    const span = commentBtn.querySelector('span');
                    if (span) span.textContent = count;
                }
            }
        }
        showToast('💬 Comment posted');
    } catch (err) {
        console.error('Comment error:', err);
        showToast('❌ Failed to post comment');
    }
}

// Cart
function addToCart(product) {
    const existing = cart.find(i => i.id === (product.id || product.name));
    if (existing) existing.qty++;
    else cart.push({ ...product, id: product.id || product.name, qty: 1 });
    
    updateCartBadge();
    showToast('Added to cart');
}

function updateCartBadge() {
    const badge = document.getElementById('cartBadge');
    const count = cart.reduce((sum, i) => sum + i.qty, 0);
    badge.textContent = count;
    badge.classList.toggle('hidden', count === 0);
}

function showCart() {
    document.getElementById('cartDrawer').classList.remove('hidden');
    renderCart();
}

function closeCart() {
    document.getElementById('cartDrawer').classList.add('hidden');
}

function renderCart() {
    const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    document.getElementById('cartTotal').textContent = `$${total.toFixed(2)}`;
    
    document.getElementById('cartItems').innerHTML = cart.length === 0 ? 
        '<div class="text-center text-zinc-400 py-12">Your cart is empty</div>' :
        cart.map((item, idx) => `
            <div class="bg-zinc-900 rounded-xl p-3 flex gap-3">
                <img src="${Array.isArray(item.images) ? item.images[0] : item.images}" class="w-20 h-20 rounded-lg object-cover">
                <div class="flex-1">
                    <div class="font-semibold text-sm mb-1">${item.name}</div>
                    <div class="text-pink-500 font-bold">$${item.price}</div>
                    <div class="flex items-center gap-2 mt-2">
                        <button onclick="updateCartQty(${idx}, -1)" class="bg-zinc-800 w-7 h-7 rounded flex items-center justify-center"><i class="fa-solid fa-minus text-xs"></i></button>
                        <span class="text-sm">${item.qty}</span>
                        <button onclick="updateCartQty(${idx}, 1)" class="bg-zinc-800 w-7 h-7 rounded flex items-center justify-center"><i class="fa-solid fa-plus text-xs"></i></button>
                    </div>
                </div>
                <button onclick="removeFromCart(${idx})" class="text-zinc-400"><i class="fa-solid fa-trash"></i></button>
            </div>
        `).join('');
}

function updateCartQty(idx, delta) {
    cart[idx].qty += delta;
    if (cart[idx].qty <= 0) cart.splice(idx, 1);
    renderCart();
    updateCartBadge();
}

function removeFromCart(idx) {
    cart.splice(idx, 1);
    renderCart();
    updateCartBadge();
}

function checkout() {
    if (cart.length === 0) return;
    showToast('Order placed! Check your messages');
    cart = [];
    updateCartBadge();
    closeCart();
}

// Product Detail
function showProductDetail(product) {
    currentProductDetail = product;
    currentModalProduct = product;
    document.getElementById('productModal').classList.remove('hidden');
    const images = Array.isArray(product.images) ? product.images : [product.images];
    
    document.getElementById('productModalContent').innerHTML = `
        <div class="product-carousel h-96 relative" data-current="0">
            ${images.map((img, i) => `
                <img src="${img}" class="absolute inset-0 w-full h-full object-cover ${i === 0 ? '' : 'hidden'}">
            `).join('')}
            ${images.length > 1 ? `
                <div class="carousel-dots absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                    ${images.map((_, i) => `<div class="w-2 h-2 rounded-full bg-white/50 ${i === 0 ? 'active' : ''}"></div>`).join('')}
                </div>
                <button id="modalPrevBtn" class="absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-black/50 rounded-full w-9 h-9 flex items-center justify-center text-white" style="display:none">
                    <i class="fa-solid fa-chevron-left"></i>
                </button>
                <button id="modalNextBtn" class="absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-black/50 rounded-full w-9 h-9 flex items-center justify-center text-white">
                    <i class="fa-solid fa-chevron-right"></i>
                </button>
            ` : ''}
        </div>`;

    // إضافة منطق الكاروسيل للـ modal
    if (images.length > 1) {
        const modalCarousel = document.querySelector('#productModalContent .product-carousel');
        let mIdx = 0;
        const prevBtn = document.getElementById('modalPrevBtn');
        const nextBtn = document.getElementById('modalNextBtn');

        function updateModalCarousel() {
            updateCarousel(modalCarousel, mIdx);
            if (prevBtn) prevBtn.style.display = mIdx > 0 ? 'flex' : 'none';
            if (nextBtn) nextBtn.style.display = mIdx < images.length - 1 ? 'flex' : 'none';
        }

        if (prevBtn) prevBtn.addEventListener('click', e => { e.stopPropagation(); if (mIdx > 0) { mIdx--; updateModalCarousel(); } });
        if (nextBtn) nextBtn.addEventListener('click', e => { e.stopPropagation(); if (mIdx < images.length - 1) { mIdx++; updateModalCarousel(); } });

        // سحب باللمس
        let mStartX = 0;
        modalCarousel.addEventListener('touchstart', e => mStartX = e.touches[0].clientX, { passive: true });
        modalCarousel.addEventListener('touchend', e => {
            const diff = e.changedTouches[0].clientX - mStartX;
            if (Math.abs(diff) > 40) {
                if (diff > 0 && mIdx > 0) mIdx--;
                else if (diff < 0 && mIdx < images.length - 1) mIdx++;
                updateModalCarousel();
            }
        }, { passive: true });

        // ضغط يمين/يسار
        modalCarousel.addEventListener('click', e => {
            const rect = modalCarousel.getBoundingClientRect();
            const x = e.clientX - rect.left;
            if (x < rect.width / 3 && mIdx > 0) { mIdx--; updateModalCarousel(); }
            else if (x > rect.width * 2 / 3 && mIdx < images.length - 1) { mIdx++; updateModalCarousel(); }
        });
    }

    const detailDiv = document.createElement('div');
    detailDiv.innerHTML = `
        <div class="p-4 space-y-4">
            <div>
                <h2 class="text-2xl font-bold mb-2">${product.name}</h2>
                <div class="text-3xl font-bold text-pink-500">$${product.price}</div>
            </div>
            
            <div class="flex items-center gap-3 pb-4 border-b border-zinc-900">
                <img src="${product.user_avatar || product.avatar || product.seller_avatar || 'https://i.pravatar.cc/150?img=' + (product.user_id || 1)}" class="w-10 h-10 rounded-full object-cover">
                <div>
                    <div class="font-semibold">${product.username || '@seller'}</div>
                    <div class="text-zinc-400 text-sm">Verified Seller</div>
                </div>
                <button onclick="startChat('${product.username}')" class="ml-auto bg-zinc-800 px-4 py-2 rounded-xl text-sm font-semibold">
                    <i class="fa-solid fa-message mr-2"></i>Message
                </button>
            </div>
            
            <div>
                <h3 class="font-bold mb-2">Description</h3>
                <p class="text-zinc-300" style="word-break:break-word">${product.desc || product.description}</p>
            </div>
            
            <div class="grid grid-cols-2 gap-3">
                <button onclick='addToCart(${JSON.stringify(product).replace(/"/g, '&quot;')}); closeProductModal()' class="bg-gradient-to-r from-pink-500 to-violet-500 rounded-xl py-3 font-semibold">
                    Add to Cart
                </button>
                <button onclick="openWhatsApp('${product.phone || ''}', '${product.name}')" class="bg-green-500 rounded-xl py-3 font-semibold flex items-center justify-center gap-2">
                    <i class="fa-brands fa-whatsapp text-xl"></i> WhatsApp
                </button>
            </div>
        </div>
    `;
    document.getElementById('productModalContent').appendChild(detailDiv);
}

function closeProductModal() {
    document.getElementById('productModal').classList.add('hidden');
}

// Share
function shareProduct(product) {
    // ← غيّر هذا برابط Worker الخاص بك بعد النشر
    const WORKER_URL = 'https://damp-boat-35cd.drspeed4real.workers.dev';
    
    const url = `${WORKER_URL}/?product=${product.id || encodeURIComponent(product.name)}`;
    
    if (navigator.share) {
        navigator.share({
            title: product.name,
            text: product.desc || product.description || '',
            url: url
        }).catch(() => {
            navigator.clipboard.writeText(url);
            showToast('تم نسخ الرابط!');
        });
    } else {
        navigator.clipboard.writeText(url);
        showToast('تم نسخ الرابط!');
    }
}

function shareCurrentProduct() {
    if (currentModalProduct) shareProduct(currentModalProduct);
}

// ===== خوارزمية البحث المتطورة =====
function searchScore(product, query) {
    if (!query) return 1;
    const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const name = (product.name || '').toLowerCase();
    const desc = (product.desc || product.description || '').toLowerCase();
    const cat = (product.category || '').toLowerCase();
    const seller = (product.username || '').toLowerCase();
    let score = 0;
    for (const term of terms) {
        if (name === term) score += 100;
        else if (name.startsWith(term)) score += 60;
        else if (name.includes(term)) score += 40;
        if (desc.includes(term)) score += 20;
        if (cat.includes(term)) score += 30;
        if (seller.includes(term)) score += 15;
        // fuzzy match
        let fi = 0, fuzzy = true;
        for (const ch of term) {
            const idx = name.indexOf(ch, fi);
            if (idx === -1) { fuzzy = false; break; }
            fi = idx + 1;
        }
        if (fuzzy && score === 0) score += 5;
    }
    score += Math.min((product.likes || 0) / 10, 10);
    return score;
}

function highlightText(text, query) {
    if (!query || !text) return text || '';
    const terms = query.trim().split(/\s+/).filter(Boolean);
    let result = text;
    for (const term of terms) {
        const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        result = result.replace(regex, '<mark style="background:#ec489940;color:#ec4899;border-radius:2px">$1</mark>');
    }
    return result;
}

async function loadSearchResults() {
    const query = document.getElementById('searchInput').value.trim();
    let products = [...demoProducts];
    const { data } = await supabaseClient.from('products').select('*');
    if (data && data.length > 0) products = data;

    const scored = products
        .map(p => ({ p, score: searchScore(p, query) }))
        .filter(({ p, score }) => {
            if (currentFilterCategory !== 'all' && p.category !== currentFilterCategory) return false;

            const minPrice = parseFloat(document.getElementById('minPriceFilter')?.value) || 0;
            const maxPrice = parseFloat(document.getElementById('maxPriceFilter')?.value) || Infinity;
            const productPrice = parseFloat(p.price) || 0;

            if (productPrice < minPrice || productPrice > maxPrice) return false;

            return !query || score > 0;
        })
        .sort((a, b) => b.score - a.score);

    const filtered = scored.map(({ p }) => p);

    if (filtered.length === 0) {
        document.getElementById('searchResults').innerHTML = `
            <div class="col-span-2 text-center py-16 text-zinc-500">
                <i class="fa-solid fa-magnifying-glass text-4xl mb-3 block"></i>
                <div>No results for "<span class="text-white">${query}</span>"</div>
                <div class="text-sm mt-1">Try different keywords</div>
            </div>`;
        return;
    }

    document.getElementById('searchResults').innerHTML = filtered.map(p => {
        const img = Array.isArray(p.images) ? p.images[0] : p.images;
        const desc = (p.desc || p.description || '').slice(0, 50);
        return `
        <div class="bg-zinc-900 rounded-xl overflow-hidden cursor-pointer transition hover:ring-2 hover:ring-pink-500"
             onclick='showProductDetail(${JSON.stringify(p).replace(/"/g, '&quot;')})'>
            <div class="relative">
                <img src="${img}" class="w-full h-40 object-cover">
                ${(p.likes || 0) > 5 ? `<div class="absolute top-2 right-2 bg-pink-500 rounded-full px-2 py-0.5 text-xs font-bold">🔥</div>` : ''}
            </div>
            <div class="p-3">
                <div class="font-semibold text-sm truncate">${highlightText(p.name, query)}</div>
                <div class="text-zinc-400 text-xs truncate mt-0.5">${highlightText(desc, query)}</div>
                <div class="flex items-center justify-between mt-2">
                    <div class="text-pink-500 font-bold">$${p.price}</div>
                    <div class="text-zinc-500 text-xs flex items-center gap-1">
                        <i class="fa-solid fa-heart text-pink-400/60"></i> ${p.likes || 0}
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
}

function handleSearch() {
    loadSearchResults();
}


function toggleFilterPanel() {
    const panel = document.getElementById('filterPanel');
    if (!panel) return;
    panel.classList.toggle('hidden');
}

function filterCategory(cat, el) {
    currentFilterCategory = cat;
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('bg-pink-500');
        btn.classList.add('bg-zinc-800');
    });
    const btn = el || (typeof event !== 'undefined' && event && event.currentTarget);
    if (btn) {
        btn.classList.remove('bg-zinc-800');
        btn.classList.add('bg-pink-500');
    }
    loadSearchResults();
}

// Create Product
function handleImagePreview(e) {
    const newFiles = Array.from(e.target.files);
    const remaining = 5 - selectedImages.length;

    if (remaining <= 0) {
        showToast('الحد الأقصى 5 صور');
        return;
    }

    const toAdd = newFiles.slice(0, remaining);
    if (newFiles.length > remaining) {
        showToast(`تم إضافة ${toAdd.length} صورة فقط — الحد الأقصى 5`);
    }

    selectedImages = [...selectedImages, ...toAdd];
    refreshImagePreview();
}

function refreshImagePreview() {
    document.getElementById('imagePreview').innerHTML = selectedImages.map((file, i) => `
        <div class="relative flex-shrink-0">
            <img src="${URL.createObjectURL(file)}" class="w-20 h-20 rounded-lg object-cover">
            <button onclick="removeImage(${i})" class="absolute -top-2 -right-2 bg-pink-500 rounded-full w-6 h-6 flex items-center justify-center">
                <i class="fa-solid fa-xmark text-xs"></i>
            </button>
            ${i === 0 ? '<div class="absolute bottom-0 left-0 right-0 bg-black/60 text-[9px] text-center rounded-b-lg">رئيسية</div>' : ''}
        </div>
    `).join('');

    // أظهر عداد الصور
    const counter = document.getElementById('imageCounter');
    if (counter) counter.textContent = `${selectedImages.length}/5`;
}

function removeImage(idx) {
    selectedImages.splice(idx, 1);
    refreshImagePreview();
}

async function createProduct() {
    if (!currentUser) {
        showToast('Please login first');
        return;
    }
    
    const name = document.getElementById('productName').value;
    const desc = document.getElementById('productDesc').value;
    const price = document.getElementById('productPrice').value;
    const category = document.getElementById('productCategory').value;
    
    if (!name || !desc || !price || !category || selectedImages.length === 0) {
        showToast('Please fill all fields and add images');
        return;
    }
    
    document.getElementById('createBtn').disabled = true;
    document.getElementById('createBtn').textContent = 'Creating...';
    
    try {
        // Upload images
        const imageUrls = [];
        for (const file of selectedImages) {
            const fileName = `${currentUser.id}/${Date.now()}_${file.name}`;
            const { data, error } = await supabaseClient.storage
                .from('products')
                .upload(fileName, file);
            
            if (!error) {
                const { data: { publicUrl } } = supabaseClient.storage.from('products').getPublicUrl(fileName);
                imageUrls.push(publicUrl);
            }
        }
        
        // Use placeholder if upload fails
        if (imageUrls.length === 0) {
            imageUrls.push('https://images.unsplash.com/photo-1560343090-f0409e92791a?w=800');
        }
        
        const { error } = await supabaseClient.from('products').insert({
            user_id: currentUser.id,
            name, description: desc, price: parseFloat(price),
            category, images: imageUrls,
            username: currentUser.user_metadata.username,
            user_avatar: currentUser.user_metadata.avatar,
            phone: currentUser.user_metadata.phone || '',
            likes: 0, comments: 0, views: 0
        });
        
        if (error) throw error;
        
        showToast('Product created!');
        document.getElementById('productName').value = '';
        document.getElementById('productDesc').value = '';
        document.getElementById('productPrice').value = '';
        document.getElementById('productCategory').value = '';
        document.getElementById('imagePreview').innerHTML = '';
        selectedImages = [];
        showPage('feed');
        loadFeed(true);
    } catch (e) {
        showToast('Error: Create products table in Supabase');
        console.error(e);
    } finally {
        document.getElementById('createBtn').disabled = false;
        document.getElementById('createBtn').textContent = 'Create Product';
    }
}

// Profile
async function loadUserProducts() {
    if (!currentUser) return;
    
    const { data, error } = await supabaseClient
        .from('products')
        .select('*')
        .eq('user_id', currentUser.id);

    // لو فيه خطأ أو ما رجع بيانات، لا تعرض demoProducts أبداً
    const products = (data && !error) ? data : [];
    document.getElementById('profileProducts').textContent = products.length;
    
    document.getElementById('profileProductsGrid').innerHTML = products.map(p => {
        const imageUrl = Array.isArray(p.images) ? p.images[0] : (p.images || '');
        const isOwner = currentUser && currentUser.id === p.user_id;

        return `
        <div class="relative" data-card-product-id="${p.id}">
            <img src="${imageUrl}" 
                 class="aspect-square object-cover w-full h-full"
                 onclick='showProductDetail(${JSON.stringify(p).replace(/"/g, '&quot;')})'>

            ${isOwner ? `
            <button 
                data-delete-id="${p.id}"
                class="delete-product-btn absolute top-1 right-1 bg-red-600/90 text-white w-7 h-7 rounded-full flex items-center justify-center z-50 hover:bg-red-500">
                <i class="fa-solid fa-trash text-xs pointer-events-none"></i>
            </button>
            ` : ''}
        </div>
        `;
    }).join('');

    // ربط أزرار الحذف بعد رسم الشبكة
    document.querySelectorAll('.delete-product-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.getAttribute('data-delete-id');
            deleteProduct(id);
        });
    });
}


async function deleteProduct(productId) {
    if (!confirm('هل تريد حذف هذا المنتج؟')) return;

    // احذف العنصر من الـ DOM فوراً
    const cardToRemove = document.querySelector(`#profileProductsGrid [data-card-product-id="${productId}"]`);
    if (cardToRemove) cardToRemove.remove();

    // احذف من الـ feed في الذاكرة والـ DOM
    feedProducts = feedProducts.filter(p => String(p.id) !== String(productId));
    const feedItem = document.querySelector(`[data-product-id="${productId}"]`);
    if (feedItem) feedItem.remove();

    // حدّث العداد فوراً
    const counterEl = document.getElementById('profileProducts');
    if (counterEl) counterEl.textContent = Math.max(0, parseInt(counterEl.textContent || '0') - 1);

    try {
        // احذف التعليقات أولاً (foreign key)
        await supabaseClient.from('comments').delete().eq('product_id', productId);
        // احذف اللايكات (foreign key)
        await supabaseClient.from('likes').delete().eq('product_id', productId);
        // احذف المنتج — id نوعه bigint
        const { error } = await supabaseClient
            .from('products')
            .delete()
            .eq('id', productId)
            .eq('user_id', currentUser.id);

        if (error) throw error;
        showToast('✅ تم حذف المنتج');

    } catch (err) {
        console.error('Delete error:', err);
        showToast('❌ فشل الحذف: ' + (err.message || ''));
        loadUserProducts();
    }
}

function loadLikedProducts() {
    const products = Array.from(likedProducts).map(id => 
        feedProducts.find(p => (p.id || feedProducts.indexOf(p)) === id)
    ).filter(Boolean);
    
    document.getElementById('profileLikes').textContent = products.length;
    document.getElementById('profileLikedGrid').innerHTML = products.map(p => `
        <div><img src="${Array.isArray(p.images) ? p.images[0] : p.images}" class="aspect-square object-cover" onclick='showProductDetail(${JSON.stringify(p).replace(/"/g, '&quot;')})'></div>
    `).join('');
}

function showProfileTab(tab, el) {
    document.querySelectorAll('.profile-tab').forEach(t => {
        t.classList.remove('bg-pink-500');
        t.classList.add('bg-zinc-800');
    });
    const clickedEl = el || (typeof event !== 'undefined' && event && event.currentTarget);
    if (clickedEl) {
        clickedEl.classList.add('bg-pink-500');
        clickedEl.classList.remove('bg-zinc-800');
    }
    
    document.getElementById('profileProductsGrid').classList.toggle('hidden', tab !== 'products');
    document.getElementById('profileLikedGrid').classList.toggle('hidden', tab !== 'liked');
}

async function updateAvatar(e) {
    const file = e.target.files[0];
    if (!file || !currentUser) return;

    // عرض preview فوري قبل الرفع
    const localUrl = URL.createObjectURL(file);
    document.getElementById('profileAvatar').src = localUrl;
    showToast('Uploading avatar...');

    try {
        const fileName = `avatars/${currentUser.id}_${Date.now()}`;
        const { error: uploadError } = await supabaseClient.storage
            .from('avatars')
            .upload(fileName, file, { upsert: true, contentType: file.type });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabaseClient.storage.from('avatars').getPublicUrl(fileName);
        const publicUrl = urlData.publicUrl;

        const { error: updateError } = await supabaseClient.auth.updateUser({
            data: { avatar: publicUrl }
        });
        if (updateError) throw updateError;

        // حدّث currentUser وكل مكان يعرض الأفاتار
        if (currentUser.user_metadata) currentUser.user_metadata.avatar = publicUrl;
        document.getElementById('profileAvatar').src = publicUrl;
        URL.revokeObjectURL(localUrl);
        showToast('✅ Avatar updated!');
    } catch (err) {
        console.error('Avatar update failed:', err);
        // ارجع للصورة القديمة عند الخطأ
        document.getElementById('profileAvatar').src =
            currentUser.user_metadata?.avatar || 'https://ui-avatars.com/api/?name=User&background=ec4899&color=fff';
        showToast('❌ Failed to update avatar: ' + (err.message || 'Unknown error'));
    }
}

async function loadAnalytics() {
    if (!currentUser) return;
    
    const { data: products } = await supabaseClient
        .from('products')
        .select('likes, comments')
        .eq('user_id', currentUser.id);
    
    const totalLikes = (products || []).reduce((sum, p) => sum + (p.likes || 0), 0);
    const totalComments = (products || []).reduce((sum, p) => sum + (p.comments || 0), 0);
    const totalProducts = (products || []).length;

    const { data: likesData } = await supabaseClient
        .from('likes')
        .select('id', { count: 'exact' })
        .in('product_id', (products || []).map(p => p.id).filter(Boolean));

    document.getElementById('analyticsViews').textContent = totalLikes.toLocaleString();
    document.getElementById('analyticsOrders').textContent = totalComments;
    document.getElementById('analyticsRevenue').textContent = `${totalProducts} items`;
}

// Messages
function startChat(username) {
    showPage('messages');
    document.querySelectorAll('.nav-btn')[3].classList.replace('text-zinc-600', 'text-white');
    
    const messagesList = document.getElementById('messagesList');
    if (!messagesList.querySelector(`[data-user="${username}"]`)) {
        messagesList.innerHTML += `
            <div data-user="${username}" class="bg-zinc-900 rounded-xl p-4 flex items-center gap-3" onclick="openChat('${username}')">
                <img src="https://i.pravatar.cc/150?img=5" class="w-12 h-12 rounded-full">
                <div class="flex-1">
                    <div class="font-semibold">${username}</div>
                    <div class="text-zinc-400 text-sm">Tap to message</div>
                </div>
                <i class="fa-solid fa-chevron-right text-zinc-600"></i>
            </div>
        `;
    }
    closeProductModal();
}

function openChat(username) {
    showToast(`Chat with ${username} - Coming soon!`);
}

// Realtime
function setupRealtime() {
    supabaseClient
        .channel('products')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'products' }, payload => {
            feedProducts.unshift(payload.new);
            showToast('New product added!');
        })
        .subscribe();
    
    supabaseClient
        .channel('comments')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, payload => {
            if (currentProductDetail === payload.new.product_id) {
                loadComments(payload.new.product_id);
            }
        })
        .subscribe();
}
async function checkDeepLink() {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('product');

    if (!productId) return;

    const { data } = await supabaseClient
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

    if (data) {
        setTimeout(() => showProductDetail(data), 500);
    }
}
// Utilities
function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

function showFilterModal() {
    showToast('Advanced filters coming soon!');
}

// Setup Supabase tables hint
console.log(`
SWIPESHOP SETUP:
Run these SQL commands in Supabase SQL Editor:

-- Products table
CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL,
  category TEXT,
  images TEXT[],
  username TEXT,
  user_avatar TEXT,
  likes INT DEFAULT 0,
  comments INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments table
CREATE TABLE comments (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  product_id BIGINT REFERENCES products(id),
  text TEXT,
  username TEXT,
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Likes table
CREATE TABLE likes (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  product_id BIGINT REFERENCES products(id),
  liked BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public products" ON products FOR SELECT USING (true);
CREATE POLICY "Users insert products" ON products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own products" ON products FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Public comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Auth users comment" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public likes" ON likes FOR SELECT USING (true);
CREATE POLICY "Auth users like" ON likes FOR ALL USING (auth.uid() = user_id);

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('products', 'products', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Storage policies
CREATE POLICY "Public access" ON storage.objects FOR SELECT USING (bucket_id IN ('products', 'avatars'));
CREATE POLICY "Auth upload" ON storage.objects FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND bucket_id IN ('products', 'avatars'));
`);

// فتح واتساب مع رقم البائع
function openWhatsApp(phone, productName) {
    if (!phone) {
        showToast('رقم الواتساب غير متوفر - لم يضف البائع رقمه');
        return;
    }
    
    // نظف الرقم من المسافات والرموز
    phone = phone.replace(/[^0-9+]/g, '');
    
    // لو ما فيه +، ضيف كود السعودية افتراضي
    if (!phone.startsWith('+') && !phone.startsWith('00')) {
        if (phone.startsWith('0')) phone = phone.substring(1);
        phone = '218' + phone; // غير الكود حسب بلدك
    } else if (phone.startsWith('+')) {
        phone = phone.substring(1);
    } else if (phone.startsWith('00')) {
        phone = phone.substring(2);
    }
    
    const message = encodeURIComponent(`مرحبا، مهتم بـ: ${productName}`);
    const url = `https://wa.me/${phone}?text=${message}`;
    window.open(url, '_blank');
}

//تسجيل الدخول عن طريق جوجل

async function loginWithGoogle() {
    const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: 'https://swipeshop1.vercel.app'
        }
    });

    if (error) {
        showToast(error.message);
    }
}

