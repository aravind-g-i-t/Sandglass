const Product = require('../models/productModel');
const Categories = require('../models/categoryModel');
const Cart = require('../models/cartModel');
const fs = require('fs/promises');
const path = require('path');
const Wishlist = require('../models/wishlistModel');
const MESSAGES = require("../constants/messages.constant");
const STATUS_CODES = require('../enum/statusCode.enum');




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

        const products = await Product.find(query)
            .sort({ _id: -1 })
            .skip(startIndex)
            .limit(limit);

        const productsWithFinalPrice = await Promise.all(
            products.map(async (product) => {
                const finalPrice = await product.getDisplayPrice();
                return { ...product.toObject(), finalPrice };
            })
        );

        const totalDocuments = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalDocuments / limit);

        return res.render('admin/products', { products: productsWithFinalPrice, page, totalPages });

    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send('Internal Server Error');
    }
};




const loadAddProduct = async (req, res) => {
    try {
        const categories = await Categories.find({ isActive: true });
        return res.render('admin/addProduct', { categories });
    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.INTERNAL_SERVER_ERROR);
    }
};





const addProduct = async (req, res) => {
    try {
        const categories = await Categories.find({ isActive: true });

        const name = req.body.product_name;
        const description = req.body.product_description;
        const price = req.body.product_price;
        const salePrice = req.body.product_sale_price; // Sale price field
        const stock = req.body.product_stock;
        const category = req.body.product_category;

        const nameExists = await Product.findOne({ productName: { $regex: name, $options: 'i' } });
        if (nameExists) {
            return res.render('admin/addProduct', { message: 'Product already exists', msg: '', categories });
        } else {
            const images = req.files.map(file => file.filename);
            const productAdding = await Product.create({
                productName: name,
                category,
                description,
                price,
                salePrice,
                stock,
                productImage: images
            });

            const product = await productAdding.save();
            if (product) {
                return res.redirect('/admin/products');
            } else {
                return res.render('admin/addProduct', { message: 'Error adding the product', categories });
            }
        }

    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.INTERNAL_SERVER_ERROR);
    }
};


const editProduct = async (req, res) => {
    try {
        const id = req.params.id;
        const productName = req.body.product_name;
        const description = req.body.product_description;
        const price = req.body.product_price;
        const salePrice = req.body.product_sale_price;
        const stock = req.body.product_stock;
        const category = req.body.product_category;
        const images = req.files.map(file => file.filename);

        await Product.findByIdAndUpdate(id,
            {
                $set: {
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

        return res.status(STATUS_CODES.OK).json({
            success: true,
            message: 'Product updated successfully'
        });
    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: MESSAGES.INTERNAL_SERVER_ERROR
        });
    }
};

const productStatusUpdate = async (req, res) => {
    try {
        const id = req.params.id;

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
        return res.status(STATUS_CODES.OK).json({
            success: true,
            message: "Product status updated successfully"
        });

    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Failed to update product status"
        });
    }
};

const loadEditProduct = async (req, res) => {
    try {
        const categories = await Categories.find({ isActive: true });
        const id = req.params.id;
        const product = await Product.findOne({ _id: id });

        // Check if the product was found
        if (!product) {
            return res.status(STATUS_CODES.NOT_FOUND).render('admin/editProduct', {
                success: false,
                message: 'Product not found',
                error: {
                    description: 'The product with the given ID does not exist'
                },
                categories
            });
        }

        // Success Response
        return res.status(STATUS_CODES.OK).render('admin/editProduct', {
            success: true,
            message: 'Product and categories loaded successfully',
            product,
            categories
        });
    } catch (error) {
        // Error Response
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).render('admin/editProduct', {
            success: false,
            message: 'Failed to load product or categories',
            error: {
                description: error.message
            },
            categories: []
        });
    }
};

const removeImage = async (req, res) => {
    try {
        const { productId, image } = req.body;

        const product = await Product.findById(productId);

        if (!product) {
            return res.status(STATUS_CODES.NOT_FOUND).json({
                error: 'Product not found'
            });
        }

        const imageIndex = product.productImage.indexOf(image);

        if (imageIndex === -1) {
            return res.status(STATUS_CODES.NOT_FOUND).json({
                error: 'Image not found in product'
            });
        }

        product.productImage.splice(imageIndex, 1);

        const imagePath = path.join(
            __dirname,
            '../public/uploads',
            image
        );

        await fs.unlink(imagePath);

        await product.save();

        return res.status(STATUS_CODES.OK).json({
            success: true,
            message: 'Image removed successfully'
        });

    } catch {


        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            error: 'An error occurred while removing the image'
        });
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