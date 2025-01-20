// src/routes/checkoutItemsRoutes.js
const express = require('express');
const TABLE = require('../utils/tables')
const pool = require('../utils/db');
const router = express.Router();
const authMiddleware = require('../utils/authMiddleware');


//without status
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { checkout_id, product_id, size_id, color_id, amount, quantity } = req.body;

   
        if (!checkout_id || !product_id || !size_id || !color_id || !amount || !quantity) {
            return res.status(400).json({ error: 'Checkout Id, Product Id, Size Id, Color Id, Amount, and Quantity fields are required', status: false });
        }

        // get user_id from checkout
        const [checkoutRecord] = await pool.query(
            `SELECT user_id FROM ${TABLE.CHECKOUT_TABLE} WHERE id = ?`,
            [checkout_id]
        );

        if (checkoutRecord.length === 0) {
            return res.status(404).json({ error: 'Checkout record not found', status: false });
        }

        const user_id = checkoutRecord[0].user_id;

        // Fetch user address from the address table
        const [addressRecord] = await pool.query(
            `SELECT id FROM ${TABLE.ADDRESS_TABLE} WHERE user_id = ?`,
            [user_id]
        );

        if (addressRecord.length === 0) {
            return res.status(404).json({ error: 'User address not found', status: false });
        }

        const address_id = addressRecord[0].id;

        // Check if the record exists in checkout items
        const [existingRecord] = await pool.query(
            `SELECT * FROM ${TABLE.CHECKOUTITEMS_TABLE} WHERE checkout_id = ? AND product_id = ? AND size_id = ? AND color_id = ?`,
            [checkout_id, product_id, size_id, color_id]
        );

        if (existingRecord.length > 0) {
            return res.status(409).json({ error: 'You have already checked out this item', status: false });
        }

        // Insert the new record into checkout items
        await pool.query(
            `INSERT INTO ${TABLE.CHECKOUTITEMS_TABLE} (checkout_id, product_id, size_id, color_id, amount, quantity) VALUES (?, ?, ?, ?, ?, ?)`,
            [checkout_id, product_id, size_id, color_id, amount, quantity]
        );

        
        const subtotal = amount * quantity;
        const discountAmount = 0; // discount logic pachi
        const totalAmount = subtotal - discountAmount;

        // Update the total in the checkout table
        await pool.query(
            `UPDATE ${TABLE.CHECKOUT_TABLE} SET total = total + ? WHERE id = ?`,
            [totalAmount, checkout_id]
        );

        // Fetch the items from checkout_items for order_items
        const [checkoutItems] = await pool.query(
            `SELECT product_id, quantity, amount FROM ${TABLE.CHECKOUTITEMS_TABLE} WHERE checkout_id = ?`,
            [checkout_id]
        );

        // Prepare the order items insert query
        const orderItemsInsertQueries = checkoutItems.map(item => {
            return pool.query(
                `INSERT INTO ${TABLE.ORDERITEMS_TABLE} (order_id, product_id, quantity, amount) VALUES (?, ?, ?, ?)`,
                [orderId, item.product_id, item.quantity, item.amount] // Use orderId here
            );
        });

        // Execute all order item insert queries
        await Promise.all(orderItemsInsertQueries);

        // Delete all items from the user's cart
        const deleteResult = await pool.query(
            `DELETE FROM ${TABLE.CART_TABLE} WHERE user_id = ?`,
            [user_id]
        );

        console.log(`Deleted ${deleteResult.affectedRows} items from the cart for user_id: ${user_id}`);

        return res.status(201).json({ message: 'Record successfully created and all items removed from the cart', status: true });

    } catch (error) {
        console.error('Error processing request:', error);
        return res.status(500).json({ error: 'Server error', status: false });
    }
});






router.get('/:id?', async (req, res) => {
    try {
        const id = req.params.id;
        const { page = 1, limit = 10 } = req.body;
        const parsedPage = parseInt(page);
        const parsedLimit = parseInt(limit) > 0 ? parseInt(limit) : 10;
        const offset = (parsedPage - 1) * parsedLimit;

        if (id) {
            let [results] = await pool.query(`SELECT * FROM ${TABLE.CHECKOUTITEMS_TABLE} WHERE id = ? AND status = 1`, [id]);

            if (results.length > 0) {
                return res.status(200).json({ data: results[0], message: "Record Successfully Fetched", status: true });
            }
            return res.status(404).json({ error: "Sorry, Record Not Found", status: false });
        }

        let [results] = await pool.query(`SELECT * FROM ${TABLE.CHECKOUTITEMS_TABLE} WHERE status = 1 ORDER BY ID DESC LIMIT ? ,?`, [offset, parsedLimit, ]);
        return res.status(200).json({ data: results, message: "Record Successfully Fetched", status: true, count: results.length });
    } catch (error) {
        return res.status(500).json({ error: 'Server error', status: false });
    }
});



module.exports = router;