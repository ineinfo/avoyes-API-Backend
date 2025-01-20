// src/routes/subscriberRoutes.js
const express = require('express');
const TABLE = require('../utils/tables')
const pool = require('../utils/db');
const router = express.Router();
const authMiddleware = require('../utils/authMiddleware');
const { validateEmail } = require('../utils/common');
const nodemailer = require('nodemailer');


require('dotenv').config();




// Add
router.post('/', async (req, res) => {
    try {
        const { email } = req.body;

     

        if (!email) {
            return res.status(400).json({ error: 'Email field is required', status: false });
        }

        if (!validateEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format. Please enter a valid email like xyz@gmail.com', status: false });
        }

        const [existingEmail] = await pool.query(`SELECT * FROM ${TABLE.SUBSCRIBERS_TABLE} WHERE email = ?`, [email]);

        if (existingEmail.length > 0) {
            return res.status(400).json({ error: 'You have already subscribed to our newsletter', status: false });
        }

        await pool.query(`INSERT INTO ${TABLE.SUBSCRIBERS_TABLE} (email) VALUES (?)`, [email]);

        return res.status(201).json({ message: 'Record Successfully Created', status: true });
    } catch (error) {
        console.error(error);
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

        if (id) {
            const [results] = await pool.query(`SELECT * FROM ${TABLE.SUBSCRIBERS_TABLE} WHERE id = ?`, [id]);
            if (results.length > 0) {
                return res.status(200).json({ data: results[0], message: "Record Successfully Fetched", status: true });
            }
            return res.status(404).json({ error: "Sorry, Record Not Found", status: false });
        }


        let [results] = await pool.query(`SELECT * FROM ${TABLE.SUBSCRIBERS_TABLE} ORDER BY ID DESC LIMIT ?, ?`, [offset, parsedLimit]);


        return res.status(200).json({ data: results, message: "Record Successfully Fetched", status: true, count: results.length });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: 'Server error', status: false });
    }
});




// without id

// router.post('/send-email', async (req, res) => {
//     try {
//         const { from, to, message } = req.body;

//         if (!from || !to || !message) {
//             return res.status(400).json({ error: 'Fields "from", "to", and "message" are required', status: false });
//         }

//         // Parse `to` to handle both array and comma-separated string formats
//         const toEmails = Array.isArray(to) ? to : to.split(',').map(email => email.trim());

//         // Validate `from` and each `to` address
//         if (!validateEmail(from) || !toEmails.every(email => validateEmail(email))) {
//             return res.status(400).json({ error: 'Invalid email format for "from" or "to" field', status: false });
//         }

//         // Configure the Nodemailer transporter
//         const transporter = nodemailer.createTransport({
//             service: 'gmail', 
//             auth: {
//                 user: process.env.EMAIL_USER,
//                 pass: process.env.EMAIL_PASS  
//             }
//         });

//         // Send an individual email to each recipient
//         for (const recipient of toEmails) {
//             const mailOptions = {
//                 from: from,
//                 // from:'no-reply@gmail.com',
//                 to: recipient,  
//                 subject: 'Avoyes Newsletter Subscription',
//                 text: message,
//                 //replyTo: 'no-reply@gmail.com'
//             };

//             // Send the email to the current recipient
//             await transporter.sendMail(mailOptions);
//         }

//         return res.status(200).json({ message: 'Emails sent successfully', status: true });

//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({ error: 'Server error', status: false });
//     }
// });


// Send email with IDs
router.post('/send-email', async (req, res) => {
    try {
        const { from, to, message , subject  } = req.body;

        if (!from || !to || !message) {
            return res.status(400).json({ error: 'Fields "from", "to", and "message" are required', status: false });
        }

    
        let toEmails = [];
        if (Array.isArray(to)) {
            
            const [results] = await pool.query(`SELECT email FROM ${TABLE.SUBSCRIBERS_TABLE} WHERE id IN (?)`, [to]);
            if (results.length > 0) {
                toEmails = results.map(result => result.email); 
            } else {
                return res.status(404).json({ error: "No subscribers found for the given IDs", status: false });
            }
        } else if (Number.isInteger(Number(to))) {
            
            const [results] = await pool.query(`SELECT email FROM ${TABLE.SUBSCRIBERS_TABLE} WHERE id = ?`, [to]);
            if (results.length > 0) {
                toEmails.push(results[0].email);
            } else {
                return res.status(404).json({ error: "Subscriber not found", status: false });
            }
        } else {
        
            toEmails = Array.isArray(to) ? to : to.split(',').map(email => email.trim());
        }

    
        if (!validateEmail(from) || !toEmails.every(email => validateEmail(email))) {
            return res.status(400).json({ error: 'Invalid email format for "from" or "to" field', status: false });
        }

  
        const transporter = nodemailer.createTransport({
            service: 'gmail', 
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS  
            }
        });

   
       for (const recipient of toEmails) {
    const mailOptions = {
        from: from,
        to: recipient,  
        subject: subject,
        html: `<div>${message}</div>`,  
    };

    await transporter.sendMail(mailOptions);
}


        return res.status(200).json({ message: 'Emails sent successfully', status: true });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Server error', status: false });
    }
});



module.exports = router;