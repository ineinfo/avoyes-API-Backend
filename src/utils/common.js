const pool = require('../utils/db');
const TABLE = require('../utils/tables');

const multer = require('multer');

function multerErrorHandler(err, req, res, next) {
    if (err) {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'File size must be less than 5KB', status: false });
            }
        }
        return res.status(400).json({ error: err.message, status: false });
    }
    next();
}





// Generate OTP
function generateOTP(digits) {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
}
function validateEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.com$/;
  return emailRegex.test(email);
}

const checkEmailExistOrNot = async (tableName, email, ID = null) => {
  try {
      let sql = 'SELECT id FROM ' + tableName + ' WHERE email = ? and status = 1';
      const values = [email];

      if (ID !== null) {
          sql += ' AND id != ?';
          values.push(ID);
      }

      const [rows] = await pool.query(sql, values);
      return rows.length > 0;
  } catch (error) {
      console.error('Error occurred while checking email:', error.message);
      throw new Error('Failed to check email existence. Please try again later.');
  }
};


// Check mobile exists or not
const checkPhoneExistOrNot = async (tableName, phone, ID = null) => {
  try {
      let sql = 'SELECT * FROM ' + tableName + ' WHERE phone = ? and status = 1';
      const values = [phone];

      if (ID !== null) {
          sql += ' AND id != ?';
          values.push(ID);
      }

      const [rows] = await pool.query(sql, values);
      return rows.length > 0;
      // return !!rows.length; // Returns true if phone exists, false otherwise
  } catch (error) {
      console.error('Error occurred while checking phone:', error);
      throw new Error('Failed to check phone existence');
  }
}

// Manage API Response Status
function ManageResponseStatus(action) {
  const defaultTitles = {
      created: 'Record Successfully Created',
      updated: 'Record Successfully Updated',
      deleted: 'Record Successfully Deleted',
      fetched: 'Record Successfully Fetched',
      alreadyDeleted: 'Record Already Deleted',
      notFound: 'Sorry, Record Not Found',
      error: 'Something Went Wrong!',
      exist: 'Record Already Exist!',
      RowIdRequired: 'RowID must be required',
  };
  return defaultTitles[action];
}

// Password validation - Password must be at least 9 characters long and contain at least one uppercase letter, one lowercase letter and one special character.
function validatePassword(password) {
  // Minimum length check
  if (password.length < 9) {
      return false;
  }

  // Uppercase, lowercase, and special characters check
  const uppercaseRegex = /[A-Z]/;
  const lowercaseRegex = /[a-z]/;
  const specialCharactersRegex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/;

  const hasUppercase = uppercaseRegex.test(password);
  const hasLowercase = lowercaseRegex.test(password);
  const hasSpecialCharacters = specialCharactersRegex.test(password);

  // Check if all conditions are met
  return hasUppercase && hasLowercase && hasSpecialCharacters;
}

function formatDateForDB(dateStr) {
  const [day, month, year] = dateStr.split('-');
  const fullYear = year.length === 2 ? `20${year}` : year;
  return `${fullYear}-${month}-${day}`;
}

const formatQuery = (query, params) => {
  return query.replace(/\?/g, () => {
    let param = params.shift();
    if (typeof param === 'string') {
      return `'${param}'`;
    }
    return param;
  });
};

const isRoleAdmin = () => {
  return 1;
}

const isRoleUser = () => {
  return 2;
}

const generateOrderNumber = async (db) => {
  let isUnique = false;
  let orderNumber = '';

  while (!isUnique) {
    const randomSuffix = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    orderNumber = `ORD${randomSuffix}`;
    
    let chkOrder = `SELECT COUNT(*) as count FROM ${TABLE.ORDERS_TABLE} WHERE order_number = ?`;
    console.log('chkOrder',chkOrder)
    const [rows] = await pool.query(chkOrder, [orderNumber]);

    if (rows[0].count === 0) {
      isUnique = true;
    }
  }

  return orderNumber;
};
module.exports = {
  generateOTP,
  validateEmail,
  ManageResponseStatus,
  checkEmailExistOrNot,
  checkPhoneExistOrNot,
  validatePassword,
  multerErrorHandler,
  formatDateForDB,
  formatQuery,
  isRoleAdmin,
  isRoleUser,
  generateOrderNumber
}
