// src/routes/popularDishesRoutes.js
const express = require('express');
const TABLE = require('../utils/tables')
const pool = require('../utils/db');
const router = express.Router();
const authMiddleware = require('../utils/authMiddleware');
const {  uploadPopularFood } = require('../utils/multerConfig');
const {multerErrorHandler} = require('../utils/common');


// Add
router.post('/',  uploadPopularFood,multerErrorHandler, authMiddleware,async (req, res) => {
    try {

        const {food_place_id,title,description} = req.body;

        if (!food_place_id || !title || !description) {
            return res.status(400).json({ error: 'Food Place ID, Title and Description fields are required', status: false });
        }

        
        const [existingTitle] = await pool.query(`SELECT * FROM ${TABLE.POPULAR_DISHES_TABLE} WHERE title = ? AND status = 1`, [title]);
        if (existingTitle.length > 0) {
            return res.status(400).json({ error: 'This record already exists in the database.', status: false });
        }

        const baseUrl = req.protocol + '://' + req.get('host') + '/uploads/popular-food/';
        const image_urls = req.files.map(file => baseUrl + file.filename);
        const image_url = image_urls.length > 0 ? image_urls[0] : '';


        await pool.query(`INSERT INTO ${TABLE. POPULAR_DISHES_TABLE} (food_place_id,title,description,image_url) VALUES (?,?,?,?)`, [food_place_id,title,description,image_url]);
                
        return res.status(201).json({ message: 'Record Successfully Created', status: true });

    } catch (error) {
        return res.status(500).json({ error: 'Server error', status: false });
    }
});

// All List & Specific List=food type id 
router.get('/:id?', async (req, res) => {
    try {

        const id = req.params.id;
        const { page = 1, limit = 10 } = req.body;
        const parsedPage = parseInt(page);
        const parsedLimit = parseInt(limit) > 0 ? parseInt(limit) : 10;
        const offset = (parsedPage - 1) * parsedLimit;

        if (id) {
            const [results] = await pool.query(`SELECT * FROM ${TABLE. POPULAR_DISHES_TABLE} WHERE status = 1 and id = ?`, [id]);
            if (results.length > 0) {
                return res.status(200).json({ data: results[0], message: "Record Successfully Fetched", status: true });
            }
            return res.status(404).json({ error: "Sorry, Record Not Found", status: false });
        }

        let [results] = await pool.query(`SELECT * FROM ${TABLE. POPULAR_DISHES_TABLE} WHERE status = 1 ORDER BY ID DESC LIMIT ?,?`, [offset, parsedLimit]);

        return res.status(200).json({ data: results, message: "Record Successfully Fetched", status: true, count: results.length });

    } catch (error) {
        return res.status(500).json({ error: 'Server error', status: false });
    }
});


// Fetch food dish based on food_place_id==baki
router.get('/foodplace/:food_place_id?', async (req, res) => {
    try {
        const food_place_id = req.params.food_place_id;


        if (food_place_id) {
            const [results] = await pool.query(`SELECT * FROM ${TABLE. POPULAR_DISHES_TABLE} WHERE status = 1 AND food_place_id = ?`, [food_place_id]);

            if (results.length > 0) {
                return res.status(200).json({ data: results, message: "Records Successfully Fetched", status: true });
            }
            return res.status(404).json({ error: "Sorry, No Records Found for this Food Type", status: false });
        }

        return res.status(400).json({ error: "Food Type ID is required", status: false });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Server error', status: false });
    }
});



// Update
router.put('/:id',  uploadPopularFood,multerErrorHandler,authMiddleware, async (req, res) => {
    try {

        const id = req.params.id;

        if (!id) {
            return res.status(400).json({ error: 'RowID must be required', status: false });
        }

        const [existingRecord] = await pool.query(`SELECT * FROM ${TABLE. POPULAR_DISHES_TABLE} WHERE status = 1 and id = ?`, [id]);
        if (!existingRecord.length) {
            return res.status(404).json({ error: "Sorry, Record Not Found", status: false });
        }

        const {food_place_id,title,description} = req.body;

        if (!food_place_id || !title || !description) {
            return res.status(400).json({ error: 'Food Place, Title and description fields are required', status: false });
        }

        let image_url = existingRecord[0].image_url;

        if (req.files && req.files.length > 0) {
            const baseUrl = req.protocol + '://' + req.get('host') + '/uploads/popular-food/';
            req.files.forEach(file => {
                if (file.fieldname === 'image_url') {
                    image_url = baseUrl + file.filename;
                }
            });
        }
        
        const [existingTitle] = await pool.query(`SELECT * FROM ${TABLE.POPULAR_DISHES_TABLE} WHERE title = ? AND status = 1 AND id != ?`, [title, id]);
        if (existingTitle.length > 0) {
            return res.status(400).json({ error: 'This title already exists in the database.', status: false });
        }

        await pool.query(`UPDATE ${TABLE. POPULAR_DISHES_TABLE} SET food_place_id = ?, title = ?, image_url = ?, description = ?, updated_at = NOW() WHERE id = ?`, 
            [food_place_id,title,image_url,description,id]);

        return res.status(200).json({ message: "Record Successfully Updated", status: true });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: 'Server error', status: false });
    }
});


// Delete
router.delete('/:id',authMiddleware, async (req, res) => {
    try {
        const idParam = req.params.id;

        const deletedIds = idParam ? idParam.split(',') : [];

        if (!deletedIds || deletedIds.length === 0) {
            return res.status(400).json({ error: 'RowID must be required', status: false });
        }

        await Promise.all(deletedIds.map(async (deletedId) => {
            await pool.query(`SELECT * FROM ${TABLE. POPULAR_DISHES_TABLE} WHERE status = 1 and id = ?`, [deletedId]);
        }));

        const query = `UPDATE ${TABLE. POPULAR_DISHES_TABLE} SET status = 0, deleted_at = NOW() WHERE id IN (?)`;

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