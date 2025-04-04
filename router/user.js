const { Router } = require("express");
const User = require("../models/user");
const Blog = require("../models/blog");
const Comment = require("../models/comments");
const multer = require('multer');

const path = require('path');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, path.resolve(`./public/ProfilePhoto`));
    },
    filename: function (req, file, cb) {
     const fileName = `${Date.now()}-${file.originalname}`;
     cb(null , fileName);
    }
  })

const profilePhoto = multer({ storage: storage })
const router = Router();

router.get("/signin", (req, res) => res.render("signin"));
router.get("/signup", (req, res) => res.render("signup"));
router.get("/logout", (req, res) => res.clearCookie("token").redirect("/"));
router.get("/profile", (req, res) => res.render("profile"));

router.post("/signin", async (req, res) => {
    // console.log(req.body);
    const { email, password } = req.body;
    try {
        const token = await User.matchPassword(email, password);
        return res.cookie('token', token).redirect("/");
    } catch (error) {
        return res.render("signin", { error: "Incorrect Email or Password" });
    }
});

router.post("/signup",  profilePhoto.single('profilePhoto'),  async (req, res) => {
    const { fullName, username, email, password, bio } = req.body;
    console.log(req.file);

    if (!fullName || !username || !email || !password) {
        return res.status(400).send("All required fields must be filled");
    }
    const profilePhotoURL = req.file ? `/ProfilePhoto/${req.file.filename}` : undefined;

    const user = await User.create({ 
        fullName, 
        username, 
        email, 
        password, 
        bio, 
        profilePhoto: profilePhotoURL
    });
    const token = await User.matchPassword(email, password);
        return res.cookie('token', token).redirect("/");

});

router.get("/:id/profile/edit" , async (req, res) =>{
    
    res.render("editprofile", { user:req.user });

})
router.post("/:id/profile/edit" , profilePhoto.single('profilePhoto') , async (req, res) =>{

    console.log(req.body, ' yeah its working again')
    const { fullName, username, email, bio } = req.body;

    const profilePhotoURL = req.file ? `/ProfilePhoto/${req.file.filename}` : undefined;
    try {
        const updateData = { fullName, username, email, bio };

       
        if (profilePhotoURL) updateData.profilePhoto = profilePhotoURL;

        await User.findByIdAndUpdate(req.params.id, updateData);

        res.redirect(`/user/${req.params.id}/profile`);
    }
    catch (err) {
        console.error(err);
        res.status(500).send("Error updating profile");
    }

})
router.get("/:id/profile", async (req, res) => {
    try {
        const id = req.params.id;
        const userProfile = await User.findById(id);

        if (!userProfile) return res.redirect("/signin");
        const blogs = await Blog.find({createdBy:userProfile._id })


        res.render("profile", { userProfile , user:req.user , blogs });
    } catch (error) {
        res.redirect("/signin")
    }
});


module.exports = router;
