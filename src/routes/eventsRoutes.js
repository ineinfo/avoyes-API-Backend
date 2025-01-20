// src/routes/eventsRoutes.js
const express = require("express");
const TABLE = require("../utils/tables");
const pool = require("../utils/db");
const router = express.Router();
const authMiddleware = require("../utils/authMiddleware");
const { uploadEvents } = require("../utils/multerConfig");
var slugify = require("slugify");
const { multerErrorHandler } = require("../utils/common");

const generateSlug = (title) => {
  return title
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w\-]+/g, "") // Remove all non-word chars
    .replace(/\-\-+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start of text
    .replace(/-+$/, ""); // Trim - from end of text
};
const getUniqueSlug = async (slug) => {
  let uniqueSlug = slug;
  let count = 1;

  while (true) {
    const [existingSlugs] = await pool.query(
      `SELECT COUNT(*) AS count FROM ${TABLE.EVENTS_TABLE} WHERE slug = ?`,
      [uniqueSlug]
    );

    if (existingSlugs[0].count === 0) {
      return uniqueSlug;
    }

    uniqueSlug = `${slug}-${count}`;
    count++;
  }
};

// Add
router.post(
  "/",
  uploadEvents,
  multerErrorHandler,
  authMiddleware,
  async (req, res) => {
    try {
      const {
        title,
        description,
        short_description,
        start_date,
        end_date,
        isFeatured,
        event_category_id,
        event_speaker_id,
        location,
        organizer,
        organizer_contact,
        cost,
        map_url
      } = req.body;

      if (
        !title ||
        !description ||
        !short_description ||
        !start_date ||
        !end_date ||
        !location ||
        !organizer ||
        !organizer_contact ||
        !cost ||
        !map_url
      ) {
        return res.status(400).json({
          error:
            "All fields are required",
          status: false,
        });
      }

      let is_featured = false;
      if (isFeatured) {
        is_featured = true;
      }

      const [existingTitle] = await pool.query(
        `SELECT * FROM ${TABLE.EVENTS_TABLE} WHERE status = 1 and title = ?`,
        [title]
      );
      if (existingTitle.length) {
        return res
          .status(400)
          .json({ error: "Record already exists", status: false });
      }

      // Validate date format (YYYY-MM-DD) for both start_date and end_date
      const dateRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;

      if (
        !dateRegex.test(start_date) ||
        isNaN(new Date(start_date).getTime())
      ) {
        return res.status(400).json({
          error: "Invalid start date format. Please use YYYY-MM-DD HH:MM.",
          status: false,
        });
      }

      if (!dateRegex.test(end_date) || isNaN(new Date(end_date).getTime())) {
        return res.status(400).json({
          error: "Invalid end date format. Please use YYYY-MM-DD HH:MM.",
          status: false,
        });
      }
      const baseUrl =
        req.protocol + "://" + req.get("host") + "/uploads/events/";
      const image_urls = req.files.map((file) => baseUrl + file.filename);
      const image_url = image_urls.length > 0 ? image_urls[0] : "";

      const slug = generateSlug(title);
      console.log("Generated slug:", slug);

      const uniqueSlug = await getUniqueSlug(slug);

      await pool.query(
        `INSERT INTO ${TABLE.EVENTS_TABLE} (title,description,short_description,start_date,end_date,image_url,slug,is_featured,event_category_id,event_speaker_id,location,organizer,organizer_contact,cost,map_url) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          title,
          description,
          short_description,
          start_date,
          end_date,
          image_url,
          uniqueSlug,
          is_featured,
          event_category_id,
          event_speaker_id,
          location,
          organizer,
          organizer_contact,
          cost,
          map_url
        ]
      );

      return res
        .status(201)
        .json({ message: "Record Successfully Created", status: true });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: "Server error", status: false });
    }
  }
);

router.get("/eventvideo/:id?", async (req, res) => {
  try {
    let id = req.params.id;
    if (id) {
      let [results] = await pool.query(
        `SELECT * FROM ${TABLE.EVENT_VIDEO_TABLE} WHERE id = ? AND status != 0`,
        [id]
      );

      if (results.length > 0) {
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
      `SELECT * FROM ${TABLE.EVENT_VIDEO_TABLE} WHERE status != 0 ORDER BY id DESC`,
      []
    );
    return res.status(200).json({
      data: results,
      message: "Record Successfully Fetched",
      status: true,
      count: results.length,
    });
    return res
      .status(404)
      .json({ error: "Sorry, Record Not Found", status: false });
  } catch (error) {
    return res.status(500).json({ error: "Server error", status: false });
  }
});

router.get("/featured", async (req, res) => {
  try {
    const id = req.params.id;
    const { page = 1, limit = 10 } = req.body;
    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit) > 0 ? parseInt(limit) : 10;
    const offset = (parsedPage - 1) * parsedLimit;

    const [results] = await pool.query(
      `SELECT * FROM ${TABLE.EVENTS_TABLE} WHERE status != 0 and is_featured = true ORDER BY id DESC LIMIT ? ,?`,
      [offset, parsedLimit]
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
        `SELECT * FROM ${TABLE.EVENTS_TABLE} WHERE status !=0 and id = ?`,
        [id]
      );
      if (results.length > 0) {
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

    const [results] = await pool.query(
      `SELECT * FROM ${TABLE.EVENTS_TABLE} WHERE status !=0 ORDER BY id DESC LIMIT ? ,?`,
      [offset, parsedLimit]
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

// Update
router.put(
  "/eventvideo/:id",
  uploadEvents,
  multerErrorHandler,
  authMiddleware,
  async (req, res) => {
    try {
      let id = req.params.id;
      const { video_title, video_url, top_sub_heading, video_sub_heading,
        organizer,
        organizer_contact,
        cost } =
        req.body;
      await pool.query(
        `UPDATE ${TABLE.EVENT_VIDEO_TABLE} SET video_title = ?, video_url = ?, top_sub_heading = ?, video_sub_heading = ?,updated_at = NOW() WHERE id = ?`,
        [video_title, video_url, top_sub_heading, video_sub_heading, id]
      );

      return res
        .status(200)
        .json({ message: "Event Video Successfully Updated", status: true });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: "Server error", status: false });
    }
  }
);

// Update
router.put(
  "/:id",
  uploadEvents,
  multerErrorHandler,
  authMiddleware,
  async (req, res) => {
    try {
      const id = req.params.id;

      if (!id) {
        return res
          .status(400)
          .json({ error: "RowID must be required", status: false });
      }

      const [existingRecord] = await pool.query(
        `SELECT * FROM ${TABLE.EVENTS_TABLE} WHERE status = 1 and id = ?`,
        [id]
      );
      if (!existingRecord.length) {
        return res
          .status(404)
          .json({ error: "Sorry, Record Not Found", status: false });
      }

      console.log('event req.body: ',req.body);
      const {
        title,
        description,
        short_description,
        start_date,
        end_date,
        isFeatured,
        event_category_id,
        event_speaker_id,
        map_url,
        cost,
        location,
        organizer,
        organizer_contact
      } = req.body;

      if (
        !title ||
        !description ||
        !short_description ||
        !start_date ||
        !end_date ||
        !map_url
      ) {
        return res.status(400).json({
          error:
            "All fields are required",
          status: false,
        });
      }
      // Validate date format (YYYY-MM-DD) for both start_date and end_date
      const dateRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;

      if (
        !dateRegex.test(start_date) ||
        isNaN(new Date(start_date).getTime())
      ) {
        return res.status(400).json({
          error: "Invalid start date format. Please use YYYY-MM-DD HH:MM.",
          status: false,
        });
      }

      if (!dateRegex.test(end_date) || isNaN(new Date(end_date).getTime())) {
        return res.status(400).json({
          error: "Invalid end date format. Please use YYYY-MM-DD HH:MM.",
          status: false,
        });
      }

      const [existingTitle] = await pool.query(
        `SELECT * FROM ${TABLE.EVENTS_TABLE} WHERE status != 0 and title = ?`,
        [title]
      );
      // if (existingTitle.length) {
      //   return res
      //     .status(400)
      //     .json({ error: "Record already exists", status: false });
      // }

      let image_url = existingRecord[0].image_url;
      
      const baseUrl =
        req.protocol + "://" + req.get("host") + "/uploads/events/";
      req.files.forEach((file) => {
        if (file.fieldname === "image_url") {
          image_url = baseUrl + file.filename;
        }
      });
      const newSlug = generateSlug(title);
      const uniqueSlug = await getUniqueSlug(newSlug, id);
      console.log("existingTitle", existingTitle);

      let is_featured = false;
      if (isFeatured == 1) {
        is_featured = true;
      }

      await pool.query(
        `UPDATE ${TABLE.EVENTS_TABLE} SET title = ?, image_url = ?, description = ?, short_description = ?, start_date = ?, end_date = ?, slug = ?, 
            is_featured = ?,event_category_id=?,event_speaker_id=?,map_url = ?, cost = ?,
        location = ?,organizer=?,organizer_contact=?, updated_at = NOW() WHERE id = ?`,
        [
          title,
          image_url,
          description,
          short_description,
          start_date,
          end_date,
          uniqueSlug,
          is_featured,
          event_category_id,
          event_speaker_id,
          map_url,
          cost,
          location,
          organizer,
          organizer_contact,
          id,
        ]
      );

      return res
        .status(200)
        .json({ message: "Record Successfully Updated", status: true });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: "Server error", status: false });
    }
  }
);

// Delete
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
          `SELECT * FROM ${TABLE.EVENTS_TABLE} WHERE status = 1 and id = ?`,
          [deletedId]
        );
      })
    );

    const query = `UPDATE ${TABLE.EVENTS_TABLE} SET status = 0, deleted_at = NOW() WHERE id IN (?)`;

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
