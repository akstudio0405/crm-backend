const db = require('../config/database');

class LeadController {
    // Get all leads
    async getAll(req, res) {
        try {
            const {
                page = 1,
                limit = 10,
                stage_id,
                source_id,
                assigned_to,
                search = ''
            } = req.query;

            const pageNum = Math.max(parseInt(page, 10) || 1, 1);
            const limitNum = Math.max(parseInt(limit, 10) || 10, 1);
            const offset = (pageNum - 1) * limitNum;

            let query = `
                SELECT 
                    l.*,
                    ls.name AS stage_name,
                    ls.color AS stage_color,
                    lso.name AS source_name,
                    u.first_name AS assigned_first_name,
                    u.last_name AS assigned_last_name,
                    creator.first_name AS created_by_first_name,
                    creator.last_name AS created_by_last_name
                FROM leads l
                LEFT JOIN lead_stages ls ON l.stage_id = ls.id
                LEFT JOIN lead_sources lso ON l.source_id = lso.id
                LEFT JOIN users u ON l.assigned_to = u.id
                LEFT JOIN users creator ON l.created_by = creator.id
                WHERE 1=1
            `;

            const params = [];

            // Role-based filtering
            if (req.user && req.user.role_name !== 'Admin') {
                query += ' AND (l.assigned_to = ? OR l.created_by = ?)';
                params.push(req.user.id, req.user.id);
            }

            if (stage_id) {
                query += ' AND l.stage_id = ?';
                params.push(stage_id);
            }

            if (source_id) {
                query += ' AND l.source_id = ?';
                params.push(source_id);
            }

            if (assigned_to) {
                query += ' AND l.assigned_to = ?';
                params.push(assigned_to);
            }

            if (search && search.trim()) {
                query += ' AND (l.first_name LIKE ? OR l.last_name LIKE ? OR l.email LIKE ? OR l.phone LIKE ? OR l.company LIKE ?)';
                const searchTerm = `%${search.trim()}%`;
                params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
            }

            const countQuery = `SELECT COUNT(*) AS total FROM (${query}) AS subquery`;
            const countParams = [...params];

            query += ' ORDER BY l.created_at DESC LIMIT ? OFFSET ?';
            params.push(limitNum, offset);

            const [leads] = await db.query(query, params);
            const [countRows] = await db.query(countQuery, countParams);

            const total = countRows[0]?.total || 0;

            res.json({
                success: true,
                data: {
                    leads,
                    pagination: {
                        page: pageNum,
                        limit: limitNum,
                        total,
                        totalPages: Math.ceil(total / limitNum)
                    }
                }
            });
        } catch (error) {
            console.error('Get leads error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get leads'
            });
        }
    }

    // Get lead by ID
    async getById(req, res) {
        try {
            const { id } = req.params;

            let query = `
                SELECT 
                    l.*,
                    ls.name AS stage_name,
                    ls.color AS stage_color,
                    lso.name AS source_name,
                    u.first_name AS assigned_first_name,
                    u.last_name AS assigned_last_name,
                    creator.first_name AS created_by_first_name,
                    creator.last_name AS created_by_last_name
                FROM leads l
                LEFT JOIN lead_stages ls ON l.stage_id = ls.id
                LEFT JOIN lead_sources lso ON l.source_id = lso.id
                LEFT JOIN users u ON l.assigned_to = u.id
                LEFT JOIN users creator ON l.created_by = creator.id
                WHERE l.id = ?
            `;

            const params = [id];

            // Role-based access
            if (req.user && req.user.role_name !== 'Admin') {
                query += ' AND (l.assigned_to = ? OR l.created_by = ?)';
                params.push(req.user.id, req.user.id);
            }

            const [leads] = await db.query(query, params);

            if (leads.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Lead not found'
                });
            }

            const [notes] = await db.query(
                `SELECT 
                    n.*, 
                    u.first_name, 
                    u.last_name 
                 FROM notes n
                 LEFT JOIN users u ON n.created_by = u.id
                 WHERE n.lead_id = ?
                 ORDER BY n.created_at DESC`,
                [id]
            );

            const [activities] = await db.query(
                `SELECT *
                 FROM activities
                 WHERE entity_type = 'lead' AND entity_id = ?
                 ORDER BY created_at DESC`,
                [id]
            );

            res.json({
                success: true,
                data: {
                    ...leads[0],
                    notes,
                    activities
                }
            });
        } catch (error) {
            console.error('Get lead error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get lead'
            });
        }
    }

    // Create lead
    async create(req, res) {
        try {
            const {
                first_name,
                last_name,
                email,
                phone,
                company,
                source_id,
                stage_id,
                assigned_to,
                estimated_value,
                notes
            } = req.body;

            if (!first_name || !first_name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'First name is required'
                });
            }

            let finalStageId = stage_id;

            if (!finalStageId) {
                const [stages] = await db.query(
                    'SELECT id FROM lead_stages WHERE is_default = TRUE LIMIT 1'
                );
                finalStageId = stages.length > 0 ? stages[0].id : 1;
            }

            const assignedUserId = assigned_to || req.user.id;

            const [result] = await db.query(
                `INSERT INTO leads (
                    first_name,
                    last_name,
                    email,
                    phone,
                    company,
                    source_id,
                    stage_id,
                    pipeline_id,
                    assigned_to,
                    estimated_value,
                    notes,
                    created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    first_name.trim(),
                    last_name || '',
                    email || '',
                    phone || '',
                    company || '',
                    source_id || null,
                    finalStageId,
                    null,
                    assignedUserId,
                    estimated_value || null,
                    notes || '',
                    req.user.id
                ]
            );

            await db.query(
                `INSERT INTO activities (
                    activity_type,
                    description,
                    entity_type,
                    entity_id,
                    user_id
                ) VALUES (?, ?, ?, ?, ?)`,
                ['lead_created', 'Lead created', 'lead', result.insertId, req.user.id]
            );

            if (assigned_to && Number(assigned_to) !== Number(req.user.id)) {
                await db.query(
                    `INSERT INTO notifications (
                        user_id,
                        title,
                        message,
                        type,
                        link
                    ) VALUES (?, ?, ?, ?, ?)`,
                    [
                        assigned_to,
                        'New Lead Assigned',
                        `You have been assigned a new lead: ${first_name.trim()}`,
                        'info',
                        `/leads/${result.insertId}`
                    ]
                );
            }

            res.status(201).json({
                success: true,
                message: 'Lead created successfully',
                data: { id: result.insertId }
            });
        } catch (error) {
            console.error('Create lead error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create lead'
            });
        }
    }

    // Update lead
    async update(req, res) {
        try {
            const { id } = req.params;
            const {
                first_name,
                last_name,
                email,
                phone,
                company,
                source_id,
                stage_id,
                assigned_to,
                estimated_value,
                notes,
                lead_score
            } = req.body;

            let existingQuery = 'SELECT * FROM leads WHERE id = ?';
            const existingParams = [id];

            if (req.user && req.user.role_name !== 'Admin') {
                existingQuery += ' AND (assigned_to = ? OR created_by = ?)';
                existingParams.push(req.user.id, req.user.id);
            }

            const [existing] = await db.query(existingQuery, existingParams);

            if (existing.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Lead not found'
                });
            }

            const currentLead = existing[0];
            const updates = [];
            const params = [];

            if (first_name !== undefined) {
                if (!first_name || !String(first_name).trim()) {
                    return res.status(400).json({
                        success: false,
                        message: 'First name cannot be empty'
                    });
                }
                updates.push('first_name = ?');
                params.push(String(first_name).trim());
            }

            if (last_name !== undefined) {
                updates.push('last_name = ?');
                params.push(last_name);
            }

            if (email !== undefined) {
                updates.push('email = ?');
                params.push(email);
            }

            if (phone !== undefined) {
                updates.push('phone = ?');
                params.push(phone);
            }

            if (company !== undefined) {
                updates.push('company = ?');
                params.push(company);
            }

            if (source_id !== undefined) {
                updates.push('source_id = ?');
                params.push(source_id || null);
            }

            if (stage_id !== undefined) {
                updates.push('stage_id = ?');
                params.push(stage_id || null);

                if (stage_id) {
                    const [stageRows] = await db.query(
                        'SELECT name FROM lead_stages WHERE id = ?',
                        [stage_id]
                    );

                    if (stageRows.length > 0) {
                        const stageName = String(stageRows[0].name || '').toLowerCase();

                        if (stageName.includes('won')) {
                            updates.push('is_converted = ?');
                            params.push(true);
                            updates.push('converted_at = NOW()');
                        }
                    }
                }
            }

            if (assigned_to !== undefined) {
                updates.push('assigned_to = ?');
                params.push(assigned_to || null);
            }

            if (estimated_value !== undefined) {
                updates.push('estimated_value = ?');
                params.push(estimated_value || null);
            }

            if (notes !== undefined) {
                updates.push('notes = ?');
                params.push(notes);
            }

            if (lead_score !== undefined) {
                updates.push('lead_score = ?');
                params.push(lead_score || null);
            }

            if (updates.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No fields to update'
                });
            }

            params.push(id);

            await db.query(
                `UPDATE leads SET ${updates.join(', ')} WHERE id = ?`,
                params
            );

            await db.query(
                `INSERT INTO activities (
                    activity_type,
                    description,
                    entity_type,
                    entity_id,
                    user_id
                ) VALUES (?, ?, ?, ?, ?)`,
                ['lead_updated', 'Lead updated', 'lead', id, req.user.id]
            );

            if (
                assigned_to !== undefined &&
                assigned_to &&
                Number(assigned_to) !== Number(currentLead.assigned_to) &&
                Number(assigned_to) !== Number(req.user.id)
            ) {
                await db.query(
                    `INSERT INTO notifications (
                        user_id,
                        title,
                        message,
                        type,
                        link
                    ) VALUES (?, ?, ?, ?, ?)`,
                    [
                        assigned_to,
                        'Lead Reassigned',
                        `A lead has been assigned to you: ${first_name || currentLead.first_name}`,
                        'info',
                        `/leads/${id}`
                    ]
                );
            }

            res.json({
                success: true,
                message: 'Lead updated successfully'
            });
        } catch (error) {
            console.error('Update lead error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update lead'
            });
        }
    }

    // Delete lead
    async delete(req, res) {
        try {
            const { id } = req.params;

            let existingQuery = 'SELECT id FROM leads WHERE id = ?';
            const existingParams = [id];

            if (req.user && req.user.role_name !== 'Admin') {
                existingQuery += ' AND (assigned_to = ? OR created_by = ?)';
                existingParams.push(req.user.id, req.user.id);
            }

            const [existing] = await db.query(existingQuery, existingParams);

            if (existing.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Lead not found'
                });
            }

            await db.query('DELETE FROM leads WHERE id = ?', [id]);

            await db.query(
                `INSERT INTO activities (
                    activity_type,
                    description,
                    entity_type,
                    entity_id,
                    user_id
                ) VALUES (?, ?, ?, ?, ?)`,
                ['lead_deleted', 'Lead deleted', 'lead', id, req.user.id]
            );

            res.json({
                success: true,
                message: 'Lead deleted successfully'
            });
        } catch (error) {
            console.error('Delete lead error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete lead'
            });
        }
    }

    // Get lead sources
    async getSources(req, res) {
        try {
            const [sources] = await db.query(
                'SELECT * FROM lead_sources WHERE is_active = TRUE ORDER BY name ASC'
            );

            res.json({
                success: true,
                data: sources
            });
        } catch (error) {
            console.error('Get lead sources error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get lead sources'
            });
        }
    }

    // Get lead stages
    async getStages(req, res) {
        try {
            const [stages] = await db.query(
                'SELECT * FROM lead_stages ORDER BY stage_order ASC, id ASC'
            );

            res.json({
                success: true,
                data: stages
            });
        } catch (error) {
            console.error('Get lead stages error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get lead stages'
            });
        }
    }

    // Convert lead to customer
    async convertToCustomer(req, res) {
        try {
            const { id } = req.params;

            let leadQuery = 'SELECT * FROM leads WHERE id = ?';
            const leadParams = [id];

            if (req.user && req.user.role_name !== 'Admin') {
                leadQuery += ' AND (assigned_to = ? OR created_by = ?)';
                leadParams.push(req.user.id, req.user.id);
            }

            const [leads] = await db.query(leadQuery, leadParams);

            if (leads.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Lead not found'
                });
            }

            const lead = leads[0];

            if (lead.is_converted) {
                return res.status(400).json({
                    success: false,
                    message: 'Lead already converted'
                });
            }

            const [customerResult] = await db.query(
                `INSERT INTO customers (
                    first_name,
                    last_name,
                    email,
                    phone,
                    company,
                    source_id,
                    assigned_to,
                    customer_value
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    lead.first_name,
                    lead.last_name || '',
                    lead.email || '',
                    lead.phone || '',
                    lead.company || '',
                    lead.source_id || null,
                    lead.assigned_to || null,
                    lead.estimated_value || 0
                ]
            );

            await db.query(
                `UPDATE leads
                 SET is_converted = TRUE,
                     converted_at = NOW(),
                     converted_to_customer_id = ?
                 WHERE id = ?`,
                [customerResult.insertId, id]
            );

            await db.query(
                `INSERT INTO activities (
                    activity_type,
                    description,
                    entity_type,
                    entity_id,
                    user_id
                ) VALUES (?, ?, ?, ?, ?)`,
                ['lead_converted', 'Lead converted to customer', 'lead', id, req.user.id]
            );

            res.json({
                success: true,
                message: 'Lead converted to customer successfully',
                data: {
                    customer_id: customerResult.insertId
                }
            });
        } catch (error) {
            console.error('Convert lead error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to convert lead'
            });
        }
    }
}

module.exports = new LeadController();