// src/routes/foodPlaceRoutes.js
const express = require('express');
const TABLE = require('../utils/tables')
const pool = require('../utils/db');
const router = express.Router();
const authMiddleware = require('../utils/authMiddleware');
const { uploadFoodPlace } = require('../utils/multerConfig');
const {multerErrorHandler} = require('../utils/common');


// Add
router.post('/', uploadFoodPlace,multerErrorHandler, authMiddleware,async (req, res) => {
    try {

        const {food_type_id,title,rating,location,description,short_description,map_url, condition} = req.body;

        if (!food_type_id || !title  || !location) {
            return res.status(400).json({ error: 'Food Type, Title, Rating, Location fields are required', status: false });
        }
        const [existingTitle] = await pool.query(`SELECT * FROM ${TABLE.FOODPLACE_TABLE} WHERE status = 1 and title = ? and location = ?`, [title,location]);
        if (existingTitle.length) {
            return res.status(400).json({ error: 'Record already exists', status: false });
        }


        // const baseUrl = req.protocol + '://' + req.get('host') + '/uploads/food-place/';
        // const image_urls = req.files.map(file => baseUrl + file.filename);
        // const image_url = image_urls.length > 0 ? image_urls[0] : '';

         // Generate the base URL for images
    const baseUrl = req.protocol + "://" + req.get("host") + "/uploads/food-place/";
    const image_urls = req.files.map((file) => baseUrl + file.filename);

    const [image_url, image_url2, image_url3, image_url4, image_url5] = [
      image_urls[0] || null,
      image_urls[1] || null,
      image_urls[2] || null,
      image_urls[3] || null,
      image_urls[4] || null,
    ];


        await pool.query(`INSERT INTO ${TABLE.FOODPLACE_TABLE} (food_type_id,title,rating,location,image_url,description,short_description,map_url ,image_url2, image_url3, image_url4, image_url5, \`condition\`) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`, [food_type_id,title,rating,location,image_url,description,short_description,map_url,image_url2, image_url3, image_url4, image_url5,condition]);
                
        return res.status(201).json({ message: 'Record Successfully Created', status: true });

    } catch (error) {
        console.log("error",error)
        return res.status(500).json({ error: 'Server error', status: false });
    }
});

// All List & Specific List=food type id wise bhi fetch karvu 
router.get('/:id?', async (req, res) => {
    try {

        const id = req.params.id;
        const { page = 1, limit = 10 } = req.body;
        const parsedPage = parseInt(page);
        const parsedLimit = parseInt(limit) > 0 ? parseInt(limit) : 10;
        const offset = (parsedPage - 1) * parsedLimit;

        if (id) {
            const [results] = await pool.query(`SELECT * FROM ${TABLE.FOODPLACE_TABLE} WHERE status = 1 and id = ?`, [id]);
            if (results.length > 0) {
                return res.status(200).json({ data: results[0], message: "Record Successfully Fetched", status: true });
            }
            return res.status(404).json({ error: "Sorry, Record Not Found", status: false });
        }

        let [results] = await pool.query(`SELECT * FROM ${TABLE.FOODPLACE_TABLE} WHERE status = 1 ORDER BY ID DESC LIMIT ? OFFSET ?`, [parsedLimit, offset]);

        return res.status(200).json({ data: results, message: "Record Successfully Fetched", status: true, count: results.length });

    } catch (error) {
        return res.status(500).json({ error: 'Server error', status: false });
    }
});


// Fetch food places based on food_type_id
router.get('/foodtype/:food_type_id?', async (req, res) => {
    try {
        const food_type_id = req.params.food_type_id;
        console.log(`Received request for food_type_id: ${food_type_id}`); // Debug log

        if (food_type_id) {
            const [results] = await pool.query(`SELECT * FROM ${TABLE.FOODPLACE_TABLE} WHERE status = 1 AND food_type_id = ?`, [food_type_id]);

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
router.put('/:id', uploadFoodPlace,multerErrorHandler,authMiddleware, async (req, res) => {
    try {

        const id = req.params.id;

        if (!id) {
            return res.status(400).json({ error: 'RowID must be required', status: false });
        }

        const [existingRecord] = await pool.query(`SELECT * FROM ${TABLE.FOODPLACE_TABLE} WHERE status = 1 and id = ?`, [id]);
        if (!existingRecord.length) {
            return res.status(404).json({ error: "Sorry, Record Not Found", status: false });
        }

        const {food_type_id,title,rating,location,description,short_description,map_url , conditions} = req.body;

        if (!food_type_id || !title  || !location) {
            return res.status(400).json({ error: 'Food Type, Title, Rating, Location fields are required', status: false });
        }
        
        const [existingTitle] = await pool.query(`SELECT * FROM ${TABLE.FOODPLACE_TABLE} WHERE status = 1 and title = ? and location = ?`, [title,location]);
        if (existingTitle.length) {
            return res.status(400).json({ error: 'Record already exists', status: false });
        }

        // let image_url = existingRecord[0].image_url;

        // if (req.files && req.files.length > 0) {
        //     const baseUrl = req.protocol + '://' + req.get('host') + '/uploads/food-place/';
        //     req.files.forEach(file => {
        //         if (file.fieldname === 'image_url') {
        //             image_url = baseUrl + file.filename;
        //         }
        //     });
        // }

        // Generate the base URL for images
    const baseUrl = req.protocol + "://" + req.get("host") + "/uploads/food-place/";
    const image_urls = req.files.map((file) => baseUrl + file.filename);

    const [image_url, image_url2, image_url3, image_url4, image_url5] = [
      image_urls[0] || existingRecord[0].image_url,
      image_urls[1] || existingRecord[0].image_url2,
      image_urls[2] || existingRecord[0].image_url3,
      image_urls[3] || existingRecord[0].image_url4,
      image_urls[4] || existingRecord[0].image_url5,
    ];


        await pool.query(`UPDATE ${TABLE.FOODPLACE_TABLE} SET food_type_id = ?, title = ?, image_url = ?, rating = ?, location = ?, description = ?, short_description = ?, map_url = ?,image_url2 = ?, image_url3 = ?, image_url4 = ?, image_url5 = ?, conditions = ?, updated_at = NOW() WHERE id = ?`, [food_type_id,title,image_url,rating,location,description,short_description,map_url, image_url2, image_url3, image_url4, image_url5,conditions,id]);

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
            await pool.query(`SELECT * FROM ${TABLE.FOODPLACE_TABLE} WHERE status = 1 and id = ?`, [deletedId]);
        }));

        const query = `UPDATE ${TABLE.FOODPLACE_TABLE} SET status = 0, deleted_at = NOW() WHERE id IN (?)`;

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