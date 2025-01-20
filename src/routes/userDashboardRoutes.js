// src/routes/userDashboardRoutes.js
const express = require('express');
const TABLE = require('../utils/tables')
const pool = require('../utils/db');
const router = express.Router();
const authMiddleware = require('../utils/authMiddleware');

router.get('/count/:user_id', authMiddleware, async (req, res) => {
    try {
        const userId = req.params.user_id; 
        const counts = {}; 

  
        const userExistsResult = await pool.query(`SELECT id FROM ${TABLE.USERS_TABLE} WHERE id = ?`, [userId]);
        if (userExistsResult[0].length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        //  all orders for the specified user
        const orderCountResult = await pool.query(`SELECT COUNT(*) as count FROM ${TABLE.ORDERS_TABLE} WHERE status = 1 AND user_id = ?`, [userId]);
        counts.totalOrders = orderCountResult[0] && orderCountResult[0][0] ? orderCountResult[0][0].count : 0;

        //pending status orders
        const pendingOrderCountResult = await pool.query(`SELECT COUNT(*) as count FROM ${TABLE.ORDERS_TABLE} WHERE status = 1 AND order_status = 1 AND user_id = ?`, [userId]);
        counts.totalPendingOrders = pendingOrderCountResult[0] && pendingOrderCountResult[0][0] ? pendingOrderCountResult[0][0].count : 0;

        // in-progress status 
        const inProgressOrderCountResult = await pool.query(`SELECT COUNT(*) as count FROM ${TABLE.ORDERS_TABLE} WHERE status = 1 AND order_status = 2 AND user_id = ?`, [userId]);
        counts.totalProgressOrders = inProgressOrderCountResult[0] && inProgressOrderCountResult[0][0] ? inProgressOrderCountResult[0][0].count : 0;

        // completed status
        const completedOrderCountResult = await pool.query(`SELECT COUNT(*) as count FROM ${TABLE.ORDERS_TABLE} WHERE status = 1 AND order_status = 3 AND user_id = ?`, [userId]);
        counts.totalCompletedOrders = completedOrderCountResult[0] && completedOrderCountResult[0][0] ? completedOrderCountResult[0][0].count : 0;

        // user's product in wishlist
        const wishlistOrderCountResult = await pool.query(`SELECT COUNT(*) as count FROM ${TABLE.MYWISHLIST_TABLE} WHERE status = 1 AND user_id = ?`, [userId]);
        counts.totalmywishlistProducts = wishlistOrderCountResult[0] && wishlistOrderCountResult[0][0] ? wishlistOrderCountResult[0][0].count : 0;
        
        
        // user's product in cart
        const cartCountResult = await pool.query(`SELECT COUNT(*) as count FROM ${TABLE.CART_TABLE} WHERE status = 1 AND user_id = ?`, [userId]);
        counts.totalCartProducts = cartCountResult[0] && cartCountResult[0][0] ? cartCountResult[0][0].count : 0;


        // Send the counts object as the response
        return res.json(counts);
    } catch (error) {
        console.error('Error fetching counts:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



module.exports = router;