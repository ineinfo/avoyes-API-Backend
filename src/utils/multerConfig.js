// src/utils/multerConfig.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Create a function to get the storage configuration based on module type
const getStorage = (moduleType) => {
  return multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadPath = path.join(
        __dirname,
        "../../public/uploads/",
        moduleType
      );

      // Ensure the directory exists
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  });
};

//file types allowed
const fileFilter = (req, file, cb) => {
  const fileTypes = /jpeg|jpg|png/; //gif opetional
  const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = fileTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error("Only jpg, jpeg, and png files are allowed"));
  }
};

// // Export different upload instances for different modules with validation
// const uploadUsers = multer({ storage: getStorage('users'),fileFilter: fileFilter,limits:  { fileSize: 5 * 1024 }});
// const uploadBlogs = multer({ storage: getStorage('blogs'),fileFilter: fileFilter,limits:  { fileSize: 5 * 1024 } });
// const uploadProductCategory = multer({ storage: getStorage('product-category'),fileFilter: fileFilter,limits:  { fileSize: 5 * 1024 }, }).any();
// const uploadProductSubCategory = multer({ storage: getStorage('product-subcategory'),fileFilter: fileFilter,limits:  { fileSize: 5 * 1024 } });
// const uploadEvents = multer({ storage: getStorage('events') ,fileFilter: fileFilter,limits:  { fileSize: 5 * 1024 }});
// const uploadProducts=multer({ storage: getStorage('products'),fileFilter: fileFilter,limits:  { fileSize: 5 * 1024 } });
// const uploadFoodPlace=multer({ storage: getStorage('food-place'),fileFilter: fileFilter,limits:  { fileSize: 5 * 1024 } });
// const uploadPopularFood=multer({ storage: getStorage('popular-food') ,fileFilter: fileFilter,limits:  { fileSize: 5 * 1024 }});

// Export different upload instances for different modules with validation
const uploadUsers = multer({
  storage: getStorage("users"),
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).any();
const uploadBlogs = multer({
  storage: getStorage("blogs"),
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).any();
const uploadProductCategory = multer({  
  storage: getStorage("product-category"),
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).any();
const uploadProductSubCategory = multer({
  storage: getStorage("product-subcategory"),
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).any();
const uploadEvents = multer({
  storage: getStorage("events"),
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).any();
const uploadProducts = multer({
  storage: getStorage("products"),
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).any();
const uploadFoodPlace = multer({
  storage: getStorage("food-place"),
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).any();
const uploadPopularFood = multer({
  storage: getStorage("popular-food"),
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).any();
const challengesImages = multer({
  storage: getStorage("challenges"),
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).any();

const activitiesImages = multer({
  storage: getStorage("activities"),
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).any();

const activitiesCategories = multer({
  storage: getStorage("activitiesCategory"),
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).any();

const topBanners = multer({
  storage: getStorage("banner"),
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).any();



module.exports = {
  uploadUsers,
  uploadBlogs,
  uploadProductCategory,
  uploadProductSubCategory,
  uploadEvents,
  uploadProducts,
  uploadFoodPlace,
  uploadPopularFood,
  challengesImages,
  activitiesImages,
  activitiesCategories,
  topBanners
};
