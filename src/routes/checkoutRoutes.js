// src/routes/checkoutRoutes.js
const express = require('express');
const TABLE = require('../utils/tables')
const pool = require('../utils/db');
const router = express.Router();
const authMiddleware = require('../utils/authMiddleware');



router.post('/', authMiddleware, async (req, res) => {
    try {
        const { user_id, total, subtotal } = req.body;

        // Allow total and subtotal to be zero
        if (user_id === undefined || total === undefined || subtotal === undefined) {
            return res.status(400).json({ error: 'User id, total, Sub Total fields are required', status: false });
        }

        // Check if the user_id exists in the users table
        const userCheckQuery = `SELECT COUNT(*) as count FROM users WHERE id = ?`;
        const [userCheckResult] = await pool.query(userCheckQuery, [user_id]);

        if (userCheckResult[0].count === 0) {
            return res.status(404).json({ error: 'User not found', status: false });
        }

        // Check if the user_id already exists in the checkout table
        const checkoutCheckQuery = `SELECT COUNT(*) as count FROM ${TABLE.CHECKOUT_TABLE} WHERE user_id = ?`;
        const [checkoutCheckResult] = await pool.query(checkoutCheckQuery, [user_id]);

        if (checkoutCheckResult[0].count > 0) {
            return res.status(409).json({ error: 'Checkout record for this user already exists', status: false });
        }

        // add in checkout
        await pool.query(`INSERT INTO ${TABLE.CHECKOUT_TABLE} (user_id, total, subtotal) VALUES (?, ?, ?)`, [user_id, total, subtotal]);
        return res.status(201).json({ message: 'Record Successfully Created', status: true });
    } catch (error) {
 
        return res.status(500).json({ error: 'Server error', status: false });
    }
});




// Fetch records
router.get('/:id?', async (req, res) => {
    try {
        const id = req.params.id;
        const { page = 1, limit = 10 } = req.body;
        const parsedPage = parseInt(page);
        const parsedLimit = parseInt(limit) > 0 ? parseInt(limit) : 10;
        const offset = (parsedPage - 1) * parsedLimit;

        if (id) {
            let [results] = await pool.query(`SELECT * FROM ${TABLE.CHECKOUT_TABLE} WHERE id = ? AND status = 1`, [id]);

            if (results.length > 0) {
                return res.status(200).json({ data: results[0], message: "Record Successfully Fetched", status: true });
            }
            return res.status(404).json({ error: "Sorry, Record Not Found", status: false });
        }

        let [results] = await pool.query(`SELECT * FROM ${TABLE.CHECKOUT_TABLE} WHERE status = 1 ORDER BY ID DESC LIMIT ? ,?`, [offset, parsedLimit, ]);
        return res.status(200).json({ data: results, message: "Record Successfully Fetched", status: true, count: results.length });
    } catch (error) {
        return res.status(500).json({ error: 'Server error', status: false });
    }
});







module.exports = router;