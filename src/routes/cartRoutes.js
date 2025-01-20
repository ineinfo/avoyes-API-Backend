// src/routes/cartRoutes.js
const express = require("express");
const TABLE = require("../utils/tables");
const pool = require("../utils/db");
const router = express.Router();
const authMiddleware = require("../utils/authMiddleware");

router.post("/", authMiddleware, async (req, res) => {
  try {
    const { user_id, product_id, size_id, color_id, quantity } = req.body;

    // Validate required fields
    if (
      !user_id ||
      !product_id ||
      !size_id ||
      !color_id ||
      quantity === undefined
    ) {
      return res.status(400).json({
        error:
          "User Id, Product Id, Size Id, Color Id, and Quantity fields are required",
        status: false,
      });
    }

    // Check if the user_id exists in the users table
    const [userCheckResult] = await pool.query(
      `SELECT COUNT(*) as count FROM users WHERE id = ?`,
      [user_id]
    );
    if (userCheckResult[0].count === 0) {
      return res.status(404).json({ error: "User not found", status: false });
    }

    // Check if the record already exists in the cart
    const [existingRecord] = await pool.query(
      `SELECT * FROM ${TABLE.CART_TABLE} WHERE user_id = ? AND product_id = ? AND size_id = ? AND color_id = ? AND status !=0`,
      [user_id, product_id, size_id, color_id]
    );

    if (existingRecord.length > 0) {
      const currentQuantity = existingRecord[0].quantity;

      // If quantity is the same as existing record, return 'Product already in cart'
      if (currentQuantity === quantity) {
        return res
          .status(200)
          .json({ message: "Product already in cart", status: true });
      } else {
        // If quantity is different, update the quantity
        await pool.query(
          `UPDATE ${TABLE.CART_TABLE} SET quantity = ? WHERE user_id = ? AND product_id = ? AND size_id = ? AND color_id = ?`,
          [quantity, user_id, product_id, size_id, color_id]
        );
        return res.status(200).json({ message: "Cart updated", status: true });
      }
    } else {
      // If quantity is zero or less, do not create a record
      if (quantity <= 0) {
        return res
          .status(400)
          .json({
            error: "Quantity must be greater than zero to add to cart",
            status: false,
          });
      }

      // If the product does not exist in the cart, add it
      await pool.query(
        `INSERT INTO ${TABLE.CART_TABLE} (user_id, product_id, size_id, color_id, quantity) VALUES (?, ?, ?, ?, ?)`,
        [user_id, product_id, size_id, color_id, quantity]
      );
      return res
        .status(201)
        .json({ message: "Product added to cart", status: true });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error", status: false });
  }
});

router.get("/:id?", async (req, res) => {
  try {
    const id = req.params.id;
    const { page = 1, limit = 10 } = req.body;
    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit) > 0 ? parseInt(limit) : 10;
    const offset = (parsedPage - 1) * parsedLimit;

    if (id) {
      const [results] = await pool.query(
        `
                SELECT 
                    c.*, 
                    CONCAT(u.first_name, ' ', u.last_name) AS user_name, 
                    p.title AS product_title, 
                    p.short_description, 
                    p.image_url1, 
                    p.amount, 
                    ps.title AS size_title, 
                    pc.title AS color_title  
                FROM 
                    ${TABLE.CART_TABLE} c
                LEFT JOIN 
                    users u ON c.user_id = u.id
                LEFT JOIN 
                    products p ON c.product_id = p.id
                LEFT JOIN 
                    product_size ps ON c.size_id = ps.id
                LEFT JOIN 
                    product_colors pc ON c.color_id = pc.id
                WHERE 
                    c.status = 1 AND c.id = ?
            `,
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
      `
            SELECT 
                c.*, 
                CONCAT(u.first_name, ' ', u.last_name) AS user_name, 
                p.title AS product_title, 
                p.short_description, 
                p.image_url1, 
                p.amount, 
                ps.title AS size_title, 
                pc.title AS color_title 
            FROM 
                ${TABLE.CART_TABLE} c
            LEFT JOIN 
                users u ON c.user_id = u.id
            LEFT JOIN 
                products p ON c.product_id = p.id
            LEFT JOIN 
                product_size ps ON c.size_id = ps.id
            LEFT JOIN 
                product_colors pc ON c.color_id = pc.id
            WHERE 
                c.status = 1 
            ORDER BY 
                c.id DESC
                LIMIT ?, ?
        `,
      [offset, parsedLimit]
    );

    return res
      .status(200)
      .json({
        data: results,
        message: "Record Successfully Fetched",
        status: true,
        count: results.length,
      });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Server error", status: false });
  }
});

// specific user's cart
router.get("/cartuser/:user_id?", async (req, res) => {
  try {
    const user_id = req.params.user_id;

    if (user_id) {
      const query = `
                SELECT 
                    c.*, 
                    CONCAT(u.first_name, ' ', u.last_name) AS user_name, 
                    p.title AS product_title, 
                    p.short_description, 
                    p.image_url1, 
                    p.amount, 
                    ps.title AS size_title, 
                    pc.title AS color_title 
                FROM 
                    ${TABLE.CART_TABLE} c
                LEFT JOIN 
                    users u ON c.user_id = u.id
                LEFT JOIN 
                    products p ON c.product_id = p.id
                LEFT JOIN 
                    product_size ps ON c.size_id = ps.id
                LEFT JOIN 
                    product_colors pc ON c.color_id = pc.id
                WHERE 
                    c.status = 1 AND c.user_id = ?
                ORDER BY 
                    c.id DESC
            `;

      const [results] = await pool.query(query, [user_id]);

      if (results.length > 0) {
        return res
          .status(200)
          .json({
            data: results,
            message: "Records Successfully Fetched",
            status: true,
          });
      }
      return res
        .status(404)
        .json({
          error: "Sorry, No Records Found for this User",
          status: false,
        });
    }

    return res
      .status(400)
      .json({ error: "User ID is required", status: false });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error", status: false });
  }
});

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
          `SELECT * FROM ${TABLE.CART_TABLE} WHERE status !=0 and id = ?`,
          [deletedId]
        );
      })
    );

    const query = `UPDATE ${TABLE.CART_TABLE} SET status = 0, deleted_at = NOW() WHERE id IN (?)`;

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

// Update cart item
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params; // Cart item ID from URL parameter
    const { quantity } = req.body; // Quantity from the request body

    // Validate required fields
    if (quantity === undefined) {
      return res.status(400).json({
        error: "Quantity field is required",
        status: false,
      });
    }

    // Check if the item exists in the cart
    const [existingRecord] = await pool.query(
      `SELECT * FROM ${TABLE.CART_TABLE} WHERE id = ? AND status = 1`,
      [id]
    );

    if (existingRecord.length === 0) {
      return res
        .status(404)
        .json({ error: "Cart item not found", status: false });
    }

    // If quantity is zero or less, delete the item
    if (quantity <= 0) {
      await pool.query(
        `UPDATE ${TABLE.CART_TABLE} SET status = 0 WHERE id = ?`,
        [id]
      );
      return res
        .status(200)
        .json({ message: "Cart item removed", status: true });
    }

    // Update the quantity if item exists
    await pool.query(
      `UPDATE ${TABLE.CART_TABLE} SET quantity = ? WHERE id = ?`,
      [quantity, id]
    );
    return res
      .status(200)
      .json({ message: "Cart item updated successfully", status: true });
  } catch (error) {
    console.error("Error updating cart item:", error);
    return res.status(500).json({ error: "Server error", status: false });
  }
});

module.exports = router;
