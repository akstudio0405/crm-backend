const db = require('../config/database');

class PipelineController {
    async getAll(req, res) {
        try {
            const [pipelines] = await db.query('SELECT * FROM pipelines ORDER BY id');
            
            for (let pipeline of pipelines) {
                const [stages] = await db.query(
                    `SELECT ls.*, ps.stage_order as pipeline_stage_order
                     FROM pipeline_stages ps
                     JOIN lead_stages ls ON ps.stage_id = ls.id
                     WHERE ps.pipeline_id = ?
                     ORDER BY ps.stage_order`,
                    [pipeline.id]
                );
                pipeline.stages = stages;
            }

            res.json({ success: true, data: pipelines });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to get pipelines' });
        }
    }

    async create(req, res) {
        try {
            const { name, description, is_default } = req.body;

            if (is_default) {
                await db.query('UPDATE pipelines SET is_default = FALSE');
            }

            const [result] = await db.query(
                'INSERT INTO pipelines (name, description, is_default) VALUES (?, ?, ?)',
                [name, description || '', is_default || false]
            );

            res.status(201).json({
                success: true,
                message: 'Pipeline created successfully',
                data: { id: result.insertId }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to create pipeline' });
        }
    }

    async update(req, res) {
        try {
            const { id } = req.params;
            const { name, description, is_default } = req.body;

            if (is_default) {
                await db.query('UPDATE pipelines SET is_default = FALSE');
            }

            await db.query(
                'UPDATE pipelines SET name = ?, description = ?, is_default = ? WHERE id = ?',
                [name, description, is_default, id]
            );

            res.json({ success: true, message: 'Pipeline updated successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to update pipeline' });
        }
    }

    async addStage(req, res) {
        try {
            const { id } = req.params;
            const { stage_id } = req.body;

            const [maxOrder] = await db.query(
                'SELECT MAX(stage_order) as max_order FROM pipeline_stages WHERE pipeline_id = ?',
                [id]
            );

            await db.query(
                'INSERT INTO pipeline_stages (pipeline_id, stage_id, stage_order) VALUES (?, ?, ?)',
                [id, stage_id, (maxOrder[0].max_order || 0) + 1]
            );

            res.json({ success: true, message: 'Stage added to pipeline' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to add stage' });
        }
    }
}

class ReportController {
    async getAll(req, res) {
        try {
            const [reports] = await db.query(
                `SELECT r.*, u.first_name, u.last_name 
                 FROM reports r 
                 LEFT JOIN users u ON r.generated_by = u.id
                 ORDER BY r.created_at DESC`
            );
            res.json({ success: true, data: reports });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to get reports' });
        }
    }

    async generate(req, res) {
        try {
            const { name, report_type, parameters } = req.body;

            const [result] = await db.query(
                'INSERT INTO reports (name, report_type, parameters, generated_by) VALUES (?, ?, ?, ?)',
                [name, report_type, JSON.stringify(parameters || {}), req.user.id]
            );

            // Generate report data based on type
            let reportData = {};
            
            switch (report_type) {
                case 'leads':
                    reportData = await this.generateLeadsReport(parameters);
                    break;
                case 'deals':
                    reportData = await this.generateDealsReport(parameters);
                    break;
                case 'revenue':
                    reportData = await this.generateRevenueReport(parameters);
                    break;
                default:
                    reportData = { message: 'Report type not supported' };
            }

            res.status(201).json({
                success: true,
                message: 'Report generated successfully',
                data: { id: result.insertId, ...reportData }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to generate report' });
        }
    }

    async generateLeadsReport(filters) {
        const [leads] = await db.query(
            `SELECT DATE(created_at) as date, COUNT(*) as total, 
                    SUM(CASE WHEN is_converted = TRUE THEN 1 ELSE 0 END) as converted
             FROM leads 
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
             GROUP BY DATE(created_at)`
        );
        return { leads };
    }

    async generateDealsReport(filters) {
        const [deals] = await db.query(
            `SELECT stage, COUNT(*) as count, SUM(value) as value 
             FROM deals 
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
             GROUP BY stage`
        );
        return { deals };
    }

    async generateRevenueReport(filters) {
        const [revenue] = await db.query(
            `SELECT DATE_FORMAT(actual_close_date, '%Y-%m') as month, 
                    SUM(value) as revenue, COUNT(*) as deals
             FROM deals 
             WHERE stage = 'closed_won' AND actual_close_date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
             GROUP BY DATE_FORMAT(actual_close_date, '%Y-%m')`
        );
        return { revenue };
    }
}

class SettingsController {
    async getAll(req, res) {
        try {
            const [settings] = await db.query('SELECT * FROM settings');
            res.json({ success: true, data: settings });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to get settings' });
        }
    }

    async update(req, res) {
        try {
            const { setting_key, setting_value } = req.body;

            await db.query(
                'UPDATE settings SET setting_value = ? WHERE setting_key = ?',
                [setting_value, setting_key]
            );

            res.json({ success: true, message: 'Setting updated successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to update setting' });
        }
    }

    async create(req, res) {
        try {
            const { setting_key, setting_value, setting_type, description } = req.body;

            await db.query(
                'INSERT INTO settings (setting_key, setting_value, setting_type, description) VALUES (?, ?, ?, ?)',
                [setting_key, setting_value, setting_type || 'string', description || '']
            );

            res.status(201).json({ success: true, message: 'Setting created successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to create setting' });
        }
    }
}

module.exports = { PipelineController, ReportController, SettingsController };
