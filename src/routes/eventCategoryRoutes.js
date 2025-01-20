// src/routes/colorTagsRoutes.js
const express = require('express');
const TABLE = require('../utils/tables')
const pool = require('../utils/db');
const router = express.Router();
const authMiddleware = require('../utils/authMiddleware');

// Add
router.post('/', authMiddleware, async (req, res) => {
    try {
        const user_id = req.user_id; 
        const { title } = req.body;

        if (!title || !user_id) {
            return res.status(400).json({ error: 'title are required', status: false });
        }

        const [productCheck] = await pool.query(`SELECT id FROM ${TABLE.EVENT_CATEGORIES} WHERE title = ? AND status != 0`, [title]);
        if (productCheck.length > 0) {
            return res.status(404).json({ error: 'title already exist', status: false });
        }
        
        await pool.query(
            `INSERT INTO ${TABLE.EVENT_CATEGORIES} (title,user_id) VALUES (?, ?)`,
            [title, user_id]
        );

        return res.status(201).json({ message: 'Record Successfully Created', status: true });

    } catch (error) {
        console.error(error);
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
            const [results] = await pool.query(`SELECT * FROM ${TABLE.EVENT_CATEGORIES} WHERE status !=0 and id = ?`, [id]);
            if (results.length > 0) {
                return res.status(200).json({ data: results[0], message: "Record Successfully Fetched", status: true });
            }
            return res.status(404).json({ error: "Sorry, Record Not Found", status: false });
        }

        let [results] = await pool.query(`SELECT * FROM ${TABLE.EVENT_CATEGORIES} WHERE status != 0 ORDER BY id DESC LIMIT ?, ?`, [offset, parsedLimit]);

        return res.status(200).json({ data: results, message: "Record Successfully Fetched", status: true, count: results.length });

    } catch (error) {
        return res.status(500).json({ error: 'Server error', status: false });
    }
});

// Update
router.put('/:id', authMiddleware, async (req, res) => {
    try {

        const id = req.params.id;
        const user_id = req.user_id;

        if (!id) {
            return res.status(400).json({ error: 'RowID must be required', status: false });
        }
    

        const [existingRecord] = await pool.query(`SELECT * FROM ${TABLE.EVENT_CATEGORIES} WHERE status != 0 and id = ?`, [id]);
        if (!existingRecord.length) {
            return res.status(404).json({ error: "Sorry, Record Not Found", status: false });
        }

        const { title } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'title fields are required', status: false });
        }
        

        await pool.query(`UPDATE ${TABLE.EVENT_CATEGORIES} SET title = ?, user_id = ? WHERE id = ?`, [title, user_id, id]);

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
            await pool.query(`SELECT * FROM ${TABLE.EVENT_CATEGORIES} WHERE status != 0 and id = ?`, [deletedId]);
        }));

        const query = `UPDATE ${TABLE.EVENT_CATEGORIES} SET status = 0 WHERE id IN (?)`;

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