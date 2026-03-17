const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config');
const db = require('../config/database');

class AuthController {
    // Login
    async login(req, res) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Email and password are required'
                });
            }

            const [users] = await db.query(
                `SELECT u.*, r.name as role_name 
                 FROM users u
                 JOIN roles r ON u.role_id = r.id
                 WHERE u.email = ? AND u.is_active = TRUE`,
                [email]
            );

            if (users.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }

            const user = users[0];
            const isPasswordValid = await bcrypt.compare(password, user.password);

            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }

            // Update last login
            await db.query(
                'UPDATE users SET last_login = NOW() WHERE id = ?',
                [user.id]
            );

            // Generate token
            const token = jwt.sign(
                {
                    id: user.id,
                    email: user.email,
                    role_id: user.role_id,
                    role_name: user.role_name
                },
                config.JWT_SECRET,
                {
                    expiresIn: config.JWT_EXPIRES_IN || '7d'
                }
            );

            return res.status(200).json({
                success: true,
                message: 'Login successful',
                data: {
                    token,
                    user: {
                        id: user.id,
                        email: user.email,
                        first_name: user.first_name,
                        last_name: user.last_name,
                        phone: user.phone,
                        role_id: user.role_id,
                        role_name: user.role_name,
                        avatar: user.avatar,
                        is_active: user.is_active,
                        last_login: user.last_login
                    }
                }
            });
        } catch (error) {
            console.error('Login error:', error);
            return res.status(500).json({
                success: false,
                message: 'Login failed'
            });
        }
    }

    // Register
    async register(req, res) {
        try {
            const { email, password, first_name, last_name, phone } = req.body;

            if (!email || !password || !first_name) {
                return res.status(400).json({
                    success: false,
                    message: 'Email, password and first name are required'
                });
            }

            // Check if user already exists
            const [existing] = await db.query(
                'SELECT id FROM users WHERE email = ?',
                [email]
            );

            if (existing.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'User already exists'
                });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Get default role (Sales Agent)
            const [roles] = await db.query(
                "SELECT id FROM roles WHERE name = 'Sales Agent' LIMIT 1"
            );

            const role_id = roles.length > 0 ? roles[0].id : 3;

            // Create user
            const [result] = await db.query(
                `INSERT INTO users (email, password, first_name, last_name, phone, role_id)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    email,
                    hashedPassword,
                    first_name,
                    last_name || '',
                    phone || '',
                    role_id
                ]
            );

            return res.status(201).json({
                success: true,
                message: 'User registered successfully',
                data: {
                    id: result.insertId
                }
            });
        } catch (error) {
            console.error('Register error:', error);
            return res.status(500).json({
                success: false,
                message: 'Registration failed'
            });
        }
    }

    // Get current user
    async me(req, res) {
        try {
            const [users] = await db.query(
                `SELECT 
                    u.id,
                    u.email,
                    u.first_name,
                    u.last_name,
                    u.phone,
                    u.avatar,
                    u.role_id,
                    u.is_active,
                    u.last_login,
                    u.created_at,
                    r.name as role_name
                 FROM users u
                 JOIN roles r ON u.role_id = r.id
                 WHERE u.id = ?`,
                [req.user.id]
            );

            if (users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            return res.status(200).json({
                success: true,
                data: users[0]
            });
        } catch (error) {
            console.error('Get user error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to get user info'
            });
        }
    }
}

module.exports = new AuthController();
