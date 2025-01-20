// src/routes/aboutusRoutes.js
const express = require('express');
const TABLE = require('../utils/tables')
const pool = require('../utils/db');
const router = express.Router();
const authMiddleware = require('../utils/authMiddleware');

// All List & Specific List
router.get('/', async (req, res) => {
    try {

        const [results] = await pool.query(`SELECT * FROM ${TABLE.ABOUT_US_TABLE} WHERE id = ?`, [1]);
        if (results.length > 0) {
            return res.status(200).json({ data: results[0], message: "Record Successfully Fetched", status: true });
        }
        return res.status(404).json({ error: "Sorry, Record Not Found", status: false });

    } catch (error) {
        return res.status(500).json({ error: 'Server error', status: false });
    }
});

// Update
router.put('/', authMiddleware, async (req, res) => {
    try {

        const [existingRecord] = await pool.query(`SELECT * FROM ${TABLE.ABOUT_US_TABLE} WHERE id = ?`, [1]);
        if (!existingRecord.length) {
            return res.status(404).json({ error: "Sorry, Record Not Found", status: false });
        }

        const { title, short_description, description } = req.body;

        await pool.query(`UPDATE ${TABLE.ABOUT_US_TABLE} SET title = ?, short_description = ?, description = ? WHERE id = ?`, [title, short_description, description, 1]);

        return res.status(200).json({ error: "Record Successfully Updated", status: true });

    } catch (error) {
        return res.status(500).json({ error: 'Server error', status: false });
    }
});

module.exports = router;