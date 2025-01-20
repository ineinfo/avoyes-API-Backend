// src/routes/ratingRoutes.js
const express = require('express');
const TABLE = require('../utils/tables')
const pool = require('../utils/db');
const router = express.Router();
const authMiddleware = require('../utils/authMiddleware');


router.post('/', authMiddleware, async (req, res) => {
    try {
        const { product_id, user_id, ratings } = req.body;

        if (!product_id || !user_id || !ratings) {
            return res.status(400).json({ error: 'product_id, user_id, and ratings fields are required', status: false });
        }

        // Check if the user_id exists in the users table
        const [userResults] = await pool.query(
            `SELECT id FROM ${TABLE.USERS_TABLE} WHERE id = ?`,
            [user_id]
        );

        if (userResults.length === 0) {
            return res.status(404).json({ error: 'User does not exist', status: false });
        }

        // Check if the product_id exists in the products table
        const [productResults] = await pool.query(
            `SELECT id FROM ${TABLE.PRODUCTS_TABLE} WHERE id = ?`,
            [product_id]
        );

        if (productResults.length === 0) {
            return res.status(404).json({ error: 'Product does not exist', status: false });
        }

        // Insert the new rating into the ratings table
        await pool.query(
            `INSERT INTO ${TABLE.RATINGS_TABLE} (product_id, user_id, ratings) VALUES (?, ?, ?)`,
            [product_id, user_id, ratings]
        );

        // Calculate the new average rating
        const [avgResults] = await pool.query(
            `SELECT AVG(ratings) AS average_rating FROM ${TABLE.RATINGS_TABLE} WHERE product_id = ?`,
            [product_id]
        );

        const averageRating = avgResults[0].average_rating;

        // Update the products table with the new average rating
        await pool.query(
            `UPDATE ${TABLE.PRODUCTS_TABLE} SET ratings = ? WHERE id = ?`,
            [averageRating, product_id]
        );

        return res.status(201).json({ message: 'Rating successfully added', status: true });

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
            const [results] = await pool.query(`SELECT * FROM ${TABLE.RATINGS_TABLE} WHERE status = 1 and id = ?`, [id]);
            if (results.length > 0) {
                return res.status(200).json({ data: results[0], message: "Record Successfully Fetched", status: true });
            }
            return res.status(404).json({ error: "Sorry, Record Not Found", status: false });
        }

        let [results] = await pool.query(`SELECT * FROM ${TABLE.RATINGS_TABLE} WHERE status = 1 ORDER BY ID DESC LIMIT ?, ?`, [offset, parsedLimit]);

        return res.status(200).json({ data: results, message: "Record Successfully Fetched", status: true, count: results.length });

    } catch (error) {
        return res.status(500).json({ error: 'Server error', status: false });
    }
});



// All product based on rating
router.get('/product/:ratings?', async (req, res) => {
    try {
        const ratings = req.params.ratings;

        if (ratings) {
            // Fetch all ratings for the specified product
            const [results] = await pool.query(
                `SELECT * FROM ${TABLE.RATINGS_TABLE} WHERE status = 1 AND ratings = ?`,
                [ratings]
            );

            if (results.length > 0) {
                return res.status(200).json({
                    data: results, // Change to results to return all ratings
                    message: "Records Successfully Fetched",
                    status: true,
                    count: results.length // Include count of ratings
                });
            }
            return res.status(404).json({ error: "Sorry, No Ratings Found for This Product", status: false });
        }

        // Fetch all ratings when no product_id is provided
        let [results] = await pool.query(`SELECT * FROM ${TABLE.RATINGS_TABLE} WHERE status = 1 ORDER BY ID DESC`);

        return res.status(200).json({
            data: results,
            message: "Records Successfully Fetched",
            status: true,
            count: results.length
        });

    } catch (error) {
        console.log(error);
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


        const {  product_id,user_id} = req.body;

     
        if (!product_id ||!user_id) {
            res.status(400).json({ error: ' product_id And best for fields are required', status: false });
        }

        await pool.query(`UPDATE ${TABLE.RATINGS_TABLE} SET product_id = ?, user_id = ?,ratings, updated_at = NOW() WHERE id = ?`, [product_id,user_id,ratings, id]);

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
            await pool.query(`SELECT * FROM ${TABLE.RATINGS_TABLE} WHERE status = 1 and id = ?`, [deletedId]);
        }));

        const query = `UPDATE ${TABLE.RATINGS_TABLE} SET status = 0, deleted_at = NOW() WHERE id IN (?)`;

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