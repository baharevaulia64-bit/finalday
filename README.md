1) Скачайте все что я вам отправила
2) В синеньком приложении, где БД вам нужно написать: 
-- Создаём БД
CREATE DATABASE alien_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE alien_db;

-- Таблица пользователей
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    login VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Добавим тестового админа (пароль: admin123)
-- В реальном проекте пароли хешируем!
INSERT INTO users (login, password, first_name, last_name, role) 
VALUES ('admin', 'admin123', 'Системный', 'Администратор', 'admin');

2) в терминале npm install напишите
3) а затем npm start
4) переходите на ссылку в браузере http://localhost:3000
