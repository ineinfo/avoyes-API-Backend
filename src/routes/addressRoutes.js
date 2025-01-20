// src/routes/addressRoutes.js
const express = require('express');
const TABLE = require('../utils/tables')
const pool = require('../utils/db');
const { checkEmailExistOrNot, checkPhoneExistOrNot,validateEmail, isRoleAdmin, isRoleUser } = require('../utils/common')
const router = express.Router();
const authMiddleware = require('../utils/authMiddleware');

// Add
// router.post('/', async (req, res) => {
//     try {

//         const { user_id, first_name, last_name, email, phone, address1, country, state, city, landmark, pincode, is_default, a_type } = req.body;

//         if (!first_name || !last_name || !email || !phone || !address1) {
//             res.status(400).json({ error: 'First Name, Last Name, Email, Phone and Address fields are required', status: false });
//         }
//         const [existingUser] = await pool.query(`SELECT * FROM ${TABLE.USERS_TABLE} WHERE id = ?`, [user_id]);
// console.log("User Check Query Result:", existingUser);


//         const mobileRegex = /^[0-9]{10}$/;
//         if (!mobileRegex.test(phone)) {
//             return res.status(400).json({ error: 'Phone number must be 10 digits', status: false });
//         }

//         const [existingRecord] = await pool.query(`SELECT * FROM ${TABLE.ADDRESS_TABLE} WHERE status = 1 and id = ?`, [user_id]);
//         if (!existingRecord.length) {
//             return res.status(404).json({ error: "Sorry, User Not Found", status: false });
//         }

//         const [existingTitle] = await pool.query(`SELECT * FROM ${TABLE.ADDRESS_TABLE} WHERE status = 1 and address1 = ?`, [address1]);
//         if (existingTitle.length) {
//             return res.status(400).json({ error: 'Record already exists', status: false });
//         }

//         if (is_default) {
//             await pool.query(`UPDATE ${TABLE.ADDRESS_TABLE} SET is_default = 0 WHERE user_id = ?`, [user_id]);
//         }

        
//         if (!validateEmail(email)) {
//             return res.status(400).json({ error: 'Invalid email format. Please enter a valid email like xyz@gmail.com', status: false });
//         }

//         // Email Validation
//         if (email) {
//             const emailExists = await checkEmailExistOrNot(TABLE.ADDRESS_TABLE, email);
//             if (emailExists) {
//                 return res.status(409).json({ error: 'Email already exists', status: false });
//             }
//         }

//         // Phone Validation
//         if (phone) {
//             const phoneExists = await checkPhoneExistOrNot(TABLE.ADDRESS_TABLE, phone);
//             if (phoneExists) {
//                 return res.status(409).json({ error: 'Phone number already exists', status: false });
//             }
//         }

//         await pool.query(`INSERT INTO ${TABLE.ADDRESS_TABLE} (user_id, first_name, last_name, email, phone, address1, country, state, city, landmark, pincode, is_default, a_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [user_id, first_name, last_name, email, phone, address1, country, state, city, landmark, pincode, is_default, a_type]);

//         return res.status(201).json({ message: 'Record Successfully Created', status: true });

//     } catch (error) {
//         console.log(error)
//         return res.status(500).json({ error: 'Server error', status: false });
//     }
// });

//ae user id same address validation karvu che k nai em 
router.post('/', async (req, res) => {
    try {
        const {
            user_id,
            first_name,
            last_name,
            email,
            phone,
            address1,
            country,
            state,
            city,
            pincode,
            is_default,
            a_type
        } = req.body;

        // Validate required fields
        if (!first_name || !last_name || !email || !phone || !address1) {
            return res.status(400).json({ error: 'First Name, Last Name, Email, Phone and Address fields are required', status: false });
        }

        // Validate phone number format
        const mobileRegex = /^[0-9]{10}$/;
        if (!mobileRegex.test(phone)) {
            return res.status(400).json({ error: 'Phone number must be 10 digits', status: false });
        }

        // Check if the user exists
        const [existingUser] = await pool.query(`SELECT * FROM ${TABLE.USERS_TABLE} WHERE id = ?`, [user_id]);
        console.log("User Check Query Result:", existingUser);
        if (!existingUser.length) {
            return res.status(404).json({ error: "Sorry, User Not Found", status: false });
        }

       // Check if the address already exists for the given user_id
const [existingTitle] = await pool.query(`
    SELECT * FROM ${TABLE.ADDRESS_TABLE} 
    WHERE status = 1 AND address1 = ? AND user_id = ?`, [address1, user_id]);

if (existingTitle.length) {
    return res.status(400).json({ error: 'Address already exists for this user', status: false });
}


        // Update default address if applicable
        if (is_default) {
            await pool.query(`UPDATE ${TABLE.ADDRESS_TABLE} SET is_default = 0 WHERE user_id = ?`, [user_id]);
        }

        // Validate email format
        if (!validateEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format. Please enter a valid email like xyz@gmail.com', status: false });
        }

        // // Check if email already exists
        // const emailExists = await checkEmailExistOrNot(TABLE.ADDRESS_TABLE, email);
        // if (emailExists) {
        //     return res.status(409).json({ error: 'Email already exists', status: false });
        // }

        // // Check if phone already exists
        // const phoneExists = await checkPhoneExistOrNot(TABLE.ADDRESS_TABLE, phone);
        // if (phoneExists) {
        //     return res.status(409).json({ error: 'Phone number already exists', status: false });
        // }

        // Insert new address
        const [result ] = await pool.query(`INSERT INTO ${TABLE.ADDRESS_TABLE} (user_id, first_name, last_name, email, phone, address1, country, state, city, pincode, is_default, a_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            user_id, first_name, last_name, email, phone, address1, country, state, city, pincode, is_default, a_type
        ]);

        return res.status(201).json({ message: 'Record Successfully Created', status: true, addressId:result.insertId });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Server error', status: false });
    }
});




// // All List & Specific List
// router.get('/:id?', authMiddleware, async (req, res) => {
//     try {

//         const id = req.params.id;
//         const { user_id } = req.body;
//         const { page = 1, limit = 10 } = req.body;
//         const parsedPage = parseInt(page);
//         const parsedLimit = parseInt(limit) > 0 ? parseInt(limit) : 10;
//         const offset = (parsedPage - 1) * parsedLimit;

//         if (id) {
//             const [results] = await pool.query(`SELECT * FROM ${TABLE.ADDRESS_TABLE} WHERE status = 1 and id = ?`, [id]);
//             if (results.length > 0) {
//                 return res.status(200).json({ data: results[0], message: "Record Successfully Fetched", status: true });
//             }
//             return res.status(404).json({ error: "Sorry, Record Not Found", status: false });
//         }

//         let results;
//         if (user_id) {
//             [results] = await pool.query(`SELECT * FROM ${TABLE.ADDRESS_TABLE} WHERE user_id = ? and status = 1 ORDER BY ID desc `, [user_id]);
//         } else {
//             [results] = await pool.query(`SELECT * FROM ${TABLE.ADDRESS_TABLE} WHERE status = 1 ORDER BY ID DESC LIMIT ? OFFSET ?`, [parsedLimit, offset]);
//         }

//         return res.status(200).json({ data: results, message: "Record Successfully Fetched", status: true, count: results.length });

//     } catch (error) {
//         return res.status(500).json({ error: 'Server error', status: false });
//     }
// });

// All List & Specific List
router.get('/:id?', authMiddleware, async (req, res) => {
    try {
        const id = req.params.id;
        const userId = req.user_id;
        const roleId  = req.role_id;
        console.log('roleID',roleId);
        console.log('isRoleAdmin',isRoleAdmin());
        console.log('isRoleUser',isRoleUser());
        
        if (id) {
            // Fetch specific address by address id
            const [results] = await pool.query(`SELECT * FROM ${TABLE.ADDRESS_TABLE} WHERE status !=0 AND id = ?`, [id]);
            if (results.length > 0) {
                return res.status(200).json({ data: results[0], message: "Record Successfully Fetched", status: true });
            }
            return res.status(404).json({ error: "Sorry, Record Not Found", status: false });
        }

        let results;
        if(roleId == isRoleAdmin()) {
            [results] = await pool.query(`SELECT * FROM ${TABLE.ADDRESS_TABLE} WHERE status != 0 ORDER BY ID DESC`);
        }else if(roleId == isRoleUser()) {
            [results] = await pool.query(`SELECT * FROM ${TABLE.ADDRESS_TABLE} WHERE user_id = ? AND status != 0 ORDER BY ID DESC`, [userId]);
        }
        return res.status(200).json({ data: results, message: "Records Successfully Fetched", status: true, count: results.length });

    } catch (error) {
        return res.status(500).json({ error: 'Server error', status: false });
    }
});




// Update Default Address
router.put('/default', authMiddleware, async (req, res) => {
    try {

        // await authenticateToken(req);

        const { row_id, user_id } = req.body;

        if (!row_id) {
            return res.status(400).json({ error: 'RowID must be required', status: false });
        }

        if (!user_id) {
            return res.status(400).json({ error: 'User ID must be required', status: false });
        }

        const [existingRecord] = await pool.query(`SELECT * FROM ${TABLE.ADDRESS_TABLE} WHERE user_id = ? and id = ?`, [user_id, row_id]);
        if (existingRecord.length === 0) {
            return res.status(404).json({ error: "Sorry, Record Not Found", status: false });
        }

            
        const [existingTitle] = await pool.query(`SELECT * FROM ${TABLE.USERS_TABLE} WHERE status = 1 and address1 = ?`, [address1]);
        if (existingTitle.length) {
            return res.status(400).json({ error: 'Record already exists', status: false });
        }

        await pool.query(`UPDATE ${TABLE.ADDRESS_TABLE} SET is_default = 0 WHERE user_id = ?`, [user_id]);
        await pool.query(`UPDATE ${TABLE.ADDRESS_TABLE} SET is_default = 1, updated_at = NOW() WHERE user_id = ? and id = ?`, [user_id, row_id]);

        return res.status(200).json({ message: "Record Successfully Updated", status: true });

    } catch (error) {
        return res.status(500).json({ error: 'Server error', status: false });
    }
});

// Update
// router.put('/:id', authMiddleware, async (req, res) => {
//     try {

//         // await authenticateToken(req);
//         const id = req.params.id;

//         if (!id) {
//             return res.status(400).json({ error: 'RowID must be required', status: false });
//         }

//         const [existingRecord] = await pool.query(`SELECT * FROM ${TABLE.ADDRESS_TABLE} WHERE status = 1 and id = ?`, [id]);
//         if (!existingRecord.length) {
//             return res.status(404).json({ error: "Sorry, Record Not Found", status: false });
//         }

//         const { user_id, first_name, last_name, email, phone, a_type, address1, country, state, city, landmark, pincode, is_default } = req.body;

//         if (!first_name || !last_name || !email || !phone || !address1) {
//             return res.status(400).json({ error: 'First Name, Last Name, Email, Phone and Address fields are required', status: false });
//         }

//         if (is_default) {
//             await pool.query(`UPDATE ${TABLE.ADDRESS_TABLE} SET is_default = 0 WHERE user_id = ?`, [user_id]);
//         }

//         // Email Validation
//         if (email) {
//             const emailExists = await checkEmailExistOrNot(TABLE.ADDRESS_TABLE, email, id);
//             if (emailExists) {
//                 return res.status(409).json({ error: 'Email already exists', status: false });
//             }
//         }

//         // Phone Validation
//         if (phone) {
//             const phoneExists = await checkPhoneExistOrNot(TABLE.ADDRESS_TABLE, phone, id);
//             if (phoneExists) {
//                 return res.status(409).json({ error: 'Phone number already exists', status: false });
//             }
//         }

//         await pool.query(`UPDATE ${TABLE.ADDRESS_TABLE} SET first_name = ?, last_name = ?, email = ?, phone = ?, a_type = ?, address1 = ?, country = ?, state = ?, city = ?, landmark = ?, pincode = ?, is_default = ?, updated_at = NOW() WHERE id = ?`, [first_name, last_name, email, phone, a_type, address1, country, state, city, landmark, pincode, is_default, id]);

//         return res.status(200).json({ message: "Record Successfully Updated", status: true });

//     } catch (error) {
//         return res.status(500).json({ error: 'Server error', status: false });
//     }
// });

router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const id = req.params.id;

        if (!id) {
            return res.status(400).json({ error: 'RowID must be required', status: false });
        }

        const [existingRecord] = await pool.query(`SELECT * FROM ${TABLE.ADDRESS_TABLE} WHERE status = 1 AND id = ?`, [id]);
        if (!existingRecord.length) {
            return res.status(404).json({ error: "Sorry, Record Not Found", status: false });
        }

        // Extract the fields from the request body
        const { user_id, first_name, last_name, email, phone, a_type, address1, country, state, city, pincode, is_default } = req.body;

        // Validate required fields
        const requiredFields = [first_name, last_name, email, phone, address1];
        const missingFields = requiredFields.filter(field => !field);
        if (missingFields.length > 0) {
            return res.status(400).json({ error: 'First Name, Last Name, Email, Phone and Address fields are required', status: false });
        }

        // Update the default address if necessary
        if (is_default) {
            await pool.query(`UPDATE ${TABLE.ADDRESS_TABLE} SET is_default = 0 WHERE user_id = ?`, [user_id]);
        }

        // Perform email and phone validations if provided
        if (email) {
            const emailExists = await checkEmailExistOrNot(TABLE.ADDRESS_TABLE, email, id);
            if (emailExists) {
                return res.status(409).json({ error: 'Email already exists', status: false });
            }
        }

        if (phone) {
            const phoneExists = await checkPhoneExistOrNot(TABLE.ADDRESS_TABLE, phone, id);
            if (phoneExists) {
                return res.status(409).json({ error: 'Phone number already exists', status: false });
            }
        }

        // Prepare the update query and parameters
        const fieldsToUpdate = [];
        const updateValues = [];

        // Add only provided fields to the update query
        if (first_name) {
            fieldsToUpdate.push('first_name = ?');
            updateValues.push(first_name);
        }
        if (last_name) {
            fieldsToUpdate.push('last_name = ?');
            updateValues.push(last_name);
        }
        if (email) {
            fieldsToUpdate.push('email = ?');
            updateValues.push(email);
        }
        if (phone) {
            fieldsToUpdate.push('phone = ?');
            updateValues.push(phone);
        }
        if (a_type) {
            fieldsToUpdate.push('a_type = ?');
            updateValues.push(a_type);
        }
        if (address1) {
            fieldsToUpdate.push('address1 = ?');
            updateValues.push(address1);
        }
        if (country) {
            fieldsToUpdate.push('country = ?');
            updateValues.push(country);
        }
        if (state) {
            fieldsToUpdate.push('state = ?');
            updateValues.push(state);
        }
        if (city) {
            fieldsToUpdate.push('city = ?');
            updateValues.push(city);
        }
    
        if (pincode) {
            fieldsToUpdate.push('pincode = ?');
            updateValues.push(pincode);
        }
        if (is_default !== undefined) {
            fieldsToUpdate.push('is_default = ?');
            updateValues.push(is_default);
        }

        // Add the ID at the end of the parameters array
        updateValues.push(id);

        // Construct the update SQL query
        const updateQuery = `UPDATE ${TABLE.ADDRESS_TABLE} SET ${fieldsToUpdate.join(', ')}, updated_at = NOW() WHERE id = ?`;
        
        await pool.query(updateQuery, updateValues);

        return res.status(200).json({ message: "Record Successfully Updated", status: true });

    } catch (error) {
        console.error(error); // Log error for debugging
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
            await pool.query(`SELECT * FROM ${TABLE.ADDRESS_TABLE} WHERE status = 1 and id = ?`, [deletedId]);
        }));

        const query = `UPDATE ${TABLE.ADDRESS_TABLE} SET status = 0, deleted_at = NOW() WHERE id IN (?)`;

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