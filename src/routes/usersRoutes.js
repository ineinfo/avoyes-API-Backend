// src/routes/userRoutes.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const TABLE = require('../utils/tables')
const pool = require('../utils/db');
const { checkEmailExistOrNot, checkPhoneExistOrNot, validatePassword, generateOTP,validateEmail,multerErrorHandler } = require('../utils/common');
const router = express.Router();
const { uploadUsers } = require('../utils/multerConfig');
const authMiddleware = require('../utils/authMiddleware');

const API_SECRET_KEY = process.env.API_SECRET_KEY;
const API_TOKEN_EXPIRESIN = process.env.API_TOKEN_EXPIRESIN;





// Login (Admin)
router.post('/adminlogin', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and Password field must be required', status: false });
        }

        const [rows] = await pool.query(`SELECT * FROM ${TABLE.USERS_TABLE} WHERE email = ? AND status != 0 AND role_id = 1`, [email]);
        if (rows.length > 0) {
            const user = rows[0];

            const storedHashedPassword = user.password;
            const passwordMatch = await bcrypt.compare(password, storedHashedPassword);

            if (passwordMatch) {
                const token = jwt.sign({ data: user }, API_SECRET_KEY, { expiresIn: API_TOKEN_EXPIRESIN });
                return res.status(200).json({ accessToken: token, user, message: 'Login Successfully', status: true });
            } else {
                return res.status(401).json({ error: 'Invalid User ID or Password', status: false });
            }
        }

        return res.status(404).json({ error: 'User ID does not exist or is inactive', status: false });

    } catch (error) {
        return res.status(500).json({ error: `Error occurred: ${error.message}`, status: false });
    }
});

// Verify Token (Admin)
router.get('/admin-verifytoken', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(400).json({ error: 'Token is required', status: false });
        }

        jwt.verify(token, API_SECRET_KEY, async (err, decoded) => {
            if (err) {
                return res.status(401).json({ error: 'Invalid or expired token', status: false });
            }

            const [result] = await pool.query(`SELECT * FROM ${TABLE.USERS_TABLE} WHERE id = ?`, [decoded.data.id]);

            if (result.length === 0) {
                return res.status(404).json({ error: 'User not found', status: false });
            }

            const user = result[0];

            return res.status(200).json({
                data: {
                    ...user,
                    accessToken: token,
                },
                message: 'Token is valid',
                status: true
            });
        });
    } catch (error) {
        return res.status(500).json({ error: `Error occurred: ${error.message}`, status: false });
    }
});

// Register (Frontend)
router.post('/', uploadUsers,multerErrorHandler, async (req, res) => {
    try {
        const { first_name, last_name, email, phone, password } = req.body;

        if (!first_name || !last_name || !email || !phone || !password) {
            return res.status(400).json({ error: 'First Name, Last Name, Email, Phone and Password fields are required', status: false });
        }

        const mobileRegex = /^[0-9]{10}$/;
        if (!mobileRegex.test(phone)) {
            return res.status(400).json({ error: 'Phone number must be 10 digits', status: false });
        }

        if (!validateEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format. Please enter a valid email like xyz@gmail.com', status: false });
        }

        // Email Validation
        if (email) {
            const emailExists = await checkEmailExistOrNot(TABLE.USERS_TABLE, email);
            if (emailExists) {
                return res.status(409).json({ error: 'Email already exists', status: false });
            }
        }

        // Phone Validation
        if (phone) {
            const phoneExists = await checkPhoneExistOrNot(TABLE.USERS_TABLE, phone);
            if (phoneExists) {
                return res.status(409).json({ error: 'Phone number already exists', status: false });
            }
        }

        // Password Validation
        if (!validatePassword(password)) {
            return res.status(400).json({ error: 'Password must be at least 9 characters long and contain at least one uppercase letter, one lowercase letter, and one special character.', status: false });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);


        await pool.query(`INSERT INTO ${TABLE.USERS_TABLE} (role_id, first_name, last_name, email, phone, password) VALUES (?,?,?,?,?,?)`, [2, first_name, last_name, email, phone, hashedPassword]);

        return res.status(201).json({ message: 'Record Successfully Created', status: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Server error', status: false });
    }
});

// Login (Frontend)
router.post('/frontlogin', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and Password field must be required', status: false });
        }

        const [rows] = await pool.query(`SELECT * FROM ${TABLE.USERS_TABLE} WHERE email = ? AND status = 1 AND role_id = 2`, [email]);
        if (rows.length > 0) {
            const user = rows[0];

            const storedHashedPassword = user.password;
            const passwordMatch = await bcrypt.compare(password, storedHashedPassword);

            if (passwordMatch) {
                const token = jwt.sign({ data: user }, API_SECRET_KEY, { expiresIn: API_TOKEN_EXPIRESIN });
                return res.status(200).json({ accessToken: token, user, message: 'Login Successfully', status: true });
            } else {
                return res.status(401).json({ error: 'Invalid User ID or Password', status: false });
            }
        }

        return res.status(404).json({ error: 'User ID does not exist or is inactive', status: false });

    } catch (error) {
        return res.status(500).json({ error: `Error occurred: ${error.message}`, status: false });
    }
});

router.put('/changepassword', authMiddleware, async (req, res) => {
    try {
        const userId = req.user_id; 
        console.log('User ID from JWT:', userId); 

        if (!userId) {
            return res.status(400).json({ error: 'User ID must be provided', status: false });
        }

        const [existingRecordResults] = await pool.query(`SELECT * FROM ${TABLE.USERS_TABLE} WHERE status = 1 AND id = ?`, [userId]);
        console.log('Existing Record Results:', existingRecordResults);

        if (existingRecordResults.length === 0) {
            return res.status(404).json({ error: "Sorry, Record Not Found", status: false });
        }

        const { current_password, new_password, confirm_password } = req.body;

        // Field Validation
        if (typeof current_password !== 'string' || typeof new_password !== 'string' || typeof confirm_password !== 'string') {
            return res.status(400).json({ error: "All fields must be strings", status: false });
        }

        if (!current_password || !new_password || !confirm_password) {
            return res.status(400).json({ error: "All fields are required", status: false });
        }

        // Validate the current password
        const isCurrentPasswordValid = await bcrypt.compare(current_password, existingRecordResults[0].password);

        if (!isCurrentPasswordValid) {
            return res.status(401).json({ error: "Current Password is Incorrect", status: false });
        }

        // Password Validation
        if (!validatePassword(new_password)) {
            return res.status(400).json({ error: "New Password must meet the required criteria.", status: false });
        }

        if (new_password !== confirm_password) {
            return res.status(400).json({ error: "New Password and Confirm Password do not match.", status: false });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(new_password, 10);

        await pool.query(`UPDATE ${TABLE.USERS_TABLE} SET password = ?, updated_at = NOW() WHERE id = ?`, [hashedPassword, userId]);

        return res.status(200).json({ message: "Password Successfully Updated", status: true });

    } catch (error) {
        console.log('Error in changepassword:', error);
        return res.status(500).json({ error: 'Server error', status: false });
    }
});


// All List & Specific List (Frontend | Admin)
router.get('/:id?', authMiddleware, async (req, res) => {
    try {
        const id = req.params.id;
        const { page = 1, limit = 10 } = req.body;
        const parsedPage = parseInt(page);
        const parsedLimit = parseInt(limit) > 0 ? parseInt(limit) : 10;
        const offset = (parsedPage - 1) * parsedLimit;

        if (id) {
            const [results] = await pool.query(`SELECT * FROM ${TABLE.USERS_TABLE} WHERE status = 1 and id = ?`, [id]);
            if (results.length > 0) {
                return res.status(200).json({ data: results[0], message: "Record Successfully Fetched", status: true });
            }
            return res.status(404).json({ error: "Sorry, Record Not Found", status: false });
        }

        const [results] = await pool.query(`SELECT * FROM ${TABLE.USERS_TABLE} WHERE status = 1 ORDER BY ID DESC LIMIT ?, ?`, [offset, parsedLimit]);
        return res.status(200).json({ data: results, message: "Record Successfully Fetched", status: true, count: results.length });
    } catch (error) {
        return res.status(500).json({ error: 'Server error', status: false });
    }
});

// Forgot Password (Frontend)
router.put('/forgotpassword', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email field is required', status: false });
        }

        const [existingRecord] = await pool.query(`SELECT * FROM ${TABLE.USERS_TABLE} WHERE email = ?`, [email]);
        if (existingRecord.length === 0) {
            return res.status(404).json({ error: "Email not found", status: false });
        }

        const otp = generateOTP(6);
        await pool.query(`UPDATE ${TABLE.USERS_TABLE} SET otp = ?, updated_at = NOW() WHERE email = ?`, [otp, email]);

        return res.status(200).json({ message: "OTP has been sent to your email", status: true });

    } catch (error) {
        return res.status(500).json({ error: 'Server error', status: false });
    }
});

// OTP (Frontend)
router.post('/otp', async (req, res) => {
    try {
        const { email, otp } = req.body;

        var otpconvert = parseInt(otp, 10);

        if (!email || !otpconvert) {
            return res.status(400).json({ error: 'Email or OTP fields are required', status: false });
        }

        const [existingRecordResults] = await pool.query(`SELECT * FROM ${TABLE.USERS_TABLE} WHERE email = ?`, [email]);
        if (existingRecordResults.length === 0) {
            return res.status(404).json({ error: 'Something went wrong! Data does not match.', status: false });
        }

        const existingRecord = existingRecordResults[0];

        if (existingRecord.otp !== otpconvert) {
            return res.status(400).json({ error: 'Sorry, OTP is Invalid', status: false });
        }

        await pool.query(`UPDATE ${TABLE.USERS_TABLE} SET otp = NULL, updated_at = NOW() WHERE email = ?`, [email]);

        const [updatedRecordResults] = await pool.query(`SELECT * FROM ${TABLE.USERS_TABLE} WHERE email = ?`, [email]);
        const updatedRecord = updatedRecordResults[0];

        return res.status(200).json({ paramsID: updatedRecord.id, message: 'OTP verified successfully', status: true });

    } catch (error) {
        return res.status(500).json({ error: 'Server error', status: false });
    }
});

// New Password (Frontend)
router.post('/newpassword', async (req, res) => {
    try {
        const { email, new_password, confirm_password } = req.body;

        const [existingRecord] = await pool.query(`SELECT * FROM ${TABLE.USERS_TABLE} WHERE email = ?`, [email]);
        if (!existingRecord) {
            return res.status(404).json({ error: "Email not found", status: false });
        }

        if (!new_password || !confirm_password) {
            return res.status(400).json({ error: "New Password and Confirm Password fields are required", status: false });
        }

        if (!validatePassword(new_password)) {
            return res.status(400).json({ error: "New Password must be at least 9 characters long and contain at least one uppercase letter, one lowercase letter, and one special character.", status: false });
        }
        if (new_password !== confirm_password) {
            return res.status(400).json({ error: "New Password and Confirm Password do not match.", status: false });
        }

        const hashedPassword = await bcrypt.hash(new_password, 10);

        const [updateResult] = await pool.query(`UPDATE ${TABLE.USERS_TABLE} SET password = ?, updated_at = NOW() WHERE email = ?`, [hashedPassword, email]);

        if (updateResult.affectedRows === 0) {
            return res.status(400).json({ error: "Something Went Wrong!", status: false });
        }

        return res.status(200).json({ message: "Password Successfully Updated", status: true });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: 'Server error', status: false });
    }
});

// Update (Frontend | Admin)
// router.put('/:id', authMiddleware, uploadUsers,multerErrorHandler, async (req, res) => {
//     try {
//         const id = req.params.id;

//         if (!id) {
//             return res.status(400).json({ error: 'RowID must be required', status: false });
//         }

//         const [existingRecord] = await pool.query(`SELECT * FROM ${TABLE.USERS_TABLE} WHERE status = 1 and id = ?`, [id]);
//         if (!existingRecord.length) {
//             return res.status(404).json({ error: "Sorry, Record Not Found", status: false });
//         }

//         const { first_name, last_name, email, phone, gender } = req.body;

//         if (!first_name || !last_name || !email || !phone) {
//             return res.status(400).json({ error: 'First Name, Last Name, Email and Phone field is required', status: false });
//         }

//         const mobileRegex = /^[0-9]{10}$/;
//         if (!mobileRegex.test(phone)) {
//             return res.status(400).json({ error: 'Phone number must be 10 digits', status: false });
//         }

//         // Email Validation
//         if (email) {
//             const emailExists = await checkEmailExistOrNot(TABLE.USERS_TABLE, email, id);
//             if (emailExists) {
//                 return res.status(409).json({ error: 'Email already exists', status: false });
//             }
//         }

//         // Phone Validation
//         if (phone) {
//             const phoneExists = await checkPhoneExistOrNot(TABLE.USERS_TABLE, phone, id);
//             if (phoneExists) {
//                 return res.status(409).json({ error: 'Phone number already exists', status: false });
//             }
//         }

//         let avatar = '';
//         const baseUrl = req.protocol + '://' + req.get('host') + '/uploads/users/';
//         if (req.files && req.files.length > 0) {
//             const image_urls = req.files.map(file => baseUrl + file.filename);
//             avatar = image_urls.length > 0 ? image_urls[0] : '';
//         }

//         let updateQuery = `UPDATE ${TABLE.USERS_TABLE} SET first_name = ?, last_name = ?, email = ?, phone = ?, avatar = ?, gender = ?, updated_at = NOW()`;
//         let queryParams = [first_name, last_name, email, phone, avatar, gender];

//         updateQuery += ` WHERE id = ?`;
//         queryParams.push(id);

//         await pool.query(updateQuery, queryParams);

//         return res.status(200).json({ message: "Record Successfully Updated", status: true });

//     } catch (error) {
//         return res.status(500).json({ error: 'Server error', status: false });
//     }
// });



router.put('/:id', authMiddleware, uploadUsers, multerErrorHandler, async (req, res) => {
    try {
        const id = req.params.id;

        if (!id) {
            return res.status(400).json({ error: 'RowID must be required', status: false });
        }

        const [existingRecord] = await pool.query(`SELECT * FROM ${TABLE.USERS_TABLE} WHERE status = 1 and id = ?`, [id]);
        if (!existingRecord.length) {
            return res.status(404).json({ error: "Sorry, Record Not Found", status: false });
        }

        const { first_name, last_name, email, phone, gender } = req.body;

        if (!first_name || !last_name || !email || !phone) {
            return res.status(400).json({ error: 'First Name, Last Name, Email and Phone field is required', status: false });
        }

        const mobileRegex = /^[0-9]{10}$/;
        if (!mobileRegex.test(phone)) {
            return res.status(400).json({ error: 'Phone number must be 10 digits', status: false });
        }

        // Email Validation
        if (email) {
            const emailExists = await checkEmailExistOrNot(TABLE.USERS_TABLE, email, id);
            if (emailExists) {
                return res.status(409).json({ error: 'Email already exists', status: false });
            }
        }

        // Phone Validation
        if (phone) {
            const phoneExists = await checkPhoneExistOrNot(TABLE.USERS_TABLE, phone, id);
            if (phoneExists) {
                return res.status(409).json({ error: 'Phone number already exists', status: false });
            }
        }

        let avatar = existingRecord[0].avatar; // Default to existing avatar
        const baseUrl = req.protocol + '://' + req.get('host') + '/uploads/users/';
        if (req.files && req.files.length > 0) {
            const image_urls = req.files.map(file => baseUrl + file.filename);
            avatar = image_urls.length > 0 ? image_urls[0] : avatar; // Only update if a new image is provided
        }

        let updateQuery = `UPDATE ${TABLE.USERS_TABLE} SET first_name = ?, last_name = ?, email = ?, phone = ?, avatar = ?, gender = ?, updated_at = NOW()`;
        let queryParams = [first_name, last_name, email, phone, avatar, gender];

        updateQuery += ` WHERE id = ?`;
        queryParams.push(id);

        await pool.query(updateQuery, queryParams);

        return res.status(200).json({ message: "Record Successfully Updated", status: true });

    } catch (error) {
        return res.status(500).json({ error: 'Server error', status: false });
    }
});



// Delete (Admin)
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const idParam = req.params.id;

        const deletedIds = idParam ? idParam.split(',') : [];

        if (!deletedIds || deletedIds.length === 0) {
            return res.status(400).json({ error: 'RowID must be required', status: false });
        }

        await Promise.all(deletedIds.map(async (deletedId) => {
            await pool.query(`SELECT * FROM ${TABLE.USERS_TABLE} WHERE status = 1 and id = ?`, [deletedId]);
        }));

        const query = `UPDATE ${TABLE.USERS_TABLE} SET status = 0, deleted_at = NOW() WHERE id IN (?)`;

        const [results] = await pool.query(query, [deletedIds]);
        if (results.affectedRows > 0) {
            return res.status(200).json({ message: "Record Successfully Deleted", status: true });
        }
        return res.status(404).json({ error: "Sorry, Record Not Found", status: false });
    } catch (error) {
        return res.status(500).json({ error: 'Server error', status: false });
    }
});

// Change Password (Frontend | Admin)
// router.put('/changepassword/:id', authMiddleware, async (req, res) => {
//     try {

//         const userId = req.user_id; 
//         console.log('User ID from JWT:', userId); 

//         if (!userId) {
//             return res.status(400).json({ error: 'User ID must be provided', status: false });
//         }

//         const [existingRecordResults] = await pool.query(`SELECT * FROM ${TABLE.USERS_TABLE} WHERE status = 1 AND id = ?`, [userId]);
//         console.log('Existing Record Results:', existingRecordResults);

//         if (existingRecordResults.length === 0) {
//             return res.status(404).json({ error: "Sorry, Record Not Found", status: false });
//         }


//         const { current_password, new_password, confirm_password } = req.body;

//         // Field Validation
//         if (typeof current_password !== 'string' || typeof new_password !== 'string' || typeof confirm_password !== 'string') {
//             return res.status(400).json({ error: "All fields must be strings", status: false });
//         }

//         if (!current_password || !new_password || !confirm_password) {
//             return res.status(400).json({ error: "Current Password, New Password, and Confirm Password fields are required", status: false });
//         }

//         // Ensure password field exists and is a string
//         if (!existingRecordResults[0].password || typeof existingRecordResults[0].password !== 'string') {
//             return res.status(500).json({ error: "Sorry, Invalid password format", status: false });
//         }

//         // Validate the current password
//         const isCurrentPasswordValid = await bcrypt.compare(current_password, existingRecordResults[0].password);

//         if (!isCurrentPasswordValid) {
//             return res.status(401).json({ error: "Current Password is Incorrect", status: false });
//         }

//         // Password Validation
//         if (!validatePassword(new_password)) {
//             return res.status(400).json({ error: "New Password must be at least 9 characters long and contain at least one uppercase letter, one lowercase letter, and one special character.", status: false });
//         }

//         if (new_password !== confirm_password) {
//             return res.status(400).json({ error: "New Password and Confirm Password do not match.", status: false });
//         }

//         // Hash the new password
//         const hashedPassword = await bcrypt.hash(new_password, 10);

//         await pool.query(`UPDATE ${TABLE.USERS_TABLE} SET password = ?, updated_at = NOW() WHERE id = ?`, [hashedPassword, userId]);

//         return res.status(200).json({ message: "Record Successfully Updated", status: true });

//     } catch (error) {
//         console.log(error)
//         return res.status(500).json({ error: 'Server error', status: false });
//     }
// });


// // Change Password (Frontend | Admin)--token ma update thay che pan koi bhi id thi 
// router.put('/changepassword/:id', authMiddleware, async (req, res) => {
//     try {
//         const userId = req.user_id; 
//         console.log('User ID from JWT:', userId); 

//         const [existingRecordResults] = await pool.query(`SELECT * FROM ${TABLE.USERS_TABLE} WHERE status = 1 AND id = ?`, [userId]);
        
//         console.log('Existing Record Results:', existingRecordResults);
//         if (existingRecordResults.length === 0) {
//             return res.status(404).json({ error: "Sorry, Record Not Found", status: false });
//         }

//         const { current_password, new_password, confirm_password } = req.body;
        
//         if (!current_password || !new_password || !confirm_password) {
//             return res.status(400).json({ error: "All fields are required", status: false });
//         }

//         const existingPassword = existingRecordResults[0].password;
//         const isCurrentPasswordValid = await bcrypt.compare(current_password, existingPassword);
        
//         console.log('Is current password valid:', isCurrentPasswordValid);
//         if (!isCurrentPasswordValid) {
//             return res.status(401).json({ error: "Current Password is Incorrect", status: false });
//         }

//         if (!validatePassword(new_password)) {
//             return res.status(400).json({ error: "New Password must meet requirements", status: false });
//         }

//         if (new_password !== confirm_password) {
//             return res.status(400).json({ error: "New Password and Confirm Password do not match.", status: false });
//         }

//         const hashedPassword = await bcrypt.hash(new_password, 10);
//         await pool.query(`UPDATE ${TABLE.USERS_TABLE} SET password = ?, updated_at = NOW() WHERE id = ?`, [hashedPassword, userId]);

//         return res.status(200).json({ message: "Password Successfully Updated", status: true });

//     } catch (error) {
//         console.error('Error in changepassword:', error);
//         return res.status(500).json({ error: 'Server error', status: false });
//     }
// });




module.exports = router;