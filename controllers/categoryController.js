// const { ResultWithContextImpl } = require('express-validator/lib/chain');
const Category = require('../models/categoryModel');
const Cart = require('../models/cartModel');

const loadcategories = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = 5;
        const startIndex = (page - 1) * limit;
        const categoryData = await Category.find().skip(startIndex).limit(limit);
        const totalDocuments = await Category.countDocuments();
        const totalPages = Math.ceil(totalDocuments / limit);
        return res.status(200).render('admin/categories', { categoryData, page, totalPages });
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
    }
};

const insertCategory = async(req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = 5;
        const startIndex = (page - 1) * limit;
        const categoryData = await Category.find().skip(startIndex).limit(limit);
        const totalDocuments = await Category.countDocuments();
        const totalPages = Math.ceil(totalDocuments / limit);

        let { name, description } = req.body;
        name = name.toUpperCase();

        const checkCategory = await Category.findOne({
            name
        });

        if (checkCategory) {
            return res.status(200).render('admin/categories', {
                message: 'Category already exists',
                categoryData,
                page,
                totalPages
            });
        } else {
            await Category.insertMany({
                name,
                description
            });
            return res.render('admin/categories', {
                categoryData,
                page,
                totalPages
            });
        }

    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
    }
};

const statusUpdate = async (req, res) => {
    try {
        const id = req.query.id;

        const category = await Category.findById({ _id: id });
        if (category.isActive) {
            // Set the category as inactive
            await Category.findByIdAndUpdate(
                { _id: id },
                { $set: { isActive: false } }
            );

            // Remove all products of this category from all carts
            await Cart.updateMany(
                {},
                { $pull: { products: { categoryId: id } } }
            );
        } else {
            // Set the category as active
            await Category.findByIdAndUpdate(
                { _id: id },
                { $set: { isActive: true } }
            );
        }

        return res.redirect('/admin/categories');

    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
    }
};



const loadEdit = async(req, res) => {
    try {
        const id = req.query.id;
        const category = await Category.findById(id);

        return res.render('admin/editCategory', { category });
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
    }
};

const editCategory = async(req, res) => {
    try {
        let { id, name, description } = req.body;
        name = name.toUpperCase();
        const category = await Category.findById(id);
        const nameMatch = await Category.findOne({
            name
        });
        if (nameMatch) {
            if (nameMatch.id === id) {
                await Category.findByIdAndUpdate(id, {
                    $set: { description }
                });
                return res.redirect('/admin/categories');
            } else {
                return res.render("edit-category", {
                    message: "Cannot change to existing Category",
                    category
                });
            }
        } else {
            await Category.findByIdAndUpdate(id, {
                $set: {
                    description,
                    name
                }
            });
            return res.redirect('/admin/categories');
        }


    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
    }
};



module.exports = {
    loadcategories,
    insertCategory,
    statusUpdate,
    loadEdit,
    editCategory
};