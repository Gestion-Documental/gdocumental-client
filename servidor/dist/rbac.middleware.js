"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRole = checkRole;
function checkRole(allowed) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!allowed.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
        }
        return next();
    };
}
