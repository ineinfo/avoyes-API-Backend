// src/routes/productTagsAddedRoutes.js
const express = require('express');
const TABLE = require('../utils/tables')
const pool = require('../utils/db');
const router = express.Router();
const authMiddleware = require('../utils/authMiddleware');

// Add
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { product_id, tag_id } = req.body;

        // Validate if product_id and tag_id are provided
        if (!product_id || !tag_id) {
            return res.status(400).json({ error: 'product_id and tag_id fields are required', status: false });
        }

        // Check if product_id exists in the products table
        const [productCheck] = await pool.query(`SELECT 1 FROM ${TABLE.PRODUCTS_TABLE} WHERE id = ?`, [product_id]);
        if (productCheck.length === 0) {
            return res.status(404).json({ error: 'product_id does not exist', status: false });
        }

        // Check if tag_id exists in the product_tag table
        const [tagCheck] = await pool.query(`SELECT 1 FROM ${TABLE.PRODUCT_TAG_TABLE} WHERE id = ?`, [tag_id]);
        if (tagCheck.length === 0) {
            return res.status(404).json({ error: 'tag_id does not exist', status: false });
        }

        // Check if the combination of product_id and tag_id already exists
        const [existingCombination] = await pool.query(
            `SELECT 1 FROM ${TABLE.PRODUCT_TAG_ADDED_TABLE} WHERE product_id = ? AND tag_id = ?`,
            [product_id, tag_id]
        );
        if (existingCombination.length > 0) {
            return res.status(409).json({ error: 'This tag_id is already associated with the given product_id', status: false });
        }

        // Insert the new record into the product_tag_added_table
        await pool.query(
            `INSERT INTO ${TABLE.PRODUCT_TAG_ADDED_TABLE} (product_id, tag_id) VALUES (?, ?)`,
            [product_id, tag_id]
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
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const id = req.params.id;

        if (!id) {
            return res.status(400).json({ error: 'RowID must be required', status: false });
        }

        // Check if the record exists
        const [existingRecord] = await pool.query(`SELECT * FROM ${TABLE.PRODUCT_TAG_ADDED_TABLE} WHERE id = ?`, [id]);
        if (!existingRecord.length) {
            return res.status(404).json({ error: "Sorry, Record Not Found", status: false });
        }

        const { product_id, tag_id } = req.body;

        if (!product_id) {
            return res.status(400).json({ error: 'product_id field is required', status: false });
        }

        if (!tag_id) {
            return res.status(400).json({ error: 'tag_id field is required', status: false });
        }

        // Update the record in the product_tag_added_table
        await pool.query(`UPDATE ${TABLE.PRODUCT_TAG_ADDED_TABLE} SET product_id = ?, tag_id = ?, updated_at = NOW() WHERE id = ?`, [product_id, tag_id, id]);

        return res.status(200).json({ message: "Record Successfully Updated", status: true });

    } catch (error) {
        console.log(error);
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