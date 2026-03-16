const db = require('../config/database');

class DashboardController {
    async getStats(req, res) {
        try {
            const { period = 'month' } = req.query;
            let dateCondition = '';
            
            if (period === 'week') {
                dateCondition = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
            } else if (period === 'month') {
                dateCondition = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
            } else if (period === 'year') {
                dateCondition = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
            }

            // Total leads
            const [totalLeads] = await db.query(
                `SELECT COUNT(*) as count FROM leads ${dateCondition.replace('created_at', 'l.created_at').replace('AND', 'WHERE')}`
            );
            const [allLeads] = await db.query('SELECT COUNT(*) as count FROM leads');

            // Total customers
            const [totalCustomers] = await db.query('SELECT COUNT(*) as count FROM customers');

            // Converted deals (Closed Won)
            const [convertedDeals] = await db.query(
                `SELECT COUNT(*) as count, COALESCE(SUM(value), 0) as revenue 
                 FROM deals WHERE stage = 'closed_won' ${dateCondition.replace('created_at', 'created_at')}`
            );

            // Active deals
            const [activeDeals] = await db.query(
                `SELECT COUNT(*) as count, COALESCE(SUM(value), 0) as value 
                 FROM deals WHERE stage IN ('initiated', 'negotiation')`
            );

            // Properties
            const [totalProperties] = await db.query(
                `SELECT COUNT(*) as count FROM properties WHERE status = 'available'`
            );

            // Tasks due today
            const [tasksDueToday] = await db.query(
                `SELECT COUNT(*) as count FROM tasks 
                 WHERE status != 'completed' AND due_date <= CURDATE() AND assigned_to = ?`,
                [req.user.id]
            );

            // Followups due today
            const [followupsDueToday] = await db.query(
                `SELECT COUNT(*) as count FROM followups 
                 WHERE is_completed = FALSE AND scheduled_at <= NOW() AND assigned_to = ?`,
                [req.user.id]
            );

            // Leads by stage
            const [leadsByStage] = await db.query(
                `SELECT ls.name, ls.color, COUNT(l.id) as count 
                 FROM lead_stages ls 
                 LEFT JOIN leads l ON ls.id = l.stage_id 
                 GROUP BY ls.id, ls.name, ls.color 
                 ORDER BY ls.stage_order`
            );

            // Leads by source
            const [leadsBySource] = await db.query(
                `SELECT ls.name, COUNT(l.id) as count 
                 FROM lead_sources ls 
                 LEFT JOIN leads l ON ls.id = l.source_id 
                 GROUP BY ls.id, ls.name`
            );

            // Recent activities
            const [recentActivities] = await db.query(
                `SELECT a.*, u.first_name, u.last_name 
                 FROM activities a 
                 LEFT JOIN users u ON a.user_id = u.id 
                 ORDER BY a.created_at DESC LIMIT 10`
            );

            // Monthly revenue (last 6 months)
            const [monthlyRevenue] = await db.query(
                `SELECT DATE_FORMAT(actual_close_date, '%Y-%m') as month, 
                        SUM(value) as revenue, COUNT(*) as deals 
                 FROM deals 
                 WHERE stage = 'closed_won' AND actual_close_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                 GROUP BY DATE_FORMAT(actual_close_date, '%Y-%m')
                 ORDER BY month`
            );

            // Sales performance by user
            const [salesPerformance] = await db.query(
                `SELECT u.id, u.first_name, u.last_name, 
                        COUNT(DISTINCT l.id) as leads, 
                        COUNT(DISTINCT CASE WHEN l.is_converted = TRUE THEN l.id END) as converted,
                        COUNT(DISTINCT d.id) as deals,
                        COALESCE(SUM(CASE WHEN d.stage = 'closed_won' THEN d.value END), 0) as revenue
                 FROM users u
                 LEFT JOIN leads l ON u.id = l.assigned_to
                 LEFT JOIN deals d ON u.id = d.assigned_to
                 WHERE u.role_id IN (2, 3)
                 GROUP BY u.id, u.first_name, u.last_name
                 ORDER BY revenue DESC`
            );

            res.json({
                success: true,
                data: {
                    overview: {
                        total_leads: allLeads[0].count,
                        new_leads: totalLeads[0].count,
                        total_customers: totalCustomers[0].count,
                        converted_deals: convertedDeals[0].count,
                        revenue: convertedDeals[0].revenue,
                        active_deals: activeDeals[0].count,
                        active_deals_value: activeDeals[0].value,
                        available_properties: totalProperties[0].count,
                        tasks_due_today: tasksDueToday[0].count,
                        followups_due_today: followupsDueToday[0].count
                    },
                    leads_by_stage: leadsByStage,
                    leads_by_source: leadsBySource,
                    recent_activities: recentActivities,
                    monthly_revenue: monthlyRevenue,
                    sales_performance: salesPerformance
                }
            });
        } catch (error) {
            console.error('Dashboard stats error:', error);
            res.status(500).json({ success: false, message: 'Failed to get dashboard stats' });
        }
    }
}

module.exports = new DashboardController();
