// src/routes/subscriberRoutes.js
const express = require("express");
const TABLE = require("../utils/tables");
const pool = require("../utils/db");
const router = express.Router();
const authMiddleware = require("../utils/authMiddleware");
const { formatDateForDB } = require("../utils/common");
const { activitiesImages } = require("../utils/multerConfig");
// Add
router.post("/", activitiesImages, authMiddleware, async (req, res) => {
  try {
    const {
      title,
      hosted_by,
      start_datetime,
      end_datetime,
      location,
      map_url,
      country_id,
      pincode,
      description,
      // activity_id,
    } = req.body;
    const user_id = req.user_id;

    if (
      !title ||
      !hosted_by ||
      !start_datetime ||
      !end_datetime ||
      !location ||
      !map_url ||      
      !country_id ||
      !pincode ||
      !description
      // !activity_id
    ) {
      return res
        .status(400)
        .json({ error: "All fields is required", status: false });
    }

    const baseUrl =
      req.protocol + "://" + req.get("host") + "/uploads/activities/";
    const image_urls = req.files.map((file) => baseUrl + file.filename);
    const image_url = image_urls.length > 0 ? image_urls[0] : "";

    const [result] = await pool.query(
      `INSERT INTO ${TABLE.ACTIVITIES_TABLE} (title, hosted_by, start_datetime, end_datetime, image_url,location,map_url,user_id,country_id,description,pincode) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        title,
        hosted_by,
        start_datetime,
        end_datetime,
        image_url,
        location,
        map_url,
        user_id,
        country_id,
        description,
        pincode,
       
      ]
    );
    const lastId = result.insertId;

    if (image_urls.length > 0) {
      image_urls.map(async (fileURL) => {
        await pool.query(
          `INSERT INTO ${TABLE.ACTIVITIES_IMAGES} (activity_id, images) VALUES (?,?)`,
          [lastId, fileURL]
        );
      });
    }

    return res
      .status(201)
      .json({ message: "Record Successfully Created", status: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error", status: false });
  }
});

// All List & Specific List
router.get("/:id?",  async (req, res) => {
  try {
    const id = req.params.id;
    
    const { page = 1, limit = 10 } = req.body;
    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit) > 0 ? parseInt(limit) : 10;
    const offset = (parsedPage - 1) * parsedLimit;

    if (id) {

      // const [results] = await pool.query(
      //   `SELECT a.*, ac.title as activity_category_title,
      //    CONCAT('[', GROUP_CONCAT(
      //      JSON_OBJECT('iid', ai.id, 'file', ai.images)
      //    ), ']') as files
      //    FROM ${TABLE.ACTIVITIES_TABLE} as a 
      //    LEFT JOIN ${TABLE.ACTIVITIES_CATEGORIES_TABLE} as ac
      //    ON ac.id = a.activity_id
      //    LEFT JOIN ${TABLE.ACTIVITIES_IMAGES} as ai
      //    ON ai.activity_id = a.id
      //    WHERE a.status != 0 AND ac.status != 0 AND ai.status != 0 AND a.id = ? 
      //    GROUP BY a.id`,
      //   [id]
      // );

      const [results] = await pool.query(
        `SELECT a.*, ac.title as activity_category_title,
         CONCAT('[', GROUP_CONCAT(
           JSON_OBJECT('iid', ai.id, 'file', ai.images)
         ), ']') as files
         FROM ${TABLE.ACTIVITIES_TABLE} as a 
         LEFT JOIN ${TABLE.ACTIVITIES_CATEGORIES_TABLE} as ac
         ON ac.id = a.activity_id
         LEFT JOIN ${TABLE.ACTIVITIES_IMAGES} as ai
         ON ai.activity_id = a.id AND ai.status != 0
         WHERE a.status != 0 AND ac.status != 0 AND a.id = ? 
         GROUP BY a.id`,
        [id]
      );

      
      if (results.length > 0) {
        // Parse files field from string to JSON array
        if (results[0].files) {
          results[0].files = JSON.parse(results[0].files);
        }

        return res.status(200).json({
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
      `SELECT a.*,ac.title as activity_category_title 
      FROM ${TABLE.ACTIVITIES_TABLE} as a 
      LEFT JOIN ${TABLE.ACTIVITIES_CATEGORIES_TABLE} as ac 
      ON ac.id = a.activity_id 
      WHERE a.status !=0 AND ac.status !=0 ORDER BY a.id DESC LIMIT ? OFFSET ?`,
      [parsedLimit, offset]
    );
    
    
    return res.status(200).json({
      data: results,
      message: "Record Successfully Fetched",
      status: true,
      count: results.length,
    });
  } catch (error) {
    console.error("Error:", error); // Log the error to the console
    return res.status(500).json({ error: "Server error", status: false });
  }
});

router.put("/:id", activitiesImages, authMiddleware, async (req, res) => {
  try {
    const id = req.params.id;
    const user_id = req.user_id;

    if (!id) {
      return res
        .status(400)
        .json({ error: "RowID must be required", status: false });
    }

    // Check if the product exists
    const [existingRecord] = await pool.query(
      `SELECT * FROM ${TABLE.ACTIVITIES_TABLE} WHERE status != 0 and id = ?`,
      [id]
    );
    if (!existingRecord.length) {
      return res
        .status(404)
        .json({ error: "Sorry, Record Not Found", status: false });
    }

    const {
      title,
      hosted_by,
      start_datetime,
      end_datetime,
      location,
      map_url,
      pincode,
      country_id,
      description,
      activity_id,
    } = req.body;

    if (
      !title ||
      !start_datetime ||
      !end_datetime ||
      !pincode ||
      !country_id ||
      !description ||
      !activity_id
    ) {
      return res.status(400).json({
        error: "All fields are required",
        status: false,
      });
    }

    // Generate the base URL for images
    const baseUrl =
      req.protocol + "://" + req.get("host") + "/uploads/activities/";
    const image_urls = req.files.map((file) => baseUrl + file.filename);
    const image_url = image_urls.length > 0 ? image_urls[0] : "";

    // Update the product details
    await pool.query(
      `UPDATE ${TABLE.ACTIVITIES_TABLE} SET 
          title = ?, hosted_by = ?, start_datetime = ?, end_datetime = ?, location = ?,map_url=?, image_url = ?,user_id = ?,pincode = ?, country_id = ?, description = ?, activity_id = ? WHERE id = ?`,
      [
        title,
        hosted_by,
        start_datetime,
        end_datetime,
        location,
        map_url,
        image_url,
        user_id,
        pincode,
        country_id,
        description,
        activity_id,
        id,
      ]
    );

    if (image_urls.length > 0) {
      image_urls.map(async (fileURL) => {
        await pool.query(
          `INSERT INTO ${TABLE.ACTIVITIES_IMAGES} (activity_id, images) VALUES (?,?)`,
          [id, fileURL]
        );
      });
    }

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
          `SELECT * FROM ${TABLE.ACTIVITIES_TABLE} WHERE status != 0 and id = ?`,
          [deletedId]
        );
      })
    );

    const query = `UPDATE ${TABLE.ACTIVITIES_TABLE} SET status = 0 WHERE id IN (?)`;

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

router.delete("/image/:id", authMiddleware, async (req, res) => {
  try {
    const idParam = req.params.id;
    const deletedIds = [idParam];
    if (!deletedIds || deletedIds.length === 0) {
      return res
        .status(400)
        .json({ error: "RowID must be required", status: false });
    }
    await Promise.all(
      deletedIds.map(async (deletedId) => {
        await pool.query(
          `SELECT * FROM ${TABLE.ACTIVITIES_IMAGES} WHERE status != 0 and id = ?`,
          [deletedId]
        );
      })
    );

    const query = `UPDATE ${TABLE.ACTIVITIES_IMAGES} SET status = 0 WHERE id IN (?)`;

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
