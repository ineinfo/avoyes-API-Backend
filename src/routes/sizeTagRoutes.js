// src/routes/sizeTagsRoutes.js
const express = require('express');
const TABLE = require('../utils/tables')
const pool = require('../utils/db');
const router = express.Router();
const authMiddleware = require('../utils/authMiddleware');

// Add


router.post('/', authMiddleware, async (req, res) => {
    try {
        const { product_id, size_id } = req.body;

        // Validate if product_id and size_id are provided
        if (!product_id || !size_id) {
            return res.status(400).json({ error: 'product_id and size_id fields are required', status: false });
        }

        // Check if product_id exists in the products table
        const [productCheck] = await pool.query(`SELECT 1 FROM ${TABLE.PRODUCTS_TABLE} WHERE id = ?`, [product_id]);
        if (productCheck.length === 0) {
            return res.status(404).json({ error: 'product_id does not exist', status: false });
        }

        // Check if size_id exists in the size table
        const [sizeCheck] = await pool.query(`SELECT 1 FROM ${TABLE.PRODUCT_SIZE_TABLE} WHERE id = ?`, [size_id]);
        if (sizeCheck.length === 0) {
            return res.status(404).json({ error: 'size_id does not exist', status: false });
        }

        // Check if the combination of product_id and size_id already exists
        const [existingCombination] = await pool.query(
            `SELECT 1 FROM ${TABLE.SIZE_TAG_TABLE} WHERE product_id = ? AND size_id = ?`,
            [product_id, size_id]
        );
        if (existingCombination.length > 0) {
            return res.status(409).json({ error: 'This size_id is already associated with the given product_id', status: false });
        }

        // Insert the new record into the size_tag_table
        await pool.query(
            `INSERT INTO ${TABLE.SIZE_TAG_TABLE} (product_id, size_id) VALUES (?, ?)`,
            [product_id, size_id]
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
            const [results] = await pool.query(`SELECT * FROM ${TABLE.SIZE_TAG_TABLE} WHERE status = 1 and id = ?`, [id]);
            if (results.length > 0) {
                return res.status(200).json({ data: results[0], message: "Record Successfully Fetched", status: true });
            }
            return res.status(404).json({ error: "Sorry, Record Not Found", status: false });
        }

        let [results] = await pool.query(`SELECT * FROM ${TABLE.SIZE_TAG_TABLE} WHERE status = 1 ORDER BY ID DESC LIMIT ?, ?`, [offset, parsedLimit]);

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
    

        const [existingRecord] = await pool.query(`SELECT * FROM ${TABLE.SIZE_TAG_TABLE} WHERE status = 1 and id = ?`, [id]);
        if (!existingRecord.length) {
            return res.status(404).json({ error: "Sorry, Record Not Found", status: false });
        }

        const { product_id, size_id } = req.body;

        if (!product_id) {
            return res.status(400).json({ error: 'product_id fields are required', status: false });
        }
        


        await pool.query(`UPDATE ${TABLE.SIZE_TAG_TABLE} SET product_id = ?, size_id = ?, updated_at = NOW() WHERE id = ?`, [product_id, size_id, id]);

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
            await pool.query(`SELECT * FROM ${TABLE.SIZE_TAG_TABLE} WHERE status = 1 and id = ?`, [deletedId]);
        }));

        const query = `UPDATE ${TABLE.SIZE_TAG_TABLE} SET status = 0, deleted_at = NOW() WHERE id IN (?)`;

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