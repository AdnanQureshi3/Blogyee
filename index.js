require('dotenv').config();

const express = require("express");

const path = require("path");
const UserRoute = require('./router/user');
const BlogRoute = require('./router/blog');

const Blog = require('./models/blog')
const mongoose = require("mongoose");
const app = express();


const PORT = process.env.PORT || 3000;


const methodOverride = require('method-override');
app.use(methodOverride('_method'));

const CookieParser = require('cookie-parser');

const { checkForAuthCookie } = require("./middleware/authentication");
const MONGO_URL = process.env.MONGO_URL;

console.log("MongoDB URL:", MONGO_URL);
mongoose.connect(MONGO_URL)
.then((e) =>{

    console.log("mogoDb connected!!!");
})


app.use(express.urlencoded({extended:false}));
app.use(express.json());
app.use(CookieParser());
app.use(express.static(path.resolve("./public")));
app.use(checkForAuthCookie('token'))
app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));
app.set("view cache", false); 

app.get("/", async (req, res) => {
    try {
        
        const allblogs = await Blog.find().sort({ createdAt: -1 }); 
        // console.log(allblogs); // Debugging
        res.render("home", {
            user: req.user,
            blogs: allblogs,
        });
    } catch (error) {
        console.error("Error fetching blogs:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.use("/user" , UserRoute)
app.use("/blog" , BlogRoute)
app.get("/about" , async (req,res)=>{
    res.render("about" , {user:req.user});
})

app.listen(PORT, () => console.log("server listening at", PORT));
