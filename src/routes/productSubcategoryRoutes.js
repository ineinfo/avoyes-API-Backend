// src/routes/productSubcategoryRoutes.js
const express = require('express');
const TABLE = require('../utils/tables')
const pool = require('../utils/db');
const router = express.Router();
const { uploadProductSubCategory } = require('../utils/multerConfig');
const authMiddleware = require('../utils/authMiddleware');
const {multerErrorHandler} = require('../utils/common');
// Add
router.post('/', uploadProductSubCategory,multerErrorHandler,authMiddleware, async (req, res) => {
    try {

        const { category_id, title, description } = req.body;

        if (!category_id || !title || !description) {
            return res.status(400).json({ error: 'Category ID, Title and Description fields are required', status: false });
        }
        
    const [existingTitle] = await pool.query(`SELECT * FROM ${TABLE.PRODUCT_SUBCATEGORY_TABLE} WHERE status = 1 and title = ? `, [title]);
    if (existingTitle.length) {
        return res.status(400).json({ error: 'Record already exists', status: false });
    }

       // const image_urls = req.files.map(file => `uploads/product-subcategory/${file.filename}`);
            // Generate the base URL for images
            const baseUrl = req.protocol + '://' + req.get('host') + '/uploads/product-subcategory/';
            const image_urls = req.files.map(file => baseUrl + file.filename);
        const image_url = image_urls.length > 0 ? image_urls[0] : '';

        await pool.query(`INSERT INTO ${TABLE.PRODUCT_SUBCATEGORY_TABLE} (category_id, title, image_url, description) VALUES (?, ?, ?, ?)`, [category_id, title, image_url, description]);

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
            const [results] = await pool.query(`SELECT * FROM ${TABLE.PRODUCT_SUBCATEGORY_TABLE} WHERE status = 1 and id = ?`, [id]);
            if (results.length > 0) {
                return res.status(200).json({ data: results[0], message: "Record Successfully Fetched", status: true });
            }
            return res.status(404).json({ error: "Sorry, Record Not Found", status: false });
        }

        let [results] = await pool.query(`SELECT * FROM ${TABLE.PRODUCT_SUBCATEGORY_TABLE} WHERE status = 1 ORDER BY ID DESC LIMIT ?, ?`, [offset, parsedLimit]);

        return res.status(200).json({ data: results, message: "Record Successfully Fetched", status: true, count: results.length });

    } catch (error) {
        return res.status(500).json({ error: 'Server error', status: false });
    }
});
// Update
router.put('/:id', uploadProductSubCategory,multerErrorHandler, authMiddleware, async (req, res) => {
    try {

        const id = req.params.id;

        if (!id) {
            return res.status(400).json({ error: 'RowID must be required', status: false });
        }

        const [existingRecord] = await pool.query(`SELECT * FROM ${TABLE.PRODUCT_SUBCATEGORY_TABLE} WHERE status = 1 and id = ?`, [id]);
        if (!existingRecord.length) {
            return res.status(404).json({ error: "Sorry, Record Not Found", status: false });
        }

        const { category_id, title, description } = req.body;

        if (!category_id || !title || !description) {
            return res.status(400).json({ error: 'Category ID, Title and Description fields are required', status: false });
        }

        const [existingTitle] = await pool.query(`SELECT * FROM ${TABLE.PRODUCT_SUBCATEGORY_TABLE} WHERE status = 1 and title = ? `, [title]);
        if (existingTitle.length) {
            return res.status(400).json({ error: 'Record already exists', status: false });
        }

        const baseUrl = req.protocol + '://' + req.get('host') + '/uploads/product-subcategory/';
        req.files.forEach(file => {
            if (file.fieldname === 'image_url') {
                image_url = baseUrl + file.filename;
            }
        });

        await pool.query(`UPDATE ${TABLE.PRODUCT_SUBCATEGORY_TABLE} SET category_id = ?, title = ?, image_url = ?, description = ?, updated_at = NOW() WHERE id = ?`, [category_id, title, image_url, description, id]);

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
            await pool.query(`SELECT * FROM ${TABLE.PRODUCT_SUBCATEGORY_TABLE} WHERE status = 1 and id = ?`, [deletedId]);
        }));

        const query = `UPDATE ${TABLE.PRODUCT_SUBCATEGORY_TABLE} SET status = 0, deleted_at = NOW() WHERE id IN (?)`;

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