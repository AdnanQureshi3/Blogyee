const { Router } = require("express");
const User = require("../models/user");
const Blog = require("../models/blog");
const Comment = require("../models/comments");
const streamifier = require('streamifier');

const multer = require('multer');
const cloudinary = require('../middleware/cloudinary'); // Your Cloudinary config file
const path = require('path');

// Remove local storage configuration and configure multer for Cloudinary
const storage = multer.memoryStorage(); // Use memory storage instead of diskStorage

const profilePhoto = multer({ storage: storage });
const router = Router();

router.get("/signin", (req, res) => res.render("signin"));
router.get("/signup", (req, res) => res.render("signup"));
router.get("/logout", (req, res) => res.clearCookie("token").redirect("/"));
router.get("/profile", (req, res) => res.render("profile"));

router.post("/signin", async (req, res) => {
    const { email, password } = req.body;
    try {
        const token = await User.matchPassword(email, password);
        return res.cookie('token', token).redirect("/");
    } catch (error) {
        return res.render("signin", { error: "Incorrect Email or Password" });
    }
});

router.post("/signup", profilePhoto.single('profilePhoto'), async (req, res) => {
    const { fullName, username, email, password, bio } = req.body;

    if (!fullName || !username || !email || !password) {
        return res.status(400).send("All required fields must be filled");
    }

    try {
        
       

        // Create user with Cloudinary image URL
        const user = await User.create({ 
            fullName, 
            username, 
            email, 
            password, 
            bio, 
    
        });

        const token = await User.matchPassword(email, password);
        return res.cookie('token', token).redirect("/");

    } catch (error) {
        console.error(error);
        return res.status(500).send("Something is Missing");
    }
});

router.get("/:id/profile/edit", async (req, res) => {
    res.render("editprofile", { user: req.user });
});

router.post("/:id/profile/edit", profilePhoto.single("profilePhoto"), async (req, res) => {
    const { fullName, username, email, bio } = req.body;

    const updateData = { fullName, username, email, bio };

    try {
        if (req.file) {
            const streamUpload = () => {
                return new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        {
                            folder: "ProfilePhotos"
                        },
                        (error, result) => {
                            if (result) {
                                resolve(result);
                            } else {
                                reject(error);
                            }
                        }
                    );
                    streamifier.createReadStream(req.file.buffer).pipe(stream);
                });
            };

            const result = await streamUpload();
            updateData.profilePhoto = result.secure_url;
        }

        await User.findByIdAndUpdate(req.params.id, updateData);
        res.redirect(`/user/${req.params.id}/profile`);
    } catch (err) {
        console.error("Error updating profile:", err);
        res.status(500).send("Error updating profile");
    }
});


router.get("/:id/profile", async (req, res) => {
    try {
        const id = req.params.id;
        const userProfile = await User.findById(id);

        if (!userProfile) return res.redirect("/signin");

        const blogs = await Blog.find({ createdBy: userProfile._id });

        res.render("profile", { userProfile, user: req.user, blogs });
    } catch (error) {
        res.redirect("/signin");
    }
});

module.exports = router;
