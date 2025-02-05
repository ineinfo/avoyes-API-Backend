// src/routes/subscriberRoutes.js
const express = require("express");
const TABLE = require("../utils/tables");
const pool = require("../utils/db");
const router = express.Router();
const authMiddleware = require("../utils/authMiddleware");
const { formatDateForDB } = require("../utils/common");
const { challengesImages } = require("../utils/multerConfig");
// Add
router.post("/", authMiddleware, async (req, res) => {
  try {
    console.log("freq", req);
    const {challenge_id } = req.body;
    const user_id = req.user_id;

    if (!challenge_id) {
      return res
        .status(400)
        .json({ error: "All fields is required", status: false });
    }



    await pool.query(
      `INSERT INTO ${TABLE.JOINCHALLENGES_TABLE} (challenge_id,user_id) VALUES (?,?)`,
      [challenge_id, user_id]
    );

    return res
      .status(201)
      .json({ message: "Record Successfully Created", status: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error", status: false });
  }
});



router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const idParam = req.params.id;
    const deletedIds = idParam ? idParam.split(",") : [];
    if (!deletedIds || deletedIds.length === 0) {
      return res
        .status(400)
        .json({ error: "RowID must be required", status: false });
    }
    await Promise.all(
      deletedIds.map(async (deletedId) => {
        await pool.query(
          `SELECT * FROM ${TABLE.JOINCHALLENGES_TABLE} WHERE status != 0 and id = ?`,
          [deletedId]
        );
      })
    );

    const query = `UPDATE ${TABLE.JOINCHALLENGES_TABLE} SET status = 0 WHERE id IN (?)`;

    const [results] = await pool.query(query, [deletedIds]);
    if (results.affectedRows > 0) {
      return res
        .status(200)
        .json({ message: "Record Successfully Deleted", status: true });
    }

    return res
      .status(404)
      .json({ error: "Sorry, Record Not Found", status: false });
  } catch (error) {
    return res.status(500).json({ error: "Server error", status: false });
  }
});


router.get("/", authMiddleware, async (req, res) => {
    try {
      const user_id = req.user_id;  // Extracted from token
  
      if (!user_id) {
        return res.status(400).json({ error: "User not found", status: false });
      }
  
      // Query to get all challenges the user has joined, including the challenge details, status, and join_challenges id
      const [rows] = await pool.query(
        `SELECT 
          jc.id AS join_challenge_id,  -- Added join_challenge_id field
          c.id AS challenge_id,
          c.title, 
          c.sub_title, 
          c.start_date, 
          c.end_date,
          jc.status AS join_status
         FROM ${TABLE.JOINCHALLENGES_TABLE} jc
         JOIN ${TABLE.CHALLENGES_TABLE} c ON jc.challenge_id = c.id
         WHERE jc.user_id = ?`,
        [user_id]
      );
  
      // If no challenges are found or all challenges have a status of 0 in join_challenges
      const filteredChallenges = rows.filter(row => row.join_status !== 0);
  
      if (filteredChallenges.length === 0) {
        return res.status(404).json({ message: "No active challenges found for this user", status: false });
      }
  
      // Format the response
      const challenges = filteredChallenges.map(row => ({
        join_challenge_id: row.join_challenge_id,  // Added join_challenge_id to the response
        challenge_id: row.challenge_id,
        title: row.title,
        sub_title: row.sub_title,
        start_date: row.start_date,
        end_date: row.end_date,
      }));
  
      return res.status(200).json({
        message: "Challenges successfully fetched",
        status: true,
        user_id,  // Include user_id in the response
        data: challenges,  // Return the formatted challenges
      });
  
    } catch (error) {
      console.error("Error: ", error);
      return res.status(500).json({ error: "Server error", status: false });
    }
  });
  



module.exports = router;
