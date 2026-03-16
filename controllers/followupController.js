const db = require('../config/database');

class FollowupController {
    async getAll(req, res) {
        try {
            const { page = 1, limit = 10, is_completed, assigned_to } = req.query;
            const offset = (page - 1) * limit;

            let query = `
                SELECT f.*, 
                       l.first_name as lead_first_name, l.last_name as lead_last_name,
                       c.first_name as customer_first_name, c.last_name as customer_last_name,
                       u.first_name as assigned_first_name, u.last_name as assigned_last_name
                FROM followups f
                LEFT JOIN leads l ON f.lead_id = l.id
                LEFT JOIN customers c ON f.customer_id = c.id
                LEFT JOIN users u ON f.assigned_to = u.id
                WHERE 1=1
            `;
            
            const params = [];

            if (req.user.role_name !== 'Admin') {
                query += ' AND f.assigned_to = ?';
                params.push(req.user.id);
            }

            if (is_completed !== undefined) { 
                query += ' AND f.is_completed = ?'; 
                params.push(is_completed === 'true' ? 1 : 0); 
            }
            if (assigned_to) { query += ' AND f.assigned_to = ?'; params.push(assigned_to); }

            const countQuery = `SELECT COUNT(*) as total FROM (${query}) as subquery`;
            query += ' ORDER BY f.scheduled_at ASC LIMIT ? OFFSET ?';
            params.push(parseInt(limit), parseInt(offset));

            const [followups] = await db.query(query, params);
            const [count] = await db.query(countQuery, params.slice(0, -2));

            res.json({
                success: true,
                data: {
                    followups,
                    pagination: {
                        page: parseInt(page), limit: parseInt(limit),
                        total: count[0].total,
                        totalPages: Math.ceil(count[0].total / limit)
                    }
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to get followups' });
        }
    }

    async create(req, res) {
        try {
            const { lead_id, customer_id, followup_type, subject, description, scheduled_at, assigned_to } = req.body;

            if (!subject || !scheduled_at) {
                return res.status(400).json({ success: false, message: 'Subject and scheduled date are required' });
            }

            const [result] = await db.query(
                `INSERT INTO followups (lead_id, customer_id, followup_type, subject, description, 
                                        scheduled_at, assigned_to, created_by) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [lead_id || null, customer_id || null, followup_type || 'note', subject, 
                 description || '', scheduled_at, assigned_to || req.user.id, req.user.id]
            );

            res.status(201).json({
                success: true,
                message: 'Followup created successfully',
                data: { id: result.insertId }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to create followup' });
        }
    }

    async update(req, res) {
        try {
            const { id } = req.params;
            const { subject, description, scheduled_at, is_completed, followup_type } = req.body;

            const updates = [];
            const params = [];

            if (subject !== undefined) { updates.push('subject = ?'); params.push(subject); }
            if (description !== undefined) { updates.push('description = ?'); params.push(description); }
            if (scheduled_at !== undefined) { updates.push('scheduled_at = ?'); params.push(scheduled_at); }
            if (is_completed !== undefined) { 
                updates.push('is_completed = ?'); 
                params.push(is_completed);
                if (is_completed) {
                    updates.push('completed_at = ?'); params.push(new Date());
                }
            }
            if (followup_type !== undefined) { updates.push('followup_type = ?'); params.push(followup_type); }

            if (updates.length === 0) {
                return res.status(400).json({ success: false, message: 'No fields to update' });
            }

            params.push(id);
            await db.query(`UPDATE followups SET ${updates.join(', ')} WHERE id = ?`, params);

            res.json({ success: true, message: 'Followup updated successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to update followup' });
        }
    }

    async delete(req, res) {
        try {
            const { id } = req.params;
            await db.query('DELETE FROM followups WHERE id = ?', [id]);
            res.json({ success: true, message: 'Followup deleted successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to delete followup' });
        }
    }

    async getUpcoming(req, res) {
        try {
            const [followups] = await db.query(
                `SELECT f.*, l.first_name as lead_first_name, l.last_name as lead_last_name,
                        c.first_name as customer_first_name, c.last_name as customer_last_name
                 FROM followups f
                 LEFT JOIN leads l ON f.lead_id = l.id
                 LEFT JOIN customers c ON f.customer_id = c.id
                 WHERE f.is_completed = FALSE 
                   AND f.scheduled_at <= DATE_ADD(NOW(), INTERVAL 24 HOUR)
                   AND f.assigned_to = ?
                 ORDER BY f.scheduled_at ASC
                 LIMIT 10`,
                [req.user.id]
            );

            res.json({ success: true, data: followups });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to get upcoming followups' });
        }
    }
}

module.exports = new FollowupController();
