// src/routes/faqsRoutes.js
const express = require('express');
const TABLES = require('../utils/tables'); 
const pool = require('../utils/db');
const router = express.Router();
const authMiddleware = require('../utils/authMiddleware');

// Define searchable tables
const searchableTables = [
    { table: TABLES.PRODUCT_SUBCATEGORY_TABLE, column: 'title' },
    { table: TABLES.PRODUCT_CATEGORY_TABLE, column: 'title' },
    { table: TABLES.BLOGS_TABLE, column: 'title' },
    { table: TABLES.EVENTS_TABLE, column: 'title' }, 
    { table: TABLES.FOODTYPE_TABLE, column: 'title' },
    { table: TABLES.FOODPLACE_TABLE, column: 'title' },
    { table: TABLES.POPULAR_DISHES_TABLE, column: 'title' },
    { table: TABLES.PRODUCTS_TABLE, column: 'title' },
    { table: TABLES.PRODUCT_MATERIALS_TABLE, column: 'title' },
    { table: TABLES.PRODUCT_TYPE_TABLE, column: 'title' },

    
];


// Global Search Endpoint
// router.get('/:keyword', async (req, res) => {
//     let { keyword } = req.params;

//     // Normalize the keyword: remove spaces
//     const searchresult = keyword.replace(/\s+/g, '').toLowerCase(); // Remove spaces

//     try {
//         const results = {};

//         // Loop through each table to perform the search
//         for (const { table, column } of searchableTables) {
//             const query = `
//                 SELECT * FROM ?? 
//                 WHERE LOWER(REPLACE(??, ' ', '')) LIKE ?`;
//             const [rows] = await pool.query(query, [table, column, `%${searchresult}%`]);

//             if (rows.length > 0) {
//                 results[table] = rows; // Store results under the table name
//             }
//         }

//         // Check if there are any results
//         if (Object.keys(results).length === 0) {
//             return res.status(404).json({ message: 'No records found' });
//         }

//         res.json(results);
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: 'Internal Server Error' });
//     }
// });



router.get(['/:keyword', '/products/:keyword'], async (req, res) => {
    let { keyword } = req.params;
    let searchInProductsOnly = req.path.startsWith('/products'); // Check if the route starts with /products

    // Normalize the keyword: remove spaces and convert to lowercase
    const searchresult = keyword.replace(/\s+/g, '').toLowerCase();

    try {
        const results = {};

        // Determine which tables to search in based on the URL pattern
        const tablesToSearch = searchInProductsOnly
            ? [{ table: TABLES.PRODUCTS_TABLE, column: 'title' }] // Only search in products table
            : searchableTables; // Search in all tables for global search

        // Loop through each table to perform the search
        for (const { table, column } of tablesToSearch) {
            const query = `
                SELECT * FROM ?? 
                WHERE LOWER(REPLACE(??, ' ', '')) LIKE ?`;
            const [rows] = await pool.query(query, [table, column, `%${searchresult}%`]);

            if (rows.length > 0) {
                results[table] = rows; // Store results under the table name
            }
        }

        // Check if there are any results
        if (Object.keys(results).length === 0) {
            return res.status(404).json({ message: 'No records found' });
        }

        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}); 


module.exports = router;
