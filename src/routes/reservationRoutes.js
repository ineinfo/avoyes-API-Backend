// src/routes/reservationRoutes.js
const express = require('express');
const TABLE = require('../utils/tables')
const pool = require('../utils/db');
const router = express.Router();
const authMiddleware = require('../utils/authMiddleware');


router.post('/', authMiddleware, async (req, res) => {
    try {
        const { time_id, food_place_id, people, date } = req.body;

        if (!time_id || !food_place_id || !people || !date) {
            return res.status(400).json({ error: 'Time, Food Place Id, People And Date fields are required', status: false });
        }
        const user_id = req.user_id;
        if (!user_id) {
            return res.status(401).json({ error: 'Unauthorized. User ID missing from token.', status: false });
        }

        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date) || isNaN(new Date(date).getTime())) {
            return res.status(400).json({ error: 'Invalid date format. Please use YYYY-MM-DD.', status: false });
        }

 
        const result = await pool.query(
            `INSERT INTO ${TABLE.RESERVATION_TABLE} (time_id, food_place_id, people, date,user_id) VALUES (?, ?, ?, ?,?)`,
            [time_id, food_place_id, people, date,user_id]
        );


        console.log("Insert Result:", result);

       
        const insertId = result[0]?.insertId;  

       
        if (!insertId) {
            return res.status(500).json({ error: 'Failed to insert record or no insertId returned', status: false });
        }

        console.log("Insert ID:", insertId);  

      
        const newReservation = await pool.query(
            `SELECT * FROM ${TABLE.RESERVATION_TABLE} WHERE id = ?`,
            [insertId]  
        );


        console.log("New Reservation Data:", newReservation);

     
        if (!newReservation || newReservation.length === 0) {
            return res.status(404).json({ error: 'No data found for the created reservation', status: false });
        }

        
        return res.status(201).json({
            message: 'Record Successfully Created',
            status: true,
            data: newReservation[0]  
        });

    } catch (error) {
        console.error("Server Error:", error);  
        return res.status(500).json({ error: 'Server error', status: false });
    }
});



// All List & Specific List
router.get('/:id?', async (req, res) => {
    try {
        const id = req.params.id;
      

        if (id) {
            const [results] = await pool.query(`
                SELECT r.*,
                 t.time,
                 u.first_name, 
                    u.last_name, 
                    u.email, 
                    u.phone,
                     f.title AS food_place_title
                FROM ${TABLE.RESERVATION_TABLE} r 
                LEFT JOIN ${TABLE.TIME_TABLE} t ON r.time_id = t.id 
                LEFT JOIN ${TABLE.USERS_TABLE} u ON r.user_id = u.id
                LEFT JOIN ${TABLE.FOODPLACE_TABLE} f ON r.food_place_id = f.id

                WHERE r.status = 1 AND r.id = ?`, [id]);
                
            if (results.length > 0) {
                return res.status(200).json({ data: results[0], message: "Record Successfully Fetched", status: true });
            }
            return res.status(404).json({ error: "Sorry, Record Not Found", status: false });
        }

        let [results] = await pool.query(`
            SELECT r.*, t.time,
            u.first_name, 
                    u.last_name, 
                    u.email, 
                    u.phone,
                     f.title AS food_place_title
            FROM ${TABLE.RESERVATION_TABLE} r 
            LEFT JOIN ${TABLE.TIME_TABLE} t ON r.time_id = t.id 
            LEFT JOIN ${TABLE.USERS_TABLE} u ON r.user_id = u.id
            LEFT JOIN ${TABLE.FOODPLACE_TABLE} f ON r.food_place_id = f.id

            WHERE r.status = 1 
            ORDER BY r.id DESC`);

        return res.status(200).json({ data: results, message: "Records Successfully Fetched", status: true, count: results.length });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: 'Server error', status: false });
    }
});

// food places based on food_type_id
router.get('/foodplace/:food_place_id?', async (req, res) => {
    try {
        const food_place_id = req.params.food_place_id;

        if (food_place_id) {
            const [results] = await pool.query(`
                SELECT r.*, t.time,
                u.first_name, 
                    u.last_name, 
                    u.email, 
                    u.phone,
                     f.title AS food_place_title
                FROM ${TABLE.RESERVATION_TABLE} r 
                LEFT JOIN ${TABLE.TIME_TABLE} t ON r.time_id = t.id 
                  LEFT JOIN ${TABLE.USERS_TABLE} u ON r.user_id = u.id
                  LEFT JOIN ${TABLE.FOODPLACE_TABLE} f ON r.food_place_id = f.id

                WHERE r.status = 1 AND r.food_place_id = ?`, [food_place_id]);

            if (results.length > 0) {
                return res.status(200).json({ data: results, message: "Records Successfully Fetched", status: true });
            }
            return res.status(404).json({ error: "Sorry, No Reservations Found for this Food Place", status: false });
        }

        return res.status(400).json({ error: "Food Type ID is required", status: false });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Server error', status: false });
    }
});

// Update
router.put('/:id',authMiddleware, async (req, res) => {
    try {

        const id = req.params.id;

        if (!id) {
            return res.status(400).json({ error: 'RowID must be required', status: false });
        }

        const [existingRecord] = await pool.query(`SELECT * FROM ${TABLE.RESERVATION_TABLE} WHERE status = 1 and id = ?`, [id]);
        if (!existingRecord.length) {
            return res.status(404).json({ error: "Sorry, Record Not Found", status: false });
        }

    
        const {time_id,food_place_id,people,date} = req.body;

        if (!time_id || !food_place_id || !people || !date) {
            return res.status(400).json({ error: 'Time, Food Place Id, People And Date fields are required', status: false });
        }

        
        await pool.query(`UPDATE ${TABLE.RESERVATION_TABLE} SET time_id = ?, food_place_id = ?, people = ?, date = ?, updated_at = NOW() WHERE id = ?`, 
            [time_id,food_place_id,people,date,id]);

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
            await pool.query(`SELECT * FROM ${TABLE.RESERVATION_TABLE} WHERE status = 1 and id = ?`, [deletedId]);
        }));

        const query = `UPDATE ${TABLE.RESERVATION_TABLE} SET status = 0, deleted_at = NOW() WHERE id IN (?)`;

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