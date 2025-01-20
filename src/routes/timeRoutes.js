// src/routes/timeRoutes.js
const express = require('express');
const TABLE = require('../utils/tables')
const pool = require('../utils/db');
const router = express.Router();
const authMiddleware = require('../utils/authMiddleware');

//add time
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { time } = req.body;

        // Check if the time field is provided
        if (!time) {
            return res.status(400).json({ error: 'Time field is required', status: false });
        }

        const [existingTitle] = await pool.query(`SELECT * FROM ${TABLE.TIME_TABLE} WHERE time = ? AND status = 1`, [time]);
        if (existingTitle.length > 0) {
            return res.status(400).json({ error: 'This record already exists in the database.', status: false });
        }


        // Validate the time format: hh:mm AM/PM
        const timeRegex = /^(0[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/;
        if (!timeRegex.test(time)) {
            return res.status(400).json({ error: 'Invalid time format. Please use hh:mm AM/PM', status: false });
        }

    
        await pool.query(`INSERT INTO ${TABLE.TIME_TABLE} (time) VALUES (?)`, [time]);

        return res.status(201).json({ message: 'Record Successfully Created', status: true });

    } catch (error) {
        
        return res.status(500).json({ error: 'Server error', status: false });
    }
});


// All List & Specific List
router.get('/:id?', async (req, res) => {
    try {

        const id = req.params.id;
        const { page = 1, limit = 10 } = req.body;
        const parsedPage = parseInt(page);
        const parsedLimit = parseInt(limit) > 0 ? parseInt(limit) : 10;
        const offset = (parsedPage - 1) * parsedLimit;

        if (id) {
            const [results] = await pool.query(`SELECT * FROM ${TABLE.TIME_TABLE} WHERE status = 1 and id = ?`, [id]);
            if (results.length > 0) {
                return res.status(200).json({ data: results[0], message: "Record Successfully Fetched", status: true });
            }
            return res.status(404).json({ error: "Sorry, Record Not Found", status: false });
        }

        let [results] = await pool.query(`SELECT * FROM ${TABLE.TIME_TABLE} WHERE status = 1 ORDER BY ID DESC LIMIT ?,?`, [offset, parsedLimit]);

        return res.status(200).json({ data: results, message: "Record Successfully Fetched", status: true, count: results.length });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: 'Server error', status: false });
    }
});

// Update
router.put('/:id', authMiddleware, async (req, res) => {
    try {

        const id = req.params.id;

        if (!id) {
            return res.status(400).json({ error: 'RowID must be required', status: false });
        }

        const [existingRecord] = await pool.query(`SELECT * FROM ${TABLE.TIME_TABLE} WHERE status = 1 and id = ?`, [id]);
        if (!existingRecord.length) {
            return res.status(404).json({ error: "Sorry, Record Not Found", status: false });
        }

        const {time} = req.body;

        if (!time) {
            return res.status(400).json({ error: 'Title fields are required', status: false });
        }

        
        const [existingTitle] = await pool.query(`SELECT * FROM ${TABLE.TIME_TABLE} WHERE time = ? AND status = 1`, [time]);
        if (existingTitle.length > 0) {
            return res.status(400).json({ error: 'This record already exists in the database.', status: false });
        }


        await pool.query(`UPDATE ${TABLE.TIME_TABLE} SET time = ?, updated_at = NOW() WHERE id = ?`, [time, id]);

        return res.status(200).json({ message: "Record Successfully Updated", status: true });

    } catch (error) {
        return res.status(500).json({ error: 'Server error', status: false });
    }
});

// Delete
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const idParam = req.params.id;

        const deletedIds = idParam ? idParam.split(',') : [];

        if (!deletedIds || deletedIds.length === 0) {
            return res.status(400).json({ error: 'RowID must be required', status: false });
        }

        await Promise.all(deletedIds.map(async (deletedId) => {
            await pool.query(`SELECT * FROM ${TABLE.TIME_TABLE} WHERE status = 1 and id = ?`, [deletedId]);
        }));

        const query = `UPDATE ${TABLE.TIME_TABLE} SET status = 0, deleted_at = NOW() WHERE id IN (?)`;

        const [results] = await pool.query(query, [deletedIds]);
        if (results.affectedRows > 0) {
            return res.status(200).json({ message: "Record Successfully Deleted", status: true });
        }
        return res.status(404).json({ error: "Sorry, Record Not Found", status: false });
    } catch (error) {
        return res.status(500).json({ error: 'Server error', status: false });
    }
});

module.exports = router;