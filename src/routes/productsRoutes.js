// src/routes/productRoutes.js
const express = require("express");
const TABLE = require("../utils/tables");
const pool = require("../utils/db");
const router = express.Router();
const { uploadProducts } = require("../utils/multerConfig");
const authMiddleware = require("../utils/authMiddleware");
const {multerErrorHandler,formatQuery} = require('../utils/common');


router.post("/", uploadProducts, multerErrorHandler, authMiddleware, async (req, res) => {


  
  try {
    const {
      title,
      description,
      short_description,
      amount,
      discount_amount,
      product_label,
      tags,
      colors,
      size,
      material_id,
      subcategory_id,
      category_id,
      weight,
      stock_status,
      type_id,
    } = req.body;

    console.log({ 
      title, 
      description, 
      short_description, 
      amount, 
      discount_amount, 
      product_label, 
      tags, 
      colors, 
      size, 
      material_id, 
      subcategory_id, 
      category_id, 
      weight, 
      stock_status,
      type_id
    });

    // Validate all required fields
    if (
      !title ||
      !description ||
      !short_description ||
      !amount ||
      !discount_amount ||
      !product_label ||
      !material_id ||
      !subcategory_id ||
      !category_id ||
      !weight ||
      !stock_status ||
      !type_id
    ) {
      return res.status(400).json({ error: "All fields are required", status: false });
    }

    // Validate stock_status
const validStockStatuses = ['in_stock', 'out_of_stock'];
if (!validStockStatuses.includes(stock_status)) {
  return res.status(400).json({ error: "Invalid stock status provided", status: false });
}

    // Check if the product title already exists
    const [existingTitle] = await pool.query(
      `SELECT * FROM ${TABLE.PRODUCTS_TABLE} WHERE status = 1 AND title = ?`, 
      [title]
    );

    if (existingTitle.length) {
      return res.status(400).json({ error: 'Record already exists', status: false });
    }

        // Validate that entered tags, colors, and sizes exist in the respective tables
        const validateExistence = async (tableName, column, ids) => {
          const idArray = ids.split(',');
          const placeholders = idArray.map(() => '?').join(',');
          const [rows] = await pool.query(`SELECT ${column} FROM ${tableName} WHERE ${column} IN (${placeholders})`, idArray);
          if (rows.length !== idArray.length) {
            return false; // Some IDs don't exist
          }
          return true;
        };
    

    const isTagsValid = await validateExistence(TABLE.PRODUCT_TAG_TABLE, 'id', tags);
    if (!isTagsValid) {
      return res.status(400).json({ error: "Invalid tags provided", status: false });
    }

    const isColorsValid = await validateExistence(TABLE.PRODUCT_COLORS_TABLE, 'id', colors);
    if (!isColorsValid) {
      return res.status(400).json({ error: "Invalid colors provided", status: false });
    }

    const isSizesValid = await validateExistence(TABLE.PRODUCT_SIZE_TABLE, 'id', size);
    if (!isSizesValid) {
      return res.status(400).json({ error: "Invalid sizes provided", status: false });
    }

    // Generate the base URL for images
    const baseUrl = req.protocol + "://" + req.get("host") + "/uploads/products/";
    const image_urls = req.files.map((file) => baseUrl + file.filename);

    const [image_url1, image_url2, image_url3, image_url4, image_url5] = [
      image_urls[0] || null,
      image_urls[1] || null,
      image_urls[2] || null,
      image_urls[3] || null,
      image_urls[4] || null,
    ];

    // Insert the product
    const [result] = await pool.query(
      `INSERT INTO ${TABLE.PRODUCTS_TABLE} 
        (title, short_description, description, amount, discount_amount, product_label, type_id, material_id, category_id, subcategory_id, weight, stock_status, image_url1, image_url2, image_url3, image_url4, image_url5) 
        VALUES (?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        short_description,
        description,
        amount,
        discount_amount,
        product_label,
        type_id,
        material_id,
        category_id,
        subcategory_id,
        weight,
        stock_status,
        image_url1,
        image_url2,
        image_url3,
        image_url4,
        image_url5,
      ]
    );

    const product_id = result.insertId;

    // Handle tags insertion
    if (tags) {
      const tagArray = tags.split(',');
      const tagInsertPromises = tagArray.map(tag_id => {
        return pool.query(
          `INSERT INTO ${TABLE.PRODUCT_TAG_ADDED_TABLE} (product_id, tag_id) VALUES (?, ?)`,
          [product_id, tag_id.trim()]
        );
      });
      await Promise.all(tagInsertPromises);
    }

    // Handle colors insertion
    if (colors) {
      const colorArray = colors.split(',');
      const colorInsertPromises = colorArray.map(color_id => {
        return pool.query(
          `INSERT INTO ${TABLE.PRODUCT_COLORS_ADDED} (product_id, color_id) VALUES (?, ?)`,
          [product_id, color_id.trim()]
        );
      });
      await Promise.all(colorInsertPromises);
    }

    // Handle sizes insertion
    if (size) {
      const sizeArray = size.split(',');
      const sizeInsertPromises = sizeArray.map(size_id => {
        return pool.query(
          `INSERT INTO ${TABLE.PRODUCT_SIZE_ADDED} (product_id, size_id) VALUES (?, ?)`,
          [product_id, size_id.trim()]
        );
      });
      await Promise.all(sizeInsertPromises);
    }

    return res.status(201).json({ message: "Record Successfully Created", status: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error", status: false });
  }
});


router.get("/:id?", async (req, res) => {
  try {
    // Extract query parameters, setting default page and limit if not provided
    const { price, ratings, type, availability, category, best_for, page = 1, limit = 10, sort } = req.query; 
    const productId = req.params.id;

    // Base query with joins for related tables
    let query = `
      SELECT 
        p.*, 
        pt.title AS type_title,  
        pm.title AS material_title,
        pc.title AS category_title, 
        psc.title AS sub_category_title,

        GROUP_CONCAT(DISTINCT clr.title) AS colors,
        GROUP_CONCAT(DISTINCT clr.id) AS color_ids,

        GROUP_CONCAT(DISTINCT tg.title) AS tags,   
        GROUP_CONCAT(DISTINCT tg.id) AS tag_ids,   

        GROUP_CONCAT(DISTINCT sz.title) AS sizes,  
        GROUP_CONCAT(DISTINCT sz.id) AS size_ids
      FROM ${TABLE.PRODUCTS_TABLE} p
      LEFT JOIN ${TABLE.PRODUCT_TYPE_TABLE} pt ON p.type_id = pt.id
      LEFT JOIN ${TABLE.PRODUCT_MATERIALS_TABLE} pm ON p.material_id = pm.id
      LEFT JOIN ${TABLE.PRODUCT_CATEGORY_TABLE} pc ON p.category_id = pc.id
      LEFT JOIN ${TABLE.PRODUCT_SUBCATEGORY_TABLE} psc ON p.subcategory_id = psc.id
      LEFT JOIN ${TABLE.PRODUCT_COLORS_ADDED} pca ON p.id = pca.product_id
      LEFT JOIN ${TABLE.PRODUCT_COLORS_TABLE} clr ON pca.color_id = clr.id
      LEFT JOIN ${TABLE.PRODUCT_TAG_ADDED_TABLE} pta ON p.id = pta.product_id
      LEFT JOIN ${TABLE.PRODUCT_TAG_TABLE} tg ON pta.tag_id = tg.id
      LEFT JOIN ${TABLE.PRODUCT_SIZE_ADDED} psa ON p.id = psa.product_id
      LEFT JOIN ${TABLE.PRODUCT_SIZE_TABLE} sz ON psa.size_id = sz.id
      LEFT JOIN ${TABLE.BESTFOR_PRODUCT_TABLE} bf ON p.id = bf.product_id
      WHERE p.status = 1
    `;

    const params = [];

    // If a specific product ID is provided, filter by it
    if (productId) {
      query += " AND p.id = ?";
      params.push(productId);
    }

    // Category filter (supports multiple categories)
    if (category) {
      //const categories = Array.isArray(category) ? category : [category];
      const categories = category.split(',').map(Number).filter(cat => !isNaN(cat));
      if (categories.length > 0) {
       // let categoryValue = categories.map(Number).filter((cat) => !isNaN(cat));
        // query += " AND (" + categories.map(() => "pc.title LIKE ?").join(" OR ") + ")";
        // params.push(...categories.map((cat) => `%${cat}%`));
        query += " AND p.category_id IN (" + categories.join(", ") + ")";
        //params.push(...categories);
      }
    }

    // Price filter (supports price ranges)
    if (price) {
      const priceRange = price.split("-");
      if (priceRange.length === 2) {
        const minPrice = parseFloat(priceRange[0]);
        const maxPrice = parseFloat(priceRange[1]);
        if (!isNaN(minPrice) && !isNaN(maxPrice)) {
          query += " AND p.amount BETWEEN ? AND ?";
          params.push(minPrice, maxPrice);
        }
      } else {
        // Handle predefined price cases
        switch (price) {
          case "under-200":
            query += " AND p.amount < 200";
            break;
          case "999-above":
            query += " AND p.amount >= 999";
            break;
          default:
            break;
        }
      }
    }

    // Ratings filter (handles multiple ratings)
    // if (ratings) {
    //   const ratingsArray = Array.isArray(ratings) ? ratings : [ratings];
    //   console.log('ratingsArray',ratingsArray);
      
    //   query += " AND p.ratings IN (" + ratingsArray.map(() => "?").join(",") + ")";
    //   params.push(...ratingsArray);
    // }

    if (ratings) {
      const ratingsArray = Array.isArray(ratings) ? ratings : [ratings];
      console.log('ratingsArray', ratingsArray);
    
      if (ratingsArray.length > 0) {
        const ratingConditions = ratingsArray.map(() => "(p.ratings >= ? AND p.ratings < ?)");
        query += " AND (" + ratingConditions.join(" OR ") + ")";
        ratingsArray.forEach(rating => {
          const lowerBound = parseFloat(rating);
          const upperBound = lowerBound + 0.9;
          params.push(lowerBound, upperBound);
        });
      }
    }

    // Best_for filter (handles comma-separated values)
    if (best_for) {
      const bestForArray = best_for.split(",");
      if (bestForArray.length > 0) {
        query += " AND bf.best_for_id IN (" + bestForArray.map(() => "?").join(",") + ")";
        params.push(...bestForArray);
      }
    }

    // Type filter
    if (type) {
      const types = type.split(',').map(Number).filter(cat => !isNaN(cat));
      if (types.length > 0) {
        query += " AND p.type_id IN (" + types.join(", ") + ")";
      }
    }

    // Availability filter (handle stock status)
    if (availability) {
      if (availability == "in_stock") {
        query += " AND p.stock_status ='in_stock' ";
      } else {
        query += " AND p.stock_status = 'out_of_stock'";
      }
    }

    // Group by product ID to avoid duplicate rows from joins
    query += " GROUP BY p.id";

    if(sort) {
      if(sort == 'h2l') {
        query += ` ORDER BY p.amount DESC `  
      }

      if(sort == 'l2h') {
        query += ` ORDER BY p.amount ASC `  
      }

      if(sort == 'latest') {
        query += ` ORDER BY p.id DESC `  
      }
      
    }else{
      query += ` ORDER BY p.id DESC `
    }
    // Pagination logic
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    query += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), offset);

    // Execute query with parameters
    console.log('Query:', formatQuery(query, [...params]));

    const [results] = await pool.query(query, params);
    console.log('results',results);

    // Return the response
    if (results.length > 0) {
      return res.status(200).json({
        data: results.map(product => ({
          ...product,
          colors: product.colors || '',          // Color titles
          color_ids: product.color_ids || '',    // Color IDs
          tags: product.tags || '',              // Tag titles
          tag_ids: product.tag_ids || '',        // Tag IDs
          sizes: product.sizes || '',            // Size titles
          size_ids: product.size_ids || '',      // Size IDs
        })),
        message: "Records Successfully Fetched",
        status: true,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalRecords: results.length
      });
    }

    // No records found case
    return res.status(404).json({ error: "Sorry, Records Not Found", status: false });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error", status: false });
  }
});


router.put("/:id", uploadProducts, multerErrorHandler, authMiddleware, async (req, res) => {
  try {
    const id = req.params.id;

    if (!id) {
      return res
        .status(400)
        .json({ error: "RowID must be required", status: false });
    }

    // Check if the product exists
    const [existingRecord] = await pool.query(
      `SELECT * FROM ${TABLE.PRODUCTS_TABLE} WHERE status = 1 and id = ?`,
      [id]
    );
    if (!existingRecord.length) {
      return res
        .status(404)
        .json({ error: "Sorry, Record Not Found", status: false });
    }

    const {
      title,
      description,
      short_description,
      amount,
      discount_amount,
      product_label,
      tags,
      colors,
      size,
      type_id,
      material_id,
      weight,
      stock_status,
    } = req.body;

    // Validate required fields
    if (
      !title ||
      !description ||
      !short_description ||
      !amount ||
      !discount_amount ||
      !product_label ||
      !tags ||
      !colors ||
      !size ||
      !type_id ||
      !material_id ||
      !weight ||
      !stock_status
    ) {
      return res.status(400).json({
        error:
          "Title, Description, Short Description, Amount, Discount Amount, Product Label, Tags, Colors, Sizes, Weight, Stock Status fields are required",
        status: false,
      });
    }

    // Validate that entered tags, colors, and sizes exist in the respective tables
    const validateExistence = async (tableName, column, ids) => {
      const idArray = ids.split(',');
      const placeholders = idArray.map(() => '?').join(',');
      const [rows] = await pool.query(`SELECT ${column} FROM ${tableName} WHERE ${column} IN (${placeholders})`, idArray);
      if (rows.length !== idArray.length) {
        return false; // Some IDs don't exist
      }
      return true;
    };

    const isTagsValid = await validateExistence(TABLE.PRODUCT_TAG_TABLE, 'id', tags);
    if (!isTagsValid) {
      return res.status(400).json({ error: "Invalid tags provided", status: false });
    }

    const isColorsValid = await validateExistence(TABLE.PRODUCT_COLORS_TABLE, 'id', colors);
    if (!isColorsValid) {
      return res.status(400).json({ error: "Invalid colors provided", status: false });
    }

    const isSizesValid = await validateExistence(TABLE.PRODUCT_SIZE_TABLE, 'id', size);
    if (!isSizesValid) {
      return res.status(400).json({ error: "Invalid sizes provided", status: false });
    }

    // Generate the base URL for images
    const baseUrl = req.protocol + "://" + req.get("host") + "/uploads/products/";
    const image_urls = req.files.map((file) => baseUrl + file.filename);

    const [image_url1, image_url2, image_url3, image_url4, image_url5] = [
      image_urls[0] || existingRecord[0].image_url1,
      image_urls[1] || existingRecord[0].image_url2,
      image_urls[2] || existingRecord[0].image_url3,
      image_urls[3] || existingRecord[0].image_url4,
      image_urls[4] || existingRecord[0].image_url5,
    ];

    // Update the product details
    await pool.query(
      `UPDATE ${TABLE.PRODUCTS_TABLE} SET 
        title = ?, description = ?, short_description = ?, amount = ?, discount_amount = ?, 
        product_label = ?, type_id = ?, material_id = ?, weight = ?, stock_status = ?, 
        image_url1 = ?, image_url2 = ?, image_url3 = ?, image_url4 = ?, image_url5 = ?, 
        updated_at = NOW() WHERE id = ?`,
      [
        title,
        description,
        short_description,
        amount,
        discount_amount,
        product_label,
        type_id,
        material_id,
        weight,
        stock_status,
        image_url1,
        image_url2,
        image_url3,
        image_url4,
        image_url5,
        id,
      ]
    );

    // Clear and update colors, tags, and sizes
    await pool.query(`DELETE FROM ${TABLE.PRODUCT_COLORS_ADDED} WHERE product_id = ?`, [id]);
    await pool.query(`DELETE FROM ${TABLE.PRODUCT_TAG_ADDED_TABLE} WHERE product_id = ?`, [id]);
    await pool.query(`DELETE FROM ${TABLE.PRODUCT_SIZE_ADDED} WHERE product_id = ?`, [id]);

    const tagArray = tags.split(',');
    const colorArray = colors.split(',');
    const sizeArray = size.split(',');

    // Insert updated tags
    const tagInsertPromises = tagArray.map(tag_id => {
      return pool.query(
        `INSERT INTO ${TABLE.PRODUCT_TAG_ADDED_TABLE} (product_id, tag_id) VALUES (?, ?)`,
        [id, tag_id.trim()]
      );
    });
    await Promise.all(tagInsertPromises);

    // Insert updated colors
    const colorInsertPromises = colorArray.map(color_id => {
      return pool.query(
        `INSERT INTO ${TABLE.PRODUCT_COLORS_ADDED} (product_id, color_id) VALUES (?, ?)`,
        [id, color_id.trim()]
      );
    });
    await Promise.all(colorInsertPromises);

    // Insert updated sizes
    const sizeInsertPromises = sizeArray.map(size_id => {
      return pool.query(
        `INSERT INTO ${TABLE.PRODUCT_SIZE_ADDED} (product_id, size_id) VALUES (?, ?)`,
        [id, size_id.trim()]
      );
    });
    await Promise.all(sizeInsertPromises);

    return res
      .status(200)
      .json({ message: "Record Successfully Updated", status: true });
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
          `SELECT * FROM ${TABLE.PRODUCTS_TABLE} WHERE status = 1 and id = ?`,
          [deletedId]
        );
      })
    );

    const query = `UPDATE ${TABLE.PRODUCTS_TABLE} SET status = 0, deleted_at = NOW() WHERE id IN (?)`;

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
