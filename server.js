const express = require('express');
const Database = require('better-sqlite3');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

// ===== Email Setup =====
const BAKERY_EMAIL = process.env.BAKERY_EMAIL || 'ouldjicamil@gmail.com';
const GMAIL_USER = process.env.GMAIL_USER || 'ouldjicamil@gmail.com';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || '';

const transporter = GMAIL_APP_PASSWORD ? nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD }
}) : null;

const app = express();
const PORT = process.env.PORT || 3000;

// ===== Ensure data directory exists =====
// En production (Railway), utiliser un volume persistant via DATA_DIR
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// ===== Database Setup =====
const db = new Database(path.join(dataDir, 'boulangerie.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        pickup_date TEXT NOT NULL,
        pickup_time TEXT NOT NULL,
        notes TEXT,
        items TEXT NOT NULL,
        total REAL NOT NULL,
        status TEXT DEFAULT 'nouvelle',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// ===== Middleware =====
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ===== Email Functions =====
function formatItemsHtml(items) {
    return items.map(item =>
        `<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;">${item.name}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${item.qty}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${(item.price * item.qty).toFixed(2).replace('.', ',')} &euro;</td>
        </tr>`
    ).join('');
}

function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

async function sendBakeryEmail(order) {
    if (!transporter) return;
    const items = JSON.parse(order.items);
    await transporter.sendMail({
        from: `Au Pain Doré <${GMAIL_USER}>`,
        to: BAKERY_EMAIL,
        subject: `Nouvelle commande #${order.id} - ${order.first_name} ${order.last_name}`,
        html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#1a1a1a;color:#ccc;padding:0;">
            <div style="background:#111;padding:24px;text-align:center;border-bottom:2px solid #c9a96e;">
                <h1 style="color:#c9a96e;margin:0;font-size:22px;">Nouvelle Commande #${order.id}</h1>
            </div>
            <div style="padding:24px;">
                <h2 style="color:#c9a96e;font-size:16px;margin:0 0 16px;">Client</h2>
                <p style="margin:4px 0;"><strong style="color:#fff;">${order.first_name} ${order.last_name}</strong></p>
                <p style="margin:4px 0;">Tel: ${order.phone}</p>
                <p style="margin:4px 0;">Email: ${order.email}</p>

                <h2 style="color:#c9a96e;font-size:16px;margin:24px 0 12px;">Retrait</h2>
                <p style="margin:4px 0;color:#fff;font-size:18px;">${formatDate(order.pickup_date)} &agrave; ${order.pickup_time}</p>

                ${order.notes ? `<h2 style="color:#c9a96e;font-size:16px;margin:24px 0 8px;">Notes</h2><p style="margin:0;font-style:italic;">${order.notes}</p>` : ''}

                <h2 style="color:#c9a96e;font-size:16px;margin:24px 0 12px;">Articles</h2>
                <table style="width:100%;border-collapse:collapse;background:#222;border-radius:4px;">
                    <thead>
                        <tr style="border-bottom:2px solid #c9a96e;">
                            <th style="padding:10px 12px;text-align:left;color:#c9a96e;font-size:12px;text-transform:uppercase;">Produit</th>
                            <th style="padding:10px 12px;text-align:center;color:#c9a96e;font-size:12px;text-transform:uppercase;">Qty</th>
                            <th style="padding:10px 12px;text-align:right;color:#c9a96e;font-size:12px;text-transform:uppercase;">Prix</th>
                        </tr>
                    </thead>
                    <tbody>${formatItemsHtml(items)}</tbody>
                    <tfoot>
                        <tr>
                            <td colspan="2" style="padding:12px;text-align:right;color:#fff;font-weight:bold;border-top:2px solid #c9a96e;">Total</td>
                            <td style="padding:12px;text-align:right;color:#c9a96e;font-weight:bold;font-size:18px;border-top:2px solid #c9a96e;">${order.total.toFixed(2).replace('.', ',')} &euro;</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>`
    });
}

async function sendClientEmail(order) {
    if (!transporter) return;
    const items = JSON.parse(order.items);
    await transporter.sendMail({
        from: `Au Pain Doré <${GMAIL_USER}>`,
        to: order.email,
        subject: `Confirmation de votre commande - Au Pain Doré`,
        html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#1a1a1a;color:#ccc;padding:0;">
            <div style="background:#111;padding:24px;text-align:center;border-bottom:2px solid #c9a96e;">
                <h1 style="color:#c9a96e;margin:0;font-size:22px;">Au Pain Dor&eacute;</h1>
                <p style="color:#888;margin:8px 0 0;font-size:13px;">Confirmation de commande</p>
            </div>
            <div style="padding:24px;">
                <p style="color:#fff;font-size:16px;">Bonjour ${order.first_name},</p>
                <p>Merci pour votre commande ! Voici le r&eacute;capitulatif :</p>

                <div style="background:#222;padding:16px;margin:20px 0;border-left:3px solid #c9a96e;">
                    <p style="margin:0;color:#c9a96e;font-size:14px;text-transform:uppercase;letter-spacing:1px;">Retrait pr&eacute;vu</p>
                    <p style="margin:8px 0 0;color:#fff;font-size:18px;">${formatDate(order.pickup_date)} &agrave; ${order.pickup_time}</p>
                    <p style="margin:8px 0 0;font-size:13px;">42 Rue du Faubourg Saint-Honor&eacute;, 75008 Paris</p>
                </div>

                <table style="width:100%;border-collapse:collapse;margin:20px 0;">
                    <thead>
                        <tr style="border-bottom:2px solid #c9a96e;">
                            <th style="padding:10px 12px;text-align:left;color:#c9a96e;font-size:12px;text-transform:uppercase;">Produit</th>
                            <th style="padding:10px 12px;text-align:center;color:#c9a96e;font-size:12px;text-transform:uppercase;">Qty</th>
                            <th style="padding:10px 12px;text-align:right;color:#c9a96e;font-size:12px;text-transform:uppercase;">Prix</th>
                        </tr>
                    </thead>
                    <tbody>${formatItemsHtml(items)}</tbody>
                    <tfoot>
                        <tr>
                            <td colspan="2" style="padding:12px;text-align:right;color:#fff;font-weight:bold;border-top:2px solid #c9a96e;">Total</td>
                            <td style="padding:12px;text-align:right;color:#c9a96e;font-weight:bold;font-size:18px;border-top:2px solid #c9a96e;">${order.total.toFixed(2).replace('.', ',')} &euro;</td>
                        </tr>
                    </tfoot>
                </table>

                <p style="color:#888;font-size:13px;margin-top:24px;">Si vous avez des questions, contactez-nous au 01 42 65 78 90.</p>
                <p style="color:#888;font-size:13px;">&Agrave; bient&ocirc;t !</p>
                <p style="color:#c9a96e;font-style:italic;">L'&eacute;quipe Au Pain Dor&eacute;</p>
            </div>
        </div>`
    });
}

// ===== API Routes =====

// Create a new order
app.post('/api/orders', async (req, res) => {
    const { firstName, lastName, email, phone, pickupDate, pickupTime, notes, items, total } = req.body;

    if (!firstName || !lastName || !email || !phone || !pickupDate || !pickupTime || !items || !total) {
        return res.status(400).json({ error: 'Tous les champs obligatoires doivent être remplis.' });
    }

    const stmt = db.prepare(`
        INSERT INTO orders (first_name, last_name, email, phone, pickup_date, pickup_time, notes, items, total)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
        firstName,
        lastName,
        email,
        phone,
        pickupDate,
        pickupTime,
        notes || '',
        JSON.stringify(items),
        total
    );

    const orderId = result.lastInsertRowid;

    // Send emails (non-blocking)
    const orderData = { id: orderId, first_name: firstName, last_name: lastName, email, phone, pickup_date: pickupDate, pickup_time: pickupTime, notes: notes || '', items: JSON.stringify(items), total };
    Promise.all([
        sendBakeryEmail(orderData),
        sendClientEmail(orderData)
    ]).catch(err => console.error('Erreur envoi email:', err));

    res.status(201).json({
        id: orderId,
        message: 'Commande enregistrée avec succès'
    });
});

// Get all orders (for admin dashboard)
app.get('/api/orders', (req, res) => {
    const { status, date } = req.query;

    let query = 'SELECT * FROM orders';
    const conditions = [];
    const params = [];

    if (status && status !== 'all') {
        conditions.push('status = ?');
        params.push(status);
    }

    if (date) {
        conditions.push('pickup_date = ?');
        params.push(date);
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    const orders = db.prepare(query).all(...params);

    // Parse items JSON
    const parsed = orders.map(order => ({
        ...order,
        items: JSON.parse(order.items)
    }));

    res.json(parsed);
});

// Get a single order
app.get('/api/orders/:id', (req, res) => {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);

    if (!order) {
        return res.status(404).json({ error: 'Commande introuvable' });
    }

    order.items = JSON.parse(order.items);
    res.json(order);
});

// Update order status
app.patch('/api/orders/:id/status', (req, res) => {
    const { status } = req.body;
    const validStatuses = ['nouvelle', 'en_preparation', 'prete', 'recuperee', 'annulee'];

    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Statut invalide' });
    }

    const stmt = db.prepare('UPDATE orders SET status = ? WHERE id = ?');
    const result = stmt.run(status, req.params.id);

    if (result.changes === 0) {
        return res.status(404).json({ error: 'Commande introuvable' });
    }

    res.json({ message: 'Statut mis à jour', status });
});

// Delete an order
app.delete('/api/orders/:id', (req, res) => {
    const result = db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);

    if (result.changes === 0) {
        return res.status(404).json({ error: 'Commande introuvable' });
    }

    res.json({ message: 'Commande supprimée' });
});

// Get dashboard stats
app.get('/api/stats', (req, res) => {
    const today = new Date().toISOString().split('T')[0];

    const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
    const todayOrders = db.prepare('SELECT COUNT(*) as count FROM orders WHERE pickup_date = ?').get(today).count;
    const newOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'nouvelle'").get().count;
    const todayRevenue = db.prepare('SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE pickup_date = ?').get(today).total;
    const inProgress = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'en_preparation'").get().count;
    const ready = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'prete'").get().count;

    res.json({
        totalOrders,
        todayOrders,
        newOrders,
        todayRevenue,
        inProgress,
        ready
    });
});

// ===== Serve admin page =====
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

// ===== Start Server =====
app.listen(PORT, () => {
    console.log(`\n  ╔══════════════════════════════════════════╗`);
    console.log(`  ║     🥖  Au Pain Doré - Serveur actif     ║`);
    console.log(`  ╠══════════════════════════════════════════╣`);
    console.log(`  ║                                          ║`);
    console.log(`  ║  Site:       http://localhost:${PORT}        ║`);
    console.log(`  ║  Dashboard:  http://localhost:${PORT}/admin  ║`);
    console.log(`  ║                                          ║`);
    console.log(`  ╚══════════════════════════════════════════╝\n`);
});
