// src/routes/desktopMastheadRoutes.js
const express = require('express');
const TABLE = require('../utils/tables');
const pool = require('../utils/db');
const router = express.Router();
const authMiddleware = require('../utils/authMiddleware');

// Add
router.post('/', authMiddleware,async (req, res) => {
    try {
        const { title, description,short_description,button_name,button_link } = req.body;

        if (!title || !description || !short_description || !button_name || !button_link) {
            return res.status(400).json({ error: 'Title, Description, Short Description, Button Name And Button Link fields are required', status: false });
        }

        await pool.query(`INSERT INTO ${TABLE.DESKTOPMASTHEAD_TABLE} (title, description,short_description,button_name,button_link) VALUES (?,?,?,?,?)`, [title, description,short_description,button_name,button_link]);

        return res.status(201).json({ message: 'Record Successfully Created', status: true });

    } catch (error) {
        return res.status(500).json({ error: 'Server error', status: false });
    }
});

// All List & Specific List
router.get('/:id?', async (req, res) => {
    try {
        const id = req.params.id;

        if (id) {
            const [results] = await pool.query(`SELECT * FROM ${TABLE.DESKTOPMASTHEAD_TABLE} WHERE status = 1 and id = ?`, [id]);
            if (results.length > 0) {
                return res.status(200).json({ data: results[0], message: "Record Successfully Fetched", status: true });
            }
            return res.status(404).json({ error: "Sorry, Record Not Found", status: false });
        }

        const [results] = await pool.query(`SELECT * FROM ${TABLE.DESKTOPMASTHEAD_TABLE} WHERE status = 1 ORDER BY ID DESC`);
        return res.status(200).json({ data: results, message: "Record Successfully Fetched", status: true, count: results.length });
    } catch (error) {
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

        const [existingRecord] = await pool.query(`SELECT * FROM ${TABLE.DESKTOPMASTHEAD_TABLE} WHERE status = 1 and id = ?`, [id]);
        if (!existingRecord.length) {
            return res.status(404).json({ error: "Sorry, Record Not Found", status: false });
        }

        const { title, description,short_description,button_name,button_link } = req.body;

        await pool.query(`UPDATE ${TABLE.DESKTOPMASTHEAD_TABLE} SET title = ?, description = ?,short_description = ?,button_name = ?,button_link = ?, updated_at = NOW() WHERE id = ?`, [title, description,short_description,button_name,button_link, id]);

        return res.status(200).json({ error: "Record Successfully Updated", status: true });

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
            await pool.query(`SELECT * FROM ${TABLE.DESKTOPMASTHEAD_TABLE} WHERE status = 1 and id = ?`, [deletedId]);
        }));

        const query = `UPDATE ${TABLE.DESKTOPMASTHEAD_TABLE} SET status = 0, deleted_at = NOW() WHERE id IN (?)`;

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