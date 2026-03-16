const db = require('../config/database');

class DealController {
    async getAll(req, res) {
        try {
            const { page = 1, limit = 10, stage, assigned_to, search = '' } = req.query;
            const offset = (page - 1) * limit;

            let query = `
                SELECT d.*, 
                       l.first_name as lead_first_name, l.last_name as lead_last_name,
                       c.first_name as customer_first_name, c.last_name as customer_last_name,
                       p.title as property_title,
                       u.first_name as assigned_first_name, u.last_name as assigned_last_name
                FROM deals d
                LEFT JOIN leads l ON d.lead_id = l.id
                LEFT JOIN customers c ON d.customer_id = c.id
                LEFT JOIN properties p ON d.property_id = p.id
                LEFT JOIN users u ON d.assigned_to = u.id
                WHERE 1=1
            `;
            
            const params = [];

            if (req.user.role_name !== 'Admin') {
                query += ' AND d.assigned_to = ?';
                params.push(req.user.id);
            }

            if (stage) { query += ' AND d.stage = ?'; params.push(stage); }
            if (assigned_to) { query += ' AND d.assigned_to = ?'; params.push(assigned_to); }
            if (search) {
                query += ' AND (d.title LIKE ? OR l.first_name LIKE ? OR c.first_name LIKE ?)';
                const searchTerm = `%${search}%`;
                params.push(searchTerm, searchTerm, searchTerm);
            }

            const countQuery = `SELECT COUNT(*) as total FROM (${query}) as subquery`;
            query += ' ORDER BY d.created_at DESC LIMIT ? OFFSET ?';
            params.push(parseInt(limit), parseInt(offset));

            const [deals] = await db.query(query, params);
            const [count] = await db.query(countQuery, params.slice(0, -2));

            res.json({
                success: true,
                data: {
                    deals,
                    pagination: {
                        page: parseInt(page), limit: parseInt(limit),
                        total: count[0].total,
                        totalPages: Math.ceil(count[0].total / limit)
                    }
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to get deals' });
        }
    }

    async getById(req, res) {
        try {
            const { id } = req.params;
            const [deals] = await db.query(
                `SELECT d.*, l.first_name as lead_first_name, l.last_name as lead_last_name,
                        c.first_name as customer_first_name, c.last_name as customer_last_name,
                        p.title as property_title
                 FROM deals d
                 LEFT JOIN leads l ON d.lead_id = l.id
                 LEFT JOIN customers c ON d.customer_id = c.id
                 LEFT JOIN properties p ON d.property_id = p.id
                 WHERE d.id = ?`,
                [id]
            );

            if (deals.length === 0) {
                return res.status(404).json({ success: false, message: 'Deal not found' });
            }

            const [notes] = await db.query('SELECT * FROM notes WHERE deal_id = ?', [id]);
            res.json({ success: true, data: { ...deals[0], notes } });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to get deal' });
        }
    }

    async create(req, res) {
        try {
            const { title, description, lead_id, customer_id, property_id, stage, value,
                    probability, expected_close_date, assigned_to } = req.body;

            if (!title || !value) {
                return res.status(400).json({ success: false, message: 'Title and value are required' });
            }

            const [result] = await db.query(
                `INSERT INTO deals (title, description, lead_id, customer_id, property_id, stage, value,
                                   probability, expected_close_date, created_by, assigned_to) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [title, description || '', lead_id || null, customer_id || null, property_id || null,
                 stage || 'initiated', value, probability || 50, expected_close_date || null,
                 req.user.id, assigned_to || req.user.id]
            );

            await db.query(
                `INSERT INTO activities (activity_type, description, entity_type, entity_id, user_id) 
                 VALUES (?, ?, ?, ?, ?)`,
                ['deal_created', 'Deal created', 'deal', result.insertId, req.user.id]
            );

            res.status(201).json({
                success: true,
                message: 'Deal created successfully',
                data: { id: result.insertId }
            });
        } catch (error) {
            console.error('Create deal error:', error);
            res.status(500).json({ success: false, message: 'Failed to create deal' });
        }
    }

    async update(req, res) {
        try {
            const { id } = req.params;
            const { title, description, stage, value, probability, expected_close_date,
                    actual_close_date, lost_reason, assigned_to } = req.body;

            const updates = [];
            const params = [];

            if (title !== undefined) { updates.push('title = ?'); params.push(title); }
            if (description !== undefined) { updates.push('description = ?'); params.push(description); }
            if (stage !== undefined) { 
                updates.push('stage = ?'); 
                params.push(stage);
                if (stage === 'closed_won') {
                    updates.push('actual_close_date = ?'); params.push(new Date());
                }
            }
            if (value !== undefined) { updates.push('value = ?'); params.push(value); }
            if (probability !== undefined) { updates.push('probability = ?'); params.push(probability); }
            if (expected_close_date !== undefined) { updates.push('expected_close_date = ?'); params.push(expected_close_date); }
            if (actual_close_date !== undefined) { updates.push('actual_close_date = ?'); params.push(actual_close_date); }
            if (lost_reason !== undefined) { updates.push('lost_reason = ?'); params.push(lost_reason); }
            if (assigned_to !== undefined) { updates.push('assigned_to = ?'); params.push(assigned_to); }

            if (updates.length === 0) {
                return res.status(400).json({ success: false, message: 'No fields to update' });
            }

            params.push(id);
            await db.query(`UPDATE deals SET ${updates.join(', ')} WHERE id = ?`, params);

            res.json({ success: true, message: 'Deal updated successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to update deal' });
        }
    }

    async delete(req, res) {
        try {
            const { id } = req.params;
            await db.query('DELETE FROM deals WHERE id = ?', [id]);
            res.json({ success: true, message: 'Deal deleted successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to delete deal' });
        }
    }
}

module.exports = new DealController();
