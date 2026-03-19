const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../config/database');
require('dotenv').config();

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, config.JWT_SECRET);
            req.user = decoded;
            next();
        } catch (err) {
            console.error('JWT verify error:', err.message);
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }
    } catch (error) {
        console.error('Authentication error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Authentication error'
        });
    }
};

const checkPermission = (permissionName) => {
    return async (req, res, next) => {
        try {
            const db = require('../config/database');

            const [permissions] = await db.query(
                `SELECT p.name
                 FROM permissions p
                 JOIN role_permissions rp ON p.id = rp.permission_id
                 WHERE rp.role_id = ?`,
                [req.user.role_id]
            );

            const hasPermission = permissions.some(
                (permission) => permission.name === permissionName
            );

            if (!hasPermission) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. Insufficient permissions.'
                });
            }

            next();
        } catch (error) {
            console.error('Permission check failed:', error.message);
            return res.status(500).json({
                success: false,
                message: 'Permission check failed'
            });
        }
    };
};

module.exports = { authMiddleware, checkPermission };
