const express = require("express");
const TABLE = require("../utils/tables");
const pool = require("../utils/db");
const router = express.Router();
const {
  generateOrderNumber,
  isRoleAdmin,
  isRoleUser,
} = require("../utils/common");

const authMiddleware = require("../utils/authMiddleware");

router.post("/", authMiddleware, async (req, res) => {
  try {
    const user_id = req.user_id;
    const { addId, total, sub_total, products } = req.body;
    if (!addId) {
      res
        .status(400)
        .json({ error: "Address fields are required", status: false });
    }

    if (!total) {
      res
        .status(400)
        .json({ error: "Total fields are required", status: false });
    }

    if (!sub_total) {
      res
        .status(400)
        .json({ error: "Sub Total fields are required", status: false });
    }

    const order_number = await generateOrderNumber(pool);
    const [orderResult] = await pool.query(
      `INSERT INTO ${TABLE.ORDERS_TABLE} (user_id,order_number,address_id,order_amount,final_amount) VALUES (?,?,?,?,?)`,
      [user_id, order_number, addId, sub_total, total]
    );
    const dbOrderID = orderResult.insertId;

    if (products.length > 0) {
      products.map(async (item) => {
        await pool.query(
          `INSERT INTO ${TABLE.ORDERITEMS_TABLE} (order_id,product_id,rate,amount,quantity,size_id,color_id,image_url) VALUES (?,?,?,?,?,?,?,?)`,
          [
            dbOrderID,
            item.product_id,
            item.rate,
            item.amount,
            item.quantity,
            item.size_id,
            item.color_id,
            item.image_url,
          ]
        );
      });
    }
    return res.status(201).json({
      message: "Record Successfully Created",
      status: true,
      dbOrderID,
      order_number,
    });
  } catch (error) {
    console.log("error", error);
    return res.status(500).json({ error: "Server error", status: false });
  }
});

// // All
router.get("/:id?",  async (req, res) => {
  try {
    const id = req.params.id;
    const user_id = req.user_id;
    const role_id = req.role_id;

    if (id) {
      // Fetch a specific order
      let [results] = await pool.query(
        `SELECT 
          o.id,
          o.id AS order_id,
          o.order_number,
          o.status, 
          o.user_id,
          o.final_amount,
          o.order_amount,
          o.address_id,
          o.created_at, 
          o.order_status,
          o.updated_at,
          CASE 
            WHEN o.order_status = 1 THEN 'pending'
            WHEN o.order_status = 2 THEN 'in progress'
            WHEN o.order_status = 3 THEN 'done'
            WHEN o.order_status = 4 THEN 'order cancelled'
            ELSE 'unknown'
          END AS status_label,
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'order_item_id', oi.id,
              'product_id', op.id,
              'item_name', op.title,
              'quantity', oi.quantity,
              'rate', oi.rate,
              'amount', oi.amount,
              'image_url', oi.image_url,
              'size_id', oi.size_id,
              'color_id', oi.color_id
            )
          ) AS order_items
        FROM ${TABLE.ORDERS_TABLE} o
        LEFT JOIN ${TABLE.ORDERITEMS_TABLE} oi ON o.id = oi.order_id
        LEFT JOIN ${TABLE.PRODUCTS_TABLE} op ON op.id = oi.product_id 
        WHERE o.status != 0
        AND o.id = ?
        GROUP BY o.id
        ORDER BY o.id DESC`,
        [id]
      );

      if (results.length > 0) {
        return res.status(200).json({
          data: results[0],
          message: "Record Successfully Fetched",
          status: true,
        });
      }

      return res.status(404).json({
        error: "Sorry, Record Not Found",
        status: false,
      });
    }

    // Handle fetching all orders
    // let userAdminCondition = "";
    // if (role_id === isRoleUser()) {
    //   userAdminCondition = "AND o.user_id = " + user_id;
    // }

    let [results] = await pool.query(
      `SELECT 
        o.id,
        o.id AS order_id,
        o.order_number,
        o.status, 
        o.final_amount,
        o.order_amount,
        o.created_at, 
        o.user_id,
        o.address_id,
        o.order_status,
        o.updated_at,
        CASE 
          WHEN o.order_status = 1 THEN 'pending'
          WHEN o.order_status = 2 THEN 'in progress'
          WHEN o.order_status = 3 THEN 'done'
          WHEN o.order_status = 4 THEN 'order cancelled'
          ELSE 'unknown'
        END AS status_label,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'order_item_id', oi.id,
            'product_id', op.id,
            'item_name', op.title,
            'quantity', oi.quantity,
            'rate', oi.rate,
            'amount', oi.amount,
            'image_url', oi.image_url,
            'size_id', oi.size_id,
            'color_id', oi.color_id
          )
        ) AS order_items
      FROM ${TABLE.ORDERS_TABLE} o
      LEFT JOIN ${TABLE.ORDERITEMS_TABLE} oi ON o.id = oi.order_id
      LEFT JOIN ${TABLE.PRODUCTS_TABLE} op ON op.id = oi.product_id 
      WHERE o.status != 0
    
      GROUP BY o.id
      ORDER BY o.id DESC`
    );

    return res.status(200).json({
      data: results,
      message: "Records Successfully Fetched",
      status: true,
      count: results.length,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      error: "Server error",
      status: false,
    });
  }
});


// // dhara2 = all or specific order
// router.get("/:id?", authMiddleware, async (req, res) => {
//   try {
//     const id = req.params.id;
//     const user_id = req.user_id;
//     const role_id = req.role_id;
//     const { page = 1, limit = 20 } = req.body;
//     const parsedPage = parseInt(page);
//     const parsedLimit =
//       parseInt(limit) > 0 ? parseInt(limit) : 100000000000000000000000;
//     const offset = (parsedPage - 1) * parsedLimit;

//     if (id) {
//       // Query to fetch order with order items (using GROUP_CONCAT for compatibility)
//       let [results] = await pool.query(
//         `SELECT 
//           o.id,
//           o.id as order_id,
//           o.order_number,
//           o.status, 
//           o.user_id,
//           o.final_amount,
//           o.order_amount,
//           o.address_id,
//           o.created_at, 
//           o.order_status,
//           o.updated_at,
//           CASE 
//               WHEN o.order_status = 1 THEN 'pending'
//               WHEN o.order_status = 2 THEN 'in progress'
//               WHEN o.order_status = 3 THEN 'done'
//               WHEN o.order_status = 4 THEN 'order cancelled'
//               ELSE 'unknown'
//             END AS status_label,
//           GROUP_CONCAT(
//             JSON_OBJECT(
//               'order_item_id', oi.id,
//               'product_id', op.id,
//               'item_name', op.title,
//               'quantity', oi.quantity,
//               'rate', oi.rate,
//               'amount', oi.amount,
//               'image_url', oi.image_url,
//               'size_id', oi.size_id,
//               'color_id', oi.color_id
//             ) SEPARATOR ','
//           ) AS order_items
//         FROM ${TABLE.ORDERS_TABLE} o
//         LEFT JOIN ${TABLE.ORDERITEMS_TABLE} oi ON o.id = oi.order_id
//         LEFT JOIN ${TABLE.PRODUCTS_TABLE} op ON op.id = oi.product_id 
//         WHERE o.status != 0
//         AND o.id = ?
//         GROUP BY o.id
//         ORDER BY o.id DESC`,
//         [id]
//       );

//       if (results.length > 0) {
//         // Parse the JSON data from the GROUP_CONCAT string
//         const order = results[0];
//         order.order_items = JSON.parse(`[${order.order_items}]`); // Convert the string back to a JSON array

//         return res.status(200).json({
//           data: order,
//           message: "Record Successfully Fetched",
//           status: true,
//         });
//       }

//       // if (results.length > 0) {
//       //   const order = results[0];
//       //   try {
//       //     order.order_items = order.order_items
//       //       ? JSON.parse(`[${order.order_items}]`)
//       //       : []; // Parse only if data exists
//       //   } catch (error) {
//       //     console.error("Error parsing order_items:", error);
//       //     order.order_items = [];
//       //   }

//       //   return res.status(200).json({
//       //     data: order,
//       //     message: "Record Successfully Fetched",
//       //     status: true,
//       //   });
//       // }

//       return res
//         .status(404)
//         .json({ error: "Sorry, Record Not Found", status: false });
//     }

//     // Handle fetching multiple orders
//     let userAdminCondition = "";
//     if (role_id === isRoleUser()) {
//       userAdminCondition = "AND o.user_id = " + user_id;
//     }

//     let [results] = await pool.query(
//       `SELECT 
//         o.id,
//         o.id as order_id,
//         o.order_number,
//         o.status, 
//         o.final_amount,
//         o.order_amount,
//         o.created_at, 
//         o.user_id,
//         o.address_id,
//         o.order_status,
//         o.updated_at,
//         CASE 
//             WHEN o.order_status = 1 THEN 'pending'
//             WHEN o.order_status = 2 THEN 'in progress'
//             WHEN o.order_status = 3 THEN 'done'
//             WHEN o.order_status = 4 THEN 'order cancelled'
//             ELSE 'unknown'
//           END AS status_label,
//         GROUP_CONCAT(
//           JSON_OBJECT(
//             'order_item_id', oi.id,
//             'product_id', op.id,
//             'item_name', op.title,
//             'quantity', oi.quantity,
//             'rate', oi.rate,
//             'amount', oi.amount,
//             'image_url', oi.image_url,
//             'size_id', oi.size_id,
//             'color_id', oi.color_id
//           ) SEPARATOR ','
//         ) AS order_items
//       FROM ${TABLE.ORDERS_TABLE} o
//       LEFT JOIN ${TABLE.ORDERITEMS_TABLE} oi ON o.id = oi.order_id
//       LEFT JOIN ${TABLE.PRODUCTS_TABLE} op ON op.id = oi.product_id 
//       WHERE o.status != 0
//       ${userAdminCondition}
//       GROUP BY o.id
//       ORDER BY o.id DESC`,
//       []
//     );

//     // if (results.length > 0) {
//     //   // Parse the JSON data for each order
//     //   results = results.map((order) => {
//     //     order.order_items = JSON.parse(`[${order.order_items}]`); // Convert the string back to a JSON array
//     //     return order;
//     //   });

//     //   return res.status(200).json({
//     //     data: results,
//     //     message: "Records Successfully Fetched",
//     //     status: true,
//     //     count: results.length,
//     //   });
//     // }

//     if (results.length > 0) {
//       const order = results[0];
//       try {
//         order.order_items = order.order_items
//           ? JSON.parse(`[${order.order_items}]`)
//           : []; // Parse only if data exists
//       } catch (error) {
//         console.error("Error parsing order_items:", error);
//         order.order_items = [];
//       }

//       return res.status(200).json({
//         data: order,
//         message: "Record Successfully Fetched",
//         status: true,
//       });
//     }

//     return res.status(404).json({ error: "No Orders Found", status: false });
//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({ error: "Server error", status: false });
//   }
// });


//get order based on users id
router.get("/users/:id",  async (req, res) => {
  try {
    const userId = req.params.id;

    // Query to fetch orders for the specific user
    const [results] = await pool.query(
      `SELECT 
        o.id,
        o.id as order_id,
        o.order_number,
        o.status, 
        o.final_amount,
        o.order_amount,
        o.created_at, 
        o.user_id,
        o.address_id,
        o.order_status,
        o.updated_at,
        CASE 
            WHEN o.order_status = 1 THEN 'pending'
            WHEN o.order_status = 2 THEN 'in progress'
            WHEN o.order_status = 3 THEN 'done'
            WHEN o.order_status = 4 THEN 'order cancelled'
            ELSE 'unknown'
          END AS status_label,
        GROUP_CONCAT(
          JSON_OBJECT(
            'order_item_id', oi.id,
            'product_id', op.id,
            'item_name', op.title,
            'quantity', oi.quantity,
            'rate', oi.rate,
            'amount', oi.amount,
            'image_url', oi.image_url,
            'size_id', oi.size_id,
            'color_id', oi.color_id
          ) SEPARATOR ','
        ) AS order_items
      FROM ${TABLE.ORDERS_TABLE} o
      LEFT JOIN ${TABLE.ORDERITEMS_TABLE} oi ON o.id = oi.order_id
      LEFT JOIN ${TABLE.PRODUCTS_TABLE} op ON op.id = oi.product_id 
      WHERE o.status != 0 AND o.user_id = ?
      GROUP BY o.id`,
      [userId]
    );

    if (results.length > 0) {
      const order = results[0];
      try {
        order.order_items = order.order_items
          ? JSON.parse(`[${order.order_items}]`)
          : []; // Parse only if data exists
      } catch (error) {
        console.error("Error parsing order_items:", error);
        order.order_items = [];
      }

      return res.status(200).json({
        data: order,
        message: "Record Successfully Fetched",
        status: true,
      });
    }


    return res.status(404).json({
      error: "No Orders Found for the specified user",
      status: false,
    });
  } catch (error) {
    console.error("error", error);
    return res.status(500).json({   
      error: "Server Error",
      status: false,
    });
  }
});



// //dhara1 
// router.get("/:id?", authMiddleware, async (req, res) => {
//   try {
//     const id = req.params.id;
//     const user_id = req.user_id;
//     const role_id = req.role_id;
//     const { page = 1, limit = 10 } = req.body;
//     const parsedPage = parseInt(page);
//     const parsedLimit =
//       parseInt(limit) > 0 ? parseInt(limit) : 100000000000000000000000;
//     const offset = (parsedPage - 1) * parsedLimit;

//     if (id) {
//       const [results] = await pool.query(`
//         SELECT 
//           o.id,
//           o.order_number,
//           o.status,
//           o.final_amount,
//           o.order_amount,
//           o.created_at,
//           o.user_id,
//           o.address_id,
//           o.order_status,
//           o.updated_at,
//           CASE 
//             WHEN o.order_status = 1 THEN 'pending'
//             WHEN o.order_status = 2 THEN 'in progress'
//             WHEN o.order_status = 3 THEN 'done'
//             WHEN o.order_status = 4 THEN 'order cancelled'
//             ELSE 'unknown'
//           END AS status_label,
//           oi.id AS order_item_id,
//           op.id AS product_id,
//           op.title AS item_name,
//           oi.quantity,
//           oi.rate,
//           oi.amount,
//           oi.image_url,
//           oi.size_id,
//           oi.color_id
//         FROM orders o
//         LEFT JOIN order_items oi ON o.id = oi.order_id
//         LEFT JOIN products op ON op.id = oi.product_id
//         WHERE o.status != 0
//         ORDER BY o.id DESC;
//       `);

//       if (results.length > 0) {
//         return res.status(200).json({
//           data: results[0],
//           message: "Record Successfully Fetched",
//           status: true,
//         });
//       }

//       return res
//         .status(404)
//         .json({ error: "Sorry, Record Not Found", status: false });
//     }

//     let userAdminCondition = "";
//     if (role_id == isRoleUser()) {
//       userAdminCondition = "AND o.user_id = " + user_id;
//     }

//     // Fixing the query result variable
//     const [rows] = await pool.query(`
//       SELECT 
//         o.id,
//         o.order_number,
//         o.status,
//         o.final_amount,
//         o.order_amount,
//         o.created_at,
//         o.user_id,
//         o.address_id,
//         o.order_status,
//         o.updated_at,
//         CASE 
//           WHEN o.order_status = 1 THEN 'pending'
//           WHEN o.order_status = 2 THEN 'in progress'
//           WHEN o.order_status = 3 THEN 'done'
//           WHEN o.order_status = 4 THEN 'order cancelled'
//           ELSE 'unknown'
//         END AS status_label,
//         oi.id AS order_item_id,
//         op.id AS product_id,
//         op.title AS item_name,
//         oi.quantity,
//         oi.rate,
//         oi.amount,
//         oi.image_url,
//         oi.size_id,
//         oi.color_id
//       FROM orders o
//       LEFT JOIN order_items oi ON o.id = oi.order_id
//       LEFT JOIN products op ON op.id = oi.product_id
//       WHERE o.status != 0
//       ORDER BY o.id DESC;
//     `);

//     const orders = rows.reduce((acc, row) => {
//       const order = acc.find(o => o.id === row.id);
//       if (order) {
//         order.order_items.push({
//           order_item_id: row.order_item_id,
//           product_id: row.product_id,
//           item_name: row.item_name,
//           quantity: row.quantity,
//           rate: row.rate,
//           amount: row.amount,
//           image_url: row.image_url,
//           size_id: row.size_id,
//           color_id: row.color_id,
//         });
//       } else {
//         acc.push({
//           id: row.id,
//           order_number: row.order_number,
//           status: row.status,
//           final_amount: row.final_amount,
//           order_amount: row.order_amount,
//           created_at: row.created_at,
//           user_id: row.user_id,
//           address_id: row.address_id,
//           order_status: row.order_status,
//           updated_at: row.updated_at,
//           status_label: row.status_label,
//           order_items: [{
//             order_item_id: row.order_item_id,
//             product_id: row.product_id,
//             item_name: row.item_name,
//             quantity: row.quantity,
//             rate: row.rate,
//             amount: row.amount,
//             image_url: row.image_url,
//             size_id: row.size_id,
//             color_id: row.color_id,
//           }],
//         });
//       }
//       return acc;
//     }, []);

//     return res.status(200).json({
//       data: orders,
//       message: "Record Successfully Fetched",
//       status: true,
//       count: rows.length,
//     });
//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({ error: "Server error", status: false });
//   }
// });







router.put("/:id/status", authMiddleware, async (req, res) => {
  try {
    const orderId = req.params.id;
    const { newStatus } = req.body;

    // Validate the input
    if (!newStatus || ![0, 1, 2, 3].includes(newStatus)) {
      return res
        .status(400)
        .json({ error: "Invalid status provided", status: false });
    }

    // user_id from token
    const userId = req.user_id;

    const updateQuery = `
            UPDATE ${TABLE.ORDERS_TABLE}
            SET order_status = ?, updated_by = ?
            WHERE id = ? AND status != 0
        `;

    console.log(
      "Updating order with ID:",
      orderId,
      "to status:",
      newStatus,
      "by user ID:",
      userId
    );

    const [result] = await pool.query(updateQuery, [
      newStatus,
      userId,
      orderId,
    ]);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "Order not found or cannot be updated", status: false });
    }

    return res
      .status(200)
      .json({ message: "Order status successfully updated", status: true });
  } catch (error) {
    console.error("Error updating order status:", error);
    return res.status(500).json({ error: "Server error", status: false });
  }
});

module.exports = router;
