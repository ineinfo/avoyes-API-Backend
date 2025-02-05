const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
 
const usersRoutes = require('./routes/usersRoutes');
const addressRoutes = require('./routes/addressRoutes');
const blogRoutes = require('./routes/blogRoutes');
const blogCategoryRoutes = require('./routes/blogCategoryRoutes');
const blogTagsRoutes = require('./routes/blogTagsRoutes');
const blogCommentsRoutes = require('./routes/blogCommentsRoutes');
const productCategoryRoutes = require('./routes/productCategoryRoutes');
const productSubcategoryRoutes = require('./routes/productSubcategoryRoutes');
const productColorsRoutes = require('./routes/productColorsRoutes');
const productSizeRoutes = require('./routes/productSizeRoutes');
const productMaterialsRoutes = require('./routes/productMaterialsRoutes');
const productTypeRoutes = require('./routes/productTypeRoutes');
const sizeTagRoutes = require('./routes/sizeTagRoutes');
const colorTagRoutes = require('./routes/colorTagRoutes');
const productTagRoutes=require('./routes/productTag');
const productTagAddedRoutes=require('./routes/productTagAdded');
const faqsRoutes = require('./routes/faqsRoutes');
const socialsRoutes = require('./routes/socialsRoutes');
const pagesRoutes = require('./routes/pagesRoutes');
const aboutusRoutes = require('./routes/aboutusRoutes');
const subscribersRoutes = require('./routes/subscribersRoutes');
const contactusRoutes = require('./routes/contactusRoutes');
const contactInquiryRoutes=require('./routes/contactInquiryRoutes');
const myWishlistRoutes=require('./routes/myWishlistRoutes');
const eventsRoutes=require('./routes/eventsRoutes');
const desktopMastheadRoutes=require('./routes/desktopMastheadRoutes');
const productsRoutes=require('./routes/productsRoutes');
const foodTypeRoutes=require('./routes/foodTypeRoutes');
const foodPlaceRoutes=require('./routes/foodPlaceRoutes');
const popularDishesRoutes=require('./routes/popularDishesRoutes');
const timeRoutes=require('./routes/timeRoutes');
const reservationRoutes=require('./routes/reservationRoutes');
const cartRoutes=require('./routes/cartRoutes');
const checkoutRoutes=require('./routes/checkoutRoutes');
const checkoutItemsRoutes=require('./routes/checkoutItemsRoutes');
const ordersRoutes=require('./routes/ordersRoutes');
const orderItemsRoutes=require('./routes/orderItemRoutes');
const filterRoutes=require('./routes/filterRoutes');
const bestForRoutes=require('./routes/bestForRoutes');
const bestForProductsRoutes=require('./routes/bestForProductRoutes');
const ratingRoutes=require('./routes/ratingRoutes');
const adminDashboardRoutes=require('./routes/adminDashboardRoutes');
const userDashboardRoutes=require('./routes/userDashboardRoutes');
const challengesRoutes=require('./routes/challengesRoutes');
const activitiesRoutes=require('./routes/activitiesRoutes');
const eventCategoryRoutes=require('./routes/eventCategoryRoutes');
const eventSpeakerRoutes=require('./routes/eventSpeakerRoutes');
const countriesRoutes=require('./routes/countriesRoutes');
const activityCategoryRoutes=require('./routes/activityCategoryRoutes');
const statesPortal=require('./routes/statesPortal');
const citiesPortal=require('./routes/citiesPortal');
const bannersPortal=require('./routes/bannersRoutes');
const joinchallengesRoutes=require('./routes/joinchallengesRoutes');






require('dotenv').config();

const app = express();
const bodyParser = require('body-parser');
const port = process.env.PORT || 3000;

app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

app.use(cors({
  origin: true,
  methods: 'GET,POST,PUT,DELETE',
  allowedHeaders: 'Content-Type,Authorization',
  exposedHeaders: 'Content-Length,X-Kuma-Revision',
  credentials: true,
  maxAge: 600
}));
const upload = multer();
app.use((req, res, next) => {
  next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api/users', usersRoutes);
app.use('/api/address', addressRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/blog-category', blogCategoryRoutes);
app.use('/api/blog-tags', blogTagsRoutes);
app.use('/api/blog-comments', blogCommentsRoutes);
app.use('/api/product-category', productCategoryRoutes);
app.use('/api/product-subcategory', productSubcategoryRoutes);
app.use('/api/product-colors', productColorsRoutes);
app.use('/api/product-size', productSizeRoutes);
app.use('/api/product-materials', productMaterialsRoutes);
app.use('/api/product-type', productTypeRoutes);
app.use('/api/product-tag', productTagRoutes);
app.use('/api/product-tag-add', productTagAddedRoutes);
app.use('/api/size-tag', sizeTagRoutes);
app.use('/api/color-tag', colorTagRoutes);
app.use('/api/faqs', faqsRoutes);
app.use('/api/socials', socialsRoutes);
app.use('/api/pages', pagesRoutes);
app.use('/api/aboutus', aboutusRoutes);
app.use('/api/subscribers', subscribersRoutes);
app.use('/api/contactus', contactusRoutes);
app.use('/api/contact-inquiry', contactInquiryRoutes);
app.use('/api/wishlist', myWishlistRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/desktop-masthead', desktopMastheadRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/food-type', foodTypeRoutes);
app.use('/api/food-place', foodPlaceRoutes);
app.use('/api/popular-dishes', popularDishesRoutes);
app.use('/api/time', timeRoutes);
app.use('/api/reservation', reservationRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/checkout-items', checkoutItemsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/order-items', orderItemsRoutes);
app.use('/api/search', filterRoutes);
app.use('/api/best', bestForRoutes);
app.use('/api/best-products', bestForProductsRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/admin', adminDashboardRoutes);
app.use('/api/user', userDashboardRoutes);
app.use('/api/challenges', challengesRoutes);
app.use('/api/joinchallenges', joinchallengesRoutes);
app.use('/api/activities', activitiesRoutes);
app.use('/api/eventcategory', eventCategoryRoutes);
app.use('/api/eventspeaker', eventSpeakerRoutes);
app.use('/api/countries', countriesRoutes);
app.use('/api/activitycategory', activityCategoryRoutes);
app.use('/api/state', statesPortal);
app.use('/api/cities', citiesPortal);
app.use('/api/banner', bannersPortal);




app.get('/', (req, res) => {
  res.send('api working!');
});

app.listen(port, () => {
  console.log(`Server running on ${process.env.NEXT_PUBLIC_API_URL}`);
});
