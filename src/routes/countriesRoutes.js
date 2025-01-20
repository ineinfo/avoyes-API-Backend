// src/routes/subscriberRoutes.js
const express = require("express");
const TABLE = require("../utils/tables");
const pool = require("../utils/db");
const router = express.Router();
const authMiddleware = require("../utils/authMiddleware");

// All List & Specific List
router.get("/:id?", async (req, res) => {
  try {
    const id = req.params.id;
    const { page = 1, limit = 10 } = req.body;
    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit) > 0 ? parseInt(limit) : 10;
    const offset = (parsedPage - 1) * parsedLimit;

    if (id) {
      const [results] = await pool.query(
        `SELECT * FROM ${TABLE.COUNTRIES_TABLE} WHERE status !=0 and id = ?`,
        [id]
      );
      if (results.length > 0) {
        return res
          .status(200)
          .json({
            data: results[0],
            message: "Record Successfully Fetched",
            status: true,
          });
      }
      return res
        .status(404)
        .json({ error: "Sorry, Record Not Found", status: false });
    }

    let [results] = await pool.query(
      `SELECT * FROM ${TABLE.COUNTRIES_TABLE} WHERE status !=0 ORDER BY id DESC`,
      []
    );

    return res.status(200).json({
      data: results,
      message: "Record Successfully Fetched",
      status: true,
      count: results.length,
    });
  } catch (error) {
    return res.status(500).json({ error: "Server error", status: false });
  }
});


module.exports = router;
