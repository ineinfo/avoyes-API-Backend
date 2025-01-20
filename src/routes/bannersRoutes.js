// src/routes/pagesRoutes.js
const express = require('express');
const TABLE = require('../utils/tables')
const pool = require('../utils/db');
const router = express.Router();
const authMiddleware = require('../utils/authMiddleware');
const { topBanners } = require("../utils/multerConfig");




router.post("/top", topBanners, authMiddleware, async (req, res) => {
    try {
      const user_id = req.user_id;
      const { title, sub_title } = req.body;
  
      if (!title) {
        res
          .status(400)
          .json({ error: "Title fields are required", status: false });
      }
      const [existingRecord] = await pool.query(
        `SELECT * FROM ${TABLE.TOP_BANNER_TABLE} WHERE title = ?`,
        [title]
      );
  
      if (existingRecord.length > 0) {
        return res
          .status(400)
          .json({ error: "This category already exists", status: false });
      }
  
      const baseUrl =
        req.protocol + "://" + req.get("host") + "/uploads/topbanner/";
      const image_urls = req.files.map((file) => baseUrl + file.filename);
      const image_url = image_urls.length > 0 ? image_urls[0] : "";
  
      await pool.query(
        `INSERT INTO ${TABLE.TOP_BANNER_TABLE} (title,user_id,sub_title,image_url) VALUES (?,?,?,?)`,
        [title, user_id, sub_title, image_url]
      );
  
      return res
        .status(201)
        .json({ message: "Record Successfully Created", status: true });
    } catch (error) {
      console.log("err", error);
      return res.status(500).json({ error: "Server error", status: false });
    }
  });
  
  router.put("/top/:id", topBanners, authMiddleware, async (req, res) => {
    try {
      const id = req.params.id;
      const { title, sub_title } = req.body;
  
      if (!title || !sub_title) {
        res.status(400).json({ error: "All fields are required", status: false });
      }
  
      const [existingRecord] = await pool.query(
        `SELECT * FROM ${TABLE.TOP_BANNER_TABLE} WHERE status != 0 AND id = ?`,
        [id]
      );
  
      if (existingRecord.length == 0) {
        return res.status(400).json({ error: "Record not found", status: false });
      }
  
      const baseUrl =
        req.protocol + "://" + req.get("host") + "/uploads/topbanner/";
      const image_urls = req.files.map((file) => baseUrl + file.filename);
      const image_url = image_urls.length > 0 ? image_urls[0] : "";
  
      let sql = `UPDATE ${TABLE.TOP_BANNER_TABLE} SET title = ?, sub_title = ?, image_url = ? WHERE id = ?`;
      await pool.query(sql, [title, sub_title, image_url, id]);
  
      return res
        .status(201)
        .json({ message: "Record Successfully updated", status: true });
    } catch (error) {
      console.log("err", error);
      return res.status(500).json({ error: "Server error", status: false });
    }
  });
  
  // All List & Specific List
  router.get("/top/:id?", async (req, res) => {
    const id = req.params.id;
    try {
      if (id) {
        const [results] = await pool.query(
          `SELECT * FROM ${TABLE.TOP_BANNER_TABLE} WHERE status != 0 and id = ?`,
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
  
      const [results] = await pool.query(
        `SELECT * FROM ${TABLE.TOP_BANNER_TABLE} WHERE status != 0`
      );
      if (results.length > 0) {
        return res
          .status(200)
          .json({
            data: results,
            message: "Record Successfully Fetched",
            status: true,
          });
      }
      return res
        .status(404)
        .json({ error: "Sorry, Record Not Found", status: false });
    } catch (error) {
      return res.status(500).json({ error: "Server error", status: false });
    }
  });
  
  router.delete("/top/:id", authMiddleware, async (req, res) => {
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
            `SELECT * FROM ${TABLE.TOP_BANNER_TABLE} WHERE status != 0 and id = ?`,
            [deletedId]
          );
        })
      );
  
      const query = `UPDATE ${TABLE.TOP_BANNER_TABLE} SET status = 0 WHERE id IN (?)`;
  
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



// All List & Specific List
router.get('/:id?', async (req, res) => {
    try {

        const id = req.params.id;
        const { page = 1, limit = 10 } = req.body;
        const parsedPage = parseInt(page);
        const parsedLimit = parseInt(limit) > 0 ? parseInt(limit) : 10;
        const offset = (parsedPage - 1) * parsedLimit;

        if (id) {
            const [results] = await pool.query(`SELECT * FROM ${TABLE.BOTTOM_BANNER_TABLE} WHERE status = 1 and id = ?`, [id]);
            if (results.length > 0) {
                return res.status(200).json({ data: results[0], message: "Record Successfully Fetched", status: true });
            }
            return res.status(404).json({ error: "Sorry, Record Not Found", status: false });
        }

        let [results] = await pool.query(`SELECT * FROM ${TABLE.BOTTOM_BANNER_TABLE} WHERE status = 1 ORDER BY ID DESC LIMIT ?,?`, [offset, parsedLimit]);

        return res.status(200).json({ data: results, message: "Record Successfully Fetched", status: true, count: results.length });

    } catch (error) {
        return res.status(500).json({ error: 'Server error', status: false });
    }
});

// Update
router.put('/:id',topBanners, async (req, res) => {
    try {
        const id = req.params.id;

        // Validate ID
        if (!id) {
            return res.status(400).json({ error: 'RowID must be required', status: false });
        }

        const [existingRecord] = await pool.query(
            `SELECT * FROM ${TABLE.BOTTOM_BANNER_TABLE} WHERE status = 1 and id = ?`, 
            [id]
        );
        if (!existingRecord.length) {
            return res.status(404).json({ error: "Sorry, Record Not Found", status: false });
        }

     
        const { title, view_url } = req.body;

   
        const baseUrl = req.protocol + "://" + req.get("host") + "/uploads/banner/";
        const image_urls = req.files ? req.files.map((file) => baseUrl + file.filename) : [];
        const image_url = image_urls.length > 0 ? image_urls[0] : "";  // Choose the first image if available


        await pool.query(
            `UPDATE ${TABLE.BOTTOM_BANNER_TABLE} SET title = ?, view_url = ?, image_url = ? WHERE id = ?`, 
            [title, view_url, image_url, id]
        );

    
        return res.status(200).json({
            message: "Record Successfully Updated",
            status: true,
            data: { id, title, view_url, image_url }  
        });
      
    } catch (error) {
        console.error("Error updating record:", error);
        return res.status(500).json({ error: 'Server error', status: false });
    }
});

module.exports = router;