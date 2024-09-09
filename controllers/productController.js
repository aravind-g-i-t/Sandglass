const Product = require('../models/productModel');
const Categories = require('../models/categoryModel');
const Cart = require('../models/cartModel');
const fs = require('fs');
const path = require('path');
const Wishlist = require('../models/wishlistModel');



const loadProducts = async (req, res) => {
    try {
        const query = {};
        if (req.query.searchProduct) {
            const searchQuery = req.query.searchProduct;
            query.productName = new RegExp(searchQuery, 'i');
        }

        const page = parseInt(req.query.page, 10) || 1;
        const limit = 4;
        const startIndex = (page - 1) * limit;


        // Fetch products
        const products = await Product.find(query)
            .sort({ _id: -1 })
            .skip(startIndex)
            .limit(limit);

        // Calculate the final price for each product
        const productsWithFinalPrice = await Promise.all(
            products.map(async (product) => {
                const finalPrice = await product.getDisplayPrice();
                return { ...product.toObject(), finalPrice }; // Add finalPrice to the product object
            })
        );

        // Count total documents to calculate total pages
        const totalDocuments = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalDocuments / limit);

        return res.render('admin/products', { products: productsWithFinalPrice, page, totalPages });

    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
    }
};




const loadAddProduct = async(req, res) => {
    try {
        const categories = await Categories.find({ isActive: true });
        return res.render('admin/addProduct', { categories });
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
    }
};





const addProduct = async (req, res) => {
    try {
        const categories = await Categories.find({ isActive: true });

        // Extracting product details from the request body
        const name = req.body.product_name;
        const description = req.body.product_description;
        const price = req.body.product_price;
        const salePrice = req.body.product_sale_price; // Sale price field
        const stock = req.body.product_stock;
        const category = req.body.product_category;


        // Checking if the product name already exists (case-insensitive)
        const nameExists = await Product.findOne({ productName: { $regex: name, $options: 'i' } });
        if (nameExists) {
            return res.render('admin/addProduct', { message: 'Product already exists', msg: '', categories });
        } else {
            // Extracting image filenames from the uploaded files
            const images = req.files.map(file => file.filename);
            // Creating a new product instance
            const productAdding = await Product.create({
                productName: name,
                category,
                description,
                price,
                salePrice, // Adding sale price
                stock,
                productImage: images
            });

            // Saving the product to the database
            const product = await productAdding.save();
            if (product) {
                return res.redirect('/admin/products');
            } else {
                return res.render('admin/addProduct', { message: 'Error adding the product', categories });
            }
        }

    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
    }
};


const editProduct = async(req, res) => {
    try {
        const id = req.query.id;
        const productName = req.body.product_name;
        const description = req.body.product_description;
        const price = req.body.product_price;
        const salePrice = req.body.product_sale_price;
        const stock = req.body.product_stock;
        const category = req.body.product_category;
        const images = req.files.map(file => file.filename);

        await Product.findByIdAndUpdate(id,
            { $set: {
                productName,
                category,
                description,
                price,
                salePrice,
                stock
            },
            $push: {
                productImage: { $each: images }
            }
            }
        );

        return res.redirect('/admin/products');
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
    }
};

const productStatusUpdate = async(req, res) => {
    try {
        const id = req.query.id;

        const product = await Product.findById({ _id: id });
        if (product.isActive) {
            await Product.findByIdAndUpdate(
                { _id: id },
                { $set: { isActive: false } }
            );
            await Cart.updateMany(
                {},
                { $pull: { product: { productId: product._id } } }
            );
            await Wishlist.updateMany(
                {},
                { $pull: { products: { productId: product._id } } }
            );
        } else {
            await Product.findByIdAndUpdate(
                { _id: id },
                { $set: { isActive: true } }
            );
        }
        return res.redirect('/admin/products');

    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
    }
};

const loadEditProduct = async (req, res) => {
    try {
        const categories = await Categories.find({ isActive: true });
        const id = req.query.id;
        const product = await Product.findOne({ _id: id });

        // Check if the product was found
        if (!product) {
            return res.status(404).render('admin/editProduct', {
                success: false,
                message: 'Product not found',
                error: {
                    description: 'The product with the given ID does not exist'
                },
                categories
            });
        }

        // Success Response
        return res.status(200).render('admin/editProduct', {
            success: true,
            message: 'Product and categories loaded successfully',
            data: {
                product,
                categories
            }
        });
    } catch (error) {
        // Error Response
        return res.status(500).render('admin/editProduct', {
            success: false,
            message: 'Failed to load product or categories',
            error: {
                description: error.message
            },
            categories: [] // Optional: Pass empty categories to prevent errors in the view
        });
    }
};


// eslint-disable-next-line consistent-return
const removeImage = async(req, res) => {
    try {
        const { productId, image } = req.body;
        // Find the product by ID
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Check if the image exists in the product's image array
        const imageIndex = product.productImage.indexOf(image);
        if (imageIndex === -1) {
            return res.status(404).json({ error: 'Image not found in product' });
        }

        // Remove the image from the product's image array
        product.productImage.splice(imageIndex, 1);

        // Delete the image file from the server
        const imagePath = path.join(__dirname, '../public/uploads', image);
        fs.unlink(imagePath, async (err) => {
            if (err) {
                return res.status(500).json({ error: 'Error deleting the image file' });
            }

            // Save the updated product
            try {
                await product.save();
                return res.status(200).json({ success: true, message: 'Image file deleted and product updated successfully' });
            } catch {
                return res.status(500).json({ error: 'Error saving the product' });
            }
        });

    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
    }
};



module.exports = {
    loadProducts,
    loadAddProduct,
    addProduct,
    productStatusUpdate,
    loadEditProduct,
    removeImage,
    editProduct
};