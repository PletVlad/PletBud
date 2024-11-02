const express = require('express');
const bodyParser = require('body-parser');
const favicon = require('serve-favicon');
const path = require('path');
const fs = require('fs');

const errorsController = require('./controllers/error');
const sequelize = require('./util/database');
const Product = require('./models/product');
const User = require('./models/user');
const Cart = require('./models/cart');
const CartItem = require('./models/cart-item');
const Order = require('./models/order');
const OrderItem = require('./models/order-item');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');

const app = express();

app.set('view engine', 'ejs');
app.set('views', 'views');

app.use(favicon(__dirname + '/favicon.ico'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  User.findByPk(1)
    .then(user => {
      req.user = user;
      next();
    })
    .catch(err => console.log(err));
});

app.use('/admin', adminRoutes);
app.use(shopRoutes);

app.use(errorsController.get404);

Product.belongsTo(User, {
  constraints: true,
  onDelete: 'CASCADE'
});
User.hasMany(Product);
User.hasOne(Cart);
Cart.belongsTo(User);
Cart.belongsToMany(Product, { through: CartItem });
Product.belongsToMany(Cart, { through: CartItem });
Order.belongsTo(User);
User.hasMany(Order);
Order.belongsToMany(Product, { through: OrderItem });
Product.belongsToMany(Order, { through: OrderItem });

sequelize
  .sync()
  .then(result => {
    User.findByPk(1)
      .then(user => {
        if (!user) {
          return User.create({
            name: 'Vladislav',
            email: 'Vladislav@gmail.com'
          });
        }
        return user;
      })
      .then(user => {
        Cart.findOne({
          where: {
            userId: user.id
          }
        })
          .then(cart => {
            if (!cart) {
              return user.createCart();
            }
            return cart;
          })
      })
      .then(() => {
        return Product.findAll();
      })
      .then(products => {
        if (products.length === 0) {
          const filePath = path.join(__dirname, 'data', 'products.json');
          const productData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          return Product.bulkCreate(
            productData.map(prod => ({
              title: prod.title,
              price: parseFloat(prod.price),
              imageUrl: prod.imageUrl,
              description: prod.description,
              userId: 1
            }))
          );
        }
      })
      .then(cart => {
        app.listen(process.env.PORT || 5000);
      })
      .catch(err => console.log(err));
  })
  .catch(err => {
    console.log(err);
  });
