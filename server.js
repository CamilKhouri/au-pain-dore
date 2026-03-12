const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

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

// ===== API Routes =====

// Create a new order
app.post('/api/orders', (req, res) => {
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

    res.status(201).json({
        id: result.lastInsertRowid,
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
