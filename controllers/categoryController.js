const Category = require('../models/categoryModel');
const Cart = require('../models/cartModel');
const MESSAGES = require("../constants/messages.constant");
const STATUS_CODES = require('../enum/statusCode.enum');


const loadcategories = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = 5;
        const startIndex = (page - 1) * limit;
        const categoryData = await Category.find().sort({ createdAt: -1 }).skip(startIndex).limit(limit);
        const totalDocuments = await Category.countDocuments();
        const totalPages = Math.ceil(totalDocuments / limit);
        return res.status(STATUS_CODES.SUCCESS).render('admin/categories', { categoryData, page, totalPages });
    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.INTERNAL_SERVER_ERROR);
    }
};

const insertCategory = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = 5;
        const startIndex = (page - 1) * limit;

        const categoryData = await Category.find().sort({ createdAt: -1 }).skip(startIndex).limit(limit);

        const totalDocuments = await Category.countDocuments();

        const totalPages = Math.ceil(totalDocuments / limit);


        let { name, description } = req.body;
        name = name.toUpperCase();


        const checkCategory = await Category.findOne({
            name
        });



        if (checkCategory) {
            return res.status(STATUS_CODES.SUCCESS).render('admin/categories', {
                message: 'Category already exists',
                categoryData,
                page,
                totalPages
            });
        }
        const newCat = await Category.create({
            name,
            description
        });

        return res.render('admin/categories', {
            categoryData: [newCat, ...categoryData],
            page,
            totalPages
        });


    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.INTERNAL_SERVER_ERROR);
    }
};

const statusUpdate = async (req, res) => {
    try {
        const id = req.query.id;

        const category = await Category.findById({ _id: id });
        if (category.isActive) {
            await Category.findByIdAndUpdate(
                { _id: id },
                { $set: { isActive: false } }
            );

            await Cart.updateMany(
                {},
                { $pull: { products: { categoryId: id } } }
            );
        } else {
            await Category.findByIdAndUpdate(
                { _id: id },
                { $set: { isActive: true } }
            );
        }

        return res.redirect('/admin/categories');

    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.INTERNAL_SERVER_ERROR);
    }
};



const loadEdit = async (req, res) => {
    try {
        const id = req.query.id;
        const category = await Category.findById(id);

        return res.render('admin/editCategory', { category });
    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.INTERNAL_SERVER_ERROR);
    }
};

const editCategory = async (req, res) => {
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


    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.INTERNAL_SERVER_ERROR);
    }
};



module.exports = {
    loadcategories,
    insertCategory,
    statusUpdate,
    loadEdit,
    editCategory
};