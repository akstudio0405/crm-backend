const db = require('../config/database');

class PropertyController {
    async getAll(req, res) {
        try {
            const { page = 1, limit = 10, status, property_type, city, search = '' } = req.query;
            const offset = (page - 1) * limit;

            let query = `
                SELECT p.*, u.first_name as listed_first_name, u.last_name as listed_last_name
                FROM properties p
                LEFT JOIN users u ON p.listed_by = u.id
                WHERE 1=1
            `;
            
            const params = [];

            if (status) { query += ' AND p.status = ?'; params.push(status); }
            if (property_type) { query += ' AND p.property_type = ?'; params.push(property_type); }
            if (city) { query += ' AND p.city LIKE ?'; params.push(`%${city}%`); }
            if (search) {
                query += ' AND (p.title LIKE ? OR p.address LIKE ? OR p.city LIKE ?)';
                const searchTerm = `%${search}%`;
                params.push(searchTerm, searchTerm, searchTerm);
            }

            const countQuery = `SELECT COUNT(*) as total FROM (${query}) as subquery`;
            query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
            params.push(parseInt(limit), parseInt(offset));

            const [properties] = await db.query(query, params);
            const [count] = await db.query(countQuery, params.slice(0, -2));

            res.json({
                success: true,
                data: {
                    properties,
                    pagination: {
                        page: parseInt(page), limit: parseInt(limit),
                        total: count[0].total,
                        totalPages: Math.ceil(count[0].total / limit)
                    }
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to get properties' });
        }
    }

    async getById(req, res) {
        try {
            const { id } = req.params;
            const [properties] = await db.query(
                `SELECT p.*, u.first_name as listed_first_name, u.last_name as listed_last_name
                 FROM properties p
                 LEFT JOIN users u ON p.listed_by = u.id
                 WHERE p.id = ?`,
                [id]
            );

            if (properties.length === 0) {
                return res.status(404).json({ success: false, message: 'Property not found' });
            }

            const [notes] = await db.query('SELECT * FROM notes WHERE property_id = ?', [id]);
            res.json({ success: true, data: { ...properties[0], notes } });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to get property' });
        }
    }

    async create(req, res) {
        try {
            const { title, description, property_type, status, price, address, city, state,
                    country, postal_code, bedrooms, bathrooms, square_feet, lot_size, 
                    year_built, amenities, images } = req.body;

            if (!title || !property_type || !price) {
                return res.status(400).json({ success: false, message: 'Title, property type and price are required' });
            }

            const [result] = await db.query(
                `INSERT INTO properties (title, description, property_type, status, price, address, city, state,
                                         country, postal_code, bedrooms, bathrooms, square_feet, lot_size, 
                                         year_built, amenities, images, listed_by) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [title, description || '', property_type, status || 'available', price, address || '',
                 city || '', state || '', country || '', postal_code || '', bedrooms || null,
                 bathrooms || null, square_feet || null, lot_size || null, year_built || null,
                 JSON.stringify(amenities || []), JSON.stringify(images || []), req.user.id]
            );

            res.status(201).json({
                success: true,
                message: 'Property created successfully',
                data: { id: result.insertId }
            });
        } catch (error) {
            console.error('Create property error:', error);
            res.status(500).json({ success: false, message: 'Failed to create property' });
        }
    }

    async update(req, res) {
        try {
            const { id } = req.params;
            const { title, description, property_type, status, price, address, city, state,
                    country, postal_code, bedrooms, bathrooms, square_feet, lot_size, 
                    year_built, amenities, images } = req.body;

            const updates = [];
            const params = [];

            if (title !== undefined) { updates.push('title = ?'); params.push(title); }
            if (description !== undefined) { updates.push('description = ?'); params.push(description); }
            if (property_type !== undefined) { updates.push('property_type = ?'); params.push(property_type); }
            if (status !== undefined) { updates.push('status = ?'); params.push(status); }
            if (price !== undefined) { updates.push('price = ?'); params.push(price); }
            if (address !== undefined) { updates.push('address = ?'); params.push(address); }
            if (city !== undefined) { updates.push('city = ?'); params.push(city); }
            if (state !== undefined) { updates.push('state = ?'); params.push(state); }
            if (country !== undefined) { updates.push('country = ?'); params.push(country); }
            if (postal_code !== undefined) { updates.push('postal_code = ?'); params.push(postal_code); }
            if (bedrooms !== undefined) { updates.push('bedrooms = ?'); params.push(bedrooms); }
            if (bathrooms !== undefined) { updates.push('bathrooms = ?'); params.push(bathrooms); }
            if (square_feet !== undefined) { updates.push('square_feet = ?'); params.push(square_feet); }
            if (lot_size !== undefined) { updates.push('lot_size = ?'); params.push(lot_size); }
            if (year_built !== undefined) { updates.push('year_built = ?'); params.push(year_built); }
            if (amenities !== undefined) { updates.push('amenities = ?'); params.push(JSON.stringify(amenities)); }
            if (images !== undefined) { updates.push('images = ?'); params.push(JSON.stringify(images)); }

            if (updates.length === 0) {
                return res.status(400).json({ success: false, message: 'No fields to update' });
            }

            params.push(id);
            await db.query(`UPDATE properties SET ${updates.join(', ')} WHERE id = ?`, params);

            res.json({ success: true, message: 'Property updated successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to update property' });
        }
    }

    async delete(req, res) {
        try {
            const { id } = req.params;
            await db.query('DELETE FROM properties WHERE id = ?', [id]);
            res.json({ success: true, message: 'Property deleted successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to delete property' });
        }
    }
}

module.exports = new PropertyController();
