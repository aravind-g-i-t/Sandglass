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
        res.status(200).render('admin/categories', { categoryData, page, totalPages });
    } catch (error) {
        console.log(error);
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
        console.log(checkCategory);

        if (checkCategory) {
            res.status(200).render('admin/categories', {
                message: 'Category already exists',
                categoryData,
                page,
                totalPages
            });
        } else {
            console.log('inserting');
            const insertData = await Category.insertMany({
                name,
                description
            });
            console.log('Data inserted successfully');
            console.log(insertData);
            res.render('admin/categories', {
                categoryData,
                page,
                totalPages
            });
        }

    } catch (error) {
        console.log(error.message);
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

        res.redirect('/admin/categories');

    } catch (error) {
        console.log(error.message);
    }
};



const loadEdit = async(req, res) => {
    try {
        const id = req.query.id;
        console.log(id);
        const category = await Category.findById(id);

        res.render('admin/editCategory', { category });
    } catch (error) {
        console.log(error.message);
    }
};

const editCategory = async(req, res) => {
    try {
        let { id, name, description } = req.body;
        console.log(id);
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
                res.redirect('/admin/categories');
            } else {
                res.render("edit-category", {
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
            res.redirect('/admin/categories');
        }


    } catch (error) {
        console.log(error.message);
    }
};



module.exports = {
    loadcategories,
    insertCategory,
    statusUpdate,
    loadEdit,
    editCategory
};