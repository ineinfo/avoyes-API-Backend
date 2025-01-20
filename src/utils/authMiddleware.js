const jwt = require('jsonwebtoken');
const { API_SECRET_KEY } = process.env; 

const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'No token provided', status: 'error' });
    }

    try {
    const decoded = jwt.verify(token, API_SECRET_KEY);
    req.user_id = decoded.data.id; 
    req.role_id = decoded.data.role_id; 
    console.log('Decoded JWT:', decoded);

        next(); 
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token', status: 'error' });
    }
};

module.exports = authMiddleware;

