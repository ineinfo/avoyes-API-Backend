// src/routes/productSizeRoutes.js
const express = require('express');
const TABLE = require('../utils/tables')
const pool = require('../utils/db');
const router = express.Router();
const authMiddleware = require('../utils/authMiddleware');


router.post('/', authMiddleware, async (req, res) => {
    try {
        const { user_id, product_id } = req.body;

        if (!user_id || !product_id) {
            return res.status(400).json({ error: 'User-id and product-id fields are required', status: false });
        }

        // Check product
        const [existingProduct] = await pool.query(`SELECT * FROM ${TABLE.MYWISHLIST_TABLE} WHERE user_id = ? AND product_id = ?`, [user_id, product_id]);

        if (existingProduct.length > 0) {
            if (existingProduct[0].status === 1) {
                // if active then-0
                await pool.query(`UPDATE ${TABLE.MYWISHLIST_TABLE} SET status = 0 WHERE id = ?`, [existingProduct[0].id]);
                return res.status(200).json({ message: 'Product removed from wishlist', status: true });
            } else {
                // if inactive then-1
                await pool.query(`UPDATE ${TABLE.MYWISHLIST_TABLE} SET status = 1 WHERE id = ?`, [existingProduct[0].id]);
                return res.status(200).json({ message: 'Product added in to wishlist', status: true });
            }
        }

        // new add
        await pool.query(`INSERT INTO ${TABLE.MYWISHLIST_TABLE} (user_id, product_id) VALUES (?, ?)`, [user_id, product_id]);

        return res.status(201).json({ message: 'Record Successfully Created', status: true });

    } catch (error) {
      
        return res.status(500).json({ error: 'Server error', status: false });
    }
});







// All List & Specific User's product list
router.get('/:user_id?', async (req, res) => {
    try {
        const user_id = req.params.user_id;
        const { page = 1, limit = 10 } = req.body;
        const parsedPage = parseInt(page);
        const parsedLimit = parseInt(limit) > 0 ? parseInt(limit) : 10;
        const offset = (parsedPage - 1) * parsedLimit;

        if (user_id) {
            // Fetch product IDs along with titles using LEFT JOIN
            const [results] = await pool.query(`
                SELECT p.product_id, pr.title, pr.description, pr.image_url1,pr.amount ,pr.discount_amount,pr.ratings
                FROM ${TABLE.MYWISHLIST_TABLE} p
                LEFT JOIN products pr ON p.product_id = pr.id 
                WHERE p.status = 1 AND p.user_id = ?`, 
                [user_id]
            );
            if (results.length > 0) {
                return res.status(200).json({ 
                    data: results, 
                    message: "Product IDs and Titles Successfully Fetched", 
                    status: true 
                });
            }
            return res.status(404).json({ error: "Sorry, Record Not Found", status: false });
        }

        // Fetch all
        const [results] = await pool.query(`
            SELECT * 
            FROM ${TABLE.MYWISHLIST_TABLE} 
            WHERE status = 1 
            ORDER BY ID DESC
            LIMIT ? ,?
        `,[offset, parsedLimit]);
        return res.status(200).json({ data: results, message: "Records Successfully Fetched", status: true, count: results.length });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Server error', status: false });
    }
});



module.exports = router;