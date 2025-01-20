// src/routes/blogRoutes.js
const express = require('express');
const TABLE = require('../utils/tables')
const pool = require('../utils/db');
const router = express.Router();
const { uploadBlogs } = require('../utils/multerConfig');
const authMiddleware = require('../utils/authMiddleware');
const {multerErrorHandler} = require('../utils/common');

// Add
router.post('/', uploadBlogs,multerErrorHandler, authMiddleware, async (req, res) => {
    try {

        const { category_id, title, short_description, description, tags, blog_date, author } = req.body;

        if (!category_id || !title || !short_description || !description) {
            return res.status(400).json({ error: 'Category, Title, Short Description, Description and Blog Date fields are required', status: false });
        }
        const [existingRecord] = await pool.query(`SELECT * FROM ${TABLE.BLOGS_TABLE} WHERE status = 1 and title = ?`, [title]);
        if (existingRecord.length) {
            return res.status(400).json({ error: 'Record already exists', status: false });
        }

       // Generate the base URL for images
       const baseUrl = req.protocol + '://' + req.get('host') + '/uploads/blogs/';
       const image_urls = req.files.map(file => baseUrl + file.filename);
        const image_url = image_urls.length > 0 ? image_urls[0] : '';

       
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(blog_date) || isNaN(new Date(blog_date).getTime())) {
              return res.status(400).json({ error: 'Invalid date format. Please use YYYY-MM-DD.', status: false });
          }

        const [result] = await pool.query(`INSERT INTO ${TABLE.BLOGS_TABLE} (category_id, title, image_url, short_description, description, blog_date,author) VALUES (?, ?, ?, ?, ?, ?, ?)`, [category_id, title, image_url, short_description, description, blog_date, author]);
        const blog_id = result.insertId;

        if (tags) {
            const tagArray = tags.split(',');
            const tagInsertPromises = tagArray.map(tag_id => {
                return pool.query(`INSERT INTO ${TABLE.BLOG_TAGS_ADDED_TABLE} (blog_id, tag_id) VALUES (?, ?)`, [blog_id, tag_id.trim()]);
            });
            await Promise.all(tagInsertPromises);
        }

        return res.status(201).json({ message: 'Record Successfully Created', status: true });

    } catch (error) {
        return res.status(500).json({ error: 'Server error', status: false });
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
        

        let query = `SELECT b.*, bc.title as blog_category_title FROM ${TABLE.BLOGS_TABLE} as b LEFT JOIN ${TABLE.BLOG_CATEGORY_TABLE} as bc on bc.id = b.category_id WHERE b.status = 1`;

        const queryParams = [];

        if (id) {
            query += ' AND b.id = ?';
            queryParams.push(id);
        }

        query += ` ORDER BY b.id DESC LIMIT ? OFFSET ?`;
        queryParams.push(parsedLimit, offset); 

        const [blogs] = await pool.query(query, queryParams);
        if (blogs.length === 0) {
            return res.status(404).json({ message: 'Sorry, Record not found', status: false });
        }

        const blogIds = blogs.map(blog => blog.id);

        const [comments] = await pool.query(`SELECT bc.*, u.first_name, u.last_name, u.avatar FROM ${TABLE.BLOG_COMMENTS_TABLE} as bc LEFT JOIN ${TABLE.USERS_TABLE} as u on u.id = bc.user_id WHERE bc.blog_id IN (?) AND bc.status = 1`, [blogIds]);

        const [tags] = await pool.query(`SELECT bta.blog_id, t.title FROM ${TABLE.BLOG_TAGS_ADDED_TABLE} as bta LEFT JOIN ${TABLE.BLOG_TAGS_TABLE} as t on t.id = bta.tag_id WHERE bta.blog_id IN (?)`, [blogIds]);

        const blogsWithDetails = blogs.map(blog => {
            blog.comments = comments.filter(comment => comment.blog_id === blog.id).map(comment => ({
                id: comment.id,
                blog_id: comment.blog_id,
                user_id: comment.user_id,
                comment: comment.comment,
                created_at: comment.created_at,
                updated_at: comment.updated_at,
                user_first_name: comment.first_name,
                user_last_name: comment.last_name,
                user_avatar: comment.avatar
            }));
            blog.tags = tags.filter(tag => tag.blog_id === blog.id).map(tag => tag.title);
            return blog;
        });

        return res.status(200).json({ data: id ? blogsWithDetails[0] : blogsWithDetails, message: "Record Successfully Fetched", status: true, count: blogs.length });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Server error', status: false });
    }
});





// Update
router.put('/:id', uploadBlogs,multerErrorHandler, authMiddleware, async (req, res) => {
    try {

        const id = req.params.id;

        if (!id) {
            return res.status(400).json({ error: 'RowID must be required', status: false });
        }

        const [existingRecord] = await pool.query(`SELECT * FROM ${TABLE.BLOGS_TABLE} WHERE status = 1 and id = ?`, [id]);
        if (!existingRecord.length) {
            return res.status(404).json({ error: "Sorry, Record Not Found", status: false });
        }

        const { category_id, title, short_description, description, tags, blog_date, author } = req.body;

        if (!category_id || !title || !short_description || !description) {
            return res.status(400).json({ error: 'Category, Title, Short Description, Description and Blog Date fields are required', status: false });
        }
        const [existingTitle] = await pool.query(`SELECT * FROM ${TABLE.BLOGS_TABLE} WHERE status = 1 and title = ?`, [title]);
        if (existingTitle.length) {
            return res.status(400).json({ error: 'Record already exists', status: false });
        }

        
        // Generate the base URL for images
        const baseUrl = req.protocol + '://' + req.get('host') + '/uploads/blogs/';
        req.files.forEach(file => {
            if (file.fieldname === 'image_url') {
                image_url = baseUrl + file.filename;
            }
        });



        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(blog_date) || isNaN(new Date(blog_date).getTime())) {
              return res.status(400).json({ error: 'Invalid date format. Please use YYYY-MM-DD.', status: false });
          }

        await pool.query(`DELETE FROM ${TABLE.BLOG_TAGS_ADDED_TABLE} WHERE blog_id = ?`, [id]);

        if (tags) {
            const tagArray = tags.split(',');
            const tagInsertPromises = tagArray.map(tag_id => {
                return pool.query(`INSERT INTO ${TABLE.BLOG_TAGS_ADDED_TABLE} (blog_id, tag_id) VALUES (?, ?)`, [id, tag_id.trim()]);
            });
            await Promise.all(tagInsertPromises);
        }

        await pool.query(`UPDATE ${TABLE.BLOGS_TABLE} SET category_id = ?, title = ?, image_url = ?, short_description = ?, blog_date = ?, description = ?, author = ?, updated_at = NOW() WHERE id = ?`, [category_id, title, image_url, short_description, blog_date, description,author, id]);

        return res.status(200).json({ message: "Record Successfully Updated", status: true });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: 'Server error', status: false });
    }
});

// Delete
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const idParam = req.params.id;

        const deletedIds = idParam ? idParam.split(',') : [];

        if (!deletedIds || deletedIds.length === 0) {
            return res.status(400).json({ error: 'RowID must be required', status: false });
        }

        await Promise.all(deletedIds.map(async (deletedId) => {
            await pool.query(`SELECT * FROM ${TABLE.BLOGS_TABLE} WHERE status = 1 and id = ?`, [deletedId]);
        }));

        const query = `UPDATE ${TABLE.BLOGS_TABLE} SET status = 0, deleted_at = NOW() WHERE id IN (?)`;

        const [results] = await pool.query(query, [deletedIds]);
        if (results.affectedRows > 0) {
            return res.status(200).json({ message: "Record Successfully Deleted", status: true });
        }
        return res.status(404).json({ error: "Sorry, Record Not Found", status: false });
    } catch (error) {
        return res.status(500).json({ error: 'Server error', status: false });
    }
});

module.exports = router;