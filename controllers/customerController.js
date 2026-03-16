const db = require('../config/database');

class CustomerController {
    // Get all customers
    async getAll(req, res) {
        try {
            const { page = 1, limit = 10, search = '' } = req.query;
            const offset = (page - 1) * limit;

            let query = `
                SELECT c.*, lso.name as source_name,
                       u.first_name as assigned_first_name, u.last_name as assigned_last_name
                FROM customers c
                LEFT JOIN lead_sources lso ON c.source_id = lso.id
                LEFT JOIN users u ON c.assigned_to = u.id
                WHERE 1=1
            `;
            
            const params = [];

            // Role-based filtering
            if (req.user.role_name !== 'Admin') {
                query += ' AND c.assigned_to = ?';
                params.push(req.user.id);
            }

            if (search) {
                query += ' AND (c.first_name LIKE ? OR c.last_name LIKE ? OR c.email LIKE ? OR c.company LIKE ?)';
                const searchTerm = `%${search}%`;
                params.push(searchTerm, searchTerm, searchTerm, searchTerm);
            }

            const countQuery = `SELECT COUNT(*) as total FROM (${query}) as subquery`;
            query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
            params.push(parseInt(limit), parseInt(offset));

            const [customers] = await db.query(query, params);
            const [count] = await db.query(countQuery, params.slice(0, -2));

            res.json({
                success: true,
                data: {
                    customers,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: count[0].total,
                        totalPages: Math.ceil(count[0].total / limit)
                    }
                }
            });
        } catch (error) {
            console.error('Get customers error:', error);
            res.status(500).json({ success: false, message: 'Failed to get customers' });
        }
    }

    // Get customer by ID
    async getById(req, res) {
        try {
            const { id } = req.params;
            const [customers] = await db.query(
                `SELECT c.*, lso.name as source_name,
                        u.first_name as assigned_first_name, u.last_name as assigned_last_name
                 FROM customers c
                 LEFT JOIN lead_sources lso ON c.source_id = lso.id
                 LEFT JOIN users u ON c.assigned_to = u.id
                 WHERE c.id = ?`,
                [id]
            );

            if (customers.length === 0) {
                return res.status(404).json({ success: false, message: 'Customer not found' });
            }

            // Get customer notes
            const [notes] = await db.query(
                `SELECT n.*, u.first_name, u.last_name 
                 FROM notes n 
                 LEFT JOIN users u ON n.created_by = u.id 
                 WHERE n.customer_id = ? 
                 ORDER BY n.created_at DESC`,
                [id]
            );

            // Get customer deals
            const [deals] = await db.query(
                `SELECT * FROM deals WHERE customer_id = ? ORDER BY created_at DESC`,
                [id]
            );

            res.json({
                success: true,
                data: {
                    ...customers[0],
                    notes,
                    deals
                }
            });
        } catch (error) {
            console.error('Get customer error:', error);
            res.status(500).json({ success: false, message: 'Failed to get customer' });
        }
    }

    // Create customer
    async create(req, res) {
        try {
            const { first_name, last_name, email, phone, company, address, city, state, 
                    country, postal_code, source_id, assigned_to, customer_value } = req.body;

            if (!first_name) {
                return res.status(400).json({ success: false, message: 'First name is required' });
            }

            const [result] = await db.query(
                `INSERT INTO customers (first_name, last_name, email, phone, company, address, 
                                        city, state, country, postal_code, source_id, assigned_to, customer_value) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [first_name, last_name || '', email || '', phone || '', company || '', 
                 address || '', city || '', state || '', country || '', postal_code || '',
                 source_id || null, assigned_to || req.user.id, customer_value || 0]
            );

            // Log activity
            await db.query(
                `INSERT INTO activities (activity_type, description, entity_type, entity_id, user_id) 
                 VALUES (?, ?, ?, ?, ?)`,
                ['customer_created', 'Customer created', 'customer', result.insertId, req.user.id]
            );

            res.status(201).json({
                success: true,
                message: 'Customer created successfully',
                data: { id: result.insertId }
            });
        } catch (error) {
            console.error('Create customer error:', error);
            res.status(500).json({ success: false, message: 'Failed to create customer' });
        }
    }

    // Update customer
    async update(req, res) {
        try {
            const { id } = req.params;
            const { first_name, last_name, email, phone, company, address, city, state, 
                    country, postal_code, source_id, assigned_to, customer_value } = req.body;

            const [existing] = await db.query('SELECT id FROM customers WHERE id = ?', [id]);
            if (existing.length === 0) {
                return res.status(404).json({ success: false, message: 'Customer not found' });
            }

            const updates = [];
            const params = [];

            if (first_name !== undefined) { updates.push('first_name = ?'); params.push(first_name); }
            if (last_name !== undefined) { updates.push('last_name = ?'); params.push(last_name); }
            if (email !== undefined) { updates.push('email = ?'); params.push(email); }
            if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
            if (company !== undefined) { updates.push('company = ?'); params.push(company); }
            if (address !== undefined) { updates.push('address = ?'); params.push(address); }
            if (city !== undefined) { updates.push('city = ?'); params.push(city); }
            if (state !== undefined) { updates.push('state = ?'); params.push(state); }
            if (country !== undefined) { updates.push('country = ?'); params.push(country); }
            if (postal_code !== undefined) { updates.push('postal_code = ?'); params.push(postal_code); }
            if (source_id !== undefined) { updates.push('source_id = ?'); params.push(source_id); }
            if (assigned_to !== undefined) { updates.push('assigned_to = ?'); params.push(assigned_to); }
            if (customer_value !== undefined) { updates.push('customer_value = ?'); params.push(customer_value); }

            if (updates.length === 0) {
                return res.status(400).json({ success: false, message: 'No fields to update' });
            }

            params.push(id);
            await db.query(`UPDATE customers SET ${updates.join(', ')} WHERE id = ?`, params);

            res.json({ success: true, message: 'Customer updated successfully' });
        } catch (error) {
            console.error('Update customer error:', error);
            res.status(500).json({ success: false, message: 'Failed to update customer' });
        }
    }

    // Delete customer
    async delete(req, res) {
        try {
            const { id } = req.params;
            const [existing] = await db.query('SELECT id FROM customers WHERE id = ?', [id]);
            if (existing.length === 0) {
                return res.status(404).json({ success: false, message: 'Customer not found' });
            }

            await db.query('DELETE FROM customers WHERE id = ?', [id]);
            res.json({ success: true, message: 'Customer deleted successfully' });
        } catch (error) {
            console.error('Delete customer error:', error);
            res.status(500).json({ success: false, message: 'Failed to delete customer' });
        }
    }
}

module.exports = new CustomerController();
