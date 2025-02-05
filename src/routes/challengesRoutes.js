// src/routes/subscriberRoutes.js
const express = require("express");
const TABLE = require("../utils/tables");
const pool = require("../utils/db");
const router = express.Router();
const authMiddleware = require("../utils/authMiddleware");
const { formatDateForDB } = require("../utils/common");
const { challengesImages } = require("../utils/multerConfig");
// Add
router.post("/", challengesImages, authMiddleware, async (req, res) => {
  try {
    console.log("freq", req);
    const { title, subtitle, start_date, end_date } = req.body;
    // const user_id = req.user_id;

    if (!title || !start_date || !end_date) {
      return res
        .status(400)
        .json({ error: "All fields is required", status: false });
    }

    let db_start_date = start_date;
    let db_end_date = end_date;

    const baseUrl =
      req.protocol + "://" + req.get("host") + "/uploads/challenges/";
    const image_urls = req.files.map((file) => baseUrl + file.filename);
    const image_url = image_urls.length > 0 ? image_urls[0] : "";

    await pool.query(
      `INSERT INTO ${TABLE.CHALLENGES_TABLE} (title, sub_title, start_date, end_date, image_url,user_id) VALUES (?,?,?,?,?)`,
      [title, subtitle, db_start_date, db_end_date, image_url]
    );

    return res
      .status(201)
      .json({ message: "Record Successfully Created", status: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error", status: false });
  }
});

// All List & Specific List of challenges
router.get("/:id?",  async (req, res) => {
  try {
    const id = req.params.id;
    const { page = 1, limit = 10 } = req.body;
    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit) > 0 ? parseInt(limit) : 10;
    const offset = (parsedPage - 1) * parsedLimit;

    if (id) {
      const [results] = await pool.query(
        `SELECT * FROM ${TABLE.CHALLENGES_TABLE} WHERE status !=0 and id = ?`,
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
      `SELECT * FROM ${TABLE.CHALLENGES_TABLE} WHERE status !=0 ORDER BY id DESC LIMIT ? OFFSET ?`,
      [parsedLimit, offset]
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

router.put("/:id", challengesImages, authMiddleware, async (req, res) => {
  try {
    const id = req.params.id;
    // const user_id = req.user_id;

    if (!id) {
      return res
        .status(400)
        .json({ error: "RowID must be required", status: false });
    }

    // Check if the product exists
    const [existingRecord] = await pool.query(
      `SELECT * FROM ${TABLE.CHALLENGES_TABLE} WHERE status != 0 and id = ?`,
      [id]
    );
    if (!existingRecord.length) {
      return res
        .status(404)
        .json({ error: "Sorry, Record Not Found", status: false });
    }

    const { title, subtitle, start_date, end_date } = req.body;

    if (!title || !start_date || !end_date) {
      return res.status(400).json({
        error: "All fields are required",
        status: false,
      });
    }

    let db_start_date = start_date;
    let db_end_date = end_date;

    // Generate the base URL for images
    // const baseUrl =
    //   req.protocol + "://" + req.get("host") + "/uploads/challenges/";
    // const image_urls = req.files.map((file) => baseUrl + file.filename);
    // const image_url = image_urls.length > 0 ? image_urls[0] : "";

    
    let image_url = existingRecord[0].image_url;

    if (req.files && req.files.length > 0) {
      const baseUrl = req.protocol + "://" + req.get("host") + "/uploads/challenges/";
      image_url = baseUrl + req.files[0].filename;
    }

    // Update the product details
    await pool.query(
      `UPDATE ${TABLE.CHALLENGES_TABLE} SET 
          title = ?, sub_title = ?, start_date = ?, end_date = ?, image_url = ? 
           WHERE id = ?`,
      [title, subtitle, db_start_date, db_end_date, image_url, id]
    );
    return res
      .status(200)
      .json({ message: "Record Successfully Updated", status: true });
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
          `SELECT * FROM ${TABLE.CHALLENGES_TABLE} WHERE status != 0 and id = ?`,
          [deletedId]
        );
      })
    );

    const query = `UPDATE ${TABLE.CHALLENGES_TABLE} SET status = 0 WHERE id IN (?)`;

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

module.exports = router;
