// src/routes/adminDashboardRoutes.js
const express = require('express');
const TABLE = require('../utils/tables')
const pool = require('../utils/db');
const router = express.Router();
const authMiddleware = require('../utils/authMiddleware');

router.get('/count', authMiddleware, async (req, res) => {
    try {
        const counts = {}; // Object to store all counts

        // users
        const userCountResult = await pool.query(`SELECT COUNT(*) as count FROM ${TABLE.USERS_TABLE} WHERE status = 1`);
        counts.totalUsers = userCountResult[0] && userCountResult[0][0] ? userCountResult[0][0].count : 0;

        // products
        const productCountResult = await pool.query(`SELECT COUNT(*) as count FROM ${TABLE.PRODUCTS_TABLE} WHERE status = 1`);
        counts.totalProducts = productCountResult[0] && productCountResult[0][0] ? productCountResult[0][0].count : 0;
        
       // blogs
        const blogCountResult = await pool.query(`SELECT COUNT(*) as count FROM ${TABLE.BLOGS_TABLE} WHERE status = 1`);
        counts.totalBlogs = productCountResult[0] && blogCountResult[0][0] ? blogCountResult[0][0].count : 0;

         // events
        const eventCountResult = await pool.query(`SELECT COUNT(*) as count FROM ${TABLE.EVENTS_TABLE} WHERE status = 1`);
        counts.totalEvents= eventCountResult[0] && eventCountResult[0][0] ? eventCountResult[0][0].count : 0;

       // All orders
        const orderCountResult = await pool.query(`SELECT COUNT(*) as count FROM ${TABLE.ORDERS_TABLE} WHERE status = 1`);
        counts.totalOrders= orderCountResult[0] && orderCountResult[0][0] ? orderCountResult[0][0].count : 0;

    
       // pending status orders
       const pendingOrderCountResult = await pool.query(`SELECT COUNT(*) as count FROM ${TABLE.ORDERS_TABLE} WHERE status = 1 AND order_status = 1`);
       counts.totalPendingOrders= pendingOrderCountResult[0] && pendingOrderCountResult[0][0] ? pendingOrderCountResult[0][0].count : 0;


       // in progress status orders
       const inProgressOrderCountResult = await pool.query(`SELECT COUNT(*) as count FROM ${TABLE.ORDERS_TABLE} WHERE status = 1 AND order_status = 2`);
       counts.totalProgressOrders= inProgressOrderCountResult[0] && inProgressOrderCountResult[0][0] ? inProgressOrderCountResult[0][0].count : 0;


        // in progress status orders
        const completedOrderCountResult = await pool.query(`SELECT COUNT(*) as count FROM ${TABLE.ORDERS_TABLE} WHERE status = 1 AND order_status = 3`);
        counts.totalCompletedOrders= completedOrderCountResult[0] && completedOrderCountResult[0][0] ? completedOrderCountResult[0][0].count : 0;

       




        // Send the counts object as the response
        return res.json(counts);
    } catch (error) {
        console.error('Error fetching counts:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



module.exports = router;