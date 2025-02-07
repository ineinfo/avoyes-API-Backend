// src/routes/subscriberRoutes.js
const express = require("express");
const TABLE = require("../utils/tables");
const pool = require("../utils/db");
const router = express.Router();
const authMiddleware = require("../utils/authMiddleware");

router.put('/update', authMiddleware, async (req, res) => {
    try {
        console.log("Headers:", req.headers);
        console.log("Request Body:", req.body); // Check what data is received

        const { video_url } = req.body;

        if (!video_url) {
            return res.status(400).json({ error: 'video_url field is required', status: false });
        }

        const [existingRecord] = await pool.query(
            `SELECT * FROM ${TABLE.VIDEOCHALLENGES_TABLE} WHERE id = 1`
        );

        if (existingRecord.length === 0) {
            return res.status(404).json({ error: "Sorry, Record Not Found", status: false });
        }

        await pool.query(
            `UPDATE ${TABLE.VIDEOCHALLENGES_TABLE} SET video_url = ? WHERE id = 1`,
            [video_url]
        );

        return res.status(200).json({ message: "Record Successfully Updated", status: true });

    } catch (error) {
        console.error("Server Error:", error);
        return res.status(500).json({ error: 'Server error', status: false });
    }
});


  router.get('/get', async (req, res) => {
    try {
        const [record] = await pool.query(`SELECT * FROM videochallenges WHERE id = 1`);
        
        console.log("Fetched Record:", record); // Debugging log
  
        if (!record.length) {
            return res.status(404).json({ error: "Sorry, Record Not Found", status: false });
        }
  
        return res.status(200).json({ data: record[0], status: true });
  
    } catch (error) {
        console.error("Database Error:", error); // Debugging log
        return res.status(500).json({ error: 'Server error', status: false });
    }
  });

  module.exports = router;

  