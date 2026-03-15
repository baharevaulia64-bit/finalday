const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2');

const app = express();
const PORT = 3000;

// Подключение к БД
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '55758690',  // ← замените на ваш пароль
    database: 'alien_db'
}).promise();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Сессия
app.use(session({
    secret: 'my_super_secret_123',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000, secure: false }
}));

// 🔐 Middleware для проверки роли
const isAdmin = (req, res, next) => {
    if (req.session.role === 'admin') return next();
    res.status(403).json({ error: 'Только для админов' });
};

const isAuthenticated = (req, res, next) => {
    if (req.session.userId) return next();
    res.status(401).json({ error: 'Не авторизован' });
};

// ==================== 📊 СТАТУС БД (для отладки) ====================
app.get('/api/db-status', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT COUNT(*) as count FROM users');
        const [recent] = await db.query(
            'SELECT id, login, first_name, last_name, role, created_at FROM users ORDER BY created_at DESC LIMIT 5'
        );
        res.json({
            total_users: rows[0].count,
            last_5_users: recent,
            status: 'ok'
        });
    } catch (err) {
        res.status(500).json({ error: err.message, status: 'error' });
    }
});

// ==================== 🔐 АВТОРИЗАЦИЯ ====================
app.post('/api/login', async (req, res) => {
    console.log('🔐 Попытка входа:', req.body.login);
    
    const { login, password } = req.body;
    const [users] = await db.query('SELECT * FROM users WHERE login = ?', [login]);
    
    if (users.length === 0 || password !== users[0].password) {
        console.log('❌ Ошибка входа:', login);
        return res.status(401).json({ error: 'Неверный логин или пароль' });
    }
    
    const user = users[0];
    req.session.userId = user.id;
    req.session.role = user.role;
    req.session.name = `${user.first_name} ${user.last_name}`;
    
    console.log('✅ Успешный вход:', login, 'Роль:', user.role);
    res.json({ message: 'Успех!', role: user.role, name: req.session.name });
});

app.get('/api/me', isAuthenticated, (req, res) => {
    res.json({ name: req.session.name, role: req.session.role });
});

app.post('/api/logout', (req, res) => {
    console.log('🚪 Выход пользователя:', req.session.name);
    req.session.destroy();
    res.json({ message: 'Выход' });
});

// ==================== 👥 РАБОТА С ПОЛЬЗОВАТЕЛЯМИ ====================

// ➕ Создание пользователя (только админ)
app.post('/api/users', isAdmin, async (req, res) => {
    console.log('📝 Создание пользователя:', req.body);
    
    try {
        const { login, password, first_name, last_name, role = 'user' } = req.body;
        
        if (!login || !password || !first_name || !last_name) {
            return res.status(400).json({ error: 'Заполните все обязательные поля' });
        }
        
        // Хешируем пароль
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const [result] = await db.query(
            `INSERT INTO users (login, password, first_name, last_name, role) 
             VALUES (?, ?, ?, ?, ?)`,
            [login, hashedPassword, first_name, last_name, role]
        );
        
        console.log('✅ Пользователь создан в БД. ID:', result.insertId);
        
        res.json({ 
            message: 'Пользователь успешно создан', 
            id: result.insertId,
            login 
        });
        
    } catch (err) {
        console.error('❌ Ошибка при создании пользователя:', err.message);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Такой логин уже существует' });
        }
        res.status(500).json({ error: 'Ошибка сервера: ' + err.message });
    }
});

// 📋 Получить всех пользователей (только админ)
app.get('/api/users', isAdmin, async (req, res) => {
    console.log('📋 Запрос списка пользователей от админа:', req.session.name);
    
    try {
        const [users] = await db.query(
            `SELECT id, login, first_name, last_name, role, created_at 
             FROM users ORDER BY created_at DESC`
        );
        console.log(`📊 Найдено пользователей в БД: ${users.length}`);
        res.json(users);
    } catch (err) {
        console.error('❌ Ошибка получения списка:', err.message);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// 🗑️ Удаление пользователя (только админ, опционально)
app.delete('/api/users/:id', isAdmin, async (req, res) => {
    const userId = req.params.id;
    console.log(`🗑️ Удаление пользователя ID: ${userId}`);
    
    try {
        const [result] = await db.query('DELETE FROM users WHERE id = ?', [userId]);
        if (result.affectedRows > 0) {
            console.log('✅ Пользователь удалён из БД');
            res.json({ message: 'Пользователь удалён' });
        } else {
            res.status(404).json({ error: 'Пользователь не найден' });
        }
    } catch (err) {
        console.error('❌ Ошибка удаления:', err.message);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ==================== 🚀 ЗАПУСК ====================
app.listen(PORT, () => {
    console.log(`✅ Сервер запущен: http://localhost:${PORT}`);
    console.log(`🗄️  Подключение к БД: alien_db@localhost`);
});