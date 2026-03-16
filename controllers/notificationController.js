const db = require('../config/database');

class NotificationController {
    async getAll(req, res) {
        try {
            const { page = 1, limit = 20, is_read } = req.query;
            const offset = (page - 1) * limit;

            let query = `SELECT * FROM notifications WHERE user_id = ?`;
            const params = [req.user.id];

            if (is_read !== undefined) {
                query += ' AND is_read = ?';
                params.push(is_read === 'true' ? 1 : 0);
            }

            const countQuery = `SELECT COUNT(*) as total FROM (${query}) as subquery`;
            query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
            params.push(parseInt(limit), parseInt(offset));

            const [notifications] = await db.query(query, params);
            const [count] = await db.query(countQuery, params.slice(0, -2));

            const [unreadCount] = await db.query(
                'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
                [req.user.id]
            );

            res.json({
                success: true,
                data: {
                    notifications,
                    unread_count: unreadCount[0].count,
                    pagination: {
                        page: parseInt(page), limit: parseInt(limit),
                        total: count[0].total,
                        totalPages: Math.ceil(count[0].total / limit)
                    }
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to get notifications' });
        }
    }

    async markAsRead(req, res) {
        try {
            const { id } = req.params;
            await db.query(
                'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
                [id, req.user.id]
            );
            res.json({ success: true, message: 'Notification marked as read' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
        }
    }

    async markAllAsRead(req, res) {
        try {
            await db.query(
                'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
                [req.user.id]
            );
            res.json({ success: true, message: 'All notifications marked as read' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to mark notifications as read' });
        }
    }

    async delete(req, res) {
        try {
            const { id } = req.params;
            await db.query('DELETE FROM notifications WHERE id = ? AND user_id = ?', [id, req.user.id]);
            res.json({ success: true, message: 'Notification deleted' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to delete notification' });
        }
    }
}

module.exports = new NotificationController();
