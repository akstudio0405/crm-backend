const db = require('../config/database');
const bcrypt = require('bcryptjs');

class UserController {
    // Get all users
    async getAll(req, res) {
        try {
            const { page = 1, limit = 10, search = '' } = req.query;
            const offset = (page - 1) * limit;

            let query = `
                SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.avatar,
                       u.is_active, u.last_login, u.created_at, r.name as role_name,
                       r.id as role_id
                FROM users u
                JOIN roles r ON u.role_id = r.id
            `;
            
            const countQuery = 'SELECT COUNT(*) as total FROM users';
            const params = [];

            if (search) {
                query += ' WHERE u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?';
                const searchTerm = `%${search}%`;
                params.push(searchTerm, searchTerm, searchTerm);
            }

            query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
            params.push(parseInt(limit), parseInt(offset));

            const [users] = await db.query(query, params);
            const [count] = await db.query(countQuery);

            res.json({
                success: true,
                data: {
                    users,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: count[0].total,
                        totalPages: Math.ceil(count[0].total / limit)
                    }
                }
            });
        } catch (error) {
            console.error('Get users error:', error);
            res.status(500).json({ success: false, message: 'Failed to get users' });
        }
    }

    // Get user by ID
    async getById(req, res) {
        try {
            const { id } = req.params;
            const [users] = await db.query(
                `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.avatar,
                        u.is_active, u.last_login, u.created_at, r.name as role_name, r.id as role_id
                 FROM users u
                 JOIN roles r ON u.role_id = r.id
                 WHERE u.id = ?`,
                [id]
            );

            if (users.length === 0) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            res.json({ success: true, data: users[0] });
        } catch (error) {
            console.error('Get user error:', error);
            res.status(500).json({ success: false, message: 'Failed to get user' });
        }
    }

    // Create user
    async create(req, res) {
        try {
            const { email, password, first_name, last_name, phone, role_id } = req.body;

            if (!email || !password || !first_name) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Email, password and first name are required' 
                });
            }

            const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
            if (existing.length > 0) {
                return res.status(400).json({ success: false, message: 'Email already exists' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const [result] = await db.query(
                `INSERT INTO users (email, password, first_name, last_name, phone, role_id) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [email, hashedPassword, first_name, last_name || '', phone || '', role_id || 3]
            );

            res.status(201).json({
                success: true,
                message: 'User created successfully',
                data: { id: result.insertId }
            });
        } catch (error) {
            console.error('Create user error:', error);
            res.status(500).json({ success: false, message: 'Failed to create user' });
        }
    }

    // Update user
    async update(req, res) {
        try {
            const { id } = req.params;
            const { email, first_name, last_name, phone, role_id, is_active } = req.body;

            const [existing] = await db.query('SELECT id FROM users WHERE id = ?', [id]);
            if (existing.length === 0) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            const updates = [];
            const params = [];

            if (email) { updates.push('email = ?'); params.push(email); }
            if (first_name) { updates.push('first_name = ?'); params.push(first_name); }
            if (last_name !== undefined) { updates.push('last_name = ?'); params.push(last_name); }
            if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
            if (role_id) { updates.push('role_id = ?'); params.push(role_id); }
            if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active); }

            if (updates.length === 0) {
                return res.status(400).json({ success: false, message: 'No fields to update' });
            }

            params.push(id);
            await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

            res.json({ success: true, message: 'User updated successfully' });
        } catch (error) {
            console.error('Update user error:', error);
            res.status(500).json({ success: false, message: 'Failed to update user' });
        }
    }

    // Delete user
    async delete(req, res) {
        try {
            const { id } = req.params;

            if (parseInt(id) === req.user.id) {
                return res.status(400).json({ success: false, message: 'Cannot delete yourself' });
            }

            const [existing] = await db.query('SELECT id FROM users WHERE id = ?', [id]);
            if (existing.length === 0) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            await db.query('DELETE FROM users WHERE id = ?', [id]);

            res.json({ success: true, message: 'User deleted successfully' });
        } catch (error) {
            console.error('Delete user error:', error);
            res.status(500).json({ success: false, message: 'Failed to delete user' });
        }
    }

    // Get roles
    async getRoles(req, res) {
        try {
            const [roles] = await db.query('SELECT * FROM roles ORDER BY id');
            res.json({ success: true, data: roles });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to get roles' });
        }
    }

    // Get permissions
    async getPermissions(req, res) {
        try {
            const [permissions] = await db.query('SELECT * FROM permissions');
            res.json({ success: true, data: permissions });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to get permissions' });
        }
    }
}

module.exports = new UserController();
