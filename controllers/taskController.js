const db = require('../config/database');

class TaskController {
    async getAll(req, res) {
        try {
            const { page = 1, limit = 10, status, priority, assigned_to } = req.query;
            const offset = (page - 1) * limit;

            let query = `
                SELECT t.*, l.first_name as lead_first_name, l.last_name as lead_last_name,
                       c.first_name as customer_first_name, c.last_name as customer_last_name,
                       d.title as deal_title,
                       u.first_name as assigned_first_name, u.last_name as assigned_last_name
                FROM tasks t
                LEFT JOIN leads l ON t.lead_id = l.id
                LEFT JOIN customers c ON t.customer_id = c.id
                LEFT JOIN deals d ON t.deal_id = d.id
                LEFT JOIN users u ON t.assigned_to = u.id
                WHERE 1=1
            `;
            
            const params = [];

            if (req.user.role_name !== 'Admin') {
                query += ' AND t.assigned_to = ?';
                params.push(req.user.id);
            }

            if (status) { query += ' AND t.status = ?'; params.push(status); }
            if (priority) { query += ' AND t.priority = ?'; params.push(priority); }
            if (assigned_to) { query += ' AND t.assigned_to = ?'; params.push(assigned_to); }

            const countQuery = `SELECT COUNT(*) as total FROM (${query}) as subquery`;
            query += ' ORDER BY t.due_date ASC LIMIT ? OFFSET ?';
            params.push(parseInt(limit), parseInt(offset));

            const [tasks] = await db.query(query, params);
            const [count] = await db.query(countQuery, params.slice(0, -2));

            res.json({
                success: true,
                data: {
                    tasks,
                    pagination: {
                        page: parseInt(page), limit: parseInt(limit),
                        total: count[0].total,
                        totalPages: Math.ceil(count[0].total / limit)
                    }
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to get tasks' });
        }
    }

    async create(req, res) {
        try {
            const { title, description, task_type, priority, status, due_date, 
                    lead_id, customer_id, deal_id, assigned_to } = req.body;

            if (!title) {
                return res.status(400).json({ success: false, message: 'Title is required' });
            }

            const [result] = await db.query(
                `INSERT INTO tasks (title, description, task_type, priority, status, due_date,
                                   lead_id, customer_id, deal_id, assigned_to, created_by) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [title, description || '', task_type || 'other', priority || 'medium', 
                 status || 'pending', due_date || null, lead_id || null, customer_id || null,
                 deal_id || null, assigned_to || req.user.id, req.user.id]
            );

            res.status(201).json({
                success: true,
                message: 'Task created successfully',
                data: { id: result.insertId }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to create task' });
        }
    }

    async update(req, res) {
        try {
            const { id } = req.params;
            const { title, description, task_type, priority, status, due_date, assigned_to } = req.body;

            const updates = [];
            const params = [];

            if (title !== undefined) { updates.push('title = ?'); params.push(title); }
            if (description !== undefined) { updates.push('description = ?'); params.push(description); }
            if (task_type !== undefined) { updates.push('task_type = ?'); params.push(task_type); }
            if (priority !== undefined) { updates.push('priority = ?'); params.push(priority); }
            if (status !== undefined) { 
                updates.push('status = ?'); 
                params.push(status);
                if (status === 'completed') {
                    updates.push('completed_at = ?'); params.push(new Date());
                }
            }
            if (due_date !== undefined) { updates.push('due_date = ?'); params.push(due_date); }
            if (assigned_to !== undefined) { updates.push('assigned_to = ?'); params.push(assigned_to); }

            if (updates.length === 0) {
                return res.status(400).json({ success: false, message: 'No fields to update' });
            }

            params.push(id);
            await db.query(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, params);

            res.json({ success: true, message: 'Task updated successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to update task' });
        }
    }

    async delete(req, res) {
        try {
            const { id } = req.params;
            await db.query('DELETE FROM tasks WHERE id = ?', [id]);
            res.json({ success: true, message: 'Task deleted successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to delete task' });
        }
    }
}

module.exports = new TaskController();
