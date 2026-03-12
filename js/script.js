// ===== Cart State =====
let cart = [];

// ===== DOM Elements =====
const navbar = document.getElementById('navbar');
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
const cartBtn = document.getElementById('cartBtn');
const cartSidebar = document.getElementById('cartSidebar');
const cartOverlay = document.getElementById('cartOverlay');
const cartClose = document.getElementById('cartClose');
const cartItems = document.getElementById('cartItems');
const cartFooter = document.getElementById('cartFooter');
const cartCount = document.getElementById('cartCount');
const cartTotal = document.getElementById('cartTotal');
const checkoutBtn = document.getElementById('checkoutBtn');
const orderModal = document.getElementById('orderModal');
const modalClose = document.getElementById('modalClose');
const orderForm = document.getElementById('orderForm');
const orderSummary = document.getElementById('orderSummary');
const successModal = document.getElementById('successModal');
const successClose = document.getElementById('successClose');
const pickupInfo = document.getElementById('pickupInfo');
const productsGrid = document.getElementById('productsGrid');

// ===== Navbar Scroll =====
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// ===== Mobile Nav =====
navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
});

navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('open');
    });
});

// ===== Category Tabs =====
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const category = tab.dataset.category;
        const cards = document.querySelectorAll('.product-card');

        cards.forEach(card => {
            if (category === 'all' || card.dataset.category === category) {
                card.classList.remove('hidden');
            } else {
                card.classList.add('hidden');
            }
        });
    });
});

// ===== Cart Functions =====
function updateCartUI() {
    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

    // Update count badge
    cartCount.textContent = totalItems;
    if (totalItems > 0) {
        cartCount.classList.add('show');
    } else {
        cartCount.classList.remove('show');
    }

    // Update total
    cartTotal.textContent = total.toFixed(2).replace('.', ',') + ' \u20AC';

    // Show/hide footer
    cartFooter.style.display = cart.length > 0 ? 'block' : 'none';

    // Render items
    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="cart-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
                <p>Votre panier est vide</p>
            </div>
        `;
        return;
    }

    cartItems.innerHTML = cart.map((item, index) => `
        <div class="cart-item">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">${item.price.toFixed(2).replace('.', ',')} \u20AC</div>
            </div>
            <div class="cart-item-controls">
                <button class="qty-btn" onclick="changeQty(${index}, -1)">&minus;</button>
                <span class="cart-item-qty">${item.qty}</span>
                <button class="qty-btn" onclick="changeQty(${index}, 1)">+</button>
            </div>
        </div>
    `).join('');
}

function addToCart(name, price) {
    const existing = cart.find(item => item.name === name);
    if (existing) {
        existing.qty++;
    } else {
        cart.push({ name, price: parseFloat(price), qty: 1 });
    }
    updateCartUI();

    // Open cart sidebar
    openCart();
}

function changeQty(index, delta) {
    cart[index].qty += delta;
    if (cart[index].qty <= 0) {
        cart.splice(index, 1);
    }
    updateCartUI();
}

function openCart() {
    cartSidebar.classList.add('open');
    cartOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeCart() {
    cartSidebar.classList.remove('open');
    cartOverlay.classList.remove('open');
    document.body.style.overflow = '';
}

// ===== Cart Events =====
cartBtn.addEventListener('click', openCart);
cartClose.addEventListener('click', closeCart);
cartOverlay.addEventListener('click', closeCart);

// ===== Add to Cart Buttons =====
document.querySelectorAll('.add-to-cart').forEach(btn => {
    btn.addEventListener('click', () => {
        const name = btn.dataset.name;
        const price = btn.dataset.price;
        addToCart(name, price);

        // Visual feedback
        btn.classList.add('added');
        const originalText = btn.innerHTML;
        btn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            Ajout\u00e9
        `;
        setTimeout(() => {
            btn.classList.remove('added');
            btn.innerHTML = originalText;
        }, 1200);
    });
});

// ===== Checkout =====
checkoutBtn.addEventListener('click', () => {
    closeCart();

    // Set minimum date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('pickupDate').min = tomorrow.toISOString().split('T')[0];

    // Build order summary
    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    orderSummary.innerHTML = `
        <h4>R\u00e9capitulatif</h4>
        ${cart.map(item => `
            <div class="order-summary-item">
                <span>${item.name} x${item.qty}</span>
                <span>${(item.price * item.qty).toFixed(2).replace('.', ',')} \u20AC</span>
            </div>
        `).join('')}
        <div class="order-summary-total">
            <span>Total</span>
            <span>${total.toFixed(2).replace('.', ',')} \u20AC</span>
        </div>
    `;

    orderModal.classList.add('open');
    document.body.style.overflow = 'hidden';
});

// ===== Close Order Modal =====
modalClose.addEventListener('click', () => {
    orderModal.classList.remove('open');
    document.body.style.overflow = '';
});

orderModal.addEventListener('click', (e) => {
    if (e.target === orderModal) {
        orderModal.classList.remove('open');
        document.body.style.overflow = '';
    }
});

// ===== Submit Order =====
orderForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = orderForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Envoi en cours...';

    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const date = document.getElementById('pickupDate').value;
    const time = document.getElementById('pickupTime').value;
    const notes = document.getElementById('notes').value;
    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

    try {
        const res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                firstName,
                lastName,
                email,
                phone,
                pickupDate: date,
                pickupTime: time,
                notes,
                items: cart,
                total
            })
        });

        if (!res.ok) throw new Error('Erreur serveur');

        // Format date for display
        const dateObj = new Date(date + 'T00:00:00');
        const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        const formattedDate = dateObj.toLocaleDateString('fr-FR', options);

        // Close order modal, show success
        orderModal.classList.remove('open');
        pickupInfo.textContent = `Retrait le ${formattedDate} \u00e0 ${time}`;
        successModal.classList.add('open');

        // Clear cart
        cart = [];
        updateCartUI();
        orderForm.reset();
    } catch (err) {
        alert('Erreur lors de l\u2019envoi de la commande. Veuillez r\u00e9essayer.');
        console.error(err);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirmer la commande';
    }
});

// ===== Close Success Modal =====
successClose.addEventListener('click', () => {
    successModal.classList.remove('open');
    document.body.style.overflow = '';
});

// ===== Smooth Scroll for anchor links =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const offset = 80;
            const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
            window.scrollTo({ top, behavior: 'smooth' });
        }
    });
});

// ===== Intersection Observer for fade-in =====
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

document.querySelectorAll('.feature, .contact-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});
