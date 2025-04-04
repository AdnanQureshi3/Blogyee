const {Router} = require("express");
const router = Router();
const multer = require('multer');
const Blog = require('../models/blog');
const User = require('../models/user');

const path = require('path');
const Comment = require("../models/comments");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, path.resolve(`./public/uploads`));
    },
    filename: function (req, file, cb) {
     const fileName = `${Date.now()}-${file.originalname}`;
     cb(null , fileName);
    }
  })
  
  const upload = multer({ storage: storage })
  
router.get('/add-new' , (req, res)=>{
    return res.render('addBlog' , {
        user:req.user,
    });
});
router.post('/' , upload.single('coverimage'), async(req, res)=>{
    if(!req.user) return res.redirect(`/user/signin`);
    
    const {title , body } = req.body;
    const blog = await Blog.create({
        body, 
        title, 
        createdBy:req.user._id,
        coverImageURL: `/uploads/${req.file.filename}`
    });

    return res.redirect(`/blog/${blog._id}`);
   
});
router.get('/sort', async (req, res) => {
    // console.log(req.query.sort);
    let sortOption = {};
    
    if (req.query.sort === "newest"|| req.query.sort === "reset" ) sortOption = { createdAt: -1 };
    else if (req.query.sort === "oldest") sortOption = { createdAt: 1 };
    else if (req.query.sort === "likes") sortOption = { likes: -1 };
    else if (req.query.sort === "views") sortOption = { views: -1 };
    

    const blogs = await Blog.find().sort(sortOption);
    res.render('home', { blogs , user:req.user});
});

router.get('/:id' , async(req, res) =>{
    const blog = await Blog.findById(req.params.id).populate("createdBy");
    const comments = await Comment.find({ blogId: req.params.id })
    .populate("createdBy")
    .sort({ createdAt: -1 }); // Sorts by newest first

    blog.views = blog.views + 1;
    const user = await User.findById(blog.createdBy._id);
        if (user) {
            user.views = (Number(user.views) || 0) + 1;
        }

    await blog.save();
    
await user.save();
    // console.log(typeof user.views, user.views);
    await blog.save();

    return res.render('blogs' , {
        user:req.user,
        blog,
        comments
    })
})

const fs = require('fs');
// const path = require('path');

router.delete('/:id', async (req, res) => {
    console.log("button clicked");

    try {
        const blog = await Blog.findByIdAndDelete(req.params.id);
        
        if (!blog) return res.status(404).send("Blog not found");

        const user = await User.findById(blog.createdBy._id);
        console.log("blog", blog, "user", user);

        if (blog.likes.includes(user._id)) {
            user.totalLikes -= 1;
        }
        user.views -= blog.views;

        await user.save();

        await Comment.deleteMany({ blogId: blog._id });
        // Delete blog image
        if (blog.coverImageURL) {
            const photoPath = path.join(__dirname, '../public', blog.coverImageURL);
            fs.unlink(photoPath, (err) => {
                if (err) console.error("Error deleting photo:", err);
            });
        }


        console.log("Blog deleted Successfully");
        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
});

router.get('/:id/edit' , async(req,res) =>{
    const id =  req.params.id;
    console.log("edit " ,id);
    const blog = await Blog.findById(id);
    const user = await User.findById(blog.createdBy);
    
    // console.log("edit " , id);
    console.log("edit " , user);
    res.render('editblog', {blog: blog , user:user} );
})
router.post('/:id/edit' ,upload.single('coverimage'), async(req,res) =>{
    const id =  req.params.id;
    const { title, body } = req.body;
    // console.log(req.file);
    
        const ImageURL = req.file ? `/uploads/${req.file.filename}` : undefined;
        
        try {
            const updateData = { title, body };
            if (ImageURL) updateData.coverImageURL  = ImageURL ;
    
           
            console.log(ImageURL);
    
            await Blog.findByIdAndUpdate(id, updateData);
    
            res.redirect(`/blog/${req.params.id}`);
        }
        catch (err) {
            console.error(err);
            res.status(500).send("Error updating blog");
        }


})

// router.post('/:id/edit' , async(req,res) =>{
//     const id =  req.params.id;
//     console.log("edit " ,id);
//     const blog = await Blog.findById(id);
//     res.render('editblog', {blog: blog ,} );
// })


router.post("/comment/:blogId", async (req, res) => {
    // console.log(req.body);

    try {
       const comment =  await Comment.create({
            content: req.body.content,
            blogId: req.params.blogId,
            createdBy: req.user._id,
        });
        // console.log(comment);
        res.redirect(`/blog/${req.params.blogId}`);
    } catch (error) {
        console.error(error);

        res.status(500).send("Server Error");
    }
});

router.delete('/comment/:id' , async(req, res) =>{
    // console.log("button clickd");
    const commentId = req.params.id.trim()
    
    try{
       const comment = await Comment.findByIdAndDelete(commentId);
        console.log("Comment deleted Successfully");
        res.json({ success: true, commentId: req.params.id  });
    }
    catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
    
})
router.post('/comment/edit/:id', async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) return res.status(404).json({ success: false, message: "Comment not found" });
        // console.log( ' call toh lag rahi hai' ,req.body.content);

        comment.content = req.body.content;
        await comment.save();

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

router.post('/:id/like', async (req, res) => {
    try {
        if (!req.user) return res.json({ notLoggedIn: true }); // Check authentication

        const blog = await Blog.findById(req.params.id);
        const userId = req.user._id;
        const user = await User.findById(blog.createdBy._id);
      

        if (blog.likes.includes(userId)) {
            user.totalLikes -= 1;
            blog.likes = blog.likes.filter(id => id.toString() !== userId.toString());
        } else {
            blog.likes.push(userId);
            user.totalLikes += 1;
        }
        console.log(typeof user.totalLikes, user.totalLikes);
        await user.save();
        await blog.save();
        res.json({ likes: blog.likes.length });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
});

router.post('/comment/:id/like', async (req, res) => {
    try {
        if (!req.user) return res.json({ notLoggedIn: true })
        const comment = await Comment.findById(req.params.id);

        const userId = req.user._id;

        if (comment.likes.includes(userId)) {
            // Unlike
            comment.likes = comment.likes.filter(id => id.toString() !== userId.toString());
        } else {
            // Like
            comment.likes.push(userId);
        }

        await comment.save();
        res.json({ likes: comment.likes.length });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
});





module.exports = router;