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
        return res.status(STATUS_CODES.OK).render('admin/categories', { categoryData, page, totalPages });
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
            return res.status(STATUS_CODES.CONFLICT).render('admin/categories', {
                message: MESSAGES.CATEGORY_EXISTS,
                categoryData,
                page,
                totalPages
            });
        }
        const newCat = await Category.create({
            name,
            description
        });

        return res.status(STATUS_CODES.OK).render('admin/categories', {
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
        const id = req.params.id;
        console.log(id);


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

        return res.status(STATUS_CODES.OK).render('admin/editCategory', { category });
    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.INTERNAL_SERVER_ERROR);
    }
};

const editCategory = async (req, res) => {
    try {
        let { name, description } = req.body;
        const { id } = req.params;
        name = name.toUpperCase();
        const nameMatch = await Category.findOne({
            name
        });
        if (nameMatch) {
            if (nameMatch.id === id) {
                await Category.findByIdAndUpdate(id, {
                    $set: { description }
                });
                return res.status(STATUS_CODES.OK).json({
                success: true,
                message: 'Category updated successfully'
            });
            } else {
                return res.status(STATUS_CODES.CONFLICT).json({
                    success:false,
                    message: "Category already exists"
                });
            }
        } else {
            await Category.findByIdAndUpdate(id, {
                $set: {
                    description,
                    name
                }
            });
            return res.status(STATUS_CODES.OK).json({
                success: true,
                message: 'Category updated successfully'
            });

        }


    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success:false,
            message:MESSAGES.INTERNAL_SERVER_ERROR
        });
    }
};



module.exports = {
    loadcategories,
    insertCategory,
    statusUpdate,
    loadEdit,
    editCategory
};